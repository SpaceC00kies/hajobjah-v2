
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Job, HelperProfile, User, VouchReport, Vouch, BlogPost, WebboardPost, UserLevel } from '../types/types.ts';
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
import { subscribeToSiteConfigService } from '../services/adminService.ts';

export interface AdminItem {
  id: string;
  itemType: 'job' | 'profile' | 'webboardPost' | 'blogPost';
  title: string;
  authorDisplayName?: string;
  userId?: string;
  postedAt?: string | Date;
  isPinned?: boolean;
  isSuspicious?: boolean;
  isHiredOrUnavailable?: boolean;
  originalItem: Job | HelperProfile | WebboardPost | BlogPost;
  adminVerifiedExperience?: boolean;
  profileComplete?: boolean;
  likesCount?: number;
  commentsCount?: number;
  authorLevel?: UserLevel;
  status?: 'draft' | 'published' | 'archived';
  publishedAt?: string | Date;
}

type AdminTab = 'overview' | 'action_hub' | 'vouch_reports' | 'orion_command_center' | 'articles' | 'site_controls';
type ActionHubSubTab = 'job' | 'profile' | 'webboardPost' | 'user';

export const AdminDashboard: React.FC = () => {
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
  const [isSiteLocked, setIsSiteLocked] = useState(false);

  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = users.find(u => u && u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  }, [users]);
  
  useEffect(() => {
    const unsubscribe = subscribeToSiteConfigService((config) => {
      // Stricter check to only lock if the value is explicitly true.
      setIsSiteLocked(config.isSiteLocked === true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSearchTerm('');
  }, [activeTab, activeSubTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    if (openActionMenuId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openActionMenuId]);

  const onStartEditItem = (item: AdminItem) => {
    const { id, itemType, originalItem } = item;
    let path: string;
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
      if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
          switch (itemType) {
              case 'job': deleteJob(itemId); break;
              case 'profile': deleteHelperProfile(itemId); break;
              case 'webboardPost': deleteWebboardPost(itemId); break;
          }
      }
  }, [deleteJob, deleteHelperProfile, deleteWebboardPost]);
  
  const handleSelectReport = (report: VouchReport) => {
      setSelectedReport(report);
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
        if (!vouch) throw new Error("Vouch document not found.");

        const [voucherUser, voucheeUser] = await Promise.all([
            admin.getUserDocument(vouch.voucherId),
            admin.getUserDocument(vouch.voucheeId)
        ]);
        
        if (!voucherUser || !voucheeUser) throw new Error("Could not fetch full user data.");
        
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
        default: return [];
    }
    return items.filter(item => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const title = (item as any).title || (item as any).profileTitle;
        const author = getAuthorDisplayName((item as any).userId, (item as any).authorDisplayName);
        return title.toLowerCase().includes(term) || author.toLowerCase().includes(term) || item.id.toLowerCase().includes(term);
    }).sort((a,b) => new Date((b as any).postedAt || (b as any).createdAt).getTime() - new Date((a as any).postedAt || (a as any).createdAt).getTime());
  }, [activeSubTab, searchTerm, allJobsForAdmin, allHelperProfilesForAdmin, allWebboardPostsForAdmin, getAuthorDisplayName]);
  
  const filteredBlogItems = allBlogPostsForAdmin.filter(post => {
    if (blogStatusFilter !== 'all' && post.status !== blogStatusFilter) return false;
    if (searchTerm.trim() && activeTab === 'articles') {
      const term = searchTerm.toLowerCase();
      return post.title.toLowerCase().includes(term) || getAuthorDisplayName(post.authorId, post.authorDisplayName).toLowerCase().includes(term);
    }
    return true;
  });

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
    { id: 'site_controls', label: 'ควบคุมระบบ', icon: '⚙️' },
  ];

  if (currentUser?.role === UserRole.Writer) {
    TABS = [{ id: 'articles', label: 'บทความ', icon: '📖' }];
    if (activeTab !== 'articles') setActiveTab('articles');
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview vouchReports={vouchReports} users={users} onSelectReport={(r) => { setSelectedReport(r); setActiveTab('vouch_reports'); }} getAuthorDisplayName={getAuthorDisplayName} />;
      case 'action_hub':
        const subTabs: { id: ActionHubSubTab, label: string }[] = [
            { id: 'job', label: `งาน (${allJobsForAdmin.length})` },
            { id: 'profile', label: `โปรไฟล์ผู้ช่วย (${allHelperProfilesForAdmin.length})` },
            { id: 'webboardPost', label: `กระทู้ (${allWebboardPostsForAdmin.length})` },
            { id: 'user', label: `จัดการผู้ใช้ (${users.length})` },
        ];
        const currentData = activeSubTab === 'user' ? filteredUsers : filteredItems;

        return (
          <div className="bg-neutral-light/30 p-4 rounded-lg">
            <div className="flex flex-wrap gap-2 mb-4">
                {subTabs.map(tab => (
                    <Button key={tab.id} onClick={() => setActiveSubTab(tab.id)} variant={activeSubTab === tab.id ? 'primary' : 'outline'} size="sm">
                        {tab.label}
                    </Button>
                ))}
            </div>
            <input type="search" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full mb-4" />
            <div className="overflow-x-auto bg-white rounded-md shadow">
                <table className="min-w-full divide-y divide-neutral-light/50 font-sans">
                    <thead className="bg-neutral-light/40">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-dark uppercase tracking-wider">
                                {activeSubTab === 'user' ? 'User' : 'Title'}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-dark uppercase tracking-wider">
                                {activeSubTab === 'user' ? 'Email / Role' : 'Author'}
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-dark uppercase tracking-wider">Status</th>
                            <th className="relative px-4 py-2"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-light/50">
                        {currentData.map(item => {
                             const isUser = 'username' in item;
                             const id = item.id;
                             const title = isUser ? `${item.publicDisplayName} (@${item.username})` : (item as any).title || (item as HelperProfile).profileTitle;
                             const subtitle = isUser ? `${item.email} | ${item.role}` : `@${getAuthorDisplayName((item as any).userId, (item as any).authorDisplayName)}`;
                             const canEdit = !isUser;
                             const itemType = isUser ? 'user' : activeSubTab;

                             return (
                                <tr key={id} className="hover:bg-primary-light/20">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-dark truncate max-w-xs" title={title}>{title}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-medium">{subtitle}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        {!isUser && (item as any).isPinned && <span className="mr-1" title="Pinned">📌</span>}
                                        {!isUser && (item as any).isSuspicious && <span className="mr-1" title="Suspicious">🚩</span>}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            {canEdit && <Button onClick={() => onStartEditItem(item as AdminItem)} size="sm">Edit</Button>}
                                            <div className="relative" ref={openActionMenuId === id ? actionMenuRef : null}>
                                                <Button onClick={() => setOpenActionMenuId(openActionMenuId === id ? null : id)} size="sm" variant="ghost">...</Button>
                                                {openActionMenuId === id && (
                                                    <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                                        <div className="py-1">
                                                            {!isUser && <button onClick={() => { onDeleteItem(id, itemType as any); setOpenActionMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50">Delete</button>}
                                                            {itemType === 'job' && <>
                                                                <button onClick={() => { admin.toggleSuspiciousJob(id); setOpenActionMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Toggle Suspicious</button>
                                                                <button onClick={() => { admin.togglePinnedJob(id); setOpenActionMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Toggle Pinned</button>
                                                                <button onClick={() => { admin.toggleVerifiedJob(id); setOpenActionMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Toggle Verified</button>
                                                            </>}
                                                            {itemType === 'profile' && <>
                                                                <button onClick={() => { admin.toggleSuspiciousHelperProfile(id); setOpenActionMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Toggle Suspicious</button>
                                                                <button onClick={() => { admin.togglePinnedHelperProfile(id); setOpenActionMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Toggle Pinned</button>
                                                                <button onClick={() => { admin.toggleVerifiedExperience(id); setOpenActionMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Toggle Verified Exp</button>
                                                            </>}
                                                            {itemType === 'webboardPost' && <button onClick={() => { admin.pinWebboardPost(id); setOpenActionMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Toggle Pinned</button>}
                                                            {isUser && <select value={(item as User).role} onChange={e => { admin.setUserRole(id, e.target.value as UserRole); setOpenActionMenuId(null); }} disabled={id === currentUser?.id} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                                {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                                                            </select>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                             )
                        })}
                    </tbody>
                </table>
            </div>
          </div>
        );
      case 'articles':
        return (
          <div className="bg-neutral-light/30 p-4 rounded-lg">
            <Button onClick={() => onStartEditItem({itemType: 'blogPost', originalItem: {} as BlogPost} as AdminItem)} variant="primary" size="sm" className="mb-4">+ Create New Post</Button>
            <div className="space-y-3">
              {filteredBlogItems.map(item => {
                const canEdit = currentUser?.role === UserRole.Admin || (currentUser?.role === UserRole.Writer && item.authorId === currentUser.id);
                return(
                    <div key={item.id} className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between">
                        <div className="flex-grow min-w-0">
                            <h4 className="text-md font-semibold text-primary-dark truncate">{item.title}</h4>
                            <p className="text-sm text-neutral-medium truncate">by {getAuthorDisplayName(item.authorId, item.authorDisplayName)}</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2 ml-4">
                            {canEdit && <Button onClick={() => onStartEditItem(item as AdminItem)} size="sm">Edit</Button>}
                            {canEdit && <Button onClick={() => { if(window.confirm('Delete this article?')) admin.deleteBlogPost(item.id, (item as BlogPost).coverImageURL); }} size="sm" colorScheme="accent">Delete</Button>}
                        </div>
                    </div>
                )
              })}
            </div>
          </div>
        );
      case 'vouch_reports':
         return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm border border-neutral-light/50">
                <h3 className="font-semibold text-neutral-dark mb-2">Pending ({pendingReports.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {pendingReports.map(r => (
                    <button key={r.id} onClick={() => handleSelectReport(r)} className={`w-full text-left p-3 rounded-lg transition-colors ${selectedReport?.id === r.id ? 'bg-primary-light ring-2 ring-primary' : 'bg-neutral-light/50 hover:bg-neutral-light'}`}>
                      <p className="font-semibold text-sm truncate text-neutral-dark">By: @{getAuthorDisplayName(r.reporterId)}</p>
                      <p className="text-xs text-neutral-medium truncate">On: @{getAuthorDisplayName(r.voucheeId)}</p>
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
                            <p>To: @{getAuthorDisplayName(selectedVouch.voucheeId)}</p>
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
                          <Button onClick={() => admin.resolveVouchReport(selectedReport.id, VouchReportStatus.ResolvedKept, selectedReport.vouchId, selectedReport.voucheeId, selectedVouch?.vouchType)} colorScheme="primary" size="sm" disabled={isHudLoading}>Keep Vouch</Button>
                          <Button onClick={() => admin.resolveVouchReport(selectedReport.id, VouchReportStatus.ResolvedDeleted, selectedReport.vouchId, selectedReport.voucheeId, selectedVouch?.vouchType)} colorScheme="accent" size="sm" disabled={isHudLoading}>Delete Vouch</Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : <div className="flex items-center justify-center h-full text-neutral-medium font-sans"><p>Select a report to view details.</p></div>}
              </div>
            </div>
          );
      case 'orion_command_center':
        return <div className="orion-cockpit"><OrionCommandCenter /></div>;
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
      default:
        return null;
    }
  }
  
  return (
    <div className="mt-6">
      {renderContent()}
    </div>
  );
};
