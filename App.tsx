
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Job, HelperProfile, User, EnrichedHelperProfile, Interaction, WebboardPost, WebboardComment, UserLevel, EnrichedWebboardPost, EnrichedWebboardComment, SiteConfig } from './types';
import type { AdminItem as AdminItemType } from './components/AdminDashboard';
import { View, GenderOption, HelperEducationLevelOption, USER_LEVELS, UserLevelName, UserRole, ADMIN_BADGE_DETAILS, MODERATOR_BADGE_DETAILS, WebboardCategory } from './types';
import { PostJobForm } from './components/PostJobForm';
import { JobCard } from './components/JobCard';
import { Button } from './components/Button';
import { OfferHelpForm } from './components/OfferHelpForm';
import { HelperCard } from './components/HelperCard';
import { RegistrationForm } from './components/RegistrationForm';
import { LoginForm } from './components/LoginForm';
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

import * as firebaseService from './services/firebaseService';
import { logFirebaseError } from './firebase/logging'; 

const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true';

export const THAI_PROFANITY_BLACKLIST: string[] = [
  // Intentionally left empty for cleanup. Populate with actual words for production.
];

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

export const checkProfileCompleteness = (user: User): boolean => {
  if (!user) return false;
  const hasRequiredContact = !!user.mobile;
  const hasPhoto = !!user.photo;
  const hasAddress = !!user.address && user.address.trim() !== '';
  const hasPersonalityInfo = !!(
    user.favoriteMusic?.trim() || user.favoriteBook?.trim() || user.favoriteMovie?.trim() ||
    user.hobbies?.trim() || user.favoriteFood?.trim() || user.dislikedThing?.trim() || user.introSentence?.trim()
  );
  return hasRequiredContact && hasPhoto && hasAddress && hasPersonalityInfo;
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
  return user.userLevel || calculateUserLevel(user.id, posts, comments); // userLevel might not be set yet if data is fresh
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Home);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackSubmissionStatus, setFeedbackSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedbackSubmissionMessage, setFeedbackSubmissionMessage] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isSiteLocked, setIsSiteLocked] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginRedirectInfo, setLoginRedirectInfo] = useState<{ view: View; payload?: any } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Data states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [helperProfiles, setHelperProfiles] = useState<HelperProfile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [webboardPosts, setWebboardPosts] = useState<WebboardPost[]>([]);
  const [webboardComments, setWebboardComments] = useState<WebboardComment[]>([]);
  
  const [itemToEdit, setItemToEdit] = useState<Job | HelperProfile | WebboardPost | null>(null);
  const [editingItemType, setEditingItemType] = useState<'job' | 'profile' | 'webboardPost' | null>(null);
  const [sourceViewForForm, setSourceViewForForm] = useState<View | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Auth Listener
  useEffect(() => {
    if (!USE_FIREBASE) { setIsLoadingAuth(false); return; }
    const unsubscribeAuth = firebaseService.onAuthChangeService((serviceUser) => {
      if (serviceUser) {
        // We get user data from Firestore via getCurrentUserService inside onAuthChangeService
        // which includes calculated fields like profileComplete if the service returns them,
        // or they will be recalculated when user data subscription updates.
        setCurrentUser(serviceUser);
      } else {
        setCurrentUser(null);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Real-time Data Subscriptions
  useEffect(() => {
    if (!USE_FIREBASE) return;
    
    const processUsers = (fetchedUsers: User[], currentPosts: WebboardPost[], currentComments: WebboardComment[]) => {
        const updatedUsers = fetchedUsers.map(u => ({
            ...u,
            userLevel: calculateUserLevel(u.id, currentPosts, currentComments),
            profileComplete: checkProfileCompleteness(u)
        }));
        setUsers(updatedUsers);

        if (currentUser) {
            const updatedCurrentUser = updatedUsers.find(u => u.id === currentUser.id);
            if (updatedCurrentUser) {
                 // Check if relevant fields actually changed to avoid unnecessary re-renders
                const hasLevelChanged = updatedCurrentUser.userLevel.name !== currentUser.userLevel?.name;
                const hasProfileCompletenessChanged = updatedCurrentUser.profileComplete !== currentUser.profileComplete;
                const hasPhotoChanged = updatedCurrentUser.photo !== currentUser.photo;
                const hasDisplayNameChanged = updatedCurrentUser.displayName !== currentUser.displayName;


                if (hasLevelChanged || hasProfileCompletenessChanged || hasPhotoChanged || hasDisplayNameChanged) {
                    setCurrentUser(prev => prev ? ({...prev, ...updatedCurrentUser}) : updatedCurrentUser);
                }
            }
        }
    };

    // Initial setup, webboardPosts and webboardComments might be empty
    // They will update from their own subscriptions later
    const unsubUsers = firebaseService.subscribeToUsersService((fetchedUsers) => {
        processUsers(fetchedUsers, webboardPosts, webboardComments);
    });
    const unsubJobs = firebaseService.subscribeToJobsService(setJobs);
    const unsubHelperProfiles = firebaseService.subscribeToHelperProfilesService(setHelperProfiles);
    const unsubInteractions = firebaseService.subscribeToInteractionsService(setInteractions);
    const unsubSiteConfig = firebaseService.subscribeToSiteConfigService(config => setIsSiteLocked(config.isSiteLocked));

    const unsubWebboardPosts = firebaseService.subscribeToWebboardPostsService((fetchedPosts) => {
        setWebboardPosts(fetchedPosts);
        processUsers(users, fetchedPosts, webboardComments); // Re-process users if posts change (for levels)
    });
    const unsubWebboardComments = firebaseService.subscribeToWebboardCommentsService((fetchedComments) => {
        setWebboardComments(fetchedComments);
        processUsers(users, webboardPosts, fetchedComments); // Re-process users if comments change (for levels)
    });
    
    return () => {
      unsubUsers();
      unsubJobs();
      unsubHelperProfiles();
      unsubInteractions();
      unsubSiteConfig();
      unsubWebboardPosts();
      unsubWebboardComments();
    };
  }, [currentUser?.id]); // Rerun user processing if currentUser.id changes, other dependencies handled by closures


  const requestLoginForAction = (originalView: View, originalPayload?: any) => {
    if (!currentUser) {
      setLoginRedirectInfo({ view: originalView, payload: originalPayload });
      setCurrentView(View.Login);
      setIsMobileMenuOpen(false);
    }
  };

  const navigateTo = (view: View, payload?: any) => {
    setIsMobileMenuOpen(false); window.scrollTo(0, 0);
    const protectedViews: View[] = [View.PostJob, View.OfferHelp, View.UserProfile, View.MyPosts, View.AdminDashboard];
    if (view === View.PublicProfile && typeof payload === 'string') {
      const targetUser = users.find(u => u.id === payload);
      if (targetUser && targetUser.role === UserRole.Admin) { alert("โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้"); return; }
      if (!currentUser) { requestLoginForAction(view, payload); return; }
      setViewingProfileId(payload);
    } else if (view !== View.PublicProfile) {
      if (viewingProfileId !== null) setViewingProfileId(null);
    }
    if (!currentUser && protectedViews.includes(view)) { requestLoginForAction(view, payload); return; }
    if (view === View.Webboard) {
      if (typeof payload === 'string') setSelectedPostId(payload === 'create' ? 'create' : payload);
      else if (payload && typeof payload === 'object' && payload.postId) setSelectedPostId(payload.postId);
      else if (payload === null || payload === undefined) setSelectedPostId(null);
    } else if (selectedPostId !== null && view !== View.AdminDashboard) {
      setSelectedPostId(null);
    }
    setCurrentView(view);
  };

  const handleNavigateToPublicProfile = (userId: string) => navigateTo(View.PublicProfile, userId);

  const handleRegister = async (userData: Omit<User, 'id' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'isMuted'> & { password: string }): Promise<boolean> => {
    if (!USE_FIREBASE) { alert("Firebase is not enabled."); return false; }
    const existingUsername = users.find(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (existingUsername) { alert('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว'); return false; }
    const existingEmail = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingEmail) { alert('อีเมลนี้ถูกใช้ไปแล้ว'); return false; }
    if (!isValidThaiMobileNumberUtil(userData.mobile)) { alert('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'); return false; }
    if (!userData.gender || !userData.birthdate || !userData.educationLevel) { alert('กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน'); return false; }
    try {
      await firebaseService.signUpWithEmailPasswordService({ ...userData, role: UserRole.Member });
      alert('ลงทะเบียนสำเร็จแล้ว!'); 
      if (loginRedirectInfo) {
        navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload);
        setLoginRedirectInfo(null);
      } else {
        navigateTo(View.Home);
      }
      return true;
    } catch (error: any) { logFirebaseError("handleRegister", error); alert(`ลงทะเบียนไม่สำเร็จ: ${error.message}`); return false; }
  };

  const handleLogin = async (loginIdentifier: string, passwordAttempt: string): Promise<boolean> => {
    if (!USE_FIREBASE) { alert("Firebase is not enabled."); return false; }
    try {
      await firebaseService.signInWithEmailPasswordService(loginIdentifier, passwordAttempt);
      alert(`ยินดีต้อนรับ!`); 
      if (loginRedirectInfo) {
        navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload);
        setLoginRedirectInfo(null);
      } else {
        navigateTo(View.Home);
      }
      return true;
    } catch (error: any) { logFirebaseError("handleLogin", error); alert(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}.`); return false; }
  };

  const handleUpdateUserProfile = async (updatedProfileData: Pick<User, 'mobile' | 'lineId' | 'facebook' | 'gender' | 'birthdate' | 'educationLevel' | 'photo' | 'address' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence' | 'displayName'>): Promise<boolean> => {
    if (!USE_FIREBASE || !currentUser) { alert('ผู้ใช้ไม่ได้เข้าสู่ระบบ'); return false; }
    if (!isValidThaiMobileNumberUtil(updatedProfileData.mobile)) { alert('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'); return false; }
    if (!updatedProfileData.gender || updatedProfileData.gender === GenderOption.NotSpecified) { alert('กรุณาเลือกเพศ'); return false; }
    if (!updatedProfileData.birthdate) { alert('กรุณาเลือกวันเกิด'); return false; }
    if (!updatedProfileData.educationLevel || updatedProfileData.educationLevel === HelperEducationLevelOption.NotStated) { alert('กรุณาเลือกระดับการศึกษา'); return false; }
    try {
      const success = await firebaseService.updateUserProfileService(currentUser.id, updatedProfileData);
      if (success) { alert('อัปเดตโปรไฟล์เรียบร้อยแล้ว'); return true; } 
      else { alert('อัปเดตโปรไฟล์ไม่สำเร็จ (service error)'); return false; }
    } catch (error: any) { logFirebaseError("handleUpdateUserProfile", error); alert(`อัปเดตโปรไฟล์ไม่สำเร็จ: ${error.message}`); return false; }
  };

  const handleLogout = async () => {
    if (!USE_FIREBASE) { alert("Firebase is not enabled."); return; }
    try {
      await firebaseService.signOutUserService();
      setLoginRedirectInfo(null); setItemToEdit(null); setEditingItemType(null);
      setSourceViewForForm(null); setViewingProfileId(null); setSelectedPostId(null);
      setIsMobileMenuOpen(false);
      alert('ออกจากระบบเรียบร้อยแล้ว'); navigateTo(View.Home);
    } catch (error: any) { logFirebaseError("handleLogout", error); alert(`ออกจากระบบไม่สำเร็จ: ${error.message}`); }
  };
  
  const canEditOrDelete = (itemUserId: string, itemOwnerId?: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.Admin) return true;
    if (currentUser.role === UserRole.Moderator) {
        const itemAuthor = users.find(u => u.id === itemUserId);
        return itemAuthor?.role !== UserRole.Admin; 
    }
    return currentUser.id === itemUserId || currentUser.id === itemOwnerId;
  };

 const handleStartEditItemFromAdmin = (item: AdminItemType) => { 
    if (item.itemType === 'job') {
        const originalItem = jobs.find(j => j.id === item.id);
        if (originalItem) { setItemToEdit(originalItem); setEditingItemType('job'); setSourceViewForForm(View.AdminDashboard); navigateTo(View.PostJob); }
    } else if (item.itemType === 'profile') {
        const originalItem = helperProfiles.find(p => p.id === item.id);
        if (originalItem) { setItemToEdit(originalItem); setEditingItemType('profile'); setSourceViewForForm(View.AdminDashboard); navigateTo(View.OfferHelp); }
    } else if (item.itemType === 'webboardPost') {
        const originalPost = webboardPosts.find(p => p.id === item.id);
        if (originalPost) { setItemToEdit({ ...originalPost, isEditing: true }); setEditingItemType('webboardPost'); setSourceViewForForm(View.AdminDashboard); navigateTo(View.Webboard, 'create'); }
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

  type JobFormData = Omit<Job, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt'>;
  type HelperProfileFormData = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt'>;

  const generateContactString = (user: User): string => {
    let contactParts: string[] = [];
    if (user.mobile) contactParts.push(`เบอร์โทร: ${user.mobile}`);
    if (user.lineId) contactParts.push(`LINE ID: ${user.lineId}`);
    if (user.facebook) contactParts.push(`Facebook: ${user.facebook}`);
    return contactParts.join('\n') || 'ไม่ระบุช่องทางติดต่อ (โปรดอัปเดตโปรไฟล์)';
  };

  const handleAddJob = useCallback(async (newJobData: JobFormData) => {
    if (!USE_FIREBASE || !currentUser) { requestLoginForAction(View.PostJob); return; }
    if (containsBlacklistedWords(newJobData.description) || containsBlacklistedWords(newJobData.title)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    try {
      const contactInfo = generateContactString(currentUser);
      await firebaseService.addJobService(newJobData, contactInfo); 
      navigateTo(sourceViewForForm === View.MyPosts ? View.MyPosts : View.FindJobs);
      setSourceViewForForm(null); alert('ประกาศงานของคุณถูกเพิ่มแล้ว!');
    } catch (error: any) { logFirebaseError("handleAddJob", error); alert(`เพิ่มประกาศงานไม่สำเร็จ: ${error.message}`); }
  }, [currentUser, sourceViewForForm]);

  const handleUpdateJob = async (updatedJobDataFromForm: JobFormData & { id: string }) => {
    if (!USE_FIREBASE || !currentUser) { requestLoginForAction(View.PostJob); return; }
    const originalJob = jobs.find(j => j.id === updatedJobDataFromForm.id);
    if (!originalJob) { alert('ไม่พบประกาศงานเดิม'); return; }
    if (!canEditOrDelete(originalJob.userId, originalJob.ownerId)) { alert('คุณไม่มีสิทธิ์แก้ไขประกาศงานนี้'); return; }
    if (containsBlacklistedWords(updatedJobDataFromForm.description) || containsBlacklistedWords(updatedJobDataFromForm.title)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    try {
      const contactInfo = generateContactString(currentUser); // Regenerate in case user's profile changed
      await firebaseService.updateJobService(updatedJobDataFromForm.id, updatedJobDataFromForm, contactInfo);
      setItemToEdit(null); setEditingItemType(null);
      navigateTo(sourceViewForForm || View.Home); setSourceViewForForm(null);
      alert('แก้ไขประกาศงานเรียบร้อยแล้ว');
    } catch (error: any) { logFirebaseError("handleUpdateJob", error); alert(`แก้ไขประกาศงานไม่สำเร็จ: ${error.message}`); }
  };

  const handleSubmitJobForm = (formDataFromForm: JobFormData & { id?: string }) => {
    if (formDataFromForm.id && itemToEdit && editingItemType === 'job') handleUpdateJob(formDataFromForm as JobFormData & { id: string });
    else handleAddJob(formDataFromForm);
  };

 const handleAddHelperProfile = useCallback(async (newProfileData: HelperProfileFormData) => {
    if (!USE_FIREBASE || !currentUser) { requestLoginForAction(View.OfferHelp); return; }
    if (containsBlacklistedWords(newProfileData.details) || containsBlacklistedWords(newProfileData.profileTitle)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    if (!currentUser.gender || !currentUser.birthdate || !currentUser.educationLevel || currentUser.gender === GenderOption.NotSpecified || currentUser.educationLevel === HelperEducationLevelOption.NotStated) {
        alert('กรุณาอัปเดตข้อมูลส่วนตัว (เพศ, วันเกิด, ระดับการศึกษา) ในหน้าโปรไฟล์ของคุณก่อน'); navigateTo(View.UserProfile); return;
    }
    try {
      const contactInfo = generateContactString(currentUser);
      await firebaseService.addHelperProfileService(newProfileData, {
          userId: currentUser.id, username: currentUser.username, contact: contactInfo,
          gender: currentUser.gender, birthdate: currentUser.birthdate, educationLevel: currentUser.educationLevel
      });
      navigateTo(sourceViewForForm === View.MyPosts ? View.MyPosts : View.FindHelpers); setSourceViewForForm(null);
      alert('โปรไฟล์ของคุณถูกเพิ่มแล้ว!');
    } catch (error: any) { logFirebaseError("handleAddHelperProfile", error); alert(`เพิ่มโปรไฟล์ไม่สำเร็จ: ${error.message}`); }
  }, [currentUser, sourceViewForForm]);

  const handleUpdateHelperProfile = async (updatedProfileDataFromForm: HelperProfileFormData & { id: string }) => {
    if (!USE_FIREBASE || !currentUser) { requestLoginForAction(View.OfferHelp); return; }
    const originalProfile = helperProfiles.find(p => p.id === updatedProfileDataFromForm.id);
    if (!originalProfile) { alert('ไม่พบโปรไฟล์เดิม'); return; }
    if (!canEditOrDelete(originalProfile.userId, originalProfile.ownerId)) { alert('คุณไม่มีสิทธิ์แก้ไขโปรไฟล์นี้'); return; }
    if (containsBlacklistedWords(updatedProfileDataFromForm.details) || containsBlacklistedWords(updatedProfileDataFromForm.profileTitle)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    try {
      const contactInfo = generateContactString(currentUser); // Regenerate
      await firebaseService.updateHelperProfileService(updatedProfileDataFromForm.id, updatedProfileDataFromForm, contactInfo);
      setItemToEdit(null); setEditingItemType(null); navigateTo(sourceViewForForm || View.Home);
      setSourceViewForForm(null); alert('แก้ไขโปรไฟล์เรียบร้อยแล้ว');
    } catch (error: any) { logFirebaseError("handleUpdateHelperProfile", error); alert(`แก้ไขโปรไฟล์ไม่สำเร็จ: ${error.message}`); }
  };
  
  const handleSubmitHelperProfileForm = (formDataFromForm: HelperProfileFormData & { id?: string }) => {
    if (formDataFromForm.id && itemToEdit && editingItemType === 'profile') handleUpdateHelperProfile(formDataFromForm as HelperProfileFormData & { id: string });
    else handleAddHelperProfile(formDataFromForm);
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
    if (!USE_FIREBASE) { alert("Firebase is not enabled."); return; }
    if (!canEditOrDelete(itemUserId, itemOwnerId)) { alert('คุณไม่มีสิทธิ์ลบรายการนี้'); return; }
    openConfirmModal(
      `ยืนยันการลบ${itemType === 'job' ? 'ประกาศงาน' : itemType === 'profile' ? 'โปรไฟล์' : itemType === 'webboardPost' ? 'กระทู้' : 'คอมเมนต์'}`,
      `คุณแน่ใจหรือไม่ว่าต้องการลบ "${itemTitle}"? การกระทำนี้ไม่สามารถย้อนกลับได้${itemType === 'webboardPost' ? ' และจะลบคอมเมนต์ทั้งหมดที่เกี่ยวข้องด้วย' : ''}`,
      async () => {
        try {
          let success = false;
          if (itemType === 'job') success = await firebaseService.deleteJobService(itemId);
          else if (itemType === 'profile') success = await firebaseService.deleteHelperProfileService(itemId);
          else if (itemType === 'webboardPost') success = await firebaseService.deleteWebboardPostService(itemId);
          else if (itemType === 'webboardComment') success = await firebaseService.deleteWebboardCommentService(itemId);
          if (success) { 
            alert(`ลบ "${itemTitle}" เรียบร้อยแล้ว`); 
            if (itemType === 'webboardPost' && selectedPostId === itemId) { setSelectedPostId(null); navigateTo(View.Webboard); }
          } 
          else alert(`ลบไม่สำเร็จ (service error)`);
        } catch (error: any) { logFirebaseError(`handleDeleteItem:${itemType}`, error); alert(`ลบไม่สำเร็จ: ${error.message}`); }
      }
    );
  };
  
  const handleDeleteJob = (jobId: string) => { const job = jobs.find(j => j.id === jobId); if (job) handleDeleteItem(jobId, 'job', job.title, job.userId, job.ownerId); };
  const handleDeleteHelperProfile = (profileId: string) => { const profile = helperProfiles.find(p => p.id === profileId); if (profile) handleDeleteItem(profileId, 'profile', profile.profileTitle, profile.userId, profile.ownerId); };
  const handleDeleteWebboardPost = (postId: string) => { const post = webboardPosts.find(p => p.id === postId); if (post) handleDeleteItem(postId, 'webboardPost', post.title, post.userId, post.ownerId); };
  const handleDeleteItemFromMyPosts = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
    if (itemType === 'job') handleDeleteJob(itemId); else if (itemType === 'profile') handleDeleteHelperProfile(itemId); else if (itemType === 'webboardPost') handleDeleteWebboardPost(itemId);
  };

  const toggleItemFlag = async (collectionName: 'jobs' | 'helperProfiles' | 'webboardPosts', itemId: string, flagName: keyof Job | keyof HelperProfile | keyof WebboardPost, itemUserId: string, itemOwnerId?: string, currentValue?: boolean) => {
    if (!USE_FIREBASE) { alert("Firebase is not enabled."); return; }
    if (!canEditOrDelete(itemUserId, itemOwnerId) && currentUser?.role !== UserRole.Admin) { alert('คุณไม่มีสิทธิ์ดำเนินการนี้'); return; }
    try {
      let success = false;
      // Pass currentValue to service if available, otherwise service will fetch it
      if (collectionName === 'jobs') {
        if (flagName === 'isPinned') success = await firebaseService.togglePinnedJobService(itemId, currentValue);
        else if (flagName === 'isHired') success = await firebaseService.toggleHiredJobService(itemId, currentValue);
        else if (flagName === 'isSuspicious') success = await firebaseService.toggleSuspiciousJobService(itemId, currentValue);
      } else if (collectionName === 'helperProfiles') {
        if (flagName === 'isPinned') success = await firebaseService.togglePinnedHelperProfileService(itemId, currentValue);
        else if (flagName === 'isUnavailable') success = await firebaseService.toggleUnavailableHelperProfileService(itemId, currentValue);
        else if (flagName === 'isSuspicious') success = await firebaseService.toggleSuspiciousHelperProfileService(itemId, currentValue);
        else if (flagName === 'adminVerifiedExperience') success = await firebaseService.toggleVerifiedExperienceService(itemId, currentValue);
      } else if (collectionName === 'webboardPosts' && flagName === 'isPinned') {
        success = await firebaseService.togglePinWebboardPostService(itemId, currentValue);
      }
      if (!success) alert('อัปเดตสถานะไม่สำเร็จ (service error)'); 
    } catch (error: any) { logFirebaseError(`toggleItemFlag:${flagName}`, error); alert(`อัปเดตสถานะไม่สำเร็จ: ${error.message}`); }
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
    if (!USE_FIREBASE || !currentUser) { requestLoginForAction(View.FindHelpers, { intent: 'contactHelper', postId: helperProfileId }); return; }
    const helperProfile = helperProfiles.find(hp => hp.id === helperProfileId);
    if (!helperProfile || currentUser.id === helperProfile.userId) return;
    try { await firebaseService.logHelperContactInteractionService(helperProfile.id, currentUser.id); } 
    catch (error: any) { logFirebaseError("handleLogHelperContactInteraction", error); alert(`ไม่สามารถบันทึกการติดต่อได้: ${error.message}`); }
  };

  const handleAddOrUpdateWebboardPost = async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => {
    if (!USE_FIREBASE || !currentUser) { requestLoginForAction(View.Webboard, { action: postIdToUpdate ? 'editPost' : 'createPost', postId: postIdToUpdate }); return; }
    if (containsBlacklistedWords(postData.title) || containsBlacklistedWords(postData.body)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    try {
      let finalPostId = postIdToUpdate;
      if (postIdToUpdate) {
        const postToEdit = webboardPosts.find(p => p.id === postIdToUpdate);
        if (!postToEdit || !canEditOrDelete(postToEdit.userId, postToEdit.ownerId)) { alert('ไม่พบโพสต์ หรือไม่มีสิทธิ์แก้ไข'); return; }
        await firebaseService.updateWebboardPostService(postIdToUpdate, postData, currentUser.photo); // Pass current user photo for authorPhoto update if needed (service decides)
        alert('แก้ไขโพสต์เรียบร้อยแล้ว!');
      } else {
        finalPostId = await firebaseService.addWebboardPostService(postData, {userId: currentUser.id, username: currentUser.username, photo: currentUser.photo});
        alert('สร้างโพสต์ใหม่เรียบร้อยแล้ว!');
      }
      setItemToEdit(null); setEditingItemType(null); setSelectedPostId(finalPostId || null); navigateTo(View.Webboard, finalPostId);
    } catch (error: any) { logFirebaseError("handleAddOrUpdateWebboardPost", error); alert(`ดำเนินการกับโพสต์ไม่สำเร็จ: ${error.message}`); }
  };

  const handleAddWebboardComment = async (postId: string, text: string) => {
    if (!USE_FIREBASE || !currentUser) { requestLoginForAction(View.Webboard, { action: 'comment', postId: postId }); return; }
    if (containsBlacklistedWords(text)) { alert('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม'); return; }
    try { await firebaseService.addWebboardCommentService(postId, text, {userId: currentUser.id, username: currentUser.username, photo: currentUser.photo}); } 
    catch (error: any) { logFirebaseError("handleAddWebboardComment", error); alert(`เพิ่มคอมเมนต์ไม่สำเร็จ: ${error.message}`); }
  };

  const handleUpdateWebboardComment = async (commentId: string, newText: string) => {
    if (!USE_FIREBASE || !currentUser) { alert("คุณต้องเข้าสู่ระบบเพื่อแก้ไขคอมเมนต์"); return; }
    if (containsBlacklistedWords(newText)) { alert('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม'); return; }
    const comment = webboardComments.find(c => c.id === commentId);
    if (!comment || !canEditOrDelete(comment.userId, comment.ownerId)) { alert("คุณไม่มีสิทธิ์แก้ไขคอมเมนต์นี้"); return; }
    try { await firebaseService.updateWebboardCommentService(commentId, newText); alert('แก้ไขคอมเมนต์เรียบร้อยแล้ว'); } 
    catch (error: any) { logFirebaseError("handleUpdateWebboardComment", error); alert(`แก้ไขคอมเมนต์ไม่สำเร็จ: ${error.message}`); }
  };

  const handleDeleteWebboardComment = (commentId: string) => {
    const comment = webboardComments.find(c => c.id === commentId);
    if (comment) handleDeleteItem(commentId, 'webboardComment', `คอมเมนต์โดย @${comment.username}`, comment.userId, comment.ownerId);
    else alert('ไม่พบคอมเมนต์');
  };

  const handleToggleWebboardPostLike = async (postId: string) => {
    if (!USE_FIREBASE || !currentUser) { requestLoginForAction(View.Webboard, { action: 'like', postId: postId }); return; }
    try { await firebaseService.toggleWebboardPostLikeService(postId, currentUser.id); } 
    catch (error: any) { logFirebaseError("handleToggleWebboardPostLike", error); alert(`ไลค์โพสต์ไม่สำเร็จ: ${error.message}`); }
  };
  
  const handlePinWebboardPost = (postId: string) => {
    const post = webboardPosts.find(p => p.id === postId);
    if (post && currentUser?.role === UserRole.Admin) toggleItemFlag('webboardPosts', postId, "isPinned", post.userId, post.ownerId, post.isPinned);
    else if (currentUser?.role !== UserRole.Admin) alert("เฉพาะแอดมินเท่านั้นที่สามารถปักหมุดโพสต์ได้");
  };
  
  const handleSetUserRole = async (userIdToUpdate: string, newRole: UserRole) => {
    if (!USE_FIREBASE || currentUser?.role !== UserRole.Admin) { alert("คุณไม่มีสิทธิ์เปลี่ยนบทบาทผู้ใช้"); return; }
    if (userIdToUpdate === currentUser.id) { alert("ไม่สามารถเปลี่ยนบทบาทของตัวเองได้"); return; }
    const userToUpdate = users.find(u => u.id === userIdToUpdate);
    if (userToUpdate && userToUpdate.role === UserRole.Admin && newRole !== UserRole.Admin) { alert("ไม่สามารถลดบทบาทของ Admin หลักได้"); return; }
    try { await firebaseService.setUserRoleService(userIdToUpdate, newRole); alert(`อัปเดตบทบาทของผู้ใช้ @${userToUpdate?.username} เป็น ${newRole} เรียบร้อยแล้ว`); } 
    catch (error: any) { logFirebaseError("handleSetUserRole", error); alert(`อัปเดตบทบาทไม่สำเร็จ: ${error.message}`); }
  };

  const handleToggleSiteLock = async () => {
    if (!USE_FIREBASE || !currentUser || currentUser?.role !== UserRole.Admin) { alert("คุณไม่มีสิทธิ์ดำเนินการนี้"); return; }
    try { await firebaseService.setSiteLockService(!isSiteLocked, currentUser.id); } 
    catch (error: any) { logFirebaseError("handleToggleSiteLock", error); alert(`เปลี่ยนสถานะล็อกระบบไม่สำเร็จ: ${error.message}`); }
  };

  const handleFeedbackSubmit = async (feedbackText: string): Promise<boolean> => {
    if (!feedbackText.trim()) return false;
    setFeedbackSubmissionStatus('submitting'); setFeedbackSubmissionMessage(null);
    try {
      // Firebase feedback submission logic would go here if a service function existed
      // For now, logging locally as per original App.tsx structure if no service for feedback
      console.log("Feedback submitted (local simulation):", { feedback: feedbackText, page: currentView, userId: currentUser?.id || 'anon' });
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network
      setFeedbackSubmissionStatus('success'); setFeedbackSubmissionMessage('ขอบคุณสำหรับความคิดเห็น!'); setIsFeedbackModalOpen(false);
      setTimeout(() => { setFeedbackSubmissionStatus('idle'); setFeedbackSubmissionMessage(null); }, 4000);
      return true;
    } catch (error: any) { logFirebaseError("handleFeedbackSubmit", error); setFeedbackSubmissionStatus('error'); setFeedbackSubmissionMessage(`เกิดข้อผิดพลาดในการส่งความคิดเห็น: ${error.message}`); return false; }
  };

  // --- RENDER FUNCTIONS (No changes here, only in data fetching and handlers above) ---
  const renderNavLinks = (isMobile: boolean) => { /* ... UI only, no changes ... */ 
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
                สวัสดี, @{currentUser.displayName}!
                <UserLevelBadge level={displayBadge} size="sm" />
              </div>
            )}
            {!isMobile && (
               <div className={`font-sans font-medium mr-3 text-xs sm:text-sm items-center flex`}>
                สวัสดี, @{currentUser.displayName}!
                <UserLevelBadge level={displayBadge} size="sm" />
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
                + เสนอตัวช่วยงาน
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
              <Button onClick={() => navigateAndCloseMenu(View.Register)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                 <span className={navItemSpanClass}><span>📝</span><span>ลงทะเบียน</span></span>
              </Button>
            </>
        );
    }
  };
  const renderHeader = () => { /* ... UI only, no changes ... */ 
      return (
      <header
        className="sticky top-0 z-30 w-full bg-headerBlue-DEFAULT text-neutral-dark p-3 sm:p-4 shadow-md"
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex-shrink-0">
            <span
              onClick={() => { navigateTo(View.Home); setIsMobileMenuOpen(false); }}
              className="cursor-pointer font-sans font-bold text-lg text-neutral-dark"
              aria-label="ไปหน้าแรก HAJOBJA.COM"
            >
              HAJOBJA.COM
            </span>
          </div>

          <div className="flex items-center flex-shrink-0">
              <nav className="hidden sm:flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
              {renderNavLinks(false)}
              </nav>

              <div className="sm:hidden ml-2">
              <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 rounded-md text-neutral-dark hover:bg-neutral/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-neutral"
                  aria-label="Open menu"
                  aria-expanded={isMobileMenuOpen}
              >
                  <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
              </button>
              </div>
          </div>
        </div>
      </header>
    );
  };
  const renderMobileMenu = () => { /* ... UI only, no changes ... */ 
    if (!isMobileMenuOpen) return null;
    return (
      <div className="fixed inset-0 z-40 sm:hidden" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true"></div>
        <div className={`fixed top-0 right-0 h-full w-4/5 max-w-xs bg-white shadow-xl p-5 z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-sans font-semibold text-neutral-medium">เมนู</h2>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-md text-neutral-dark hover:bg-neutral-light/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary" aria-label="Close menu">
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <nav className="flex flex-col space-y-2">{renderNavLinks(true)}</nav>
        </div>
      </div>
    );
  };
  const renderHome = () => { /* ... UI only, no changes ... */ 
    return (
    <div className="flex flex-col items-center justify-center pt-3 sm:pt-4 pb-6 px-6 sm:pb-8 sm:px-8 text-center">
      <h2 className="text-3xl sm:text-4xl font-sans font-medium text-neutral-dark mb-2 tracking-tight leading-snug"> ✨ หาจ๊อบจ้า ✨ </h2>
      <p className="text-base sm:text-lg text-neutral-dark max-w-xl leading-relaxed mb-8 font-normal font-serif"> เชื่อมคนมีสกิลกับงานที่ใช่ มีใจก็ลองดู ❤︎ </p>
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-primary/30">
          <h3 className="text-lg font-sans font-semibold text-primary mb-4">หาคนทำงาน</h3>
          <div className="space-y-4">
            <Button onClick={() => { setSourceViewForForm(View.Home); navigateTo(View.PostJob); }} variant="primary" size="md" className="w-full">
              <span className="flex items-center justify-center gap-2"><span>📢</span><span>มีงานด่วน? ฝากไว้ตรงนี้</span></span>
            </Button>
            <Button onClick={() => navigateTo(View.FindHelpers)} variant="outline" colorScheme="primary" size="md" className="w-full">
              <span className="flex items-center justify-center gap-2"><span>🔍</span><span>กำลังหาคนช่วย? ดูโปรไฟล์เลย</span></span>
            </Button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-secondary/30">
          <h3 className="text-lg font-sans font-semibold text-secondary-hover mb-4">คนอยากหางาน</h3>
          <div className="space-y-4">
            <Button onClick={() => { setSourceViewForForm(View.Home); navigateTo(View.OfferHelp); }} variant="secondary" size="md" className="w-full">
              <span className="flex items-center justify-center gap-2"><span>🙋</span><span>ว่างอยู่! พร้อมรับงาน</span></span>
            </Button>
            <Button onClick={() => navigateTo(View.FindJobs)} variant="outline" colorScheme="secondary" size="md" className="w-full">
              <span className="flex items-center justify-center gap-2"><span>👀</span><span>อยากหางาน? ดูโพสต์งานเลย</span></span>
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-8 text-center font-mono text-xs text-gray-400"> HJJ v2 Beta </div>
    </div>
  );
  };
  const renderPostJob = () => { if (!currentUser) return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>; return <PostJobForm onSubmitJob={handleSubmitJobForm} onCancel={handleCancelEditOrPost} initialData={editingItemType === 'job' ? itemToEdit as Job : undefined} isEditing={!!itemToEdit && editingItemType === 'job'} />; };
  const renderOfferHelpForm = () => { if (!currentUser) return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>; return <OfferHelpForm onSubmitProfile={handleSubmitHelperProfileForm} onCancel={handleCancelEditOrPost} initialData={editingItemType === 'profile' ? itemToEdit as HelperProfile : undefined} isEditing={!!itemToEdit && editingItemType === 'profile'} />; };
  const renderFindJobs = () => { /* ... UI only, no changes ... */ 
    return (
    <div className="container mx-auto p-4 sm:p-8">
      <h2 className="text-3xl font-sans font-semibold text-primary mb-3 text-center">👀 รายการงาน</h2>
      <p className="text-md font-serif text-neutral-dark mb-8 text-center max-w-xl mx-auto font-normal"> มีเวลา มีทักษะ ลองทำดูนะ! </p>
      {currentUser && (<div className="text-center mb-8"><Button onClick={() => { setSourceViewForForm(View.FindJobs); navigateTo(View.PostJob);}} variant="primary" size="lg"><span className="flex items-center justify-center gap-2"><span>📣</span><span>มีงานด่วน? ฝากไว้ตรงนี้</span></span></Button></div>)}
      {jobs.length === 0 ? (<div className="text-center py-10"><svg className="mx-auto h-24 w-24 text-neutral-DEFAULT" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg><p className="mt-3 text-xl font-serif text-neutral-dark font-normal">ยังไม่มีงานประกาศในขณะนี้ ลองแวะมาใหม่นะ</p>{currentUser && jobs.length === 0 && ( <Button onClick={() => { setSourceViewForForm(View.FindJobs); navigateTo(View.PostJob);}} variant="primary" size="md" className="mt-6 font-medium"> เป็นคนแรกที่ลงประกาศงาน! </Button> )}{!currentUser && jobs.length === 0 && (<Button onClick={() => requestLoginForAction(View.PostJob)} variant="primary" size="md" className="mt-6 font-medium"> เข้าสู่ระบบเพื่อลงประกาศงาน </Button>)}</div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{jobs.map(job => (<JobCard key={job.id} job={job} navigateTo={navigateTo} currentUser={currentUser} requestLoginForAction={requestLoginForAction} />))}</div>)}
    </div>
  );};
  const renderFindHelpers = () => { /* ... UI only, no changes ... */ 
     const enrichedHelperProfilesList: EnrichedHelperProfile[] = helperProfiles.map(hp => {
      const user = users.find(u => u.id === hp.userId);
      return { ...hp, userPhoto: user?.photo, userAddress: user?.address, userDisplayName: user?.displayName || user?.username || 'User', verifiedExperienceBadge: hp.adminVerifiedExperience || false, profileCompleteBadge: user?.profileComplete || false, warningBadge: hp.isSuspicious || false, interestedCount: hp.interestedCount || 0, };
    });
    return (
    <div className="container mx-auto p-4 sm:p-8">
      <h2 className="text-3xl font-sans font-semibold text-secondary-hover mb-3 text-center">🧑‍🔧 คนขยันพร้อมช่วย อยู่ตรงนี้แล้ว</h2>
      <p className="text-md font-serif text-neutral-dark mb-8 text-center max-w-xl mx-auto font-normal"> เลือกคนที่ตรงกับความต้องการ แล้วติดต่อได้เลย! </p>
      {currentUser && (<div className="text-center mb-8"><Button onClick={() => { setSourceViewForForm(View.FindHelpers); navigateTo(View.OfferHelp); }} variant="secondary" size="lg"><span className="flex items-center justify-center gap-2"><span>🙋</span><span>ว่างอยู่! พร้อมรับงาน</span></span></Button></div>)}
      {enrichedHelperProfilesList.length === 0 ? (<div className="text-center py-10"><svg className="mx-auto h-24 w-24 text-neutral-DEFAULT" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-2.144M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg><p className="mt-3 text-xl font-serif text-neutral-dark font-normal">ยังไม่มีผู้เสนอตัวช่วยงานในขณะนี้</p>{currentUser && enrichedHelperProfilesList.length === 0 && ( <Button onClick={() => { setSourceViewForForm(View.FindHelpers); navigateTo(View.OfferHelp);}} variant="secondary" size="md" className="mt-6 font-medium"> เป็นคนแรกที่เสนอตัวช่วยงาน! </Button> )}{!currentUser && enrichedHelperProfilesList.length === 0 && (<Button onClick={() => requestLoginForAction(View.OfferHelp)} variant="secondary" size="md" className="mt-6 font-medium"> เข้าสู่ระบบเพื่อเสนอตัวช่วยงาน </Button>)}</div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{enrichedHelperProfilesList.map(profile => (<HelperCard key={profile.id} profile={profile} onNavigateToPublicProfile={handleNavigateToPublicProfile} navigateTo={navigateTo} onLogHelperContact={() => handleLogHelperContactInteraction(profile.id)} currentUser={currentUser} requestLoginForAction={requestLoginForAction} />))}</div>)}
    </div>);};
  const renderRegister = () => <RegistrationForm onRegister={handleRegister} onSwitchToLogin={() => navigateTo(View.Login)} />;
  const renderLogin = () => <LoginForm onLogin={handleLogin} onSwitchToRegister={() => navigateTo(View.Register)} />;
  const renderUserProfile = () => { if (!currentUser) return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>; return (<UserProfilePage currentUser={currentUser} onUpdateProfile={handleUpdateUserProfile} onCancel={() => navigateTo(View.Home)} />); };
  const renderAdminDashboard = () => { if (currentUser?.role !== UserRole.Admin) return <p className="text-center p-8 font-serif">คุณไม่มีสิทธิ์เข้าถึงหน้านี้...</p>; return (<AdminDashboard jobs={jobs} helperProfiles={helperProfiles} users={users} interactions={interactions} webboardPosts={webboardPosts} webboardComments={webboardComments} onDeleteJob={handleDeleteJob} onDeleteHelperProfile={handleDeleteHelperProfile} onToggleSuspiciousJob={handleToggleSuspiciousJob} onToggleSuspiciousHelperProfile={handleToggleSuspiciousHelperProfile} onTogglePinnedJob={handleTogglePinnedJob} onTogglePinnedHelperProfile={handleTogglePinnedHelperProfile} onToggleHiredJob={handleToggleHiredJobForUserOrAdmin} onToggleUnavailableHelperProfile={handleToggleUnavailableHelperProfileForUserOrAdmin} onToggleVerifiedExperience={handleToggleVerifiedExperience} onDeleteWebboardPost={handleDeleteWebboardPost} onPinWebboardPost={handlePinWebboardPost} onStartEditItem={handleStartEditItemFromAdmin} onSetUserRole={handleSetUserRole} currentUser={currentUser} isSiteLocked={isSiteLocked} onToggleSiteLock={handleToggleSiteLock} />); };
  const renderMyPostsPage = () => { if (!currentUser || currentUser.role === UserRole.Admin) return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทาง...</p>; return (<MyPostsPage currentUser={currentUser} jobs={jobs} helperProfiles={helperProfiles} webboardPosts={webboardPosts} webboardComments={webboardComments} onEditItem={handleStartEditMyItem} onDeleteItem={handleDeleteItemFromMyPosts} onToggleHiredStatus={handleToggleItemStatusFromMyPosts} navigateTo={navigateTo} getUserDisplayBadge={(user) => getUserDisplayBadge(user, webboardPosts, webboardComments)} />); };
  const renderAboutUsPage = () => <AboutUsPage />;
  const renderSafetyPage = () => <SafetyPage />;
  const renderPublicProfile = () => { if (!currentUser) return <p className="text-center p-8 font-serif">คุณต้องเข้าสู่ระบบเพื่อดูโปรไฟล์นี้...</p>; if (!viewingProfileId) { navigateTo(View.Home); return <p className="text-center p-8 font-serif">ไม่พบ ID โปรไฟล์...</p>; } const profileUser = users.find(u => u.id === viewingProfileId); if (!profileUser) return <p className="text-center p-8 font-serif text-red-500">ไม่พบโปรไฟล์ผู้ใช้</p>; if (profileUser.role === UserRole.Admin) return <div className="text-center p-8 font-serif text-red-500">โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้</div>; const helperProfileForBio = helperProfiles.find(hp => hp.userId === viewingProfileId); const displayBadge = getUserDisplayBadge(profileUser, webboardPosts, webboardComments); return <PublicProfilePage currentUser={currentUser} user={{...profileUser, userLevel: displayBadge}} helperProfile={helperProfileForBio} onBack={() => navigateTo(View.FindHelpers)} />; };
  const renderWebboardPage = () => { /* ... UI only, no changes ... */ 
    return (<WebboardPage currentUser={currentUser} users={users} posts={webboardPosts} comments={webboardComments} onAddOrUpdatePost={handleAddOrUpdateWebboardPost} onAddComment={handleAddWebboardComment} onToggleLike={handleToggleWebboardPostLike} onDeletePost={handleDeleteWebboardPost} onPinPost={handlePinWebboardPost} onEditPost={(post) => { setItemToEdit({...post, isEditing: true}); setEditingItemType('webboardPost'); setSelectedPostId('create'); setCurrentView(View.Webboard); }} onDeleteComment={handleDeleteWebboardComment} onUpdateComment={handleUpdateWebboardComment} selectedPostId={selectedPostId} setSelectedPostId={setSelectedPostId} navigateTo={navigateTo} editingPost={editingItemType === 'webboardPost' ? itemToEdit as WebboardPost : null} onCancelEdit={() => { setItemToEdit(null); setEditingItemType(null); setSelectedPostId(null); }} getUserDisplayBadge={(user) => getUserDisplayBadge(user, webboardPosts, webboardComments)} requestLoginForAction={requestLoginForAction} />);};

  let currentViewContent;
  if (isLoadingAuth && USE_FIREBASE) { currentViewContent = (<div className="flex justify-center items-center h-screen"><p className="text-xl font-sans text-neutral-dark dark:text-dark-text">กำลังโหลดข้อมูลผู้ใช้...</p></div>); } 
  else {
    switch (currentView) {
        case View.Home: currentViewContent = renderHome(); break;
        case View.PostJob: currentViewContent = renderPostJob(); break;
        case View.FindJobs: currentViewContent = renderFindJobs(); break;
        case View.OfferHelp: currentViewContent = renderOfferHelpForm(); break;
        case View.FindHelpers: currentViewContent = renderFindHelpers(); break;
        case View.Register: currentViewContent = renderRegister(); break;
        case View.Login: currentViewContent = renderLogin(); break;
        case View.AdminDashboard: currentViewContent = renderAdminDashboard(); break;
        case View.MyPosts: currentViewContent = renderMyPostsPage(); break;
        case View.UserProfile: currentViewContent = renderUserProfile(); break;
        case View.AboutUs: currentViewContent = renderAboutUsPage(); break;
        case View.PublicProfile: currentViewContent = renderPublicProfile(); break;
        case View.Safety: currentViewContent = renderSafetyPage(); break;
        case View.Webboard: currentViewContent = renderWebboardPage(); break;
        default: currentViewContent = renderHome();
    }
  }
  if (isSiteLocked && currentUser?.role !== UserRole.Admin) {
    return <SiteLockOverlay />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-light dark:bg-dark-pageBg font-serif text-neutral-dark dark:text-dark-text">
      {renderHeader()}
      {renderMobileMenu()}
      <main className="flex-grow container mx-auto px-0 sm:px-4 py-2 sm:py-6">
        {currentViewContent}
      </main>
      <footer className="bg-headerBlue-DEFAULT/70 dark:bg-dark-headerBg/70 text-neutral-dark dark:text-dark-textMuted p-4 text-center text-xs font-sans">
        <p>&copy; {new Date().getFullYear()} HAJOBJA.COM - All rights reserved.</p>
        <div className="mt-2 space-x-3">
          <button onClick={() => navigateTo(View.AboutUs)} className="hover:underline">เกี่ยวกับเรา</button>
          <button onClick={() => navigateTo(View.Safety)} className="hover:underline">ความปลอดภัย</button>
           <button onClick={() => setIsFeedbackModalOpen(true)} className="hover:underline">ส่ง Feedback</button>
        </div>
      </footer>
      <ConfirmModal isOpen={isConfirmModalOpen} onClose={closeConfirmModal} onConfirm={handleConfirmDeletion} title={confirmModalTitle} message={confirmModalMessage} />
      <FeedbackForm 
        isOpen={isFeedbackModalOpen}
        onClose={() => { setIsFeedbackModalOpen(false); setFeedbackSubmissionMessage(null); setFeedbackSubmissionStatus('idle');}}
        onSubmit={handleFeedbackSubmit}
        submissionStatus={feedbackSubmissionStatus}
        submissionMessage={feedbackSubmissionMessage}
      />
    </div>
  );
};

export default App;
