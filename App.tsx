import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthActions } from './hooks/useAuthActions.ts';
import { useJobs } from './hooks/useJobs.ts';
import { useHelpers } from './hooks/useHelpers.ts';
import { useUser } from './hooks/useUser.ts';
import { useWebboard } from './hooks/useWebboard.ts';
import { useBlog } from './hooks/useBlog.ts';
import { useAdmin } from './hooks/useAdmin.ts';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { User, Job, HelperProfile, EnrichedHelperProfile, WebboardPost, WebboardComment, EnrichedWebboardPost, EnrichedWebboardComment, Vouch, VouchReport, BlogPost, EnrichedBlogPost, BlogComment, RegistrationDataType } from './types/types.ts';
import type { AdminItem as AdminItemType } from './components/AdminDashboard.tsx';
import { View, UserRole, JobCategory, JobSubCategory, Province, FilterableCategory, USER_LEVELS, ADMIN_BADGE_DETAILS, MODERATOR_BADGE_DETAILS, ACTIVITY_BADGE_DETAILS, GenderOption, HelperEducationLevelOption, WebboardCategory } from './types/types.ts';
import { useAuth } from './context/AuthContext.tsx';
import { useData } from './context/DataContext.tsx';
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
import { MyRoomPage } from './components/MyRoomPage.tsx';
import type { ActiveTab as MyRoomActiveTab } from './components/MyRoomPage.tsx';
import { AboutUsPage } from './components/AboutUsPage.tsx';
import { PublicProfilePage } from './components/PublicProfilePage.tsx';
import { SafetyPage } from './components/SafetyPage.tsx';
import { FeedbackForm } from './components/FeedbackForm.tsx';
import { WebboardPage } from './components/WebboardPage.tsx';
import { BlogPage } from './components/BlogPage.tsx';
import { ArticleEditor } from './components/ArticleEditor.tsx';
import { SiteLockOverlay } from './components/SiteLockOverlay.tsx';
import { CategoryFilterBar } from './components/CategoryFilterBar.tsx';
import { SearchInputWithRecent } from './components/SearchInputWithRecent.tsx';
import { PasswordResetPage } from './components/PasswordResetPage.tsx';
import { VouchModal } from './components/VouchModal.tsx';
import { VouchesListModal } from './components/VouchesListModal.tsx';
import { ReportVouchModal } from './components/ReportVouchModal.tsx';
import { UserLevelBadge } from './components/UserLevelBadge.tsx';
import { getJobsPaginated } from './services/jobService.ts';
import { getHelperProfilesPaginated } from './services/helperProfileService.ts';
import { AnimatePresence, motion, type Variants, type Transition } from "framer-motion";
import { isDateInPast } from './utils/dateUtils.ts';
import { getRecentSearches, addRecentSearch } from './utils/localStorageUtils.ts';
import { getUserDisplayBadge } from './utils/userUtils.ts';
import { BlogArticlePage } from './components/BlogArticlePage.tsx';

const JOBS_PAGE_SIZE = 9;
const HELPERS_PAGE_SIZE = 9;

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { when: "beforeChildren", staggerChildren: 0.07, delayChildren: 0.1 } as Transition,
  },
};

const itemVariants: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 12 } as Transition },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } as Transition },
};

