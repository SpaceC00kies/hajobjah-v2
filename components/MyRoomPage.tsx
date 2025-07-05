import React, { useState, useMemo, useEffect } from 'react';
import type { User, Job, HelperProfile, WebboardPost, WebboardComment, UserLevel, EnrichedWebboardPost, Interest, EnrichedHelperProfile } from '../types.ts';
import { View, UserTier } from '../types.ts';
import { Button } from './Button.tsx';
import { UserProfilePage } from './UserProfilePage.tsx';
import { WebboardPostCard } from './WebboardPostCard.tsx';
import { JobCard } from './JobCard.tsx';
import { HelperCard } from './HelperCard.tsx';
import { isDateInPast, calculateDaysRemaining } from '../App.tsx';

// Import icons
const ProfileIcon = () => <span role="img" aria-label="Profile" className="mr-1.5 sm:mr-2">👤</span>;
const JobsIcon = () => <span role="img" aria-label="Jobs" className="mr-1.5 sm:mr-2">💼</span>;
const ServicesIcon = () => <span role="img" aria-label="Services" className="mr-1.5 sm:mr-2">🛠️</span>;
const WebboardIcon = () => <span role="img" aria-label="Webboard" className="mr-1.5 sm:mr-2">💬</span>;
const InterestedIcon = () => <span role="img" aria-label="Interested" className="mr-1.5 sm:mr-2">⭐</span>;

export type ActiveTab = 'profile' | 'myJobs' | 'myHelperServices' | 'interests' | 'myWebboardPosts';
type ActiveSubTab = 'jobs' | 'helpers' | 'posts';


interface MyRoomPageProps {
  currentUser: User;
  users: User[];
  allJobsForAdmin: Job[];
  allHelperProfilesForAdmin: HelperProfile[];
  allWebboardPostsForAdmin: WebboardPost[];
  webboardComments: WebboardComment[];
  userInterests: Interest[];
  navigateTo: (view: View, payload?: any) => void;
  onEditItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost', originatingTab: ActiveTab) => void;
  onDeleteItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => void;
  onToggleHiredStatus: (itemId: string, itemType: 'job' | 'profile') => void;
  onUpdateUserProfile: (updatedData: Partial<User>) => Promise<boolean>;
  getUserDisplayBadge: (user: User | null | undefined) => UserLevel;
  onSavePost: (postId: string) => void;
  onBumpProfile: (profileId: string) => void;
  onNavigateToPublicProfile: (profileInfo: { userId: string; helperProfileId?: string }) => void;
  initialTab?: ActiveTab | null;
  onInitialTabProcessed?: () => void;
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
  onToggleInterest: (targetId: string, targetType: 'job' | 'helperProfile', targetOwnerId: string) => void;
  requestLoginForAction: (view: View, payload?: any) => void;
  onEditJobFromFindView?: (jobId: string) => void;
  onEditHelperProfileFromFindView?: (profileId: string) => void;
  onLogHelperContact: (helperProfileId: string) => void;
}

const formatDateDisplay = (dateInput?: string | Date | null): string => {
  if (dateInput === null || dateInput === undefined) return 'N/A';
  let dateObject: Date;
  if (dateInput instanceof Date) dateObject = dateInput;
  else if (typeof dateInput === 'string') dateObject = new Date(dateInput);
  else if (typeof dateInput === 'object' && 'toDate' in dateInput && typeof (dateInput as any).toDate === 'function') dateObject = (dateInput as any).toDate();
  else return "Invalid date";
  if (isNaN(dateObject.getTime())) return "Processing...";
  return dateObject.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' น.';
};

const BUMP_COOLDOWN_DAYS_MY_ROOM = 30;
const JOB_COOLDOWN_DAYS_DISPLAY = 3;
const HELPER_PROFILE_COOLDOWN_DAYS_DISPLAY = 3;
const MAX_ACTIVE_JOBS_FREE_TIER_DISPLAY = 3;
const MAX_ACTIVE_HELPER_PROFILES_FREE_TIER_DISPLAY = 1;
const MAX_ACTIVE_JOBS_BADGE_DISPLAY = 4;
const MAX_ACTIVE_HELPER_PROFILES_BADGE_DISPLAY = 2;

