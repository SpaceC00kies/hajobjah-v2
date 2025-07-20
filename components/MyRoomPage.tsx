// components/MyRoomPage.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User, Job, HelperProfile, WebboardPost, EnrichedWebboardPost, EnrichedHelperProfile } from '../types/types.ts';
import { Button } from './Button.tsx';
import { UserProfilePage } from './UserProfilePage.tsx';
import { WebboardPostCard } from './WebboardPostCard.tsx';
import { JobCard } from './JobCard.tsx';
import { HelperCard } from './HelperCard.tsx';
import { useUser } from '../hooks/useUser.ts';
import { useWebboard } from '../hooks/useWebboard.ts';
import { useHelpers } from '../hooks/useHelpers.ts';
import { useJobs } from '../hooks/useJobs.ts';
import { useData } from '../context/DataContext.tsx';
import { getAuthorDisplayName as getAuthorDisplayNameUtil } from '@/utils/userUtils.ts';
import { isDateInPast, calculateDaysRemaining } from '../utils/dateUtils.ts';

const ProfileIcon = () => <span role="img" aria-label="Profile">👤</span>;
const JobsIcon = () => <span role="img" aria-label="Jobs">💼</span>;
const ServicesIcon = () => <span role="img" aria-label="Services">🛠️</span>;
const WebboardIcon = () => <span role="img" aria-label="Webboard">💬</span>;
const InterestedIcon = () => <span role="img" aria-label="Interested">⭐</span>;

export type ActiveTab = 'profile' | 'myJobs' | 'myHelperServices' | 'interests' | 'myWebboardPosts';
type ActiveSubTab = 'jobs' | 'helpers' | 'posts';

interface MyRoomPageProps {
  currentUser: User;
}

const formatDateDisplay = (dateInput?: string | Date | null): string => {
  if (!dateInput) return 'N/A';
  const dateObject = new Date(dateInput as string);
  if (isNaN(dateObject.getTime())) return "Processing...";
  return dateObject.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' น.';
};

const getExpiryWarning = (expiresAt: string | Date | undefined, isHiredOrUnavailable: boolean | undefined, isSuspicious: boolean | undefined): string | null => {
  if (!expiresAt || isHiredOrUnavailable || isSuspicious || isDateInPast(expiresAt)) return null;
  const daysLeft = calculateDaysRemaining(expiresAt);
  if (daysLeft > 0 && daysLeft <= 7) return `⏳ หมดอายุใน ${daysLeft} วัน`;
  return null;
};

