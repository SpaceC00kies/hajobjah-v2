
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

// --- START OF WORD BLACKLIST ---
export const THAI_PROFANITY_BLACKLIST: string[] = [
  "คำหยาบ1", "คำต้องห้าม2", "badword3", "inappropriate_phrase",
];

export const containsBlacklistedWords = (text: string): boolean => {
  if (!text || THAI_PROFANITY_BLACKLIST.length === 0) return false;
  const lowerText = text.toLowerCase();
  return THAI_PROFANITY_BLACKLIST.some(word => lowerText.includes(word.toLowerCase()));
};
// --- END OF WORD BLACKLIST ---

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
  const hasPersonalityInfo = !!(user.favoriteMusic?.trim() || user.favoriteBook?.trim() || user.favoriteMovie?.trim() || user.hobbies?.trim() || user.favoriteFood?.trim() || user.dislikedThing?.trim() || user.introSentence?.trim());
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
  return user.userLevel || calculateUserLevel(user.id, posts, comments);
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
  
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [helperProfiles, setHelperProfiles] = useState<HelperProfile[]>([]);
  const [webboardPosts, setWebboardPosts] = useState<WebboardPost[]>([]);
  const [webboardComments, setWebboardComments] = useState<WebboardComment[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [userClickedHelpersMap, setUserClickedHelpersMap] = useState<Record<string, string[]>>({});


  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isSiteLocked, setIsSiteLocked] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginRedirectInfo, setLoginRedirectInfo] = useState<{ view: View; payload?: any } | null>(null);
  const [itemToEdit, setItemToEdit] = useState<Job | HelperProfile | WebboardPost | null>(null);
  const [editingItemType, setEditingItemType] = useState<'job' | 'profile' | 'webboardPost' | null>(null);
  const [sourceViewForForm, setSourceViewForForm] = useState<View | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        loadedUsers,
        loadedJobs,
        loadedHelperProfiles,
        loadedWebboardPosts,
        loadedWebboardComments,
        loadedSiteConfig,
        loadedInteractions,
        loadedUserClickedHelpersMap,
        initialCurrentUser // from onAuthChange or initial check
      ] = await Promise.all([
        firebaseService.getAllUsersService(),
        firebaseService.getAllJobsService(),
        firebaseService.getAllHelperProfilesService(),
        firebaseService.getAllWebboardPostsService(),
        firebaseService.getAllWebboardCommentsService(),
        firebaseService.getSiteConfigService(),
        firebaseService.getAllInteractionsService(),
        firebaseService.getUserClickedHelpersMapService(),
        firebaseService.getCurrentUserService() // Get current user on initial load
      ]);

      setUsers(loadedUsers.map(u => ({...u, userLevel: calculateUserLevel(u.id, loadedWebboardPosts, loadedWebboardComments), profileComplete: checkProfileCompleteness(u) })));
      setJobs(loadedJobs);
      setHelperProfiles(loadedHelperProfiles);
      setWebboardPosts(loadedWebboardPosts);
      setWebboardComments(loadedWebboardComments);
      setIsSiteLocked(loadedSiteConfig.isSiteLocked);
      setInteractions(loadedInteractions);
      setUserClickedHelpersMap(loadedUserClickedHelpersMap);
      
      if (initialCurrentUser) {
         setCurrentUser({
          ...initialCurrentUser, 
          userLevel: calculateUserLevel(initialCurrentUser.id, loadedWebboardPosts, loadedWebboardComments),
          profileComplete: checkProfileCompleteness(initialCurrentUser)
        });
      } else {
        setCurrentUser(null);
      }

    } catch (error) {
      console.error("Error loading initial data:", error);
      // Handle error state if necessary
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);


  useEffect(() => {
    // Ensure light theme is default
    document.documentElement.classList.remove('dark');

    // Setup auth state listener
    const unsubscribe = firebaseService.onAuthChangeService((user) => {
        if (user) {
            const fullUser = users.find(u => u.id === user.id);
            if (fullUser) { // User exists in our local users array, update with latest from there if needed
                 setCurrentUser({
                  ...fullUser, 
                  userLevel: calculateUserLevel(fullUser.id, webboardPosts, webboardComments),
                  profileComplete: checkProfileCompleteness(fullUser)
                });
            } else if (user.id){ // User from auth but not yet in local users state (e.g. fresh login before full users list loaded)
                 setCurrentUser({
                  ...user,
                  userLevel: calculateUserLevel(user.id, webboardPosts, webboardComments),
                  profileComplete: checkProfileCompleteness(user)
                });
            }
        } else {
            setCurrentUser(null);
        }
    });
    return () => unsubscribe();
  }, [users, webboardPosts, webboardComments]); // Rerun if users array changes to find full user data


  // Recalculate user levels if posts/comments change for any user
  useEffect(() => {
    if (users.length > 0 && (webboardPosts.length > 0 || webboardComments.length > 0)) {
        setUsers(prevUsers =>
            prevUsers.map(u => ({
                ...u,
                userLevel: calculateUserLevel(u.id, webboardPosts, webboardComments),
                profileComplete: checkProfileCompleteness(u) // also recheck completeness
            }))
        );
    }
  }, [webboardPosts, webboardComments, users.length]); // Avoid infinite loop by not depending on 'users' itself

  // Update currentUser if their own data in the 'users' array changes
   useEffect(() => {
    if (currentUser?.id) {
      const liveUserFromUsersArray = users.find(u => u.id === currentUser.id);
      if (liveUserFromUsersArray) {
        if (JSON.stringify(currentUser) !== JSON.stringify(liveUserFromUsersArray)) {
           setCurrentUser(liveUserFromUsersArray);
        }
      } else {
        // Current user not found in users array, might mean they were deleted or data is inconsistent
        // This could happen if admin deletes user, log them out
        setCurrentUser(null); 
      }
    }
  }, [users, currentUser?.id]);


  const navigateTo = (view: View, payload?: any) => {
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
    const protectedViews: View[] = [View.PostJob, View.OfferHelp, View.UserProfile, View.MyPosts, View.AdminDashboard];
    
    if (view === View.PublicProfile && typeof payload === 'string') {
        const targetUser = users.find(u => u.id === payload);
        if (targetUser && targetUser.role === UserRole.Admin) {
            alert("โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้"); return;
        }
        if (!currentUser) { requestLoginForAction(view, payload); return; }
        setViewingProfileId(payload);
    } else if (view !== View.PublicProfile) {
      if (viewingProfileId !== null) setViewingProfileId(null);
    }
    
    if (!currentUser && protectedViews.includes(view)) {
      requestLoginForAction(view, payload); return;
    }

    if (view === View.Webboard) {
      if (typeof payload === 'string') {
        setSelectedPostId(payload === 'create' ? 'create' : payload);
      } else if (payload && typeof payload === 'object' && payload.postId) {
        setSelectedPostId(payload.postId);
      } else if (payload === null || payload === undefined) {
        setSelectedPostId(null);
      }
    } else if (selectedPostId !== null && view !== View.AdminDashboard) {
      setSelectedPostId(null);
    }
    setCurrentView(view);
  };

  const requestLoginForAction = (originalView: View, originalPayload?: any) => {
    if (!currentUser) {
      setLoginRedirectInfo({ view: originalView, payload: originalPayload });
      setCurrentView(View.Login);
      setIsMobileMenuOpen(false);
    }
  };
  
  const handleToggleSiteLock = async () => {
    if (currentUser?.role !== UserRole.Admin) {
      alert("คุณไม่มีสิทธิ์ดำเนินการนี้"); return;
    }
    const newLockStatus = !isSiteLocked;
    await firebaseService.setSiteLockService(newLockStatus, currentUser.id);
    setIsSiteLocked(newLockStatus);
  };

  const generateContactString = (user: User): string => {
    let contactParts: string[] = [];
    if (user.mobile) contactParts.push(`เบอร์โทร: ${user.mobile}`);
    if (user.lineId) contactParts.push(`LINE ID: ${user.lineId}`);
    if (user.facebook) contactParts.push(`Facebook: ${user.facebook}`);
    return contactParts.join('\n') || 'ไม่ระบุช่องทางติดต่อ';
  };

  const handleRegister = async (userData: Omit<User, 'id' | 'hashedPassword' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'role' | 'isMuted'> & { password: string }): Promise<boolean> => {
    try {
      if (!isValidThaiMobileNumberUtil(userData.mobile)) { alert('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'); return false; }
      if (!userData.gender || !userData.birthdate || !userData.educationLevel) { alert('กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน'); return false; }
      
      const newUser = await firebaseService.signUpWithEmailPasswordService(userData);
      if (newUser) {
        setUsers(prev => [...prev, newUser]);
        setCurrentUser(newUser);
        alert('ลงทะเบียนสำเร็จแล้ว!');
        if (loginRedirectInfo) { navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload); setLoginRedirectInfo(null); }
        else { navigateTo(View.Home); }
        return true;
      }
      return false;
    } catch (error: any) {
      alert(`ลงทะเบียนไม่สำเร็จ: ${error.message}`);
      return false;
    }
  };

  const handleLogin = async (loginIdentifier: string, passwordAttempt: string): Promise<boolean> => {
    try {
      const user = await firebaseService.signInWithEmailPasswordService(loginIdentifier, passwordAttempt);
      if (user) {
        const fullUserFromState = users.find(u => u.id === user.id);
        const userToSet = fullUserFromState ? 
            {...fullUserFromState, userLevel: calculateUserLevel(fullUserFromState.id, webboardPosts, webboardComments), profileComplete: checkProfileCompleteness(fullUserFromState)}
             : 
             {...user, userLevel: calculateUserLevel(user.id, webboardPosts, webboardComments), profileComplete: checkProfileCompleteness(user) } ;

        setCurrentUser(userToSet);
        alert(`ยินดีต้อนรับ @${userToSet.displayName}!`);
        if (loginRedirectInfo) { navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload); setLoginRedirectInfo(null); }
        else { navigateTo(View.Home); }
        return true;
      }
      return false; // Should not be reached if signInWithEmailPasswordService throws on failure
    } catch (error: any) {
      alert(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
      return false;
    }
  };

  const handleLogout = async () => {
    await firebaseService.signOutUserService();
    setCurrentUser(null);
    setLoginRedirectInfo(null); setItemToEdit(null); setEditingItemType(null);
    setSourceViewForForm(null); setViewingProfileId(null); setSelectedPostId(null);
    setIsMobileMenuOpen(false);
    alert('ออกจากระบบเรียบร้อยแล้ว');
    navigateTo(View.Home);
  };
  
  const handleUpdateUserProfile = async (updatedProfileData: Pick<User, 'mobile' | 'lineId' | 'facebook' | 'gender' | 'birthdate' | 'educationLevel' | 'photo' | 'address' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence'>): Promise<boolean> => {
    if (!currentUser) { alert('ไม่พบผู้ใช้ปัจจุบัน'); return false; }
    if (!isValidThaiMobileNumberUtil(updatedProfileData.mobile)) { alert('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'); return false; }
    if (!updatedProfileData.gender || updatedProfileData.gender === GenderOption.NotSpecified || !updatedProfileData.birthdate || !updatedProfileData.educationLevel || updatedProfileData.educationLevel === HelperEducationLevelOption.NotStated) {
      alert('กรุณากรอกข้อมูลส่วนตัว (เพศ, วันเกิด, ระดับการศึกษา) ให้ครบถ้วน'); return false;
    }
    try {
      const updatedUser = await firebaseService.updateUserProfileService(currentUser.id, updatedProfileData);
      setUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));
      // setCurrentUser(updatedUser); // Already handled by useEffect on users array
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      return false;
    }
  };
  
  const handleAddJob = async (newJobData) => {
    if (!currentUser) { requestLoginForAction(View.PostJob); return; }
    if (containsBlacklistedWords(newJobData.description) || containsBlacklistedWords(newJobData.title)) { alert('เนื้อหามีคำที่ไม่เหมาะสม'); return; }
    try {
      const newJob = await firebaseService.addJobService(newJobData, currentUser);
      setJobs(prev => [newJob, ...prev]);
      navigateTo(sourceViewForForm === View.MyPosts ? View.MyPosts : View.FindJobs);
      setSourceViewForForm(null);
      alert('เพิ่มประกาศงานเรียบร้อยแล้ว!');
    } catch (error) { console.error("Error adding job:", error); alert("เกิดข้อผิดพลาดในการเพิ่มประกาศงาน");}
  };

  const handleUpdateJob = async (updatedJobDataFromForm) => {
    if (!currentUser) { requestLoginForAction(View.PostJob); return; }
    const originalJob = jobs.find(j => j.id === updatedJobDataFromForm.id);
    if (!originalJob) { alert('ไม่พบประกาศงานเดิม'); return; }
    if (originalJob.userId !== currentUser.id && currentUser.role !== UserRole.Admin) { alert('ไม่มีสิทธิ์แก้ไข'); return; }
    if (containsBlacklistedWords(updatedJobDataFromForm.description) || containsBlacklistedWords(updatedJobDataFromForm.title)) { alert('เนื้อหามีคำที่ไม่เหมาะสม'); return; }
    try {
      const updatedJob = await firebaseService.updateJobService(updatedJobDataFromForm.id, updatedJobDataFromForm, currentUser);
      setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
      setItemToEdit(null); setEditingItemType(null);
      navigateTo(sourceViewForForm || View.Home); setSourceViewForForm(null);
      alert('แก้ไขประกาศงานเรียบร้อยแล้ว');
    } catch (error) { console.error("Error updating job:", error); alert("เกิดข้อผิดพลาดในการแก้ไขประกาศงาน");}
  };
  
  const handleSubmitJobForm = (formDataFromForm) => {
    if (formDataFromForm.id && itemToEdit && editingItemType === 'job') {
      handleUpdateJob(formDataFromForm);
    } else {
      handleAddJob(formDataFromForm);
    }
  };

  const handleAddHelperProfile = async (newProfileData) => {
    if (!currentUser) { requestLoginForAction(View.OfferHelp); return; }
    if (containsBlacklistedWords(newProfileData.details) || containsBlacklistedWords(newProfileData.profileTitle)) { alert('เนื้อหามีคำที่ไม่เหมาะสม'); return; }
    if (!currentUser.gender || !currentUser.birthdate || !currentUser.educationLevel || currentUser.gender === GenderOption.NotSpecified || currentUser.educationLevel === HelperEducationLevelOption.NotStated) {
        alert('กรุณาอัปเดตข้อมูลส่วนตัว (เพศ, วันเกิด, ระดับการศึกษา) ก่อน'); navigateTo(View.UserProfile); return;
    }
    try {
        const newProfile = await firebaseService.addHelperProfileService(newProfileData, currentUser);
        setHelperProfiles(prev => [newProfile, ...prev]);
        navigateTo(sourceViewForForm === View.MyPosts ? View.MyPosts : View.FindHelpers);
        setSourceViewForForm(null);
        alert('เพิ่มโปรไฟล์ผู้ช่วยเรียบร้อยแล้ว!');
    } catch (error) { console.error("Error adding helper profile:", error); alert("เกิดข้อผิดพลาดในการเพิ่มโปรไฟล์");}
  };

  const handleUpdateHelperProfile = async (updatedProfileDataFromForm) => {
    if (!currentUser) { requestLoginForAction(View.OfferHelp); return; }
    const originalProfile = helperProfiles.find(p => p.id === updatedProfileDataFromForm.id);
    if (!originalProfile) { alert('ไม่พบโปรไฟล์เดิม'); return; }
    if (originalProfile.userId !== currentUser.id && currentUser.role !== UserRole.Admin) { alert('ไม่มีสิทธิ์แก้ไข'); return; }
    if (containsBlacklistedWords(updatedProfileDataFromForm.details) || containsBlacklistedWords(updatedProfileDataFromForm.profileTitle)) { alert('เนื้อหามีคำที่ไม่เหมาะสม'); return; }
    try {
      const updatedProfile = await firebaseService.updateHelperProfileService(updatedProfileDataFromForm.id, updatedProfileDataFromForm, currentUser);
      setHelperProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
      setItemToEdit(null); setEditingItemType(null);
      navigateTo(sourceViewForForm || View.Home); setSourceViewForForm(null);
      alert('แก้ไขโปรไฟล์ผู้ช่วยเรียบร้อยแล้ว');
    } catch (error) { console.error("Error updating helper profile:", error); alert("เกิดข้อผิดพลาดในการแก้ไขโปรไฟล์");}
  };

  const handleSubmitHelperProfileForm = (formDataFromForm) => {
    if (formDataFromForm.id && itemToEdit && editingItemType === 'profile') {
      handleUpdateHelperProfile(formDataFromForm);
    } else {
      handleAddHelperProfile(formDataFromForm);
    }
  };

  const handleCancelEditOrPost = () => {
    const targetView = sourceViewForForm || View.Home;
    setItemToEdit(null); setEditingItemType(null); setSourceViewForForm(null); setSelectedPostId(null);
    navigateTo(targetView);
  };
  
  const openConfirmModal = (title, message, onConfirm) => {
    setConfirmModalTitle(title); setConfirmModalMessage(message);
    setOnConfirmAction(() => onConfirm); setIsConfirmModalOpen(true);
  };
  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false); setConfirmModalMessage(''); setConfirmModalTitle(''); setOnConfirmAction(null);
  };
  const handleConfirmDeletion = () => { if (onConfirmAction) onConfirmAction(); closeConfirmModal(); };

  const handleDeleteJob = (jobId) => {
    const job = jobs.find(j => j.id === jobId); if (!job) return;
    if (job.userId !== currentUser?.id && currentUser?.role !== UserRole.Admin) { alert('ไม่มีสิทธิ์ลบ'); return; }
    openConfirmModal('ยืนยันลบงาน', `ต้องการลบ "${job.title}"?`, async () => {
      await firebaseService.deleteJobService(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      alert(`ลบ "${job.title}" แล้ว`);
    });
  };

  const handleDeleteHelperProfile = (profileId) => {
    const profile = helperProfiles.find(p => p.id === profileId); if (!profile) return;
    if (profile.userId !== currentUser?.id && currentUser?.role !== UserRole.Admin) { alert('ไม่มีสิทธิ์ลบ'); return; }
    openConfirmModal('ยืนยันลบโปรไฟล์', `ต้องการลบ "${profile.profileTitle}"?`, async () => {
      await firebaseService.deleteHelperProfileService(profileId);
      setHelperProfiles(prev => prev.filter(p => p.id !== profileId));
      alert(`ลบ "${profile.profileTitle}" แล้ว`);
    });
  };
  
  const handleDeleteItemFromMyPosts = (itemId, itemType) => {
    if (itemType === 'job') handleDeleteJob(itemId);
    else if (itemType === 'profile') handleDeleteHelperProfile(itemId);
    else if (itemType === 'webboardPost') handleDeleteWebboardPost(itemId);
  };
  
  // Admin Toggles
  const createToggleHandler = (setter, serviceFunc, itemType) => async (itemId, currentStatus) => {
    await serviceFunc(itemId, !currentStatus);
    setter(prevItems => prevItems.map(item => item.id === itemId ? { ...item, [itemType]: !currentStatus } : item));
  };
  const handleToggleSuspiciousJob = createToggleHandler(setJobs, firebaseService.toggleSuspiciousJobService, 'isSuspicious');
  const handleTogglePinnedJob = createToggleHandler(setJobs, firebaseService.togglePinnedJobService, 'isPinned');
  const handleToggleHiredJobForUserOrAdmin = createToggleHandler(setJobs, firebaseService.toggleHiredJobService, 'isHired');

  const handleToggleSuspiciousHelperProfile = createToggleHandler(setHelperProfiles, firebaseService.toggleSuspiciousHelperProfileService, 'isSuspicious');
  const handleTogglePinnedHelperProfile = createToggleHandler(setHelperProfiles, firebaseService.togglePinnedHelperProfileService, 'isPinned');
  const handleToggleUnavailableHelperProfileForUserOrAdmin = createToggleHandler(setHelperProfiles, firebaseService.toggleUnavailableHelperProfileService, 'isUnavailable');
  const handleToggleVerifiedExperience = createToggleHandler(setHelperProfiles, firebaseService.toggleVerifiedExperienceService, 'adminVerifiedExperience');

  const handleToggleItemStatusFromMyPosts = (itemId, itemType) => {
    if (itemType === 'job') {
        const job = jobs.find(j => j.id === itemId);
        if (job) handleToggleHiredJobForUserOrAdmin(itemId, job.isHired);
    } else if (itemType === 'profile') {
        const profile = helperProfiles.find(p => p.id === itemId);
        if (profile) handleToggleUnavailableHelperProfileForUserOrAdmin(itemId, profile.isUnavailable);
    }
  };

  const handleLogHelperContactInteraction = async (helperProfileId) => {
    if (!currentUser) { requestLoginForAction(View.FindHelpers, { intent: 'contactHelper', postId: helperProfileId }); return; }
    const helper = helperProfiles.find(hp => hp.id === helperProfileId);
    if (!helper || currentUser.id === helper.userId) return;

    let currentClickedMap = { ...userClickedHelpersMap };
    const userClickedList = currentClickedMap[currentUser.id] || [];

    if (!userClickedList.includes(helperProfileId)) {
      await firebaseService.logHelperContactInteractionService(helper.userId, currentUser.id);
      setHelperProfiles(prev => prev.map(hp => hp.id === helperProfileId ? { ...hp, interestedCount: (hp.interestedCount || 0) + 1 } : hp));
      currentClickedMap[currentUser.id] = [...userClickedList, helperProfileId];
      setUserClickedHelpersMap(currentClickedMap);
      await firebaseService.updateUserClickedHelpersMapService(currentClickedMap); // Persist map
    }
  };
  
  // Webboard Functions
  const handleAddOrUpdateWebboardPost = async (postData, postIdToUpdate) => {
    if (!currentUser) { requestLoginForAction(View.Webboard, { action: postIdToUpdate ? 'editPost' : 'createPost', postId: postIdToUpdate }); return; }
    if (containsBlacklistedWords(postData.title) || containsBlacklistedWords(postData.body)) { alert('เนื้อหามีคำที่ไม่เหมาะสม'); return; }
    try {
      if (postIdToUpdate) {
        const updatedPost = await firebaseService.updateWebboardPostService(postIdToUpdate, postData, currentUser);
        setWebboardPosts(prev => prev.map(p => p.id === postIdToUpdate ? updatedPost : p));
        alert('แก้ไขโพสต์เรียบร้อย!');
      } else {
        const newPost = await firebaseService.addWebboardPostService(postData, currentUser);
        setWebboardPosts(prev => [newPost, ...prev]);
        alert('สร้างโพสต์ใหม่เรียบร้อย!');
        postIdToUpdate = newPost.id; // For navigation
      }
      setItemToEdit(null); setEditingItemType(null);
      setSelectedPostId(postIdToUpdate || null);
      navigateTo(View.Webboard, postIdToUpdate);
    } catch (error) { console.error("Error add/update webboard post:", error); alert("เกิดข้อผิดพลาด");}
  };

  const handleAddWebboardComment = async (postId, text) => {
    if (!currentUser) { requestLoginForAction(View.Webboard, { action: 'comment', postId: postId }); return; }
    if (containsBlacklistedWords(text)) { alert('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม'); return; }
    try {
      const newComment = await firebaseService.addWebboardCommentService(postId, { text }, currentUser);
      setWebboardComments(prev => [...prev, newComment]);
    } catch (error) { console.error("Error adding comment:", error); alert("เกิดข้อผิดพลาดในการเพิ่มคอมเมนต์");}
  };

  const handleUpdateWebboardComment = async (commentId, newText) => {
    if (!currentUser) { alert("ต้องเข้าสู่ระบบเพื่อแก้ไข"); return; }
    if (containsBlacklistedWords(newText)) { alert('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม'); return; }
    try {
      const updatedComment = await firebaseService.updateWebboardCommentService(commentId, newText, currentUser);
      setWebboardComments(prev => prev.map(c => c.id === commentId ? updatedComment : c));
      alert('แก้ไขคอมเมนต์เรียบร้อย');
    } catch (error) { console.error("Error updating comment:", error); alert("เกิดข้อผิดพลาดในการแก้ไขคอมเมนต์");}
  };
  
  const handleDeleteWebboardComment = (commentId) => {
    const comment = webboardComments.find(c => c.id === commentId); if (!comment) return;
    if (!currentUser) { alert("ต้องเข้าสู่ระบบเพื่อลบ"); return; }
    // Permission logic (author, admin, mod)
    const author = users.find(u => u.id === comment.userId);
    let canDelete = (currentUser.id === comment.userId) || (currentUser.role === UserRole.Admin) || (currentUser.role === UserRole.Moderator && author?.role !== UserRole.Admin);
    if (!canDelete) { alert('ไม่มีสิทธิ์ลบคอมเมนต์นี้'); return; }

    openConfirmModal('ยืนยันลบคอมเมนต์', `ต้องการลบคอมเมนต์นี้?`, async () => {
      await firebaseService.deleteWebboardCommentService(commentId);
      setWebboardComments(prev => prev.filter(c => c.id !== commentId));
      alert('ลบคอมเมนต์แล้ว');
    });
  };

  const handleToggleWebboardPostLike = async (postId) => {
    if (!currentUser) { requestLoginForAction(View.Webboard, { action: 'like', postId: postId }); return; }
    try {
        const updatedPost = await firebaseService.toggleWebboardPostLikeService(postId, currentUser.id);
        setWebboardPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
    } catch (error) { console.error("Error toggling like:", error); }
  };
  
  const handleDeleteWebboardPost = (postId) => {
    const post = webboardPosts.find(p => p.id === postId); if (!post) return;
    // Permission logic
    const author = users.find(u => u.id === post.userId);
    let canDelete = (currentUser?.id === post.userId) || (currentUser?.role === UserRole.Admin) || (currentUser?.role === UserRole.Moderator && author?.role !== UserRole.Admin);
    if (!canDelete) { alert('ไม่มีสิทธิ์ลบโพสต์นี้'); return; }
    
    openConfirmModal('ยืนยันลบโพสต์', `ต้องการลบ "${post.title}" และคอมเมนต์ทั้งหมด?`, async () => {
      await firebaseService.deleteWebboardPostService(postId);
      setWebboardPosts(prev => prev.filter(p => p.id !== postId));
      setWebboardComments(prev => prev.filter(c => c.postId !== postId)); // Also clear comments from state
      alert(`ลบ "${post.title}" แล้ว`);
      if (selectedPostId === postId) { setSelectedPostId(null); navigateTo(View.Webboard); }
    });
  };

  const handlePinWebboardPost = createToggleHandler(setWebboardPosts, firebaseService.togglePinWebboardPostService, 'isPinned');

  const handleSetUserRole = async (userId, newRole) => {
    if (currentUser?.role !== UserRole.Admin || userId === currentUser.id) { alert('ไม่มีสิทธิ์หรือพยายามเปลี่ยนบทบาทตัวเอง'); return; }
    const userToUpdate = users.find(u => u.id === userId);
    if (userToUpdate?.role === UserRole.Admin && newRole !== UserRole.Admin) { alert("ไม่สามารถเปลี่ยนบทบาทของ Admin หลักได้"); return; }
    await firebaseService.setUserRoleService(userId, newRole);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    alert(`อัปเดตบทบาทของ @${userToUpdate?.username} เป็น ${newRole} แล้ว`);
  };

  const handleFeedbackSubmit = async (feedbackText) => {
    if (!feedbackText.trim()) { setFeedbackSubmissionStatus('error'); setFeedbackSubmissionMessage('กรุณาใส่ความคิดเห็น'); return false; }
    setFeedbackSubmissionStatus('submitting'); setFeedbackSubmissionMessage(null);
    try {
        // Using Formspree as a simple backend for feedback
        const response = await fetch('https://formspree.io/f/xvgaepzq', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ feedback: feedbackText, page: currentView, timestamp: new Date().toISOString(), userId: currentUser?.id || 'anonymous', userAgent: navigator.userAgent })
        });
        if (response.ok) {
            setFeedbackSubmissionStatus('success'); setFeedbackSubmissionMessage('ขอบคุณสำหรับความคิดเห็น!'); setIsFeedbackModalOpen(false);
            setTimeout(() => { setFeedbackSubmissionStatus('idle'); setFeedbackSubmissionMessage(null); }, 4000);
            return true;
        } else {
            const errorData = await response.json();
            const errorMessage = errorData.errors?.map((e:any) => e.message).join(', ') || 'เกิดข้อผิดพลาดในการส่ง';
            setFeedbackSubmissionStatus('error'); setFeedbackSubmissionMessage(errorMessage); return false;
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        setFeedbackSubmissionStatus('error'); setFeedbackSubmissionMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ'); return false;
    }
  };
  
  const handleStartEditItemFromAdmin = (item) => {
    if (item.itemType === 'job') { setItemToEdit(item.originalItem as Job); setEditingItemType('job'); }
    else if (item.itemType === 'profile') { setItemToEdit(item.originalItem as HelperProfile); setEditingItemType('profile'); }
    else if (item.itemType === 'webboardPost') { setItemToEdit({ ...(item.originalItem as WebboardPost), isEditing: true }); setEditingItemType('webboardPost'); }
    setSourceViewForForm(View.AdminDashboard);
    navigateTo(item.itemType === 'job' ? View.PostJob : item.itemType === 'profile' ? View.OfferHelp : View.Webboard, item.itemType === 'webboardPost' ? 'create' : undefined);
  };

  const handleStartEditMyItem = (itemId, itemType) => {
    let originalItem;
    if (itemType === 'job') originalItem = jobs.find(i => i.id === itemId);
    else if (itemType === 'profile') originalItem = helperProfiles.find(i => i.id === itemId);
    else if (itemType === 'webboardPost') originalItem = webboardPosts.find(i => i.id === itemId);

    if (originalItem && originalItem.userId === currentUser?.id) {
        setItemToEdit(itemType === 'webboardPost' ? {...originalItem, isEditing: true } : originalItem);
        setEditingItemType(itemType);
        setSourceViewForForm(View.MyPosts);
        navigateTo(itemType === 'job' ? View.PostJob : itemType === 'profile' ? View.OfferHelp : View.Webboard, itemType === 'webboardPost' ? 'create' : undefined);
    } else { alert("ไม่พบรายการ หรือคุณไม่ใช่เจ้าของ"); }
  };

  // --- RENDER LOGIC ---
  // (Header, Mobile Menu, Footer, and View rendering functions remain largely the same,
  // but will now use the state variables populated by firebaseService)
  // ... All renderNavLinks, renderHeader, renderMobileMenu, renderHome etc.
  // The key change is that they consume state that is now managed via firebaseService

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
                สวัสดี, @{currentUser.displayName}!
                <UserLevelBadge level={displayBadge} size="sm" />
              </div>
            )}
            {!isMobile && (
               <div className={`font-sans font-medium mr-2 text-xs sm:text-sm items-center flex`}>
                สวัสดี, @{currentUser.displayName}! 🎉
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


  const renderHeader = () => {
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

  const renderMobileMenu = () => {
    if (!isMobileMenuOpen) return null;

    return (
      <div className="fixed inset-0 z-40 sm:hidden" role="dialog" aria-modal="true">
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        ></div>

        <div
          className={`fixed top-0 right-0 h-full w-4/5 max-w-xs bg-white shadow-xl p-5 z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-sans font-semibold text-neutral-medium">เมนู</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 rounded-md text-neutral-dark hover:bg-neutral-light/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              aria-label="Close menu"
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col space-y-2">
            {renderNavLinks(true)}
          </nav>
        </div>
      </div>
    );
  };

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center pt-3 sm:pt-4 pb-6 px-6 sm:pb-8 sm:px-8 text-center">
      <h2 className="text-3xl sm:text-4xl font-sans font-medium text-neutral-dark mb-2 tracking-tight leading-snug">
        ✨ หาจ๊อบจ้า ✨
      </h2>
      <p className="text-base sm:text-lg text-neutral-dark max-w-xl leading-relaxed mb-8 font-normal font-serif">
        เชื่อมคนมีสกิลกับงานที่ใช่ มีใจก็ลองดู ❤︎
      </p>

      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-primary/30">
          <h3 className="text-lg font-sans font-semibold text-primary mb-4">หาคนทำงาน</h3>
          <div className="space-y-4">
            <Button
              onClick={() => {
                setSourceViewForForm(View.Home);
                navigateTo(View.PostJob); 
              }}
              variant="primary"
              size="lg"
              className="w-full text-base md:text-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <span>📢</span>
                <span>มีงานด่วน? ฝากไว้ตรงนี้</span>
              </span>
            </Button>
            <Button
              onClick={() => navigateTo(View.FindHelpers)}
              variant="outline"
              colorScheme="primary"
              size="lg"
              className="w-full text-base md:text-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <span>🔍</span>
                <span>กำลังหาคนช่วย? ดูโปรไฟล์เลย</span>
              </span>
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-secondary/30">
          <h3 className="text-lg font-sans font-semibold text-secondary-hover mb-4">คนอยากหางาน</h3>
          <div className="space-y-4">
            <Button
              onClick={() => {
                setSourceViewForForm(View.Home);
                navigateTo(View.OfferHelp); 
              }}
              variant="secondary"
              size="lg"
              className="w-full text-base md:text-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <span>🙋</span>
                <span>ว่างอยู่! พร้อมรับงาน</span>
              </span>
            </Button>
            <Button
              onClick={() => navigateTo(View.FindJobs)}
              variant="outline"
              colorScheme="secondary"
              size="lg"
              className="w-full text-base md:text-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <span>👀</span>
                <span>อยากหางาน? ดูโพสต์งานเลย</span>
              </span>
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-8 text-center font-mono text-xs text-gray-400">
        HJJ v2 (Service Mode)
      </div>
    </div>
  );

    const renderPostJob = () => {
    if (!currentUser) {
      return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>;
    }
    return (
      <PostJobForm
        onSubmitJob={handleSubmitJobForm}
        onCancel={handleCancelEditOrPost}
        initialData={editingItemType === 'job' ? itemToEdit as Job : undefined}
        isEditing={!!itemToEdit && editingItemType === 'job'}
      />
    );
  };

  const renderOfferHelpForm = () => {
    if (!currentUser) {
      return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>;
    }
    return (
      <OfferHelpForm
        onSubmitProfile={handleSubmitHelperProfileForm}
        onCancel={handleCancelEditOrPost}
        initialData={editingItemType === 'profile' ? itemToEdit as HelperProfile : undefined}
        isEditing={!!itemToEdit && editingItemType === 'profile'}
      />
    );
  };

  const renderFindJobs = () => (
    <div className="container mx-auto p-4 sm:p-8">
      <h2 className="text-3xl font-sans font-semibold text-primary mb-3 text-center">👀 รายการงาน</h2>
      <p className="text-md font-serif text-neutral-dark mb-8 text-center max-w-xl mx-auto font-normal">
        มีเวลา มีทักษะ ลองทำดูนะ!
      </p>
      {currentUser && (
        <div className="text-center mb-8">
          <Button
            onClick={() => {
              setSourceViewForForm(View.FindJobs);
              navigateTo(View.PostJob);
            }}
            variant="primary"
            size="lg"
          >
            <span className="flex items-center justify-center gap-2">
              <span>📣</span>
              <span>มีงานด่วน? ฝากไว้ตรงนี้</span>
            </span>
          </Button>
        </div>
      )}
      {jobs.length === 0 ? (
        <div className="text-center py-10">
          <svg className="mx-auto h-24 w-24 text-neutral-DEFAULT" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <p className="mt-3 text-xl font-serif text-neutral-dark font-normal">ยังไม่มีงานประกาศในขณะนี้ ลองแวะมาใหม่นะ</p>
          {currentUser && jobs.length === 0 && ( 
            <Button onClick={() => { setSourceViewForForm(View.FindJobs); navigateTo(View.PostJob);}} variant="primary" size="md" className="mt-6 font-medium">
              เป็นคนแรกที่ลงประกาศงาน!
            </Button>
          )}
          {!currentUser && jobs.length === 0 && (
            <Button onClick={() => requestLoginForAction(View.PostJob)} variant="primary" size="md" className="mt-6 font-medium">
              เข้าสู่ระบบเพื่อลงประกาศงาน
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {jobs.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.postedAt instanceof Date ? b.postedAt.toISOString() : b.postedAt as string).getTime() - new Date(a.postedAt instanceof Date ? a.postedAt.toISOString() : a.postedAt as string).getTime()).map(job => (
            <JobCard key={job.id} job={job} navigateTo={navigateTo} currentUser={currentUser} requestLoginForAction={requestLoginForAction} />
          ))}
        </div>
      )}
    </div>
  );

  const renderFindHelpers = () => {
    const enrichedHelperProfilesList: EnrichedHelperProfile[] = helperProfiles.map(hp => {
      const user = users.find(u => u.id === hp.userId);
      return {
        ...hp,
        userPhoto: user?.photo,
        userAddress: user?.address,
        userDisplayName: user?.displayName || user?.username || 'User',
        verifiedExperienceBadge: hp.adminVerifiedExperience || false,
        profileCompleteBadge: user?.profileComplete || false,
        warningBadge: hp.isSuspicious || false,
        interestedCount: hp.interestedCount || 0,
      };
    }).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.postedAt instanceof Date ? b.postedAt.toISOString() : b.postedAt as string).getTime() - new Date(a.postedAt instanceof Date ? a.postedAt.toISOString() : a.postedAt as string).getTime());

    return (
    <div className="container mx-auto p-4 sm:p-8">
      <h2 className="text-3xl font-sans font-semibold text-secondary-hover mb-3 text-center">🧑‍🔧 คนขยันพร้อมช่วย อยู่ตรงนี้แล้ว</h2>
      <p className="text-md font-serif text-neutral-dark mb-8 text-center max-w-xl mx-auto font-normal">
        เลือกคนที่ตรงกับความต้องการ แล้วติดต่อได้เลย!
      </p>
      {currentUser && (
        <div className="text-center mb-8">
          <Button
            onClick={() => {
              setSourceViewForForm(View.FindHelpers);
              navigateTo(View.OfferHelp);
            }}
            variant="secondary"
            size="lg"
          >
            <span className="flex items-center justify-center gap-2">
              <span>🙋</span>
              <span>ว่างอยู่! พร้อมรับงาน</span>
            </span>
          </Button>
        </div>
      )}
      {enrichedHelperProfilesList.length === 0 ? (
         <div className="text-center py-10">
           <svg className="mx-auto h-24 w-24 text-neutral-DEFAULT" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-2.144M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <p className="mt-3 text-xl font-serif text-neutral-dark font-normal">ยังไม่มีผู้เสนอตัวช่วยงานในขณะนี้</p>
          {currentUser && enrichedHelperProfilesList.length === 0 && ( 
            <Button onClick={() => { setSourceViewForForm(View.FindHelpers); navigateTo(View.OfferHelp);}} variant="secondary" size="md" className="mt-6 font-medium">
              เป็นคนแรกที่เสนอตัวช่วยงาน!
            </Button>
          )}
          {!currentUser && enrichedHelperProfilesList.length === 0 && (
             <Button onClick={() => requestLoginForAction(View.OfferHelp)} variant="secondary" size="md" className="mt-6 font-medium">
              เข้าสู่ระบบเพื่อเสนอตัวช่วยงาน
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {enrichedHelperProfilesList.map(profile => (
            <HelperCard
              key={profile.id}
              profile={profile}
              onNavigateToPublicProfile={(userId) => navigateTo(View.PublicProfile, userId)}
              navigateTo={navigateTo}
              onLogHelperContact={() => handleLogHelperContactInteraction(profile.id)}
              currentUser={currentUser}
              requestLoginForAction={requestLoginForAction}
            />
          ))}
        </div>
      )}
    </div>
    );
  };

  const renderRegister = () => <RegistrationForm onRegister={handleRegister} onSwitchToLogin={() => navigateTo(View.Login)} />;
  const renderLogin = () => <LoginForm onLogin={handleLogin} onSwitchToRegister={() => navigateTo(View.Register)} />;
  
  const renderUserProfile = () => {
    if (!currentUser) return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทาง...</p>;
    return <UserProfilePage currentUser={currentUser} onUpdateProfile={handleUpdateUserProfile} onCancel={() => navigateTo(View.Home)} />;
  };

  const renderAdminDashboard = () => {
    if (currentUser?.role !== UserRole.Admin) return <p className="text-center p-8 font-serif">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กำลังเปลี่ยนเส้นทาง...</p>;
    return (
      <AdminDashboard
        jobs={jobs} helperProfiles={helperProfiles} users={users} interactions={interactions}
        webboardPosts={webboardPosts} webboardComments={webboardComments}
        onDeleteJob={handleDeleteJob} onDeleteHelperProfile={handleDeleteHelperProfile}
        onToggleSuspiciousJob={(jobId) => {const j = jobs.find(x=>x.id===jobId); if(j) handleToggleSuspiciousJob(jobId, j.isSuspicious);}}
        onToggleSuspiciousHelperProfile={(profileId) => {const p = helperProfiles.find(x=>x.id===profileId); if(p) handleToggleSuspiciousHelperProfile(profileId, p.isSuspicious);}}
        onTogglePinnedJob={(jobId) => {const j = jobs.find(x=>x.id===jobId); if(j) handleTogglePinnedJob(jobId, j.isPinned);}}
        onTogglePinnedHelperProfile={(profileId) => {const p = helperProfiles.find(x=>x.id===profileId); if(p) handleTogglePinnedHelperProfile(profileId, p.isPinned);}}
        onToggleHiredJob={(jobId) => {const j = jobs.find(x=>x.id===jobId); if(j) handleToggleHiredJobForUserOrAdmin(jobId, j.isHired);}}
        onToggleUnavailableHelperProfile={(profileId) => {const p = helperProfiles.find(x=>x.id===profileId); if(p) handleToggleUnavailableHelperProfileForUserOrAdmin(profileId, p.isUnavailable);}}
        onToggleVerifiedExperience={(profileId) => {const p = helperProfiles.find(x=>x.id===profileId); if(p) handleToggleVerifiedExperience(profileId, p.adminVerifiedExperience || false);}}
        onDeleteWebboardPost={handleDeleteWebboardPost}
        onPinWebboardPost={(postId) => {const p = webboardPosts.find(x=>x.id===postId); if(p) handlePinWebboardPost(postId, p.isPinned || false);}}
        onStartEditItem={handleStartEditItemFromAdmin}
        onSetUserRole={handleSetUserRole}
        currentUser={currentUser}
        isSiteLocked={isSiteLocked} onToggleSiteLock={handleToggleSiteLock}
      />
    );
  };
  
  const renderMyPostsPage = () => {
    if (!currentUser || currentUser.role === UserRole.Admin) return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทาง...</p>;
    return (
        <MyPostsPage
            currentUser={currentUser} jobs={jobs} helperProfiles={helperProfiles}
            webboardPosts={webboardPosts} webboardComments={webboardComments}
            onEditItem={handleStartEditMyItem} onDeleteItem={handleDeleteItemFromMyPosts}
            onToggleHiredStatus={handleToggleItemStatusFromMyPosts}
            navigateTo={navigateTo}
            getUserDisplayBadge={(user) => getUserDisplayBadge(user, webboardPosts, webboardComments)}
        />
    );
  };

  const renderPublicProfile = () => {
    if (!currentUser) { requestLoginForAction(View.PublicProfile, viewingProfileId); return <p className="text-center p-8 font-serif">คุณต้องเข้าสู่ระบบเพื่อดูโปรไฟล์นี้ กำลังเปลี่ยนเส้นทาง...</p>; }
    if (!viewingProfileId) { navigateTo(View.Home); return <p className="text-center p-8 font-serif">ไม่พบ ID โปรไฟล์...</p>; }
    const profileUser = users.find(u => u.id === viewingProfileId);
    if (!profileUser) return <p className="text-center p-8 font-serif text-red-500">ไม่พบโปรไฟล์ผู้ใช้</p>;
    if (profileUser.role === UserRole.Admin) return <div className="text-center p-8 font-serif text-red-500">โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้</div>;
    const helperProfileForBio = helperProfiles.find(hp => hp.userId === viewingProfileId);
    const displayBadge = getUserDisplayBadge(profileUser, webboardPosts, webboardComments);
    return <PublicProfilePage currentUser={currentUser} user={{...profileUser, userLevel: displayBadge}} helperProfile={helperProfileForBio} onBack={() => navigateTo(View.FindHelpers)} />;
  };
  
  const renderWebboardPage = () => (
    <WebboardPage
        currentUser={currentUser} users={users} posts={webboardPosts} comments={webboardComments}
        onAddOrUpdatePost={handleAddOrUpdateWebboardPost} onAddComment={handleAddWebboardComment}
        onToggleLike={handleToggleWebboardPostLike} onDeletePost={handleDeleteWebboardPost}
        onPinPost={(postId) => {const p = webboardPosts.find(x=>x.id===postId); if(p) handlePinWebboardPost(postId, p.isPinned || false);}}
        onEditPost={(post) => { setItemToEdit({...post, isEditing: true}); setEditingItemType('webboardPost'); setSelectedPostId('create'); setCurrentView(View.Webboard); }}
        onDeleteComment={handleDeleteWebboardComment} onUpdateComment={handleUpdateWebboardComment}
        selectedPostId={selectedPostId} setSelectedPostId={setSelectedPostId} navigateTo={navigateTo}
        editingPost={editingItemType === 'webboardPost' ? itemToEdit as WebboardPost : null}
        onCancelEdit={() => { setItemToEdit(null); setEditingItemType(null); setSelectedPostId(null); }}
        getUserDisplayBadge={(user) => getUserDisplayBadge(user, webboardPosts, webboardComments)}
        requestLoginForAction={requestLoginForAction}
    />
  );
  
  const renderAboutUsPage = () => <AboutUsPage />;
  const renderSafetyPage = () => <SafetyPage />;


  let currentViewContent;
  if (isLoading) {
    currentViewContent = <div className="text-center p-10 text-lg font-serif">กำลังโหลดข้อมูล...</div>;
  } else {
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
    <>
      {renderMobileMenu()}
      <div className="flex flex-col flex-1 bg-neutral-light min-h-screen">
        {renderHeader()}
        <main className="flex-1 overflow-y-auto pt-20 sm:pt-24 pb-16">
          {currentViewContent}
        </main>
        <ConfirmModal isOpen={isConfirmModalOpen} onClose={closeConfirmModal} onConfirm={handleConfirmDeletion} title={confirmModalTitle} message={confirmModalMessage} />
        <FeedbackForm isOpen={isFeedbackModalOpen} onClose={() => { setIsFeedbackModalOpen(false); if (feedbackSubmissionStatus !== 'success') { setFeedbackSubmissionStatus('idle'); setFeedbackSubmissionMessage(null); }}}
            onSubmit={handleFeedbackSubmit} submissionStatus={feedbackSubmissionStatus} submissionMessage={feedbackSubmissionMessage} />
        {feedbackSubmissionStatus === 'success' && feedbackSubmissionMessage && !isFeedbackModalOpen && (
            <div className="fixed bottom-24 sm:bottom-5 right-5 p-3 rounded-md shadow-lg text-sm font-medium z-[60] bg-green-100 dark:bg-green-700/80 border border-green-300 dark:border-green-500 text-green-700 dark:text-green-200" role="alert">
                {feedbackSubmissionMessage}
            </div>
        )}

        {/*
        <footer className="bg-headerBlue-DEFAULT text-neutral-dark p-4 mt-auto font-normal flex flex-col items-center text-center sm:text-left">
          <div className="container mx-auto flex flex-row flex-wrap justify-center items-center gap-x-1 sm:gap-x-2 gap-y-1 text-sm leading-relaxed">
              <button onClick={() => navigateTo(View.AboutUs)} className="font-sans px-1.5 py-0.5 sm:px-2 sm:py-1 hover:underline">เกี่ยวกับเรา</button>
              <span className="text-neutral-medium inline">|</span>
              <button onClick={() => navigateTo(View.Safety)} className="font-sans px-1.5 py-0.5 sm:px-2 sm:py-1 hover:underline">โปรดอ่านเพื่อความปลอดภัย</button>
              <span className="text-neutral-medium inline">|</span>
              <button onClick={() => { setIsFeedbackModalOpen(true); if(feedbackSubmissionStatus === 'error') { setFeedbackSubmissionStatus('idle'); setFeedbackSubmissionMessage(null);}}}
                  className="font-sans px-1.5 py-0.5 sm:px-2 sm:py-1 hover:underline">อยากให้เราปรับปรุงอะไร?</button>
          </div>
        </footer>
         */}
      </div>
    </>
  );
};

export default App;
