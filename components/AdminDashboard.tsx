
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Job, HelperProfile, User, VouchReport, Vouch, BlogPost, WebboardPost } from '../types/types.ts';
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
import { formatDateDisplay, isDateInPast } from '../utils/dateUtils.ts';
import { AdminOverview } from './admin/AdminOverview.tsx';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserLevelBadge } from './UserLevelBadge.tsx';
import { getUserDisplayBadge } from '../utils/userUtils.ts';

type AdminTab = 'overview' | 'action_hub' | 'vouch_reports' | 'orion_command_center' | 'articles' | 'users' | 'site_controls';
type ActionHubSubTab = 'job' | 'profile' | 'webboardPost' | 'blogPost';

interface AdminDashboardProps {
  isSiteLocked: boolean;
}

const tableItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isSiteLocked }) => {
  const { currentUser } = useAuth();
  const { allJobsForAdmin, deleteJob } = useJobs();
  const { allHelperProfilesForAdmin, deleteHelperProfile } = useHelpers();
  const { users } = useUsers();
  const { allWebboardPostsForAdmin, deleteWebboardPost } = useWebboard();
  const { allBlogPostsForAdmin } = useBlog();
  const { vouchReports } = useData();
  const admin = useAdmin();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [activeSubTab, setActiveSubTab] = useState<ActionHubSubTab>('job');
  const [searchTerm, setSearchTerm] = useState('');
  const [blogStatusFilter, setBlogStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [selectedReport, setSelectedReport] = useState<VouchReport | null>(null);
  const [selectedVouch, setSelectedVouch] = useState<Vouch | null>(null);
  const [isHudLoading, setIsHudLoading] = useState(false);
  const [hudAnalysis, setHudAnalysis] = useState<{ ipMatch: boolean | null; voucherIsNew: boolean | null; error?: string | null }>({ ipMatch: null, voucherIsNew: null, error: null });
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  
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
  
  const onDeleteItem = useCallback((itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
      if (window.confirm('Are you sure you want to delete this item?')) {
          switch (itemType) {
              case 'job': deleteJob(itemId); break;
              case 'profile': deleteHelperProfile(itemId); break;
              case 'webboardPost': deleteWebboardPost(itemId); break;
          }
      }
  }, [deleteJob, deleteHelperProfile, deleteWebboardPost]);
  
  const handleSelectReport = (report: VouchReport) => {
      setSelectedReport(report);
      setActiveTab('vouch_reports');
  };

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
        const accountAge = new Date().getTime() - new Date(voucherUser.createdAt as string).getTime();
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
    switch (activeSubTab) {
        case 'job': items = allJobsForAdmin; break;
        case 'profile': items = allHelperProfilesForAdmin; break;
        case 'webboardPost': items = allWebboardPostsForAdmin; break;
        case 'blogPost': items = allBlogPostsForAdmin; break;
        default: return [];
    }
    return items.filter(item => {
        if (activeSubTab === 'blogPost' && blogStatusFilter !== 'all' && (item as BlogPost).status !== blogStatusFilter) return false;
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const title = (item as any).title || (item as any).profileTitle;
        const author = getAuthorDisplayName((item as any).userId, (item as any).authorDisplayName);
        return title.toLowerCase().includes(term) || author.toLowerCase().includes(term) || item.id.toLowerCase().includes(term);
    }).sort((a,b) => new Date((b as any).postedAt || (b as any).createdAt).getTime() - new Date((a as any).postedAt || (a as any).createdAt).getTime());
  }, [activeSubTab, searchTerm, allJobsForAdmin, allHelperProfilesForAdmin, allWebboardPostsForAdmin, allBlogPostsForAdmin, blogStatusFilter, getAuthorDisplayName]);

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
  
  if (currentUser?.role !== UserRole.Admin && currentUser?.role !== UserRole.Writer) {
    return <div className="p-8 text-center text-red-500 font-sans">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }
  
  let TABS: { id: AdminTab; label: string; icon: string, badgeCount?: number }[] = [
    { id: 'overview', label: 'Mission Control', icon: '🚀' },
    { id: 'action_hub', label: 'Action Hub', icon: '🛠️' },
    { id: 'vouch_reports', label: 'รายงาน Vouch', icon: '🛡️', badgeCount: pendingReports.length },
    { id: 'orion_command_center', label: 'Orion', icon: '🤖' },
    { id: 'articles', label: 'บทความ', icon: '📖' },
    { id: 'users', label: 'จัดการผู้ใช้', icon: '👥' },
    { id: 'site_controls', label: 'ควบคุมระบบ', icon: '⚙️' },
  ];

  if (currentUser?.role === UserRole.Writer) {
    TABS = [{ id: 'articles', label: 'บทความ', icon: '📖' }];
    if (activeTab !== 'articles') setActiveTab('articles');
  }
  
  const renderActionHub = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['job', 'profile', 'webboardPost', 'blogPost'] as ActionHubSubTab[]).map(tab => (
          <Button key={tab} onClick={() => setActiveSubTab(tab)} variant={activeSubTab === tab ? 'primary' : 'outline'} size="sm">
            {tab === 'job' && `งาน (${allJobsForAdmin.length})`}
            {tab === 'profile' && `โปรไฟล์ผู้ช่วย (${allHelperProfilesForAdmin.length})`}
            {tab === 'webboardPost' && `กระทู้ (${allWebboardPostsForAdmin.length})`}
            {tab === 'blogPost' && `บทความ (${allBlogPostsForAdmin.length})`}
          </Button>
        ))}
      </div>
      <div className="relative">
        <input type="search" placeholder="Search by title, author, or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10" />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-medium">🔍</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-light/50">
          <thead className="bg-neutral-light/30">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">Title</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">Author</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">Date</th>
              <th className="relative px-4 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-light/50">
            <AnimatePresence>
              {filteredItems.map(item => (
                <motion.tr key={item.id} variants={tableItemVariants} initial="hidden" animate="visible" exit="hidden" layout>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-dark truncate max-w-xs">{item.title || (item as any).profileTitle}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-medium">@{getAuthorDisplayName((item as any).userId, (item as any).authorDisplayName)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {item.isPinned && <span className="mr-1" title="Pinned">📌</span>}
                    {item.isSuspicious && <span className="mr-1" title="Suspicious">🚩</span>}
                    {(item as any).isHiredOrUnavailable && <span className="mr-1" title="Unavailable/Hired">🚫</span>}
                    {activeSubTab === 'blogPost' && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{(item as BlogPost).status}</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-medium">{formatDateDisplay(item.postedAt || item.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                     <Button onClick={() => onStartEditItem(item)} size="sm" variant="outline" colorScheme="neutral">Edit</Button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderVouchReports = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm border border-neutral-light/50">
        <h3 className="font-semibold text-neutral-dark mb-2">Pending ({pendingReports.length})</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {pendingReports.map(r => (
            <button key={r.id} onClick={() => setSelectedReport(r)} className={`w-full text-left p-3 rounded-lg transition-colors ${selectedReport?.id === r.id ? 'bg-primary-light ring-2 ring-primary' : 'bg-neutral-light/50 hover:bg-neutral-light'}`}>
              <p className="font-semibold text-sm truncate text-neutral-dark">By: @{getAuthorDisplayName(r.reporterId)}</p>
              <p className="text-xs text-neutral-medium truncate">On: @{getVoucheeDisplayName(r.voucheeId)}</p>
              <p className="text-xs text-neutral-medium truncate mt-1">"{r.reporterComment.substring(0, 30)}..."</p>
            </button>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm border border-neutral-light/50">
        <h3 className="font-semibold text-lg text-neutral-dark mb-2">Heads-Up Display</h3>
        {selectedReport ? (
          <div className="text-sm space-y-3 font-sans">
            <p><strong>Reporter Comment:</strong> <span className="text-neutral-medium whitespace-pre-wrap">{selectedReport.reporterComment || 'N/A'}</span></p>
            <hr className="my-2"/>
            {isHudLoading ? <p>Loading analysis...</p> : (
              <>
                <p className="font-bold">Vouch Details:</p>
                {selectedVouch ? (
                  <div className="pl-2 border-l-2 border-primary-light">
                    <p>From: @{selectedVouch.voucherDisplayName}</p>
                    <p>To: @{getVoucheeDisplayName(selectedVouch.voucheeId)}</p>
                    <p>Type: {VOUCH_TYPE_LABELS[selectedVouch.vouchType]}</p>
                    {selectedVouch.comment && <p>Comment: "{selectedVouch.comment}"</p>}
                  </div>
                ) : <p className="text-red-500">Vouch not found.</p>}

                <p className="font-bold mt-3">Risk Signals:</p>
                 {hudAnalysis.error ? <p className="text-red-500">{hudAnalysis.error}</p> : (
                  <ul className="list-disc list-inside space-y-1">
                    <li className={hudAnalysis.ipMatch ? 'text-red-500 font-bold' : 'text-green-600'}>IP Match: {String(hudAnalysis.ipMatch)}</li>
                    <li className={hudAnalysis.voucherIsNew ? 'text-orange-500 font-bold' : 'text-green-600'}>Voucher is new account (&lt;7d): {String(hudAnalysis.voucherIsNew)}</li>
                  </ul>
                )}
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-light">
                  <Button onClick={() => admin.resolveVouchReport(selectedReport.id, VouchReportStatus.ResolvedKept, selectedReport.vouchId, selectedReport.voucheeId, selectedReport.vouchType)} colorScheme="primary" size="sm" disabled={isHudLoading}>Keep Vouch</Button>
                  <Button onClick={() => admin.resolveVouchReport(selectedReport.id, VouchReportStatus.ResolvedDeleted, selectedReport.vouchId, selectedReport.voucheeId, selectedReport.vouchType)} colorScheme="accent" size="sm" disabled={isHudLoading}>Delete Vouch</Button>
                </div>
              </>
            )}
          </div>
        ) : <div className="flex items-center justify-center h-full text-neutral-medium font-sans"><p>Select a report to view details.</p></div>}
      </div>
    </div>
  );
  
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview vouchReports={vouchReports} users={users} onSelectReport={handleSelectReport} getAuthorDisplayName={getAuthorDisplayName} />;
      case 'orion_command_center':
        return <div className="orion-cockpit"><OrionCommandCenter /></div>;
      case 'action_hub':
        return renderActionHub();
      case 'vouch_reports':
        return renderVouchReports();
      case 'site_controls':
        return (
            <div className="p-4 bg-white rounded-lg shadow-sm border border-neutral-light/50">
                <h3 className="text-lg font-semibold text-neutral-dark mb-3">Site Controls</h3>
                <div className="flex items-center justify-between p-4 bg-neutral-light/30 rounded-lg">
                    <p className="font-medium">Site Lock: <span className={isSiteLocked ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{isSiteLocked ? 'ON' : 'OFF'}</span></p>
                    <Button onClick={() => admin.toggleSiteLock(isSiteLocked)} colorScheme={isSiteLocked ? 'accent' : 'primary'}>
                        {isSiteLocked ? 'Unlock Site' : 'Lock Site'}
                    </Button>
                </div>
            </div>
        );
      case 'articles':
         return (
            <div>
              <Button onClick={() => onStartEditItem({ itemType: 'blogPost', originalItem: {} })} variant="primary" size="sm" className="mb-4">+ Create New Article</Button>
               <p className="text-neutral-medium font-sans">Article management is now available in the 'Action Hub' tab.</p>
            </div>
          );
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
