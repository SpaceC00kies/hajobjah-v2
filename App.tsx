
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  onAuthChangeService,
  signUpWithEmailPasswordService,
  signInWithEmailPasswordService,
  signOutUserService,
  sendPasswordResetEmailService, 
  updateUserProfileService,
  addJobService,
  updateJobService,
  deleteJobService,
  subscribeToJobsService,
  addHelperProfileService,
  updateHelperProfileService,
  deleteHelperProfileService,
  subscribeToHelperProfilesService,
  bumpHelperProfileService, 
  addWebboardPostService,
  updateWebboardPostService,
  deleteWebboardPostService,
  toggleWebboardPostLikeService,
  subscribeToWebboardPostsService,
  addWebboardCommentService,
  updateWebboardCommentService,
  deleteWebboardCommentService,
  subscribeToWebboardCommentsService,
  subscribeToUsersService,
  subscribeToInteractionsService,
  subscribeToSiteConfigService,
  setSiteLockService,
  setUserRoleService,
  toggleItemFlagService,
  logHelperContactInteractionService,
  getUserDocument, 
} from './services/firebaseService'; 
import type { Job, HelperProfile, User, EnrichedHelperProfile, Interaction, WebboardPost, WebboardComment, UserLevel, EnrichedWebboardPost, EnrichedWebboardComment, SiteConfig, FilterableCategory, UserPostingLimits, UserActivityBadge } from './types';
import type { AdminItem as AdminItemType } from './components/AdminDashboard';
import { View, GenderOption, HelperEducationLevelOption, JobCategory, JobSubCategory, USER_LEVELS, UserLevelName, UserRole, ADMIN_BADGE_DETAILS, MODERATOR_BADGE_DETAILS, WebboardCategory, JOB_CATEGORY_EMOJIS_MAP, ACTIVITY_BADGE_DETAILS } from './types'; 
import { PostJobForm } from './components/PostJobForm';
import { JobCard } from './components/JobCard';
import { Button } from './components/Button';
import { OfferHelpForm } from './components/OfferHelpForm';
import { HelperCard } from './components/HelperCard';
import { RegistrationForm } from './components/RegistrationForm';
import { LoginForm } from './components/LoginForm';
import { ForgotPasswordModal } from './components/ForgotPasswordModal'; 
import { AdminDashboard } from './components/AdminDashboard';
import { ConfirmModal } from './components/ConfirmModal';
import { MyPostsPage } from './components/MyPostsPage';
import { UserProfilePage } from './components/UserProfilePage';
import { AboutUsPage } from './components/AboutUsPage';
import { PublicProfilePage } from './components/PublicProfilePage';
import { SafetyPage } from './components/SafetyPage';
import { FeedbackForm } from './components/FeedbackForm';
import { WebboardPage } from './components/WebboardPage';
import { UserLevelBadge } from './components/UserLevelBadge';
import { SiteLockOverlay } from './components/SiteLockOverlay';
import { CategoryFilterBar } from './components/CategoryFilterBar';
import { SearchInputWithRecent } from './components/SearchInputWithRecent';
import { PasswordResetPage } from './components/PasswordResetPage'; 

import { logFirebaseError } from './firebase/logging';

export const THAI_PROFANITY_BLACKLIST: string[] = [ /* Populate this if needed */ ];

export const containsBlacklistedWords = (text: string): boolean => {
  if (!text || THAI_PROFANITY_BLACKLIST.length === 0) return false;
  const lowerText = text.toLowerCase();
  return THAI_PROFANITY_BLACKLIST.some(word => lowerText.includes(word.toLowerCase()));
};

export const isValidThaiMobileNumberUtil = (mobile: string): boolean => {
  if (!mobile) return false;
  const cleaned = mobile.replace(/[\s-]/g, '');
  return /^0[689]\d{8}$/.test(cleaned);
};

// --- Date & Limit Utility Functions ---
export const calculateDaysRemaining = (targetDateString?: string | Date): number => {
    if (!targetDateString) return 0;
    const targetDate = new Date(targetDateString);
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isDateInPast = (dateString?: string | Date): boolean => {
    if (!dateString) return false; 
    const dateToCheck = new Date(dateString);
    if (isNaN(dateToCheck.getTime())) { 
        return false; 
    }
    return dateToCheck < new Date();
};


const JOB_COOLDOWN_DAYS = 7;
const HELPER_PROFILE_COOLDOWN_DAYS = 7;
const BUMP_COOLDOWN_DAYS = 30;
const MAX_ACTIVE_JOBS_NORMAL = 2;
const MAX_ACTIVE_HELPER_PROFILES_NORMAL = 1;
// const MAX_WEBBOARD_POSTS_DAILY_NORMAL = 3; // Removed - No longer enforced
// const MAX_WEBBOARD_COMMENTS_HOURLY = 10; // Removed - No longer enforced

// For users with "🔥 ขยันใช้เว็บ" badge
const MAX_ACTIVE_JOBS_BADGE = 4;
const MAX_ACTIVE_HELPER_PROFILES_BADGE = 2;
// const MAX_WEBBOARD_POSTS_DAILY_BADGE = 4; // Removed - No longer enforced

export const checkProfileCompleteness = (user: User): boolean => {
  if (!user) return false;
  const hasRequiredContact = !!user.mobile;
  const hasPhoto = !!user.photo;
  const hasAddress = !!user.address && user.address.trim() !== '';
  const hasPersonalityInfo = !!(
    user.favoriteMusic?.trim() || user.favoriteBook?.trim() || user.favoriteMovie?.trim() ||
    user.hobbies?.trim() || user.favoriteFood?.trim() || user.dislikedThing?.trim() || user.introSentence?.trim()
  );
  const hasCoreInfo = !!user.gender && user.gender !== GenderOption.NotSpecified &&
                      !!user.birthdate &&
                      !!user.educationLevel && user.educationLevel !== HelperEducationLevelOption.NotStated;
  
  return hasRequiredContact && hasPhoto && hasAddress && hasPersonalityInfo && hasCoreInfo;
};

export const calculateUserLevel = (userId: string, posts: WebboardPost[], comments: WebboardComment[]): UserLevel => {
  const userPostsCount = posts.filter(p => p.userId === userId).length;
  const userCommentsCount = comments.filter(c => c.userId === userId).length;
  const score = (userPostsCount * 2) + (userCommentsCount * 0.5); 
  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    if (USER_LEVELS[i].minScore !== undefined && score >= USER_LEVELS[i].minScore!) {
      return USER_LEVELS[i];
    }
  }
  return USER_LEVELS[0];
};

