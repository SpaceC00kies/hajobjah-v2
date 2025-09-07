
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Job, HelperProfile, User, VouchReport, Vouch, BlogPost, WebboardPost, UserLevel, Interaction, WebboardComment } from '../types/types.ts';
import { UserRole, VouchReportStatus, VOUCH_TYPE_LABELS } from '../types/types.ts';
import { Button } from './Button.tsx';
import { OrionCommandCenter } from './OrionCommandCenter.tsx';
import { useAdmin } from '../hooks/useAdmin.ts';
import { formatDateDisplay, isDateInPast } from '../utils/dateUtils.ts';
import { AdminOverview } from './admin/AdminOverview.tsx';
import { useNavigate } from 'react-router-dom';
import { subscribeToSiteConfigService } from '../services/adminService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useJobs } from '../hooks/useJobs.ts';
import { useHelpers } from '../hooks/useHelpers.ts';
import { useUsers } from '../hooks/useUsers.ts';
import { useWebboard } from '../hooks/useWebboard.ts';
import { useBlog } from '../hooks/useBlog.ts';
import { useData } from '../context/DataContext.tsx';
import { ConfirmModal } from './ConfirmModal.tsx';
import { useCleanup } from '../hooks/useCleanup.ts';


export interface AdminItem {
  id: string;
  itemType: 'job' | 'profile' | 'webboardPost' | 'blogPost' | 'user';
  title: string;
  authorDisplayName?: string;
  userId?: string;
  postedAt?: string | Date;
  isPinned?: boolean;
  isSuspicious?: boolean;
  isHiredOrUnavailable?: boolean;
  originalItem: Job | HelperProfile | WebboardPost | BlogPost | User;
  adminVerifiedExperience?: boolean;
  profileComplete?: boolean;
  likesCount?: number;
  commentsCount?: number;
  authorLevel?: UserLevel;
  status?: 'draft' | 'published' | 'archived'; // For BlogPost
  publishedAt?: string | Date; // For BlogPost
}

type AdminTab = 'overview' | 'action_hub' | 'vouch_reports' | 'orion_command_center' | 'articles' | 'site_controls';
type ActionHubSearchType = 'job' | 'profile' | 'webboardPost' | 'user';
type ActionHubItem = Job | HelperProfile | WebboardPost | User;

