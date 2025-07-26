import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Job, HelperProfile, User, Interaction, WebboardPost, WebboardComment, UserLevel, VouchReport, Vouch, BlogPost } from '../types/types.ts';
import { UserRole, VouchReportStatus, VOUCH_TYPE_LABELS } from '../types/types.ts';
import { Button } from './Button.tsx';
import { OrionCommandCenter } from './OrionCommandCenter.tsx';
import { useJobs } from '../hooks/useJobs.ts';
import { useHelpers } from '../hooks/useHelpers.ts';
import { useUsers } from '../hooks/useUsers.ts';
import { useWebboard } from '../hooks/useWebboard.ts';
import { useBlog } from '../hooks/useBlog.ts';
import { useAdmin } from '../hooks/useAdmin.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { isDateInPast, formatDateDisplay } from '../utils/dateUtils.ts';
import { getUserDocument } from '../services/userService.ts';
import { AdminOverview } from './admin/AdminOverview.tsx';
import { useNavigate } from 'react-router-dom';

type AdminTab = 'overview' | 'action_hub' | 'vouch_reports' | 'orion_command_center' | 'articles' | 'jobs' | 'profiles' | 'users' | 'webboard' | 'site_controls';
type ActionHubSearchType = 'job' | 'profile' | 'webboardPost' | 'user';