export const MyRoomPage: React.FC<MyRoomPageProps> = ({ currentUser }) => {
  const router = useRouter();
  const { users, allJobsForAdmin, allHelperProfilesForAdmin, allWebboardPostsForAdmin, webboardComments, userInterests = [], openConfirmModal } = useData();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('jobs');
  
  const userActions = useUser();
  const webboardActions = useWebboard();
  const helperActions = useHelpers();
  const jobActions = useJobs();

  const getAuthorDisplayName = (userId: string, fallbackName?: string) => getAuthorDisplayNameUtil(userId, fallbackName, users);

  const actions = {
    editItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
      let path = '';
      if (itemType === 'job') path = `/post-job?edit=${itemId}`;
      if (itemType === 'profile') path = `/offer-help?edit=${itemId}`;
      if (itemType === 'webboardPost') path = `/webboard?edit=${itemId}`;
      if (path) router.push(path);
    },
    deleteItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
      openConfirmModal(`ยืนยันการลบ`, `คุณแน่ใจหรือไม่ว่าต้องการลบ${itemType === 'job' ? 'ประกาศงาน' : itemType === 'profile' ? 'โปรไฟล์' : 'กระทู้'}นี้?`, () => {
        if (itemType === 'job') jobActions.deleteJob(itemId);
        if (itemType === 'profile') helperActions.deleteHelperProfile(itemId);
        if (itemType === 'webboardPost') webboardActions.deleteWebboardPost(itemId);
      });
    },
    toggleHiredStatus: (itemId: string, itemType: 'job' | 'profile') => {
      if (itemType === 'job') jobActions.toggleHiredJob(itemId);
      if (itemType === 'profile') helperActions.onToggleUnavailableHelperProfileForUserOrAdmin(itemId);
    },
  };

  const userJobs = useMemo(() => allJobsForAdmin.filter(j => j.userId === currentUser.id).sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime()), [allJobsForAdmin, currentUser.id]);
  const userHelperProfiles = useMemo(() => allHelperProfilesForAdmin.filter(p => p.userId === currentUser.id).sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime()), [allHelperProfilesForAdmin, currentUser.id]);
  const userWebboardPosts = useMemo(() => allWebboardPostsForAdmin.filter(p => p.userId === currentUser.id).map(post => ({ ...post, authorDisplayName: getAuthorDisplayName(post.userId, post.authorDisplayName), commentCount: webboardComments.filter(c => c.postId === post.id).length, authorPhoto: currentUser?.photo || post.authorPhoto, isAuthorAdmin: currentUser?.role === 'Admin' } as EnrichedWebboardPost)).sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()), [allWebboardPostsForAdmin, currentUser.id, webboardComments, currentUser?.photo, currentUser?.role, getAuthorDisplayName]);
  const savedWebboardPosts = useMemo(() => {
    const savedIds = currentUser.savedWebboardPosts || [];
    return allWebboardPostsForAdmin.filter(p => savedIds.includes(p.id)).map(post => ({ ...post, authorDisplayName: getAuthorDisplayName(post.userId, post.authorDisplayName), commentCount: webboardComments.filter(c => c.postId === post.id).length, authorPhoto: users.find(u => u.id === post.userId)?.photo || post.authorPhoto, isAuthorAdmin: users.find(u => u.id === post.userId)?.role === 'Admin' } as EnrichedWebboardPost)).sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
  }, [allWebboardPostsForAdmin, currentUser.savedWebboardPosts, webboardComments, users, getAuthorDisplayName]);

  const interestedJobs = useMemo(() => allJobsForAdmin.filter(j => userInterests.some(i => i.targetType === 'job' && i.targetId === j.id)), [userInterests, allJobsForAdmin]);
  const interestedHelpers = useMemo(() => allHelperProfilesForAdmin.filter(p => userInterests.some(i => i.targetType === 'helperProfile' && i.targetId === p.id)).map(hp => ({ ...hp, userPhoto: users.find(u => u.id === hp.userId)?.photo, userAddress: users.find(u => u.id === hp.userId)?.address, verifiedExperienceBadge: hp.adminVerifiedExperience || false, profileCompleteBadge: !!users.find(u => u.id === hp.userId)?.profileComplete, warningBadge: hp.isSuspicious || false, interestedCount: hp.interestedCount || 0 } as EnrichedHelperProfile)), [userInterests, allHelperProfilesForAdmin, users]);

  const tabs: { id: ActiveTab; label: string; icon: JSX.Element; }[] = [{ id: 'profile', label: 'โปรไฟล์', icon: <ProfileIcon /> }, { id: 'myJobs', label: 'ประกาศงาน', icon: <JobsIcon /> }, { id: 'myHelperServices', label: 'งานที่เสนอ', icon: <ServicesIcon /> }, { id: 'interests', label: 'สิ่งที่สนใจ', icon: <InterestedIcon /> }, { id: 'myWebboardPosts', label: 'กระทู้ของฉัน', icon: <WebboardIcon /> }];

  const renderItemStatus = (item: Job | HelperProfile) => {
    const isJob = 'payment' in item;
    const isTrulyExpired = item.isExpired || (item.expiresAt ? isDateInPast(item.expiresAt) : false);
    let statusText = 'กำลังแสดง'; let statusColor = 'text-green-600';
    if (isJob && item.isHired) { statusText = 'มีคนทำแล้ว'; statusColor = 'text-blue-600'; }
    else if (!isJob && item.isUnavailable) { statusText = 'ไม่ว่าง'; statusColor = 'text-orange-600'; }
    else if (item.isSuspicious) { statusText = 'ถูกระงับชั่วคราว'; statusColor = 'text-red-600'; }
    else if (isTrulyExpired) { statusText = 'หมดอายุ'; statusColor = 'text-neutral-500'; }
    return <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>;
  };
  
  const renderEmptyState = (title: string, buttonText: string, targetPath: string) => ( <div className="text-center py-10 bg-white p-6 rounded-lg shadow-md border border-neutral-DEFAULT"><p className="text-xl text-neutral-dark mb-6 font-normal">{title}</p><Link href={targetPath} passHref><Button variant="primary" size="md">{buttonText}</Button></Link></div> );

  return (
    <div className="w-full h-full flex flex-col">
      <div className="sticky top-0 z-10" style={{ backgroundColor: 'rgba(250, 250, 244, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}><div className="border-b border-neutral-DEFAULT"><nav className="flex space-x-1 overflow-x-auto pb-px -mb-px" aria-label="Tabs">{tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap flex items-center py-3 px-4 text-sm font-sans font-medium rounded-t-lg border-b-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 ${activeTab === tab.id ? 'border-secondary text-secondary' : 'border-transparent text-neutral-medium hover:text-neutral-dark'}`}>{tab.icon}{tab.label}</button>))}</nav></div></div>
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div>
          {activeTab === 'profile' && <UserProfilePage currentUser={currentUser} onUpdateProfile={userActions.updateUserProfile} onCancel={() => {}} />}
          {activeTab === 'myJobs' && (<div>{userJobs.length === 0 ? renderEmptyState("คุณยังไม่มีประกาศงาน", "+ สร้างประกาศงานใหม่", '/post-job') : (<div className="space-y-4">{userJobs.map(job => (<div key={job.id} className="bg-white p-4 rounded-lg shadow border"><h4 className="font-semibold text-lg text-neutral-dark">{job.title}</h4><p className="text-xs text-neutral-medium mb-2">โพสต์เมื่อ: {formatDateDisplay(job.postedAt)}</p><div className="flex items-center gap-2 mb-3">{renderItemStatus(job)}<span className="text-amber-600 text-xs font-medium">{getExpiryWarning(job.expiresAt, job.isHired, job.isSuspicious)}</span></div><div className="flex flex-wrap gap-2"><Button onClick={() => actions.toggleHiredStatus(job.id, 'job')} variant="outline" size="sm" disabled={job.isSuspicious || isDateInPast(job.expiresAt)}>{job.isHired ? '🔄 แจ้งว่ายังหางาน' : '✅ แจ้งว่าได้งานแล้ว'}</Button><Button onClick={() => actions.editItem(job.id, 'job')} variant="outline" size="sm" disabled={job.isSuspicious}>✏️ แก้ไข</Button><Button onClick={() => actions.deleteItem(job.id, 'job')} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button></div></div>))}</div>)}</div>)}
          {activeTab === 'myHelperServices' && (<div>{userHelperProfiles.length === 0 ? renderEmptyState("คุณยังไม่มีโปรไฟล์ผู้ช่วย", "+ สร้างโปรไฟล์ใหม่", '/offer-help') : (<div className="space-y-4">{userHelperProfiles.map(profile => { const bumpDaysRemaining = profile.lastBumpedAt ? calculateDaysRemaining(new Date(new Date(profile.lastBumpedAt as string).getTime() + 30 * 24 * 60 * 60 * 1000)) : 0; const canBump = bumpDaysRemaining <= 0 && !isDateInPast(profile.expiresAt); return (<div key={profile.id} className="bg-white p-4 rounded-lg shadow border"><h4 className="font-semibold text-lg text-neutral-dark">{profile.profileTitle}</h4><p className="text-xs text-neutral-medium mb-2">โพสต์เมื่อ: {formatDateDisplay(profile.postedAt)}</p><div className="flex items-center gap-2 mb-3">{renderItemStatus(profile)}<span className="text-amber-600 text-xs font-medium">{getExpiryWarning(profile.expiresAt, profile.isUnavailable, profile.isSuspicious)}</span></div><div className="flex flex-wrap gap-2"><Button onClick={() => actions.toggleHiredStatus(profile.id, 'profile')} variant="outline" size="sm" disabled={profile.isSuspicious || isDateInPast(profile.expiresAt)}>{profile.isUnavailable ? '🟢 กลับมาว่าง' : '🔴 ไม่ว่างแล้ว'}</Button><Button onClick={() => helperActions.onBumpProfile(profile.id)} variant="outline" colorScheme="secondary" size="sm" disabled={!canBump || profile.isSuspicious || isDateInPast(profile.expiresAt)}>🚀 Bump {canBump ? '' : `(${bumpDaysRemaining}d)`}</Button><Button onClick={() => actions.editItem(profile.id, 'profile')} variant="outline" size="sm" disabled={profile.isSuspicious}>✏️ แก้ไข</Button><Button onClick={() => actions.deleteItem(profile.id, 'profile')} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button></div></div>); })}</div>)}</div>)}
          {activeTab === 'interests' && (<div><div className="flex border-b border-neutral-DEFAULT mb-4"><button onClick={() => setActiveSubTab('jobs')} className={`py-2 px-4 text-sm font-medium ${activeSubTab === 'jobs' ? 'border-b-2 border-secondary text-secondary' : 'text-neutral-medium hover:text-secondary'}`}>งาน ({interestedJobs.length})</button><button onClick={() => setActiveSubTab('helpers')} className={`py-2 px-4 text-sm font-medium ${activeSubTab === 'helpers' ? 'border-b-2 border-secondary text-secondary' : 'text-neutral-medium hover:text-secondary'}`}>ผู้ช่วย ({interestedHelpers.length})</button><button onClick={() => setActiveSubTab('posts')} className={`py-2 px-4 text-sm font-medium ${activeSubTab === 'posts' ? 'border-b-2 border-secondary text-secondary' : 'text-neutral-medium hover:text-secondary'}`}>กระทู้ ({savedWebboardPosts.length})</button></div><div>{activeSubTab === 'jobs' && (interestedJobs.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีงานที่สนใจ</p> : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">{interestedJobs.map(job => <JobCard key={job.id} job={job} onNavigateToPublicProfile={(info) => router.push(`/profile/${info.userId}`)} currentUser={currentUser} requestLoginForAction={() => router.push('/login')} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={userActions.toggleInterest} isInterested={userInterests.some(i => i.targetId === job.id)} />)}</div>)}{activeSubTab === 'helpers' && (interestedHelpers.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีผู้ช่วยที่สนใจ</p> : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">{interestedHelpers.map(profile => <HelperCard key={profile.id} profile={profile} onNavigateToPublicProfile={(info) => router.push(`/profile/${info.userId}`)} onLogHelperContact={userActions.logContact} currentUser={currentUser} requestLoginForAction={() => router.push('/login')} onBumpProfile={helperActions.onBumpProfile} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={userActions.toggleInterest} isInterested={userInterests.some(i => i.targetId === profile.id)} />)}</div>)}{activeSubTab === 'posts' && (savedWebboardPosts.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีกระทู้ที่บันทึกไว้</p> : <div className="space-y-4">{savedWebboardPosts.map(post => <WebboardPostCard key={post.id} post={post} currentUser={currentUser} onViewPost={(id) => router.push(`/webboard/${id}`)} onToggleLike={webboardActions.toggleWebboardPostLike} onSavePost={userActions.saveWebboardPost} onSharePost={() => {}} requestLoginForAction={() => router.push('/login')} onNavigateToPublicProfile={(info) => router.push(`/profile/${info.userId}`)} getAuthorDisplayName={getAuthorDisplayName}/>)}</div>)}</div></div>)}
          {activeTab === 'myWebboardPosts' && (<div>{userWebboardPosts.length === 0 ? renderEmptyState("คุณยังไม่มีกระทู้", "+ สร้างกระทู้ใหม่", '/webboard') : (<div className="space-y-4">{userWebboardPosts.map(post => (<div key={post.id} className="bg-white p-4 rounded-lg shadow border"><h4 className="font-semibold text-lg text-neutral-dark">{post.title}</h4><p className="text-xs text-neutral-medium mb-2">โพสต์เมื่อ: {formatDateDisplay(post.createdAt)}</p><p className="text-xs font-sans text-neutral-medium mb-2"> ❤️ {post.likes.length} ไลค์ | 💬 {post.commentCount} คอมเมนต์ </p><div className="flex flex-wrap gap-2"><Button onClick={() => router.push(`/webboard/${post.id}`)} variant="outline" colorScheme="neutral" size="sm">👁️ ดูกระทู้</Button><Button onClick={() => actions.editItem(post.id, 'webboardPost')} variant="outline" size="sm">✏️ แก้ไข</Button><Button onClick={() => actions.deleteItem(post.id, 'webboardPost')} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button></div></div>))}</div>)}</div>)}
        </div>
      </main>
    </div>
  );
};
