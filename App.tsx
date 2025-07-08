import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuthActions } from './hooks/useAuthActions.ts';
import { useJobs } from './hooks/useJobs.ts';
import { useHelpers } from './hooks/useHelpers.ts';
import { useUser } from './hooks/useUser.ts';
import { useWebboard } from './hooks/useWebboard.ts';
import { useBlog } from './hooks/useBlog.ts';
import { useAdmin } from './hooks/useAdmin.ts';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { User, Job, HelperProfile, WebboardPost, BlogComment, UserLevel, SiteConfig, FilterableCategory, Interest, Vouch, BlogPost, RegistrationDataType } from './types/types.ts';
import { View, UserRole, JobCategory, JobSubCategory, Province } from './types/types.ts';
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
import { UserProfilePage } from './components/UserProfilePage.tsx';
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
import { AnimatePresence, motion } from "framer-motion";
import { isDateInPast } from './utils/dateUtils.ts';
import { getRecentSearches, addRecentSearch } from './utils/localStorageUtils.ts';

const JOBS_PAGE_SIZE = 9;
const HELPERS_PAGE_SIZE = 9;

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
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [recentJobSearches, setRecentJobSearches] = useState<string[]>([]);
  const [selectedJobSubCategoryFilter, setSelectedJobSubCategoryFilter] = useState<JobSubCategory | 'all'>('all');
  const [selectedJobProvinceFilter, setSelectedJobProvinceFilter] = useState<Province | 'all'>('all');
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
    if (result.success && result.user) {
      navigateTo(View.Home);
    }
    return result.success;
  };

  const onRegister = async (userData: RegistrationDataType): Promise<boolean> => {
    const success = await authActions.register(userData);
    if (success) {
      navigateTo(View.Home);
    }
    return success;
  };

  const onLogout = async () => {
    await authActions.logout();
    navigateTo(View.Home);
  };

  const renderHeader = () => (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <button onClick={() => navigateTo(View.Home)} className="text-2xl font-bold text-primary-dark">
              HAJOBJA
            </button>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <button onClick={() => navigateTo(View.FindJobs)} className="nav-pill">หาคน</button>
              <button onClick={() => navigateTo(View.FindHelpers)} className="nav-pill">หางาน</button>
              <button onClick={() => navigateTo(View.Webboard)} className="nav-pill">เว็บบอร์ด</button>
              <button onClick={() => navigateTo(View.Blog)} className="nav-pill">บทความ</button>
              {currentUser ? (
                <>
                  <button onClick={() => navigateTo(View.MyRoom)} className="nav-pill">ห้องของฉัน</button>
                  <button onClick={onLogout} className="nav-pill">ออกจากระบบ</button>
                </>
              ) : (
                <button onClick={() => navigateTo(View.Login)} className="nav-pill">เข้าสู่ระบบ</button>
              )}
            </div>
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700">
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );

  const renderFooter = () => (
    <footer className="bg-white">
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} HAJOBJA.COM. All rights reserved.</p>
          <div className="mt-4">
            <button onClick={() => navigateTo(View.AboutUs)} className="mx-2 hover:text-primary-dark">เกี่ยวกับเรา</button>
            <button onClick={() => navigateTo(View.Safety)} className="mx-2 hover:text-primary-dark">ความปลอดภัย</button>
            <button onClick={() => setIsFeedbackModalOpen(true)} className="mx-2 hover:text-primary-dark">ติชม/เสนอแนะ</button>
          </div>
        </div>
      </div>
    </footer>
  );

  const viewMap: { [key in View]?: React.ReactNode } = {
    [View.Home]: <div><h1>Home Page</h1></div>,
    [View.FindJobs]: <div><h1>Find Jobs Page</h1></div>,
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
      {isForgotPasswordModalOpen && <ForgotPasswordModal onClose={() => setIsForgotPasswordModalOpen(false)} />}
    </div>
  );
};

export default App;