const getExpiryWarning = (expiresAt: string | Date | undefined, isHiredOrUnavailable: boolean | undefined, isSuspicious: boolean | undefined): string | null => {
  if (!expiresAt || isHiredOrUnavailable || isSuspicious || isDateInPast(expiresAt)) {
    return null;
  }
  const daysLeft = calculateDaysRemaining(expiresAt);
  if (daysLeft > 0 && daysLeft <= 7) {
    return `⏳ หมดอายุใน ${daysLeft} วัน`;
  }
  return null;
};


export const MyRoomPage: React.FC<MyRoomPageProps> = ({
  currentUser,
  users,
  allJobsForAdmin,
  allHelperProfilesForAdmin,
  allWebboardPostsForAdmin,
  webboardComments,
  userInterests = [],
  navigateTo,
  onEditItem,
  onDeleteItem,
  onToggleHiredStatus,
  onUpdateUserProfile,
  getUserDisplayBadge,
  onSavePost,
  onBumpProfile,
  onNavigateToPublicProfile,
  initialTab,
  onInitialTabProcessed,
  getAuthorDisplayName,
  onToggleInterest,
  requestLoginForAction,
  onEditJobFromFindView,
  onEditHelperProfileFromFindView,
  onLogHelperContact,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab || 'profile');
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('jobs');

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
    if (initialTab && onInitialTabProcessed) {
      onInitialTabProcessed();
    }
    const params = new URLSearchParams(window.location.search);
    const subTabFromUrl = params.get('subTab') as ActiveSubTab;
    if (subTabFromUrl && ['jobs', 'helpers', 'posts'].includes(subTabFromUrl)) {
      setActiveSubTab(subTabFromUrl);
    }
  }, [initialTab, activeTab, onInitialTabProcessed]);
  

  const handleSubTabChange = (subTab: ActiveSubTab) => {
    setActiveSubTab(subTab);
    const url = new URL(window.location.href);
    url.searchParams.set('subTab', subTab);
    window.history.replaceState({}, '', url);
  }

  const userJobs = useMemo(() => allJobsForAdmin.filter(job => job.userId === currentUser.id)
    .sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime()), [allJobsForAdmin, currentUser.id]);

  const userHelperProfiles = useMemo(() => allHelperProfilesForAdmin.filter(profile => profile.userId === currentUser.id)
    .sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime()), [allHelperProfilesForAdmin, currentUser.id]);

  const userWebboardPosts = useMemo(() => allWebboardPostsForAdmin.filter(post => post.userId === currentUser.id)
    .map(post => ({
      ...post,
      authorDisplayName: getAuthorDisplayName(post.userId, post.authorDisplayName),
      commentCount: webboardComments.filter(c => c.postId === post.id).length,
      authorPhoto: currentUser?.photo || post.authorPhoto,
      isAuthorAdmin: currentUser?.role === 'Admin',
    } as EnrichedWebboardPost))
    .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()), [allWebboardPostsForAdmin, currentUser.id, webboardComments, currentUser?.photo, currentUser?.role, getAuthorDisplayName]);

  const savedWebboardPosts = useMemo(() => {
    const savedIds = currentUser.savedWebboardPosts || [];
    return allWebboardPostsForAdmin
      .filter(post => savedIds.includes(post.id))
      .map(post => {
        const author = users.find(u => u.id === post.userId);
        return {
          ...post,
          authorDisplayName: getAuthorDisplayName(post.userId, post.authorDisplayName),
          commentCount: webboardComments.filter(c => c.postId === post.id).length,
          authorPhoto: author?.photo || post.authorPhoto,
          isAuthorAdmin: author?.role === 'Admin',
        } as EnrichedWebboardPost;
      })
      .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
  }, [allWebboardPostsForAdmin, currentUser.savedWebboardPosts, webboardComments, users, getAuthorDisplayName]);

  const interestedJobs = useMemo(() => {
    const interestedJobIds = userInterests.filter(i => i.targetType === 'job').map(i => i.targetId);
    return allJobsForAdmin.filter(j => interestedJobIds.includes(j.id));
  }, [userInterests, allJobsForAdmin]);
  
  const interestedHelpers = useMemo(() => {
    const interestedHelperIds = userInterests.filter(i => i.targetType === 'helperProfile').map(i => i.targetId);
    return allHelperProfilesForAdmin.filter(p => interestedHelperIds.includes(p.id))
      .map(hp => {
        const user = users.find(u => u.id === hp.userId);
        return { ...hp, userPhoto: user?.photo, userAddress: user?.address, verifiedExperienceBadge: hp.adminVerifiedExperience || false, profileCompleteBadge: user?.profileComplete || false, warningBadge: hp.isSuspicious || false, interestedCount: hp.interestedCount || 0, } as EnrichedHelperProfile;
      });
  }, [userInterests, allHelperProfilesForAdmin, users]);

  const {
    userActiveJobsCount,
    maxJobsAllowed,
    jobCooldownHoursRemaining,
    jobCanCreate,
  } = useMemo(() => {
    const activeJobs = userJobs.filter(
      job => !job.isExpired && (job.expiresAt ? !isDateInPast(job.expiresAt) : true)
    ).length;

    let maxJobs = (currentUser.tier === 'free' as UserTier) ? MAX_ACTIVE_JOBS_FREE_TIER_DISPLAY : 999;
    if (currentUser.activityBadge?.isActive) {
      maxJobs = MAX_ACTIVE_JOBS_BADGE_DISPLAY;
    }

    let cooldownHours = 0;
    const lastJobPostDate = currentUser.postingLimits?.lastJobPostDate;
    if (lastJobPostDate) {
      const jobCooldownTotalHours = JOB_COOLDOWN_DAYS_DISPLAY * 24;
      const hoursSinceLastJobPost = (new Date().getTime() - new Date(lastJobPostDate as string).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastJobPost < jobCooldownTotalHours) {
        cooldownHours = Math.ceil(jobCooldownTotalHours - hoursSinceLastJobPost);
      }
    }
    return {
      userActiveJobsCount: activeJobs,
      maxJobsAllowed: maxJobs,
      jobCooldownHoursRemaining: cooldownHours,
      jobCanCreate: cooldownHours <= 0,
    };
  }, [userJobs, currentUser]);
  
  const {
    userActiveHelperProfilesCount,
    maxHelperProfilesAllowed,
    helperProfileCooldownHoursRemaining,
    profileCanCreate,
  } = useMemo(() => {
    const activeProfiles = userHelperProfiles.filter(
      p => !p.isExpired && (p.expiresAt ? !isDateInPast(p.expiresAt) : true)
    ).length;
    let maxProfiles = (currentUser.tier === 'free' as UserTier) ? MAX_ACTIVE_HELPER_PROFILES_FREE_TIER_DISPLAY : 999;
    if (currentUser.activityBadge?.isActive) {
        maxProfiles = MAX_ACTIVE_HELPER_PROFILES_BADGE_DISPLAY;
    }

    let cooldownHours = 0;
    const lastHelperProfileDate = currentUser.postingLimits?.lastHelperProfileDate;
    if (lastHelperProfileDate) {
        const helperCooldownTotalHours = HELPER_PROFILE_COOLDOWN_DAYS_DISPLAY * 24;
        const hoursSinceLastHelperProfilePost = (new Date().getTime() - new Date(lastHelperProfileDate as string).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastHelperProfilePost < helperCooldownTotalHours) {
            cooldownHours = Math.ceil(helperCooldownTotalHours - hoursSinceLastHelperProfilePost);
        }
    }
    return {
      userActiveHelperProfilesCount: activeProfiles,
      maxHelperProfilesAllowed: maxProfiles,
      helperProfileCooldownHoursRemaining: cooldownHours,
      profileCanCreate: cooldownHours <= 0,
    };
  }, [userHelperProfiles, currentUser]);

  const tabs: { id: ActiveTab; label: string; icon: JSX.Element }[] = [
    { id: 'profile', label: 'โปรไฟล์', icon: <ProfileIcon /> },
    { id: 'myJobs', label: 'ประกาศงาน', icon: <JobsIcon /> },
    { id: 'myHelperServices', label: 'งานที่เสนอ', icon: <ServicesIcon /> },
    { id: 'interests', label: 'สิ่งที่สนใจ', icon: <InterestedIcon /> },
    { id: 'myWebboardPosts', label: 'กระทู้ของฉัน', icon: <WebboardIcon /> },
  ];

  const renderItemStatus = (item: Job | HelperProfile) => {
    const isJob = 'payment' in item;
    const isTrulyExpired = item.isExpired || (item.expiresAt ? isDateInPast(item.expiresAt) : false);
    let statusText = 'กำลังแสดง';
    let statusColor = 'text-green-600';

    if (isJob && item.isHired) { statusText = 'มีคนทำแล้ว'; statusColor = 'text-blue-600'; }
    else if (!isJob && item.isUnavailable) { statusText = 'ไม่ว่าง'; statusColor = 'text-orange-600'; }
    else if (item.isSuspicious) { statusText = 'ถูกระงับชั่วคราว'; statusColor = 'text-red-600'; }
    else if (isTrulyExpired) { statusText = 'หมดอายุ'; statusColor = 'text-neutral-500'; }
    return <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>;
  };
  
  const renderEmptyState = (title: string, buttonText: string, targetView: View) => (
    <div className="text-center py-10 bg-white p-6 rounded-lg shadow-md border border-neutral-DEFAULT">
      <svg className="mx-auto h-16 w-16 text-neutral-DEFAULT mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-xl text-neutral-dark mb-6 font-normal">{title}</p>
      <Button onClick={() => navigateTo(targetView)} variant="primary" size="md">{buttonText}</Button>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      {/* Fixed Tab Bar Container */}
      <div 
        className="sticky top-0 z-10"
        style={{
          backgroundColor: 'rgba(250, 250, 244, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div className="border-b border-neutral-DEFAULT">
          <nav className="flex space-x-1 overflow-x-auto pb-px -mb-px" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap flex items-center py-3 px-4 text-sm font-sans font-medium rounded-t-lg
                  border-b-2 transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-secondary/50
                  ${
                    activeTab === tab.id
                      ? 'border-secondary text-secondary'
                      : 'border-transparent text-neutral-medium hover:text-neutral-dark'
                  }
                `}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div>
          {activeTab === 'profile' && (
              <UserProfilePage currentUser={currentUser} onUpdateProfile={onUpdateUserProfile} onCancel={() => {}} />
          )}

          {activeTab === 'myJobs' && (
            <div>
              <div className="mb-6 p-4 bg-white shadow-md rounded-lg border border-neutral-DEFAULT">
                <h3 className="text-xl font-sans font-semibold text-neutral-dark mb-3 text-center">📊 สถานะประกาศงาน</h3>
                <div className="space-y-2 text-sm font-sans text-neutral-dark">
                  <div className="flex justify-between items-center p-2 bg-neutral-light/50 rounded">
                    <span>ประกาศงานที่ใช้งานอยู่: {userActiveJobsCount}/{maxJobsAllowed}</span>
                    {jobCanCreate ? <span className="text-green-600 font-medium">(พร้อมสร้าง)</span> : <span className="text-orange-600 font-medium">(เหลืออีก {jobCooldownHoursRemaining} ชม.)</span>}
                  </div>
                </div>
              </div>
              {userJobs.length === 0 ? renderEmptyState("คุณยังไม่มีประกาศงาน", "+ สร้างประกาศงานใหม่", View.PostJob) : (
                <div className="space-y-4">
                  {userJobs.map(job => (
                    <div key={job.id} className="bg-white p-4 rounded-lg shadow border">
                      <h4 className="font-semibold text-lg text-neutral-dark">{job.title}</h4>
                      <p className="text-xs text-neutral-medium mb-2">โพสต์เมื่อ: {formatDateDisplay(job.postedAt)}</p>
                      <div className="flex items-center gap-2 mb-3">
                        {renderItemStatus(job)}
                        <span className="text-amber-600 text-xs font-medium">{getExpiryWarning(job.expiresAt, job.isHired, job.isSuspicious)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => onToggleHiredStatus(job.id, 'job')} variant="outline" size="sm" disabled={job.isSuspicious || isDateInPast(job.expiresAt)}>{job.isHired ? '🔄 แจ้งว่ายังหางาน' : '✅ แจ้งว่าได้งานแล้ว'}</Button>
                        <Button onClick={() => onEditItem(job.id, 'job', 'myJobs')} variant="outline" size="sm" disabled={job.isSuspicious}>✏️ แก้ไข</Button>
                        <Button onClick={() => onDeleteItem(job.id, 'job')} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'myHelperServices' && (
            <div>
              <div className="mb-6 p-4 bg-white shadow-md rounded-lg border border-neutral-DEFAULT">
                <h3 className="text-xl font-sans font-semibold text-neutral-dark mb-3 text-center">📊 สถานะโปรไฟล์ผู้ช่วย</h3>
                <div className="space-y-2 text-sm font-sans text-neutral-dark">
                  <div className="flex justify-between items-center p-2 bg-neutral-light/50 rounded">
                    <span>โปรไฟล์ที่ใช้งานอยู่: {userActiveHelperProfilesCount}/{maxHelperProfilesAllowed}</span>
                    {profileCanCreate ? <span className="text-green-600 font-medium">(พร้อมสร้าง)</span> : <span className="text-orange-600 font-medium">(เหลืออีก {helperProfileCooldownHoursRemaining} ชม.)</span>}
                  </div>
                </div>
              </div>
              {userHelperProfiles.length === 0 ? renderEmptyState("คุณยังไม่มีโปรไฟล์ผู้ช่วย", "+ สร้างโปรไฟล์ใหม่", View.OfferHelp) : (
                <div className="space-y-4">
                  {userHelperProfiles.map(profile => {
                    const bumpDaysRemaining = profile.lastBumpedAt ? calculateDaysRemaining(new Date(new Date(profile.lastBumpedAt as string).getTime() + BUMP_COOLDOWN_DAYS_MY_ROOM * 24 * 60 * 60 * 1000)) : 0;
                    const canBump = bumpDaysRemaining <= 0 && !isDateInPast(profile.expiresAt);
                    return (
                      <div key={profile.id} className="bg-white p-4 rounded-lg shadow border">
                        <h4 className="font-semibold text-lg text-neutral-dark">{profile.profileTitle}</h4>
                        <p className="text-xs text-neutral-medium mb-2">โพสต์เมื่อ: {formatDateDisplay(profile.postedAt)}</p>
                        <div className="flex items-center gap-2 mb-3">
                          {renderItemStatus(profile)}
                          <span className="text-amber-600 text-xs font-medium">{getExpiryWarning(profile.expiresAt, profile.isUnavailable, profile.isSuspicious)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => onToggleHiredStatus(profile.id, 'profile')} variant="outline" size="sm" disabled={profile.isSuspicious || isDateInPast(profile.expiresAt)}>{profile.isUnavailable ? '🟢 แจ้งว่ากลับมาว่าง' : '🔴 แจ้งว่าไม่ว่างแล้ว'}</Button>
                          <Button onClick={() => onBumpProfile(profile.id)} variant="outline" colorScheme="secondary" size="sm" disabled={!canBump || profile.isSuspicious || isDateInPast(profile.expiresAt)}>🚀 Bump {canBump ? '' : `(${bumpDaysRemaining}d)`}</Button>
                          <Button onClick={() => onEditItem(profile.id, 'profile', 'myHelperServices')} variant="outline" size="sm" disabled={profile.isSuspicious}>✏️ แก้ไข</Button>
                          <Button onClick={() => onDeleteItem(profile.id, 'profile')} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'interests' && (
            <div>
              <div className="flex border-b border-neutral-DEFAULT mb-4">
                <button onClick={() => handleSubTabChange('jobs')} className={`py-2 px-4 text-sm font-medium ${activeSubTab === 'jobs' ? 'border-b-2 border-secondary text-secondary' : 'text-neutral-medium hover:text-secondary'}`}>งานที่สนใจ ({interestedJobs.length})</button>
                <button onClick={() => handleSubTabChange('helpers')} className={`py-2 px-4 text-sm font-medium ${activeSubTab === 'helpers' ? 'border-b-2 border-secondary text-secondary' : 'text-neutral-medium hover:text-secondary'}`}>ผู้ช่วยที่สนใจ ({interestedHelpers.length})</button>
                <button onClick={() => handleSubTabChange('posts')} className={`py-2 px-4 text-sm font-medium ${activeSubTab === 'posts' ? 'border-b-2 border-secondary text-secondary' : 'text-neutral-medium hover:text-secondary'}`}>กระทู้ที่บันทึก ({savedWebboardPosts.length})</button>
              </div>
              <div>
                {activeSubTab === 'jobs' && (
                  interestedJobs.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีงานที่สนใจ</p> : 
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {interestedJobs.map(job => <JobCard key={job.id} job={job} navigateTo={navigateTo} currentUser={currentUser} requestLoginForAction={requestLoginForAction} onEditJobFromFindView={onEditJobFromFindView} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={onToggleInterest} isInterested={userInterests.some(i => i.targetId === job.id)} />)}
                  </div>
                )}
                {activeSubTab === 'helpers' && (
                  interestedHelpers.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีผู้ช่วยที่สนใจ</p> :
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {interestedHelpers.map(profile => <HelperCard key={profile.id} profile={profile} onNavigateToPublicProfile={onNavigateToPublicProfile} navigateTo={navigateTo} onLogHelperContact={onLogHelperContact} currentUser={currentUser} requestLoginForAction={requestLoginForAction} onBumpProfile={onBumpProfile} onEditProfileFromFindView={onEditHelperProfileFromFindView} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={onToggleInterest} isInterested={userInterests.some(i => i.targetId === profile.id)} />)}
                  </div>
                )}
                {activeSubTab === 'posts' && (
                  savedWebboardPosts.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีกระทู้ที่บันทึกไว้</p> :
                  <div className="space-y-4">
                    {savedWebboardPosts.map(post => <WebboardPostCard key={post.id} post={post} currentUser={currentUser} onViewPost={(id) => navigateTo(View.Webboard, id)} onToggleLike={onToggleInterest as any} onSavePost={onSavePost} onSharePost={() => {}} requestLoginForAction={requestLoginForAction} onNavigateToPublicProfile={(info) => onNavigateToPublicProfile(info)} getAuthorDisplayName={getAuthorDisplayName}/>)}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'myWebboardPosts' && (
            <div>
              {userWebboardPosts.length === 0 ? renderEmptyState("คุณยังไม่มีกระทู้", "+ สร้างกระทู้ใหม่", View.Webboard) : (
                <div className="space-y-4">
                  {userWebboardPosts.map(post => (
                    <div key={post.id} className="bg-white p-4 rounded-lg shadow border">
                      <h4 className="font-semibold text-lg text-neutral-dark">{post.title}</h4>
                      <p className="text-xs text-neutral-medium mb-2">โพสต์เมื่อ: {formatDateDisplay(post.createdAt)}</p>
                      <p className="text-xs font-sans text-neutral-medium mb-2"> ❤️ {post.likes.length} ไลค์ | 💬 {post.commentCount} คอมเมนต์ </p>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => navigateTo(View.Webboard, post.id)} variant="outline" colorScheme="neutral" size="sm">👁️ ดูกระทู้</Button>
                        <Button onClick={() => onEditItem(post.id, 'webboardPost', 'myWebboardPosts')} variant="outline" size="sm">✏️ แก้ไข</Button>
                        <Button onClick={() => onDeleteItem(post.id, 'webboardPost')} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
