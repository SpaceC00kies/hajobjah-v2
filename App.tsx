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
        initialCurrentUser
      ] = await Promise.all([
        firebaseService.getAllUsersService(),
        firebaseService.getAllJobsService(),
        firebaseService.getAllHelperProfilesService(),
        firebaseService.getAllWebboardPostsService(),
        firebaseService.getAllWebboardCommentsService(),
        firebaseService.getSiteConfigService(),
        firebaseService.getAllInteractionsService(),
        firebaseService.getUserClickedHelpersMapService(),
        firebaseService.getCurrentUserService()
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    const unsubscribe = firebaseService.onAuthChangeService((user) => {
        if (user) {
            const fullUser = users.find(u => u.id === user.id);
            if (fullUser) {
                 setCurrentUser({
                  ...fullUser,
                  userLevel: calculateUserLevel(fullUser.id, webboardPosts, webboardComments),
                  profileComplete: checkProfileCompleteness(fullUser)
                });
            } else if (user.id){
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
  }, [users, webboardPosts, webboardComments]);

  useEffect(() => {
    if (users.length > 0 && (webboardPosts.length > 0 || webboardComments.length > 0)) {
        setUsers(prevUsers =>
            prevUsers.map(u => ({
                ...u,
                userLevel: calculateUserLevel(u.id, webboardPosts, webboardComments),
                profileComplete: checkProfileCompleteness(u)
            }))
        );
    }
  }, [webboardPosts, webboardComments, users.length]);

   useEffect(() => {
    if (currentUser?.id) {
      const liveUserFromUsersArray = users.find(u => u.id === currentUser.id);
      if (liveUserFromUsersArray) {
        if (JSON.stringify(currentUser) !== JSON.stringify(liveUserFromUsersArray)) {
           setCurrentUser(liveUserFromUsersArray);
        }
      } else {
        setCurrentUser(null);
      }
    }
  }, [users, currentUser?.id]);

  const navigateTo = (view: View, payload?: any) => {
    // --- Start: Explicitly close all known modals/overlays ---
    setIsMobileMenuOpen(false);
    setFeedbackSubmissionMessage(null);
    setIsConfirmModalOpen(false);
    setIsFeedbackModalOpen(false);
    // --- End: Explicitly close all known modals/overlays ---

    // Logic for webboard create/edit modal (isCreateModalOpen is implicitly controlled by selectedPostId & itemToEdit)
    // If navigating away from a state that might have the webboard create modal open:
    if (view !== View.Webboard || (payload !== 'create' && (!payload || (typeof payload === 'object' && payload.postId !== selectedPostId) ))) {
        const wasWebboardCreateActive = selectedPostId === 'create';
        // Check if itemToEdit exists and its id matches selectedPostId, and it's a webboard item
        const wasWebboardEditActive = itemToEdit && itemToEdit.id === selectedPostId && editingItemType === 'webboardPost';

        if (wasWebboardCreateActive || wasWebboardEditActive) {
            setSelectedPostId(null); // This should close the modal by affecting isCreateModalOpen
        }
    }
    // Always clear itemToEdit if not navigating to a specific form view that uses it, or webboard edit context, or admin dashboard
    if (itemToEdit) {
        const formViewsThatUseItemToEdit = [View.PostJob, View.OfferHelp];
        const isWebboardEditContextForCurrentItem = view === View.Webboard && payload && typeof payload === 'object' && payload.postId === itemToEdit.id && editingItemType === 'webboardPost';
        const isWebboardCreateContext = view === View.Webboard && payload === 'create'; // When opening create form
        const isAdminContext = view === View.AdminDashboard; // Admin might trigger edits from here

        if (!formViewsThatUseItemToEdit.includes(view) &&
            !isWebboardEditContextForCurrentItem &&
            !isWebboardCreateContext && // Don't clear if navigating to create a new webboard post
            !isAdminContext) {
            setItemToEdit(null);
            setEditingItemType(null);
        }
    }

    window.scrollTo(0, 0);
    const protectedViews: View[] = [View.PostJob, View.OfferHelp, View.UserProfile, View.MyPosts, View.AdminDashboard];

    if (view !== View.PublicProfile && viewingProfileId !== null) {
      setViewingProfileId(null);
    }

    if (view === View.PublicProfile && typeof payload === 'string') {
      const targetUser = users.find(u => u.id === payload);
      if (targetUser && targetUser.role === UserRole.Admin) {
        alert("โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้"); return;
      }
      if (!currentUser) { requestLoginForAction(view, payload); return; }
      setViewingProfileId(payload);
    }

    if (!currentUser && protectedViews.includes(view)) {
      requestLoginForAction(view, payload); return;
    }

    if (view === View.Webboard) {
      if (typeof payload === 'string') {
        setSelectedPostId(payload);
      } else if (payload && typeof payload === 'object' && payload.postId) {
        setSelectedPostId(payload.postId);
      } else if (payload === null || payload === undefined) {
        setSelectedPostId(null);
      }
    }
    // If navigating away from webboard and selectedPostId was for a detail view (not create/edit implicitly handled above)
    else if (view !== View.Webboard && selectedPostId && selectedPostId !== 'create') {
        const isEditingThisPost = itemToEdit && itemToEdit.id === selectedPostId && editingItemType === 'webboardPost';
        if (!isEditingThisPost) { // Don't clear if we are in an edit flow for this post
             setSelectedPostId(null);
        }
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
    if (currentUser?.role !== UserRole.Admin) { alert("คุณไม่มีสิทธิ์ดำเนินการนี้"); return; }
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
      } return false;
    } catch (error: any) { alert(`ลงทะเบียนไม่สำเร็จ: ${error.message}`); return false; }
  };

  const handleLogin = async (loginIdentifier: string, passwordAttempt: string): Promise<boolean> => {
    try {
      const user = await firebaseService.signInWithEmailPasswordService(loginIdentifier, passwordAttempt);
      if (user) {
        const fullUserFromState = users.find(u => u.id === user.id);
        const userToSet = fullUserFromState ? {...fullUserFromState, userLevel: calculateUserLevel(fullUserFromState.id, webboardPosts, webboardComments), profileComplete: checkProfileCompleteness(fullUserFromState)} : {...user, userLevel: calculateUserLevel(user.id, webboardPosts, webboardComments), profileComplete: checkProfileCompleteness(user) } ;
        setCurrentUser(userToSet);
        alert(`ยินดีต้อนรับ @${userToSet.displayName}!`);
        if (loginRedirectInfo) { navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload); setLoginRedirectInfo(null); }
        else { navigateTo(View.Home); }
        return true;
      } return false;
    } catch (error: any) { alert(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`); return false; }
  };

  const handleLogout = async () => {
    await firebaseService.signOutUserService();
    setCurrentUser(null); setLoginRedirectInfo(null); setItemToEdit(null); setEditingItemType(null);
    setSourceViewForForm(null); setViewingProfileId(null); setSelectedPostId(null); setIsMobileMenuOpen(false);
    alert('ออกจากระบบเรียบร้อยแล้ว'); navigateTo(View.Home);
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
      return true;
    } catch (error) { console.error("Error updating profile:", error); return false; }
  };

  const handleAddJob = async (newJobData) => { /* ... implementation ... */ };
  const handleUpdateJob = async (updatedJobDataFromForm) => { /* ... implementation ... */ };
  const handleSubmitJobForm = (formDataFromForm) => { if (formDataFromForm.id && itemToEdit && editingItemType === 'job') { handleUpdateJob(formDataFromForm); } else { handleAddJob(formDataFromForm); } };
  const handleAddHelperProfile = async (newProfileData) => { /* ... implementation ... */ };
  const handleUpdateHelperProfile = async (updatedProfileDataFromForm) => { /* ... implementation ... */ };
  const handleSubmitHelperProfileForm = (formDataFromForm) => { if (formDataFromForm.id && itemToEdit && editingItemType === 'profile') { handleUpdateHelperProfile(formDataFromForm); } else { handleAddHelperProfile(formDataFromForm); } };
  const handleCancelEditOrPost = () => { const targetView = sourceViewForForm || View.Home; setItemToEdit(null); setEditingItemType(null); setSourceViewForForm(null); setSelectedPostId(null); navigateTo(targetView); };
  const openConfirmModal = (title, message, onConfirm) => { setConfirmModalTitle(title); setConfirmModalMessage(message); setOnConfirmAction(() => onConfirm); setIsConfirmModalOpen(true); };
  const closeConfirmModal = () => { setIsConfirmModalOpen(false); setConfirmModalMessage(''); setConfirmModalTitle(''); setOnConfirmAction(null); };
  const handleConfirmDeletion = () => { if (onConfirmAction) onConfirmAction(); closeConfirmModal(); };
  const handleDeleteJob = (jobId) => { /* ... implementation ... */ };
  const handleDeleteHelperProfile = (profileId) => { /* ... implementation ... */ };
  const handleDeleteItemFromMyPosts = (itemId, itemType) => { if (itemType === 'job') handleDeleteJob(itemId); else if (itemType === 'profile') handleDeleteHelperProfile(itemId); else if (itemType === 'webboardPost') handleDeleteWebboardPost(itemId); };
  const createToggleHandler = (setter, serviceFunc, itemType) => async (itemId, currentStatus) => { await serviceFunc(itemId, !currentStatus); setter(prevItems => prevItems.map(item => item.id === itemId ? { ...item, [itemType]: !currentStatus } : item)); };
  const handleToggleSuspiciousJob = createToggleHandler(setJobs, firebaseService.toggleSuspiciousJobService, 'isSuspicious');
  const handleTogglePinnedJob = createToggleHandler(setJobs, firebaseService.togglePinnedJobService, 'isPinned');
  const handleToggleHiredJobForUserOrAdmin = createToggleHandler(setJobs, firebaseService.toggleHiredJobService, 'isHired');
  const handleToggleSuspiciousHelperProfile = createToggleHandler(setHelperProfiles, firebaseService.toggleSuspiciousHelperProfileService, 'isSuspicious');
  const handleTogglePinnedHelperProfile = createToggleHandler(setHelperProfiles, firebaseService.togglePinnedHelperProfileService, 'isPinned');
  const handleToggleUnavailableHelperProfileForUserOrAdmin = createToggleHandler(setHelperProfiles, firebaseService.toggleUnavailableHelperProfileService, 'isUnavailable');
  const handleToggleVerifiedExperience = createToggleHandler(setHelperProfiles, firebaseService.toggleVerifiedExperienceService, 'adminVerifiedExperience');
  const handleToggleItemStatusFromMyPosts = (itemId, itemType) => { if (itemType === 'job') { const job = jobs.find(j => j.id === itemId); if (job) handleToggleHiredJobForUserOrAdmin(itemId, job.isHired); } else if (itemType === 'profile') { const profile = helperProfiles.find(p => p.id === itemId); if (profile) handleToggleUnavailableHelperProfileForUserOrAdmin(itemId, profile.isUnavailable); } };
  const handleLogHelperContactInteraction = async (helperProfileId) => { /* ... implementation ... */ };
  const handleAddOrUpdateWebboardPost = async (postData, postIdToUpdate) => { /* ... implementation ... */ };
  const handleAddWebboardComment = async (postId, text) => { /* ... implementation ... */ };
  const handleUpdateWebboardComment = async (commentId, newText) => { /* ... implementation ... */ };
  const handleDeleteWebboardComment = (commentId) => { /* ... implementation ... */ };
  const handleToggleWebboardPostLike = async (postId) => { /* ... implementation ... */ };
  const handleDeleteWebboardPost = (postId) => { /* ... implementation ... */ };
  const handlePinWebboardPost = createToggleHandler(setWebboardPosts, firebaseService.togglePinWebboardPostService, 'isPinned');
  const handleSetUserRole = async (userId, newRole) => { /* ... implementation ... */ };
  const handleFeedbackSubmit = async (feedbackText) => { /* ... implementation ... */ return true; };
  const handleStartEditItemFromAdmin = (item) => { /* ... implementation ... */ };
  const handleStartEditMyItem = (itemId, itemType) => { /* ... implementation ... */ };

  const renderNavLinks = (isMobile: boolean) => { /* ... جاري التنفيذ ... */ return <></>; };
  const renderHeader = () => { /* ... جاري التنفيذ ... */ return <></>; };
  const renderMobileMenu = () => { if (!isMobileMenuOpen) return null; /* ... implementation ... */ return <></>; };

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
            <Button onClick={() => { setSourceViewForForm(View.Home); navigateTo(View.PostJob); }} variant="primary" size="lg" className="w-full text-base md:text-lg" > <span className="flex items-center justify-center gap-2"> <span>📢</span> <span>มีงานด่วน? ฝากไว้ตรงนี้</span> </span> </Button>
            <Button onClick={() => navigateTo(View.FindHelpers)} variant="outline" colorScheme="primary" size="lg" className="w-full text-base md:text-lg" > <span className="flex items-center justify-center gap-2"> <span>🔍</span> <span>กำลังหาคนช่วย? ดูโปรไฟล์เลย</span> </span> </Button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-secondary/30">
          <h3 className="text-lg font-sans font-semibold text-secondary-hover mb-4">คนอยากหางาน</h3>
          <div className="space-y-4">
            <Button onClick={() => { setSourceViewForForm(View.Home); navigateTo(View.OfferHelp); }} variant="secondary" size="lg" className="w-full text-base md:text-lg" > <span className="flex items-center justify-center gap-2"> <span>🙋</span> <span>ว่างอยู่! พร้อมรับงาน</span> </span> </Button>
            <Button onClick={() => navigateTo(View.FindJobs)} variant="outline" colorScheme="secondary" size="lg" className="w-full text-base md:text-lg" > <span className="flex items-center justify-center gap-2"> <span>👀</span> <span>อยากหางาน? ดูโพสต์งานเลย</span> </span> </Button>
          </div>
        </div>
      </div>
      <div className="mt-8 text-center font-mono text-xs text-gray-400">
        HJJ v2 Beta
      </div>
      {/* This is the new links section, correctly placed: */}
      <div className="mt-6 text-center">
        <div className="container mx-auto flex flex-row flex-wrap justify-center items-center gap-x-2 gap-y-1 text-sm leading-relaxed">
          <button onClick={() => navigateTo(View.AboutUs)} className="font-sans px-2 py-1 text-neutral-medium hover:text-neutral-dark dark:text-dark-textMuted dark:hover:text-dark-text hover:underline whitespace-nowrap" onTouchStart={() => {}} > เกี่ยวกับเรา </button>
          <span className="text-neutral-medium hidden sm:inline">|</span>
          <button onClick={() => navigateTo(View.Safety)} className="font-sans px-2 py-1 text-neutral-medium hover:text-neutral-dark dark:text-dark-textMuted dark:hover:text-dark-text hover:underline whitespace-nowrap" onTouchStart={() => {}} > โปรดอ่านเพื่อความปลอดภัย </button>
          <span className="text-neutral-medium hidden sm:inline">|</span>
          <button onClick={() => { setIsFeedbackModalOpen(true); if(feedbackSubmissionStatus === 'error') { setFeedbackSubmissionStatus('idle'); setFeedbackSubmissionMessage(null); } }} className="font-sans px-2 py-1 text-neutral-medium hover:text-neutral-dark dark:text-dark-textMuted dark:hover:text-dark-text hover:underline whitespace-nowrap" onTouchStart={() => {}} > อยากให้เราปรับปรุงอะไร? </button>
        </div>
      </div>
    </div>
  );

  // ... other render functions for PostJob, FindJobs, etc. ...
  const renderPostJob = () => { /* ... */ return <></>; };
  const renderOfferHelpForm = () => { /* ... */ return <></>; };
  const renderFindJobs = () => { /* ... */ return <></>; };
  const renderFindHelpers = () => { /* ... */ return <></>; };
  const renderRegister = () => <RegistrationForm onRegister={handleRegister} onSwitchToLogin={() => navigateTo(View.Login)} />;
  const renderLogin = () => <LoginForm onLogin={handleLogin} onSwitchToRegister={() => navigateTo(View.Register)} />;
  const renderUserProfile = () => { if (!currentUser) return <p>Loading...</p>; return <UserProfilePage currentUser={currentUser} onUpdateProfile={handleUpdateUserProfile} onCancel={() => navigateTo(View.Home)} />; };
  const renderAdminDashboard = () => { /* ... */ return <></>; };
  const renderMyPostsPage = () => { /* ... */ return <></>; };
  const renderPublicProfile = () => { /* ... */ return <></>; };
  const renderWebboardPage = () => { /* ... */ return <></>; };
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
      <div className="flex flex-col flex-1 bg-neutral-light min-h-screen"> {/* Ensure no relative z-10 here from previous attempts */}
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
        {/* The old footer element is intentionally GONE from here */}
      </div>
    </>
  );
};

export default App;