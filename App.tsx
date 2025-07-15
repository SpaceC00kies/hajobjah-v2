

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthActions } from './hooks/useAuthActions.ts';
import { useJobs } from './hooks/useJobs.ts';
import { useHelpers } from './hooks/useHelpers.ts';
import { useUser } from './hooks/useUser.ts';
import { useWebboard } from './hooks/useWebboard.ts';
import { useBlog } from './hooks/useBlog.ts';
import { useAdmin } from './hooks/useAdmin.ts';
import type { User, Job, HelperProfile, WebboardPost, WebboardComment, Vouch, VouchReport, BlogPost, RegistrationDataType } from './types/types.ts';
import type { AdminItem as AdminItemType } from './components/AdminDashboard.tsx';
import { View, UserRole, ACTIVITY_BADGE_DETAILS } from './types/types.ts';
import { useAuth } from './context/AuthContext.tsx';
import { useData } from './context/DataContext.tsx';
import { PostJobForm } from './components/PostJobForm.tsx';
import { Button } from './components/Button.tsx';
import { OfferHelpForm } from './components/OfferHelpForm.tsx';
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
import { PasswordResetPage } from './components/PasswordResetPage.tsx';
import { VouchModal } from './components/VouchModal.tsx';
import { VouchesListModal } from './components/VouchesListModal.tsx';
import { ReportVouchModal } from './components/ReportVouchModal.tsx';
import { UserLevelBadge } from './components/UserLevelBadge.tsx';
import { AnimatePresence, motion } from "framer-motion";
import { getUserDisplayBadge } from './utils/userUtils.ts';
import { BlogArticlePage } from './components/BlogArticlePage.tsx';
import { getUserDocument } from './services/userService.ts';
import { FindJobsPage } from './components/FindJobsPage.tsx';
import { FindHelpersPage } from './components/FindHelpersPage.tsx';


// Animation Variants for the Mobile Menu
const menuBackdropVariants = {
  open: { opacity: 1, transition: { duration: 0.3 } },
  closed: { opacity: 0, transition: { duration: 0.3, delay: 0.2 } },
};