export const getUserDisplayBadge = (user: User | null | undefined, posts: WebboardPost[], comments: WebboardComment[]): UserLevel => {
  if (!user) return USER_LEVELS[0];
  if (user.role === UserRole.Admin) return ADMIN_BADGE_DETAILS;
  if (user.role === UserRole.Moderator) return MODERATOR_BADGE_DETAILS;
  return user.userLevel || calculateUserLevel(user.id, posts, comments); 
};

const MAX_RECENT_SEARCHES = 5;

const getRecentSearches = (key: string): string[] => {
  try {
    const item = localStorage.getItem(key); 
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error("Error reading recent searches from localStorage:", error);
    return [];
  }
};

const addRecentSearch = (key: string, term: string) => {
  if (!term.trim()) return;
  try {
    let searches = getRecentSearches(key);
    searches = searches.filter(s => s.toLowerCase() !== term.toLowerCase());
    searches.unshift(term);
    localStorage.setItem(key, JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)));
  } catch (error) {
    console.error("Error saving recent search to localStorage:", error);
  }
};

const searchMappings: Record<string, string[]> = {
  'tutor': ['สอนพิเศษ', 'ติว'], 'teacher': ['ครู', 'สอน'], 'driver': ['คนขับ', 'ขับรถ'],
  'clean': ['ทำความสะอาด', 'แม่บ้าน'], 'cook': ['ทำอาหาร', 'ครัว', 'เชฟ']
};

