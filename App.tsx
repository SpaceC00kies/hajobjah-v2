
import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthActions } from './hooks/useAuthActions.ts';
import { useUser } from './hooks/useUser.ts';
import { useJobs } from './hooks/useJobs.ts';
import { useHelpers } from './hooks/useHelpers.ts';
import { useBlog } from './hooks/useBlog.ts';
import { useWebboard } from './hooks/useWebboard.ts';
import type { User, Vouch, RegistrationDataType, SearchResultItem, WebboardPost, WebboardComment } from './types/types.ts';
import { View, UserRole } from './types/types.ts';
import { useAuth } from './context/AuthContext.tsx';
import { useData } from './context/DataContext.tsx';
import { useUsers } from './hooks/useUsers.ts';
import { SiteLockOverlay } from './components/SiteLockOverlay.tsx';
import { universalSearchService } from './services/searchService.ts';
import { logFirebaseError } from './firebase/logging.ts';
import { Header } from './components/Header.tsx';
import { Banner } from './components/Banner.tsx';
import { FastLottie } from './components/FastLottie.tsx';
import './utils/lottiePreloader.ts';
import { HomePage } from './components/HomePage.tsx';

// Lazy load page components
const PostJobForm = React.lazy(() => import('./components/PostJobForm.tsx').then(module => ({ default: module.PostJobForm })));
const OfferHelpForm = React.lazy(() => import('./components/OfferHelpForm.tsx').then(module => ({ default: module.OfferHelpForm })));
const RegistrationForm = React.lazy(() => import('./components/RegistrationForm.tsx').then(module => ({ default: module.RegistrationForm })));
const LoginForm = React.lazy(() => import('./components/LoginForm.tsx').then(module => ({ default: module.LoginForm })));
const ForgotPasswordModal = React.lazy(() => import('./components/ForgotPasswordModal.tsx').then(module => ({ default: module.ForgotPasswordModal })));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard.tsx').then(module => ({ default: module.AdminDashboard })));
const ConfirmModal = React.lazy(() => import('./components/ConfirmModal.tsx').then(module => ({ default: module.ConfirmModal })));
const MyRoomPage = React.lazy(() => import('./components/MyRoomPage.tsx').then(module => ({ default: module.MyRoomPage })));
const AboutUsPage = React.lazy(() => import('./components/AboutUsPage.tsx').then(module => ({ default: module.AboutUsPage })));
const PublicProfilePage = React.lazy(() => import('./components/PublicProfilePage.tsx').then(module => ({ default: module.PublicProfilePage })));
const SafetyPage = React.lazy(() => import('./components/SafetyPage.tsx').then(module => ({ default: module.SafetyPage })));
const FeedbackForm = React.lazy(() => import('./components/FeedbackForm.tsx').then(module => ({ default: module.FeedbackForm })));
const WebboardPage = React.lazy(() => import('./components/WebboardPage.tsx').then(module => ({ default: module.WebboardPage })));
const BlogPage = React.lazy(() => import('./components/BlogPage.tsx').then(module => ({ default: module.BlogPage })));
const ArticleEditor = React.lazy(() => import('./components/ArticleEditor.tsx').then(module => ({ default: module.ArticleEditor })));
const PasswordResetPage = React.lazy(() => import('./components/PasswordResetPage.tsx').then(module => ({ default: module.PasswordResetPage })));
const VouchModal = React.lazy(() => import('./components/VouchModal.tsx').then(module => ({ default: module.VouchModal })));
const VouchesListModal = React.lazy(() => import('./components/VouchesListModal.tsx').then(module => ({ default: module.VouchesListModal })));
const ReportVouchModal = React.lazy(() => import('./components/ReportVouchModal.tsx').then(module => ({ default: module.ReportVouchModal })));
const BlogArticlePage = React.lazy(() => import('./components/BlogArticlePage.tsx').then(module => ({ default: module.BlogArticlePage })));
const FindJobsPage = React.lazy(() => import('./components/FindJobsPage.tsx').then(module => ({ default: module.FindJobsPage })));
const FindHelpersPage = React.lazy(() => import('./components/FindHelpersPage.tsx').then(module => ({ default: module.FindHelpersPage })));
const SearchResultsPage = React.lazy(() => import('./components/SearchResultsPage.tsx').then(module => ({ default: module.SearchResultsPage })));
const LocationModal = React.lazy(() => import('./components/LocationModal.tsx').then(module => ({ default: module.LocationModal })));
import { Footer } from './components/Footer.tsx';
import { BlogHeader } from './components/BlogHeader.tsx';
import { enableDevelopmentAudit } from './utils/mobileAccessibilityUtils.ts';
import { AccessibilityTester } from './components/AccessibilityTester.tsx';
import { initDevelopmentAudit } from './utils/wcagAuditRunner.ts';

const AuthRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser || !(currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const PublicProfilePageWrapper = () => {
  const { userId, helperProfileId, jobId } = useParams<{ userId: string; helperProfileId?: string; jobId?: string }>();
  const navigate = useNavigate();

  if (!userId) return <Navigate to="/" replace />;

  return (
    <PublicProfilePage
      onBack={() => navigate(-1)}
      userId={userId}
      helperProfileId={helperProfileId}
      jobId={jobId}
    />
  );
};


const App: React.FC = () => {
  const authActions = useAuthActions();

  const { currentUser, isLoadingAuth } = useAuth();
  const { allBlogPosts, isLoadingBlog } = useBlog();
  const { users, isLoadingUsers } = useUsers();
  const { isLoading: isDataContextLoading, userInterests } = useData();
  const { allWebboardPostsForAdmin, webboardComments } = useWebboard();
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = useLocation();

  // Reset scroll to top on every navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Enable accessibility auditing in development
  useEffect(() => {
    enableDevelopmentAudit();
    initDevelopmentAudit();

    // Run WCAG 2.2 validation tests in development
    if (process.env.NODE_ENV === 'development') {
      import('./utils/wcagValidationTest.ts').then(({ logValidationResults }) => {
        setTimeout(logValidationResults, 1000);
      });
    }
  }, []);

  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const [vouchModalData, setVouchModalData] = useState<{ userToVouch: User } | null>(null);
  const [vouchListModalData, setVouchListModalData] = useState<{ userToList: User } | null>(null);
  const [reportVouchModalData, setReportVouchModalData] = useState<{ vouchToReport: Vouch; mode: 'report' | 'withdraw' } | null>(null);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [homeProvince, setHomeProvince] = useState<string>('all');
  const [searchProvince, setSearchProvince] = useState<string>('all');
  const [bannerState, setBannerState] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showBanner = (message: string, type: 'success' | 'error' = 'success') => {
    setBannerState({ message, type });
  };

  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = users.find(u => u && u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  }, [users]);

  const onLogin = async (loginIdentifier: string, passwordAttempt: string): Promise<boolean> => {
    const result = await authActions.login(loginIdentifier, passwordAttempt);
    if (result.success) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
    return result.success;
  };

  const onRegister = async (userData: RegistrationDataType): Promise<boolean> => {
    const success = await authActions.register(userData);
    if (success) {
      navigate('/', { replace: true });
    }
    return success;
  };

  const onLogout = async () => {
    await authActions.logout();
    navigate('/', { replace: true });
  };


  const handleSearch = async (searchParams: { query: string, province: string }) => {
    if (!currentUser) { navigate('/login', { state: { from: location, intent: 'search', ...searchParams } }); return; }
    setIsSearching(true); setSearchQuery(searchParams.query); setSearchProvince(searchParams.province); setSearchError(null);
    navigate('/search');
    try {
      const result = await universalSearchService(searchParams);
      setSearchResults(result.data.results);
    } catch (err: any) {
      logFirebaseError("Universal search failed:", err);
      setSearchError(err.message || "An unexpected error occurred during search.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleVouchForUser = (userToVouch: User) => {
    if (!currentUser) { navigate('/login', { state: { from: location } }); return; }
    if (currentUser.id === userToVouch.id) { alert("คุณไม่สามารถรับรองตัวเองได้"); return; }
    setVouchModalData({ userToVouch });
  };

  const handleShowVouches = (userToList: User) => setVouchListModalData({ userToList });
  const handleReportVouch = (vouch: Vouch, mode: 'report' | 'withdraw') => {
    if (!currentUser) { navigate('/login', { state: { from: location } }); return; }
    setVouchListModalData(null);
    setReportVouchModalData({ vouchToReport: vouch, mode });
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-light">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 sm:w-32 sm:h-32">
            <FastLottie
              src="https://lottie.host/dea64b7c-31e7-4c7a-8b2d-c34914e1ed05/dozIYy35G2.lottie"
              className="w-full h-full"
              title="Loading blue cat animation"
              priority="high"
              fallbackEmoji="🐱"
            />
          </div>
          <p className="mt-2 text-primary-dark font-sans text-sm">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const isBlogPage = location.pathname === '/blog' || location.pathname.startsWith('/blog/');

  const mainContentClass = location.pathname === '/'
    ? 'flex-grow flex items-center'
    : isBlogPage
      ? 'flex-grow'
      : 'container mx-auto p-4 sm:p-6 lg:p-8 flex-grow';
  const hideFooter = location.pathname === '/reset-password' || isBlogPage;

  return (
    <>
      {/* Blog Header - Outside flex container for proper fixed positioning */}
      {isBlogPage && <BlogHeader currentUser={currentUser} />}

      <div className={`flex flex-col min-h-screen ${isBlogPage ? '' : 'bg-neutral-light font-serif'}`}>
        <SiteLockOverlay />
        <Banner
          message={bannerState?.message || ''}
          type={bannerState?.type}
          onClose={() => setBannerState(null)}
        />
        {!isBlogPage && (
          <Header
            currentUser={currentUser}
            onLogout={onLogout}
            getAuthorDisplayName={getAuthorDisplayName}
            allWebboardPostsForAdmin={allWebboardPostsForAdmin}
            webboardComments={webboardComments}
            users={users}
          />
        )}
        <main className={mainContentClass}>
          <Suspense fallback={<div className="text-center p-10">กำลังโหลด...</div>}>
            <Routes>
              <Route path="/" element={<HomePage onSearch={handleSearch} isSearching={isSearching} selectedProvince={homeProvince} onProvinceChange={setHomeProvince} onOpenLocationModal={() => setIsLocationModalOpen(true)} navigate={navigate} />} />
              <Route path="/post-job" element={<AuthRoute><PostJobForm onCancel={() => navigate(-1)} isEditing={false} /></AuthRoute>} />
              <Route path="/job/edit/:jobId" element={<AuthRoute><PostJobForm onCancel={() => navigate(-1)} isEditing={true} /></AuthRoute>} />
              <Route path="/find-jobs" element={<AuthRoute><FindJobsPage /></AuthRoute>} />
              <Route path="/find-helpers" element={<AuthRoute><FindHelpersPage /></AuthRoute>} />
              <Route path="/post-helper" element={<AuthRoute><OfferHelpForm isEditing={false} /></AuthRoute>} />
              <Route path="/my-room/:activeTab?" element={<AuthRoute><MyRoomPage showBanner={showBanner} /></AuthRoute>} />
              <Route path="/helper/edit/:profileId" element={<AuthRoute><OfferHelpForm isEditing={true} /></AuthRoute>} />
              <Route path="/profile/:userId/:helperProfileId?" element={<PublicProfilePageWrapper />} />
              <Route path="/profile/:userId/job/:jobId" element={<PublicProfilePageWrapper />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/safety" element={<SafetyPage />} />
              <Route path="/reset-password" element={<PasswordResetPage navigate={navigate} />} />
              <Route path="/register" element={<RegistrationForm onRegister={onRegister} onSwitchToLogin={() => navigate('/login')} />} />
              <Route path="/login" element={<LoginForm onLogin={onLogin} onSwitchToRegister={() => navigate('/register')} onForgotPassword={() => setIsForgotPasswordModalOpen(true)} />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/blog" element={<BlogPage posts={allBlogPosts.map(p => ({ ...p, author: users.find(u => u.id === p.authorId) }))} onSelectPost={(slug) => navigate(`/blog/${slug}`)} />} />
              <Route path="/blog/:articleSlug" element={<BlogArticlePage />} />
              <Route path="/article/create" element={<AdminRoute><ArticleEditor onCancel={() => navigate('/admin')} isEditing={false} /></AdminRoute>} />
              <Route path="/article/edit/:postId" element={<AdminRoute><ArticleEditor onCancel={() => navigate('/admin')} isEditing={true} /></AdminRoute>} />
              <Route path="/search" element={<AuthRoute><SearchResultsPage
                searchQuery={searchQuery}
                searchResults={searchResults}
                isLoading={isSearching}
                searchError={searchError}
                onGoBack={() => { setHomeProvince(searchProvince); navigate('/'); }}
                initialProvince={searchProvince}
                currentUser={currentUser}
                users={users}
                userInterests={userInterests}
                getAuthorDisplayName={getAuthorDisplayName}
              /></AuthRoute>} />
              {/* Webboard routes temporarily disabled */}
              {/* <Route path="/webboard" element={<AuthRoute><WebboardPage /></AuthRoute>} />
            <Route path="/webboard/post/:postId/:action?" element={<AuthRoute><WebboardPage /></AuthRoute>} /> */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        {!hideFooter && <Footer onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)} />}
      </div>
      <Suspense>
        {isFeedbackModalOpen && <FeedbackForm isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} currentUserEmail={currentUser?.email} />}
        {isForgotPasswordModalOpen && <ForgotPasswordModal isOpen={isForgotPasswordModalOpen} onClose={() => setIsForgotPasswordModalOpen(false)} onSendResetEmail={authActions.sendPasswordResetEmail} />}
        {vouchModalData && <VouchModal isOpen={!!vouchModalData} onClose={() => setVouchModalData(null)} userToVouch={vouchModalData.userToVouch} currentUser={currentUser!} />}
        {vouchListModalData && <VouchesListModal isOpen={!!vouchListModalData} onClose={() => setVouchListModalData(null)} userToList={vouchListModalData.userToList} navigateToPublicProfile={(userId) => navigate(`/profile/${userId}`)} onReportVouch={handleReportVouch} currentUser={currentUser} />}
        {reportVouchModalData && <ReportVouchModal isOpen={!!reportVouchModalData} onClose={() => setReportVouchModalData(null)} vouchToReport={reportVouchModalData.vouchToReport} mode={reportVouchModalData.mode} />}
        {isLocationModalOpen && <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} onSelectProvince={(province) => setHomeProvince(province)} currentProvince={homeProvince} />}
      </Suspense>

      {/* WCAG 2.2 Accessibility Testing Tools - Development Only */}
      <AccessibilityTester enabled={process.env.NODE_ENV === 'development'} />
    </>
  );
};

export default App;
