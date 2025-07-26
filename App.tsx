
import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { useAuthActions } from './hooks/useAuthActions.ts';
import { useUser } from './hooks/useUser.ts';
import { useJobs } from './hooks/useJobs.ts';
import { useHelpers } from './hooks/useHelpers.ts';
import { useBlog } from './hooks/useBlog.ts';
import { useWebboard } from './hooks/useWebboard.ts';
import type { User, Vouch, RegistrationDataType, SearchResultItem } from './types/types.ts';
import { View, UserRole } from './types/types.ts';
import { useAuth } from './context/AuthContext.tsx';
import { useData } from './context/DataContext.tsx';
import { useUsers } from './hooks/useUsers.ts';
import { SiteLockOverlay } from './components/SiteLockOverlay.tsx';
import { universalSearchService } from './services/searchService.ts';
import { logFirebaseError } from './firebase/logging.ts';
import { Header } from './components/Header.tsx';

// Lazy load page components
const HomePage = lazy(() => import('./components/HomePage.tsx').then(module => ({ default: module.HomePage })));
const PostJobForm = lazy(() => import('./components/PostJobForm.tsx').then(module => ({ default: module.PostJobForm })));
const OfferHelpForm = lazy(() => import('./components/OfferHelpForm.tsx').then(module => ({ default: module.OfferHelpForm })));
const RegistrationForm = lazy(() => import('./components/RegistrationForm.tsx').then(module => ({ default: module.RegistrationForm })));
const LoginForm = lazy(() => import('./components/LoginForm.tsx').then(module => ({ default: module.LoginForm })));
const ForgotPasswordModal = lazy(() => import('./components/ForgotPasswordModal.tsx').then(module => ({ default: module.ForgotPasswordModal })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx').then(module => ({ default: module.AdminDashboard })));
const ConfirmModal = lazy(() => import('./components/ConfirmModal.tsx').then(module => ({ default: module.ConfirmModal })));
const MyRoomPage = lazy(() => import('./components/MyRoomPage.tsx').then(module => ({ default: module.MyRoomPage })));
const AboutUsPage = lazy(() => import('./components/AboutUsPage.tsx').then(module => ({ default: module.AboutUsPage })));
const PublicProfilePage = lazy(() => import('./components/PublicProfilePage.tsx').then(module => ({ default: module.PublicProfilePage })));
const SafetyPage = lazy(() => import('./components/SafetyPage.tsx').then(module => ({ default: module.SafetyPage })));
const FeedbackForm = lazy(() => import('./components/FeedbackForm.tsx').then(module => ({ default: module.FeedbackForm })));
const WebboardPage = lazy(() => import('./components/WebboardPage.tsx').then(module => ({ default: module.WebboardPage })));
const BlogPage = lazy(() => import('./components/BlogPage.tsx').then(module => ({ default: module.BlogPage })));
const ArticleEditor = lazy(() => import('./components/ArticleEditor.tsx').then(module => ({ default: module.ArticleEditor })));
const PasswordResetPage = lazy(() => import('./components/PasswordResetPage.tsx').then(module => ({ default: module.PasswordResetPage })));
const VouchModal = lazy(() => import('./components/VouchModal.tsx').then(module => ({ default: module.VouchModal })));
const VouchesListModal = lazy(() => import('./components/VouchesListModal.tsx').then(module => ({ default: module.VouchesListModal })));
const ReportVouchModal = lazy(() => import('./components/ReportVouchModal.tsx').then(module => ({ default: module.ReportVouchModal })));
const BlogArticlePage = lazy(() => import('./components/BlogArticlePage.tsx').then(module => ({ default: module.BlogArticlePage })));
const FindJobsPage = lazy(() => import('./components/FindJobsPage.tsx').then(module => ({ default: module.FindJobsPage })));
const FindHelpersPage = lazy(() => import('./components/FindHelpersPage.tsx').then(module => ({ default: module.FindHelpersPage })));
const SearchResultsPage = lazy(() => import('./components/SearchResultsPage.tsx').then(module => ({ default: module.SearchResultsPage })));
const LocationModal = lazy(() => import('./components/LocationModal.tsx').then(module => ({ default: module.LocationModal })));

const App: React.FC = () => {
  const authActions = useAuthActions();
  
  const { currentUser, isLoadingAuth } = useAuth();
  const { isLoadingInteractions, isLoadingVouchReports } = useData();
  const { users, isLoadingUsers } = useUsers();
  const { isLoadingJobs, allJobsForAdmin } = useJobs();
  const { isLoadingHelpers, allHelperProfilesForAdmin } = useHelpers();
  const { isLoadingBlog, allBlogPosts } = useBlog();
  const { isLoadingPosts, isLoadingComments, allWebboardPostsForAdmin, webboardComments } = useWebboard();
  const userActions = useUser();
  const helperActions = useHelpers();

  const navigate = useNavigate();
  const location = useLocation();

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [vouchModalData, setVouchModalData] = useState<{ userToVouch: User } | null>(null);
  const [vouchListModalData, setVouchListModalData] = useState<{ userToList: User } | null>(null);
  const [reportVouchModalData, setReportVouchModalData] = useState<{ vouchToReport: Vouch } | null>(null);
  const [loginRedirectInfo, setLoginRedirectInfo] = useState<{ view: string; payload?: any } | null>(null);
  
  const [copiedLinkNotification, setCopiedLinkNotification] = useState<string | null>(null);
  const copiedNotificationTimerRef = useRef<number | null>(null);
  
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [homeProvince, setHomeProvince] = useState<string>('all');
  const [searchProvince, setSearchProvince] = useState<string>('all');

  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = users.find(u => u && u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  }, [users]);
  
  const onNavigateToPublicProfile = useCallback((profileInfo: { userId: string; helperProfileId?: string }) => {
    if (profileInfo.helperProfileId) {
        navigate(`/profile/${profileInfo.userId}/${profileInfo.helperProfileId}`);
    } else {
        navigate(`/profile/${profileInfo.userId}`);
    }
  }, [navigate]);

  const onEditJobFromFindView = useCallback((jobId: string) => {
    navigate(`/job/edit/${jobId}`, { state: { from: '/search' } });
  }, [navigate]);

  const onEditProfileFromFindView = useCallback((profileId: string) => {
    navigate(`/profile/edit/${profileId}`, { state: { from: '/search' } });
  }, [navigate]);
  
  const requestLoginForAction = (originalPath: string, originalPayload?: any) => {
    if (!currentUser) {
      setLoginRedirectInfo({ view: originalPath, payload: originalPayload });
      navigate('/login');
    }
  };

  const onLogin = async (loginIdentifier: string, passwordAttempt: string): Promise<boolean> => {
    const result = await authActions.login(loginIdentifier, passwordAttempt);
    if (result.success) {
      if (loginRedirectInfo) {
        navigate(loginRedirectInfo.view, { state: loginRedirectInfo.payload });
        setLoginRedirectInfo(null);
      } else {
        navigate('/');
      }
    }
    return result.success;
  };

  const onRegister = async (userData: RegistrationDataType): Promise<boolean> => {
    const success = await authActions.register(userData);
    if (success) {
      if (loginRedirectInfo) {
        navigate(loginRedirectInfo.view, { state: loginRedirectInfo.payload });
        setLoginRedirectInfo(null);
      } else {
        navigate('/');
      }
    }
    return success;
  };

  const onLogout = async () => {
    await authActions.logout();
    navigate('/');
  };

  const handleSearch = async (searchParams: { query: string, province: string }) => {
    if (!currentUser) { requestLoginForAction('/search', { intent: 'search', ...searchParams }); return; }
    setIsSearching(true); setSearchQuery(searchParams.query); setSearchProvince(searchParams.province); setSearchError(null);
    navigate('/search');
    try {
      const result = await universalSearchService(searchParams);
      setSearchResults(result.data.results);
    } catch (err: any) {
      console.error("Universal search failed:", err);
      setSearchError(err.message || "An unexpected error occurred during search.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleVouchForUser = (userToVouch: User) => {
    if (!currentUser) { requestLoginForAction(`/profile/${userToVouch.id}`); return; }
    if (currentUser.id === userToVouch.id) { alert("คุณไม่สามารถรับรองตัวเองได้"); return; }
    setVouchModalData({ userToVouch });
  };

  const handleShowVouches = (userToList: User) => setVouchListModalData({ userToList });
  const handleReportVouch = (vouch: Vouch) => {
    if (!currentUser) { requestLoginForAction(location.pathname); return; }
    setVouchListModalData(null);
    setReportVouchModalData({ vouchToReport: vouch });
  };
  
  if (isLoadingAuth || isLoadingUsers || isLoadingJobs || isLoadingHelpers || isLoadingBlog || isLoadingPosts || isLoadingComments || isLoadingInteractions || isLoadingVouchReports) {
    return <div className="flex flex-grow justify-center items-center p-10 font-sans text-xl text-neutral-dark">กำลังโหลด ✨</div>;
  }
  
  const mainContentClass = location.pathname === '/' ? 'hero-section flex-grow flex items-center' : 'container mx-auto p-4 sm:p-6 lg:p-8 flex-grow';

  // Wrapper Components
  const AuthRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    if (!currentUser) {
      requestLoginForAction(location.pathname, location.state);
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    if (!currentUser || !(currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer)) {
      return <Navigate to="/" replace />;
    }
    return children;
  };
  
  const PublicProfilePageWrapper = () => {
    const { userId, helperProfileId } = useParams<{ userId: string; helperProfileId?: string }>();
    if (!userId) return <Navigate to="/" replace />;
    return (
        <PublicProfilePage 
            onBack={() => navigate(-1)} 
            onVouchForUser={handleVouchForUser} 
            onShowVouches={handleShowVouches}
            userId={userId} 
            helperProfileId={helperProfileId} 
        />
    );
  };
  
  const onSelectPost = (slug: string) => {
    navigate(`/blog/${slug}`);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-neutral-light font-serif">
      <SiteLockOverlay />
      <Header 
        currentUser={currentUser} 
        onLogout={onLogout} 
        allWebboardPostsForAdmin={allWebboardPostsForAdmin}
        webboardComments={webboardComments}
        users={users}
      />
      <main className={mainContentClass}>
        <Suspense fallback={<div className="text-center p-10">กำลังโหลด...</div>}>
          <Routes>
            <Route path="/" element={<HomePage onSearch={handleSearch} isSearching={isSearching} selectedProvince={homeProvince} onProvinceChange={setHomeProvince} onOpenLocationModal={() => setIsLocationModalOpen(true)} navigate={navigate} />} />
            <Route path="/post-job" element={<AuthRoute><PostJobForm onCancel={() => navigate(-1)} isEditing={false} sourceViewForForm={location.state?.from} /></AuthRoute>} />
            <Route path="/job/edit/:jobId" element={<AuthRoute><PostJobForm onCancel={() => navigate(location.state?.from || '/find-jobs')} isEditing={true} sourceViewForForm={location.state?.from as View | null} /></AuthRoute>} />
            <Route path="/find-jobs" element={<AuthRoute><FindJobsPage /></AuthRoute>} />
            <Route path="/offer-help" element={<AuthRoute><OfferHelpForm onCancel={() => navigate(-1)} isEditing={false} /></AuthRoute>} />
            <Route path="/profile/edit/:profileId" element={<AuthRoute><OfferHelpForm onCancel={() => navigate(location.state?.from || '/find-helpers')} isEditing={true} /></AuthRoute>} />
            <Route path="/find-helpers" element={<AuthRoute><FindHelpersPage /></AuthRoute>} />
            <Route path="/register" element={<RegistrationForm onRegister={onRegister} onSwitchToLogin={() => navigate('/login')} />} />
            <Route path="/login" element={<LoginForm onLogin={onLogin} onSwitchToRegister={() => navigate('/register')} onForgotPassword={() => setIsForgotPasswordModalOpen(true)} />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/my-room" element={<AuthRoute><MyRoomPage onVouchForUser={handleVouchForUser} /></AuthRoute>} />
            <Route path="/profile/:userId/:helperProfileId?" element={<PublicProfilePageWrapper />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/safety" element={<SafetyPage />} />
            <Route path="/reset-password" element={<PasswordResetPage navigate={navigate} />} />
            <Route path="/blog" element={<BlogPage posts={allBlogPosts.map(p => ({...p, author: users.find(u => u.id === p.authorId)}))} onSelectPost={onSelectPost} />} />
            <Route path="/blog/:articleSlug" element={<BlogArticlePage onVouchForUser={handleVouchForUser} />} />
            <Route path="/article/create" element={<AdminRoute><ArticleEditor onCancel={() => navigate('/admin')} isEditing={false} /></AdminRoute>} />
            <Route path="/article/edit/:postId" element={<AdminRoute><ArticleEditor onCancel={() => navigate('/admin')} isEditing={true} /></AdminRoute>} />
            <Route path="/search" element={<AuthRoute><SearchResultsPage searchQuery={searchQuery} searchResults={searchResults} isLoading={isSearching} searchError={searchError} onGoBack={() => {setHomeProvince(searchProvince); navigate('/')}} initialProvince={searchProvince} currentUser={currentUser} users={users} userInterests={userInterests} getAuthorDisplayName={getAuthorDisplayName} navigate={navigate} onNavigateToPublicProfile={onNavigateToPublicProfile} requestLoginForAction={requestLoginForAction} onEditJobFromFindView={onEditJobFromFindView} onEditProfileFromFindView={onEditProfileFromFindView} onLogHelperContact={userActions.logContact} onBumpProfile={helperActions.onBumpProfile} onToggleInterest={userActions.toggleInterest} /></AuthRoute>} />
            <Route path="/webboard" element={<AuthRoute><WebboardPage /></AuthRoute>} />
            <Route path="/webboard/post/:postId" element={<AuthRoute><WebboardPage /></AuthRoute>} />
            <Route path="/webboard/post/:postId/edit" element={<AdminRoute><WebboardPage /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="w-full bg-white text-center text-sm text-neutral-dark p-6 border-t border-primary-light mt-auto font-serif">
        <div className="mb-4 flex items-center justify-center font-sans">
            <button onClick={() => navigate('/about')} className="hover:text-primary transition-colors">เกี่ยวกับเรา</button>
            <span className="mx-2">·</span>
            <button onClick={() => navigate('/safety')} className="hover:text-primary transition-colors">ความปลอดภัย</button>
            <span className="mx-2">·</span>
            <button onClick={() => setIsFeedbackModalOpen(true)} className="hover:text-primary transition-colors">Feedback</button>
        </div>
        <div className="text-xs">
            <p>© 2025 HAJOBJA.COM - All rights reserved.</p>
        </div>
      </footer>
      <Suspense>
        {isConfirmModalOpen && <ConfirmModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={() => { onConfirmAction && onConfirmAction(); setIsConfirmModalOpen(false); }} title={confirmModalTitle} message={confirmModalMessage} />}
        {isFeedbackModalOpen && <FeedbackForm isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} currentUserEmail={currentUser?.email} />}
        {isForgotPasswordModalOpen && <ForgotPasswordModal isOpen={isForgotPasswordModalOpen} onClose={() => setIsForgotPasswordModalOpen(false)} onSendResetEmail={authActions.sendPasswordResetEmail} />}
        {vouchModalData && <VouchModal isOpen={!!vouchModalData} onClose={() => setVouchModalData(null)} userToVouch={vouchModalData.userToVouch} currentUser={currentUser!} />}
        {vouchListModalData && <VouchesListModal isOpen={!!vouchListModalData} onClose={() => setVouchListModalData(null)} userToList={vouchListModalData.userToList} navigateToPublicProfile={(userId) => navigate(`/profile/${userId}`)} onReportVouch={handleReportVouch} currentUser={currentUser} />}
        {reportVouchModalData && <ReportVouchModal isOpen={!!reportVouchModalData} onClose={() => setReportVouchModalData(null)} vouchToReport={reportVouchModalData.vouchToReport} />}
        {isLocationModalOpen && <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} onSelectProvince={(province) => setHomeProvince(province)} currentProvince={homeProvince} />}
      </Suspense>
    </div>
  );
};

export default App;
