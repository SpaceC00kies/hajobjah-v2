

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
  getJobsPaginated, // Using paginated fetch
  getJobDocument, // Added to fetch single job doc
  addHelperProfileService,
  updateHelperProfileService,
  deleteHelperProfileService,
  getHelperProfilesPaginated, // Using paginated fetch
  getHelperProfileDocument, // Added to fetch single helper profile doc
  getVouchDocument, // For Admin Dashboard HUD
  bumpHelperProfileService,
  addWebboardPostService,
  updateWebboardPostService,
  deleteWebboardPostService,
  toggleWebboardPostLikeService,
  getWebboardPostsPaginated as getWebboardPostsPaginatedService,
  addWebboardCommentService,
  updateWebboardCommentService,
  deleteWebboardCommentService,
  subscribeToUsersService,
  subscribeToInteractionsService,
  subscribeToSiteConfigService,
  subscribeToVouchReportsService, // For Admin Dashboard
  resolveVouchReportService, // For Admin Dashboard
  setSiteLockService,
  setUserRoleService,
  toggleItemFlagService,
  logHelperContactInteractionService,
  getUserDocument,
  saveUserWebboardPostService,
  unsaveUserWebboardPostService,
  subscribeToUserSavedPostsService,
  subscribeToUserInterestsService,
  toggleInterestService,
  vouchForUserService,
  reportVouchService, // New service
  subscribeToWebboardCommentsService,
  orionAnalyzeService, // New Orion service
  getAllBlogPosts, // New service for blog posts
  getBlogPostsForAdmin, // New service for admin
  addOrUpdateBlogPostService, // New service for blog post creation/editing
  deleteBlogPostService, // New service for deleting blog posts
  starlightWriterService, // New AI service for blog
  subscribeToBlogCommentsService, // New subscription service for blog comments
  addBlogCommentService,
  updateBlogCommentService,
  deleteBlogCommentService,
  toggleBlogPostLikeService,
} from './services/firebaseService.ts';
import type { DocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { User, Job, HelperProfile, EnrichedHelperProfile, Interaction, WebboardPost, WebboardComment, UserLevel, EnrichedWebboardPost, EnrichedWebboardComment, SiteConfig, FilterableCategory, UserPostingLimits, UserActivityBadge, UserTier, Interest, VouchType, Vouch, VouchReport, VouchReportStatus, OrionMessage, BlogPost, EnrichedBlogPost, BlogComment } from './types.ts'; // Added Vouch, OrionMessage, BlogPost, BlogComment
import type { AdminItem as AdminItemType } from './components/AdminDashboard.tsx';
import { View, GenderOption, HelperEducationLevelOption, JobCategory, JobSubCategory, USER_LEVELS, UserLevelName, UserRole, ADMIN_BADGE_DETAILS, MODERATOR_BADGE_DETAILS, WebboardCategory, JOB_CATEGORY_EMOJIS_MAP, ACTIVITY_BADGE_DETAILS, Province, JOB_SUBCATEGORIES_MAP } from './types.ts';
import { PostJobForm } from './components/PostJobForm.tsx';
import { JobCard } from './components/JobCard.tsx';
import { Button } from './components/Button.tsx';
import { OfferHelpForm } from './components/OfferHelpForm.tsx';
import { HelperCard } from './components/HelperCard.tsx';
import { RegistrationForm } from './components/RegistrationForm.tsx';
import { LoginForm } from './components/LoginForm.tsx';
import { ForgotPasswordModal } from './components/ForgotPasswordModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { ConfirmModal } from './components/ConfirmModal.tsx';
// MyPostsPage is removed as its functionality is integrated into MyRoomPage
// import { MyPostsPage } from './components/MyPostsPage.tsx';
import { MyRoomPage } from './components/MyRoomPage.tsx'; // New MyRoomPage
import type { ActiveTab as MyRoomActiveTab } from './components/MyRoomPage.tsx'; // Import ActiveTab type
import { UserProfilePage } from './components/UserProfilePage.tsx';
import { AboutUsPage } from './components/AboutUsPage.tsx';
import { PublicProfilePage } from './components/PublicProfilePage.tsx';
import { SafetyPage } from './components/SafetyPage.tsx';
import { FeedbackForm } from './components/FeedbackForm.tsx';
import { WebboardPage } from './components/WebboardPage.tsx';
import { BlogPage } from './components/BlogPage.tsx'; // New Blog Page
import { BlogArticlePage } from './components/BlogArticlePage.tsx'; // New Blog Article Page
import { ArticleEditor } from './components/ArticleEditor.tsx'; // New Article Editor
import { UserLevelBadge } from './components/UserLevelBadge.tsx';
import { SiteLockOverlay } from './components/SiteLockOverlay.tsx';
import { CategoryFilterBar } from './components/CategoryFilterBar.tsx';
import { SearchInputWithRecent } from './components/SearchInputWithRecent.tsx';
import { PasswordResetPage } from './components/PasswordResetPage.tsx';
import { VouchModal } from './components/VouchModal.tsx'; // New Vouch Modal
import { VouchesListModal } from './components/VouchesListModal.tsx'; // New Vouch List Modal
import { ReportVouchModal } from './components/ReportVouchModal.tsx'; // New Report Vouch Modal

import { logFirebaseError } from './firebase/logging.ts';
import { AnimatePresence, motion, type Variants, type Transition, type HTMLMotionProps } from "framer-motion";


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
export const calculateHoursRemaining = (targetDateString?: string | Date): number => {
    if (!targetDateString) return 0;
    const targetDate = new Date(targetDateString);
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60)); // Calculate hours
};

export const calculateDaysRemaining = (targetDateString?: string | Date): number => {
    if (!targetDateString) return 0;
    const hoursRemaining = calculateHoursRemaining(targetDateString);
    if (hoursRemaining <=0) return 0;
    return Math.ceil(hoursRemaining / 24);
};


export const isDateInPast = (dateString?: string | Date): boolean => {
    if (!dateString) return false;
    const dateToCheck = new Date(dateString);
    if (isNaN(dateToCheck.getTime())) {
        return false;
    }
    return dateToCheck < new Date();
};


const JOB_COOLDOWN_DAYS = 3;
const HELPER_PROFILE_COOLDOWN_DAYS = 3;
const BUMP_COOLDOWN_DAYS = 30;

// Free Tier Limits
const MAX_ACTIVE_JOBS_FREE_TIER = 3;
const MAX_ACTIVE_HELPER_PROFILES_FREE_TIER = 1;

// For users with "🔥 ขยันใช้เว็บ" badge (enhancement over free tier)
const MAX_ACTIVE_JOBS_BADGE = 4;
const MAX_ACTIVE_HELPER_PROFILES_BADGE = 2;

// Page size for infinite scroll
const JOBS_PAGE_SIZE = 9;
const HELPERS_PAGE_SIZE = 9;
const WEBBOARD_PAGE_SIZE = 10;


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
  const userCommentsCount = comments.filter(c => c.postId === userId).length;
  const score = (userPostsCount * 2) + (userCommentsCount * 0.5);
  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    if (USER_LEVELS[i].minScore !== undefined && score >= USER_LEVELS[i].minScore!) {
      return USER_LEVELS[i];
    }
  }
  return USER_LEVELS[0];
};

export const getUserDisplayBadge = (user: User | null | undefined): UserLevel => {
  if (!user) return USER_LEVELS[0];
  if (user.role === UserRole.Admin) return ADMIN_BADGE_DETAILS;
  if (user.role === UserRole.Moderator) return MODERATOR_BADGE_DETAILS;
  return user.userLevel || USER_LEVELS[0];
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

// Updated RegistrationDataType for simplified registration
type RegistrationDataType = Omit<User, 'id' | 'tier' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'isMuted' | 'nickname' | 'firstName' | 'lastName' | 'role' | 'postingLimits' | 'activityBadge' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence' | 'createdAt' | 'updatedAt' | 'savedWebboardPosts' | 'gender' | 'birthdate' | 'educationLevel' | 'lineId' | 'facebook' | 'isBusinessProfile' | 'businessName' | 'businessType' | 'businessAddress' | 'businessWebsite' | 'businessSocialProfileLink' | 'aboutBusiness' | 'lastPublicDisplayNameChangeAt' | 'publicDisplayNameUpdateCount' | 'vouchInfo' | 'lastLoginIP' | 'lastLoginUserAgent'> & { password: string };


// Animation Variants
const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.07,
      delayChildren: 0.1,
    } as Transition,
  },
};