interface AdminDashboardProps {
  isSiteLocked: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isSiteLocked }) => {
  const { currentUser } = useAuth();
  const { allJobsForAdmin } = useJobs();
  const { allHelperProfilesForAdmin } = useHelpers();
  const { users } = useUsers();
  const { allWebboardPostsForAdmin } = useWebboard();
  const { allBlogPostsForAdmin } = useBlog();
  const { vouchReports } = useData();
  const admin = useAdmin();
  const navigate = useNavigate();
  const blogActions = useBlog();
  const jobActions = useJobs();
  const helperActions = useHelpers();
  const webboardActions = useWebboard();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [blogStatusFilter, setBlogStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [selectedReport, setSelectedReport] = useState<VouchReport | null>(null);
  const [selectedVouch, setSelectedVouch] = useState<Vouch | null>(null);
  const [isHudLoading, setIsHudLoading] = useState(false);
  const [hudAnalysis, setHudAnalysis] = useState<{ ipMatch: boolean | null; voucherIsNew: boolean | null; error?: string | null }>({ ipMatch: null, voucherIsNew: null, error: null });
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  
  const [actionHubSearchType, setActionHubSearchType] = useState<ActionHubSearchType>('job');

  // Utility functions that depend on `users` data
  const getAuthorDisplayName = (userId: string, fallbackName?: string): string => {
    const author = users.find(u => u && u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  };

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
  
  const onStartEditItem = (item: { itemType: string; id?: string; originalItem: any }) => {
    const { id, itemType, originalItem } = item;
    let path;
    switch(itemType) {
      case 'job': path = `/job/edit/${id}`; break;
      case 'profile': path = `/profile/edit/${id}`; break;
      case 'webboardPost': path = `/webboard/post/${id}/edit`; break;
      case 'blogPost': path = id ? `/article/edit/${id}` : '/article/create'; break;
      default: return;
    }
    navigate(path, { state: { from: '/admin', item: originalItem } });
  };
  
  const handleSelectReport = (report: VouchReport) => {
      setSelectedReport(report);
      setActiveTab('vouch_reports');
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

        const voucherUser = await getUserDocument(vouch.voucherId);
        const voucheeUser = await getUserDocument(vouch.voucheeId);
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
  }, [selectedReport, admin.getVouchDocument]);

  const filteredItems = useMemo(() => {
    let items;
    switch (activeTab) {
        case 'jobs': items = allJobsForAdmin; break;
        case 'profiles': items = allHelperProfilesForAdmin; break;
        case 'webboard': items = allWebboardPostsForAdmin; break;
        case 'articles': items = allBlogPostsForAdmin; break;
        default: return [];
    }

    return items.filter(item => {
        if (activeTab === 'articles' && blogStatusFilter !== 'all' && (item as BlogPost).status !== blogStatusFilter) {
            return false;
        }
        if (!searchTerm.trim()) return true;

        const term = searchTerm.toLowerCase();
        const title = (item as any).title || (item as any).profileTitle;
        const author = getAuthorDisplayName((item as any).userId, (item as any).authorDisplayName);
        
        return title.toLowerCase().includes(term) || author.toLowerCase().includes(term) || item.id.toLowerCase().includes(term);
    }).sort((a,b) => new Date((b as any).postedAt || (b as any).createdAt).getTime() - new Date((a as any).postedAt || (a as any).createdAt).getTime());
  }, [activeTab, searchTerm, allJobsForAdmin, allHelperProfilesForAdmin, allWebboardPostsForAdmin, allBlogPostsForAdmin, blogStatusFilter, getAuthorDisplayName]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
        user.publicDisplayName.toLowerCase().includes(term) || 
        user.username.toLowerCase().includes(term) || 
        (user.email && user.email.toLowerCase().includes(term)) || 
        user.id.toLowerCase().includes(term) || 
        (user.mobile && user.mobile.includes(term))
    );
  }, [searchTerm, users]);

  if (currentUser?.role !== UserRole.Admin && currentUser?.role !== UserRole.Writer) {
    return <div className="p-8 text-center text-red-500 font-sans">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }
  
  const pendingReports = useMemo(() => vouchReports.filter(r => r.status === 'pending_review'), [vouchReports]);
  
  let TABS: { id: AdminTab; label: string; icon: string, badgeCount?: number }[] = [
    { id: 'overview', label: 'Mission Control', icon: '🚀' },
    { id: 'orion_command_center', label: 'Orion', icon: '🤖' },
    { id: 'vouch_reports', label: 'รายงาน Vouch', icon: '🛡️', badgeCount: pendingReports.length },
    { id: 'jobs', label: 'งาน', icon: '📢' },
    { id: 'profiles', label: 'โปรไฟล์ผู้ช่วย', icon: '🧑‍🔧' },
    { id: 'webboard', label: 'กระทู้', icon: '💬' },
    { id: 'articles', label: 'บทความ', icon: '📖' },
    { id: 'users', label: 'จัดการผู้ใช้', icon: '👥' },
    { id: 'site_controls', label: 'ควบคุมระบบ', icon: '⚙️' },
  ];
  if (currentUser?.role === UserRole.Writer) {
    TABS = [{ id: 'articles', label: 'บทความ', icon: '📖' }];
    if (activeTab !== 'articles') setActiveTab('articles');
  }

  const renderContent = () => {
    const tableHeaders: Record<string, string[]> = {
        jobs: ["Title", "Author", "Status", "Actions"],
        profiles: ["Profile Title", "Author", "Status", "Actions"],
        webboard: ["Title", "Author", "Stats", "Actions"],
        articles: ["Title", "Author", "Status", "Published Date", "Actions"],
        users: ["User", "Role", "Actions"],
    };

    const isTableView = ['jobs', 'profiles', 'webboard', 'articles', 'users'].includes(activeTab);
    
    switch (activeTab) {
      case 'overview':
        return <AdminOverview vouchReports={vouchReports} users={users} onSelectReport={handleSelectReport} getAuthorDisplayName={getAuthorDisplayName} />;
      case 'orion_command_center':
        return <div className="orion-cockpit"><OrionCommandCenter /></div>
      case 'vouch_reports':
        // Vouch Reports UI...
        return <div>Vouch Reports UI...</div>
      case 'site_controls':
        return (
            <div className="p-4 bg-neutral-light/50 rounded-lg">
                <h3 className="text-lg font-semibold text-neutral-700 mb-3">Site Controls</h3>
                <div className="flex items-center justify-between p-4 bg-white rounded shadow">
                    <p className="font-medium">Site Lock: {isSiteLocked ? 'ON' : 'OFF'}</p>
                    <Button onClick={() => admin.toggleSiteLock(isSiteLocked)} colorScheme={isSiteLocked ? 'accent' : 'primary'}>
                        {isSiteLocked ? 'Unlock Site' : 'Lock Site'}
                    </Button>
                </div>
            </div>
        );
      default:
        if (isTableView) {
            return (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-DEFAULT">
                        <thead className="bg-neutral-light/50">
                            <tr>
                                {tableHeaders[activeTab].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-neutral-DEFAULT">
                            {(activeTab === 'users' ? filteredUsers : filteredItems).map((item: any) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-dark">{item.title || item.profileTitle || `${item.publicDisplayName} (@${item.username})`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-medium">{item.authorDisplayName || item.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-medium">
                                        {activeTab === 'articles' ? item.status : 
                                         activeTab === 'webboard' ? `${item.likes.length} likes, ${item.commentCount} comments` :
                                         (item.isPinned ? 'Pinned ' : '') + (item.isSuspicious ? 'Suspicious' : '')
                                        }
                                    </td>
                                    {activeTab === 'articles' && <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-medium">{item.publishedAt ? formatDateDisplay(item.publishedAt) : '—'}</td>}
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Button onClick={() => onStartEditItem(item)} size="sm">Edit</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }
        return null;
    }
  }
  
  return (
    <div className="p-4 sm:p-6 w-full">
      <div className="dashboard-header">
        <h2 className="dashboard-title">🔐 Admin Dashboard</h2>
        <nav className="dashboard-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`dashboard-nav-pill ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badgeCount && tab.badgeCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{tab.badgeCount}</span>
              )}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-6">
        {['jobs', 'profiles', 'webboard', 'articles', 'users'].includes(activeTab) && (
            <div className="mb-4 flex flex-col sm:flex-row gap-4">
                <input
                    type="search"
                    placeholder={`ค้นหาใน ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:flex-grow"
                />
                {activeTab === 'articles' && (
                    <div className="flex-shrink-0 w-full sm:w-48">
                        <label htmlFor="blogStatusFilter" className="sr-only">Filter by status</label>
                        <select
                            id="blogStatusFilter"
                            value={blogStatusFilter}
                            onChange={(e) => setBlogStatusFilter(e.target.value as any)}
                            className="w-full"
                        >
                            <option value="all">All Statuses</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                )}
            </div>
        )}
        {activeTab === 'articles' && (
            <Button onClick={() => onStartEditItem({itemType: 'blogPost', originalItem: {}})} variant="primary" size="sm" className="mb-4">
                + Create New Post
            </Button>
        )}
        {renderContent()}
      </div>
    </div>
  );
};