const menuPanelVariants = {
  open: { x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  closed: { x: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
};

const menuContentVariants = {
  open: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.2, duration: 0.4, ease: "easeOut" as const }
  },
  closed: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.2 }
  },
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
    allBlogPostsForAdmin,
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

    const getButtonClass = (viewTarget: View) => {
      const baseClass = 'nav-pill';
      const isActive = currentView === viewTarget;
      let specificClass = 'nav-pill-default';

      if (viewTarget === View.Login) { // Specifically for the logout button
          specificClass = 'nav-pill-logout';
      } else if ([View.AdminDashboard, View.MyRoom].includes(viewTarget)) {
          specificClass = 'nav-pill-special';
      }

      return `${baseClass} ${specificClass} ${isActive ? 'active' : ''}`;
    };

    const navItems = currentUser
      ? [
          ...(currentView !== View.Home ? [{ label: "หน้าแรก", emoji: "🏠", view: View.Home }] : []),
          ...((currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer) ? [{ label: "Admin", emoji: "🔐", view: View.AdminDashboard }] : []),
          { label: "ห้องของฉัน", emoji: "🛋️", view: View.MyRoom },
          { label: "ประกาศงาน", emoji: "📢", view: View.FindJobs },
          { label: "โปรไฟล์ผู้ช่วย", emoji: "👥", view: View.FindHelpers },
          { label: "บทความ", emoji: "📖", view: View.Blog },
          { label: "กระทู้พูดคุย", emoji: "💬", view: View.Webboard },
          { label: "ออกจากระบบ", emoji: "🔓", view: View.Login, action: onLogout },
        ]
      : [
          ...(currentView !== View.Home ? [{ label: "หน้าแรก", emoji: "🏠", view: View.Home }] : []),
          { label: "เข้าสู่ระบบ", emoji: "🔑", view: View.Login },
          { label: "ลงทะเบียน", emoji: "📝", view: View.Register },
          { label: "กระทู้พูดคุย", emoji: "💬", view: View.Webboard },
        ];

    const mobileItemWrapper = (item: any) => (
       <button
        onClick={() => (item.action ? item.action() : navigateTo(item.view))}
        className={`${getButtonClass(item.view)} w-full justify-start text-left py-3`}
      >
        <span className="inline-flex items-center gap-2.5">
          <span>{item.emoji}</span>
          <span>{item.label}</span>
        </span>
      </button>
    );

    const desktopItemWrapper = (item: any) => (
      <button
        onClick={() => (item.action ? item.action() : navigateTo(item.view))}
        className={getButtonClass(item.view)}
      >
        <span className="inline-flex items-center gap-1.5">
          <span>{item.emoji}</span>
          <span>{item.label}</span>
        </span>
      </button>
    );

    const mobileGreeting = currentUser && (
      <div
        className={`font-sans font-medium text-base mb-3 py-2 px-4 border-b border-primary-light w-full text-left text-primary-dark`}
      >
        สวัสดี, {currentUser.publicDisplayName}!
        <UserLevelBadge level={displayBadgeForProfile} size="sm" />
        {currentUser.activityBadge?.isActive && <UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="sm" />}
      </div>
    );

    if (isMobile) {
      return (
        <>
          {mobileGreeting}
          {navItems.map(item => (
            <React.Fragment key={item.label}>{mobileItemWrapper(item)}</React.Fragment>
          ))}
        </>
      );
    }

    return navItems.map(item => (
      <React.Fragment key={item.label}>{desktopItemWrapper(item)}</React.Fragment>
    ));
  };


  const MenuToggle = ({ toggle }: { toggle: () => void }) => {
    return (
      <button
        onClick={toggle}
        className="relative w-8 h-8 p-0 flex items-center justify-center rounded-full focus:outline-none hover:bg-primary-light/50 transition-colors"
        aria-label="Open menu"
      >
        <div className="space-y-1.5">
            <span className="block w-6 h-0.5 bg-primary-dark"></span>
            <span className="block w-6 h-0.5 bg-primary-dark"></span>
            <span className="block w-6 h-0.5 bg-primary-dark"></span>
        </div>
      </button>
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
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <div className="flex-shrink-0">
                <span
                onClick={() => { navigateTo(View.Home); setIsMobileMenuOpen(false); }}
                className="cursor-pointer font-sans font-bold text-lg sm:text-xl lg:text-2xl"
                style={{color: 'var(--primary-blue)'}}
                >
                HAJOBJA.COM
                </span>
            </div>
            {currentUser && (
                <div className="hidden lg:flex items-center gap-2 font-sans font-medium text-primary-dark whitespace-nowrap">
                    สวัสดี, {currentUser.publicDisplayName}!
                    {currentUser.activityBadge?.isActive && <UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="sm" />}
                </div>
            )}
          </div>

          <div>
            <nav className="hidden lg:flex items-center space-x-2">
                {renderNavLinks(false)}
            </nav>
            <div className="lg:hidden">
                <MenuToggle toggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
            </div>
          </div>
        </div>
      </header>
    );
  };
  
  const renderMobileMenu = () => (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <motion.div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          initial="closed"
          animate="open"
          exit="closed"
        >
          <motion.div
            key="backdrop"
            variants={menuBackdropVariants}
            className="fixed inset-0 bg-neutral-dark/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            key="menuPanel"
            variants={menuPanelVariants}
            className="fixed top-0 right-0 h-full w-4/5 max-w-xs bg-white shadow-xl z-50 overflow-y-auto"
          >
            <div className="flex justify-between items-center p-4 border-b border-primary-light">
                <h2 className="text-xl font-bold font-sans text-primary">เมนู</h2>
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 -mr-2 text-primary-dark"
                    aria-label="Close menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <motion.div
              className="flex flex-col items-start p-5 space-y-2"
              variants={menuContentVariants}
            >
              {renderNavLinks(true)}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );


  const renderHome = () => {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="container mx-auto flex flex-col items-center px-6 text-center py-12 sm:py-20">
          <h1 className="hero-title">✨ หาจ๊อบจ้า ✨</h1>
          <p className="hero-subtitle">แพลตฟอร์มที่อยู่เคียงข้างคนขยัน</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div
              onClick={() => navigateTo(View.FindJobs)}
              className="home-card cursor-pointer"
            >
              <h3 className="card-section-title">ประกาศงาน</h3>
              <div className="space-y-4">
                 <button onClick={(e) => { e.stopPropagation(); navigateTo(View.FindJobs); }} className="btn-primary-home">
                  <span className="flex items-center justify-center">
                    <span className="text-lg mr-2">📢</span>
                    <span>ดูประกาศงานทั้งหมด</span>
                  </span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); currentUser ? navigateTo(View.PostJob) : requestLoginForAction(View.PostJob); }} className="btn-secondary-home">
                  <span className="flex items-center justify-center">
                    <span className="text-lg mr-2">📝</span>
                    <span>ลงประกาศงาน</span>
                  </span>
                </button>
              </div>
            </div>

            <div
              onClick={() => navigateTo(View.FindHelpers)}
              className="home-card cursor-pointer"
            >
              <h3 className="card-section-title">โปรไฟล์ผู้ช่วยและบริการ</h3>
              <div className="space-y-4">
                 <button onClick={(e) => { e.stopPropagation(); navigateTo(View.FindHelpers); }} className="btn-primary-home">
                  <span className="flex items-center justify-center">
                    <span className="text-lg mr-2">👥</span>
                    <span>ดูโปรไฟล์ทั้งหมด</span>
                  </span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); currentUser ? navigateTo(View.OfferHelp) : requestLoginForAction(View.OfferHelp); }} className="btn-secondary-home">
                  <span className="flex items-center justify-center">
                    <span className="text-lg mr-2">🙋</span>
                    <span>สร้างโปรไฟล์</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (isLoadingAuth) return null;
    return (
      <footer className="w-full bg-white text-center text-sm text-neutral-dark p-6 border-t border-primary-light mt-auto font-serif">
        <div className="mb-4 flex items-center justify-center font-sans">
            <button onClick={() => navigateTo(View.AboutUs)} className="hover:text-primary transition-colors">เกี่ยวกับเรา</button>
            <span className="mx-2">·</span>
            <button onClick={() => navigateTo(View.Safety)} className="hover:text-primary transition-colors">ความปลอดภัย</button>
            <span className="mx-2">·</span>
            <button onClick={() => setIsFeedbackModalOpen(true)} className="hover:text-primary transition-colors">Feedback</button>
        </div>
        <div className="text-xs">
            <p>© 2025 HAJOBJA.COM - All rights reserved.</p>
            <div className="flex items-center justify-center mt-1">
                <span className="font-sans">Created by&nbsp;</span>
                <a 
                    href="https://www.facebook.com/bluecathousestudio/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-primary hover:underline font-medium font-sans"
                >
                    <img 
                        alt="Blue Cat House Logo" 
                        src="https://i.postimg.cc/wxrcQPHV/449834128-122096458958403535-3024125841409891827-n-1-removebg-preview.png" 
                        className="h-4 w-auto mr-1"
                    />
                    <span>Blue Cat House</span>
                </a>
            </div>
        </div>
      </footer>
    );
  };

  const handleEditItem = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost' | 'blogPost', fromView?: View, originatingTab?: MyRoomActiveTab) => {
    let dataToEdit = null;
    switch (itemType) {
      case 'job':
        dataToEdit = allJobsForAdmin.find(item => item.id === itemId);
        break;
      case 'profile':
        dataToEdit = allHelperProfilesForAdmin.find(item => item.id === itemId);
        break;
      case 'webboardPost':
        dataToEdit = allWebboardPostsForAdmin.find(item => item.id === itemId);
        break;
      case 'blogPost':
        dataToEdit = allBlogPosts.find(item => item.id === itemId) || allBlogPostsForAdmin.find(item => item.id === itemId);
        break;
    }
    
    if (dataToEdit) {
      setItemToEdit(dataToEdit);
      setEditingItemType(itemType);
      
      if(originatingTab) setEditOriginMyRoomTab(originatingTab);

      let targetView: View;
      switch (itemType) {
        case 'job':
          targetView = View.PostJob;
          break;
        case 'profile':
          targetView = View.OfferHelp;
          break;
        case 'webboardPost':
          targetView = View.Webboard; // Webboard handles its own edit state
          setSelectedPostId(itemId); // Trigger webboard's edit mode
          break;
        case 'blogPost':
          targetView = View.ArticleEditor;
          break;
      }
      setSourceViewForForm(fromView || currentView);
      navigateTo(targetView);
    }
  };

  const handleDeleteItem = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
    let action;
    let message;
    switch (itemType) {
      case 'job':
        action = () => jobActions.deleteJob(itemId);
        message = 'คุณแน่ใจหรือไม่ว่าต้องการลบประกาศงานนี้? การกระทำนี้ไม่สามารถย้อนกลับได้';
        break;
      case 'profile':
        action = () => helperActions.deleteHelperProfile(itemId);
        message = 'คุณแน่ใจหรือไม่ว่าต้องการลบโปรไฟล์ผู้ช่วยนี้? การกระทำนี้ไม่สามารถย้อนกลับได้';
        break;
      case 'webboardPost':
        action = () => webboardActions.deleteWebboardPost(itemId);
        message = 'คุณแน่ใจหรือไม่ว่าต้องการลบกระทู้นี้? การกระทำนี้ไม่สามารถย้อนกลับได้';
        break;
      default:
        return;
    }
    openConfirmModal('ยืนยันการลบ', message, action);
  };

  const handleToggleHiredStatus = (itemId: string, itemType: 'job' | 'profile') => {
    if (itemType === 'job') jobActions.toggleHiredJob(itemId);
    else helperActions.onToggleUnavailableHelperProfileForUserOrAdmin(itemId);
  };
  
  const handleSharePost = async (postId: string, postTitle: string) => {
      const shareUrl = `${window.location.origin}${window.location.pathname}?view=WEBBOARD&post=${postId}`;
      try {
          if (navigator.share) {
              await navigator.share({
                  title: `HAJOBJA.COM: ${postTitle}`,
                  text: `อ่านกระทู้ "${postTitle}" ได้ที่นี่`,
                  url: shareUrl,
              });
          } else {
              await navigator.clipboard.writeText(shareUrl);
              setCopiedLinkNotification('คัดลอกลิงก์แล้ว!');
              if(copiedNotificationTimerRef.current) clearTimeout(copiedNotificationTimerRef.current);
              copiedNotificationTimerRef.current = window.setTimeout(() => setCopiedLinkNotification(null), 2000);
          }
      } catch (error) {
          console.error('Error sharing:', error);
          await navigator.clipboard.writeText(shareUrl);
          setCopiedLinkNotification('คัดลอกลิงก์แล้ว!');
          if(copiedNotificationTimerRef.current) clearTimeout(copiedNotificationTimerRef.current);
          copiedNotificationTimerRef.current = window.setTimeout(() => setCopiedLinkNotification(null), 2000);
      }
  };
  
  const handleStartEditItem = (item: AdminItemType) => {
    if (item.itemType === 'job' || item.itemType === 'profile' || item.itemType === 'webboardPost' || item.itemType === 'blogPost') {
        handleEditItem(item.id, item.itemType, View.AdminDashboard);
    }
  };

  const handleNavigateToPublicProfile = (profileInfo: { userId: string, helperProfileId?: string }) => {
    setViewingProfileInfo(profileInfo);
    setSourceViewForPublicProfile(currentView);
    navigateTo(View.PublicProfile);
  };
  
  const handleVouchForUser = (userToVouch: User) => {
    if(!currentUser) { requestLoginForAction(View.PublicProfile); return; }
    if(currentUser.id === userToVouch.id) { alert("คุณไม่สามารถรับรองตัวเองได้"); return; }
    setVouchModalData({ userToVouch });
  }

  const handleShowVouches = (userToList: User) => {
    setVouchListModalData({ userToList });
  };
  
  const handleReportVouch = (vouch: Vouch) => {
    if(!currentUser) { requestLoginForAction(View.PublicProfile); return; }
    setVouchListModalData(null); // Close the list modal first
    setReportVouchModalData({ vouchToReport: vouch });
  }

  const renderContent = () => {
    if (isLoadingAuth || isLoadingData) {
      return (
        <div className="flex flex-grow justify-center items-center p-10 font-sans text-xl text-neutral-dark">
          กำลังโหลด ✨
        </div>
      );
    }
    switch (currentView) {
      case View.Home: return renderHome();
      case View.PostJob: return <PostJobForm currentUser={currentUser!} onCancel={onCancelEditOrPost} initialData={editingItemType === 'job' ? itemToEdit as Job : undefined} isEditing={editingItemType === 'job'} allJobsForAdmin={allJobsForAdmin} navigateTo={navigateTo} sourceViewForForm={sourceViewForForm} />;
      case View.OfferHelp: return <OfferHelpForm currentUser={currentUser} onCancel={onCancelEditOrPost} initialData={editingItemType === 'profile' ? itemToEdit as HelperProfile : undefined} isEditing={editingItemType === 'profile'} />;
      case View.Register: return <RegistrationForm onRegister={onRegister} onSwitchToLogin={() => navigateTo(View.Login)} />;
      case View.Login: return <LoginForm onLogin={onLogin} onSwitchToRegister={() => navigateTo(View.Register)} onForgotPassword={() => setIsForgotPasswordModalOpen(true)} />;
      case View.AdminDashboard: return currentUser && (currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer) ? <AdminDashboard onStartEditItem={handleStartEditItem} jobs={allJobsForAdmin} helperProfiles={allHelperProfilesForAdmin} users={allUsers} interactions={interactions} webboardPosts={allWebboardPostsForAdmin} webboardComments={webboardComments} vouchReports={vouchReports} allBlogPostsForAdmin={allBlogPostsForAdmin} currentUser={currentUser} isSiteLocked={isSiteLocked} getAuthorDisplayName={getAuthorDisplayName} getUserDisplayBadge={(user) => getUserDisplayBadge(user, allWebboardPostsForAdmin, webboardComments)} getUserDocument={getUserDocument}/> : <div>Permission Denied</div>;
      case View.AboutUs: return <AboutUsPage />;
      case View.Safety: return <SafetyPage />;
      case View.PasswordReset: return <PasswordResetPage navigateTo={navigateTo} />;
      case View.MyRoom:
          if (!currentUser) { navigateTo(View.Login); return null; }
          const myRoomActions = {
              editItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost', originatingTab: MyRoomActiveTab) => handleEditItem(itemId, itemType, View.MyRoom, originatingTab),
              deleteItem: handleDeleteItem,
              toggleHiredStatus: handleToggleHiredStatus,
              editJobFromFindView: (jobId: string) => handleEditItem(jobId, 'job', View.FindJobs),
              editHelperProfileFromFindView: (profileId: string) => handleEditItem(profileId, 'profile', View.FindHelpers),
              logHelperContact: userActions.logContact,
          };
          return <MyRoomPage currentUser={currentUser} users={allUsers} allJobsForAdmin={allJobsForAdmin} allHelperProfilesForAdmin={allHelperProfilesForAdmin} allWebboardPostsForAdmin={allWebboardPostsForAdmin} webboardComments={webboardComments} userInterests={userInterests} navigateTo={navigateTo} actions={myRoomActions} onNavigateToPublicProfile={handleNavigateToPublicProfile} initialTab={myRoomInitialTabOverride} onInitialTabProcessed={() => setMyRoomInitialTabOverride(null)} getAuthorDisplayName={getAuthorDisplayName} requestLoginForAction={requestLoginForAction} />;
      case View.PublicProfile: {
        if (!viewingProfileInfo) { navigateTo(sourceViewForPublicProfile); return null; }
        const user = allUsers.find(u => u.id === viewingProfileInfo.userId);
        const helperProfile = viewingProfileInfo.helperProfileId ? allHelperProfilesForAdmin.find(p => p.id === viewingProfileInfo.helperProfileId) : undefined;
        if (!user) { navigateTo(sourceViewForPublicProfile); return null; }
        return <PublicProfilePage user={user} helperProfile={helperProfile} onBack={() => navigateTo(sourceViewForPublicProfile)} currentUser={currentUser} onVouchForUser={handleVouchForUser} onShowVouches={handleShowVouches} />;
      }
      case View.Webboard:
          return <WebboardPage currentUser={currentUser} users={allUsers} comments={webboardComments} onAddOrUpdatePost={(data, id) => webboardActions.addOrUpdateWebboardPost(data, id).then(newPostId => { if(id) setSelectedPostId(id); else if (newPostId) setSelectedPostId(newPostId); })} onAddComment={webboardActions.addWebboardComment} onToggleLike={webboardActions.toggleWebboardPostLike} onSavePost={userActions.saveWebboardPost} onSharePost={handleSharePost} onDeletePost={(id) => openConfirmModal('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ว่าต้องการลบกระทู้นี้?', () => { webboardActions.deleteWebboardPost(id); setSelectedPostId(null); })} onPinPost={adminActions.pinWebboardPost} onEditPost={(post) => handleEditItem(post.id, 'webboardPost', View.Webboard)} onDeleteComment={(id) => openConfirmModal('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ว่าต้องการลบคอมเมนต์นี้?', () => webboardActions.deleteWebboardComment(id))} onUpdateComment={webboardActions.updateWebboardComment} selectedPostId={selectedPostId} setSelectedPostId={setSelectedPostId} navigateTo={navigateTo} editingPost={editingItemType === 'webboardPost' ? itemToEdit as WebboardPost : undefined} onCancelEdit={() => { setItemToEdit(null); setEditingItemType(null); setSelectedPostId(null); }} getUserDisplayBadge={(user) => getUserDisplayBadge(user, allWebboardPostsForAdmin, webboardComments)} requestLoginForAction={requestLoginForAction} onNavigateToPublicProfile={(info) => handleNavigateToPublicProfile(info)} checkWebboardPostLimits={webboardActions.checkWebboardPostLimits} checkWebboardCommentLimits={webboardActions.checkWebboardCommentLimits} pageSize={20} getAuthorDisplayName={getAuthorDisplayName} />;
      case View.Blog:
        return <BlogPage posts={allBlogPosts.map(p => ({...p, author: allUsers.find(u => u.id === p.authorId)}))} onSelectPost={(slug) => { setSelectedBlogPostSlug(slug); navigateTo(View.Blog, { article: slug }); }} />;
      case View.ArticleEditor:
        return <ArticleEditor onCancel={() => navigateTo(View.AdminDashboard)} initialData={editingItemType === 'blogPost' ? itemToEdit as BlogPost : undefined} isEditing={!!(editingItemType === 'blogPost')} currentUser={currentUser!} />;
      case View.FindJobs:
        return <FindJobsPage navigateTo={navigateTo} onNavigateToPublicProfile={handleNavigateToPublicProfile} onEditJobFromFindView={(jobId) => handleEditItem(jobId, 'job', View.FindJobs)} currentUser={currentUser} requestLoginForAction={requestLoginForAction} getAuthorDisplayName={getAuthorDisplayName} />;
      case View.FindHelpers:
        return <FindHelpersPage navigateTo={navigateTo} onNavigateToPublicProfile={handleNavigateToPublicProfile} currentUser={currentUser} requestLoginForAction={requestLoginForAction} onEditProfileFromFindView={(profileId) => handleEditItem(profileId, 'profile', View.FindHelpers)} getAuthorDisplayName={getAuthorDisplayName} />;
      default:
        return renderHome();
    }
  };

  if(selectedBlogPostSlug) {
      const post = allBlogPosts.find(p => p.slug === selectedBlogPostSlug);
      if(post) {
        return <BlogArticlePage post={{...post, author: allUsers.find(u => u.id === post.authorId)}} onBack={() => { setSelectedBlogPostSlug(null); navigateTo(View.Blog); }} comments={[]} currentUser={currentUser} canEditOrDelete={webboardActions.canEditOrDelete} />;
      }
  }
  const mainContentClass = currentView === View.Home ? 'hero-section flex-grow flex items-center' : 'container mx-auto p-4 sm:p-6 lg:p-8 flex-grow';


  return (
    <div className="flex flex-col min-h-screen bg-neutral-light font-serif">
      <SiteLockOverlay isLocked={isSiteLocked} />
      {renderHeader()}
      {renderMobileMenu()}
      <main className={mainContentClass}>
        {renderContent()}
      </main>
      {renderFooter()}
      <AnimatePresence>
        {copiedLinkNotification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-primary-dark text-white text-sm py-2 px-4 rounded-full shadow-lg z-50"
          >
            {copiedLinkNotification}
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        onConfirm={onConfirmDeletion}
        title={confirmModalTitle}
        message={confirmModalMessage}
      />
      <FeedbackForm
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        currentUserEmail={currentUser?.email}
      />
      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
        onSendResetEmail={authActions.sendPasswordResetEmail}
      />
      {vouchModalData && (
        <VouchModal
          isOpen={!!vouchModalData}
          onClose={() => setVouchModalData(null)}
          userToVouch={vouchModalData.userToVouch}
          currentUser={currentUser!}
        />
      )}
      {vouchListModalData && (
        <VouchesListModal
          isOpen={!!vouchListModalData}
          onClose={() => setVouchListModalData(null)}
          userToList={vouchListModalData.userToList}
          navigateToPublicProfile={(userId) => handleNavigateToPublicProfile({ userId })}
          onReportVouch={handleReportVouch}
          currentUser={currentUser}
        />
      )}
      {reportVouchModalData && (
        <ReportVouchModal
          isOpen={!!reportVouchModalData}
          onClose={() => setReportVouchModalData(null)}
          vouchToReport={reportVouchModalData.vouchToReport}
        />
      )}
    </div>
  );
};

export default App;