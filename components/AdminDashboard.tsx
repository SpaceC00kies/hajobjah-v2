import React, { useState, useEffect, useMemo } from 'react';
import type { Job, HelperProfile, User, Interaction, WebboardPost, WebboardComment, UserLevel, VouchReport, Vouch, VouchType, BlogPost } from '../types/types.ts';
import { UserRole, VouchReportStatus, VOUCH_TYPE_LABELS } from '../types/types.ts';
import { Button } from './Button.tsx';
import { OrionCommandCenter } from './OrionCommandCenter.tsx';
import { useJobs } from '../hooks/useJobs.ts';
import { useHelpers } from '../hooks/useHelpers.ts';
import { useAdmin } from '../hooks/useAdmin.ts';
import { useWebboard } from '../hooks/useWebboard.ts';
import { useBlog } from '../hooks/useBlog.ts';
import { formatDateDisplay } from '../utils/dateUtils.ts';
import { checkProfileCompleteness } from '../utils/userUtils.ts';
import { AdminOverview } from './admin/AdminOverview.tsx';

export interface AdminItem {
  id: string;
  itemType: 'job' | 'profile' | 'webboardPost' | 'blogPost';
  title: string;
  authorDisplayName?: string;
  userId?: string;
  postedAt?: string;
  isPinned?: boolean;
  isSuspicious?: boolean;
  isHiredOrUnavailable?: boolean;
  originalItem: Job | HelperProfile | WebboardPost | BlogPost;
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


interface AdminDashboardProps {
  jobs: Job[];
  helperProfiles: HelperProfile[];
  users: User[];
  interactions: Interaction[];
  webboardPosts: WebboardPost[];
  webboardComments: WebboardComment[];
  vouchReports: VouchReport[];
  allBlogPostsForAdmin: BlogPost[];
  onStartEditItem: (item: AdminItem) => void;
  onDeleteItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => void;
  currentUser: User | null;
  isSiteLocked: boolean;
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
  getUserDisplayBadge: (user: User) => UserLevel;
  getUserDocument: (userId: string) => Promise<User | null>; 
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  jobs,
  helperProfiles,
  users,
  interactions,
  webboardPosts,
  webboardComments,
  vouchReports,
  allBlogPostsForAdmin,
  onStartEditItem,
  onDeleteItem,
  currentUser,
  isSiteLocked,
  getAuthorDisplayName,
  getUserDisplayBadge,
  getUserDocument,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [blogStatusFilter, setBlogStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [selectedReport, setSelectedReport] = useState<VouchReport | null>(null);
  const [selectedVouch, setSelectedVouch] = useState<Vouch | null>(null);
  const [isHudLoading, setIsHudLoading] = useState(false);
  const [hudAnalysis, setHudAnalysis] = useState<{ ipMatch: boolean | null; voucherIsNew: boolean | null; error?: string | null }>({ ipMatch: null, voucherIsNew: null, error: null });
  
  const [actionHubSearchType, setActionHubSearchType] = useState<ActionHubSearchType>('job');

  const { toggleHiredJob } = useJobs();
  const { onToggleUnavailableHelperProfileForUserOrAdmin } = useHelpers();
  const admin = useAdmin();

  useEffect(() => {
    setSearchTerm('');
    if (activeTab !== 'action_hub') {
        // Reset search type if navigating away from the hub
        setActionHubSearchType('job');
    }
  }, [activeTab]);


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

        if (!getUserDocument) {
           setHudAnalysis({ ipMatch: null, voucherIsNew: null, error: "User service is unavailable for analysis." });
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
  }, [selectedReport, admin.getVouchDocument, getUserDocument]);

  if (currentUser?.role !== UserRole.Admin && currentUser?.role !== UserRole.Writer) return <div className="p-8 text-center text-red-500 font-sans">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;

