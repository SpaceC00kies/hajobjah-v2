

import React, { useState, useEffect } from 'react';
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

type AdminTab = 'jobs' | 'profiles' | 'webboard' | 'articles' | 'users' | 'site_controls' | 'vouch_reports' | 'orion_command_center';

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
  currentUser,
  isSiteLocked,
  getAuthorDisplayName,
  getUserDisplayBadge,
  getUserDocument,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('orion_command_center');
  const [searchTerm, setSearchTerm] = useState('');
  const [blogStatusFilter, setBlogStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [selectedReport, setSelectedReport] = useState<VouchReport | null>(null);
  const [selectedVouch, setSelectedVouch] = useState<Vouch | null>(null);
  const [isHudLoading, setIsHudLoading] = useState(false);
  const [hudAnalysis, setHudAnalysis] = useState<{ ipMatch: boolean | null; voucherIsNew: boolean | null; error?: string | null }>({ ipMatch: null, voucherIsNew: null, error: null });
  
  const { deleteJob, toggleHiredJob } = useJobs();
  const { onToggleUnavailableHelperProfileForUserOrAdmin } = useHelpers();
  const { deleteWebboardPost } = useWebboard();
  const admin = useAdmin();

  useEffect(() => setSearchTerm(''), [activeTab]);

  useEffect(() => {
    setHudAnalysis({ ipMatch: null, voucherIsNew: null, error: null });
    setSelectedVouch(null);
    if (!selectedReport) {
      setIsHudLoading(false);
      return;
    }
    setIsHudLoading(true);
    const analyzeReport = async () => {
      try {
        const vouch = await admin.getVouchDocument(selectedReport.vouchId);
        setSelectedVouch(vouch);
        if (!vouch) throw new Error("Vouch document could not be found.");
        if (!getUserDocument) throw new Error("getUserDocument service is not available.");
        const voucherUser = await getUserDocument(vouch.voucherId);
        const voucheeUser = await getUserDocument(vouch.voucheeId);
        if (!voucherUser || !voucheeUser) throw new Error(`Could not fetch full user data.`);
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
  
  const allContentItems: AdminItem[] = [
    ...(activeTab === 'articles' ? allBlogPostsForAdmin.map(post => ({ id: post.id, itemType: 'blogPost' as const, title: post.title, authorDisplayName: getAuthorDisplayName(post.authorId, post.authorDisplayName), userId: post.authorId, postedAt: ensureStringDate(post.createdAt), status: post.status, publishedAt: ensureStringDate(post.publishedAt), originalItem: post })) : []),
    ...(activeTab === 'jobs' ? jobs.map(job => ({ id: job.id, itemType: 'job' as const, title: job.title, authorDisplayName: getAuthorDisplayName(job.userId, job.authorDisplayName), userId: job.userId, postedAt: ensureStringDate(job.postedAt), isPinned: job.isPinned, isSuspicious: job.isSuspicious, isHiredOrUnavailable: job.isHired, originalItem: job })) : []),
    ...(activeTab === 'profiles' ? helperProfiles.map(profile => ({ id: profile.id, itemType: 'profile' as const, title: profile.profileTitle, authorDisplayName: getAuthorDisplayName(profile.userId, profile.authorDisplayName), userId: profile.userId, postedAt: ensureStringDate(profile.postedAt), isPinned: profile.isPinned, isSuspicious: profile.isSuspicious, isHiredOrUnavailable: profile.isUnavailable, adminVerifiedExperience: profile.adminVerifiedExperience, profileComplete: users.find(u => u.id === profile.userId) ? checkProfileCompleteness(users.find(u => u.id === profile.userId)!) : false, originalItem: profile })) : []),
    ...(activeTab === 'webboard' ? webboardPosts.map(post => ({ id: post.id, itemType: 'webboardPost' as const, title: post.title, authorDisplayName: getAuthorDisplayName(post.userId, post.authorDisplayName), userId: post.userId, postedAt: ensureStringDate(post.createdAt), isPinned: post.isPinned, isSuspicious: false, isHiredOrUnavailable: false, likesCount: post.likes.length, commentsCount: webboardComments.filter(c => c.postId === post.id).length, authorLevel: users.find(u => u.id === post.userId) ? getUserDisplayBadge(users.find(u => u.id === post.userId)!) : undefined, originalItem: post })) : []),
  ].sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime());

  const filteredItems = allContentItems.filter(item => {
    if (activeTab === 'jobs' && item.itemType !== 'job') return false;
    if (activeTab === 'profiles' && item.itemType !== 'profile') return false;
    if (activeTab === 'webboard' && item.itemType !== 'webboardPost') return false;
    if (activeTab === 'articles' && item.itemType !== 'blogPost') return false;
    if (item.itemType === 'blogPost' && blogStatusFilter !== 'all' && item.status !== blogStatusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const user = users.find(u => u.id === item.userId);
      return item.title.toLowerCase().includes(term) || (item.authorDisplayName && item.authorDisplayName.toLowerCase().includes(term)) || (user && user.username.toLowerCase().includes(term)) || (user && user.email.toLowerCase().includes(term)) || item.id.toLowerCase().includes(term);
    }
    return true;
  });
  
  const filteredUsers = users.filter(user => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return user.publicDisplayName.toLowerCase().includes(term) || user.username.toLowerCase().includes(term) || user.email.toLowerCase().includes(term) || user.id.toLowerCase().includes(term) || (user.mobile && user.mobile.includes(term));
    }
    return true;
  });
  
  const pendingVouchReportsCount = vouchReports.filter(r => r.status === 'pending_review').length;
  let TABS: { id: AdminTab; label: string, badgeCount?: number }[] = [
    { id: 'orion_command_center', label: 'Orion 🤖' }, { id: 'vouch_reports', label: '🛡️ รายงาน Vouch', badgeCount: pendingVouchReportsCount }, { id: 'jobs', label: '📢 งาน' }, { id: 'profiles', label: '🧑‍🔧 โปรไฟล์ผู้ช่วย' }, { id: 'webboard', label: '💬 กระทู้' }, { id: 'articles', label: '📖 บทความ' }, { id: 'users', label: '👥 จัดการผู้ใช้' }, { id: 'site_controls', label: '⚙️ ควบคุมระบบ' },
  ];
  if (currentUser?.role === UserRole.Writer) { TABS = [{ id: 'articles', label: '📖 บทความ' }]; if (activeTab !== 'articles') setActiveTab('articles'); }

  return (
    <div className="p-4 sm:p-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-sans font-semibold mb-4 text-center">🔐 Admin Dashboard</h2>
      <div className="border-b border-neutral-DEFAULT mb-4"><nav className="-mb-px flex flex-wrap gap-x-6" aria-label="Tabs">{TABS.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${activeTab === tab.id ? 'border-secondary text-secondary' : 'border-transparent text-neutral-medium hover:text-neutral-dark hover:border-neutral-DEFAULT'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1`} aria-current={activeTab === tab.id ? 'page' : undefined}>{tab.label}{tab.badgeCount && tab.badgeCount > 0 ? (<span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{tab.badgeCount}</span>) : null}</button>))}</nav></div>
      {['jobs', 'profiles', 'webboard', 'articles', 'users'].includes(activeTab) && (<div className="mb-4 flex flex-col sm:flex-row gap-4"><input type="search" placeholder={`ค้นหาใน ${activeTab}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:flex-grow" />{activeTab === 'articles' && (<div className="flex-shrink-0 w-full sm:w-48"><label htmlFor="blogStatusFilter" className="sr-only">Filter by status</label><select id="blogStatusFilter" value={blogStatusFilter} onChange={e => setBlogStatusFilter(e.target.value as any)} className="w-full"><option value="all">All Statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></div>)}</div>)}
      {activeTab === 'articles' && (<div><Button onClick={() => onStartEditItem({itemType: 'blogPost', originalItem: {} as BlogPost} as AdminItem)} variant="primary" size="sm" className="mb-4">+ Create New Post</Button><div className="overflow-x-auto"><table className="min-w-full divide-y divide-neutral-DEFAULT"><thead className="bg-neutral-light/50"><tr><th scope="col">Title</th><th scope="col">Author</th><th scope="col">Status</th><th scope="col">Published Date</th><th scope="col">Actions</th></tr></thead><tbody className="bg-white divide-y divide-neutral-DEFAULT">{filteredItems.filter(item => item.itemType === 'blogPost').map(item => { const canEdit = currentUser?.role === UserRole.Admin || (currentUser?.role === UserRole.Writer && item.userId === currentUser.id); return(<tr key={item.id}><td>{item.title}</td><td>{item.authorDisplayName}</td><td><span>{item.status}</span></td><td>{item.publishedAt ? formatDateDisplay(item.publishedAt) : '—'}</td><td><div>{canEdit && <Button onClick={() => onStartEditItem(item)} size="sm">Edit</Button>}{canEdit && <Button onClick={() => admin.deleteBlogPost(item.id, (item.originalItem as BlogPost).coverImageURL)} size="sm" colorScheme="accent">Delete</Button>}</div></td></tr>)})}</tbody></table></div></div>)}
      {['jobs', 'profiles', 'webboard'].includes(activeTab) && (<div className="overflow-x-auto"><table className="min-w-full divide-y divide-neutral-DEFAULT"><thead><tr><th>Title</th><th>Author</th><th>Status</th><th>Actions</th></tr></thead><tbody className="bg-white divide-y divide-neutral-DEFAULT">{filteredItems.map(item => (<tr key={`${item.itemType}-${item.id}`}><td>{item.title}</td><td>{item.authorDisplayName}</td><td>{item.isPinned && <span>Pinned </span>}{item.isSuspicious && <span>Suspicious </span>}{item.isHiredOrUnavailable && <span>Hired/Unavailable</span>}</td><td><div className="flex flex-wrap gap-2 justify-end"><Button onClick={() => onStartEditItem(item)} size="sm">Edit</Button><Button onClick={() => { if(item.itemType === 'job') deleteJob(item.id); else if (item.itemType === 'profile') admin.deleteHelperProfile(item.id); else deleteWebboardPost(item.id); }} size="sm" colorScheme="accent">Delete</Button>{item.itemType === 'job' && (<><Button onClick={() => admin.toggleSuspiciousJob(item.id)} size="sm" variant="outline" colorScheme="accent">{item.isSuspicious ? 'Unsuspicious' : 'Suspicious'}</Button><Button onClick={() => admin.togglePinnedJob(item.id)} size="sm" variant="outline">{item.isPinned ? 'Unpin' : 'Pin'}</Button><Button onClick={() => toggleHiredJob(item.id)} size="sm" variant="outline">{item.isHiredOrUnavailable ? 'Set Available' : 'Set Hired'}</Button></>)}{item.itemType === 'profile' && (<><Button onClick={() => admin.toggleSuspiciousHelperProfile(item.id)} size="sm" variant="outline" colorScheme="accent">{item.isSuspicious ? 'Unsuspicious' : 'Suspicious'}</Button><Button onClick={() => admin.togglePinnedHelperProfile(item.id)} size="sm" variant="outline">{item.isPinned ? 'Unpin' : 'Pin'}</Button><Button onClick={() => onToggleUnavailableHelperProfileForUserOrAdmin(item.id)} size="sm" variant="outline">{item.isHiredOrUnavailable ? 'Set Available' : 'Set Unavailable'}</Button><Button onClick={() => admin.toggleVerifiedExperience(item.id)} size="sm" variant="outline">{item.adminVerifiedExperience ? 'Unverify' : 'Verify Exp.'}</Button></>)}{item.itemType === 'webboardPost' && (<Button onClick={() => admin.pinWebboardPost(item.id)} size="sm" variant="outline">{item.isPinned ? 'Unpin' : 'Pin'}</Button>)}</div></td></tr>))}</tbody></table></div>)}
      {activeTab === 'users' && currentUser?.role === UserRole.Admin && (<div className="overflow-x-auto"><table className="min-w-full divide-y divide-neutral-DEFAULT"><thead className="bg-neutral-light/50"><tr><th>User</th><th>Role</th><th>Actions</th></tr></thead><tbody className="bg-white divide-y divide-neutral-DEFAULT">{filteredUsers.map(user => (<tr key={user.id}><td>{user.publicDisplayName} (@{user.username})</td><td>{user.role}</td><td><select value={user.role} onChange={e => admin.setUserRole(user.id, e.target.value as UserRole)} disabled={user.id === currentUser?.id}>{Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}</select></td></tr>))}</tbody></table></div>)}
      {activeTab === 'site_controls' && currentUser?.role === UserRole.Admin && (<div className="p-4 bg-neutral-light/50 rounded-lg"><h3 className="text-lg font-semibold text-neutral-700 mb-3">Site Controls</h3><div className="flex items-center justify-between p-4 bg-white rounded shadow"><p className="font-medium">Site Lock: {isSiteLocked ? "ON" : "OFF"}</p><Button onClick={() => admin.toggleSiteLock(isSiteLocked)} colorScheme={isSiteLocked ? "accent" : "primary"}>{isSiteLocked ? "Unlock Site" : "Lock Site"}</Button></div></div>)}
      {activeTab === 'orion_command_center' && currentUser?.role === UserRole.Admin && (<OrionCommandCenter />)}
      {activeTab === 'vouch_reports' && currentUser?.role === UserRole.Admin && (<div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="md:col-span-1"><h3 className="text-lg font-semibold text-neutral-700 mb-3">Pending Reports ({pendingVouchReportsCount})</h3><div className="space-y-2 max-h-96 overflow-y-auto">{vouchReports.map(report => (<button key={report.id} onClick={() => setSelectedReport(report)} className={`block w-full text-left p-3 rounded-md ${selectedReport?.id === report.id ? 'bg-blue-100' : 'bg-neutral-light/50 hover:bg-neutral-light'}`}><p className="text-sm font-semibold truncate">Report on Vouch <code className="text-xs">{report.vouchId.substring(0, 6)}...</code></p><p className="text-xs text-neutral-medium">By: {getAuthorDisplayName(report.reporterId).substring(0, 15)}...</p></button>))}</div></div><div className="md:col-span-2 p-4 bg-neutral-light/50 rounded-lg"><h3 className="text-lg font-semibold text-neutral-700 mb-3">Report Details & HUD</h3>{selectedReport ? (<div><p><strong>Reporter Comment:</strong> {selectedReport.reporterComment}</p><hr className="my-2" /><p className="font-semibold">Vouch Info:</p>{isHudLoading ? <p>Loading Vouch Details...</p> : selectedVouch ? (<div><p>From: {selectedVouch.voucherDisplayName} ({selectedVouch.voucherId.substring(0,10)}...)</p><p>To: {getAuthorDisplayName(selectedVouch.voucheeId)} ({selectedVouch.voucheeId.substring(0,10)}...)</p><p>Type: {VOUCH_TYPE_LABELS[selectedVouch.vouchType]}</p><p>Vouch Comment: "{selectedVouch.comment}"</p></div>) : <p className="text-red-500">Vouch data not found.</p>}<hr className="my-2" /><p className="font-semibold">Risk Signals:</p>{isHudLoading ? <p>Analyzing...</p> : hudAnalysis.error ? (<p className="font-bold text-red-500">⚠️ Analysis Error: {hudAnalysis.error}</p>) : (<div>{hudAnalysis.ipMatch === null ? <p>IP check pending...</p> : hudAnalysis.ipMatch ? <p className="font-bold text-red-500">⚠️ IP ADDRESS MATCH</p> : <p className="text-green-600">✅ IP addresses do not match.</p>}{hudAnalysis.voucherIsNew === null ? <p>Account age check pending...</p> : hudAnalysis.voucherIsNew ? <p className="font-bold text-orange-500">⚠️ VOUCHER IS NEW ACCOUNT (&lt;7 days)</p> : <p className="text-green-600">✅ Voucher account is not new.</p>}</div>)}<div className="mt-4 flex gap-4"><Button onClick={() => admin.resolveVouchReport(selectedReport.id, VouchReportStatus.ResolvedKept, selectedReport.vouchId, selectedReport.voucheeId, selectedVouch!.vouchType)} colorScheme="primary" disabled={isHudLoading || !selectedVouch}>Keep Vouch</Button><Button onClick={() => admin.resolveVouchReport(selectedReport.id, VouchReportStatus.ResolvedDeleted, selectedReport.vouchId, selectedReport.voucheeId, selectedVouch!.vouchType)} colorScheme="accent" disabled={isHudLoading || !selectedVouch}>Delete Vouch</Button></div></div>) : <p>Select a report to view details.</p>}</div></div>)}
    </div>
  );
};