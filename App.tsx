import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuthActions } from './hooks/useAuthActions.ts';
import { useJobs } from './hooks/useJobs.ts';
import { useHelpers } from './hooks/useHelpers.ts';
import { useUser } from './hooks/useUser.ts';
import { useWebboard } from './hooks/useWebboard.ts';
import { useBlog } from './hooks/useBlog.ts';
import { useAdmin } from './hooks/useAdmin.ts';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { User, Job, HelperProfile, WebboardPost, BlogComment, Vouch, BlogPost, RegistrationDataType } from './types/types.ts';
import { View, UserRole, JobCategory, JobSubCategory, Province, FilterableCategory } from './types/types.ts';
import type { AdminItem as AdminItemType } from './components/AdminDashboard.tsx';
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
import { getJobsPaginated } from './services/jobService.ts';
import { getHelperProfilesPaginated } from './services/helperProfileService.ts';
import { AnimatePresence, motion, type Variants, type Transition } from "framer-motion";
import { isDateInPast } from './utils/dateUtils.ts';
import { getRecentSearches, addRecentSearch } from './utils/localStorageUtils.ts';

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

  const { currentUser, isLoadingAuth, setCurrentUser } = useAuth();
  const {
    users: allUsers,
    allBlogPosts,
    allWebboardPostsForAdmin,
    allJobsForAdmin,
    allHelperProfilesForAdmin,
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

  const onLogin = async (loginIdentifier: string, passwordAttempt: string): Promise<boolean> => {
    const result = await authActions.login(loginIdentifier, passwordAttempt);
    if (result.success) navigateTo(View.Home);
    return result.success;
  };

  const onRegister = async (userData: RegistrationDataType): Promise<boolean> => {
    const success = await authActions.register(userData);
    if (success) navigateTo(View.Home);
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

  const onEditOwnJobFromFindView = (jobId: string) => {
    const jobToEdit = allJobsForAdmin.find(j => j.id === jobId);
    if (jobToEdit && currentUser && jobToEdit.userId === currentUser.id) {
        setItemToEdit(jobToEdit); setEditingItemType('job'); setSourceViewForForm(View.FindJobs); navigateTo(View.PostJob);
    } else alert("ไม่สามารถแก้ไขงานนี้ได้");
  };

  const renderHeader = () => (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <button onClick={() => navigateTo(View.Home)} className="text-2xl font-bold text-primary-dark">HAJOBJA</button>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <button onClick={() => navigateTo(View.FindJobs)} className={`nav-pill ${currentView === View.FindJobs ? 'active' : ''}`}>หาคน</button>
              <button onClick={() => navigateTo(View.FindHelpers)} className={`nav-pill ${currentView === View.FindHelpers ? 'active' : ''}`}>หางาน</button>
              <button onClick={() => navigateTo(View.Webboard)} className={`nav-pill ${currentView === View.Webboard ? 'active' : ''}`}>เว็บบอร์ด</button>
              <button onClick={() => navigateTo(View.Blog)} className={`nav-pill ${currentView === View.Blog ? 'active' : ''}`}>บทความ</button>
              {currentUser ? (
                <>
                  <button onClick={() => navigateTo(View.MyRoom)} className={`nav-pill ${currentView === View.MyRoom ? 'active' : ''}`}>ห้องของฉัน</button>
                  <button onClick={onLogout} className="nav-pill">ออกจากระบบ</button>
                </>
              ) : (
                <button onClick={() => navigateTo(View.Login)} className={`nav-pill ${currentView === View.Login ? 'active' : ''}`}>เข้าสู่ระบบ</button>
              )}
            </div>
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none">
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );

  const renderFooter = () => (
    <footer className="bg-white border-t border-gray-200">
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} HAJOBJA.COM. All rights reserved.</p>
          <div className="mt-4 space-x-4">
            <button onClick={() => navigateTo(View.AboutUs)} className="hover:text-primary-dark">เกี่ยวกับเรา</button>
            <button onClick={() => navigateTo(View.Safety)} className="hover:text-primary-dark">ความปลอดภัย</button>
            <button onClick={() => setIsFeedbackModalOpen(true)} className="hover:text-primary-dark">ติชม/เสนอแนะ</button>
          </div>
        </div>
      </div>
    </footer>
  );

  const renderHome = () => (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-primary-dark mb-4">ยินดีต้อนรับสู่ HAJOBJA</h1>
      <p className="text-lg text-neutral-dark mb-8">แพลตฟอร์มสำหรับหางานและหาคนทำงานที่ใช่สำหรับคุณ</p>
      <div className="space-x-4">
        <Button onClick={() => navigateTo(View.FindJobs)} variant="primary" size="lg">หาคนทำงาน</Button>
        <Button onClick={() => navigateTo(View.FindHelpers)} variant="secondary" size="lg">หางาน</Button>
      </div>
    </div>
  );

  const renderFindJobs = () => {
    const [jobsList, setJobsList] = useState<Job[]>([]);
    const [lastVisibleJob, setLastVisibleJob] = useState<DocumentSnapshot | null>(null);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const [hasMoreJobs, setHasMoreJobs] = useState(true);
    const jobsLoaderRef = useRef<HTMLDivElement>(null);

    const loadJobs = useCallback(async (isInitialLoad = false) => {
        if (isLoadingJobs || (!isInitialLoad && !hasMoreJobs)) return;
        setIsLoadingJobs(true);
        try {
            const result = await getJobsPaginated(JOBS_PAGE_SIZE, isInitialLoad ? null : lastVisibleJob, selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter);
            setJobsList(prev => isInitialLoad ? result.items : [...prev, ...result.items]);
            setLastVisibleJob(result.lastVisibleDoc);
            setHasMoreJobs(result.items.length === JOBS_PAGE_SIZE);
        } finally {
            setIsLoadingJobs(false);
        }
    }, [isLoadingJobs, hasMoreJobs, lastVisibleJob, selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter]);

    useEffect(() => { loadJobs(true); }, [selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter]);

    return (
      <div className="p-4 sm:p-6">
        <div className="text-center mb-6 lg:mb-8">
          <h2 className="text-3xl font-sans font-semibold text-primary-dark mb-3">📢 ประกาศงาน</h2>
          <p className="text-md font-serif text-neutral-gray mb-6 max-w-xl mx-auto font-normal">เวลาและทักษะตรงกับงานไหน ติดต่อเลย!</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
          <aside className="lg:col-span-3 mb-8 lg:mb-0">
            <div className="sticky top-24 space-y-6 p-4 bg-white rounded-xl shadow-lg border border-primary-light">
              <CategoryFilterBar categories={Object.values(JobCategory)} selectedCategory={selectedJobCategoryFilter} onSelectCategory={(cat) => setSelectedJobCategoryFilter(cat)} />
              <SearchInputWithRecent searchTerm={jobSearchTerm} onSearchTermChange={setJobSearchTerm} placeholder="ค้นหางาน..." recentSearches={recentJobSearches} onRecentSearchSelect={setJobSearchTerm} />
              {currentUser && (<Button onClick={() => navigateTo(View.PostJob)} variant="primary" className="w-full">ลงประกาศงาน</Button>)}
            </div>
          </aside>
          <section className="lg:col-span-9">
            {jobsList.length === 0 && !isLoadingJobs ? (
              <div className="text-center py-10"><p>ไม่พบงานที่ตรงกับเกณฑ์การค้นหาของคุณ</p></div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" variants={listVariants} initial="hidden" animate="visible">
                {jobsList.map(job => (
                  <motion.div key={job.id} variants={itemVariants}>
                    <JobCard job={job} navigateTo={navigateTo} currentUser={currentUser} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={userActions.toggleInterest} isInterested={userInterests.some(i => i.targetId === job.id)} onEditJobFromFindView={onEditOwnJobFromFindView} />
                  </motion.div>
                ))}
              </motion.div>
            )}
            <div ref={jobsLoaderRef} className="h-10 flex justify-center items-center">{isLoadingJobs && <p>✨ กำลังโหลดเพิ่มเติม...</p>}</div>
          </section>
        </div>
      </div>
    );
  };
  
  const viewMap: { [key in View]?: React.ReactNode } = {
    [View.Home]: renderHome(),
    [View.FindJobs]: renderFindJobs(),
    [View.FindHelpers]: <div><h1>Find Helpers Page</h1></div>,
    [View.Webboard]: <WebboardPage navigateTo={navigateTo} />,
    [View.Blog]: <BlogPage navigateTo={navigateTo} />,
    [View.Login]: <LoginForm onLogin={onLogin} navigateTo={navigateTo} />,
    [View.Register]: <RegistrationForm onRegister={onRegister} />,
    [View.MyRoom]: <MyRoomPage navigateTo={navigateTo} />,
    [View.AboutUs]: <AboutUsPage />,
    [View.Safety]: <SafetyPage />,
    [View.AdminDashboard]: <AdminDashboard />,
    [View.PasswordReset]: <PasswordResetPage />,
    [View.PostJob]: <PostJobForm onPostJob={jobActions.postJob} onCancel={() => navigateTo(View.Home)} jobToEdit={editingItemType === 'job' ? itemToEdit as Job : null} />,
    [View.OfferHelp]: <OfferHelpForm onOfferHelp={helperActions.offerHelp} onCancel={() => navigateTo(View.Home)} profileToEdit={editingItemType === 'profile' ? itemToEdit as HelperProfile : null} />,
  };

  if (isLoadingAuth || isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen bg-neutral-light">
        <p className="text-xl font-semibold text-primary-dark animate-pulse">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="font-serif bg-neutral-light min-h-screen flex flex-col">
      {renderHeader()}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {viewMap[currentView] || <div><h1>Page Not Found</h1></div>}
          </motion.div>
        </AnimatePresence>
      </main>
      {renderFooter()}
      {isFeedbackModalOpen && <FeedbackForm onClose={() => setIsFeedbackModalOpen(false)} />}
    </div>
  );
};

export default App;