const ADMIN_DASHBOARD_TAB_KEY = 'hajobja_admin_active_tab';

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { allJobsForAdmin, deleteJob, toggleSuspiciousJob, togglePinnedJob } = useJobs();
  const { runCleanup, canRunCleanup } = useCleanup();
  const { allHelperProfilesForAdmin, deleteHelperProfile, onToggleSuspiciousHelperProfile, onTogglePinnedHelperProfile } = useHelpers();
  const { users } = useUsers();
  const { allWebboardPostsForAdmin, deleteWebboardPost, pinWebboardPost } = useWebboard();
  const { allBlogPostsForAdmin, deleteBlogPost } = useBlog();
  const { vouchReports } = useData();
  const admin = useAdmin();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (currentUser?.role === UserRole.Writer) {
      return 'articles';
    }
    const savedTab = sessionStorage.getItem(ADMIN_DASHBOARD_TAB_KEY);
    return (savedTab as AdminTab) || 'overview';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [blogStatusFilter, setBlogStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [selectedReport, setSelectedReport] = useState<VouchReport | null>(null);
  const [selectedVouch, setSelectedVouch] = useState<Vouch | null>(null);
  const [isHudLoading, setIsHudLoading] = useState(false);
  const [hudAnalysis, setHudAnalysis] = useState<{ ipMatch: boolean | null; voucherIsNew: boolean | null; error?: string | null }>({ ipMatch: null, voucherIsNew: null, error: null });
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [isSiteLocked, setIsSiteLocked] = useState(false);

  const [actionHubSearchType, setActionHubSearchType] = useState<ActionHubSearchType>('job');
  const [actionHubSearchResults, setActionHubSearchResults] = useState<ActionHubItem[]>([]);
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);
  const [isCleanupRunning, setIsCleanupRunning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.role !== UserRole.Writer) {
      sessionStorage.setItem(ADMIN_DASHBOARD_TAB_KEY, activeTab);
    }
  }, [activeTab, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role === UserRole.Writer && activeTab !== 'articles') {
      setActiveTab('articles');
    }
  }, [currentUser?.role, activeTab]);

  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = users.find(u => u && u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  }, [users]);

  // Centralized action handler for optimistic updates
  const handleAction = useCallback((itemId: string, actionType: 'pin' | 'suspicious' | 'verify' | 'role', itemType: ActionHubSearchType, newValue?: any) => {
    setOpenActionMenuId(null);

    // Optimistic UI update
    setActionHubSearchResults(prev => prev.map(p => {
      if (p.id !== itemId) return p;
      const updated = { ...p };
      if (actionType === 'pin') (updated as any).isPinned = !(updated as any).isPinned;
      else if (actionType === 'suspicious') (updated as any).isSuspicious = !(updated as any).isSuspicious;
      else if (actionType === 'verify') {
        (updated as User).adminVerified = !(updated as User).adminVerified;
      } else if (actionType === 'role') {
        (updated as any).role = newValue;
      }
      return updated;
    }));

    // Service call
    switch (itemType) {
      case 'job':
        if (actionType === 'pin') togglePinnedJob(itemId);
        else if (actionType === 'suspicious') toggleSuspiciousJob(itemId);
        break;
      case 'profile':
        if (actionType === 'pin') onTogglePinnedHelperProfile(itemId);
        else if (actionType === 'suspicious') onToggleSuspiciousHelperProfile(itemId);
        break;
      case 'webboardPost':
        if (actionType === 'pin') pinWebboardPost(itemId);
        break;
      case 'user':
        if (actionType === 'role') admin.setUserRole(itemId, newValue as UserRole);
        else if (actionType === 'verify') admin.toggleUserVerification(itemId);
        break;
    }
  }, [admin, togglePinnedJob, toggleSuspiciousJob, onTogglePinnedHelperProfile, onToggleSuspiciousHelperProfile, pinWebboardPost]);

  const onStartEditItem = (item: AdminItem) => {
    const { id, itemType, originalItem } = item;
    let path: string;
    switch (itemType) {
      case 'job': path = `/job/edit/${id}`; break;
      case 'profile': path = `/helper/edit/${id}`; break;
      case 'webboardPost': path = `/webboard/post/${id}/edit`; break;
      case 'blogPost': path = id ? `/article/edit/${id}` : '/article/create'; break;
      default: return;
    }
    navigate(path, { state: { from: '/admin', item: originalItem } });
  };

  const onDeleteItem = useCallback((itemId: string, itemType: 'job' | 'profile' | 'webboardPost', title: string) => {
    setConfirmModalState({
      isOpen: true,
      title: `Confirm Deletion`,
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      onConfirm: () => {
        setActionHubSearchResults(prev => prev.filter(item => item.id !== itemId));
        switch (itemType) {
          case 'job': deleteJob(itemId); break;
          case 'profile': deleteHelperProfile(itemId); break;
          case 'webboardPost': deleteWebboardPost(itemId); break;
        }
      }
    });
  }, [deleteJob, deleteHelperProfile, deleteWebboardPost]);

  useEffect(() => {
    const unsubscribe = subscribeToSiteConfigService((config) => {
      setIsSiteLocked(!!config && config.isSiteLocked === true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSearchTerm('');
    if (activeTab !== 'action_hub') {
      setActionHubSearchType('job');
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    if (openActionMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openActionMenuId]);

  const handleSelectReport = (report: VouchReport) => {
    setSelectedReport(report);
    setActiveTab('vouch_reports');
  };

  const handleRunCleanup = async () => {
    if (!canRunCleanup) return;

    setIsCleanupRunning(true);
    setCleanupMessage(null);

    try {
      const result = await runCleanup();
      setCleanupMessage(result.message);
    } catch (error: any) {
      setCleanupMessage(`Cleanup failed: ${error.message}`);
    } finally {
      setIsCleanupRunning(false);
    }
  };

  const handleResolveVouch = async (resolution: VouchReportStatus.ResolvedDeleted | VouchReportStatus.ResolvedKept) => {
    if (!selectedReport) return;

    try {
      await admin.resolveVouchReport(
        selectedReport.id,
        resolution,
        selectedReport.vouchId,
        selectedReport.voucheeId,
        selectedVouch?.vouchType
      );
      // Success! Clear the selected report to update the HUD.
      setSelectedReport(null);
    } catch (err) {
      // The hook already shows an alert, just log it here for debugging.
      console.error("Failed to resolve vouch report:", err);
    }
  };

  useEffect(() => {
    setHudAnalysis({ ipMatch: null, voucherIsNew: null, error: null });
    setSelectedVouch(null);
    if (!selectedReport) {
      setIsHudLoading(false);
      return;
    }

    const analyzeReport = async () => {
      setIsHudLoading(true);
      try {
        const vouch = await admin.getVouchDocument(selectedReport.vouchId);
        setSelectedVouch(vouch);

        if (!vouch) {
          setHudAnalysis({ ipMatch: null, voucherIsNew: null, error: "Vouch document not found. It may have been deleted." });
          setIsHudLoading(false);
          return;
        }

        const voucherUser = await admin.getUserDocument(vouch.voucherId);
        const voucheeUser = await admin.getUserDocument(vouch.voucheeId);
        if (!voucherUser || !voucheeUser) {
          setHudAnalysis({ ipMatch: null, voucherIsNew: null, error: "Could not fetch full user data for analysis." });
          setIsHudLoading(false);
          return;
        }

        const ipMatch = !!(voucherUser.lastLoginIP && voucheeUser.lastLoginIP && voucherUser.lastLoginIP === voucheeUser.lastLoginIP);
        let voucherIsNew = false;
        if (voucherUser.createdAt) {
          const accountAge = new Date().getTime() - new Date(voucherUser.createdAt as string).getTime();
          if (accountAge < 7 * 24 * 60 * 60 * 1000) voucherIsNew = true;
        }
        setHudAnalysis({ ipMatch, voucherIsNew, error: null });
      } catch (err: any) {
        console.error("Error in HUD analysis:", err);
        setHudAnalysis({ ipMatch: null, voucherIsNew: null, error: err.message || "An unexpected error occurred." });
      } finally {
        setIsHudLoading(false);
      }
    };
    analyzeReport();
  }, [selectedReport, admin.getVouchDocument, admin.getUserDocument]);

  const isWriter = currentUser?.role === UserRole.Writer;

  if (currentUser?.role !== UserRole.Admin && !isWriter) {
    return <div className="p-8 text-center text-red-500 font-sans">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  const filteredBlogItems = useMemo(() => allBlogPostsForAdmin.filter(post => {
    if (blogStatusFilter !== 'all' && post.status !== blogStatusFilter) return false;
    if (searchTerm.trim() && activeTab === 'articles') {
      const term = searchTerm.toLowerCase();
      return post.title.toLowerCase().includes(term) || getAuthorDisplayName(post.authorId, post.authorDisplayName).toLowerCase().includes(term);
    }
    return true;
  }), [allBlogPostsForAdmin, blogStatusFilter, searchTerm, activeTab, getAuthorDisplayName]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setActionHubSearchResults([]);
      return;
    }
    const term = searchTerm.toLowerCase();
    let results: ActionHubItem[] = [];
    switch (actionHubSearchType) {
      case 'job':
        results = allJobsForAdmin.filter(item => item.title.toLowerCase().includes(term) || getAuthorDisplayName(item.userId, item.authorDisplayName).toLowerCase().includes(term) || item.id.toLowerCase().includes(term));
        break;
      case 'profile':
        results = allHelperProfilesForAdmin.filter(item => item.profileTitle.toLowerCase().includes(term) || getAuthorDisplayName(item.userId, item.authorDisplayName).toLowerCase().includes(term) || item.id.toLowerCase().includes(term));
        break;
      case 'webboardPost':
        results = allWebboardPostsForAdmin.filter(item => item.title.toLowerCase().includes(term) || getAuthorDisplayName(item.userId, item.authorDisplayName).toLowerCase().includes(term) || item.id.toLowerCase().includes(term));
        break;
      case 'user':
        results = users.filter(user => user.publicDisplayName.toLowerCase().includes(term) || user.username.toLowerCase().includes(term) || (user.email && user.email.toLowerCase().includes(term)) || user.id.toLowerCase().includes(term) || (user.mobile && user.mobile.includes(term)));
        break;
    }
    setActionHubSearchResults(results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, actionHubSearchType]);

  const pendingReports = useMemo(() => vouchReports.filter(r => r.status === 'pending_review'), [vouchReports]);
  let TABS: { id: AdminTab; label: string; icon: string, badgeCount?: number }[] = [
    { id: 'overview', label: 'Mission Control', icon: '🎯' },
    { id: 'action_hub', label: 'Action Hub', icon: '🔍' },
    { id: 'vouch_reports', label: 'รายงาน Vouch', icon: '🛡️', badgeCount: pendingReports.length },
    { id: 'orion_command_center', label: 'Orion', icon: '🤖' },
    { id: 'articles', label: 'บทความ', icon: '📖' },
    { id: 'site_controls', label: 'ควบคุมระบบ', icon: '⚙️' },
  ];

  if (isWriter) {
    TABS = [{ id: 'articles', label: 'บทความ', icon: '📖' }];
  }

  const searchTypes: { id: ActionHubSearchType; label: string; icon: string }[] = [
    { id: 'job', label: 'ประกาศรับสมัคร', icon: '📢' },
    { id: 'profile', label: '👩🏻‍💼 เสนอโปรไฟล์', icon: '🧑‍🔧' },
    { id: 'webboardPost', label: 'กระทู้', icon: '💬' },
    { id: 'user', label: 'ผู้ใช้', icon: '👥' },
  ];

  const renderStatusBadge = (text: string, color: 'blue' | 'yellow' | 'red' | 'green' | 'gray') => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800', yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800', green: 'bg-green-100 text-green-800',
      gray: 'bg-gray-100 text-gray-800'
    };
    return <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full ${colors[color]}`}>{text}</span>;
  };

  const renderActionHubResults = () => {
    const dropdownItemBaseClass = "w-full text-left text-sm p-2 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1";
    const dropdownItemNormalClass = `${dropdownItemBaseClass} hover:bg-primary-light hover:text-primary-dark focus:bg-primary-light focus:text-primary-dark focus:ring-primary-dark`;
    const dropdownItemDeleteClass = `${dropdownItemBaseClass} text-red-700 hover:bg-red-100 hover:text-red-800 focus:bg-red-100 focus:ring-red-500`;

    return actionHubSearchResults.map(item => {
      let title: string, subtitle: string, badges: React.ReactNode[] = [], primaryAction: React.ReactNode, secondaryActions: React.ReactNode[];
      const itemType = actionHubSearchType;

      if (itemType === 'user') {
        const user = item as User;
        title = `${user.publicDisplayName} (@${user.username})`;
        subtitle = `${user.email || 'no-email'} | ${user.role}`;
        if (user.adminVerified) badges.push(renderStatusBadge('Verified', 'green'));
        primaryAction = null;
        secondaryActions = [
          <select key="role" value={user.role} onChange={e => handleAction(user.id, 'role', 'user', e.target.value)} disabled={user.id === currentUser?.id} className={`${dropdownItemNormalClass}`}>
            {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
          </select>,
          <button type="button" key="verify" onClick={() => handleAction(user.id, 'verify', 'user')} className={dropdownItemNormalClass}>
            {user.adminVerified ? 'Unverify User' : 'Verify User'}
          </button>
        ];
      } else {
        const contentItem = item as Job | HelperProfile | WebboardPost;
        const author = users.find(u => u.id === contentItem.userId);
        title = 'title' in contentItem ? contentItem.title : contentItem.profileTitle;
        subtitle = `by ${getAuthorDisplayName(contentItem.userId, contentItem.authorDisplayName)}`;

        if (contentItem.isPinned) badges.push(renderStatusBadge('Pinned', 'yellow'));
        if ('isSuspicious' in contentItem && contentItem.isSuspicious) badges.push(renderStatusBadge('Suspicious', 'red'));
        if (author?.adminVerified) badges.push(renderStatusBadge('Author Verified', 'green'));
        if (('isHired' in contentItem && contentItem.isHired) || ('isUnavailable' in contentItem && contentItem.isUnavailable)) badges.push(renderStatusBadge('Hired/Unavailable', 'gray'));

        primaryAction = <Button type="button" onClick={() => { onStartEditItem({ id: item.id, itemType, originalItem: item, title } as AdminItem); setOpenActionMenuId(null); }} size="sm">Edit</Button>;
        secondaryActions = [<button type="button" key="delete" onClick={() => { onDeleteItem(item.id, itemType as 'job' | 'profile' | 'webboardPost', title); setOpenActionMenuId(null); }} className={dropdownItemDeleteClass}>Delete</button>];

        if (itemType === 'job') {
          const jobItem = item as Job;
          secondaryActions.push(<button type="button" key="suspicious" onClick={() => handleAction(item.id, 'suspicious', 'job')} className={dropdownItemNormalClass}>{jobItem.isSuspicious ? 'Unsuspicious' : 'Suspicious'}</button>);
          secondaryActions.push(<button type="button" key="pin" onClick={() => handleAction(item.id, 'pin', 'job')} className={dropdownItemNormalClass}>{jobItem.isPinned ? 'Unpin' : 'Pin'}</button>);
        } else if (itemType === 'profile') {
          const profileItem = item as HelperProfile;
          secondaryActions.push(<button type="button" key="suspicious" onClick={() => handleAction(item.id, 'suspicious', 'profile')} className={dropdownItemNormalClass}>{profileItem.isSuspicious ? 'Unsuspicious' : 'Suspicious'}</button>);
          secondaryActions.push(<button type="button" key="pin" onClick={() => handleAction(item.id, 'pin', 'profile')} className={dropdownItemNormalClass}>{profileItem.isPinned ? 'Unpin' : 'Pin'}</button>);
        } else if (itemType === 'webboardPost') {
          secondaryActions.push(<button type="button" key="pin" onClick={() => handleAction(item.id, 'pin', 'webboardPost')} className={dropdownItemNormalClass}>{contentItem.isPinned ? 'Unpin' : 'Pin'}</button>);
        }
      }

      return (
        <div key={item.id} className="bg-white rounded-lg shadow-sm border border-primary-light hover:shadow-md hover:border-primary-blue transition-shadow duration-200 flex items-center justify-between p-4">
          <div className="flex-grow min-w-0"><h4 className="text-md font-semibold text-primary-dark truncate" title={title}>{title}</h4><p className="text-sm text-neutral-medium truncate">{subtitle}</p><div className="mt-2">{badges}</div></div>
          <div className="flex-shrink-0 flex items-center gap-2 ml-4">
            {primaryAction}
            <div className="relative" ref={openActionMenuId === item.id ? actionMenuRef : null}>
              <button type="button" onClick={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)} className="p-2 rounded-full hover:bg-neutral-light/50">
                <svg className="w-5 h-5 text-neutral-dark" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
              </button>
              {openActionMenuId === item.id && (<div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-primary-light"><div className="p-1 space-y-1">{secondaryActions}</div></div>)}
            </div>
          </div>
        </div>
      );
    });
  };

  const renderArticleResults = () => {
    return filteredBlogItems.map(item => {
      const canEdit = currentUser?.role === UserRole.Admin || (currentUser?.role === UserRole.Writer && item.authorId === currentUser.id);
      const badges = [renderStatusBadge(item.status, item.status === 'published' ? 'green' : (item.status === 'draft' ? 'yellow' : 'gray'))];

      return (
        <div key={item.id} className="bg-white rounded-lg shadow-sm border border-primary-light hover:shadow-md hover:border-primary-blue transition-shadow duration-200 flex items-center justify-between p-4">
          <div className="flex-grow min-w-0">
            <h4 className="text-md font-semibold text-primary-dark truncate" title={item.title}>{item.title}</h4>
            <p className="text-sm text-neutral-medium truncate">by {getAuthorDisplayName(item.authorId, item.authorDisplayName)} | Published: {item.publishedAt ? formatDateDisplay(item.publishedAt as string) : '—'}</p>
            <div className="mt-2">{badges}</div>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 ml-4">
            {canEdit && <Button type="button" onClick={() => onStartEditItem({ id: item.id, itemType: 'blogPost', originalItem: item, title: item.title })} size="sm">Edit</Button>}
            <div className="relative" ref={openActionMenuId === item.id ? actionMenuRef : null}>
              <button type="button" onClick={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)} className="p-2 rounded-full hover:bg-neutral-light/50">
                <svg className="w-5 h-5 text-neutral-dark" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
              </button>
              {openActionMenuId === item.id && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-primary-light">
                  <div className="p-1">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmModalState({
                            isOpen: true,
                            title: 'Confirm Deletion',
                            message: `Are you sure you want to delete the article "${item.title}"? This action cannot be undone.`,
                            onConfirm: () => {
                              deleteBlogPost(item.id, (item as BlogPost).coverImageURL);
                            }
                          });
                          setOpenActionMenuId(null);
                        }}
                        className="w-full text-left text-sm p-2 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 hover:bg-red-100 text-red-700 focus:bg-red-100 focus:ring-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  const dashboardTitle = isWriter ? "แดชบอร์ดนักเขียน" : "Admin Dashboard";
  const dashboardIcon = isWriter ? "✍️" : "🏠";

  return (
    <>
      <div className="p-4 sm:p-6 w-full">
        <div className="dashboard-header">
          <h1 className="dashboard-title">
            <span role="img" aria-label="dashboard icon" className="text-3xl">{dashboardIcon}</span>
            <span>{dashboardTitle}</span>
          </h1>
          <nav className="dashboard-nav">{TABS.map(tab => (<button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={`dashboard-nav-pill ${activeTab === tab.id ? 'active' : ''}`} aria-current={activeTab === tab.id ? 'page' : undefined}>
            <span>{tab.icon}</span><span>{tab.label}</span>
            {tab.badgeCount && tab.badgeCount > 0 && (<span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{tab.badgeCount}</span>)}
          </button>))}
          </nav>
        </div>

        {activeTab === 'overview' && currentUser?.role === UserRole.Admin && (<AdminOverview vouchReports={vouchReports} users={users} onSelectReport={handleSelectReport} getAuthorDisplayName={getAuthorDisplayName} />)}

        {activeTab === 'action_hub' && (
          <div>
            <div className="mb-4 flex gap-2 flex-wrap">{searchTypes.map(type => (<button type="button" key={type.id} onClick={() => setActionHubSearchType(type.id)} className={`dashboard-nav-pill ${actionHubSearchType === type.id ? 'active' : ''}`}>{type.icon} {type.label}</button>))}</div>
            <input type="search" placeholder={`Search for a ${actionHubSearchType}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full mb-4" />
            {searchTerm.trim() && (<div className="space-y-3">{renderActionHubResults()}</div>)}
          </div>
        )}

        {activeTab === 'articles' && (
          <div>
            <div className="mb-4 flex flex-col sm:flex-row gap-4">
              <input type="search" placeholder={`ค้นหาใน ${activeTab}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:flex-grow" />
              <div className="flex-shrink-0 w-full sm:w-48">
                <label htmlFor="blogStatusFilter" className="sr-only">Filter by status</label>
                <select id="blogStatusFilter" value={blogStatusFilter} onChange={e => setBlogStatusFilter(e.target.value as any)} className="w-full">
                  <option value="all">All Statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <Button type="button" onClick={() => onStartEditItem({ itemType: 'blogPost', id: '', title: '', originalItem: {} as BlogPost })} variant="primary" size="sm" className="mb-4">+ Create New Post</Button>
            <div className="space-y-3">{renderArticleResults()}</div>
          </div>
        )}

        {activeTab === 'site_controls' && currentUser?.role === UserRole.Admin && (
          <div className="p-4 bg-neutral-light/50 rounded-lg">
            <h3 className="text-lg font-semibold text-neutral-700 mb-3">Site Controls</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded shadow">
                <p className="font-medium">Site Lock: {isSiteLocked ? "ON" : "OFF"}</p>
                <Button
                  type="button"
                  onClick={() => admin.toggleSiteLock(isSiteLocked)}
                  colorScheme={isSiteLocked ? "accent" : "primary"}
                >
                  {isSiteLocked ? "Unlock Site" : "Lock Site"}
                </Button>
              </div>

              <div className="p-4 bg-white rounded shadow">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">Expired Posts Cleanup</p>
                    <p className="text-sm text-neutral-medium">
                      Automatically delete expired posts that have been expired for 30+ days AND haven't been touched by their original posters
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleRunCleanup}
                    colorScheme="secondary"
                    disabled={isCleanupRunning || !canRunCleanup}
                  >
                    {isCleanupRunning ? "Running..." : "🧹 Run Cleanup"}
                  </Button>
                </div>
                {cleanupMessage && (
                  <div className={`mt-2 p-2 rounded text-sm ${cleanupMessage.includes('failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {cleanupMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orion_command_center' && currentUser?.role === UserRole.Admin && (<div className="orion-cockpit"><OrionCommandCenter /></div>)}

        {activeTab === 'vouch_reports' && currentUser?.role === UserRole.Admin && (<div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="md:col-span-1"><h3 className="text-lg font-semibold text-neutral-700 mb-3">Pending Reports ({pendingReports.length})</h3><div className="space-y-2 max-h-96 overflow-y-auto pr-2">{pendingReports.length > 0 ? (pendingReports.map(report => (<button type="button" key={report.id} onClick={() => setSelectedReport(report)} className={`block w-full text-left p-3 rounded-md ${selectedReport?.id === report.id ? 'bg-blue-100' : 'bg-neutral-light/50 hover:bg-neutral-light'}`}><p className="text-sm font-semibold truncate">Report on Vouch <code className="text-xs">{report.vouchId.substring(0, 6)}...</code></p><p className="text-xs text-neutral-medium">By: {getAuthorDisplayName(report.reporterId).substring(0, 15)}...</p></button>))) : (<div className="text-center p-4 text-sm text-neutral-medium">✅ No pending reports. Great job!</div>)}</div></div><div className="md:col-span-2 p-4 bg-neutral-light/50 rounded-lg"><h3 className="text-lg font-semibold text-neutral-700 mb-3">Report Details & HUD</h3>{selectedReport ? (<div><p><strong>Reporter Comment:</strong> {selectedReport.reporterComment}</p><hr className="my-2" /><p className="font-semibold">Vouch Info:</p>{isHudLoading ? <p>Loading Vouch Details...</p> : selectedVouch ? (<div><p>From: {selectedVouch.voucherDisplayName} ({selectedVouch.voucherId.substring(0, 10)}...)</p><p>To: {getAuthorDisplayName(selectedVouch.voucheeId)} ({selectedVouch.voucheeId.substring(0, 10)}...)</p><p>Type: {VOUCH_TYPE_LABELS[selectedVouch.vouchType]}</p><p>Vouch Comment: "{selectedVouch.comment}"</p></div>) : <p className="text-red-500">Vouch data not found.</p>}<hr className="my-2" /><p className="font-semibold">Risk Signals:</p>{isHudLoading ? <p>Analyzing...</p> : hudAnalysis.error ? (<p className="font-bold text-red-500">⚠️ Analysis Error: {hudAnalysis.error}</p>) : (<div>{hudAnalysis.ipMatch === null ? <p>IP check pending...</p> : hudAnalysis.ipMatch ? <p className="font-bold text-red-500">⚠️ IP ADDRESS MATCH</p> : <p className="text-green-600">✅ IP addresses do not match.</p>}{hudAnalysis.voucherIsNew === null ? <p>Account age check pending...</p> : hudAnalysis.voucherIsNew ? <p className="font-bold text-orange-500">⚠️ VOUCHER IS NEW ACCOUNT (&lt;7 days)</p> : <p className="text-green-600">✅ Voucher account is not new.</p>}</div>)}<div className="mt-4 flex flex-wrap gap-4"><Button type="button" onClick={() => handleResolveVouch(VouchReportStatus.ResolvedKept)} colorScheme="primary" disabled={isHudLoading || !selectedVouch}>Keep Vouch</Button><Button type="button" onClick={() => handleResolveVouch(VouchReportStatus.ResolvedDeleted)} colorScheme="accent" disabled={isHudLoading || !selectedVouch}>Delete Vouch</Button><Button type="button" onClick={() => { if (selectedReport && window.confirm('This action will permanently resolve this report and attempt to correct user statistics. Use this for glitched or old entries. Are you sure?')) { admin.forceResolveVouchReport(selectedReport.id, selectedReport.vouchId, selectedReport.voucheeId, selectedVouch?.vouchType || selectedReport.vouchType || null).then(() => { setSelectedReport(null); }).catch(err => { console.error("Force resolve failed:", err); alert(`An error occurred: ${err.message}`); }); } }} colorScheme="accent" className="bg-red-500 hover:bg-red-600 text-white" disabled={isHudLoading || !selectedReport}>💥 Force Resolve</Button></div></div>) : <p>Select a report to view details.</p>}</div></div>)}
      </div>
      <ConfirmModal
        isOpen={confirmModalState?.isOpen || false}
        onClose={() => setConfirmModalState(null)}
        onConfirm={() => {
          confirmModalState?.onConfirm();
          setConfirmModalState(null);
        }}
        title={confirmModalState?.title || ''}
        message={confirmModalState?.message || ''}
      />
    </>
  );
};