const itemVariants: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    } as Transition,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    } as Transition,
  },
};


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Home);
  // Renamed viewingProfileId to viewingProfileInfo
  const [viewingProfileInfo, setViewingProfileInfo] = useState<{ userId: string; helperProfileId?: string } | null>(null);
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
  
  const [copiedLinkNotification, setCopiedLinkNotification] = useState<string | null>(null);
  const copiedNotificationTimerRef = useRef<number | null>(null);
  
  // State for new Vouch modals
  const [vouchModalData, setVouchModalData] = useState<{ userToVouch: User } | null>(null);
  const [vouchListModalData, setVouchListModalData] = useState<{ userToList: User } | null>(null);
  const [reportVouchModalData, setReportVouchModalData] = useState<{ vouchToReport: Vouch } | null>(null);

  // New states for Blog
  const [allBlogPosts, setAllBlogPosts] = useState<BlogPost[]>([]);
  const [allBlogPostsForAdmin, setAllBlogPostsForAdmin] = useState<BlogPost[]>([]);
  const [selectedBlogPostSlug, setSelectedBlogPostSlug] = useState<string | null>(null);
  const [blogComments, setBlogComments] = useState<BlogComment[]>([]);


  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [userSavedPosts, setUserSavedPosts] = useState<string[]>([]);
  const [userInterests, setUserInterests] = useState<Interest[]>([]);
  const [vouchReports, setVouchReports] = useState<VouchReport[]>([]); // For admin dashboard

  const [users, setUsers] = useState<User[]>([]);
  // States for Admin/MyPosts - these might still fetch all data, or could be paginated too in future.
  const [allJobsForAdmin, setAllJobsForAdmin] = useState<Job[]>([]);
  const [allHelperProfilesForAdmin, setAllHelperProfilesForAdmin] = useState<HelperProfile[]>([]);
  const [allWebboardPostsForAdmin, setAllWebboardPostsForAdmin] = useState<WebboardPost[]>([]);


  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [webboardComments, setWebboardComments] = useState<WebboardComment[]>([]);


  const [itemToEdit, setItemToEdit] = useState<Job | HelperProfile | WebboardPost | BlogPost | null>(null);
  const [editingItemType, setEditingItemType] = useState<'job' | 'profile' | 'webboardPost' | 'blogPost' | null>(null);
  const [sourceViewForForm, setSourceViewForForm] = useState<View | null>(null);

  // Filters and search terms
  const [selectedJobCategoryFilter, setSelectedJobCategoryFilter] = useState<FilterableCategory>('all');
  const [selectedHelperCategoryFilter, setSelectedHelperCategoryFilter] = useState<FilterableCategory>('all');
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [helperSearchTerm, setHelperSearchTerm] = useState('');
  const [recentJobSearches, setRecentJobSearches] = useState<string[]>([]);
  const [recentHelperSearches, setRecentHelperSearches] = useState<string[]>([]);

  // New dropdown filters
  const [selectedJobSubCategoryFilter, setSelectedJobSubCategoryFilter] = useState<JobSubCategory | 'all'>('all');
  const [selectedJobProvinceFilter, setSelectedJobProvinceFilter] = useState<Province | 'all'>('all');
  const [selectedHelperSubCategoryFilter, setSelectedHelperSubCategoryFilter] = useState<JobSubCategory | 'all'>('all');
  const [selectedHelperProvinceFilter, setSelectedHelperProvinceFilter] = useState<Province | 'all'>('all');


  // State for MyRoomPage tab management
  const [editOriginMyRoomTab, setEditOriginMyRoomTab] = useState<MyRoomActiveTab | null>(null);
  const [myRoomInitialTabOverride, setMyRoomInitialTabOverride] = useState<MyRoomActiveTab | null>(null);


  // States for FindJobs view (managed within renderFindJobs scope)
  // States for FindHelpers view (managed within renderFindHelpers scope)

  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = users.find(u => u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  }, [users]);

  const parseUrlAndSetInitialState = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    const viewFromUrl = params.get('view') as View | null;
    const idFromUrl = params.get('id'); // Generic ID from URL (postId)
    const slugFromUrl = params.get('slug'); // Slug for Blog posts

    if (window.location.pathname.endsWith('/reset-password') && mode === 'resetPassword' && oobCode) {
      setCurrentView(View.PasswordReset);
      const newUrl = `${window.location.pathname}?mode=resetPassword&oobCode=${oobCode}`;
      window.history.replaceState({}, '', newUrl);
      return;
    }

    if (viewFromUrl && Object.values(View).includes(viewFromUrl)) {
      setCurrentView(viewFromUrl);
      if (viewFromUrl === View.Webboard && idFromUrl) {
        setSelectedPostId(idFromUrl);
      } else if (viewFromUrl === View.Blog && slugFromUrl) {
        setSelectedBlogPostSlug(slugFromUrl);
      } else if (viewFromUrl === View.PublicProfile && idFromUrl) {
        setViewingProfileInfo({ userId: idFromUrl }); // Only userId from URL
        const referrerView = params.get('from') as View | null;
        if(referrerView && Object.values(View).includes(referrerView)) {
            setSourceViewForPublicProfile(referrerView);
        } else {
            setSourceViewForPublicProfile(View.FindHelpers); 
        }
      } else {
        setSelectedPostId(null);
        setViewingProfileInfo(null);
        setSelectedBlogPostSlug(null);
      }
    } else {
      setCurrentView(View.Home); 
      setSelectedPostId(null);
      setViewingProfileInfo(null);
      setSelectedBlogPostSlug(null);
    }
  }, []);


  useEffect(() => {
    // document.documentElement.classList.remove('dark'); // Removed: dark mode management
    setRecentJobSearches(getRecentSearches('recentJobSearches'));
    setRecentHelperSearches(getRecentSearches('recentHelperSearches'));
    
    parseUrlAndSetInitialState(); 

    const unsubscribeAuth = onAuthChangeService((user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
      if (user) {
        const unsubscribeSaved = subscribeToUserSavedPostsService(user.id, (savedIds) => {
          setUserSavedPosts(savedIds);
           setCurrentUser(prevUser => prevUser ? ({ // Add null check for prevUser
            ...prevUser,
            savedWebboardPosts: savedIds,
          }) : null);
        });
        (unsubscribeAuth as any)._unsubscribeSavedPosts = unsubscribeSaved;
        const unsubscribeInterests = subscribeToUserInterestsService(user.id, setUserInterests);
        (unsubscribeAuth as any)._unsubscribeInterests = unsubscribeInterests;
      } else {
        setUserSavedPosts([]);
        setUserInterests([]);
         if ((unsubscribeAuth as any)._unsubscribeSavedPosts) {
            (unsubscribeAuth as any)._unsubscribeSavedPosts();
            delete (unsubscribeAuth as any)._unsubscribeSavedPosts;
        }
        if ((unsubscribeAuth as any)._unsubscribeInterests) {
          (unsubscribeAuth as any)._unsubscribeInterests();
          delete (unsubscribeAuth as any)._unsubscribeInterests;
        }
      }
    });

    const unsubscribeUsers = subscribeToUsersService(setUsers);
    const unsubscribeWebboardCommentsGlobal = subscribeToWebboardCommentsService(setWebboardComments);
    const unsubscribeInteractions = subscribeToInteractionsService(setInteractions);
    const unsubscribeSiteConfig = subscribeToSiteConfigService((config) => setIsSiteLocked(config.isSiteLocked));
    const unsubscribeVouchReports = subscribeToVouchReportsService(setVouchReports); // Subscribe to reports


    // Fetch all data for Admin/MyPosts - this could be optimized further if these views also adopt pagination
    const fetchAllJobsForAdminAndMyPosts = async () => {
        let allJobs: Job[] = [];
        let lastDoc: DocumentSnapshot | null = null;
        let hasMore = true;
        while(hasMore) {
            const batch = await getJobsPaginated(50, lastDoc);
            allJobs = [...allJobs, ...batch.items];
            lastDoc = batch.lastVisibleDoc;
            hasMore = !!batch.lastVisibleDoc;
        }
        setAllJobsForAdmin(allJobs);
    };
    const fetchAllHelperProfilesForAdminAndMyPosts = async () => {
        let allProfiles: HelperProfile[] = [];
        let lastDoc: DocumentSnapshot | null = null;
        let hasMore = true;
        while(hasMore) {
            const batch = await getHelperProfilesPaginated(50, lastDoc);
            allProfiles = [...allProfiles, ...batch.items];
            lastDoc = batch.lastVisibleDoc;
            hasMore = !!batch.lastVisibleDoc;
        }
        setAllHelperProfilesForAdmin(allProfiles);
    };
     const fetchAllWebboardPostsForAdminAndLevels = async () => {
        let allPosts: WebboardPost[] = [];
        let lastDoc: DocumentSnapshot | null = null;
        let hasMore = true;
        while(hasMore) {
            const batch = await getWebboardPostsPaginatedService(50, lastDoc);
            allPosts = [...allPosts, ...batch.items];
            lastDoc = batch.lastVisibleDoc;
            hasMore = !!batch.lastVisibleDoc;
        }
        setAllWebboardPostsForAdmin(allPosts);
    };
    const fetchBlogPosts = async () => {
      const posts = await getAllBlogPosts();
      setAllBlogPosts(posts);
      const adminPosts = await getBlogPostsForAdmin();
      setAllBlogPostsForAdmin(adminPosts);
    };


    fetchAllJobsForAdminAndMyPosts();
    fetchAllHelperProfilesForAdminAndMyPosts();
    fetchAllWebboardPostsForAdminAndLevels();
    fetchBlogPosts(); // Fetch blog posts on initial load

    // Handle browser back/forward
    const handlePopState = (event: PopStateEvent) => {
      parseUrlAndSetInitialState();
    };
    window.addEventListener('popstate', handlePopState);


    return () => {
      if ((unsubscribeAuth as any)._unsubscribeSavedPosts) {
        (unsubscribeAuth as any)._unsubscribeSavedPosts();
      }
      if ((unsubscribeAuth as any)._unsubscribeInterests) {
        (unsubscribeAuth as any)._unsubscribeInterests();
      }
      unsubscribeAuth();
      unsubscribeUsers();
      unsubscribeWebboardCommentsGlobal();
      unsubscribeInteractions();
      unsubscribeSiteConfig();
      unsubscribeVouchReports();
      window.removeEventListener('popstate', handlePopState);
      if (copiedNotificationTimerRef.current) {
        clearTimeout(copiedNotificationTimerRef.current);
      }
    };
  }, [parseUrlAndSetInitialState]);

  useEffect(() => {
    if (!isLoadingAuth && users.length > 0) {
        const updatedUsers = users.map(u => {
            let last30DaysActivity = 0;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const threeDaysAgo = new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000);

            if (allWebboardPostsForAdmin.length > 0 || webboardComments.length > 0) {
                const userPostsLast30Days = allWebboardPostsForAdmin.filter(p => p.userId === u.id && p.createdAt && new Date(p.createdAt as string) >= thirtyDaysAgo).length;
                const userCommentsLast30Days = webboardComments.filter(c => c.postId === u.id && c.createdAt && new Date(c.createdAt as string) >= thirtyDaysAgo).length;
                last30DaysActivity = userPostsLast30Days + userCommentsLast30Days;
            }

            const accountAgeInDays = u.createdAt ? (new Date().getTime() - new Date(u.createdAt as string).getTime()) / (1000 * 60 * 60 * 24) : 0;
            const isActivityBadgeActive = accountAgeInDays >= 30 && last30DaysActivity >= 15;
            
            const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const defaultPostingLimits: UserPostingLimits = {
              lastJobPostDate: threeDaysAgo.toISOString(),
              lastHelperProfileDate: threeDaysAgo.toISOString(),
              dailyWebboardPosts: { count: 0, resetDate: new Date(0).toISOString() },
              hourlyComments: { count: 0, resetTime: new Date(0).toISOString() },
              lastBumpDates: {},
              vouchingActivity: { monthlyCount: 0, periodStart: firstOfMonth.toISOString() }, // Added vouching activity
            };

            const defaultActivityBadge: UserActivityBadge = {
              isActive: false,
              last30DaysActivity: 0,
              lastActivityCheck: new Date(0).toISOString(),
            };

            return {
                ...u,
                tier: u.tier || 'free' as UserTier,
                userLevel: calculateUserLevel(u.id, allWebboardPostsForAdmin, webboardComments),
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
                    },
                    vouchingActivity: { // Ensure vouchingActivity exists
                      ...defaultPostingLimits.vouchingActivity,
                      ...(u.postingLimits?.vouchingActivity || {})
                    },
                },
                activityBadge: {
                    ...defaultActivityBadge,
                    ...(u.activityBadge || {}),
                    isActive: isActivityBadgeActive,
                    last30DaysActivity: last30DaysActivity,
                    lastActivityCheck: new Date().toISOString(),
                },
                savedWebboardPosts: u.id === currentUser?.id ? userSavedPosts : (u.savedWebboardPosts || [])
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
  }, [allWebboardPostsForAdmin, webboardComments, isLoadingAuth, currentUser?.id, userSavedPosts]);

  // Subscription for Blog Comments
  useEffect(() => {
    if (selectedBlogPostSlug) {
      const selectedPost = allBlogPosts.find(p => p.slug === selectedBlogPostSlug);
      if (selectedPost) {
        const unsubscribe = subscribeToBlogCommentsService(selectedPost.id, setBlogComments);
        return () => unsubscribe();
      }
    }
    setBlogComments([]); // Clear comments if no post is selected
  }, [selectedBlogPostSlug, allBlogPosts]);


  const requestLoginForAction = (originalView: View, originalPayload?: any) => {
    if (!currentUser) {
      setLoginRedirectInfo({ view: originalView, payload: originalPayload });
      setCurrentView(View.Login);
      setIsMobileMenuOpen(false);
      // Update URL for login page
      const params = new URLSearchParams();
      params.set('view', View.Login);
      window.history.pushState({ view: View.Login }, '', `?${params.toString()}`);
    }
  };

  const navigateTo = (view: View, payload?: any) => {
    const fromView = currentView;
    setIsMobileMenuOpen(false); window.scrollTo(0, 0);
    const protectedViews: View[] = [View.PostJob, View.OfferHelp, View.UserProfile, View.MyPosts, View.AdminDashboard, View.MyRoom, View.ArticleEditor];

    if (view === View.PublicProfile) {
      let profileInfo: { userId: string; helperProfileId?: string } | null = null;
      if (typeof payload === 'string') { // Legacy or general user link
        profileInfo = { userId: payload };
      } else if (payload && typeof payload === 'object' && payload.userId) {
        profileInfo = { userId: payload.userId, helperProfileId: payload.helperProfileId };
      }

      if (profileInfo) {
        const targetUser = users.find(u => u.id === profileInfo!.userId);
        if (targetUser && targetUser.role === UserRole.Admin && currentUser?.id !== targetUser.id) {
          alert("โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้");
          return;
        }
        setViewingProfileInfo(profileInfo);
        if (fromView !== View.PublicProfile) {
          setSourceViewForPublicProfile(fromView);
        }
      } else {
        // Invalid payload for PublicProfile, perhaps navigate home or show error
        setCurrentView(View.Home);
        setViewingProfileInfo(null);
        window.history.pushState({ view: View.Home }, '', `?view=${View.Home}`);
        return;
      }
    } else if (viewingProfileInfo !== null) { // Clear viewingProfileInfo if navigating away from PublicProfile
      setViewingProfileInfo(null);
    }


    if (!currentUser && protectedViews.includes(view)) {
      requestLoginForAction(view, payload);
      return;
    }

    let newSelectedPostId = null;
    let newSelectedBlogPostSlug = null;
    if (view === View.Webboard) {
      if (typeof payload === 'string') newSelectedPostId = payload;
      else if (payload && typeof payload === 'object' && payload.postId) newSelectedPostId = payload.postId;
    } else if (view === View.Blog) {
      if (typeof payload === 'string') newSelectedBlogPostSlug = payload;
      else if (payload && typeof payload === 'object' && payload.slug) newSelectedBlogPostSlug = payload.slug;
    }
    setSelectedPostId(newSelectedPostId);
    setSelectedBlogPostSlug(newSelectedBlogPostSlug);

    setCurrentView(view);

    // Clear MyRoom tab override if navigating away from MyRoom or if no specific override is intended for MyRoom
    if (view !== View.MyRoom) {
        setMyRoomInitialTabOverride(null);
    }


    // Update URL
    const params = new URLSearchParams();
    params.set('view', view);
    let idForUrl: string | null = null;
    let slugForUrl: string | null = null;


    if (view === View.Webboard && newSelectedPostId && newSelectedPostId !== 'create') {
      idForUrl = newSelectedPostId;
    } else if (view === View.Blog && newSelectedBlogPostSlug) {
      slugForUrl = newSelectedBlogPostSlug;
    } else if (view === View.PublicProfile) {
        // URL only contains userId for simplicity and direct linking
        if (typeof payload === 'string') idForUrl = payload;
        else if (payload && typeof payload === 'object' && payload.userId) idForUrl = payload.userId;
    }
    

    if (idForUrl) params.set('id', idForUrl);
    if (slugForUrl) params.set('slug', slugForUrl);

    if(view === View.PublicProfile && fromView !== View.PublicProfile) {
        params.set('from', fromView); // Keep track of where user came from to public profile
    }


    const newSearch = params.toString();
    if (window.location.search.substring(1) !== newSearch) {
      window.history.pushState({ view, payload }, '', `?${newSearch}`);
    }
  };


  const handleNavigateToPublicProfile = (profileInfo: { userId: string; helperProfileId?: string }) => navigateTo(View.PublicProfile, profileInfo);

  const handleRegister = async (userData: RegistrationDataType): Promise<boolean> => {
    try {
      if (!isValidThaiMobileNumberUtil(userData.mobile)) { alert('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'); return false; }
      // Removed check for gender, birthdate, educationLevel from here as they are no longer part of initial registration.

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
      const ipAddress = "127.0.0.1"; // Placeholder for client-side IP
      const userAgent = navigator.userAgent;
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

  const handleUpdateUserProfile = async (updatedProfileData: Partial<User>): Promise<boolean> => {
    if (!currentUser) { alert('ผู้ใช้ไม่ได้เข้าสู่ระบบ'); return false; }
    try {
      if (!updatedProfileData.mobile || !isValidThaiMobileNumberUtil(updatedProfileData.mobile)) { alert('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'); return false; }
      if (!updatedProfileData.gender || updatedProfileData.gender === GenderOption.NotSpecified) { alert('กรุณาเลือกเพศ'); return false; }
      if (!updatedProfileData.birthdate) { alert('กรุณาเลือกวันเกิด'); return false; }
      if (!updatedProfileData.educationLevel || updatedProfileData.educationLevel === HelperEducationLevelOption.NotStated) { alert('กรุณาเลือกระดับการศึกษา'); return false; }

      await updateUserProfileService(currentUser.id, updatedProfileData);
      // alert('อัปเดตโปรไฟล์เรียบร้อยแล้ว'); // Feedback is now handled in UserProfilePage itself
      // Re-fetch user to update currentUser state globally
      const updatedUserDoc = await getUserDocument(currentUser.id);
      if (updatedUserDoc) {
        setCurrentUser(updatedUserDoc);
      }
      return true;
    } catch (error: any) {
      logFirebaseError("handleUpdateUserProfile", error);
      // alert(`เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์: ${error.message}`); // Feedback handled in UserProfilePage
      throw error; // Re-throw to allow UserProfilePage to catch it
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUserService();
      setLoginRedirectInfo(null); setItemToEdit(null); setEditingItemType(null);
      setSourceViewForForm(null); setViewingProfileInfo(null); setSelectedPostId(null);
      setSourceViewForPublicProfile(View.FindHelpers);
      setMyRoomInitialTabOverride(null); setEditOriginMyRoomTab(null);
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
    if (currentUser.role === UserRole.Moderator || currentUser.role === UserRole.Writer) {
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
    } else if (item.itemType === 'blogPost') {
        setItemToEdit(item.originalItem as BlogPost); setEditingItemType('blogPost'); setSourceViewForForm(View.AdminDashboard); navigateTo(View.ArticleEditor);
    }
 };
  // Modified to use MyRoom as source for edits initiated from there
  const handleStartEditMyItem = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost', originatingTab: MyRoomActiveTab) => {
    let originalItem: Job | HelperProfile | WebboardPost | undefined;
    if (itemType === 'job') originalItem = allJobsForAdmin.find(j => j.id === itemId);
    else if (itemType === 'profile') originalItem = allHelperProfilesForAdmin.find(p => p.id === itemId);
    else if (itemType === 'webboardPost') originalItem = allWebboardPostsForAdmin.find(p => p.id === itemId);

    if (originalItem && canEditOrDelete(originalItem.userId, originalItem.ownerId)) {
        setEditOriginMyRoomTab(originatingTab); // Store the originating tab from MyRoomPage
        setItemToEdit(itemType === 'webboardPost' ? { ...(originalItem as WebboardPost), isEditing: true } : originalItem);
        setEditingItemType(itemType);
        setSourceViewForForm(View.MyRoom);
        navigateTo(itemType === 'job' ? View.PostJob : itemType === 'profile' ? View.OfferHelp : View.Webboard, itemType === 'webboardPost' ? 'create' : undefined);
    } else { alert("ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข"); }
  };

  const handleEditWebboardPostFromPage = (postToEdit: EnrichedWebboardPost) => {
    if (canEditOrDelete(postToEdit.userId, postToEdit.ownerId)) {
        setEditOriginMyRoomTab(null); // Not originating from MyRoom page's tabs
        setItemToEdit({ ...postToEdit, isEditing: true });
        setEditingItemType('webboardPost');
        setSourceViewForForm(View.Webboard);
        navigateTo(View.Webboard, 'create');
    } else {
        alert("ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข");
    }
  };

  type JobFormData = Omit<Job, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'posterIsAdminVerified' | 'interestedCount'>;
  type HelperProfileFormData = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'lastBumpedAt'>;
  type BlogPostFormData = Partial<Omit<BlogPost, 'id' | 'authorDisplayName' | 'authorPhotoURL' | 'createdAt' | 'updatedAt' | 'publishedAt'>> & { newCoverImageBase64?: string | null };


  const generateContactString = (user: User): string => {
    let contactParts: string[] = [];
    if (user.mobile) contactParts.push(`เบอร์โทร: ${user.mobile}`);
    if (user.lineId) contactParts.push(`LINE ID: ${user.lineId}`);
    if (user.facebook) contactParts.push(`Facebook: ${user.facebook}`);
    return contactParts.join('\n') || 'ไม่ระบุช่องทางติดต่อ (โปรดอัปเดตโปรไฟล์)';
  };

  const checkJobPostingLimits = async (user: User): Promise<{ canPost: boolean; message?: string }> => {
    const cooldownHoursTotal = JOB_COOLDOWN_DAYS * 24;
    if (user.postingLimits.lastJobPostDate) {
        const hoursSinceLastPost = (new Date().getTime() - new Date(user.postingLimits.lastJobPostDate as string).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastPost < cooldownHoursTotal) {
            const hoursRemaining = Math.ceil(cooldownHoursTotal - hoursSinceLastPost);
            return { canPost: false, message: `คุณสามารถโพสต์งานใหม่ได้ในอีก ${hoursRemaining} ชั่วโมง` };
        }
    }
    const userActiveJobs = allJobsForAdmin.filter(job => job.userId === user.id && !isDateInPast(job.expiresAt) && !job.isExpired).length;

    let maxJobs = (user.tier === 'free') ? MAX_ACTIVE_JOBS_FREE_TIER : 999;
    if (user.activityBadge?.isActive) {
        maxJobs = MAX_ACTIVE_JOBS_BADGE;
    }

    if (userActiveJobs >= maxJobs) {
        return { canPost: false, message: `คุณมีงานที่ยังไม่หมดอายุ ${userActiveJobs}/${maxJobs} งานแล้ว` };
    }
    return { canPost: true };
  };

  const checkHelperProfilePostingLimits = async (user: User): Promise<{ canPost: boolean; message?: string }> => {
    const cooldownHoursTotal = HELPER_PROFILE_COOLDOWN_DAYS * 24;
    if (user.postingLimits.lastHelperProfileDate) {
        const hoursSinceLastPost = (new Date().getTime() - new Date(user.postingLimits.lastHelperProfileDate as string).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastPost < cooldownHoursTotal) {
            const hoursRemaining = Math.ceil(cooldownHoursTotal - hoursSinceLastPost);
            return { canPost: false, message: `คุณสามารถสร้างโปรไฟล์ผู้ช่วยใหม่ได้ในอีก ${hoursRemaining} ชั่วโมง` };
        }
    }
    const userActiveProfiles = allHelperProfilesForAdmin.filter(p => p.userId === user.id && !isDateInPast(p.expiresAt) && !p.isExpired).length;

    let maxProfiles = (user.tier === 'free') ? MAX_ACTIVE_HELPER_PROFILES_FREE_TIER : 999;
    if (user.activityBadge?.isActive) {
        maxProfiles = MAX_ACTIVE_HELPER_PROFILES_BADGE;
    }

    if (userActiveProfiles >= maxProfiles) {
        return { canPost: false, message: `คุณมีโปรไฟล์ผู้ช่วยที่ยังไม่หมดอายุ ${userActiveProfiles}/${maxProfiles} โปรไฟล์แล้ว` };
    }
    return { canPost: true };
  };

  const checkWebboardPostLimits = (user: User): { canPost: boolean; message?: string | null } => {
    const _user = user;
    return { canPost: true, message: null };
  };

  const checkWebboardCommentLimits = (user: User): { canPost: boolean; message?: string } => {
    const _user = user;
    return { canPost: true };
  };

  const handleAddJob = useCallback(async (newJobData: JobFormData, loadJobsFn: (isInitialLoad?: boolean) => void) => {
    if (!currentUser) { requestLoginForAction(View.PostJob); return; }
    const limitCheck = await checkJobPostingLimits(currentUser);
    if (!limitCheck.canPost) {
      alert(limitCheck.message);
      return;
    }
    if (containsBlacklistedWords(newJobData.description) || containsBlacklistedWords(newJobData.title)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    try {
      const newJobId = await addJobService(newJobData, {userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, contact: generateContactString(currentUser)});
      const updatedUser = await getUserDocument(currentUser.id);
      if (updatedUser) setCurrentUser(updatedUser);

      if (currentView === View.FindJobs || sourceViewForForm === View.FindJobs || sourceViewForForm === View.MyRoom) {
        loadJobsFn(true); // Use the passed loadJobs function
      }
      
      const newJobDoc = await getJobDocument(newJobId);
      if (newJobDoc) {
        setAllJobsForAdmin(prev => [...prev, newJobDoc]);
      } else {
        console.warn(`Failed to fetch newly created job ${newJobId} for admin list update. The list might be updated on next full load.`);
      }

      navigateTo(sourceViewForForm || View.FindJobs); 
      setSourceViewForForm(null); alert('ประกาศงานของคุณถูกเพิ่มแล้ว!');
    } catch (error: any) {
      logFirebaseError("handleAddJob", error);
      alert(`เกิดข้อผิดพลาดในการเพิ่มประกาศงาน: ${error.message}`);
    }
  }, [currentUser, sourceViewForForm, navigateTo, users, currentView, allJobsForAdmin]);

  const handleUpdateJob = async (updatedJobDataFromForm: JobFormData & { id: string }, loadJobsFn: (isInitialLoad?: boolean) => void) => {
    if (!currentUser) { requestLoginForAction(View.PostJob); return; }
    const originalJob = allJobsForAdmin.find(j => j.id === updatedJobDataFromForm.id);
    if (!originalJob) { alert('ไม่พบประกาศงานเดิม'); return; }
    if (!canEditOrDelete(originalJob.userId, originalJob.ownerId)) { alert('คุณไม่มีสิทธิ์แก้ไขประกาศงานนี้'); return; }
    if (containsBlacklistedWords(updatedJobDataFromForm.description) || containsBlacklistedWords(updatedJobDataFromForm.title)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    try {
      // authorDisplayName is not updated on the job doc itself, it's a snapshot.
      await updateJobService(updatedJobDataFromForm.id, updatedJobDataFromForm, generateContactString(currentUser));
      setItemToEdit(null); setEditingItemType(null);

      loadJobsFn(true);
      const updatedAdminJobs = allJobsForAdmin.map(j => j.id === updatedJobDataFromForm.id ? {...j, ...updatedJobDataFromForm, contact: generateContactString(currentUser), updatedAt: new Date().toISOString()} : j);
      setAllJobsForAdmin(updatedAdminJobs as Job[]);

      alert('แก้ไขประกาศงานเรียบร้อยแล้ว');
      if (sourceViewForForm === View.MyRoom) {
        setMyRoomInitialTabOverride(editOriginMyRoomTab);
        navigateTo(View.MyRoom);
      } else {
        setMyRoomInitialTabOverride(null);
        navigateTo(sourceViewForForm || View.FindJobs);
      }
      setEditOriginMyRoomTab(null);
      setSourceViewForForm(null);

    } catch (error: any) {
      logFirebaseError("handleUpdateJob", error);
      alert(`เกิดข้อผิดพลาดในการแก้ไขประกาศงาน: ${error.message}`);
    }
  };

 const handleAddHelperProfile = useCallback(async (newProfileData: HelperProfileFormData, loadHelpersFn: (isInitialLoad?: boolean) => void) => {
    if (!currentUser) { requestLoginForAction(View.OfferHelp); return; }
    const limitCheck = await checkHelperProfilePostingLimits(currentUser);
    if (!limitCheck.canPost) {
      alert(limitCheck.message);
      return;
    }
    if (containsBlacklistedWords(newProfileData.details) || containsBlacklistedWords(newProfileData.profileTitle)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    if (!currentUser.gender || !currentUser.birthdate || !currentUser.educationLevel || currentUser.gender === GenderOption.NotSpecified || currentUser.educationLevel === HelperEducationLevelOption.NotStated) {
        alert('กรุณาอัปเดตข้อมูลส่วนตัว (เพศ, วันเกิด, ระดับการศึกษา) ในหน้าโปรไฟล์ของคุณก่อน'); navigateTo(View.MyRoom); setMyRoomInitialTabOverride('profile'); return; // Navigate to MyRoom profile tab
    }
    try {
      const newProfileId = await addHelperProfileService(newProfileData, {
        userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, contact: generateContactString(currentUser),
        gender: currentUser.gender, birthdate: currentUser.birthdate, educationLevel: currentUser.educationLevel
      });
      const updatedUser = await getUserDocument(currentUser.id);
      if (updatedUser) setCurrentUser(updatedUser);

      if (currentView === View.FindHelpers || sourceViewForForm === View.FindHelpers || sourceViewForForm === View.MyRoom) {
        loadHelpersFn(true);
      }
      
      const newHelperProfileDoc = await getHelperProfileDocument(newProfileId);
      if (newHelperProfileDoc) {
        setAllHelperProfilesForAdmin(prev => [...prev, newHelperProfileDoc]);
      } else {
         console.warn(`Failed to fetch newly created helper profile ${newProfileId} for admin list update. The list might be updated on next full load.`);
      }
      
      navigateTo(sourceViewForForm || View.FindHelpers); 
      setSourceViewForForm(null);
      alert('โปรไฟล์ของคุณถูกเพิ่มแล้ว!');
    } catch (error: any) {
      logFirebaseError("handleAddHelperProfile", error);
      alert(`เกิดข้อผิดพลาดในการเพิ่มโปรไฟล์: ${error.message}`);
    }
  }, [currentUser, sourceViewForForm, navigateTo, currentView, allHelperProfilesForAdmin]);

  const handleUpdateHelperProfile = async (updatedProfileDataFromForm: HelperProfileFormData & { id: string }, loadHelpersFn: (isInitialLoad?: boolean) => void) => {
    if (!currentUser) { requestLoginForAction(View.OfferHelp); return; }
    const originalProfile = allHelperProfilesForAdmin.find(p => p.id === updatedProfileDataFromForm.id);
    if (!originalProfile) { alert('ไม่พบโปรไฟล์เดิม'); return; }
    if (!canEditOrDelete(originalProfile.userId, originalProfile.ownerId)) { alert('คุณไม่มีสิทธิ์แก้ไขโปรไฟล์นี้'); return; }
    if (containsBlacklistedWords(updatedProfileDataFromForm.details) || containsBlacklistedWords(updatedProfileDataFromForm.profileTitle)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    try {
      // authorDisplayName is not updated here.
      await updateHelperProfileService(updatedProfileDataFromForm.id, updatedProfileDataFromForm, generateContactString(currentUser));
      setItemToEdit(null); setEditingItemType(null);

      loadHelpersFn(true);
      const updatedAdminProfiles = allHelperProfilesForAdmin.map(p => p.id === updatedProfileDataFromForm.id ? {...p, ...updatedProfileDataFromForm, contact: generateContactString(currentUser), updatedAt: new Date().toISOString()} : p);
      setAllHelperProfilesForAdmin(updatedAdminProfiles as HelperProfile[]);

      alert('แก้ไขงานที่เสนอเรียบร้อยแล้ว'); // Updated alert message
      if (sourceViewForForm === View.MyRoom) {
        setMyRoomInitialTabOverride(editOriginMyRoomTab);
        navigateTo(View.MyRoom);
      } else {
        setMyRoomInitialTabOverride(null);
        navigateTo(sourceViewForForm || View.FindHelpers);
      }
      setEditOriginMyRoomTab(null);
      setSourceViewForForm(null);
    } catch (error: any) {
      logFirebaseError("handleUpdateHelperProfile", error);
      alert(`เกิดข้อผิดพลาดในการแก้ไขโปรไฟล์: ${error.message}`);
    }
  };

  const handleBumpHelperProfile = async (profileId: string, loadHelpersFn?: (isInitialLoad?: boolean) => void) => {
    if (!currentUser) { requestLoginForAction(View.FindHelpers, {intent: 'bump', postId: profileId}); return; }
    const localProfile = allHelperProfilesForAdmin.find(p => p.id === profileId);
    if (!localProfile || localProfile.userId !== currentUser.id) {
        alert("ไม่พบโปรไฟล์ หรือคุณไม่ใช่เจ้าของโปรไฟล์นี้");
        return;
    }

    const lastBumpDateForThisProfile = currentUser.postingLimits.lastBumpDates?.[profileId] || localProfile.lastBumpedAt;
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
        if (loadHelpersFn) loadHelpersFn(true);
        // Also update allHelperProfilesForAdmin for immediate reflection if MyRoomPage is showing it
        setAllHelperProfilesForAdmin(prev => prev.map(p =>
            p.id === profileId ? { ...p, lastBumpedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : p
        ));

    } catch (error: any) {
        logFirebaseError("handleBumpHelperProfile", error);
        alert(`เกิดข้อผิดพลาดในการ Bump โปรไฟล์: ${error.message}`);
    }
  };

  const handleCancelEditOrPost = () => {
    const currentSelectedPostIdForNav = selectedPostId; // Capture for navigation decision
    let targetView: View;

    if (sourceViewForForm) {
      targetView = sourceViewForForm;
    } else if (editingItemType === null && currentView === View.Webboard && currentSelectedPostIdForNav === 'create') {
      targetView = View.Webboard;
    } else if (editingItemType === 'blogPost') {
      targetView = View.AdminDashboard;
    } else if (currentView === View.Webboard && currentSelectedPostIdForNav && currentSelectedPostIdForNav !== 'create') {
      targetView = View.Webboard;
    } else {
      targetView = View.Home; // Default fallback
    }

    // Reset App-level states
    setItemToEdit(null);
    setEditingItemType(null);
    setSourceViewForForm(null);
    setSelectedPostId(null); // Ensure selectedPostId is reset

    // Handle MyRoom tab restoration
    if (targetView === View.MyRoom && editOriginMyRoomTab) {
        setMyRoomInitialTabOverride(editOriginMyRoomTab);
    } else {
        setMyRoomInitialTabOverride(null);
    }
    
    // Navigate. If targetView is Webboard and we were viewing a specific post (not creating),
    // payload should be that post's ID. Otherwise, undefined.
    navigateTo(targetView, (targetView === View.Webboard && currentSelectedPostIdForNav && currentSelectedPostIdForNav !== 'create') ? currentSelectedPostIdForNav : undefined);
    setEditOriginMyRoomTab(null);
  };


  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalTitle(title); setConfirmModalMessage(message); setOnConfirmAction(() => onConfirm); setIsConfirmModalOpen(true);
  };
  const closeConfirmModal = () => { setIsConfirmModalOpen(false); setConfirmModalMessage(''); setConfirmModalTitle(''); setOnConfirmAction(null); };
  const handleConfirmDeletion = () => { if (onConfirmAction) onConfirmAction(); closeConfirmModal(); };

  const handleDeleteItem = async (itemId: string, itemType: 'job' | 'profile' | 'webboardPost' | 'webboardComment' | 'blogPost', itemTitle: string, itemUserId: string, itemOwnerId?: string, loadItemsFn?: (isInitialLoad?: boolean) => void) => {
    if (!canEditOrDelete(itemUserId, itemOwnerId)) { alert('คุณไม่มีสิทธิ์ลบรายการนี้'); return; }
    let confirmMessage = `คุณแน่ใจหรือไม่ว่าต้องการลบ "${itemTitle}"? การกระทำนี้ไม่สามารถย้อนกลับได้`;
    if (itemType === 'webboardPost') confirmMessage += ' และจะลบคอมเมนต์ทั้งหมดที่เกี่ยวข้องด้วย';
    if (itemType === 'blogPost') confirmMessage += ' และจะลบภาพหน้าปกออกจากระบบด้วย';

    openConfirmModal(
      `ยืนยันการลบ`,
      confirmMessage,
      async () => {
        try {
          if (itemType === 'job') {
            await deleteJobService(itemId);
            if(loadItemsFn) loadItemsFn(true);
            setAllJobsForAdmin(prev => prev.filter(j => j.id !== itemId));
          } else if (itemType === 'profile') {
            await deleteHelperProfileService(itemId);
            if(loadItemsFn) loadItemsFn(true);
            setAllHelperProfilesForAdmin(prev => prev.filter(p => p.id !== itemId));
          } else if (itemType === 'webboardPost') {
            await deleteWebboardPostService(itemId);
            if(loadItemsFn) loadItemsFn(true);
            setAllWebboardPostsForAdmin(prev => prev.filter(p => p.id !== itemId));
            if (selectedPostId === itemId) { setSelectedPostId(null); navigateTo(View.Webboard); }
          } else if (itemType === 'webboardComment') {
            await deleteWebboardCommentService(itemId);
          } else if (itemType === 'blogPost') {
              const postToDelete = allBlogPostsForAdmin.find(p => p.id === itemId);
              await deleteBlogPostService(itemId, postToDelete?.coverImageURL);
              setAllBlogPosts(prev => prev.filter(p => p.id !== itemId));
              setAllBlogPostsForAdmin(prev => prev.filter(p => p.id !== itemId));
          }
          alert(`ลบ "${itemTitle}" เรียบร้อยแล้ว`);
        } catch (error: any) {
            logFirebaseError(`handleDeleteItem (${itemType})`, error);
            alert(`เกิดข้อผิดพลาดในการลบ: ${error.message}`);
        }
      }
    );
  };

  const handleDeleteJob = (jobId: string, loadJobsFn?: (isInitialLoad?: boolean) => void) => {
    const job = allJobsForAdmin.find(j => j.id === jobId);
    if (job) handleDeleteItem(jobId, 'job', job.title, job.userId, job.ownerId, loadJobsFn);
  };
  const handleDeleteHelperProfile = (profileId: string, loadHelpersFn?: (isInitialLoad?: boolean) => void) => {
    const profile = allHelperProfilesForAdmin.find(p => p.id === profileId);
    if (profile) handleDeleteItem(profileId, 'profile', profile.profileTitle, profile.userId, profile.ownerId, loadHelpersFn);
  };
  const handleDeleteWebboardPost = (postId: string, loadWebboardFn?: (isInitialLoad?: boolean) => void) => {
    const post = allWebboardPostsForAdmin.find(p => p.id === postId);
    if (post) handleDeleteItem(postId, 'webboardPost', post.title, post.userId, post.ownerId, loadWebboardFn);
  };
  const handleDeleteBlogPost = (postId: string, coverImageURL?: string) => {
      const post = allBlogPostsForAdmin.find(p => p.id === postId);
      if(post) handleDeleteItem(postId, 'blogPost', post.title, post.authorId, post.authorId);
  };

  const handleDeleteWebboardComment = (commentId: string) => { // Now standalone
    const comment = webboardComments.find(c => c.id === commentId);
    if (comment) handleDeleteItem(commentId, 'webboardComment', `คอมเมนต์โดย ${getAuthorDisplayName(comment.userId, comment.authorDisplayName)}`, comment.userId, comment.ownerId);
    else alert('ไม่พบคอมเมนต์');
  };
  const handleDeleteItemFromMyRoom = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
    if (itemType === 'job') handleDeleteJob(itemId, loadJobs);
    else if (itemType === 'profile') handleDeleteHelperProfile(itemId, loadHelpers);
    else if (itemType === 'webboardPost') handleDeleteWebboardPost(itemId, () => {/* MyRoomPage's webboard tab will refilter allWebboardPostsForAdmin */});
  };

  const toggleItemFlagAndUpdateLists = async (
    collectionName: 'jobs' | 'helperProfiles' | 'webboardPosts',
    itemId: string,
    flagName: keyof Job | keyof HelperProfile | keyof WebboardPost | 'isExpired',
    itemUserId: string,
    itemOwnerId?: string,
    currentValue?: boolean,
    loadItemsFn?: (isInitialLoad?: boolean) => void
  ) => {
    if (!canEditOrDelete(itemUserId, itemOwnerId) && currentUser?.role !== UserRole.Admin) {
      alert('คุณไม่มีสิทธิ์ดำเนินการนี้'); return;
    }
    try {
      await toggleItemFlagService(collectionName, itemId, flagName as any, currentValue);
      if (loadItemsFn) {
        loadItemsFn(true); // Re-fetch the specific list
      }
      if (collectionName === 'jobs') {
        setAllJobsForAdmin(prev => prev.map(job => job.id === itemId ? { ...job, [flagName]: !currentValue, updatedAt: new Date().toISOString() } : job));
      } else if (collectionName === 'helperProfiles') {
        setAllHelperProfilesForAdmin(prev => prev.map(p => p.id === itemId ? { ...p, [flagName]: !currentValue, updatedAt: new Date().toISOString() } : p));
      } else if (collectionName === 'webboardPosts') {
        setAllWebboardPostsForAdmin(prev => prev.map(p => p.id === itemId ? { ...p, [flagName]: !currentValue, updatedAt: new Date().toISOString() } : p));
      }
    } catch(error: any) {
        logFirebaseError(`toggleItemFlag (${String(flagName)})`, error);
        alert(`เกิดข้อผิดพลาดในการอัปเดตสถานะ: ${error.message}`);
    }
  };

  const handleToggleSuspiciousJob = (jobId: string, loadJobsFn?: (isInitialLoad?: boolean) => void) => {
    const job = allJobsForAdmin.find(j => j.id === jobId);
    if (job) toggleItemFlagAndUpdateLists('jobs', jobId, "isSuspicious", job.userId, job.ownerId, job.isSuspicious, loadJobsFn);
  };
  const handleToggleSuspiciousHelperProfile = (profileId: string, loadHelpersFn?: (isInitialLoad?: boolean) => void) => {
    const profile = allHelperProfilesForAdmin.find(p => p.id === profileId);
    if (profile) toggleItemFlagAndUpdateLists('helperProfiles', profileId, "isSuspicious", profile.userId, profile.ownerId, profile.isSuspicious, loadHelpersFn);
  };
  const handleTogglePinnedJob = (jobId: string, loadJobsFn?: (isInitialLoad?: boolean) => void) => {
    const job = allJobsForAdmin.find(j => j.id === jobId);
    if (job) toggleItemFlagAndUpdateLists('jobs', jobId, "isPinned", job.userId, job.ownerId, job.isPinned, loadJobsFn);
  };
  const handleTogglePinnedHelperProfile = (profileId: string, loadHelpersFn?: (isInitialLoad?: boolean) => void) => {
    const profile = allHelperProfilesForAdmin.find(p => p.id === profileId);
    if (profile) toggleItemFlagAndUpdateLists('helperProfiles', profileId, "isPinned", profile.userId, profile.ownerId, profile.isPinned, loadHelpersFn);
  };
  const handleToggleVerifiedExperience = (profileId: string, loadHelpersFn?: (isInitialLoad?: boolean) => void) => {
    const profile = allHelperProfilesForAdmin.find(p => p.id === profileId);
    if (profile) toggleItemFlagAndUpdateLists('helperProfiles', profileId, "adminVerifiedExperience", profile.userId, profile.ownerId, profile.adminVerifiedExperience, loadHelpersFn);
  };
  const handleToggleHiredJobForUserOrAdmin = (jobId: string, loadJobsFn?: (isInitialLoad?: boolean) => void) => {
    const job = allJobsForAdmin.find(j => j.id === jobId);
    if (job) toggleItemFlagAndUpdateLists('jobs', jobId, "isHired", job.userId, job.ownerId, job.isHired, loadJobsFn);
  };
  const handleToggleUnavailableHelperProfileForUserOrAdmin = (profileId: string, loadHelpersFn?: (isInitialLoad?: boolean) => void) => {
    const profile = allHelperProfilesForAdmin.find(p => p.id === profileId);
    if (profile) toggleItemFlagAndUpdateLists('helperProfiles', profileId, "isUnavailable", profile.userId, profile.ownerId, profile.isUnavailable, loadHelpersFn);
  };
  // Modified to pass correct load functions for MyRoomPage context
  const handleToggleItemStatusFromMyRoom = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
    if (itemType === 'job') handleToggleHiredJobForUserOrAdmin(itemId, loadJobs);
    else if (itemType === 'profile') handleToggleUnavailableHelperProfileForUserOrAdmin(itemId, loadHelpers);
  };

  const handleLogHelperContactInteraction = async (helperProfileId: string) => {
    if (!currentUser) { requestLoginForAction(View.FindHelpers, { intent: 'contactHelper', postId: helperProfileId }); return; }
    const helperProfile = allHelperProfilesForAdmin.find(hp => hp.id === helperProfileId);
    if (!helperProfile || currentUser.id === helperProfile.userId) return;
    try {
        await logHelperContactInteractionService(helperProfileId, currentUser.id, helperProfile.userId);
        
        // The interestedCount is now managed by the handleToggleInterest, not here.
        // This function is purely for logging the contact event itself.

    } catch(error: any) {
        logFirebaseError("handleLogHelperContactInteraction", error);
        alert(`เกิดข้อผิดพลาดในการบันทึกการติดต่อ: ${error.message}`);
    }
  };

  const handleToggleInterest = async (
    targetId: string,
    targetType: 'job' | 'helperProfile',
    targetOwnerId: string
  ) => {
    if (!currentUser) {
      requestLoginForAction(
        targetType === 'job' ? View.FindJobs : View.FindHelpers,
        { intent: 'interest', postId: targetId }
      );
      return;
    }
    try {
      await toggleInterestService(targetId, targetType, targetOwnerId, currentUser.id);
      // The onSnapshot listener will automatically update the UI.
    } catch (error) {
      logFirebaseError("handleToggleInterest", error);
      alert(`เกิดข้อผิดพลาดในการบันทึกความสนใจ: ${error}`);
    }
  };
  
  // New Vouch handlers
  const handleOpenVouchModal = (userToVouch: User) => {
    if (!currentUser) {
      requestLoginForAction(View.PublicProfile, { action: 'vouch', userId: userToVouch.id });
      return;
    }
    setVouchModalData({ userToVouch });
  };
  const handleCloseVouchModal = () => setVouchModalData(null);

  const handleVouchSubmit = async (voucheeId: string, vouchType: VouchType, comment?: string) => {
    if (!currentUser) return;
    try {
      const ipAddress = "127.0.0.1"; // Placeholder for client-side IP
      const userAgent = navigator.userAgent;
      await vouchForUserService(currentUser, voucheeId, vouchType, ipAddress, userAgent, comment);
      alert("ขอบคุณสำหรับการรับรอง!");
      handleCloseVouchModal();
    } catch (error: any) {
      logFirebaseError("handleVouchSubmit", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };
  
  const handleOpenVouchesListModal = (userToList: User) => {
    setVouchListModalData({ userToList });
  };
  const handleCloseVouchesListModal = () => setVouchListModalData(null);

  // New Report Vouch handlers
  const handleOpenReportVouchModal = (vouchToReport: Vouch) => {
    if (!currentUser) {
      requestLoginForAction(View.PublicProfile, { action: 'report_vouch', vouchId: vouchToReport.id });
      return;
    }
    setReportVouchModalData({ vouchToReport });
  };
  const handleCloseReportVouchModal = () => setReportVouchModalData(null);

  const handleReportVouchSubmit = async (vouch: Vouch, comment: string) => {
    if (!currentUser) return;
    try {
      await reportVouchService(vouch, currentUser.id, comment);
      alert("ขอบคุณที่รายงานเข้ามา เราจะทำการตรวจสอบโดยเร็วที่สุด");
      handleCloseReportVouchModal();
    } catch (error: any) {
      logFirebaseError("handleReportVouchSubmit", error);
      alert(`เกิดข้อผิดพลาดในการส่งรายงาน: ${error.message}`);
    }
  };

  const handleResolveVouchReport = async (
    reportId: string,
    resolution: VouchReportStatus.ResolvedDeleted | VouchReportStatus.ResolvedKept,
    vouchId: string,
    voucheeId: string,
    vouchType: VouchType
  ) => {
    if (!currentUser || currentUser.role !== UserRole.Admin) {
      alert("คุณไม่มีสิทธิ์ดำเนินการนี้");
      return;
    }
    try {
      await resolveVouchReportService(reportId, resolution, currentUser.id, vouchId, voucheeId, vouchType);
      alert(`ดำเนินการกับรายงานเรียบร้อยแล้ว`);
    } catch (error: any) {
      logFirebaseError("handleResolveVouchReport", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };


  const handleAddOrUpdateWebboardPost = async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => {
    if (!currentUser) { requestLoginForAction(View.Webboard, { action: postIdToUpdate ? 'editPost' : 'createPost', postId: postIdToUpdate }); return; }
    if (!postIdToUpdate) {
      const limitCheck = checkWebboardPostLimits(currentUser);
      if (!limitCheck.canPost) {
        alert(limitCheck.message || "Cannot post");
        return;
      }
    }
    if (containsBlacklistedWords(postData.title) || containsBlacklistedWords(postData.body)) { alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม'); return; }
    if (postData.body.length > 5000) { alert('เนื้อหากระทู้ต้องไม่เกิน 5,000 ตัวอักษร'); return;}
    try {
        let finalPostId = postIdToUpdate;
        if (postIdToUpdate) {
            const postToEdit = allWebboardPostsForAdmin.find(p => p.id === postIdToUpdate);
            if (!postToEdit || !canEditOrDelete(postToEdit.userId, postToEdit.ownerId)) { alert('ไม่พบโพสต์ หรือไม่มีสิทธิ์แก้ไข'); return; }
            await updateWebboardPostService(postIdToUpdate, postData, currentUser.photo);
            alert('แก้ไขโพสต์เรียบร้อยแล้ว!');
        } else {
            finalPostId = await addWebboardPostService(postData, {userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, photo: currentUser.photo});
            const updatedUser = await getUserDocument(currentUser.id);
            if (updatedUser) setCurrentUser(updatedUser);
            alert('สร้างโพสต์ใหม่เรียบร้อยแล้ว!');
        }
        const updatedAdminPosts = postIdToUpdate
            ? allWebboardPostsForAdmin.map(p => p.id === postIdToUpdate ? { ...p, ...postData, authorPhoto: currentUser.photo, updatedAt: new Date().toISOString() } : p)
            : [...allWebboardPostsForAdmin, { ...postData, id: finalPostId!, userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, authorPhoto: currentUser.photo, likes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as WebboardPost];
        setAllWebboardPostsForAdmin(updatedAdminPosts);

        setItemToEdit(null); setEditingItemType(null);

        if (sourceViewForForm === View.MyRoom) {
            setMyRoomInitialTabOverride(editOriginMyRoomTab); // Prepare tab for MyRoomPage
            navigateTo(View.MyRoom);
        } else if (sourceViewForForm === View.AdminDashboard) {
            setSelectedPostId(finalPostId || null); 
            navigateTo(View.Webboard, finalPostId);
        } else { 
            setSelectedPostId(finalPostId || null);
            navigateTo(View.Webboard, finalPostId);
        }
        setEditOriginMyRoomTab(null); // Clear origin tab after navigation logic
        setSourceViewForForm(null);


    } catch (error: any) {
        logFirebaseError("handleAddOrUpdateWebboardPost", error);
        alert(`เกิดข้อผิดพลาดในการจัดการโพสต์: ${error.message}`);
    }
  };

  const handleAddWebboardComment = async (postId: string, text: string) => {
    if (!currentUser) { requestLoginForAction(View.Webboard, { action: 'comment', postId: postId }); return; }
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

  const handleToggleWebboardPostLike = async (postId: string) => {
    if (!currentUser) { requestLoginForAction(View.Webboard, { action: 'like', postId: postId }); return; }
    try {
        await toggleWebboardPostLikeService(postId, currentUser.id);
        setAllWebboardPostsForAdmin(prev => prev.map(p => {
            if (p.id === postId) {
                const userIndex = p.likes.indexOf(currentUser!.id);
                const newLikes = userIndex > -1 ? p.likes.filter(id => id !== currentUser!.id) : [...p.likes, currentUser!.id];
                // Do NOT update p.updatedAt here to prevent showing "(แก้ไข)"
                return { ...p, likes: newLikes };
            }
            return p;
        }));

    } catch (error: any) {
        logFirebaseError("handleToggleWebboardPostLike", error);
        alert(`เกิดข้อผิดพลาดในการกดไลค์: ${error.message}`);
    }
  };

  const handleSaveWebboardPost = async (postId: string) => {
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: 'save', postId: postId });
      return;
    }
    try {
      const isCurrentlySaved = userSavedPosts.includes(postId);
      if (isCurrentlySaved) {
        await unsaveUserWebboardPostService(currentUser.id, postId);
        // UserSavedPosts subscription will update currentUser and trigger re-render
      } else {
        await saveUserWebboardPostService(currentUser.id, postId);
        // UserSavedPosts subscription will update currentUser and trigger re-render
      }
    } catch (error) {
      logFirebaseError("handleSaveWebboardPost", error);
      alert("เกิดข้อผิดพลาดในการบันทึกโพสต์");
    }
  };

  const handleShareWebboardPost = async (postId: string, postTitle: string) => {
    const postUrl = `${window.location.origin}${window.location.pathname}?view=${View.Webboard}&id=${postId}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      
      if (copiedNotificationTimerRef.current) {
        clearTimeout(copiedNotificationTimerRef.current);
      }
      setCopiedLinkNotification(`คัดลอกลิงก์แล้ว: ${postTitle.substring(0, 30)}${postTitle.length > 30 ? '...' : ''}`);
      
      copiedNotificationTimerRef.current = window.setTimeout(() => {
        setCopiedLinkNotification(null); 
      }, 2500);

    } catch (err) {
      console.error('Failed to copy: ', err);
      setCopiedLinkNotification('ไม่สามารถคัดลอกลิงก์ได้');
      if (copiedNotificationTimerRef.current) {
        clearTimeout(copiedNotificationTimerRef.current);
      }
      copiedNotificationTimerRef.current = window.setTimeout(() => {
        setCopiedLinkNotification(null);
      }, 2500);
    }
  };


  const handlePinWebboardPost = (postId: string, loadWebboardFn?: (isInitialLoad?: boolean) => void) => {
    const post = allWebboardPostsForAdmin.find(p => p.id === postId);
    if (post && currentUser?.role === UserRole.Admin) {
      toggleItemFlagAndUpdateLists('webboardPosts', postId, "isPinned", post.userId, post.ownerId, post.isPinned, loadWebboardFn);
    } else if (currentUser?.role !== UserRole.Admin) {
      alert("เฉพาะแอดมินเท่านั้นที่สามารถปักหมุดโพสต์ได้");
    }
  };

  const handleSetUserRole = async (userIdToUpdate: string, newRole: UserRole) => {
    if (currentUser?.role !== UserRole.Admin) { alert("คุณไม่มีสิทธิ์เปลี่ยนบทบาทผู้ใช้"); return; }
    if (userIdToUpdate === currentUser.id) { alert("ไม่สามารถเปลี่ยนบทบาทของตัวเองได้"); return; }
    const userToUpdate = users.find(u => u.id === userIdToUpdate);
    if (userToUpdate && userToUpdate.role === UserRole.Admin && newRole !== UserRole.Admin) { /* Consider if this rule is needed */ }
    try {
        await setUserRoleService(userIdToUpdate, newRole);
        alert(`อัปเดตบทบาทของผู้ใช้ @${userToUpdate?.username} (ชื่อแสดง: ${getAuthorDisplayName(userToUpdate?.id || '', userToUpdate?.publicDisplayName)}) เป็น ${newRole} เรียบร้อยแล้ว`);
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
  
  const handleAddOrUpdateBlogPost = async (blogPostData: BlogPostFormData, existingPostId?: string) => {
    if (!currentUser || !(currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer)) {
        alert("คุณไม่มีสิทธิ์ดำเนินการนี้");
        return;
    }
    try {
        const { newCoverImageBase64, ...dataToSave } = blogPostData;
        const newPostId = await addOrUpdateBlogPostService(
            { ...dataToSave, id: existingPostId },
            { id: currentUser.id, publicDisplayName: currentUser.publicDisplayName, photo: currentUser.photo },
            newCoverImageBase64
        );
        // Re-fetch all blog posts for admin to update the list
        const adminPosts = await getBlogPostsForAdmin();
        setAllBlogPosts(await getAllBlogPosts());
        setAllBlogPostsForAdmin(adminPosts);

        alert(`บทความ "${dataToSave.title}" ถูก${existingPostId ? 'อัปเดต' : 'สร้าง'}เรียบร้อยแล้ว`);
        setItemToEdit(null);
        setEditingItemType(null);
        navigateTo(View.AdminDashboard);
    } catch (error: any) {
        logFirebaseError("handleAddOrUpdateBlogPost", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
};

const handleToggleBlogPostLike = async (postId: string) => {
  if (!currentUser) { requestLoginForAction(View.Blog, { action: 'like', postId: postId }); return; }
  try {
      await toggleBlogPostLikeService(postId, currentUser.id);
      const updatedPosts = allBlogPosts.map(p => {
          if (p.id === postId) {
              const hasLiked = p.likes.includes(currentUser.id);
              const newLikes = hasLiked ? p.likes.filter(id => id !== currentUser.id) : [...p.likes, currentUser.id];
              return { ...p, likes: newLikes, likeCount: newLikes.length };
          }
          return p;
      });
      setAllBlogPosts(updatedPosts);
      setAllBlogPostsForAdmin(updatedPosts);
  } catch (error: any) {
      logFirebaseError("handleToggleBlogPostLike", error);
      alert(`เกิดข้อผิดพลาดในการกดไลค์บทความ: ${error.message}`);
  }
};

const handleAddBlogComment = async (postId: string, text: string) => {
  if (!currentUser) { requestLoginForAction(View.Blog, { action: 'comment', postId: postId }); return; }
  if (containsBlacklistedWords(text)) { alert('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม'); return; }
  try {
    await addBlogCommentService(postId, text, { userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, photoURL: currentUser.photo });
  } catch (error: any) {
    logFirebaseError("handleAddBlogComment", error);
    alert(`เกิดข้อผิดพลาดในการเพิ่มคอมเมนต์: ${error.message}`);
  }
};

const handleUpdateBlogComment = async (commentId: string, newText: string) => {
  if (!currentUser) { alert("คุณต้องเข้าสู่ระบบเพื่อแก้ไขคอมเมนต์"); return; }
  if (containsBlacklistedWords(newText)) { alert('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม'); return; }
  const comment = blogComments.find(c => c.id === commentId);
  if (!comment || !canEditOrDelete(comment.userId)) { alert("คุณไม่มีสิทธิ์แก้ไขคอมเมนต์นี้"); return; }
  try {
      await updateBlogCommentService(commentId, newText);
      alert('แก้ไขคอมเมนต์เรียบร้อยแล้ว');
  } catch (error: any) {
      logFirebaseError("handleUpdateBlogComment", error);
      alert(`เกิดข้อผิดพลาดในการแก้ไขคอมเมนต์: ${error.message}`);
  }
};

const handleDeleteBlogComment = async (commentId: string) => {
  const comment = blogComments.find(c => c.id === commentId);
  if (!comment || !canEditOrDelete(comment.userId)) { alert("คุณไม่มีสิทธิ์ลบคอมเมนต์นี้"); return; }
  openConfirmModal(
      `ยืนยันการลบ`,
      `คุณแน่ใจหรือไม่ว่าต้องการลบคอมเมนต์นี้?`,
      async () => {
          try {
              await deleteBlogCommentService(commentId);
              alert("ลบคอมเมนต์เรียบร้อยแล้ว");
          } catch (error: any) {
              logFirebaseError("handleDeleteBlogComment", error);
              alert(`เกิดข้อผิดพลาดในการลบคอมเมนต์: ${error.message}`);
          }
      }
  );
};



  const renderNavLinks = (isMobile: boolean) => {
    const displayBadgeForProfile = getUserDisplayBadge(currentUser);
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
              <div className={`font-sans font-medium text-base mb-3 py-2 px-4 border-b border-neutral-DEFAULT/50 w-full text-center`}>
                สวัสดี, {currentUser.publicDisplayName}!
                <UserLevelBadge level={displayBadgeForProfile} size="sm" />
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

            {/* Combined MyRoom link */}
            {currentView !== View.MyRoom && (
              <Button onClick={() => navigateAndCloseMenu(View.MyRoom)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>🛋️</span><span>ห้องของฉัน</span></span>
              </Button>
            )}

            {/* UserProfile and MyPosts links are removed as they are part of MyRoom */}

            {(currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer) && currentView !== View.AdminDashboard && (
              <Button onClick={() => navigateAndCloseMenu(View.AdminDashboard)} variant="accent" {...commonButtonPropsBase}>
                 <span className={navItemSpanClass}><span>🔐</span><span>Admin</span></span>
              </Button>
            )}
            
            {currentView !== View.Blog && (
               <Button onClick={() => navigateAndCloseMenu(View.Blog)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                 <span className={navItemSpanClass}><span>📖</span><span>บทความ</span></span>
               </Button>
            )}

            {currentView !== View.Webboard && (
               <Button onClick={() => navigateAndCloseMenu(View.Webboard)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                 <span className={navItemSpanClass}><span>💬</span><span>กระทู้พูดคุย</span></span>
               </Button>
            )}

            {currentView === View.FindJobs ? (
              <Button onClick={() => { setSourceViewForForm(View.FindJobs); navigateAndCloseMenu(View.PostJob);}} variant="primary" {...commonButtonPropsBase}>
                + ลงประกาศงาน
              </Button>
            ) : (currentView !== View.PostJob || (currentView === View.PostJob && itemToEdit)) && (
              <Button onClick={() => navigateAndCloseMenu(View.FindJobs)} variant="primary" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>📢</span><span>ประกาศงาน</span></span>
              </Button>
            )}
            {isMobile && currentView === View.PostJob && !itemToEdit && (
                <Button onClick={() => navigateAndCloseMenu(View.FindJobs)} variant="primary" {...commonButtonPropsBase}>
                  <span className={navItemSpanClass}><span>📢</span><span>ประกาศงาน</span></span>
                </Button>
            )}

            {currentView === View.FindHelpers ? (
              <Button onClick={() => { setSourceViewForForm(View.FindHelpers); navigateAndCloseMenu(View.OfferHelp);}} variant="secondary" {...commonButtonPropsBase}>
                + สร้างโปรไฟล์
              </Button>
            ) : (currentView !== View.OfferHelp || (currentView === View.OfferHelp && itemToEdit )) && (
              <Button onClick={() => navigateAndCloseMenu(View.FindHelpers)} variant="secondary" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>👥</span><span>โปรไฟล์ผู้ช่วย</span></span>
              </Button>
            )}
            {isMobile && currentView === View.OfferHelp && !itemToEdit && (
                <Button onClick={() => navigateAndCloseMenu(View.FindHelpers)} variant="secondary" {...commonButtonPropsBase}>
                  <span className={navItemSpanClass}><span>👥</span><span>โปรไฟล์ผู้ช่วย</span></span>
                </Button>
            )}

            <Button
              onClick={handleLogout}
              variant="outline"
              colorScheme="accent"
              className={`${commonButtonPropsBase.className} border-red-500 text-red-500 hover:bg-red-500 hover:text-white focus:ring-red-500`}
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
              {currentView !== View.Blog && (
                 <Button onClick={() => navigateAndCloseMenu(View.Blog)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                   <span className={navItemSpanClass}><span>📖</span><span>บทความ</span></span>
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

  const AnimatedHamburgerIcon = () => {
    const topVariants: Variants = {
      closed: { rotate: 0, y: 0 },
      open: { rotate: 45, y: 5.5 }, // Adjusted y for centering rotation
    };
    const middleVariants: Variants = {
      closed: { opacity: 1 },
      open: { opacity: 0 },
    };
    const bottomVariants: Variants = {
      closed: { rotate: 0, y: 0 },
      open: { rotate: -45, y: -5.5 }, // Adjusted y for centering rotation
    };
    const lineStyle: React.CSSProperties = {
      width: '16px',
      height: '2px',
      backgroundColor: 'currentColor',
      borderRadius: '1px',
      position: 'absolute',
      left: '4px', // (24 - 16) / 2
      transformOrigin: 'center',
    };

    return (
      <motion.button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="relative w-6 h-6 focus:outline-none"
        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMobileMenuOpen}
        animate={isMobileMenuOpen ? "open" : "closed"}
        initial={false}
      >
        <motion.div
          style={{ ...lineStyle, top: '5px' }} // y=6 center
          variants={topVariants}
          transition={{ duration: 0.3, ease: "easeInOut" } as Transition}
        />
        <motion.div
          style={{ ...lineStyle, top: '11px' }} // y=12 center
          variants={middleVariants}
          transition={{ duration: 0.15, ease: "easeInOut" } as Transition}
        />
        <motion.div
          style={{ ...lineStyle, top: '17px' }} // y=18 center
          variants={bottomVariants}
          transition={{ duration: 0.3, ease: "easeInOut" } as Transition}
        />
      </motion.button>
    );
  };


  const renderHeader = () => {
      if ((currentView === View.PasswordReset && !currentUser) || isLoadingAuth) {
        return null;
      }
      return (
      <header
        className="sticky top-0 z-30 w-full bg-headerBlue-DEFAULT text-neutral-dark p-4 sm:p-5 lg:p-6 shadow-md"
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex-shrink-0">
            <span
              onClick={() => { navigateTo(View.Home); setIsMobileMenuOpen(false); }}
              className="cursor-pointer font-sans font-bold text-lg sm:text-xl lg:text-2xl text-neutral-dark"
              aria-label="ไปหน้าแรก HAJOBJA.COM"
            >
              HAJOBJA.COM
            </span>
          </div>

          <div className="flex items-center flex-shrink-0 lg:ml-6">
              <nav className="hidden lg:flex items-center justify-end gap-3 md:gap-4 lg:gap-5 flex-wrap">
                {renderNavLinks(false)}
              </nav>

              <div className="lg:hidden ml-2 p-2 rounded-md text-neutral-dark hover:bg-neutral-DEFAULT/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-neutral-DEFAULT">
                <AnimatedHamburgerIcon />
              </div>
          </div>
        </div>
      </header>
    );
  };

  const renderMobileMenu = () => {
    return (
      <AnimatePresence initial={false}>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 } as Transition}
              className="fixed inset-0 bg-neutral-dark/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              key="menuPanel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 } as Transition}
              className="fixed top-0 right-0 h-full w-4/5 max-w-xs bg-white shadow-xl p-5 z-50 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-sans font-semibold text-neutral-medium">เมนู</h2>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-1 rounded-md text-neutral-dark hover:bg-neutral-light/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-neutral-DEFAULT" 
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const renderHome = () => {
    return (
    <div className="flex flex-col items-center justify-center px-6 sm:px-8 text-center">
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-medium text-neutral-dark mb-2 tracking-tight leading-snug"> ✨ หาจ๊อบจ้า ✨ </h2>
      <p className="text-base sm:text-lg lg:text-xl text-neutral-dark max-w-xl leading-relaxed mb-8 font-normal font-serif"> แพลตฟอร์มที่อยู่เคียงข้างคนขยัน </p>
      <div className="w-full max-w-3xl lg:max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-14">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-primary/30">
          <h3 className="text-lg font-sans font-semibold text-primary mb-4">ประกาศงาน</h3>
          <div className="space-y-4">
             <Button onClick={() => currentUser ? navigateTo(View.FindJobs) : requestLoginForAction(View.FindJobs)} variant="primary" size="md" className="w-full">
              <span className="flex items-center justify-center gap-2"><span>📢</span><span>ดูประกาศงานทั้งหมด</span></span>
            </Button>
            <Button
              onClick={() => { setSourceViewForForm(View.Home); navigateTo(View.PostJob); }}
              variant="outline"
              colorScheme="primary"
              size="md"
              className="w-full"
            >
              <span className="flex items-center justify-center gap-2"><span>📝</span><span>ลงประกาศงาน</span></span>
            </Button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-secondary/30">
          <h3 className="text-lg font-sans font-semibold text-secondary-hover mb-4">โปรไฟล์ผู้ช่วยและบริการ</h3>
          <div className="space-y-4">
             <Button onClick={() => currentUser ? navigateTo(View.FindHelpers) : requestLoginForAction(View.FindHelpers)} variant="secondary" size="md" className="w-full">
              <span className="flex items-center justify-center gap-2"><span>👥</span><span>ดูโปรไฟล์ทั้งหมด</span></span>
            </Button>
            <Button
               onClick={() => { setSourceViewForForm(View.Home); navigateTo(View.OfferHelp); }}
              variant="outline"
              colorScheme="secondary"
              size="md"
              className="w-full"
            >
              <span className="flex items-center justify-center gap-2"><span>🙋</span><span>สร้างโปรไฟล์</span></span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
  };

  const renderPostJob = () => {
    if (!currentUser) return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>;
    const handleSubmitJobFormWithLoad = (formDataFromForm: JobFormData & { id?: string }) => {
        const loadJobsFn = (isInitialLoad = false) => {
            console.log("Dummy loadJobs called from PostJobForm", isInitialLoad);
        };
        if (formDataFromForm.id && itemToEdit && editingItemType === 'job') {
             handleUpdateJob(formDataFromForm as JobFormData & { id: string }, loadJobsFn);
        } else {
            handleAddJob(formDataFromForm, loadJobsFn);
        }
    };
    return <PostJobForm onSubmitJob={handleSubmitJobFormWithLoad} onCancel={handleCancelEditOrPost} initialData={editingItemType === 'job' ? itemToEdit as Job : undefined} isEditing={!!itemToEdit && editingItemType === 'job'} currentUser={currentUser} jobs={allJobsForAdmin} />;
  };

  const renderOfferHelpForm = () => {
    if (!currentUser) return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>;
    const handleSubmitHelperProfileFormWithLoad = (formDataFromForm: HelperProfileFormData & { id?: string }) => {
        const loadHelpersFn = (isInitialLoad = false) => {
            console.log("Dummy loadHelpers called from OfferHelpForm", isInitialLoad);
        };
        if (formDataFromForm.id && itemToEdit && editingItemType === 'profile') {
            handleUpdateHelperProfile(formDataFromForm as HelperProfileFormData & { id: string }, loadHelpersFn);
        } else {
            handleAddHelperProfile(formDataFromForm, loadHelpersFn);
        }
    };
    return <OfferHelpForm onSubmitProfile={handleSubmitHelperProfileFormWithLoad} onCancel={handleCancelEditOrPost} initialData={editingItemType === 'profile' ? itemToEdit as HelperProfile : undefined} isEditing={!!itemToEdit && editingItemType === 'profile'} currentUser={currentUser} helperProfiles={allHelperProfilesForAdmin} />;
  };

  // --- Infinite Scroll Logic for Jobs (within App component scope, used by renderFindJobs) ---
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [lastVisibleJob, setLastVisibleJob] = useState<DocumentSnapshot | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [hasMoreJobs, setHasMoreJobs] = useState(true);
  const [initialJobsLoaded, setInitialJobsLoaded] = useState(false);
  const jobsLoaderRef = useRef<HTMLDivElement>(null);

  const loadJobs = useCallback(async (isInitialLoad = false) => {
    if (isLoadingJobs || (!isInitialLoad && !hasMoreJobs)) return;
    setIsLoadingJobs(true);

    if (isInitialLoad) {
      setJobsList([]);
      setLastVisibleJob(null);
      setHasMoreJobs(true);
      setInitialJobsLoaded(false);
    }

    try {
      const result = await getJobsPaginated(
        JOBS_PAGE_SIZE,
        isInitialLoad ? null : lastVisibleJob,
        selectedJobCategoryFilter === 'all' ? null : selectedJobCategoryFilter,
        jobSearchTerm,
        selectedJobSubCategoryFilter, 
        selectedJobProvinceFilter    
      );
      setJobsList(prevJobs => isInitialLoad ? result.items : [...prevJobs, ...result.items]);
      setLastVisibleJob(result.lastVisibleDoc);
      setHasMoreJobs(result.items.length === JOBS_PAGE_SIZE && result.lastVisibleDoc !== null);
      setInitialJobsLoaded(true);
    } catch (error) {
      console.error("Error loading jobs:", error);
      logFirebaseError("loadJobs", error);
      setHasMoreJobs(false);
      setInitialJobsLoaded(true);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [isLoadingJobs, hasMoreJobs, lastVisibleJob, selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter]);

  useEffect(() => {
    if (currentView === View.FindJobs) {
      loadJobs(true);
    }
  }, [currentView, selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter]); 

  useEffect(() => {
    if (currentView !== View.FindJobs || !initialJobsLoaded) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreJobs && !isLoadingJobs) {
          loadJobs();
        }
      },
      { threshold: 0.8 }
    );
    const currentLoaderRef = jobsLoaderRef.current;
    if (currentLoaderRef) observer.observe(currentLoaderRef);
    return () => {
      if (currentLoaderRef) observer.unobserve(currentLoaderRef);
    };
  }, [currentView, hasMoreJobs, isLoadingJobs, initialJobsLoaded, loadJobs]);

  const handleJobSearch = (term: string) => {
    setJobSearchTerm(term);
    if (term.trim()) {
      addRecentSearch('recentJobSearches', term.trim());
      setRecentJobSearches(getRecentSearches('recentJobSearches'));
    }
  };
  const handleJobCategoryFilterChange = (category: FilterableCategory) => {
    setSelectedJobCategoryFilter(category);
    setSelectedJobSubCategoryFilter('all'); // Reset subcategory when main category changes
  };
  
  const handleSubmitJobForm = (formDataFromForm: JobFormData & { id?: string }) => {
    if (formDataFromForm.id && itemToEdit && editingItemType === 'job') {
        handleUpdateJob(formDataFromForm as JobFormData & { id: string }, loadJobs);
    } else {
        handleAddJob(formDataFromForm, loadJobs);
    }
  };

  const handleEditOwnJobFromFindView = (jobId: string) => {
    const jobToEdit = allJobsForAdmin.find(j => j.id === jobId);
    if (jobToEdit && currentUser && jobToEdit.userId === currentUser.id) {
        setItemToEdit(jobToEdit);
        setEditingItemType('job');
        setSourceViewForForm(View.FindJobs); // Set source view
        navigateTo(View.PostJob);
    } else {
        alert("ไม่สามารถแก้ไขงานนี้ได้");
    }
  };


  const renderFindJobs = () => {
    let emptyStateMessage = "ยังไม่มีงานประกาศในขณะนี้";
    if (jobSearchTerm.trim() || selectedJobCategoryFilter !== 'all' || selectedJobSubCategoryFilter !== 'all' || selectedJobProvinceFilter !== 'all') {
      emptyStateMessage = "ไม่พบงานที่ตรงกับเกณฑ์การค้นหาของคุณ";
    }

    const activeUserJobs = jobsList
      .filter(job => 
          job.isExpired === false && 
          job.expiresAt && !isDateInPast(job.expiresAt) &&
          job.isHired === false
      )
      .map(job => {
        const posterUser = users.find(u => u.id === job.userId);
        let posterIsAdminVerified = false;
        if (posterUser) {
          posterIsAdminVerified = allHelperProfilesForAdmin.some(
            hp => hp.userId === posterUser.id && hp.adminVerifiedExperience === true
          );
        }
        return { ...job, posterIsAdminVerified };
      });
    
    const inputBaseStyle = "w-full p-3 bg-white border border-[#CCCCCC] rounded-[10px] text-neutral-dark font-serif font-normal focus:outline-none transition-colors duration-150 ease-in-out";
    const selectBaseStyle = `${inputBaseStyle} appearance-none`;
    const inputFocusStyle = "focus:border-neutral-dark focus:ring-1 focus:ring-neutral-dark focus:ring-opacity-50";

    const jobSubCategoryOptions = selectedJobCategoryFilter !== 'all' && JOB_SUBCATEGORIES_MAP[selectedJobCategoryFilter]
      ? JOB_SUBCATEGORIES_MAP[selectedJobCategoryFilter]
      : [];


    return (
    <div className="p-4 sm:p-6">
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-3xl font-sans font-semibold text-primary mb-3">📢 ประกาศงาน</h2>
        <p className="text-md font-serif text-neutral-dark mb-6 max-w-xl mx-auto font-normal">เวลาและทักษะตรงกับงานไหน ติดต่อเลย!</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
        <aside className="lg:col-span-3 mb-8 lg:mb-0">
          <div className="sticky top-24 space-y-6 p-4 bg-white rounded-xl shadow-lg border border-neutral-DEFAULT">
            <CategoryFilterBar categories={Object.values(JobCategory)} selectedCategory={selectedJobCategoryFilter} onSelectCategory={handleJobCategoryFilterChange} />
            
            <div>
              <label htmlFor="job-subcategory-filter" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                เลือกหมวดหมู่ย่อย:
              </label>
              <select
                id="job-subcategory-filter"
                value={selectedJobSubCategoryFilter}
                onChange={(e) => setSelectedJobSubCategoryFilter(e.target.value as JobSubCategory | 'all')}
                className={`${selectBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                disabled={selectedJobCategoryFilter === 'all' || jobSubCategoryOptions.length === 0}
                aria-label="กรองตามหมวดหมู่ย่อยงาน"
              >
                <option value="all">หมวดหมู่ย่อยทั้งหมด</option>
                {jobSubCategoryOptions.map(subCat => (
                  <option key={subCat} value={subCat}>{subCat}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="job-province-filter" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                เลือกจังหวัด:
              </label>
              <select
                id="job-province-filter"
                value={selectedJobProvinceFilter}
                onChange={(e) => setSelectedJobProvinceFilter(e.target.value as Province | 'all')}
                className={`${selectBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                aria-label="กรองตามจังหวัดสำหรับงาน"
              >
                <option value="all">ทุกจังหวัด</option>
                {Object.values(Province).map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>
            
            <SearchInputWithRecent searchTerm={jobSearchTerm} onSearchTermChange={handleJobSearch} placeholder="ค้นหางาน, รายละเอียด..." recentSearches={recentJobSearches} onRecentSearchSelect={(term) => { setJobSearchTerm(term); addRecentSearch('recentJobSearches', term); setRecentJobSearches(getRecentSearches('recentJobSearches')); }} ariaLabel="ค้นหางาน" />
            
            {currentUser && ( <Button onClick={() => { setSourceViewForForm(View.FindJobs); navigateTo(View.PostJob);}} variant="primary" size="md" className="w-full sm:px-4 sm:text-sm">
              <span className="flex items-center justify-center gap-2">ลงประกาศงาน</span>
            </Button> )}
          </div>
        </aside>
        <section className="lg:col-span-9">
          {!initialJobsLoaded && isLoadingJobs && jobsList.length === 0 && (
            <div className="text-center py-20"><p className="text-xl font-sans">✨ กำลังโหลดประกาศงาน...</p></div>
          )}
          {initialJobsLoaded && activeUserJobs.length === 0 && !hasMoreJobs && (
            <div className="text-center py-10 bg-white p-6 rounded-lg shadow-md border border-neutral-DEFAULT">
              <svg className="mx-auto h-24 w-24 text-neutral-DEFAULT" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              <p className="mt-3 text-xl font-serif text-neutral-dark font-normal"> {emptyStateMessage} </p>
              {currentUser && jobsList.length === 0 && !jobSearchTerm.trim() && selectedJobCategoryFilter === 'all' && selectedJobSubCategoryFilter === 'all' && selectedJobProvinceFilter === 'all' && ( <Button onClick={() => { setSourceViewForForm(View.FindJobs); navigateTo(View.PostJob);}} variant="primary" size="md" className="mt-6 font-medium"> เป็นคนแรกที่ลงประกาศงาน! </Button> )}
              {!currentUser && jobsList.length === 0 && !jobSearchTerm.trim() && selectedJobCategoryFilter === 'all' && selectedJobSubCategoryFilter === 'all' && selectedJobProvinceFilter === 'all' && (<Button onClick={() => requestLoginForAction(View.PostJob)} variant="primary" size="md" className="mt-6 font-medium"> เข้าสู่ระบบเพื่อลงประกาศงาน </Button>)}
            </div>
          )}
          {activeUserJobs.length > 0 && (
            <AnimatePresence>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                variants={listVariants}
                initial="hidden"
                animate="visible"
              >
                 {activeUserJobs.map(job => (
                  <motion.div key={job.id} variants={itemVariants}>
                    <JobCard 
                        job={job} 
                        navigateTo={navigateTo} 
                        currentUser={currentUser} 
                        requestLoginForAction={requestLoginForAction} 
                        onEditJobFromFindView={currentUser?.id === job.userId ? handleEditOwnJobFromFindView : undefined}
                        getAuthorDisplayName={getAuthorDisplayName}
                        onToggleInterest={(targetId, targetType, targetOwnerId) => handleToggleInterest(targetId, targetType, targetOwnerId)}
                        isInterested={userInterests.some(i => i.targetId === job.id && i.targetType === 'job')}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
          <div ref={jobsLoaderRef} className="h-10 flex justify-center items-center">
            {isLoadingJobs && initialJobsLoaded && jobsList.length > 0 && <p className="text-sm font-sans text-neutral-medium">✨ กำลังโหลดเพิ่มเติม...</p>}
          </div>
          {initialJobsLoaded && !hasMoreJobs && activeUserJobs.length > 0 && (
            <p className="text-center text-sm font-sans text-neutral-medium py-4">🎉 คุณดูครบทุกประกาศงานแล้ว</p>
          )}
        </section>
      </div>
    </div>
  );};

  // --- Infinite Scroll Logic for Helpers (within App component scope, used by renderFindHelpers) ---
  const [helperProfilesList, setHelperProfilesList] = useState<HelperProfile[]>([]);
  const [lastVisibleHelper, setLastVisibleHelper] = useState<DocumentSnapshot | null>(null);
  const [isLoadingHelpers, setIsLoadingHelpers] = useState(false);
  const [hasMoreHelpers, setHasMoreHelpers] = useState(true);
  const [initialHelpersLoaded, setInitialHelpersLoaded] = useState(false);
  const helpersLoaderRef = useRef<HTMLDivElement>(null);

  const loadHelpers = useCallback(async (isInitialLoad = false) => {
    if (isLoadingHelpers || (!isInitialLoad && !hasMoreHelpers)) return;
    setIsLoadingHelpers(true);

    if (isInitialLoad) {
      setHelperProfilesList([]);
      setLastVisibleHelper(null);
      setHasMoreHelpers(true);
      setInitialHelpersLoaded(false);
    }
    try {
      const result = await getHelperProfilesPaginated(
        HELPERS_PAGE_SIZE,
        isInitialLoad ? null : lastVisibleHelper,
        selectedHelperCategoryFilter === 'all' ? null : selectedHelperCategoryFilter,
        helperSearchTerm,
        selectedHelperSubCategoryFilter, 
        selectedHelperProvinceFilter    
      );
      setHelperProfilesList(prev => isInitialLoad ? result.items : [...prev, ...result.items]);
      setLastVisibleHelper(result.lastVisibleDoc);
      setHasMoreHelpers(result.items.length === HELPERS_PAGE_SIZE && result.lastVisibleDoc !== null);
      setInitialHelpersLoaded(true);
    } catch (error) {
      console.error("Error loading helper profiles:", error);
      logFirebaseError("loadHelpers", error);
      setHasMoreHelpers(false);
      setInitialHelpersLoaded(true);
    } finally {
      setIsLoadingHelpers(false);
    }
  }, [isLoadingHelpers, hasMoreHelpers, lastVisibleHelper, selectedHelperCategoryFilter, helperSearchTerm, selectedHelperSubCategoryFilter, selectedHelperProvinceFilter]);

  useEffect(() => {
    if (currentView === View.FindHelpers) {
      loadHelpers(true);
    }
  }, [currentView, selectedHelperCategoryFilter, helperSearchTerm, selectedHelperSubCategoryFilter, selectedHelperProvinceFilter]); 

  useEffect(() => {
    if (currentView !== View.FindHelpers || !initialHelpersLoaded) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreHelpers && !isLoadingHelpers) {
          loadHelpers();
        }
      },
      { threshold: 0.8 }
    );
    const currentLoaderRef = helpersLoaderRef.current;
    if (currentLoaderRef) observer.observe(currentLoaderRef);
    return () => {
      if (currentLoaderRef) observer.unobserve(currentLoaderRef);
    };
  }, [currentView, hasMoreHelpers, isLoadingHelpers, initialHelpersLoaded, loadHelpers]);

  const handleHelperSearch = (term: string) => {
    setHelperSearchTerm(term);
    if (term.trim()) {
      addRecentSearch('recentHelperSearches', term.trim());
      setRecentHelperSearches(getRecentSearches('recentHelperSearches'));
    }
  };
  const handleHelperCategoryFilterChange = (category: FilterableCategory) => {
    setSelectedHelperCategoryFilter(category);
    setSelectedHelperSubCategoryFilter('all'); // Reset subcategory when main category changes
  };
  
  const handleSubmitHelperProfileForm = (formDataFromForm: HelperProfileFormData & { id?: string }) => {
    if (formDataFromForm.id && itemToEdit && editingItemType === 'profile') {
        handleUpdateHelperProfile(formDataFromForm as HelperProfileFormData & { id: string }, loadHelpers);
    } else {
        handleAddHelperProfile(formDataFromForm, loadHelpers);
    }
  };

  const handleEditOwnHelperProfileFromFindView = (profileId: string) => {
    const profileToEdit = allHelperProfilesForAdmin.find(p => p.id === profileId);
    if (profileToEdit && currentUser && profileToEdit.userId === currentUser.id) {
        setItemToEdit(profileToEdit);
        setEditingItemType('profile');
        setSourceViewForForm(View.FindHelpers); // Set source view
        navigateTo(View.OfferHelp);
    } else {
        alert("ไม่สามารถแก้ไขโปรไฟล์นี้ได้");
    }
  };

  const renderFindHelpers = () => {
    let emptyStateMessage = "ยังไม่มีผู้เสนอตัวช่วยงานในขณะนี้";
    if (helperSearchTerm.trim() || selectedHelperCategoryFilter !== 'all' || selectedHelperSubCategoryFilter !== 'all' || selectedHelperProvinceFilter !== 'all') {
      emptyStateMessage = "ไม่พบผู้ช่วยที่ตรงกับเกณฑ์การค้นหาของคุณ";
    }


    const activeAndAvailableHelperProfiles = helperProfilesList.filter(p =>
      p.isExpired === false &&
      p.expiresAt && !isDateInPast(p.expiresAt) &&
      p.isUnavailable === false
    );

    const enrichedHelperProfilesList: EnrichedHelperProfile[] = activeAndAvailableHelperProfiles.map(hp => {
      const user = users.find(u => u.id === hp.userId);
      return { ...hp, userPhoto: user?.photo, userAddress: user?.address, verifiedExperienceBadge: hp.adminVerifiedExperience || false, profileCompleteBadge: user?.profileComplete || false, warningBadge: hp.isSuspicious || false, interestedCount: hp.interestedCount || 0, };
    });

    const inputBaseStyle = "w-full p-3 bg-white border border-[#CCCCCC] rounded-[10px] text-neutral-dark font-serif font-normal focus:outline-none transition-colors duration-150 ease-in-out";
    const selectBaseStyle = `${inputBaseStyle} appearance-none`;
    const inputFocusStyle = "focus:border-neutral-dark focus:ring-1 focus:ring-neutral-dark focus:ring-opacity-50";

    const helperSubCategoryOptions = selectedHelperCategoryFilter !== 'all' && JOB_SUBCATEGORIES_MAP[selectedHelperCategoryFilter]
      ? JOB_SUBCATEGORIES_MAP[selectedHelperCategoryFilter]
      : [];

    return (
    <div className="p-4 sm:p-6">
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-3xl font-sans font-semibold text-secondary-hover mb-3">👥 โปรไฟล์ผู้ช่วยและบริการ</h2>
        <p className="text-md font-serif text-neutral-dark mb-6 max-w-xl mx-auto font-normal"> เลือกคนที่ตรงกับความต้องการ แล้วติดต่อได้เลย! </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
        <aside className="lg:col-span-3 mb-8 lg:mb-0">
            <div className="sticky top-24 space-y-6 p-4 bg-white rounded-xl shadow-lg border border-neutral-DEFAULT">
                <CategoryFilterBar categories={Object.values(JobCategory)} selectedCategory={selectedHelperCategoryFilter} onSelectCategory={handleHelperCategoryFilterChange} />
                
                <div>
                  <label htmlFor="helper-subcategory-filter" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                    เลือกหมวดหมู่ย่อย:
                  </label>
                  <select
                    id="helper-subcategory-filter"
                    value={selectedHelperSubCategoryFilter}
                    onChange={(e) => setSelectedHelperSubCategoryFilter(e.target.value as JobSubCategory | 'all')}
                    className={`${selectBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                    disabled={selectedHelperCategoryFilter === 'all' || helperSubCategoryOptions.length === 0}
                    aria-label="กรองตามหมวดหมู่ย่อยผู้ช่วย"
                  >
                    <option value="all">หมวดหมู่ย่อยทั้งหมด</option>
                    {helperSubCategoryOptions.map(subCat => (
                      <option key={subCat} value={subCat}>{subCat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="helper-province-filter" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                    เลือกจังหวัด:
                  </label>
                  <select
                    id="helper-province-filter"
                    value={selectedHelperProvinceFilter}
                    onChange={(e) => setSelectedHelperProvinceFilter(e.target.value as Province | 'all')}
                    className={`${selectBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                    aria-label="กรองตามจังหวัดสำหรับผู้ช่วย"
                  >
                    <option value="all">ทุกจังหวัด</option>
                    {Object.values(Province).map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>
                
                <SearchInputWithRecent searchTerm={helperSearchTerm} onSearchTermChange={handleHelperSearch} placeholder="ค้นหาผู้ช่วย, ทักษะ, พื้นที่..." recentSearches={recentHelperSearches} onRecentSearchSelect={(term) => { setHelperSearchTerm(term); addRecentSearch('recentHelperSearches', term); setRecentHelperSearches(getRecentSearches('recentHelperSearches')); }} ariaLabel="ค้นหาผู้ช่วย" />
                
                {currentUser && ( <Button onClick={() => { setSourceViewForForm(View.FindHelpers); navigateTo(View.OfferHelp); }} variant="secondary" size="md" className="w-full sm:px-4 sm:text-sm"> <span className="flex items-center justify-center gap-2">สร้างโปรไฟล์</span> </Button> )}
            </div>
        </aside>
        <section className="lg:col-span-9">
            {!initialHelpersLoaded && isLoadingHelpers && helperProfilesList.length === 0 && (
              <div className="text-center py-20"><p className="text-xl font-sans">✨ กำลังค้นหาผู้ช่วย...</p></div>
            )}
            {initialHelpersLoaded && enrichedHelperProfilesList.length === 0 && !hasMoreHelpers && (
            <div className="text-center py-10 bg-white p-6 rounded-lg shadow-md border border-neutral-DEFAULT">
                <svg className="mx-auto h-24 w-24 text-neutral-DEFAULT" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-2.144M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                <p className="mt-3 text-xl font-serif text-neutral-dark font-normal"> {emptyStateMessage} </p>
                {currentUser && helperProfilesList.length === 0 && !helperSearchTerm.trim() && selectedHelperCategoryFilter === 'all' && selectedHelperSubCategoryFilter === 'all' && selectedHelperProvinceFilter === 'all' && ( <Button onClick={() => { setSourceViewForForm(View.FindHelpers); navigateTo(View.OfferHelp);}} variant="secondary" size="md" className="mt-6 font-medium"> เป็นคนแรกที่เสนอตัวช่วยงาน! </Button> )}
                {!currentUser && helperProfilesList.length === 0 && !helperSearchTerm.trim() && selectedHelperCategoryFilter === 'all' && selectedHelperSubCategoryFilter === 'all' && selectedHelperProvinceFilter === 'all' && (<Button onClick={() => requestLoginForAction(View.OfferHelp)} variant="secondary" size="md" className="mt-6 font-medium"> เข้าสู่ระบบเพื่อเสนอตัวช่วยงาน </Button>)}
            </div>
            )}
            {enrichedHelperProfilesList.length > 0 && (
                <AnimatePresence>
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {enrichedHelperProfilesList.map(profile => (
                      <motion.div key={profile.id} variants={itemVariants}>
                        <HelperCard
                            profile={profile}
                            onNavigateToPublicProfile={handleNavigateToPublicProfile}
                            navigateTo={navigateTo}
                            onLogHelperContact={() => handleLogHelperContactInteraction(profile.id)}
                            currentUser={currentUser}
                            requestLoginForAction={requestLoginForAction}
                            onBumpProfile={(id) => handleBumpHelperProfile(id, loadHelpers)}
                            onEditProfileFromFindView={currentUser?.id === profile.userId ? handleEditOwnHelperProfileFromFindView : undefined}
                            getAuthorDisplayName={getAuthorDisplayName}
                            onToggleInterest={(targetId, targetType, targetOwnerId) => handleToggleInterest(targetId, targetType, targetOwnerId)}
                            isInterested={userInterests.some(i => i.targetId === profile.id && i.targetType === 'helperProfile')}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
            )}
            <div ref={helpersLoaderRef} className="h-10 flex justify-center items-center">
                {isLoadingHelpers && initialHelpersLoaded && helperProfilesList.length > 0 && <p className="text-sm font-sans text-neutral-medium">✨ กำลังโหลดเพิ่มเติม...</p>}
            </div>
            {initialHelpersLoaded && !hasMoreHelpers && enrichedHelperProfilesList.length > 0 && (
                <p className="text-center text-sm font-sans text-neutral-medium py-4">🎉 คุณดูครบทุกโปรไฟล์แล้ว</p>
            )}
        </section>
      </div>
    </div>);};

  const renderRegister = () => <RegistrationForm onRegister={handleRegister} onSwitchToLogin={() => navigateTo(View.Login)} />;
  const renderLogin = () => <LoginForm onLogin={handleLogin} onSwitchToRegister={() => navigateTo(View.Register)} onForgotPassword={() => setIsForgotPasswordModalOpen(true)} />;
  // UserProfilePage is now primarily accessed via MyRoomPage
  // const renderUserProfile = () => { if (!currentUser) return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>; return (<UserProfilePage currentUser={currentUser} onUpdateProfile={handleUpdateUserProfile} onCancel={() => navigateTo(View.Home)} />); };

  const renderMyRoomPage = () => {
    if (!currentUser) {
      requestLoginForAction(View.MyRoom);
      return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>;
    }
    return (<MyRoomPage
        currentUser={currentUser}
        users={users}
        allJobsForAdmin={allJobsForAdmin}
        allHelperProfilesForAdmin={allHelperProfilesForAdmin}
        allWebboardPostsForAdmin={allWebboardPostsForAdmin}
        webboardComments={webboardComments}
        userInterests={userInterests}
        navigateTo={navigateTo}
        onEditItem={handleStartEditMyItem} // Will now pass originatingTab
        onDeleteItem={handleDeleteItemFromMyRoom}
        onToggleHiredStatus={handleToggleItemStatusFromMyRoom}
        onUpdateUserProfile={handleUpdateUserProfile}
        getUserDisplayBadge={getUserDisplayBadge}
        onSavePost={handleSaveWebboardPost}
        onBumpProfile={(id) => handleBumpHelperProfile(id, loadHelpers)}
        onNavigateToPublicProfile={handleNavigateToPublicProfile}
        initialTab={myRoomInitialTabOverride}
        onInitialTabProcessed={() => setMyRoomInitialTabOverride(null)}
        getAuthorDisplayName={getAuthorDisplayName}
        onToggleInterest={handleToggleInterest}
        requestLoginForAction={requestLoginForAction}
        onEditJobFromFindView={handleEditOwnJobFromFindView}
        onEditHelperProfileFromFindView={handleEditOwnHelperProfileFromFindView}
        onLogHelperContact={handleLogHelperContactInteraction}
      />);
  };

  const renderAdminDashboard = () => {
    if (!currentUser || (currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.Writer)) return <p className="text-center p-8 font-serif">คุณไม่มีสิทธิ์เข้าถึงหน้านี้...</p>;
    return (<AdminDashboard
        jobs={allJobsForAdmin} helperProfiles={allHelperProfilesForAdmin} users={users} interactions={interactions}
        webboardPosts={allWebboardPostsForAdmin} webboardComments={webboardComments}
        allBlogPostsForAdmin={allBlogPostsForAdmin}
        onDeleteJob={(id) => handleDeleteJob(id, loadJobs)}
        onDeleteHelperProfile={(id) => handleDeleteHelperProfile(id, loadHelpers)}
        onToggleSuspiciousJob={(id) => handleToggleSuspiciousJob(id, loadJobs)}
        onToggleSuspiciousHelperProfile={(id) => handleToggleSuspiciousHelperProfile(id, loadHelpers)}
        onTogglePinnedJob={(id) => handleTogglePinnedJob(id, loadJobs)}
        onTogglePinnedHelperProfile={(id) => handleTogglePinnedHelperProfile(id, loadHelpers)}
        onToggleHiredJob={(id) => handleToggleHiredJobForUserOrAdmin(id, loadJobs)}
        onToggleUnavailableHelperProfile={(id) => handleToggleUnavailableHelperProfileForUserOrAdmin(id, loadHelpers)}
        onToggleVerifiedExperience={(id) => handleToggleVerifiedExperience(id, loadHelpers)}
        onDeleteWebboardPost={handleDeleteWebboardPost}
        onPinWebboardPost={handlePinWebboardPost}
        onStartEditItem={handleStartEditItemFromAdmin}
        onSetUserRole={handleSetUserRole}
        currentUser={currentUser}
        isSiteLocked={isSiteLocked} onToggleSiteLock={handleToggleSiteLock}
        getAuthorDisplayName={getAuthorDisplayName}
        getUserDisplayBadge={getUserDisplayBadge}
        vouchReports={vouchReports}
        onResolveVouchReport={handleResolveVouchReport}
        getVouchDocument={getVouchDocument}
        orionAnalyzeService={orionAnalyzeService} // Pass new service
        onDeleteBlogPost={handleDeleteBlogPost}
        onAddOrUpdateBlogPost={handleAddOrUpdateBlogPost}
        getUserDocument={getUserDocument}
    />);
  };
  // MyPostsPage is replaced by MyRoomPage
  // const renderMyPostsPage = () => { if (!currentUser || currentUser.role === UserRole.Admin) return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทาง...</p>; return (<MyPostsPage currentUser={currentUser} jobs={allJobsForAdmin} helperProfiles={allHelperProfilesForAdmin} webboardPosts={allWebboardPostsForAdmin} webboardComments={webboardComments} onEditItem={handleStartEditMyItem} onDeleteItem={handleDeleteItemFromMyPosts} onToggleHiredStatus={handleToggleItemStatusFromMyPosts} navigateTo={navigateTo} getUserDisplayBadge={(user) => getUserDisplayBadge(user)} />); };
  const renderAboutUsPage = () => <AboutUsPage />;
  const renderSafetyPage = () => <SafetyPage />;

  const handleBackFromPublicProfile = () => {
    // Use the stored sourceViewForPublicProfile to navigate back
    navigateTo(sourceViewForPublicProfile || View.FindHelpers); // Default to FindHelpers if somehow not set
  };

  const renderPublicProfile = () => {
    if (!viewingProfileInfo || !viewingProfileInfo.userId) {
      navigateTo(View.Home);
      return <p className="text-center p-8 font-serif">ไม่พบ ID โปรไฟล์...</p>;
    }
    const profileUser = users.find(u => u.id === viewingProfileInfo.userId);
    if (!profileUser) return <p className="text-center p-8 font-serif text-red-500">ไม่พบโปรไฟล์ผู้ใช้</p>;
    if (profileUser.role === UserRole.Admin && currentUser?.id !== viewingProfileInfo.userId) {
      return <div className="text-center p-8 font-serif text-red-500">โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้</div>;
    }

    let helperProfileForBio: HelperProfile | undefined = undefined;
    if (viewingProfileInfo.helperProfileId) {
        // Find specific helper profile if ID is provided
        helperProfileForBio = allHelperProfilesForAdmin.find(hp => 
            hp.id === viewingProfileInfo.helperProfileId && 
            hp.userId === viewingProfileInfo.userId && // Ensure it belongs to the user
            !isDateInPast(hp.expiresAt) && 
            !hp.isExpired
        );
    }
    // If viewingProfileInfo.helperProfileId is not set, helperProfileForBio remains undefined.
    // The previous logic of finding *any* active profile is removed for general profile views.

    const displayBadgeForProfile = getUserDisplayBadge(profileUser);
    return <PublicProfilePage
              currentUser={currentUser}
              user={{...profileUser, userLevel: displayBadgeForProfile}}
              helperProfile={helperProfileForBio}
              onBack={handleBackFromPublicProfile}
              onVouchForUser={handleOpenVouchModal}
              onShowVouches={handleOpenVouchesListModal}
           />;
  };

  const renderWebboardPage = () => {
    return (<WebboardPage
      currentUser={currentUser} users={users}
      comments={webboardComments}
      onAddOrUpdatePost={handleAddOrUpdateWebboardPost} onAddComment={handleAddWebboardComment}
      onToggleLike={handleToggleWebboardPostLike}
      onSavePost={handleSaveWebboardPost}
      onSharePost={handleShareWebboardPost}
      onDeletePost={handleDeleteWebboardPost}
      onPinPost={handlePinWebboardPost}
      onEditPost={handleEditWebboardPostFromPage}
      onDeleteComment={handleDeleteWebboardComment} 
      onUpdateComment={handleUpdateWebboardComment}
      selectedPostId={selectedPostId} setSelectedPostId={setSelectedPostId}
      navigateTo={navigateTo} editingPost={editingItemType === 'webboardPost' ? itemToEdit as WebboardPost : null}
      onCancelEdit={handleCancelEditOrPost}
      getUserDisplayBadge={getUserDisplayBadge}
      requestLoginForAction={requestLoginForAction}
      onNavigateToPublicProfile={handleNavigateToPublicProfile}
      checkWebboardPostLimits={checkWebboardPostLimits}
      checkWebboardCommentLimits={checkWebboardCommentLimits}
      pageSize={WEBBOARD_PAGE_SIZE}
      getAuthorDisplayName={getAuthorDisplayName}
    />);};
  const renderPasswordResetPage = () => <PasswordResetPage navigateTo={navigateTo} />;

  const renderBlogPage = () => {
    const enrichedBlogPosts: EnrichedBlogPost[] = allBlogPosts.map(post => ({
      ...post,
      author: users.find(u => u.id === post.authorId),
    }));
    if (selectedBlogPostSlug) {
      const selectedPost = enrichedBlogPosts.find(p => p.slug === selectedBlogPostSlug);
      return selectedPost ? <BlogArticlePage
                                post={selectedPost} 
                                onBack={() => navigateTo(View.Blog)}
                                comments={blogComments}
                                currentUser={currentUser}
                                onToggleLike={handleToggleBlogPostLike}
                                onAddComment={handleAddBlogComment}
                                onUpdateComment={handleUpdateBlogComment}
                                onDeleteComment={handleDeleteBlogComment}
                                canEditOrDelete={canEditOrDelete}
                             /> : <p>Article not found.</p>;
    }
    return <BlogPage posts={enrichedBlogPosts} onSelectPost={(slug) => navigateTo(View.Blog, { slug })} />;
  };

  const renderArticleEditor = () => {
    if (!currentUser || !(currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer)) {
        return <p className="text-center p-8 font-serif">คุณไม่มีสิทธิ์เข้าถึงหน้านี้...</p>;
    }
    return (
        <ArticleEditor
            onSubmit={handleAddOrUpdateBlogPost}
            onCancel={handleCancelEditOrPost}
            initialData={editingItemType === 'blogPost' ? itemToEdit as BlogPost : undefined}
            isEditing={!!itemToEdit && editingItemType === 'blogPost'}
            currentUser={currentUser}
            onGenerateSuggestions={starlightWriterService}
        />
    );
  };


  let currentViewContent;
  if (isLoadingAuth) {
    currentViewContent = (<div className="flex justify-center items-center h-screen"><p className="text-xl font-sans text-neutral-dark">กำลังโหลด...</p></div>);
  } else {
    if (currentView === View.PasswordReset && !currentUser) {
      currentViewContent = renderPasswordResetPage();
    } else if (isSiteLocked && currentUser?.role !== UserRole.Admin) {
      return <SiteLockOverlay />;
    } else {
      switch (currentView) {
          case View.Home: currentViewContent = renderHome(); break;
          case View.PostJob: currentViewContent = renderPostJob(); break;
          case View.FindJobs: currentViewContent = renderFindJobs(); break;
          case View.OfferHelp: currentViewContent = renderOfferHelpForm(); break;
          case View.FindHelpers: currentViewContent = renderFindHelpers(); break;
          case View.Login: currentViewContent = renderLogin(); break;
          case View.Register: currentViewContent = renderRegister(); break;
          case View.AdminDashboard: currentViewContent = renderAdminDashboard(); break;
          case View.MyPosts: currentViewContent = renderMyRoomPage(); break;
          case View.UserProfile: currentViewContent = renderMyRoomPage(); break;
          case View.MyRoom: currentViewContent = renderMyRoomPage(); break;
          case View.AboutUs: currentViewContent = renderAboutUsPage(); break;
          case View.PublicProfile: currentViewContent = renderPublicProfile(); break;
          case View.Safety: currentViewContent = renderSafetyPage(); break;
          case View.Webboard: currentViewContent = renderWebboardPage(); break;
          case View.PasswordReset: currentViewContent = renderPasswordResetPage(); break;
          case View.Blog: currentViewContent = renderBlogPage(); break;
          case View.ArticleEditor: currentViewContent = renderArticleEditor(); break;
          default:
            const exhaustiveCheck: never = currentView;
            currentViewContent = <p>Unknown view: {exhaustiveCheck}</p>;
      }
    }
  }

  // AnimatePresence for CopiedLinkNotification
  const CopiedNotification = () => (
      <AnimatePresence>
          {copiedLinkNotification && (
              <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.3 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="fixed bottom-10 right-10 bg-neutral-dark text-white text-sm font-sans font-medium px-4 py-2 rounded-lg shadow-xl z-50"
              >
                  {copiedLinkNotification}
              </motion.div>
          )}
      </AnimatePresence>
  );

  const isFullPageLayout = [View.MyRoom, View.FindJobs, View.FindHelpers].includes(currentView);

  // The main layout class determines padding and centering for different views.
  const mainLayoutClasses = isFullPageLayout 
    ? '' 
    : 'justify-center container mx-auto';


  return (
    <div className={`font-serif bg-neutral-light min-h-screen flex flex-col`}>
      {renderHeader()}
      {renderMobileMenu()}
      <main className={`flex-grow flex flex-col p-4 sm:p-6 lg:p-8 ${mainLayoutClasses}`}>
        {currentViewContent}
      </main>
      <footer className="bg-neutral-light/50 text-center p-6 text-sm text-neutral-medium">
        <div className="space-x-6 mb-4">
            <button onClick={() => navigateTo(View.AboutUs)} className="hover:text-secondary-hover transition-colors">เกี่ยวกับเรา</button>
            <button onClick={() => navigateTo(View.Safety)} className="hover:text-secondary-hover transition-colors">ความปลอดภัย</button>
            <button onClick={() => setIsFeedbackModalOpen(true)} className="hover:text-secondary-hover transition-colors">ส่ง Feedback</button>
        </div>
        <div className="mb-4">
          <span className="font-sans">Created by</span>
          <a href="https://www.facebook.com/bluecathousestudio/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center align-middle ml-1.5 font-sans font-medium">
              <img 
                src="https://i.postimg.cc/wxrcQPHV/449834128-122096458958403535-3024125841409891827-n-1-removebg-preview.png"
                alt="Blue Cat House Logo" 
                className="h-5 w-auto mr-1"
              />
              <span>Blue Cat House</span>
          </a>
        </div>
        <div className="text-xs text-neutral-medium/80">
            © 2025 HAJOBJA.COM - All rights reserved.
        </div>
      </footer>
      <ConfirmModal isOpen={isConfirmModalOpen} onClose={closeConfirmModal} onConfirm={handleConfirmDeletion} title={confirmModalTitle} message={confirmModalMessage} />
      <FeedbackForm isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} currentUserEmail={currentUser?.email} />
      <ForgotPasswordModal isOpen={isForgotPasswordModalOpen} onClose={() => setIsForgotPasswordModalOpen(false)} onSendResetEmail={handleSendPasswordResetEmail} />

      {vouchModalData && currentUser && <VouchModal isOpen={!!vouchModalData} onClose={handleCloseVouchModal} userToVouch={vouchModalData.userToVouch} currentUser={currentUser} onSubmit={handleVouchSubmit} />}
      {vouchListModalData && <VouchesListModal isOpen={!!vouchListModalData} onClose={handleCloseVouchesListModal} userToList={vouchListModalData.userToList} navigateToPublicProfile={(id) => navigateTo(View.PublicProfile, id)} onReportVouch={handleOpenReportVouchModal} currentUser={currentUser} />}
      {reportVouchModalData && <ReportVouchModal isOpen={!!reportVouchModalData} onClose={handleCloseReportVouchModal} vouchToReport={reportVouchModalData.vouchToReport} onSubmitReport={(comment) => handleReportVouchSubmit(reportVouchModalData.vouchToReport, comment)} />}

      <CopiedNotification />
    </div>
  );
};

export default App;
