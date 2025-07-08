

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuthActions } from './hooks/useAuthActions';
import { useJobs } from './hooks/useJobs';
import { useHelpers } from './hooks/useHelpers';
import { useUser } from './hooks/useUser';
import { useWebboard } from './hooks/useWebboard';
import { useBlog } from './hooks/useBlog';
import { useAdmin } from './hooks/useAdmin';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { User, Job, HelperProfile, EnrichedHelperProfile, Interaction, WebboardPost, WebboardComment, UserLevel, EnrichedWebboardPost, EnrichedWebboardComment, SiteConfig, FilterableCategory, Interest, Vouch, VouchReport, BlogPost, EnrichedBlogPost, BlogComment, RegistrationDataType } from './types/types.ts';
import { View, UserRole, JobCategory, JobSubCategory, Province } from './types/types.ts';
import type { AdminItem as AdminItemType } from './components/AdminDashboard';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { PostJobForm } from './components/PostJobForm';
import { JobCard } from './components/JobCard';
import { Button } from './components/Button';
import { OfferHelpForm } from './components/OfferHelpForm';
import { HelperCard } from './components/HelperCard';
import { RegistrationForm } from './components/RegistrationForm';
import { LoginForm } from './components/LoginForm';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { AdminDashboard } from './components/AdminDashboard';
import { ConfirmModal } from './components/ConfirmModal';
import { MyRoomPage } from './components/MyRoomPage'; 
import type { ActiveTab as MyRoomActiveTab } from './components/MyRoomPage'; 
import { UserProfilePage } from './components/UserProfilePage';
import { AboutUsPage } from './components/AboutUsPage';
import { PublicProfilePage } from './components/PublicProfilePage';
import { SafetyPage } from './components/SafetyPage';
import { FeedbackForm } from './components/FeedbackForm';
import { WebboardPage } from './components/WebboardPage';
import { BlogPage } from './components/BlogPage'; 
import { BlogArticlePage } from './components/BlogArticlePage'; 
import { ArticleEditor } from './components/ArticleEditor'; 
import { UserLevelBadge } from './components/UserLevelBadge';
import { SiteLockOverlay } from './components/SiteLockOverlay';
import { CategoryFilterBar } from './components/CategoryFilterBar';
import { SearchInputWithRecent } from './components/SearchInputWithRecent';
import { PasswordResetPage } from './components/PasswordResetPage';
import { VouchModal } from './components/VouchModal'; 
import { VouchesListModal } from './components/VouchesListModal'; 
import { ReportVouchModal } from './components/ReportVouchModal'; 

import { getJobsPaginated } from './services/jobService'; 
import { getHelperProfilesPaginated } from './services/helperProfileService';
import { AnimatePresence, motion, type Variants, type Transition } from "framer-motion";

import { isDateInPast } from './utils/dateUtils';
import { getRecentSearches, addRecentSearch } from './utils/localStorageUtils';
import { checkProfileCompleteness, calculateUserLevel, getUserDisplayBadge } from './utils/userUtils';


