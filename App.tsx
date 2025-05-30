
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

  // Add ref to track if we're in the middle of navigation
  const isNavigatingRef = useRef(false);

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

  // Enhanced navigation function with mobile menu state management
  const navigateTo = useCallback((view: View, payload?: any) => {
    // Immediately close mobile menu and set navigation flag
    isNavigatingRef.current = true;
    setIsMobileMenuOpen(false);
    
    // Force a small delay to ensure state updates are processed
    setTimeout(() => {
      window.scrollTo(0, 0);
      const protectedViews: View[] = [View.PostJob, View.OfferHelp, View.UserProfile, View.MyPosts, View.AdminDashboard];
      
      if (view === View.PublicProfile && typeof payload === 'string') {
          const targetUser = users.find(u => u.id === payload);
          if (targetUser && targetUser.role === UserRole.Admin) {
              alert("โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้"); 
              isNavigatingRef.current = false;
              return;
          }
          if (!currentUser) { 
              requestLoginForAction(view, payload); 
              isNavigatingRef.current = false;
              return; 
          }
          setViewingProfileId(payload);
      } else if (view !== View.PublicProfile) {
        if (viewingProfileId !== null) setViewingProfileId(null);
      }
      
      if (!currentUser && protectedViews.includes(view)) {
        requestLoginForAction(view, payload); 
        isNavigatingRef.current = false;
        return;
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
      isNavigatingRef.current = false;
    }, 50); // Small delay to ensure state cleanup
  }, [currentUser, users, viewingProfileId, selectedPostId]);

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