  const ensureStringDate = (dateInput: string | Date | undefined): string | undefined => dateInput ? (dateInput instanceof Date ? dateInput.toISOString() : dateInput) : undefined;
  
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
            return jobs.filter(item => item.title.toLowerCase().includes(term) || getAuthorDisplayName(item.userId, item.authorDisplayName).toLowerCase().includes(term) || item.id.toLowerCase().includes(term));
        case 'profile':
            return helperProfiles.filter(item => item.profileTitle.toLowerCase().includes(term) || getAuthorDisplayName(item.userId, item.authorDisplayName).toLowerCase().includes(term) || item.id.toLowerCase().includes(term));
        case 'webboardPost':
            return webboardPosts.filter(item => item.title.toLowerCase().includes(term) || getAuthorDisplayName(item.userId, item.authorDisplayName).toLowerCase().includes(term) || item.id.toLowerCase().includes(term));
        case 'user':
            return users.filter(user => user.publicDisplayName.toLowerCase().includes(term) || user.username.toLowerCase().includes(term) || user.email.toLowerCase().includes(term) || user.id.toLowerCase().includes(term) || (user.mobile && user.mobile.includes(term)));
        default:
            return [];
    }
  }, [searchTerm, actionHubSearchType, jobs, helperProfiles, webboardPosts, users, getAuthorDisplayName]);

  
  const pendingVouchReportsCount = vouchReports.filter(r => r.status === 'pending_review').length;
  let TABS: { id: AdminTab; label: string; icon: string, badgeCount?: number }[] = [
    { id: 'overview', label: 'Mission Control', icon: '🎯' },
    { id: 'action_hub', label: 'Action Hub', icon: '🔍' },
    { id: 'vouch_reports', label: 'รายงาน Vouch', icon: '🛡️', badgeCount: pendingVouchReportsCount },
    { id: 'orion_command_center', label: 'Orion', icon: '🤖' },
    { id: 'articles', label: 'บทความ', icon: '📖' },
    { id: 'site_controls', label: 'ควบคุมระบบ', icon: '⚙️' },
  ];

  if (currentUser?.role === UserRole.Writer) {
    TABS = [{ id: 'articles', label: 'บทความ', icon: '📖' }];
    if (activeTab !== 'articles') setActiveTab('articles');
  }

  const searchTypes: { id: ActionHubSearchType; label: string; icon: string }[] = [
    { id: 'job', label: 'งาน', icon: '📢' },
    { id: 'profile', label: 'โปรไฟล์ผู้ช่วย', icon: '🧑‍🔧' },
    { id: 'webboardPost', label: 'กระทู้', icon: '💬' },
    { id: 'user', label: 'ผู้ใช้', icon: '👥' },
  ];


  return (
    <div className="p-4 sm:p-6 w-full">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
            <span role="img" aria-label="home" className="text-3xl">🏠</span>
            <span>Admin Dashboard</span>
        </h1>
        <nav className="dashboard-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`dashboard-nav-pill ${activeTab === tab.id ? 'active' : ''}`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badgeCount && tab.badgeCount > 0 ? (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {tab.badgeCount}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>
      
      {activeTab === 'overview' && currentUser?.role === UserRole.Admin && (
          <AdminOverview 
              vouchReports={vouchReports} 
              users={users}
              onSelectReport={handleSelectReport}
              getAuthorDisplayName={getAuthorDisplayName}
          />
      )}

      {activeTab === 'action_hub' && (
        <div>
            <div className="mb-4 flex gap-2 flex-wrap">
                {searchTypes.map(type => (
                    <button 
                        key={type.id}
                        onClick={() => setActionHubSearchType(type.id)}
                        className={`dashboard-nav-pill ${actionHubSearchType === type.id ? 'active' : ''}`}
                    >
                        {type.icon} {type.label}
                    </button>
                ))}
            </div>
            <input type="search" placeholder={`Search for a ${actionHubSearchType}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full mb-4" />
            
            {searchTerm.trim() && (
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-DEFAULT">
                        <thead className="bg-neutral-light/50">
                            <tr>
                                <th scope="col">{actionHubSearchType === 'user' ? 'User' : 'Title'}</th>
                                <th scope="col">{actionHubSearchType === 'user' ? 'Email / Role' : 'Author'}</th>
                                <th scope="col">Status</th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-neutral-DEFAULT">
                            {actionHubResults.map(item => {
                                let title: string, author: string, status: React.ReactNode, actions: React.ReactNode;
                                const itemType = actionHubSearchType;

                                if (itemType === 'user') {
                                    const user = item as User;
                                    title = `${user.publicDisplayName} (@${user.username})`;
                                    author = `${user.email} | ${user.role}`;
                                    status = <span>-</span>;
                                    actions = (<select value={user.role} onChange={e => admin.setUserRole(user.id, e.target.value as UserRole)} disabled={user.id === currentUser?.id}>{Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}</select>);
                                } else {
                                    const contentItem = item as Job | HelperProfile | WebboardPost;
                                    title = 'title' in contentItem ? contentItem.title : contentItem.profileTitle;
                                    author = getAuthorDisplayName(contentItem.userId, contentItem.authorDisplayName);
                                    status = <>{contentItem.isPinned && <span>Pinned </span>}{'isSuspicious' in contentItem && contentItem.isSuspicious && <span>Suspicious </span>}{('isHired' in contentItem && contentItem.isHired) || ('isUnavailable' in contentItem && contentItem.isUnavailable) && <span>Hired/Unavailable</span>}</>
                                    actions = (
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <Button onClick={() => onStartEditItem({id: item.id, itemType: itemType, originalItem: item, title: title})} size="sm">Edit</Button>
                                            <Button onClick={() => onDeleteItem(item.id, itemType as 'job' | 'profile' | 'webboardPost')} size="sm" colorScheme="accent">Delete</Button>
                                            {itemType === 'job' && (<><Button onClick={() => admin.toggleSuspiciousJob(item.id)} size="sm" variant="outline" colorScheme="accent">{'isSuspicious' in contentItem && contentItem.isSuspicious ? 'Unsuspicious' : 'Suspicious'}</Button><Button onClick={() => admin.togglePinnedJob(item.id)} size="sm" variant="outline">{contentItem.isPinned ? 'Unpin' : 'Pin'}</Button><Button onClick={() => toggleHiredJob(item.id)} size="sm" variant="outline">{('isHired' in contentItem && contentItem.isHired) ? 'Set Available' : 'Set Hired'}</Button></>)}
                                            {itemType === 'profile' && (<><Button onClick={() => admin.toggleSuspiciousHelperProfile(item.id)} size="sm" variant="outline" colorScheme="accent">{'isSuspicious' in contentItem && contentItem.isSuspicious ? 'Unsuspicious' : 'Suspicious'}</Button><Button onClick={() => admin.togglePinnedHelperProfile(item.id)} size="sm" variant="outline">{contentItem.isPinned ? 'Unpin' : 'Pin'}</Button><Button onClick={() => onToggleUnavailableHelperProfileForUserOrAdmin(item.id)} size="sm" variant="outline">{('isUnavailable' in contentItem && contentItem.isUnavailable) ? 'Set Available' : 'Set Unavailable'}</Button><Button onClick={() => admin.toggleVerifiedExperience(item.id)} size="sm" variant="outline">{('adminVerifiedExperience' in contentItem && contentItem.adminVerifiedExperience) ? 'Unverify' : 'Verify Exp.'}</Button></>)}
                                            {itemType === 'webboardPost' && (<Button onClick={() => admin.pinWebboardPost(item.id)} size="sm" variant="outline">{contentItem.isPinned ? 'Unpin' : 'Pin'}</Button>)}
                                        </div>
                                    )
                                }
                                return (<tr key={item.id}><td>{title}</td><td>{author}</td><td>{status}</td><td>{actions}</td></tr>)
                            })}
                        </tbody>
                    </table>
                 </div>
            )}
        </div>
      )}

      {activeTab === 'articles' && (<div><div className="mb-4 flex flex-col sm:flex-row gap-4"><input type="search" placeholder={`ค้นหาใน ${activeTab}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:flex-grow" /><div className="flex-shrink-0 w-full sm:w-48"><label htmlFor="blogStatusFilter" className="sr-only">Filter by status</label><select id="blogStatusFilter" value={blogStatusFilter} onChange={e => setBlogStatusFilter(e.target.value as any)} className="w-full"><option value="all">All Statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></div></div><Button onClick={() => onStartEditItem({itemType: 'blogPost', originalItem: {} as BlogPost} as AdminItem)} variant="primary" size="sm" className="mb-4">+ Create New Post</Button><div className="overflow-x-auto"><table className="min-w-full divide-y divide-neutral-DEFAULT"><thead className="bg-neutral-light/50"><tr><th scope="col">Title</th><th scope="col">Author</th><th scope="col">Status</th><th scope="col">Published Date</th><th scope="col">Actions</th></tr></thead><tbody className="bg-white divide-y divide-neutral-DEFAULT">{filteredBlogItems.map(item => { const canEdit = currentUser?.role === UserRole.Admin || (currentUser?.role === UserRole.Writer && item.authorId === currentUser.id); return(<tr key={item.id}><td>{item.title}</td><td>{getAuthorDisplayName(item.authorId, item.authorDisplayName)}</td><td><span>{item.status}</span></td><td>{item.publishedAt ? formatDateDisplay(item.publishedAt) : '—'}</td><td><div>{canEdit && <Button onClick={() => onStartEditItem({id: item.id, itemType: 'blogPost', originalItem: item, title: item.title})} size="sm">Edit</Button>}{canEdit && <Button onClick={() => admin.deleteBlogPost(item.id, (item as BlogPost).coverImageURL)} size="sm" colorScheme="accent">Delete</Button>}</div></td></tr>)})}</tbody></table></div></div>)}
      
      {activeTab === 'site_controls' && currentUser?.role === UserRole.Admin && (<div className="p-4 bg-neutral-light/50 rounded-lg"><h3 className="text-lg font-semibold text-neutral-700 mb-3">Site Controls</h3><div className="flex items-center justify-between p-4 bg-white rounded shadow"><p className="font-medium">Site Lock: {isSiteLocked ? "ON" : "OFF"}</p><Button onClick={() => admin.toggleSiteLock(isSiteLocked)} colorScheme={isSiteLocked ? "accent" : "primary"}>{isSiteLocked ? "Unlock Site" : "Lock Site"}</Button></div></div>)}
      
      {activeTab === 'orion_command_center' && currentUser?.role === UserRole.Admin && (<div className="orion-cockpit"><OrionCommandCenter /></div>)}

      {activeTab === 'vouch_reports' && currentUser?.role === UserRole.Admin && (<div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="md:col-span-1"><h3 className="text-lg font-semibold text-neutral-700 mb-3">Pending Reports ({pendingVouchReportsCount})</h3><div className="space-y-2 max-h-96 overflow-y-auto">{vouchReports.map(report => (<button key={report.id} onClick={() => setSelectedReport(report)} className={`block w-full text-left p-3 rounded-md ${selectedReport?.id === report.id ? 'bg-blue-100' : 'bg-neutral-light/50 hover:bg-neutral-light'}`}><p className="text-sm font-semibold truncate">Report on Vouch <code className="text-xs">{report.vouchId.substring(0, 6)}...</code></p><p className="text-xs text-neutral-medium">By: {getAuthorDisplayName(report.reporterId).substring(0, 15)}...</p></button>))}</div></div><div className="md:col-span-2 p-4 bg-neutral-light/50 rounded-lg"><h3 className="text-lg font-semibold text-neutral-700 mb-3">Report Details & HUD</h3>{selectedReport ? (<div><p><strong>Reporter Comment:</strong> {selectedReport.reporterComment}</p><hr className="my-2" /><p className="font-semibold">Vouch Info:</p>{isHudLoading ? <p>Loading Vouch Details...</p> : selectedVouch ? (<div><p>From: {selectedVouch.voucherDisplayName} ({selectedVouch.voucherId.substring(0,10)}...)</p><p>To: {getAuthorDisplayName(selectedVouch.voucheeId)} ({selectedVouch.voucheeId.substring(0,10)}...)</p><p>Type: {VOUCH_TYPE_LABELS[selectedVouch.vouchType]}</p><p>Vouch Comment: "{selectedVouch.comment}"</p></div>) : <p className="text-red-500">Vouch data not found.</p>}<hr className="my-2" /><p className="font-semibold">Risk Signals:</p>{isHudLoading ? <p>Analyzing...</p> : hudAnalysis.error ? (<p className="font-bold text-red-500">⚠️ Analysis Error: {hudAnalysis.error}</p>) : (<div>{hudAnalysis.ipMatch === null ? <p>IP check pending...</p> : hudAnalysis.ipMatch ? <p className="font-bold text-red-500">⚠️ IP ADDRESS MATCH</p> : <p className="text-green-600">✅ IP addresses do not match.</p>}{hudAnalysis.voucherIsNew === null ? <p>Account age check pending...</p> : hudAnalysis.voucherIsNew ? <p className="font-bold text-orange-500">⚠️ VOUCHER IS NEW ACCOUNT (&lt;7 days)</p> : <p className="text-green-600">✅ Voucher account is not new.</p>}</div>)}<div className="mt-4 flex gap-4"><Button onClick={() => admin.resolveVouchReport(selectedReport.id, VouchReportStatus.ResolvedKept, selectedReport.vouchId, selectedReport.voucheeId, selectedVouch!.vouchType)} colorScheme="primary" disabled={isHudLoading || !selectedVouch}>Keep Vouch</Button><Button onClick={() => admin.resolveVouchReport(selectedReport.id, VouchReportStatus.ResolvedDeleted, selectedReport.vouchId, selectedReport.voucheeId, selectedVouch!.vouchType)} colorScheme="accent" disabled={isHudLoading || !selectedVouch}>Delete Vouch</Button></div></div>) : <p>Select a report to view details.</p>}</div></div>)}
    </div>
  );
};