const JOBS_PAGE_SIZE = 9;
const HELPERS_PAGE_SIZE = 9;
const WEBBOARD_PAGE_SIZE = 10;

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
  // --- Instantiate All Hooks ---
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

  // --- Core App State ---
  const [currentView, setCurrentView] = useState<View>(View.Home);
  const [isSiteLocked, setIsSiteLocked] = useState<boolean>(false);
  const [copiedLinkNotification, setCopiedLinkNotification] = useState<string | null>(null);
  const copiedNotificationTimerRef = useRef<number | null>(null);

  // --- Modal States ---
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

  // --- Authentication & User State ---
  const [loginRedirectInfo, setLoginRedirectInfo] = useState<{ view: View; payload?: any } | null>(null);
  
  // --- Data States (View-specific data remains here) ---
  const [blogComments, setBlogComments] = useState<BlogComment[]>([]);

  // --- Form & Navigation State ---
  const [itemToEdit, setItemToEdit] = useState<Job | HelperProfile | WebboardPost | BlogPost | null>(null);
  const [editingItemType, setEditingItemType] = useState<'job' | 'profile' | 'webboardPost' | 'blogPost' | null>(null);
  const [sourceViewForForm, setSourceViewForForm] = useState<View | null>(null);
  const [viewingProfileInfo, setViewingProfileInfo] = useState<{ userId: string; helperProfileId?: string } | null>(null);
  const [sourceViewForPublicProfile, setSourceViewForPublicProfile] = useState<View>(View.FindHelpers);
  const [editOriginMyRoomTab, setEditOriginMyRoomTab] = useState<MyRoomActiveTab | null>(null);
  const [myRoomInitialTabOverride, setMyRoomInitialTabOverride] = useState<MyRoomActiveTab | null>(null);

  // --- Filters and Search Terms ---
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
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    const viewFromUrl = params.get('view') as View | null;
    const idFromUrl = params.get('id');
    const slugFromUrl = params.get('slug');

    if (window.location.pathname.endsWith('/reset-password') && mode === 'resetPassword' && oobCode) {
      setCurrentView(View.PasswordReset);
      const newUrl = `${window.location.pathname}?mode=resetPassword&oobCode=${oobCode}`;
      window.history.replaceState({}, '', newUrl);
      return;
    }

    if (viewFromUrl && Object.values(View).includes(viewFromUrl)) {
      setCurrentView(viewFromUrl);
      if (viewFromUrl === View.Webboard && idFromUrl) setSelectedPostId(idFromUrl);
      else if (viewFromUrl === View.Blog && slugFromUrl) setSelectedBlogPostSlug(slugFromUrl);
      else if (viewFromUrl === View.PublicProfile && idFromUrl) {
        setViewingProfileInfo({ userId: idFromUrl });
        const referrerView = params.get('from') as View | null;
        if(referrerView && Object.values(View).includes(referrerView)) setSourceViewForPublicProfile(referrerView);
        else setSourceViewForPublicProfile(View.FindHelpers); 
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
    setRecentJobSearches(getRecentSearches('recentJobSearches'));
    setRecentHelperSearches(getRecentSearches('recentHelperSearches'));
    parseUrlAndSetInitialState(); 
    const handlePopState = () => parseUrlAndSetInitialState();
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (copiedNotificationTimerRef.current) clearTimeout(copiedNotificationTimerRef.current);
    };
  }, [parseUrlAndSetInitialState]);

  useEffect(() => {
    if (currentUser && allUsers.length > 0) {
      const updatedCurrentUser = allUsers.find(u => u.id === currentUser.id);
      if (updatedCurrentUser && JSON.stringify(currentUser) !== JSON.stringify(updatedCurrentUser)) {
        setCurrentUser(updatedCurrentUser);
      }
    }
  }, [allUsers, currentUser, setCurrentUser]);
  
  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = allUsers.find(u => u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  }, [allUsers]);

  const requestLoginForAction = (originalView: View, originalPayload?: any) => {
    if (!currentUser) {
      setLoginRedirectInfo({ view: originalView, payload: originalPayload });
      setCurrentView(View.Login);
      setIsMobileMenuOpen(false);
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
      if (typeof payload === 'string') profileInfo = { userId: payload };
      else if (payload && typeof payload === 'object' && payload.userId) profileInfo = { userId: payload.userId, helperProfileId: payload.helperProfileId };
      if (profileInfo) {
        const targetUser = allUsers.find(u => u.id === profileInfo!.userId);
        if (targetUser && targetUser.role === UserRole.Admin && currentUser?.id !== targetUser.id) {
          alert("โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้");
          return;
        }
        setViewingProfileInfo(profileInfo);
        if (fromView !== View.PublicProfile) setSourceViewForPublicProfile(fromView);
      } else {
        setCurrentView(View.Home);
        setViewingProfileInfo(null);
        window.history.pushState({ view: View.Home }, '', `?view=${View.Home}`);
        return;
      }
    } else if (viewingProfileInfo !== null) {
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
    if (view !== View.MyRoom) setMyRoomInitialTabOverride(null);

    const params = new URLSearchParams();
    params.set('view', view);
    let idForUrl: string | null = null;
    let slugForUrl: string | null = null;
    if (view === View.Webboard && newSelectedPostId && newSelectedPostId !== 'create') idForUrl = newSelectedPostId;
    else if (view === View.Blog && newSelectedBlogPostSlug) slugForUrl = newSelectedBlogPostSlug;
    else if (view === View.PublicProfile) {
      if (typeof payload === 'string') idForUrl = payload;
      else if (payload && typeof payload === 'object' && payload.userId) idForUrl = payload.userId;
    }
    if (idForUrl) params.set('id', idForUrl);
    if (slugForUrl) params.set('slug', slugForUrl);
    if(view === View.PublicProfile && fromView !== View.PublicProfile) params.set('from', fromView);

    const newSearch = params.toString();
    if (window.location.search.substring(1) !== newSearch) {
      window.history.pushState({ view, payload }, '', `?${newSearch}`);
    }
  };

  const onRegister = async (userData: RegistrationDataType): Promise<boolean> => {
    const success = await authActions.register(userData);
    if (success) {
      alert('ลงทะเบียนสำเร็จแล้ว!');
      if (loginRedirectInfo) {
        navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload);
        setLoginRedirectInfo(null);
      } else navigateTo(View.Home);
    } else alert(`เกิดข้อผิดพลาดในการลงทะเบียน`);
    return success;
  };
  
  const onLogin = async (loginIdentifier: string, passwordAttempt: string): Promise<boolean> => {
    const result = await authActions.login(loginIdentifier, passwordAttempt);
    if (result.success && result.user) {
      alert(`ยินดีต้อนรับ, ${result.user.publicDisplayName}!`);
      if (loginRedirectInfo) {
        navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload);
        setLoginRedirectInfo(null);
      } else navigateTo(View.Home);
    } else alert(result.error || `ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง`);
    return result.success;
  };

  const onLogout = async () => {
    const success = await authActions.logout();
    if (success) {
      setLoginRedirectInfo(null); setItemToEdit(null); setEditingItemType(null);
      setSourceViewForForm(null); setViewingProfileInfo(null); setSelectedPostId(null);
      setSourceViewForPublicProfile(View.FindHelpers);
      setMyRoomInitialTabOverride(null); setEditOriginMyRoomTab(null);
      setIsMobileMenuOpen(false);
      alert('ออกจากระบบเรียบร้อยแล้ว'); navigateTo(View.Home);
    } else alert(`เกิดข้อผิดพลาดในการออกจากระบบ`);
  };

  const canEditOrDelete = (itemUserId: string, itemOwnerId?: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.Admin) return true;
    const itemAuthor = allUsers.find(u => u.id === itemUserId);
    if (currentUser.role === UserRole.Moderator || currentUser.role === UserRole.Writer) {
        return itemAuthor?.role !== UserRole.Admin;
    }
    return currentUser.id === itemUserId || currentUser.id === itemOwnerId;
  };

  const onStartEditItemFromAdmin = (item: AdminItemType) => {
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

  const onStartEditMyItem = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost', originatingTab: MyRoomActiveTab) => {
    let originalItem: Job | HelperProfile | WebboardPost | undefined;
    if (itemType === 'job') originalItem = allJobsForAdmin.find(j => j.id === itemId);
    else if (itemType === 'profile') originalItem = allHelperProfilesForAdmin.find(p => p.id === itemId);
    else if (itemType === 'webboardPost') originalItem = allWebboardPostsForAdmin.find(p => p.id === itemId);

    if (originalItem && canEditOrDelete(originalItem.userId, originalItem.ownerId)) {
        setEditOriginMyRoomTab(originatingTab);
        setItemToEdit(itemType === 'webboardPost' ? { ...(originalItem as WebboardPost), isEditing: true } : originalItem);
        setEditingItemType(itemType);
        setSourceViewForForm(View.MyRoom);
        navigateTo(itemType === 'job' ? View.PostJob : itemType === 'profile' ? View.OfferHelp : View.Webboard, itemType === 'webboardPost' ? 'create' : undefined);
    } else alert("ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข");
  };

  const onCancelEditOrPost = () => {
    const currentSelectedPostIdForNav = selectedPostId;
    let targetView: View = sourceViewForForm || View.Home;
    if (editingItemType === null && currentView === View.Webboard && currentSelectedPostIdForNav === 'create') targetView = View.Webboard;
    else if (editingItemType === 'blogPost') targetView = View.AdminDashboard;
    else if (currentView === View.Webboard && currentSelectedPostIdForNav && currentSelectedPostIdForNav !== 'create') targetView = View.Webboard;

    setItemToEdit(null); setEditingItemType(null); setSourceViewForForm(null); setSelectedPostId(null);
    if (targetView === View.MyRoom && editOriginMyRoomTab) setMyRoomInitialTabOverride(editOriginMyRoomTab);
    else setMyRoomInitialTabOverride(null);
    navigateTo(targetView, (targetView === View.Webboard && currentSelectedPostIdForNav && currentSelectedPostIdForNav !== 'create') ? currentSelectedPostIdForNav : undefined);
    setEditOriginMyRoomTab(null);
  };

  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalTitle(title); setConfirmModalMessage(message); setOnConfirmAction(() => onConfirm); setIsConfirmModalOpen(true);
  };
  const closeConfirmModal = () => { setIsConfirmModalOpen(false); setConfirmModalMessage(''); setConfirmModalTitle(''); setOnConfirmAction(null); };
  const onConfirmDeletion = () => { if (onConfirmAction) onConfirmAction(); closeConfirmModal(); };

  const onDeleteItem = async (itemId: string, itemType: 'job' | 'profile' | 'webboardPost' | 'webboardComment' | 'blogPost', itemTitle: string, itemUserId: string, itemOwnerId?: string) => {
    if (!canEditOrDelete(itemUserId, itemOwnerId)) { alert('คุณไม่มีสิทธิ์ลบรายการนี้'); return; }
    let confirmMessage = `คุณแน่ใจหรือไม่ว่าต้องการลบ "${itemTitle}"? การกระทำนี้ไม่สามารถย้อนกลับได้`;
    if (itemType === 'webboardPost') confirmMessage += ' และจะลบคอมเมนต์ทั้งหมดที่เกี่ยวข้องด้วย';
    if (itemType === 'blogPost') confirmMessage += ' และจะลบภาพหน้าปกออกจากระบบด้วย';

    openConfirmModal(`ยืนยันการลบ`, confirmMessage, async () => {
        try {
            if (itemType === 'job') await jobActions.deleteJob(itemId);
            else if (itemType === 'profile') await helperActions.deleteHelperProfile(itemId);
            else if (itemType === 'webboardPost') {
                await webboardActions.deleteWebboardPost(itemId);
                if (selectedPostId === itemId) { setSelectedPostId(null); navigateTo(View.Webboard); }
            } else if (itemType === 'webboardComment') await webboardActions.deleteWebboardComment(itemId);
            else if (itemType === 'blogPost') {
                const postToDelete = allBlogPostsForAdmin.find(p => p.id === itemId);
                await blogActions.deleteBlogPost(itemId, postToDelete?.coverImageURL);
            }
            alert(`ลบ "${itemTitle}" เรียบร้อยแล้ว`);
        } catch (error: any) { alert(`เกิดข้อผิดพลาดในการลบ: ${error.message}`); }
    });
  };

  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [lastVisibleJob, setLastVisibleJob] = useState<DocumentSnapshot | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [hasMoreJobs, setHasMoreJobs] = useState(true);
  const [initialJobsLoaded, setInitialJobsLoaded] = useState(false);
  const jobsLoaderRef = useRef<HTMLDivElement>(null);

  const loadJobs = useCallback(async (isInitialLoad = false) => {
    if (isLoadingJobs || (!isInitialLoad && !hasMoreJobs)) return;
    setIsLoadingJobs(true);
    if (isInitialLoad) { setJobsList([]); setLastVisibleJob(null); setHasMoreJobs(true); setInitialJobsLoaded(false); }
    try {
      const result = await getJobsPaginated(JOBS_PAGE_SIZE, isInitialLoad ? null : lastVisibleJob, selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter);
      setJobsList(prevJobs => isInitialLoad ? result.items : [...prevJobs, ...result.items]);
      setLastVisibleJob(result.lastVisibleDoc);
      setHasMoreJobs(result.items.length === JOBS_PAGE_SIZE && result.lastVisibleDoc !== null);
      setInitialJobsLoaded(true);
    } catch (error) { console.error("Error loading jobs:", error); setHasMoreJobs(false); setInitialJobsLoaded(true); } 
    finally { setIsLoadingJobs(false); }
  }, [isLoadingJobs, hasMoreJobs, lastVisibleJob, selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter]);

  useEffect(() => { if (currentView === View.FindJobs) loadJobs(true); }, [currentView, selectedJobCategoryFilter, jobSearchTerm, selectedJobSubCategoryFilter, selectedJobProvinceFilter, loadJobs]);
  useEffect(() => {
    if (currentView !== View.FindJobs || !initialJobsLoaded) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && hasMoreJobs && !isLoadingJobs) loadJobs(); }, { threshold: 0.8 });
    const currentLoaderRef = jobsLoaderRef.current;
    if (currentLoaderRef) observer.observe(currentLoaderRef);
    return () => { if (currentLoaderRef) observer.unobserve(currentLoaderRef); };
  }, [currentView, hasMoreJobs, isLoadingJobs, initialJobsLoaded, loadJobs]);

  const onJobSearch = (term: string) => { setJobSearchTerm(term); if (term.trim()) { addRecentSearch('recentJobSearches', term.trim()); setRecentJobSearches(getRecentSearches('recentJobSearches')); } };
  const onJobCategoryFilterChange = (category: FilterableCategory) => { setSelectedJobCategoryFilter(category); setSelectedJobSubCategoryFilter('all'); };
  
  const onEditOwnJobFromFindView = (jobId: string) => {
    const jobToEdit = allJobsForAdmin.find(j => j.id === jobId);
    if (jobToEdit && currentUser && jobToEdit.userId === currentUser.id) {
        setItemToEdit(jobToEdit); setEditingItemType('job'); setSourceViewForForm(View.FindJobs); navigateTo(View.PostJob);
    } else alert("ไม่สามารถแก้ไขงานนี้ได้");
  };

  const renderFindJobs = () => {
    let emptyStateMessage = "ยังไม่มีงานประกาศในขณะนี้";
    if (jobSearchTerm.trim() || selectedJobCategoryFilter !== 'all' || selectedJobSubCategoryFilter !== 'all' || selectedJobProvinceFilter !== 'all') {
      emptyStateMessage = "ไม่พบงานที่ตรงกับเกณฑ์การค้นหาของคุณ";
    }
    const activeUserJobs = jobsList.filter(job => !job.isExpired && job.expiresAt && !isDateInPast(job.expiresAt) && !job.isHired)
      .map(job => ({ ...job, posterIsAdminVerified: allHelperProfilesForAdmin.some(hp => hp.userId === job.userId && hp.adminVerifiedExperience) }));

    const jobSubCategoryOptions = selectedJobCategoryFilter !== 'all' ? allJobsForAdmin.filter(j => j.category === selectedJobCategoryFilter && j.subCategory).map(j => j.subCategory!) : [];
    
    return (
    <div className="p-4 sm:p-6">
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-3xl font-sans font-semibold text-primary-dark mb-3">📢 ประกาศงาน</h2>
        <p className="text-md font-serif text-neutral-gray mb-6 max-w-xl mx-auto font-normal">เวลาและทักษะตรงกับงานไหน ติดต่อเลย!</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
        <aside className="lg:col-span-3 mb-8 lg:mb-0">
          <div className="sticky top-24 space-y-6 p-4 bg-white rounded-xl shadow-lg border border-primary-light">
            <CategoryFilterBar categories={Object.values(JobCategory)} selectedCategory={selectedJobCategoryFilter} onSelectCategory={onJobCategoryFilterChange} />
            <div>
              <label htmlFor="job-subcategory-filter" className="block text-sm font-sans font-medium text-primary-dark mb-1">เลือกหมวดหมู่ย่อย:</label>
              <select id="job-subcategory-filter" value={selectedJobSubCategoryFilter} onChange={(e) => setSelectedJobSubCategoryFilter(e.target.value as JobSubCategory | 'all')} disabled={selectedJobCategoryFilter === 'all' || jobSubCategoryOptions.length === 0}><option value="all">หมวดหมู่ย่อยทั้งหมด</option>{[...new Set(jobSubCategoryOptions)].map(subCat => (<option key={subCat} value={subCat}>{subCat}</option>))}</select>
            </div>
            <div>
              <label htmlFor="job-province-filter" className="block text-sm font-sans font-medium text-primary-dark mb-1">เลือกจังหวัด:</label>
              <select id="job-province-filter" value={selectedJobProvinceFilter} onChange={(e) => setSelectedJobProvinceFilter(e.target.value as Province | 'all')}><option value="all">ทุกจังหวัด</option>{Object.values(Province).map(prov => (<option key={prov} value={prov as string}>{prov}</option>))}</select>
            </div>
            <SearchInputWithRecent searchTerm={jobSearchTerm} onSearchTermChange={onJobSearch} placeholder="ค้นหางาน, รายละเอียด..." recentSearches={recentJobSearches} onRecentSearchSelect={(term) => { setJobSearchTerm(term); addRecentSearch('recentJobSearches', term); setRecentJobSearches(getRecentSearches('recentJobSearches')); }} />
            {currentUser && ( <Button onClick={() => { setSourceViewForForm(View.FindJobs); navigateTo(View.PostJob);}} variant="primary" size="md" className="w-full sm:px-4 sm:text-sm"><span>ลงประกาศงาน</span></Button> )}
          </div>
        </aside>
        <section className="lg:col-span-9">
          {!initialJobsLoaded && isLoadingJobs && jobsList.length === 0 && <div className="text-center py-20"><p>✨ กำลังโหลดประกาศงาน...</p></div>}
          {initialJobsLoaded && activeUserJobs.length === 0 && !hasMoreJobs && <div className="text-center py-10 bg-white p-6 rounded-lg shadow-md border border-primary-light"><p>{emptyStateMessage}</p>{currentUser && jobsList.length === 0 && !jobSearchTerm.trim() && selectedJobCategoryFilter === 'all' && <Button onClick={() => navigateTo(View.PostJob)} variant="primary" size="md" className="mt-6 font-medium">เป็นคนแรกที่ลงประกาศงาน!</Button>}</div>}
          {activeUserJobs.length > 0 && <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" variants={listVariants} initial="hidden" animate="visible">{activeUserJobs.map(job => (<motion.div key={job.id} variants={itemVariants}><JobCard job={job} navigateTo={navigateTo} currentUser={currentUser} requestLoginForAction={requestLoginForAction} onEditJobFromFindView={currentUser?.id === job.userId ? onEditOwnJobFromFindView : undefined} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={userActions.toggleInterest} isInterested={userInterests.some(i => i.targetId === job.id && i.targetType === 'job')} /></motion.div>))}</motion.div>}
          <div ref={jobsLoaderRef} className="h-10 flex justify-center items-center">{isLoadingJobs && initialJobsLoaded && jobsList.length > 0 && <p>✨ กำลังโหลดเพิ่มเติม...</p>}</div>
          {initialJobsLoaded && !hasMoreJobs && activeUserJobs.length > 0 && <p className="text-center text-sm font-sans text-neutral-medium py-4">🎉 คุณดูครบทุกประกาศงานแล้ว</p>}
        </section>
      </div>
    </div>
  );};

  const renderCurrentView = () => {
    // ... all other render functions would use their specific hooks
    return <p>View not implemented yet.</p>;
  }

  // ... rest of the App component logic (renderHeader, renderMobileMenu, etc.)
  // This is a minimal representation. The full file will have all the render logic.
  return (
    <div className={`font-serif bg-neutral-light min-h-screen flex flex-col`}>
      {/* ... header, mobile menu ... */}
      <main className={`flex-grow flex flex-col`}>
        {/* The routing logic here would use a map like before */}
      </main>
      {/* ... footer, modals ... */}
    </div>
  );
};

export default App;
