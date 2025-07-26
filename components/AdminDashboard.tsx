import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Job, HelperProfile, User, VouchReport, Vouch, BlogPost } from '../types/types.ts';
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
import { formatDateDisplay } from '../utils/dateUtils.ts';
import { AdminOverview } from './admin/AdminOverview.tsx';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type AdminTab = 'overview' | 'action_hub' | 'vouch_reports' | 'orion_command_center' | 'articles' | 'site_controls';
type ActionHubSearchType = 'job' | 'profile' | 'webboardPost' | 'user' | 'blogPost';

interface AdminDashboardProps {
  isSiteLocked: boolean;
}

const tableItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isSiteLocked }) => {
  const { currentUser } = useAuth();
  const { allJobsForAdmin } = useJobs();
  const { allHelperProfilesForAdmin } = useHelpers();
  const { users } = useUsers();
  const { allWebboardPostsForAdmin, webboardComments } = useWebboard();
  const { allBlogPostsForAdmin } = useBlog();
  const { vouchReports } = useData();
  const admin = useAdmin();
  const navigate = useNavigate();

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
  
  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = users.find(u => u && u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  }, [users]);
  
  const getVoucheeDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = users.find(u => u && u.id === userId);
    return author?.publicDisplayName || fallbackName || "ไม่พบผู้ถูกรับรอง";
  }, [users]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    if (openActionMenuId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
  
  const handleSelectReport = (report: VouchReport) => setSelectedReport(report);

  useEffect(() => {
    setHudAnalysis({ ipMatch: null, voucherIsNew: null, error: null });
    setSelectedVouch(null);
    if (!selectedReport) return;
    
    const analyzeReport = async () => {
      setIsHudLoading(true);
      try {
        const vouch = await admin.getVouchDocument(selectedReport.vouchId);
        setSelectedVouch(vouch);

        if (!vouch) {
          setHudAnalysis({ ipMatch: null, voucherIsNew: null, error: "Vouch document not found." });
          return;
        }

        const [voucherUser, voucheeUser] = await Promise.all([
            admin.getUserDocument(vouch.voucherId),
            admin.getUserDocument(vouch.voucheeId)
        ]);
        
        if (!voucherUser || !voucheeUser) {
          setHudAnalysis({ ipMatch: null, voucherIsNew: null, error: "Could not fetch full user data." });
          return;
        }
        
        const ipMatch = !!(voucherUser.lastLoginIP && voucheeUser.lastLoginIP && voucherUser.lastLoginIP === voucheeUser.lastLoginIP);
        const accountAge = new Date().getTime() - (voucherUser.createdAt as Date).getTime();
        const voucherIsNew = accountAge < 7 * 24 * 60 * 60 * 1000;
        setHudAnalysis({ ipMatch, voucherIsNew, error: null });
      } catch (err: any) {
        setHudAnalysis({ ipMatch: null, voucherIsNew: null, error: err.message || "An unexpected error occurred." });
      } finally {
        setIsHudLoading(false);
      }
    };
    analyzeReport();
  }, [selectedReport, admin.getVouchDocument, admin.getUserDocument]);

  const filteredItems = useMemo(() => {
    let items;
    switch (actionHubSearchType) {
        case 'job': items = allJobsForAdmin; break;
        case 'profile': items = allHelperProfilesForAdmin; break;
        case 'webboardPost': items = allWebboardPostsForAdmin; break;
        case 'blogPost': items = allBlogPostsForAdmin; break;
        default: return [];
    }
    return items.filter(item => {
        if (actionHubSearchType === 'blogPost' && blogStatusFilter !== 'all' && (item as BlogPost).status !== blogStatusFilter) return false;
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const title = (item as any).title || (item as any).profileTitle;
        const author = getAuthorDisplayName((item as any).userId, (item as any).authorDisplayName);
        return title.toLowerCase().includes(term) || author.toLowerCase().includes(term) || item.id.toLowerCase().includes(term);
    }).sort((a,b) => new Date((b as any).postedAt || (b as any).createdAt).getTime() - new Date((a as any).postedAt || (a as any).createdAt).getTime());
  }, [actionHubSearchType, searchTerm, allJobsForAdmin, allHelperProfilesForAdmin, allWebboardPostsForAdmin, allBlogPostsForAdmin, blogStatusFilter, getAuthorDisplayName]);

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

  const pendingReports = useMemo(() => vouchReports.filter(r => r.status === 'pending_review'), [vouchReports]);
  const resolvedReports = useMemo(() => vouchReports.filter(r => r.status !== 'pending_review'), [vouchReports]);
  
  if (currentUser?.role !== UserRole.Admin && currentUser?.role !== UserRole.Writer) {
    return <div className="p-8 text-center text-red-500 font-sans">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }
  
  let TABS: { id: AdminTab; label: string; icon: string, badgeCount?: number }[] = [
    { id: 'overview', label: 'Mission Control', icon: '🚀' },
    { id: 'action_hub', label: 'Action Hub', icon: '🛠️' },
    { id: 'vouch_reports', label: 'รายงาน Vouch', icon: '🛡️', badgeCount: pendingReports.length },
    { id: 'orion_command_center', label: 'Orion', icon: '🤖' },
    { id: 'articles', label: 'บทความ', icon: '📖' },
    { id: 'site_controls', label: 'ควบคุมระบบ', icon: '⚙️' },
  ];
  if (currentUser?.role === UserRole.Writer) {
    TABS = [{ id: 'articles', label: 'บทความ', icon: '📖' }];
    if (activeTab !== 'articles') setActiveTab('articles');
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview vouchReports={vouchReports} users={users} onSelectReport={handleSelectReport} getAuthorDisplayName={getAuthorDisplayName} />;
      case 'orion_command_center':
        return <div className="orion-cockpit"><OrionCommandCenter /></div>
      case 'action_hub':
        // Action Hub UI
        return <div>Action Hub UI...</div>
      case 'vouch_reports':
        // Vouch Reports UI
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
      case 'articles':
        // Articles UI (moved from default)
        return <div>Articles UI...</div>
      default:
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
        {renderContent()}
      </div>
    </div>
  );
};