type RegistrationDataType = Omit<User, 'id' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'isMuted' | 'nickname' | 'firstName' | 'lastName' | 'role' | 'postingLimits' | 'activityBadge' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence' | 'createdAt' | 'updatedAt'> & { password: string };


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Home);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [sourceViewForPublicProfile, setSourceViewForPublicProfile] = useState<View>(View.FindHelpers);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false); 
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isSiteLocked, setIsSiteLocked] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginRedirectInfo, setLoginRedirectInfo] = useState<{ view: View; payload?: any } | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [helperProfiles, setHelperProfiles] = useState<HelperProfile[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [webboardPosts, setWebboardPosts] = useState<WebboardPost[]>([]);
  const [webboardComments, setWebboardComments] = useState<WebboardComment[]>([]);

  const [itemToEdit, setItemToEdit] = useState<Job | HelperProfile | WebboardPost | null>(null);
  const [editingItemType, setEditingItemType] = useState<'job' | 'profile' | 'webboardPost' | null>(null);
  const [sourceViewForForm, setSourceViewForForm] = useState<View | null>(null);

  const [selectedJobCategoryFilter, setSelectedJobCategoryFilter] = useState<FilterableCategory>('all');
  const [selectedHelperCategoryFilter, setSelectedHelperCategoryFilter] = useState<FilterableCategory>('all');
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [helperSearchTerm, setHelperSearchTerm] = useState('');
  const [recentJobSearches, setRecentJobSearches] = useState<string[]>([]);
  const [recentHelperSearches, setRecentHelperSearches] = useState<string[]>([]);

  useEffect(() => {
    document.documentElement.classList.remove('dark'); 
    setRecentJobSearches(getRecentSearches('recentJobSearches'));
    setRecentHelperSearches(getRecentSearches('recentHelperSearches'));

    const unsubscribeAuth = onAuthChangeService((user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });

    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    const pathname = window.location.pathname;
    const normalizedPathname = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

    if (normalizedPathname === '/reset-password' && mode === 'resetPassword' && oobCode) {
        setCurrentView(View.PasswordReset);
    }

    const unsubscribeJobs = subscribeToJobsService(setJobs);
    const unsubscribeHelperProfiles = subscribeToHelperProfilesService(setHelperProfiles);
    const unsubscribeUsers = subscribeToUsersService(setUsers);
    const unsubscribeWebboardPosts = subscribeToWebboardPostsService(setWebboardPosts);
    const unsubscribeWebboardComments = subscribeToWebboardCommentsService(setWebboardComments);
    const unsubscribeInteractions = subscribeToInteractionsService(setInteractions);
    const unsubscribeSiteConfig = subscribeToSiteConfigService((config) => setIsSiteLocked(config.isSiteLocked));

    return () => {
      unsubscribeAuth();
      unsubscribeJobs();
      unsubscribeHelperProfiles();
      unsubscribeUsers();
      unsubscribeWebboardPosts();
      unsubscribeWebboardComments();
      unsubscribeInteractions();
      unsubscribeSiteConfig();
    };
  }, []); 

  useEffect(() => {
    if (!isLoadingAuth && users.length > 0) {
        const updatedUsers = users.map(u => {
            let last30DaysActivity = 0;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            if (webboardPosts.length > 0 || webboardComments.length > 0) {
                const userPostsLast30Days = webboardPosts.filter(p => p.userId === u.id && p.createdAt && new Date(p.createdAt as string) >= thirtyDaysAgo).length;
                const userCommentsLast30Days = webboardComments.filter(c => c.userId === u.id && c.createdAt && new Date(c.createdAt as string) >= thirtyDaysAgo).length;
                last30DaysActivity = userPostsLast30Days + userCommentsLast30Days;
            }
            
            const accountAgeInDays = u.createdAt ? (new Date().getTime() - new Date(u.createdAt as string).getTime()) / (1000 * 60 * 60 * 24) : 0;
            const isActivityBadgeActive = accountAgeInDays >= 30 && last30DaysActivity >= 15;

            const defaultPostingLimits: UserPostingLimits = {
              lastJobPostDate: new Date(0).toISOString(),
              lastHelperProfileDate: new Date(0).toISOString(),
              dailyWebboardPosts: { count: 0, resetDate: new Date(0).toISOString() },
              hourlyComments: { count: 0, resetTime: new Date(0).toISOString() }, 
              lastBumpDates: {},
            };

            const defaultActivityBadge: UserActivityBadge = {
              isActive: false,
              last30DaysActivity: 0,
              lastActivityCheck: new Date(0).toISOString(),
            };
            
            return {
                ...u,
                userLevel: calculateUserLevel(u.id, webboardPosts, webboardComments),
                profileComplete: checkProfileCompleteness(u),
                postingLimits: { 
                    ...defaultPostingLimits,
                    ...(u.postingLimits || {}),
                    dailyWebboardPosts: {
                      ...defaultPostingLimits.dailyWebboardPosts,
                      ...(u.postingLimits?.dailyWebboardPosts || {})
                    },
                    hourlyComments: { 
                      ...defaultPostingLimits.hourlyComments,
                      ...(u.postingLimits?.hourlyComments || {})
                    }
                },
                activityBadge: { 
                    ...defaultActivityBadge,
                    ...(u.activityBadge || {}),
                    isActive: isActivityBadgeActive,
                    last30DaysActivity: last30DaysActivity,
                    lastActivityCheck: new Date().toISOString(),
                },
            };
        });
        setUsers(updatedUsers);

        if (currentUser) {
            const updatedCurrentUser = updatedUsers.find(u => u.id === currentUser.id);
            if (updatedCurrentUser) {
                const userChanged = JSON.stringify(currentUser) !== JSON.stringify(updatedCurrentUser);
                if (userChanged) {
                    setCurrentUser(updatedCurrentUser);
                }
            }
        }
    }
  }, [webboardPosts, webboardComments, isLoadingAuth, currentUser?.id]); 

  const requestLoginForAction = (originalView: View, originalPayload?: any) => {
    if (!currentUser) {
      setLoginRedirectInfo({ view: originalView, payload: originalPayload });
      setCurrentView(View.Login);
      setIsMobileMenuOpen(false);
    }
  };

  const navigateTo = (view: View, payload?: any) => {
    const fromView = currentView;
    setIsMobileMenuOpen(false); window.scrollTo(0, 0);
    const protectedViews: View[] = [View.PostJob, View.OfferHelp, View.UserProfile, View.MyPosts, View.AdminDashboard];
    
    if (view === View.PublicProfile && typeof payload === 'string') {
      const targetUser = users.find(u => u.id === payload);
      if (targetUser && targetUser.role === UserRole.Admin && currentUser?.id !== targetUser.id) { 
        alert("โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้"); 
        return; 
      }
      setViewingProfileId(payload);
      if (fromView !== View.PublicProfile) { // Avoid setting PublicProfile as its own source
        setSourceViewForPublicProfile(fromView);
      }
    } else if (view !== View.PublicProfile) {
      if (viewingProfileId !== null) setViewingProfileId(null);
    }

    if (!currentUser && protectedViews.includes(view)) { 
      requestLoginForAction(view, payload); 
      return; 
    }
    
    if (view === View.Webboard) {
      if (typeof payload === 'string') setSelectedPostId(payload === 'create' ? 'create' : payload);
      else if (payload && typeof payload === 'object' && payload.postId) setSelectedPostId(payload.postId);
      else if (payload === null || payload === undefined) setSelectedPostId(null);
    } else if (selectedPostId !== null && view !== View.AdminDashboard && view !== View.PasswordReset) { 
      setSelectedPostId(null);
    }
    setCurrentView(view);
  };

  const handleNavigateToPublicProfile = (userId: string) => navigateTo(View.PublicProfile, userId);

  const handleRegister = async (userData: RegistrationDataType): Promise<boolean> => {
    try {
      if (!isValidThaiMobileNumberUtil(userData.mobile)) { alert('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'); return false; }
      if (!userData.gender || !userData.birthdate || !userData.educationLevel) { alert('กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน'); return false; }

      const signedUpUser = await signUpWithEmailPasswordService(userData);
      if (signedUpUser) {
        alert('ลงทะเบียนสำเร็จแล้ว!');
        if (loginRedirectInfo) {
          navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload);
          setLoginRedirectInfo(null);
        } else {
          navigateTo(View.Home);
        }
        return true;
      }
      return false;
    } catch (error: any) {
      logFirebaseError("handleRegister", error);
      alert(`เกิดข้อผิดพลาดในการลงทะเบียน: ${error.message}`);
      return false;
    }
  };

  const handleLogin = async (loginIdentifier: string, passwordAttempt: string): Promise<boolean> => {
    try {
      const loggedInUser = await signInWithEmailPasswordService(loginIdentifier, passwordAttempt);
      if (loggedInUser) {
        alert(`ยินดีต้อนรับ, ${loggedInUser.publicDisplayName}!`);
        if (loginRedirectInfo) {
          navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload);
          setLoginRedirectInfo(null);
        } else {
          navigateTo(View.Home);
        }
        return true;
      }
      return false;
    } catch (error: any) {
      logFirebaseError("handleLogin", error);
      alert(`ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง: ${error.message}`);
      return false;
    }
  };

  const handleSendPasswordResetEmail = async (email: string): Promise<string | void> => {
    try {
      await sendPasswordResetEmailService(email);
    } catch (error: any) {
      logFirebaseError("handleSendPasswordResetEmail", error);
      if (error.code === 'auth/invalid-email') {
        return 'รูปแบบอีเมลไม่ถูกต้อง';
      } else if (error.code === 'auth/user-not-found') {
        return; 
      }
      return 'เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน โปรดลองอีกครั้ง';
    }
  };

  const handleUpdateUserProfile = async (updatedProfileData: Pick<User, 'publicDisplayName' | 'mobile' | 'lineId' | 'facebook' | 'gender' | 'birthdate' | 'educationLevel' | 'photo' | 'address' | 'nickname' | 'firstName' | 'lastName' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence'>): Promise<boolean> => {
    if (!currentUser) { alert('ผู้ใช้ไม่ได้เข้าสู่ระบบ'); return false; }
    try {
      if (!isValidThaiMobileNumberUtil(updatedProfileData.mobile)) { alert('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'); return false; }
      if (!updatedProfileData.gender || updatedProfileData.gender === GenderOption.NotSpecified) { alert('กรุณาเลือกเพศ'); return false; }
      if (!updatedProfileData.birthdate) { alert('กรุณาเลือกวันเกิด'); return false; }
      if (!updatedProfileData.educationLevel || updatedProfileData.educationLevel === HelperEducationLevelOption.NotStated) { alert('กรุณาเลือกระดับการศึกษา'); return false; }

      await updateUserProfileService(currentUser.id, updatedProfileData);
      alert('อัปเดตโปรไฟล์เรียบร้อยแล้ว');
      return true;
    } catch (error: any) {
      logFirebaseError("handleUpdateUserProfile", error);
      alert(`เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์: ${error.message}`);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUserService();
      setLoginRedirectInfo(null); setItemToEdit(null); setEditingItemType(null);
      setSourceViewForForm(null); setViewingProfileId(null); setSelectedPostId(null);
      setSourceViewForPublicProfile(View.FindHelpers); // Reset source view on logout
      setIsMobileMenuOpen(false);
      alert('ออกจากระบบเรียบร้อยแล้ว'); navigateTo(View.Home);
    } catch (error: any) {
      logFirebaseError("handleLogout", error);
      alert(`เกิดข้อผิดพลาดในการออกจากระบบ: ${error.message}`);
    }
  };

  const canEditOrDelete = (itemUserId: string, itemOwnerId?: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.Admin) return true;
    const itemAuthor = users.find(u => u.id === itemUserId);
    if (currentUser.role === UserRole.Moderator) {
        return itemAuthor?.role !== UserRole.Admin;
    }
    return currentUser.id === itemUserId || currentUser.id === itemOwnerId;
  };

 const handleStartEditItemFromAdmin = (item: AdminItemType) => {
    if (item.itemType === 'job') {
        setItemToEdit(item.originalItem as Job); setEditingItemType('job'); setSourceViewForForm(View.AdminDashboard); navigateTo(View.PostJob);
    } else if (item.itemType === 'profile') {
        setItemToEdit(item.originalItem as HelperProfile); setEditingItemType('profile'); setSourceViewForForm(View.AdminDashboard); navigateTo(View.OfferHelp);
    } else if (item.itemType === 'webboardPost') {
        setItemToEdit({ ...(item.originalItem as WebboardPost), isEditing: true }); setEditingItemType('webboardPost'); setSourceViewForForm(View.AdminDashboard); navigateTo(View.Webboard, 'create');
    }
 };
  const handleStartEditMyItem = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
    let originalItem: Job | HelperProfile | WebboardPost | undefined;
    if (itemType === 'job') originalItem = jobs.find(j => j.id === itemId);
    else if (itemType === 'profile') originalItem = helperProfiles.find(p => p.id === itemId);
    else if (itemType === 'webboardPost') originalItem = webboardPosts.find(p => p.id === itemId);

    if (originalItem && canEditOrDelete(originalItem.userId, originalItem.ownerId)) {
        setItemToEdit(itemType === 'webboardPost' ? { ...(originalItem as WebboardPost), isEditing: true } : originalItem);
        setEditingItemType(itemType);
        setSourceViewForForm(View.MyPosts);
        navigateTo(itemType === 'job' ? View.PostJob : itemType === 'profile' ? View.OfferHelp : View.Webboard, itemType === 'webboardPost' ? 'create' : undefined);
    } else { alert("ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข"); }
  };

  type JobFormData = Omit<Job, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired'>;
  type HelperProfileFormData = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'lastBumpedAt'>;

  const generateContactString = (user: User): string => {
    let contactParts: string[] = [];
    if (user.mobile) contactParts.push(`เบอร์โทร: ${user.mobile}`);
    if (user.lineId) contactParts.push(`LINE ID: ${user.lineId}`);
    if (user.facebook) contactParts.push(`Facebook: ${user.facebook}`);
    return contactParts.join('\n') || 'ไม่ระบุช่องทางติดต่อ (โปรดอัปเดตโปรไฟล์)';
  };
  
  const checkJobPostingLimits = async (user: User): Promise<{ canPost: boolean; message?: string }> => {
    if (user.postingLimits.lastJobPostDate) {
        const daysSinceLastPost = (new Date().getTime() - new Date(user.postingLimits.lastJobPostDate as string).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastPost < JOB_COOLDOWN_DAYS) {
            const daysRemaining = JOB_COOLDOWN_DAYS - Math.floor(daysSinceLastPost);
            return { canPost: false, message: `คุณสามารถโพสต์งานใหม่ได้ในอีก ${daysRemaining} วัน` };
        }
    }
    const userActiveJobs = jobs.filter(job => job.userId === user.id && !isDateInPast(job.expiresAt) && !job.isExpired).length;
    const maxJobs = user.activityBadge?.isActive ? MAX_ACTIVE_JOBS_BADGE : MAX_ACTIVE_JOBS_NORMAL;
    if (userActiveJobs >= maxJobs) {
        return { canPost: false, message: `คุณมีงานที่ยังไม่หมดอายุ ${userActiveJobs}/${maxJobs} งานแล้ว` };
    }
    return { canPost: true };
  };

  const checkHelperProfilePostingLimits = async (user: User): Promise<{ canPost: boolean; message?: string }> => {
    if (user.postingLimits.lastHelperProfileDate) {
        const daysSinceLastPost = (new Date().getTime() - new Date(user.postingLimits.lastHelperProfileDate as string).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastPost < HELPER_PROFILE_COOLDOWN_DAYS) {
            const daysRemaining = HELPER_PROFILE_COOLDOWN_DAYS - Math.floor(daysSinceLastPost);
            return { canPost: false, message: `คุณสามารถสร้างโปรไฟล์ผู้ช่วยใหม่ได้ในอีก ${daysRemaining} วัน` };
        }
    }
    const userActiveProfiles = helperProfiles.filter(p => p.userId === user.id && !isDateInPast(p.expiresAt) && !p.isExpired).length;
    const maxProfiles = user.activityBadge?.isActive ? MAX_ACTIVE_HELPER_PROFILES_BADGE : MAX_ACTIVE_HELPER_PROFILES_NORMAL;
    if (userActiveProfiles >= maxProfiles) {
        return { canPost: false, message: `คุณมีโปรไฟล์ผู้ช่วยที่ยังไม่หมดอายุ ${userActiveProfiles}/${maxProfiles} โปรไฟล์แล้ว` };
    }
    return { canPost: true };
  };
  
  const checkWebboardPostLimits = (user: User): { canPost: boolean; message?: string } => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _user = user; // Keep user param for structural consistency
    return { canPost: true }; // Always allow posting webboard posts
  };

  const checkWebboardCommentLimits = (user: User): { canPost: boolean; message?: string } => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _user = user; // Keep user param for structural consistency
    return { canPost: true }; // Always allow posting comments
  };

  const handleAddJob = useCallback(async (newJobData: JobFormData) => {
    if (!currentUser) { requestLoginForAction(View.PostJob); return; }
    const limitCheck = await checkJobPostingLimits(currentUser);
    if (!limitCheck.canPost) {
      alert(limitCheck.message);
      return;
    }
    if (containsBlacklistedWords(newJobData.description) || containsBlacklistedWords(newJobData.title)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    try {
      await addJobService(newJobData, {userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, contact: generateContactString(currentUser)});
      const updatedUser = await getUserDocument(currentUser.id);
      if (updatedUser) setCurrentUser(updatedUser);

      navigateTo(sourceViewForForm === View.MyPosts ? View.MyPosts : View.FindJobs);
      setSourceViewForForm(null); alert('ประกาศงานของคุณถูกเพิ่มแล้ว!');
    } catch (error: any) {
      logFirebaseError("handleAddJob", error);
      alert(`เกิดข้อผิดพลาดในการเพิ่มประกาศงาน: ${error.message}`);
    }
  }, [currentUser, sourceViewForForm, navigateTo, users, jobs]); 

  const handleUpdateJob = async (updatedJobDataFromForm: JobFormData & { id: string }) => {
    if (!currentUser) { requestLoginForAction(View.PostJob); return; }
    const originalJob = jobs.find(j => j.id === updatedJobDataFromForm.id);
    if (!originalJob) { alert('ไม่พบประกาศงานเดิม'); return; }
    if (!canEditOrDelete(originalJob.userId, originalJob.ownerId)) { alert('คุณไม่มีสิทธิ์แก้ไขประกาศงานนี้'); return; }
    if (containsBlacklistedWords(updatedJobDataFromForm.description) || containsBlacklistedWords(updatedJobDataFromForm.title)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    try {
      await updateJobService(updatedJobDataFromForm.id, updatedJobDataFromForm, generateContactString(currentUser));
      setItemToEdit(null); setEditingItemType(null);
      navigateTo(sourceViewForForm || View.Home); setSourceViewForForm(null);
      alert('แก้ไขประกาศงานเรียบร้อยแล้ว');
    } catch (error: any) {
      logFirebaseError("handleUpdateJob", error);
      alert(`เกิดข้อผิดพลาดในการแก้ไขประกาศงาน: ${error.message}`);
    }
  };

  const handleSubmitJobForm = (formDataFromForm: JobFormData & { id?: string }) => {
    if (formDataFromForm.id && itemToEdit && editingItemType === 'job') handleUpdateJob(formDataFromForm as JobFormData & { id: string });
    else handleAddJob(formDataFromForm);
  };

 const handleAddHelperProfile = useCallback(async (newProfileData: HelperProfileFormData) => {
    if (!currentUser) { requestLoginForAction(View.OfferHelp); return; }
    const limitCheck = await checkHelperProfilePostingLimits(currentUser);
    if (!limitCheck.canPost) {
      alert(limitCheck.message);
      return;
    }
    if (containsBlacklistedWords(newProfileData.details) || containsBlacklistedWords(newProfileData.profileTitle)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    if (!currentUser.gender || !currentUser.birthdate || !currentUser.educationLevel || currentUser.gender === GenderOption.NotSpecified || currentUser.educationLevel === HelperEducationLevelOption.NotStated) {
        alert('กรุณาอัปเดตข้อมูลส่วนตัว (เพศ, วันเกิด, ระดับการศึกษา) ในหน้าโปรไฟล์ของคุณก่อน'); navigateTo(View.UserProfile); return;
    }
    try {
      await addHelperProfileService(newProfileData, {
        userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, contact: generateContactString(currentUser),
        gender: currentUser.gender, birthdate: currentUser.birthdate, educationLevel: currentUser.educationLevel
      });
      const updatedUser = await getUserDocument(currentUser.id); // Refetch user to update limits state
      if (updatedUser) setCurrentUser(updatedUser);

      setTimeout(() => {
        navigateTo(sourceViewForForm === View.MyPosts ? View.MyPosts : View.FindHelpers);
        setSourceViewForForm(null);
        alert('โปรไฟล์ของคุณถูกเพิ่มแล้ว!');
      }, 2000);
    } catch (error: any) {
      logFirebaseError("handleAddHelperProfile", error);
      alert(`เกิดข้อผิดพลาดในการเพิ่มโปรไฟล์: ${error.message}`);
    }
  }, [currentUser, sourceViewForForm, navigateTo, helperProfiles]);

  const handleUpdateHelperProfile = async (updatedProfileDataFromForm: HelperProfileFormData & { id: string }) => {
    if (!currentUser) { requestLoginForAction(View.OfferHelp); return; }
    const originalProfile = helperProfiles.find(p => p.id === updatedProfileDataFromForm.id);
    if (!originalProfile) { alert('ไม่พบโปรไฟล์เดิม'); return; }
    if (!canEditOrDelete(originalProfile.userId, originalProfile.ownerId)) { alert('คุณไม่มีสิทธิ์แก้ไขโปรไฟล์นี้'); return; }
    if (containsBlacklistedWords(updatedProfileDataFromForm.details) || containsBlacklistedWords(updatedProfileDataFromForm.profileTitle)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    try {
      await updateHelperProfileService(updatedProfileDataFromForm.id, updatedProfileDataFromForm, generateContactString(currentUser));
      setItemToEdit(null); setEditingItemType(null); navigateTo(sourceViewForForm || View.Home);
      setSourceViewForForm(null); alert('แก้ไขโปรไฟล์เรียบร้อยแล้ว');
    } catch (error: any) {
      logFirebaseError("handleUpdateHelperProfile", error);
      alert(`เกิดข้อผิดพลาดในการแก้ไขโปรไฟล์: ${error.message}`);
    }
  };

  const handleSubmitHelperProfileForm = (formDataFromForm: HelperProfileFormData & { id?: string }) => {
    if (formDataFromForm.id && itemToEdit && editingItemType === 'profile') handleUpdateHelperProfile(formDataFromForm as HelperProfileFormData & { id: string });
    else handleAddHelperProfile(formDataFromForm);
  };
  
  const handleBumpHelperProfile = async (profileId: string) => {
    if (!currentUser) { requestLoginForAction(View.FindHelpers, {intent: 'bump', postId: profileId}); return; }
    const profileToBump = helperProfiles.find(p => p.id === profileId);
    if (!profileToBump || profileToBump.userId !== currentUser.id) {
        alert("ไม่พบโปรไฟล์ หรือคุณไม่ใช่เจ้าของโปรไฟล์นี้");
        return;
    }

    const lastBumpDateForThisProfile = currentUser.postingLimits.lastBumpDates?.[profileId] || profileToBump.lastBumpedAt;
    if (lastBumpDateForThisProfile) {
        const daysSinceLastBump = (new Date().getTime() - new Date(lastBumpDateForThisProfile as string).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastBump < BUMP_COOLDOWN_DAYS) {
            const daysRemaining = BUMP_COOLDOWN_DAYS - Math.floor(daysSinceLastBump);
            alert(`คุณสามารถ Bump โปรไฟล์นี้ได้อีกครั้งใน ${daysRemaining} วัน`);
            return;
        }
    }
    try {
        await bumpHelperProfileService(profileId, currentUser.id);
        alert("Bump โปรไฟล์สำเร็จ! โปรไฟล์ของคุณจะแสดงผลเป็นลำดับต้นๆ ชั่วคราว");
        const updatedUser = await getUserDocument(currentUser.id);
        if (updatedUser) setCurrentUser(updatedUser);

    } catch (error: any) {
        logFirebaseError("handleBumpHelperProfile", error);
        alert(`เกิดข้อผิดพลาดในการ Bump โปรไฟล์: ${error.message}`);
    }
  };

  const handleCancelEditOrPost = () => {
    const targetView = sourceViewForForm || View.Home;
    setItemToEdit(null); setEditingItemType(null); setSourceViewForForm(null); setSelectedPostId(null);
    navigateTo(targetView);
  };

  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalTitle(title); setConfirmModalMessage(message); setOnConfirmAction(() => onConfirm); setIsConfirmModalOpen(true);
  };
  const closeConfirmModal = () => { setIsConfirmModalOpen(false); setConfirmModalMessage(''); setConfirmModalTitle(''); setOnConfirmAction(null); };
  const handleConfirmDeletion = () => { if (onConfirmAction) onConfirmAction(); closeConfirmModal(); };

  const handleDeleteItem = async (itemId: string, itemType: 'job' | 'profile' | 'webboardPost' | 'webboardComment', itemTitle: string, itemUserId: string, itemOwnerId?: string) => {
    if (!canEditOrDelete(itemUserId, itemOwnerId)) { alert('คุณไม่มีสิทธิ์ลบรายการนี้'); return; }
    openConfirmModal(
      `ยืนยันการลบ${itemType === 'job' ? 'ประกาศงาน' : itemType === 'profile' ? 'โปรไฟล์' : itemType === 'webboardPost' ? 'กระทู้' : 'คอมเมนต์'}`,
      `คุณแน่ใจหรือไม่ว่าต้องการลบ "${itemTitle}"? การกระทำนี้ไม่สามารถย้อนกลับได้${itemType === 'webboardPost' ? ' และจะลบคอมเมนต์ทั้งหมดที่เกี่ยวข้องด้วย' : ''}`,
      async () => {
        try {
          if (itemType === 'job') await deleteJobService(itemId);
          else if (itemType === 'profile') await deleteHelperProfileService(itemId);
          else if (itemType === 'webboardPost') await deleteWebboardPostService(itemId);
          else if (itemType === 'webboardComment') await deleteWebboardCommentService(itemId);
          alert(`ลบ "${itemTitle}" เรียบร้อยแล้ว`);
          if (itemType === 'webboardPost' && selectedPostId === itemId) { setSelectedPostId(null); navigateTo(View.Webboard); }
        } catch (error: any) {
            logFirebaseError(`handleDeleteItem (${itemType})`, error);
            alert(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
        }
      }
    );
  };

  const handleDeleteJob = (jobId: string) => { const job = jobs.find(j => j.id === jobId); if (job) handleDeleteItem(jobId, 'job', job.title, job.userId, job.ownerId); };
  const handleDeleteHelperProfile = (profileId: string) => { const profile = helperProfiles.find(p => p.id === profileId); if (profile) handleDeleteItem(profileId, 'profile', profile.profileTitle, profile.userId, profile.ownerId); };
  const handleDeleteWebboardPost = (postId: string) => { const post = webboardPosts.find(p => p.id === postId); if (post) handleDeleteItem(postId, 'webboardPost', post.title, post.userId, post.ownerId); };
  const handleDeleteItemFromMyPosts = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
    if (itemType === 'job') handleDeleteJob(itemId); else if (itemType === 'profile') handleDeleteHelperProfile(itemId); else if (itemType === 'webboardPost') handleDeleteWebboardPost(itemId);
  };

  const toggleItemFlag = async (
    collectionName: 'jobs' | 'helperProfiles' | 'webboardPosts',
    itemId: string,
    flagName: keyof Job | keyof HelperProfile | keyof WebboardPost | 'isExpired', 
    itemUserId: string,
    itemOwnerId?: string,
    currentValue?: boolean
  ) => {
    if (!canEditOrDelete(itemUserId, itemOwnerId) && currentUser?.role !== UserRole.Admin) { alert('คุณไม่มีสิทธิ์ดำเนินการนี้'); return; }
    try {
      await toggleItemFlagService(collectionName, itemId, flagName as any, currentValue);
    } catch(error: any) {
        logFirebaseError(`toggleItemFlag (${String(flagName)})`, error);
        alert(`เกิดข้อผิดพลาดในการอัปเดตสถานะ: ${error.message}`);
    }
  };

  const handleToggleSuspiciousJob = (jobId: string) => { const job = jobs.find(j => j.id === jobId); if (job) toggleItemFlag('jobs', jobId, "isSuspicious", job.userId, job.ownerId, job.isSuspicious); };
  const handleToggleSuspiciousHelperProfile = (profileId: string) => { const profile = helperProfiles.find(p => p.id === profileId); if (profile) toggleItemFlag('helperProfiles', profileId, "isSuspicious", profile.userId, profile.ownerId, profile.isSuspicious); };
  const handleTogglePinnedJob = (jobId: string) => { const job = jobs.find(j => j.id === jobId); if (job) toggleItemFlag('jobs', jobId, "isPinned", job.userId, job.ownerId, job.isPinned); };
  const handleTogglePinnedHelperProfile = (profileId: string) => { const profile = helperProfiles.find(p => p.id === profileId); if (profile) toggleItemFlag('helperProfiles', profileId, "isPinned", profile.userId, profile.ownerId, profile.isPinned); };
  const handleToggleVerifiedExperience = (profileId: string) => { const profile = helperProfiles.find(p => p.id === profileId); if (profile) toggleItemFlag('helperProfiles', profileId, "adminVerifiedExperience", profile.userId, profile.ownerId, profile.adminVerifiedExperience); };
  const handleToggleHiredJobForUserOrAdmin = (jobId: string) => { const job = jobs.find(j => j.id === jobId); if (job) toggleItemFlag('jobs', jobId, "isHired", job.userId, job.ownerId, job.isHired); };
  const handleToggleUnavailableHelperProfileForUserOrAdmin = (profileId: string) => { const profile = helperProfiles.find(p => p.id === profileId); if (profile) toggleItemFlag('helperProfiles', profileId, "isUnavailable", profile.userId, profile.ownerId, profile.isUnavailable); };
  const handleToggleItemStatusFromMyPosts = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
    if (itemType === 'job') handleToggleHiredJobForUserOrAdmin(itemId); else if (itemType === 'profile') handleToggleUnavailableHelperProfileForUserOrAdmin(itemId);
  };

  const handleLogHelperContactInteraction = async (helperProfileId: string) => {
    if (!currentUser) { requestLoginForAction(View.FindHelpers, { intent: 'contactHelper', postId: helperProfileId }); return; }
    const helperProfile = helperProfiles.find(hp => hp.id === helperProfileId);
    if (!helperProfile || currentUser.id === helperProfile.userId) return;
    try {
        await logHelperContactInteractionService(helperProfileId, currentUser.id, helperProfile.userId);
    } catch(error: any) {
        logFirebaseError("handleLogHelperContactInteraction", error);
        alert(`เกิดข้อผิดพลาดในการบันทึกการติดต่อ: ${error.message}`);
    }
  };

  const handleAddOrUpdateWebboardPost = async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => {
    if (!currentUser) { requestLoginForAction(View.Webboard, { action: postIdToUpdate ? 'editPost' : 'createPost', postId: postIdToUpdate }); return; }
    if (!postIdToUpdate) { 
      const limitCheck = checkWebboardPostLimits(currentUser);
      if (!limitCheck.canPost) {
        // This alert will likely not show as checkWebboardPostLimits now always returns canPost: true
        alert(limitCheck.message);
        return;
      }
    }
    if (containsBlacklistedWords(postData.title) || containsBlacklistedWords(postData.body)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    if (postData.body.length > 2000) { alert('เนื้อหากระทู้ต้องไม่เกิน 2,000 ตัวอักษร'); return;}
    try {
        let finalPostId = postIdToUpdate;
        if (postIdToUpdate) {
            const postToEdit = webboardPosts.find(p => p.id === postIdToUpdate);
            if (!postToEdit || !canEditOrDelete(postToEdit.userId, postToEdit.ownerId)) { alert('ไม่พบโพสต์ หรือไม่มีสิทธิ์แก้ไข'); return; }
            await updateWebboardPostService(postIdToUpdate, postData, currentUser.photo);
            alert('แก้ไขโพสต์เรียบร้อยแล้ว!');
        } else {
            finalPostId = await addWebboardPostService(postData, {userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, photo: currentUser.photo});
            const updatedUser = await getUserDocument(currentUser.id); 
            if (updatedUser) setCurrentUser(updatedUser);
            alert('สร้างโพสต์ใหม่เรียบร้อยแล้ว!');
        }
        setItemToEdit(null); setEditingItemType(null); setSelectedPostId(finalPostId || null); navigateTo(View.Webboard, finalPostId);
    } catch (error: any) {
        logFirebaseError("handleAddOrUpdateWebboardPost", error);
        alert(`เกิดข้อผิดพลาดในการจัดการโพสต์: ${error.message}`);
    }
  };

  const handleAddWebboardComment = async (postId: string, text: string) => {
    if (!currentUser) { requestLoginForAction(View.Webboard, { action: 'comment', postId: postId }); return; }
    const limitCheck = checkWebboardCommentLimits(currentUser); 
    if (!limitCheck.canPost) { 
      // This alert will likely not show as checkWebboardCommentLimits now always returns canPost: true
      alert(limitCheck.message);
      return;
    }
    if (containsBlacklistedWords(text)) { alert('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม'); return; }
    try {
        await addWebboardCommentService(postId, text, {userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, photo: currentUser.photo});
        const updatedUser = await getUserDocument(currentUser.id); 
        if (updatedUser) setCurrentUser(updatedUser);
    } catch (error: any) {
        logFirebaseError("handleAddWebboardComment", error);
        alert(`เกิดข้อผิดพลาดในการเพิ่มคอมเมนต์: ${error.message}`);
    }
  };

  const handleUpdateWebboardComment = async (commentId: string, newText: string) => {
    if (!currentUser) { alert("คุณต้องเข้าสู่ระบบเพื่อแก้ไขคอมเมนต์"); return; }
    if (containsBlacklistedWords(newText)) { alert('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม'); return; }
    const comment = webboardComments.find(c => c.id === commentId);
    if (!comment || !canEditOrDelete(comment.userId, comment.ownerId)) { alert("คุณไม่มีสิทธิ์แก้ไขคอมเมนต์นี้"); return; }
    try {
        await updateWebboardCommentService(commentId, newText);
        alert('แก้ไขคอมเมนต์เรียบร้อยแล้ว');
    } catch (error: any) {
        logFirebaseError("handleUpdateWebboardComment", error);
        alert(`เกิดข้อผิดพลาดในการแก้ไขคอมเมนต์: ${error.message}`);
    }
  };

  const handleDeleteWebboardComment = (commentId: string) => {
    const comment = webboardComments.find(c => c.id === commentId);
    if (comment) handleDeleteItem(commentId, 'webboardComment', `คอมเมนต์โดย ${comment.authorDisplayName}`, comment.userId, comment.ownerId);
    else alert('ไม่พบคอมเมนต์');
  };

  const handleToggleWebboardPostLike = async (postId: string) => {
    if (!currentUser) { requestLoginForAction(View.Webboard, { action: 'like', postId: postId }); return; }
    try {
        await toggleWebboardPostLikeService(postId, currentUser.id);
    } catch (error: any) {
        logFirebaseError("handleToggleWebboardPostLike", error);
        alert(`เกิดข้อผิดพลาดในการกดไลค์: ${error.message}`);
    }
  };

  const handlePinWebboardPost = (postId: string) => {
    const post = webboardPosts.find(p => p.id === postId);
    if (post && currentUser?.role === UserRole.Admin) toggleItemFlag('webboardPosts', postId, "isPinned", post.userId, post.ownerId, post.isPinned);
    else if (currentUser?.role !== UserRole.Admin) alert("เฉพาะแอดมินเท่านั้นที่สามารถปักหมุดโพสต์ได้");
  };

  const handleSetUserRole = async (userIdToUpdate: string, newRole: UserRole) => {
    if (currentUser?.role !== UserRole.Admin) { alert("คุณไม่มีสิทธิ์เปลี่ยนบทบาทผู้ใช้"); return; }
    if (userIdToUpdate === currentUser.id) { alert("ไม่สามารถเปลี่ยนบทบาทของตัวเองได้"); return; }
    const userToUpdate = users.find(u => u.id === userIdToUpdate);
    if (userToUpdate && userToUpdate.role === UserRole.Admin && newRole !== UserRole.Admin) { /* Consider if this rule is needed */ }
    try {
        await setUserRoleService(userIdToUpdate, newRole);
        alert(`อัปเดตบทบาทของผู้ใช้ @${userToUpdate?.username} (ชื่อแสดง: ${userToUpdate?.publicDisplayName}) เป็น ${newRole} เรียบร้อยแล้ว`);
    } catch (error: any) {
        logFirebaseError("handleSetUserRole", error);
        alert(`เกิดข้อผิดพลาดในการเปลี่ยนบทบาทผู้ใช้: ${error.message}`);
    }
  };

  const handleToggleSiteLock = async () => {
    if (!currentUser || currentUser?.role !== UserRole.Admin) { alert("คุณไม่มีสิทธิ์ดำเนินการนี้"); return; }
    try {
        await setSiteLockService(!isSiteLocked, currentUser.id);
    } catch (error: any) {
        logFirebaseError("handleToggleSiteLock", error);
        alert(`เกิดข้อผิดพลาดในการเปลี่ยนสถานะระบบ: ${error.message}`);
    }
  };

  const renderNavLinks = (isMobile: boolean) => {
    const displayBadge = getUserDisplayBadge(currentUser, webboardPosts, webboardComments);
    const commonButtonPropsBase = isMobile
      ? { size: 'md' as const, className: 'font-medium w-full text-left justify-start py-3 px-4 text-base' }
      : { size: 'sm' as const, className: 'font-medium flex-shrink-0' };

    const navigateAndCloseMenu = (view: View, payload?: any) => {
      navigateTo(view, payload);
    };

    const navItemSpanClass = "inline-flex items-center gap-1.5";

    if (currentUser) {
        return (
          <>
            {isMobile && (
              <div className={`font-sans font-medium mb-3 py-2 px-4 border-b border-neutral-DEFAULT/50 dark:border-dark-border/50 w-full text-center`}>
                สวัสดี, {currentUser.publicDisplayName}!
                <UserLevelBadge level={displayBadge} size="sm" />
                {currentUser.activityBadge?.isActive && <UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="sm" />}
              </div>
            )}
            {!isMobile && (
               <div className={`font-sans font-medium mr-4 text-sm lg:text-base items-center flex gap-2`}>
                สวัสดี, {currentUser.publicDisplayName}!
                {currentUser.activityBadge?.isActive && <UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="sm" />}
              </div>
            )}

            {currentView !== View.Home && (
              <Button onClick={() => navigateAndCloseMenu(View.Home)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>🏠</span><span>หน้าแรก</span></span>
              </Button>
            )}

            {currentView !== View.UserProfile && (
              <Button onClick={() => navigateAndCloseMenu(View.UserProfile)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>👤</span><span>โปรไฟล์ของฉัน</span></span>
              </Button>
            )}

            {currentUser.role !== UserRole.Admin && currentView !== View.MyPosts && (
                 <Button onClick={() => navigateAndCloseMenu(View.MyPosts)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                    <span className={navItemSpanClass}><span>📁</span><span>โพสต์ของฉัน</span></span>
                  </Button>
            )}

            {currentUser.role === UserRole.Admin && currentView !== View.AdminDashboard && (
              <Button onClick={() => navigateAndCloseMenu(View.AdminDashboard)} variant="accent" {...commonButtonPropsBase}>
                 <span className={navItemSpanClass}><span>🔐</span><span>Admin</span></span>
              </Button>
            )}

            {currentView !== View.Webboard && (
               <Button onClick={() => navigateAndCloseMenu(View.Webboard)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                 <span className={navItemSpanClass}><span>💬</span><span>กระทู้พูดคุย</span></span>
               </Button>
            )}

            {currentView === View.FindJobs ? (
              <Button onClick={() => { setSourceViewForForm(View.FindJobs); navigateAndCloseMenu(View.PostJob);}} variant="outline" colorScheme="primary" {...commonButtonPropsBase}>
                + ลงประกาศงาน
              </Button>
            ) : (currentView !== View.PostJob || (currentView === View.PostJob && itemToEdit)) && (
              <Button onClick={() => navigateAndCloseMenu(View.FindJobs)} variant="primary" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>👀</span><span>หางาน</span></span>
              </Button>
            )}
            {isMobile && currentView === View.PostJob && !itemToEdit && (
                <Button onClick={() => navigateAndCloseMenu(View.FindJobs)} variant="primary" {...commonButtonPropsBase}>
                  <span className={navItemSpanClass}><span>👀</span><span>หางาน</span></span>
                </Button>
            )}

            {currentView === View.FindHelpers ? (
              <Button onClick={() => { setSourceViewForForm(View.FindHelpers); navigateAndCloseMenu(View.OfferHelp);}} variant="outline" colorScheme="secondary" {...commonButtonPropsBase}>
                + เสนอช่วยงาน
              </Button>
            ) : (currentView !== View.OfferHelp || (currentView === View.OfferHelp && itemToEdit )) && (
              <Button onClick={() => navigateAndCloseMenu(View.FindHelpers)} variant="secondary" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>🫂</span><span>ค้นหาผู้ช่วย</span></span>
              </Button>
            )}
            {isMobile && currentView === View.OfferHelp && !itemToEdit && (
                <Button onClick={() => navigateAndCloseMenu(View.FindHelpers)} variant="secondary" {...commonButtonPropsBase}>
                  <span className={navItemSpanClass}><span>🫂</span><span>ค้นหาผู้ช่วย</span></span>
                </Button>
            )}

            <Button
              onClick={handleLogout}
              variant="outline"
              colorScheme="accent"
              className={`${commonButtonPropsBase.className} border-red-500 text-red-500 hover:bg-red-500 hover:text-white dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400 dark:hover:text-neutral-dark focus:ring-red-500 dark:focus:ring-red-400`}
              size={commonButtonPropsBase.size}
            >
              <span className={navItemSpanClass}><span>🔓</span><span>ออกจากระบบ</span></span>
            </Button>
          </>
        );
    } else { 
        if (currentView === View.PasswordReset) {
            return null;
        }
        return (
            <>
              {currentView !== View.Home && (
                <Button onClick={() => navigateAndCloseMenu(View.Home)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                   <span className={navItemSpanClass}><span>🏠</span><span>หน้าแรก</span></span>
                </Button>
              )}
              <Button
                onClick={() => navigateAndCloseMenu(View.Login)}
                variant="outline"
                colorScheme="brandGreen"
                size={commonButtonPropsBase.size}
                className={`${commonButtonPropsBase.className}`}
              >
                  <span className={navItemSpanClass}><span>🔑</span><span>เข้าสู่ระบบ</span></span>
              </Button>
              <Button onClick={() => navigateAndClose