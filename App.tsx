

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthActions } from './hooks/useAuthActions.ts';
import { useJobs } from './hooks/useJobs.ts';
import { useHelpers } from './hooks/useHelpers.ts';
import { useUser } from './hooks/useUser.ts';
import { useWebboard } from './hooks/useWebboard.ts';
import { useBlog } from './hooks/useBlog.ts';
import { useAdmin } from './hooks/useAdmin.ts';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { User, Job, HelperProfile, EnrichedHelperProfile, WebboardPost, WebboardComment, EnrichedWebboardPost, EnrichedWebboardComment, Vouch, VouchReport, BlogPost, EnrichedBlogPost, BlogComment, RegistrationDataType, Interest } from './types/types.ts';
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
import { AnimatePresence, motion } from "framer-motion";
import { isDateInPast } from './utils/dateUtils.ts';
import { getRecentSearches, addRecentSearch } from './utils/localStorageUtils.ts';
import { getUserDisplayBadge } from './utils/userUtils.ts';
import { BlogArticlePage } from './components/BlogArticlePage.tsx';
import { getVouchesForUserService, getUserDocument } from './services/userService.ts';

const JOBS_PAGE_SIZE = 9;
const HELPERS_PAGE_SIZE = 9;

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { when: "beforeChildren", staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100, damping: 12 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
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
    allBlogPosts,
    allWebboardPostsForAdmin,
    webboardComments,
    allJobsForAdmin,
    allHelperProfilesForAdmin,
    userInterests,
    interactions,
    vouchReports,
    isLoadingData,
    userSavedPosts
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
    if (!allUsers || !Array.isArray(allUsers)) {
      return fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
    }
    const author = allUsers.find(u => u && u.id === userId);
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
    const displayBadgeForProfile = getUserDisplayBadge(currentUser, allWebboardPostsForAdmin, webboardComments);
    const commonButtonClass = isMobile
      ? 'w-full text-left justify-start py-3 px-4 text-base nav-pill'
      : 'flex-shrink-0 nav-pill';

    const navigateAndCloseMenu = (view: View, payload?: any) => {
      navigateTo(view, payload);
    };

    const navItemSpanClass = "inline-flex items-center gap-1.5";
    const activeClass = "active";

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
              <button onClick={() => navigateAndCloseMenu(View.Home)} className={commonButtonClass}>
                <span className={navItemSpanClass}><span>🏠</span><span>หน้าแรก</span></span>
              </button>
            )}
            
            {(currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer) && (
              <button onClick={() => navigateAndCloseMenu(View.AdminDashboard)} className={`${commonButtonClass} ${currentView === View.AdminDashboard ? activeClass : ''}`}>
                 <span className={navItemSpanClass}><span>🔐</span><span>Admin</span></span>
              </button>
            )}

            <button onClick={() => navigateTo(View.MyRoom)} className={`${commonButtonClass} ${currentView === View.MyRoom ? activeClass : ''}`}>
              <span className={navItemSpanClass}><span>🛋️</span><span>ห้องของฉัน</span></span>
            </button>
            
            <button onClick={() => navigateTo(View.FindJobs)} className={`${commonButtonClass} ${currentView === View.FindJobs ? activeClass : ''}`}>
              <span className={navItemSpanClass}><span>📢</span><span>ประกาศงาน</span></span>
            </button>
            
            <button onClick={() => navigateTo(View.FindHelpers)} className={`${commonButtonClass} ${currentView === View.FindHelpers ? activeClass : ''}`}>
              <span className={navItemSpanClass}><span>👥</span><span>โปรไฟล์ผู้ช่วย</span></span>
            </button>
            
            <button onClick={() => navigateTo(View.Blog)} className={`${commonButtonClass} ${currentView === View.Blog ? activeClass : ''}`}>
              <span className={navItemSpanClass}><span>📖</span><span>บทความ</span></span>
            </button>
            
            <button onClick={() => navigateTo(View.Webboard)} className={`${commonButtonClass} ${currentView === View.Webboard ? activeClass : ''}`}>
              <span className={navItemSpanClass}><span>💬</span><span>กระทู้พูดคุย</span></span>
            </button>
            
            <button
                onClick={onLogout}
                className={`${commonButtonClass} border-accent text-red-600 hover:bg-accent hover:text-white focus:ring-accent`}
              >
              <span className={navItemSpanClass}><span>🔓</span><span>ออกจากระบบ</span></span>
            </button>
          </>
        );
    } else {
        if (currentView === View.PasswordReset) {
            return null;
        }
        return (
            <>
              {currentView !== View.Home && (
                <button onClick={() => navigateAndCloseMenu(View.Home)} className={commonButtonClass}>
                   <span className={navItemSpanClass}><span>🏠</span><span>หน้าแรก</span></span>
                </button>
              )}
              
              <button onClick={() => navigateAndCloseMenu(View.Login)} className={`${commonButtonClass} ${currentView === View.Login ? activeClass : ''}`}>
                  <span className={navItemSpanClass}><span>🔑</span><span>เข้าสู่ระบบ</span></span>
              </button>
              <button onClick={() => navigateAndCloseMenu(View.Register)} className={`${commonButtonClass} ${currentView === View.Register ? activeClass : ''}`}>
                 <span className={navItemSpanClass}><span>📝</span><span>ลงทะเบียน</span></span>
              </button>

              <button onClick={() => navigateTo(View.Webboard)} className={`${commonButtonClass} ${currentView === View.Webboard ? activeClass : ''}`}>
                <span className={navItemSpanClass}><span>💬</span><span>กระทู้พูดคุย</span></span>
              </button>
            </>
        );
    }
  };

  const AnimatedHamburgerIcon = () => {
    const topVariants = {
      closed: { rotate: 0, y: 0 },
      open: { rotate: 45, y: 5.5 },
    };
    const middleVariants = {
      closed: { opacity: 1 },
      open: { opacity: 0 },
    };
    const bottomVariants = {
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
        <motion.div style={{ ...lineStyle, top: '5px' }} variants={topVariants} transition={{ duration: 0.3, ease: "easeInOut" as const }} />
        <motion.div style={{ ...lineStyle, top: '11px' }} variants={middleVariants} transition={{ duration: 0.15, ease: "easeInOut" as const }} />
        <motion.div style={{ ...lineStyle, top: '17px' }} variants={bottomVariants} transition={{ duration: 0.3, ease: "easeInOut" as const }} />
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
              className="cursor-pointer font-sans font-bold text-lg sm:text-xl lg:text-2xl"
            >
              HAJOBJA.COM
            </span>
          </div>
          <nav className="hidden lg:flex items-center space-x-2">
            {renderNavLinks(false)}
          </nav>
          <div className="lg:hidden">
            <AnimatedHamburgerIcon />
          </div>
        </div>
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="lg:hidden overflow-hidden"
            >
              <nav className="flex flex-col space-y-2 pt-4 border-t border-primary-light mt-4">
                {renderNavLinks(true)}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    );
  };

  const renderHome = () => {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="container mx-auto flex flex-col items-center px-6 text-center">
          <h1 className="hero-title">✨ หาจ๊อบจ้า ✨</h1>
          <p className="hero-subtitle">แพลตฟอร์มที่อยู่เคียงข้างคนขยัน</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div
              onClick={() => navigateTo(View.FindJobs)}
              className="home-card cursor-pointer"
            >
              <h3 className="card-section-title">ประกาศงาน</h3>
              <div className="space-y-3">
                <Button onClick={(e) => { e.stopPropagation(); navigateTo(View.FindJobs); }} variant="primary" size="lg" className="w-full">
                  <span className="text-base">🔎 ดูประกาศงานทั้งหมด</span>
                </Button>
                <Button onClick={(e) => { e.stopPropagation(); currentUser ? navigateTo(View.PostJob) : requestLoginForAction(View.PostJob); }} variant="secondary" size="lg" className="w-full">
                  <span className="text-base">✍️ ลงประกาศงาน</span>
                </Button>
              </div>
            </div>
            <div
              onClick={() => navigateTo(View.FindHelpers)}
              className="home-card cursor-pointer"
            >
              <h3 className="card-section-title">โปรไฟล์ผู้ช่วยและบริการ</h3>
              <div className="space-y-3">
                <Button onClick={(e) => { e.stopPropagation(); navigateTo(View.FindHelpers); }} variant="primary" size="lg" className="w-full">
                  <span className="text-base">👥 ดูโปรไฟล์ทั้งหมด</span>
                </Button>
                <Button onClick={(e) => { e.stopPropagation(); currentUser ? navigateTo(View.OfferHelp) : requestLoginForAction(View.OfferHelp); }} variant="secondary" size="lg" className="w-full">
                  <span className="text-base">🙋 สร้างโปรไฟล์</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderFindJobs = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [lastVisibleJob, setLastVisibleJob] = useState<DocumentSnapshot | null>(null);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const [hasMoreJobs, setHasMoreJobs] = useState(true);
    const [initialJobsLoaded, setInitialJobsLoaded] = useState(false);
    const loaderRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => { setRecentJobSearches(getRecentSearches('jobSearches')); }, []);

    const loadJobs = useCallback(async (isInitialLoad = false) => {
        if (isLoadingJobs || (!isInitialLoad && !hasMoreJobs)) return;
        setIsLoadingJobs(true);
        if (isInitialLoad) {
            setJobs([]);
            setLastVisibleJob(null);
            setHasMoreJobs(true);
            setInitialJobsLoaded(false);
        }
        try {
            const result = await getJobsPaginated(JOBS_PAGE_SIZE, isInitialLoad ? null : lastVisibleJob, selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter);
            setJobs(prev => isInitialLoad ? result.items : [...prev, ...result.items]);
            setLastVisibleJob(result.lastVisibleDoc);
            setHasMoreJobs(result.items.length === JOBS_PAGE_SIZE && result.lastVisibleDoc !== null);
            setInitialJobsLoaded(true);
        } catch (error) {
            console.error("Failed to load jobs:", error);
            setHasMoreJobs(false);
            setInitialJobsLoaded(true);
        } finally {
            setIsLoadingJobs(false);
        }
    }, [isLoadingJobs, hasMoreJobs, lastVisibleJob, selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter]);

    useEffect(() => { loadJobs(true); }, [selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting && hasMoreJobs && !isLoadingJobs && initialJobsLoaded) { loadJobs(); } },
            { threshold: 1.0 }
        );
        const currentLoaderRef = loaderRef.current;
        if (currentLoaderRef) observer.observe(currentLoaderRef);
        return () => { if (currentLoaderRef) observer.unobserve(currentLoaderRef); };
    }, [hasMoreJobs, isLoadingJobs, initialJobsLoaded, loadJobs]);
    
    const handleJobSearchTermChange = (term: string) => { setJobSearchTerm(term); addRecentSearch('jobSearches', term); };
    const handleRecentJobSearchSelect = (term: string) => { setJobSearchTerm(term); };

    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-sans font-bold text-center mb-6">📢 ประกาศงานทั้งหมด</h2>
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <SearchInputWithRecent searchTerm={jobSearchTerm} onSearchTermChange={handleJobSearchTermChange} placeholder="ค้นหางาน, สถานที่..." recentSearches={recentJobSearches} onRecentSearchSelect={handleRecentJobSearchSelect} />
          </div>
          <div className="w-full sm:w-56">
             <CategoryFilterBar categories={Object.values(JobCategory)} selectedCategory={selectedJobCategoryFilter} onSelectCategory={setSelectedJobCategoryFilter} />
          </div>
        </div>
        
        {isLoadingJobs && !initialJobsLoaded && <p className="text-center py-10">กำลังโหลด...</p>}
        {!isLoadingJobs && initialJobsLoaded && jobs.length === 0 && <p className="text-center py-10">ไม่พบประกาศงานที่ตรงกับเงื่อนไข</p>}

        <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => (
            <motion.div key={job.id} variants={itemVariants} exit="exit">
              <JobCard
                  job={job}
                  navigateTo={navigateTo}
                  currentUser={currentUser}
                  requestLoginForAction={requestLoginForAction}
                  getAuthorDisplayName={getAuthorDisplayName}
                  onToggleInterest={userActions.toggleInterest}
                  isInterested={userInterests.some(interest => interest.targetId === job.id)}
              />
            </motion.div>
          ))}
        </motion.div>

        <div ref={loaderRef} className="h-10 flex justify-center items-center">
          {isLoadingJobs && initialJobsLoaded && <p>กำลังโหลดเพิ่มเติม...</p>}
        </div>
      </div>
    );
  };
  
  const renderFindHelpers = () => {
    const [helperProfiles, setHelperProfiles] = useState<EnrichedHelperProfile[]>([]);
    const [lastVisibleHelper, setLastVisibleHelper] = useState<DocumentSnapshot | null>(null);
    const [isLoadingHelpers, setIsLoadingHelpers] = useState(false);
    const [hasMoreHelpers, setHasMoreHelpers] = useState(true);
    const [initialHelpersLoaded, setInitialHelpersLoaded] = useState(false);
    const loaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setRecentHelperSearches(getRecentSearches('helperSearches')); }, []);

    const loadHelpers = useCallback(async (isInitialLoad = false) => {
        if (isLoadingHelpers || (!isInitialLoad && !hasMoreHelpers)) return;
        setIsLoadingHelpers(true);
        if (isInitialLoad) {
            setHelperProfiles([]);
            setLastVisibleHelper(null);
            setHasMoreHelpers(true);
            setInitialHelpersLoaded(false);
        }
        try {
            const result = await getHelperProfilesPaginated(HELPERS_PAGE_SIZE, isInitialLoad ? null : lastVisibleHelper, selectedHelperCategoryFilter, helperSearchTerm, selectedHelperSubCategoryFilter, selectedHelperProvinceFilter);
            const enrichedProfiles = result.items.map(p => ({ ...p, userPhoto: allUsers.find(u => u.id === p.userId)?.photo, userAddress: allUsers.find(u => u.id === p.userId)?.address, verifiedExperienceBadge: p.adminVerifiedExperience ?? false, profileCompleteBadge: !!allUsers.find(u => u.id === p.userId)?.profileComplete, warningBadge: p.isSuspicious ?? false }));
            setHelperProfiles(prev => isInitialLoad ? enrichedProfiles : [...prev, ...enrichedProfiles]);
            setLastVisibleHelper(result.lastVisibleDoc);
            setHasMoreHelpers(result.items.length === HELPERS_PAGE_SIZE && result.lastVisibleDoc !== null);
            setInitialHelpersLoaded(true);
        } catch (error) {
            console.error("Failed to load helper profiles:", error);
            setHasMoreHelpers(false);
            setInitialHelpersLoaded(true);
        } finally {
            setIsLoadingHelpers(false);
        }
    }, [isLoadingHelpers, hasMoreHelpers, lastVisibleHelper, selectedHelperCategoryFilter, helperSearchTerm, selectedHelperSubCategoryFilter, selectedHelperProvinceFilter, allUsers]);

    useEffect(() => { loadHelpers(true); }, [selectedHelperCategoryFilter, helperSearchTerm, selectedHelperSubCategoryFilter, selectedHelperProvinceFilter]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting && hasMoreHelpers && !isLoadingHelpers && initialHelpersLoaded) { loadHelpers(); } },
            { threshold: 1.0 }
        );
        const currentLoaderRef = loaderRef.current;
        if (currentLoaderRef) observer.observe(currentLoaderRef);
        return () => { if (currentLoaderRef) observer.unobserve(currentLoaderRef); };
    }, [hasMoreHelpers, isLoadingHelpers, initialHelpersLoaded, loadHelpers]);
    
    const handleHelperSearchTermChange = (term: string) => { setHelperSearchTerm(term); addRecentSearch('helperSearches', term); };
    const handleRecentHelperSearchSelect = (term: string) => { setHelperSearchTerm(term); };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-3xl font-sans font-bold text-center mb-6">👥 โปรไฟล์ผู้ช่วยและบริการ</h2>
             <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex-1">
                <SearchInputWithRecent searchTerm={helperSearchTerm} onSearchTermChange={handleHelperSearchTermChange} placeholder="ค้นหาทักษะ, พื้นที่..." recentSearches={recentHelperSearches} onRecentSearchSelect={handleRecentHelperSearchSelect} />
              </div>
              <div className="w-full sm:w-56">
                 <CategoryFilterBar categories={Object.values(JobCategory)} selectedCategory={selectedHelperCategoryFilter} onSelectCategory={setSelectedHelperCategoryFilter} />
              </div>
            </div>
            
            {isLoadingHelpers && !initialHelpersLoaded && <p className="text-center py-10">กำลังโหลด...</p>}
            {!isLoadingHelpers && initialHelpersLoaded && helperProfiles.length === 0 && <p className="text-center py-10">ไม่พบโปรไฟล์ที่ตรงกับเงื่อนไข</p>}

             <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {helperProfiles.map(profile => (
                <motion.div key={profile.id} variants={itemVariants} exit="exit">
                  <HelperCard
                      profile={profile}
                      onNavigateToPublicProfile={(info) => navigateTo(View.PublicProfile, info)}
                      navigateTo={navigateTo}
                      onLogHelperContact={userActions.logContact}
                      currentUser={currentUser}
                      requestLoginForAction={requestLoginForAction}
                      onBumpProfile={helperActions.onBumpHelperProfile}
                      getAuthorDisplayName={getAuthorDisplayName}
                      onToggleInterest={userActions.toggleInterest}
                      isInterested={userInterests.some(interest => interest.targetId === profile.id)}
                  />
                </motion.div>
              ))}
            </motion.div>

            <div ref={loaderRef} className="h-10 flex justify-center items-center">
              {isLoadingHelpers && initialHelpersLoaded && <p>กำลังโหลดเพิ่มเติม...</p>}
            </div>
        </div>
    );
  };
  
  const renderCurrentView = () => {
    switch (currentView) {
      case View.PostJob:
        return currentUser ? <PostJobForm onCancel={onCancelEditOrPost} initialData={itemToEdit as Job} isEditing={!!itemToEdit} currentUser={currentUser} allJobsForAdmin={allJobsForAdmin} navigateTo={navigateTo} sourceViewForForm={sourceViewForForm} /> : <LoginForm onLogin={onLogin} onSwitchToRegister={() => navigateTo(View.Register)} onForgotPassword={() => setIsForgotPasswordModalOpen(true)} />;
      case View.FindJobs:
        return renderFindJobs();
      case View.OfferHelp:
        return currentUser ? <OfferHelpForm onCancel={onCancelEditOrPost} initialData={itemToEdit as HelperProfile} isEditing={!!itemToEdit} currentUser={currentUser} /> : <LoginForm onLogin={onLogin} onSwitchToRegister={() => navigateTo(View.Register)} onForgotPassword={() => setIsForgotPasswordModalOpen(true)} />;
      case View.FindHelpers:
        return renderFindHelpers();
      case View.Login:
        return <LoginForm onLogin={onLogin} onSwitchToRegister={() => navigateTo(View.Register)} onForgotPassword={() => setIsForgotPasswordModalOpen(true)} />;
      case View.Register:
        return <RegistrationForm onRegister={onRegister} onSwitchToLogin={() => navigateTo(View.Login)} />;
      case View.AdminDashboard:
        return <AdminDashboard jobs={allJobsForAdmin} helperProfiles={allHelperProfilesForAdmin} users={allUsers} interactions={interactions} webboardPosts={allWebboardPostsForAdmin} webboardComments={webboardComments} allBlogPostsForAdmin={allBlogPosts} vouchReports={vouchReports} onStartEditItem={(item) => {/* TODO */}} currentUser={currentUser} isSiteLocked={isSiteLocked} getAuthorDisplayName={getAuthorDisplayName} getUserDisplayBadge={(user) => getUserDisplayBadge(user, allWebboardPostsForAdmin, webboardComments)} getUserDocument={getUserDocument}/>;
      case View.MyRoom:
        if (!currentUser) return <LoginForm onLogin={onLogin} onSwitchToRegister={() => navigateTo(View.Register)} onForgotPassword={() => setIsForgotPasswordModalOpen(true)} />;
        return <MyRoomPage currentUser={currentUser} users={allUsers} allJobsForAdmin={allJobsForAdmin} allHelperProfilesForAdmin={allHelperProfilesForAdmin} allWebboardPostsForAdmin={allWebboardPostsForAdmin} webboardComments={webboardComments} userInterests={userInterests} navigateTo={navigateTo} actions={{editItem: (itemId, itemType, originatingTab) => {/* TODO */}, deleteItem: (itemId, itemType) => {/* TODO */}, toggleHiredStatus: (itemId, itemType) => {/* TODO */}, logHelperContact: userActions.logContact}} onNavigateToPublicProfile={(info) => navigateTo(View.PublicProfile, info)} getAuthorDisplayName={getAuthorDisplayName} requestLoginForAction={requestLoginForAction} initialTab={myRoomInitialTabOverride} onInitialTabProcessed={() => setMyRoomInitialTabOverride(null)} />;
      case View.AboutUs:
        return <AboutUsPage />;
      case View.PublicProfile:
        const userForProfile = allUsers.find(u => u.id === viewingProfileInfo?.userId);
        if (!userForProfile) return <div>ไม่พบผู้ใช้</div>;
        const helperProfileForPage = viewingProfileInfo?.helperProfileId ? allHelperProfilesForAdmin.find(p => p.id === viewingProfileInfo.helperProfileId) : allHelperProfilesForAdmin.find(p => p.userId === viewingProfileInfo?.userId);
        return <PublicProfilePage user={userForProfile} helperProfile={helperProfileForPage} onBack={() => navigateTo(sourceViewForPublicProfile || View.FindHelpers)} currentUser={currentUser} onVouchForUser={(userToVouch) => setVouchModalData({ userToVouch })} onShowVouches={(userToList) => setVouchListModalData({userToList})} />;
      case View.Safety:
        return <SafetyPage />;
      case View.Webboard:
        return <WebboardPage currentUser={currentUser} users={allUsers} comments={webboardComments} onAddOrUpdatePost={(data, id) => webboardActions.addOrUpdateWebboardPost(data, id)} onAddComment={(postId, text) => webboardActions.addWebboardComment(postId, text)} onToggleLike={webboardActions.toggleWebboardPostLike} onSavePost={userActions.saveWebboardPost} onSharePost={(id, title) => {/*TODO*/}} onDeletePost={webboardActions.deleteWebboardPost} onPinPost={adminActions.pinWebboardPost} onEditPost={(post) => {/*TODO*/}} onDeleteComment={webboardActions.deleteWebboardComment} onUpdateComment={webboardActions.updateWebboardComment} selectedPostId={selectedPostId} setSelectedPostId={setSelectedPostId} navigateTo={navigateTo} editingPost={itemToEdit as WebboardPost} onCancelEdit={onCancelEditOrPost} getUserDisplayBadge={(user) => getUserDisplayBadge(user, allWebboardPostsForAdmin, webboardComments)} requestLoginForAction={requestLoginForAction} onNavigateToPublicProfile={(info) => navigateTo(View.PublicProfile, info)} checkWebboardPostLimits={webboardActions.checkWebboardPostLimits} checkWebboardCommentLimits={webboardActions.checkWebboardCommentLimits} pageSize={10} getAuthorDisplayName={getAuthorDisplayName} />;
      case View.Blog:
        const enrichedBlogPosts = allBlogPosts.map(p => ({...p, author: allUsers.find(u => u.id === p.authorId)}));
        return <BlogPage posts={enrichedBlogPosts} onSelectPost={setSelectedBlogPostSlug} />;
      case View.ArticleEditor:
        return <ArticleEditor onCancel={onCancelEditOrPost} initialData={itemToEdit as BlogPost} isEditing={!!itemToEdit} currentUser={currentUser!} />;
      case View.PasswordReset:
        return <PasswordResetPage navigateTo={navigateTo} />;
      default:
        return renderHome();
    }
  };

  if (isLoadingAuth || isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen bg-primary-light">
        <div className="text-center">
          <div className="text-4xl animate-pulse">✨</div>
          <p className="text-primary-dark font-sans font-medium mt-2">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-light">
      <SiteLockOverlay isLocked={isSiteLocked} />
      {renderHeader()}
      <main className={`flex-grow flex flex-col ${currentView === View.Home ? 'hero-section justify-center' : 'container mx-auto p-4 sm:p-6 lg:p-8'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {renderCurrentView()}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="text-center py-6 bg-white border-t border-primary-light">
        <div className="flex justify-center gap-4 text-sm mb-2">
            <button onClick={() => navigateTo(View.AboutUs)} className="text-neutral-dark hover:text-primary">เกี่ยวกับเรา</button>
            <span className="text-neutral-DEFAULT">·</span>
            <button onClick={() => navigateTo(View.Safety)} className="text-neutral-dark hover:text-primary">ความปลอดภัย</button>
            <span className="text-neutral-DEFAULT">·</span>
            <button onClick={() => setIsFeedbackModalOpen(true)} className="text-neutral-dark hover:text-primary">Feedback</button>
        </div>
        <p className="text-xs text-neutral-medium">
          &copy; {new Date().getFullYear()} HAJOBJA.COM - All rights reserved.
        </p>
        <p className="text-xs text-neutral-medium mt-1">
          Created by <a href="https://www.bluecat.house" target="_blank" rel="noopener noreferrer" className="text-primary-dark hover:underline">Blue Cat House</a>
        </p>
      </footer>

      {/* Modals */}
      <ConfirmModal isOpen={isConfirmModalOpen} onClose={closeConfirmModal} onConfirm={onConfirmDeletion} title={confirmModalTitle} message={confirmModalMessage} />
      <FeedbackForm isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} currentUserEmail={currentUser?.email} />
      <ForgotPasswordModal isOpen={isForgotPasswordModalOpen} onClose={() => setIsForgotPasswordModalOpen(false)} onSendResetEmail={authActions.sendPasswordResetEmail} />
      {vouchModalData && currentUser && <VouchModal isOpen={!!vouchModalData} onClose={() => setVouchModalData(null)} userToVouch={vouchModalData.userToVouch} currentUser={currentUser} />}
      {vouchListModalData && <VouchesListModal isOpen={!!vouchListModalData} onClose={() => setVouchListModalData(null)} userToList={vouchListModalData.userToList} navigateToPublicProfile={(id) => navigateTo(View.PublicProfile, { userId: id })} onReportVouch={(vouch) => setReportVouchModalData({ vouchToReport: vouch })} currentUser={currentUser} />}
      {reportVouchModalData && <ReportVouchModal isOpen={!!reportVouchModalData} onClose={() => setReportVouchModalData(null)} vouchToReport={reportVouchModalData.vouchToReport} />}
    </div>
  );
};

export default App;