const App: React.FC = () => {
  const authActions = useAuthActions();
  const jobActions = useJobs();
  const helperActions = useHelpers();
  const userActions = useUser();
  const webboardActions = useWebboard();
  const blogActions = useBlog();
  const adminActions = useAdmin();

  const { currentUser, isLoadingAuth } = useAuth();
  const {
    users: allUsers,
    interactions,
    allBlogPosts,
    allBlogPostsForAdmin,
    allWebboardPostsForAdmin,
    webboardComments,
    allJobsForAdmin,
    allHelperProfilesForAdmin,
    vouchReports,
    userSavedPosts,
    userInterests,
    isLoadingData,
  } = useData();

  const [currentView, setCurrentView] = useState<View>(View.Home);
  const [isSiteLocked, setIsSiteLocked] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [vouchModalData, setVouchModalData] = useState<{ userToVouch: User } | null>(null);
  const [vouchListModalData, setVouchListModalData] = useState<{ userToList: User } | null>(null);
  const [reportVouchModalData, setReportVouchModalData] = useState<{ vouchToReport: Vouch } | null>(null);
  const [loginRedirectInfo, setLoginRedirectInfo] = useState<{ view: View; payload?: any } | null>(null);
  const [itemToEdit, setItemToEdit] = useState<Job | HelperProfile | WebboardPost | BlogPost | null>(null);
  const [editingItemType, setEditingItemType] = useState<'job' | 'profile' | 'webboardPost' | 'blogPost' | null>(null);
  const [sourceViewForForm, setSourceViewForForm] = useState<View | null>(null);
  const [viewingProfileInfo, setViewingProfileInfo] = useState<{ userId: string; helperProfileId?: string } | null>(null);
  const [sourceViewForPublicProfile, setSourceViewForPublicProfile] = useState<View>(View.FindHelpers);
  const [editOriginMyRoomTab, setEditOriginMyRoomTab] = useState<MyRoomActiveTab | null>(null);
  const [myRoomInitialTabOverride, setMyRoomInitialTabOverride] = useState<MyRoomActiveTab | null>(null);
  const [selectedJobCategoryFilter, setSelectedJobCategoryFilter] = useState<FilterableCategory>('all');
  const [selectedHelperCategoryFilter, setSelectedHelperCategoryFilter] = useState<FilterableCategory>('all');
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [helperSearchTerm, setHelperSearchTerm] = useState('');
  const [recentJobSearches, setRecentJobSearches] = useState<string[]>([]);
  const [recentHelperSearches, setRecentHelperSearches] = useState<string[]>([]);
  const [selectedJobSubCategoryFilter, setSelectedJobSubCategoryFilter] = useState<JobSubCategory | 'all'>('all');
  const [selectedJobProvinceFilter, setSelectedJobProvinceFilter] = useState<Province | 'all'>('all');
  const [selectedHelperSubCategoryFilter, setSelectedHelperSubCategoryFilter] = useState<JobSubCategory | 'all'>('all');
  const [selectedHelperProvinceFilter, setSelectedHelperProvinceFilter] = useState<Province | 'all'>('all');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedBlogPostSlug, setSelectedBlogPostSlug] = useState<string | null>(null);
  const [blogComments, setBlogComments] = useState<BlogComment[]>([]);
  const [copiedLinkNotification, setCopiedLinkNotification] = useState<string | null>(null);
  const copiedNotificationTimerRef = useRef<number | null>(null);

  const parseUrlAndSetInitialState = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const viewFromUrl = params.get('view') as View | null;
    if (viewFromUrl && Object.values(View).includes(viewFromUrl)) {
      setCurrentView(viewFromUrl);
    } else {
      setCurrentView(View.Home);
    }
  }, []);

  useEffect(() => {
    parseUrlAndSetInitialState();
    window.addEventListener('popstate', parseUrlAndSetInitialState);
    return () => window.removeEventListener('popstate', parseUrlAndSetInitialState);
  }, [parseUrlAndSetInitialState]);

  const navigateTo = (view: View, payload?: any) => {
    setCurrentView(view);
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    window.history.pushState({ view, payload }, '', `?${params.toString()}`);
    window.scrollTo(0, 0);
    setIsMobileMenuOpen(false);
  };
  
  const requestLoginForAction = (originalView: View, originalPayload?: any) => {
    if (!currentUser) {
      setLoginRedirectInfo({ view: originalView, payload: originalPayload });
      navigateTo(View.Login);
    }
  };

  const onLogin = async (loginIdentifier: string, passwordAttempt: string): Promise<boolean> => {
    const result = await authActions.login(loginIdentifier, passwordAttempt);
    if (result.success) {
      if (loginRedirectInfo) {
        navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload);
        setLoginRedirectInfo(null);
      } else {
        navigateTo(View.Home);
      }
    }
    return result.success;
  };

  const onRegister = async (userData: RegistrationDataType): Promise<boolean> => {
    const success = await authActions.register(userData);
    if (success) {
      if (loginRedirectInfo) {
        navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload);
        setLoginRedirectInfo(null);
      } else {
        navigateTo(View.Home);
      }
    }
    return success;
  };

  const onLogout = async () => {
    await authActions.logout();
    navigateTo(View.Home);
  };

  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = allUsers.find(u => u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  }, [allUsers]);

  const onCancelEditOrPost = () => {
    const targetView = sourceViewForForm || View.Home;
    setItemToEdit(null);
    setEditingItemType(null);
    setSourceViewForForm(null);
    navigateTo(targetView);
  };
  
  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalTitle(title); setConfirmModalMessage(message); setOnConfirmAction(() => onConfirm); setIsConfirmModalOpen(true);
  };
  
  const closeConfirmModal = () => { setIsConfirmModalOpen(false); setConfirmModalMessage(''); setConfirmModalTitle(''); setOnConfirmAction(null); };
  
  const onConfirmDeletion = () => { if (onConfirmAction) onConfirmAction(); closeConfirmModal(); };

  const renderNavLinks = (isMobile: boolean) => {
    const displayBadgeForProfile = getUserDisplayBadge(currentUser, USER_LEVELS, ADMIN_BADGE_DETAILS, MODERATOR_BADGE_DETAILS);
    const commonButtonPropsBase = isMobile
      ? { size: 'md' as const, className: 'w-full text-left justify-start py-3 px-4 text-base' }
      : { size: 'sm' as const, className: 'flex-shrink-0 nav-pill' };

    const navigateAndCloseMenu = (view: View, payload?: any) => {
      navigateTo(view, payload);
    };

    const navItemSpanClass = "inline-flex items-center gap-1.5";
    const activeClass = "active"; // Use CSS class for active state

    if (currentUser) {
        return (
          <>
            {isMobile && (
              <div className={`font-sans font-medium text-base mb-3 py-2 px-4 border-b border-primary-light w-full text-center text-primary-dark`}>
                สวัสดี, {currentUser.publicDisplayName}!
                <UserLevelBadge level={displayBadgeForProfile} size="sm" />
                {currentUser.activityBadge?.isActive && <UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="sm" />}
              </div>
            )}
            {!isMobile && (
               <div className={`font-sans font-medium mr-4 text-sm lg:text-base items-center flex gap-2 text-primary-dark`}>
                สวัสดี, {currentUser.publicDisplayName}!
                {currentUser.activityBadge?.isActive && <UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="sm" />}
              </div>
            )}

            {currentView !== View.Home && (
              <Button onClick={() => navigateAndCloseMenu(View.Home)} variant="outline" colorScheme="primary" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>🏠</span><span>หน้าแรก</span></span>
              </Button>
            )}
            
            {(currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer) && (
              <Button onClick={() => navigateAndCloseMenu(View.AdminDashboard)} variant="outline" colorScheme="secondary" {...commonButtonPropsBase} className={`${commonButtonPropsBase.className} ${currentView === View.AdminDashboard ? 'bg-secondary text-neutral-dark' : ''}`}>
                 <span className={navItemSpanClass}><span>🔐</span><span>Admin</span></span>
              </Button>
            )}

            <Button onClick={() => navigateTo(View.MyRoom)} variant="outline" colorScheme="secondary" {...commonButtonPropsBase} className={`${commonButtonPropsBase.className} ${currentView === View.MyRoom ? 'bg-secondary text-neutral-dark' : ''}`}>
              <span className={navItemSpanClass}><span>🛋️</span><span>ห้องของฉัน</span></span>
            </Button>
            
            <Button onClick={() => navigateTo(View.FindJobs)} variant="outline" colorScheme="primary" {...commonButtonPropsBase} className={`${commonButtonPropsBase.className} ${currentView === View.FindJobs ? activeClass : ''}`}>
              <span className={navItemSpanClass}><span>📢</span><span>ประกาศงาน</span></span>
            </Button>
            
            <Button onClick={() => navigateTo(View.FindHelpers)} variant="outline" colorScheme="primary" {...commonButtonPropsBase} className={`${commonButtonPropsBase.className} ${currentView === View.FindHelpers ? activeClass : ''}`}>
              <span className={navItemSpanClass}><span>👥</span><span>โปรไฟล์ผู้ช่วย</span></span>
            </Button>
            
            <Button onClick={() => navigateTo(View.Blog)} variant="outline" colorScheme="primary" {...commonButtonPropsBase} className={`${commonButtonPropsBase.className} ${currentView === View.Blog ? activeClass : ''}`}>
              <span className={navItemSpanClass}><span>📖</span><span>บทความ</span></span>
            </Button>
            
            <Button onClick={() => navigateTo(View.Webboard)} variant="outline" colorScheme="primary" {...commonButtonPropsBase} className={`${commonButtonPropsBase.className} ${currentView === View.Webboard ? activeClass : ''}`}>
              <span className={navItemSpanClass}><span>💬</span><span>กระทู้พูดคุย</span></span>
            </Button>
            
            <Button
              onClick={onLogout}
              variant="outline"
              colorScheme="accent"
              className={`${commonButtonPropsBase.className} border-error-red text-red-700 hover:bg-error-red hover:text-white focus:ring-error-red`}
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
                <Button onClick={() => navigateAndCloseMenu(View.Home)} variant="outline" colorScheme="primary" {...commonButtonPropsBase}>
                   <span className={navItemSpanClass}><span>🏠</span><span>หน้าแรก</span></span>
                </Button>
              )}
              
              <Button
                onClick={() => navigateAndCloseMenu(View.Login)}
                variant="primary"
                size={commonButtonPropsBase.size}
                className={`${commonButtonPropsBase.className}`}
              >
                  <span className={navItemSpanClass}><span>🔑</span><span>เข้าสู่ระบบ</span></span>
              </Button>
              <Button onClick={() => navigateAndCloseMenu(View.Register)} variant="outline" colorScheme="primary" {...commonButtonPropsBase}>
                 <span className={navItemSpanClass}><span>📝</span><span>ลงทะเบียน</span></span>
              </Button>

              <Button onClick={() => navigateTo(View.Blog)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>📖</span><span>บทความ</span></span>
              </Button>
            </>
        );
    }
  };

  const AnimatedHamburgerIcon = () => {
    const topVariants: Variants = {
      closed: { rotate: 0, y: 0 },
      open: { rotate: 45, y: 5.5 },
    };
    const middleVariants: Variants = {
      closed: { opacity: 1 },
      open: { opacity: 0 },
    };
    const bottomVariants: Variants = {
      closed: { rotate: 0, y: 0 },
      open: { rotate: -45, y: -5.5 },
    };
    const lineStyle: React.CSSProperties = {
      width: '16px',
      height: '2px',
      backgroundColor: 'var(--primary-dark)',
      borderRadius: '1px',
      position: 'absolute',
      left: '4px',
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
        <motion.div style={{ ...lineStyle, top: '5px' }} variants={topVariants} transition={{ duration: 0.3, ease: "easeInOut" } as Transition} />
        <motion.div style={{ ...lineStyle, top: '11px' }} variants={middleVariants} transition={{ duration: 0.15, ease: "easeInOut" } as Transition} />
        <motion.div style={{ ...lineStyle, top: '17px' }} variants={bottomVariants} transition={{ duration: 0.3, ease: "easeInOut" } as Transition} />
      </motion.button>
    );
  };

  const renderHeader = () => {
      if ((currentView === View.PasswordReset && !currentUser) || isLoadingAuth) {
        return null;
      }
      return (
      <header
        className="main-navbar sticky top-0 z-30 w-full bg-white text-primary-dark p-4 sm:p-5 lg:p-6 shadow-md border-b border-primary-light"
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex-shrink-0">
            <span
              onClick={() => { navigateTo(View.Home); setIsMobileMenuOpen(false); }}
              className="cursor-pointer font-sans font-bold text-lg sm:text-xl lg:text-2xl text-primary"
              aria-label="ไปหน้าแรก HAJOBJA.COM"
            >
              HAJOBJA.COM
            </span>
          </div>

          <div className="flex items-center flex-shrink-0 lg:ml-6">
              <nav className="hidden lg:flex items-center justify-end gap-3 md:gap-4 lg:gap-5 flex-wrap">
                {renderNavLinks(false)}
              </nav>

              <div className="lg:hidden ml-2 p-2 rounded-md text-primary-dark hover:bg-primary-light/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-light">
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
                <h2 className="text-lg font-sans font-semibold text-primary-dark">เมนู</h2>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-1 rounded-md text-primary-dark hover:bg-primary-light/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-light" 
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
      <div className="w-full flex-grow flex items-center justify-center">
        <div className="container mx-auto flex flex-col items-center px-6 sm:px-8 text-center py-20">
          <h1 className="hero-title font-sans">
            ✨ หาจ๊อบจ้า ✨
          </h1>
          <p className="hero-subtitle font-serif">
            แพลตฟอร์มที่อยู่เคียงข้างคนขยัน
          </p>
          <div className="w-full max-w-3xl lg:max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="home-card">
              <h3 className="card-section-title font-sans">ประกาศงาน</h3>
              <div className="space-y-4">
                <Button onClick={() => navigateTo(View.FindJobs)} variant="primary" size="lg" className="w-full">
                  <span className="flex items-center justify-center"><span className="button-icon">📢</span> ดูประกาศงานทั้งหมด</span>
                </Button>
                <Button onClick={() => { setSourceViewForForm(View.Home); navigateTo(View.PostJob); }} variant="secondary" size="lg" className="w-full">
                  <span className="flex items-center justify-center"><span className="button-icon">📝</span> ลงประกาศงาน</span>
                </Button>
              </div>
            </div>
            <div className="home-card">
              <h3 className="card-section-title font-sans">โปรไฟล์ผู้ช่วยและบริการ</h3>
              <div className="space-y-4">
                <Button onClick={() => navigateTo(View.FindHelpers)} variant="primary" size="lg" className="w-full">
                  <span className="flex items-center justify-center"><span className="button-icon">👥</span> ดูโปรไฟล์ทั้งหมด</span>
                </Button>
                <Button onClick={() => { setSourceViewForForm(View.Home); navigateTo(View.OfferHelp); }} variant="secondary" size="lg" className="w-full">
                  <span className="flex items-center justify-center"><span className="button-icon">🙋</span> สร้างโปรไฟล์</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FindJobsComponent = () => {
    const [jobsList, setJobsList] = useState<Job[]>([]);
    const [lastVisibleJob, setLastVisibleJob] = useState<DocumentSnapshot | null>(null);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const [hasMoreJobs, setHasMoreJobs] = useState(true);
    const [initialJobsLoaded, setInitialJobsLoaded] = useState(false);
    const jobsLoaderRef = useRef<HTMLDivElement>(null);

    const loadJobs = useCallback(async (isInitialLoad = false) => {
        if (isLoadingJobs || (!isInitialLoad && !hasMoreJobs)) return;
        setIsLoadingJobs(true);
        const lastDoc = isInitialLoad ? null : lastVisibleJob;
        try {
            const result = await getJobsPaginated(JOBS_PAGE_SIZE, lastDoc, selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter);
            setJobsList(prev => isInitialLoad ? result.items : [...prev, ...result.items]);
            setLastVisibleJob(result.lastVisibleDoc);
            setHasMoreJobs(!!result.lastVisibleDoc);
            setInitialJobsLoaded(true);
        } finally {
            setIsLoadingJobs(false);
        }
    }, [isLoadingJobs, hasMoreJobs, lastVisibleJob, selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter]);

    useEffect(() => { loadJobs(true); }, [selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter]);
    
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreJobs && !isLoadingJobs) {
            loadJobs();
          }
        },
        { threshold: 1.0 }
      );
      const currentLoader = jobsLoaderRef.current;
      if (currentLoader) observer.observe(currentLoader);
      return () => { if (currentLoader) observer.unobserve(currentLoader); };
    }, [hasMoreJobs, isLoadingJobs, loadJobs]);
    
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
        const posterUser = allUsers.find(u => u.id === job.userId);
        let posterIsAdminVerified = false;
        if (posterUser) {
          posterIsAdminVerified = allHelperProfilesForAdmin.some(
            hp => hp.userId === posterUser.id && hp.adminVerifiedExperience === true
          );
        }
        return { ...job, posterIsAdminVerified };
      });

    return (
      <div className="p-4 sm:p-6">
        <div className="text-center mb-6 lg:mb-8">
          <h2 className="text-3xl font-sans font-semibold text-primary-dark mb-3">📢 ประกาศงาน</h2>
          <p className="text-md font-serif text-neutral-dark mb-6 max-w-xl mx-auto font-normal">เวลาและทักษะตรงกับงานไหน ติดต่อเลย!</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
          <aside className="lg:col-span-3 mb-8 lg:mb-0">
            <div className="sticky top-24 space-y-6 p-4 bg-white rounded-xl shadow-lg border border-primary-light">
              <CategoryFilterBar categories={Object.values(JobCategory)} selectedCategory={selectedJobCategoryFilter} onSelectCategory={(cat) => setSelectedJobCategoryFilter(cat as FilterableCategory)} />
              <SearchInputWithRecent searchTerm={jobSearchTerm} onSearchTermChange={setJobSearchTerm} placeholder="ค้นหางาน..." recentSearches={recentJobSearches} onRecentSearchSelect={setJobSearchTerm} />
              {currentUser && (<Button onClick={() => navigateTo(View.PostJob)} variant="primary" className="w-full">ลงประกาศงาน</Button>)}
            </div>
          </aside>
          <section className="lg:col-span-9">
            {!initialJobsLoaded && isLoadingJobs && jobsList.length === 0 && (
              <div className="text-center py-20"><p className="text-xl font-sans">✨ กำลังโหลดประกาศงาน...</p></div>
            )}
            {initialJobsLoaded && activeUserJobs.length === 0 && !hasMoreJobs && (
              <div className="text-center py-10 bg-white p-6 rounded-lg shadow-md border border-primary-light">
                <p className="mt-3 text-xl font-serif text-neutral-gray font-normal"> {emptyStateMessage} </p>
              </div>
            )}
            {activeUserJobs.length > 0 && (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" variants={listVariants} initial="hidden" animate="visible">
                {activeUserJobs.map(job => (
                  <motion.div key={job.id} variants={itemVariants}>
                    <JobCard job={job} navigateTo={navigateTo} currentUser={currentUser} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={userActions.toggleInterest} isInterested={userInterests.some(i => i.targetId === job.id)} onEditJobFromFindView={jobActions.editJob} requestLoginForAction={requestLoginForAction} />
                  </motion.div>
                ))}
              </motion.div>
            )}
            <div ref={jobsLoaderRef} className="h-10 flex justify-center items-center">{isLoadingJobs && initialJobsLoaded && jobsList.length > 0 && <p>✨ กำลังโหลดเพิ่มเติม...</p>}</div>
            {initialJobsLoaded && !hasMoreJobs && activeUserJobs.length > 0 && <p className="text-center text-sm font-sans text-neutral-medium py-4">🎉 คุณดูครบทุกประกาศงานแล้ว</p>}
          </section>
        </div>
      </div>
    );
  };

  const FindHelpersComponent = () => {
    const [helperProfilesList, setHelperProfilesList] = useState<HelperProfile[]>([]);
    const [lastVisibleHelper, setLastVisibleHelper] = useState<DocumentSnapshot | null>(null);
    const [isLoadingHelpers, setIsLoadingHelpers] = useState(false);
    const [hasMoreHelpers, setHasMoreHelpers] = useState(true);
    const [initialHelpersLoaded, setInitialHelpersLoaded] = useState(false);
    const helpersLoaderRef = useRef<HTMLDivElement>(null);

    const loadHelpers = useCallback(async (isInitialLoad = false) => {
        if (isLoadingHelpers || (!isInitialLoad && !hasMoreHelpers)) return;
        setIsLoadingHelpers(true);
        const lastDoc = isInitialLoad ? null : lastVisibleHelper;
        try {
            const result = await getHelperProfilesPaginated(HELPERS_PAGE_SIZE, lastDoc, selectedHelperCategoryFilter, helperSearchTerm, selectedHelperSubCategoryFilter, selectedHelperProvinceFilter);
            setHelperProfilesList(prev => isInitialLoad ? result.items : [...prev, ...result.items]);
            setLastVisibleHelper(result.lastVisibleDoc);
            setHasMoreHelpers(!!result.lastVisibleDoc);
            setInitialHelpersLoaded(true);
        } finally {
            setIsLoadingHelpers(false);
        }
    }, [isLoadingHelpers, hasMoreHelpers, lastVisibleHelper, selectedHelperCategoryFilter, helperSearchTerm, selectedHelperSubCategoryFilter, selectedHelperProvinceFilter]);

    useEffect(() => { loadHelpers(true); }, [selectedHelperCategoryFilter, helperSearchTerm, selectedHelperSubCategoryFilter, selectedHelperProvinceFilter]);

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreHelpers && !isLoadingHelpers) {
            loadHelpers();
          }
        },
        { threshold: 1.0 }
      );
      const currentLoader = helpersLoaderRef.current;
      if (currentLoader) observer.observe(currentLoader);
      return () => { if (currentLoader) observer.unobserve(currentLoader); };
    }, [hasMoreHelpers, isLoadingHelpers, loadHelpers]);
    
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
      const user = allUsers.find(u => u.id === hp.userId);
      return { ...hp, userPhoto: user?.photo, userAddress: user?.address, verifiedExperienceBadge: hp.adminVerifiedExperience || false, profileCompleteBadge: user?.profileComplete || false, warningBadge: hp.isSuspicious || false, interestedCount: hp.interestedCount || 0, };
    });

    return (
      <div className="p-4 sm:p-6">
        <div className="text-center mb-6 lg:mb-8">
          <h2 className="text-3xl font-sans font-semibold text-primary-dark mb-3">👥 โปรไฟล์ผู้ช่วยและบริการ</h2>
          <p className="text-md font-serif text-neutral-dark mb-6 max-w-xl mx-auto font-normal"> เลือกคนที่ตรงกับความต้องการ แล้วติดต่อได้เลย! </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
          <aside className="lg:col-span-3 mb-8 lg:mb-0">
            <div className="sticky top-24 space-y-6 p-4 bg-white rounded-xl shadow-lg border border-primary-light">
                <CategoryFilterBar categories={Object.values(JobCategory)} selectedCategory={selectedHelperCategoryFilter} onSelectCategory={(cat) => setSelectedHelperCategoryFilter(cat as FilterableCategory)} />
                <SearchInputWithRecent searchTerm={helperSearchTerm} onSearchTermChange={setHelperSearchTerm} placeholder="ค้นหาผู้ช่วย..." recentSearches={recentHelperSearches} onRecentSearchSelect={setHelperSearchTerm} />
                {currentUser && ( <Button onClick={() => navigateTo(View.OfferHelp)} variant="secondary" className="w-full">สร้างโปรไฟล์</Button> )}
            </div>
          </aside>
          <section className="lg:col-span-9">
            {!initialHelpersLoaded && isLoadingHelpers && helperProfilesList.length === 0 && (
              <div className="text-center py-20"><p className="text-xl font-sans">✨ กำลังค้นหาผู้ช่วย...</p></div>
            )}
            {initialHelpersLoaded && enrichedHelperProfilesList.length === 0 && !hasMoreHelpers && (
            <div className="text-center py-10 bg-white p-6 rounded-lg shadow-md border border-primary-light">
                <p className="mt-3 text-xl font-serif text-neutral-gray font-normal"> {emptyStateMessage} </p>
            </div>
            )}
            {enrichedHelperProfilesList.length > 0 && (
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
                          onNavigateToPublicProfile={(info) => navigateTo(View.PublicProfile, info)}
                          onLogHelperContact={() => userActions.logContact(profile.id)}
                          currentUser={currentUser}
                          requestLoginForAction={requestLoginForAction}
                          onBumpProfile={(id) => helperActions.bumpProfile(id)}
                          onEditProfileFromFindView={helperActions.editProfile}
                          getAuthorDisplayName={getAuthorDisplayName}
                          onToggleInterest={userActions.toggleInterest}
                          isInterested={userInterests.some(i => i.targetId === profile.id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
            )}
            <div ref={helpersLoaderRef} className="h-10 flex justify-center items-center">
                {isLoadingHelpers && initialHelpersLoaded && helperProfilesList.length > 0 && <p>✨ กำลังโหลดเพิ่มเติม...</p>}
            </div>
            {initialHelpersLoaded && !hasMoreHelpers && enrichedHelperProfilesList.length > 0 && (
                <p className="text-center text-sm font-sans text-neutral-medium py-4">🎉 คุณดูครบทุกโปรไฟล์แล้ว</p>
            )}
          </section>
        </div>
      </div>);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case View.Home: return renderHome();
      case View.FindJobs: return <FindJobsComponent />;
      case View.FindHelpers: return <FindHelpersComponent />;
      case View.Webboard: return <WebboardPage navigateTo={navigateTo} />;
      case View.Blog: return <BlogPage navigateTo={navigateTo} />;
      case View.Login: return <LoginForm onLogin={onLogin} navigateTo={navigateTo} onForgotPassword={() => setIsForgotPasswordModalOpen(true)} />;
      case View.Register: return <RegistrationForm onRegister={onRegister} />;
      case View.MyRoom: return <MyRoomPage navigateTo={navigateTo} />;
      case View.AboutUs: return <AboutUsPage />;
      case View.Safety: return <SafetyPage />;
      case View.AdminDashboard: return <AdminDashboard />;
      case View.PasswordReset: return <PasswordResetPage />;
      case View.PostJob: return <PostJobForm onPostJob={jobActions.postJob} onCancel={onCancelEditOrPost} jobToEdit={editingItemType === 'job' ? itemToEdit as Job : null} />;
      case View.OfferHelp: return <OfferHelpForm onOfferHelp={helperActions.offerHelp} onCancel={onCancelEditOrPost} profileToEdit={editingItemType === 'profile' ? itemToEdit as HelperProfile : null} />;
      case View.PublicProfile: return viewingProfileInfo ? <PublicProfilePage userId={viewingProfileInfo.userId} navigateTo={navigateTo} /> : <div>Loading Profile...</div>;
      case View.ArticleEditor: return <ArticleEditor onSubmit={blogActions.addOrUpdateBlogPost} onCancel={onCancelEditOrPost} initialData={editingItemType === 'blogPost' ? itemToEdit as BlogPost : undefined} isEditing={!!itemToEdit && editingItemType === 'blogPost'} currentUser={currentUser} />;
      default: return <div><h1>Page Not Found</h1></div>;
    }
  };

  if (isLoadingAuth || isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen bg-neutral-light">
        <p className="text-xl font-semibold text-primary-dark animate-pulse">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className={`font-serif bg-neutral-light min-h-screen flex flex-col`}>
      <SiteLockOverlay isLocked={isSiteLocked} />
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        onConfirm={onConfirmDeletion}
        title={confirmModalTitle}
        message={confirmModalMessage}
      />
      <VouchModal
        isOpen={!!vouchModalData}
        onClose={() => setVouchModalData(null)}
        userToVouch={vouchModalData?.userToVouch}
        onVouchSubmit={userActions.submitVouch}
      />
      <VouchesListModal
        isOpen={!!vouchListModalData}
        onClose={() => setVouchListModalData(null)}
        userToList={vouchListModalData?.userToList}
        onReportClick={(vouch) => setReportVouchModalData({ vouchToReport: vouch })}
      />
      <ReportVouchModal
        isOpen={!!reportVouchModalData}
        onClose={() => setReportVouchModalData(null)}
        vouchToReport={reportVouchModalData?.vouchToReport}
        onReportSubmit={userActions.reportVouch}
      />
      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
        onPasswordResetRequest={authActions.requestPasswordReset}
      />
      <FeedbackForm
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSubmit={userActions.submitFeedback}
      />

      {renderHeader()}
      {renderMobileMenu()}
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderCurrentView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {renderFooter()}

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
    </div>
  );
};

export default App;
