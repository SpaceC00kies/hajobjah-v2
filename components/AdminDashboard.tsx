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
import { isDateInPast } from '../utils/dateUtils.ts';
import { getUserDocument } from '../services/userService.ts';
import { AdminOverview } from './admin/AdminOverview.tsx';
import { useNavigate } from 'react-router-dom';

type AdminTab = 'overview' | 'action_hub' | 'vouch_reports' | 'orion_command_center' | 'articles' | 'site_controls';
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

  const filteredBlogItems = allBlogPostsForAdmin.filter(post => {
    if (blogStatusFilter !== 'all' && post.status !== blogStatusFilter) return false;
    if (searchTerm.trim() && activeTab === 'articles') {
      const term = searchTerm.toLowerCase();
      return post.title.toLowerCase().includes(term) || getAuthorDisplayName(post.authorId, post.authorDisplayName).toLowerCase().includes(term);
    }
    return true;
  });

  const actionHubResults = useMemo(() => {
    if (!searchTerm.trim()) {
        return [];
    }
    const term = searchTerm.toLowerCase();

    switch (actionHubSearchType) {
        case 'job':
            return allJobsForAdmin.filter(item => {
                const isExpired = item.isExpired || (item.expiresAt ? isDateInPast(item.expiresAt) : false);
                if (isExpired) return false;
                return item.title.toLowerCase().includes(term) || getAuthorDisplayName(item.userId, item.authorDisplayName).toLowerCase().includes(term) || item.id.toLowerCase().includes(term);
            });
        case 'profile':
            return allHelperProfilesForAdmin.filter(item => {
                const isExpired = item.isExpired || (item.expiresAt ? isDateInPast(item.expiresAt) : false);
                if (isExpired) return false;
                return item.profileTitle.toLowerCase().includes(term) || getAuthorDisplayName(item.userId, item.authorDisplayName).toLowerCase().includes(term) || item.id.toLowerCase().includes(term);
            });
        case 'webboardPost':
            return allWebboardPostsForAdmin.filter(item => item.title.toLowerCase().includes(term) || getAuthorDisplayName(item.userId, item.authorDisplayName).toLowerCase().includes(term) || item.id.toLowerCase().includes(term));
        case 'user':
            return users.filter(user => user.publicDisplayName.toLowerCase().includes(term) || user.username.toLowerCase().includes(term) || user.email.toLowerCase().includes(term) || user.id.toLowerCase().includes(term) || (user.mobile && user.mobile.includes(term)));
        default:
            return [];
    }
  }, [searchTerm, actionHubSearchType, allJobsForAdmin, allHelperProfilesForAdmin, allWebboardPostsForAdmin, users, getAuthorDisplayName]);

  if (currentUser?.role !== UserRole.Admin && currentUser?.role !== UserRole.Writer) return <div className="p-8 text-center text-red-500 font-sans">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;

  
  const pendingReports = useMemo(() => vouchReports.filter(r => r.status === 'pending_review'), [vouchReports]);
  let TABS: { id: AdminTab; label: string; icon: string, badgeCount?: number }[] = [
    { id: 'overview', label: 'Mission Control', icon: '🎯' },
    { id: 'action_hub', label: 'Action Hub', icon: '🔍' },
    { id: 'vouch_reports', label: 'รายงาน Vouch', icon: '🛡️', badgeCount: pendingReports.length },
    { id: 'orion_command_center', label: 'Orion', icon: '🤖' },
    { id: 'articles', label: 'บทความ', icon: '📖' },
    { id: 'site_controls', label: 'ควบคุมระบบ', icon: '⚙️' },
  ];
  if (currentUser?.role === UserRole.Writer) { TABS = [{ id: 'articles', label: 'บทความ', icon: '📖' }]; if (activeTab !== 'articles') setActiveTab('articles'); }
  
  return (
    <div className="p-4 sm:p-6 w-full">
      {/* Rest of the component JSX, which is large and unchanged in structure, will go here. */}
    </div>
  );
};
