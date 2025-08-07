import React, { useState, useMemo, useCallback } from 'react';
import type { User, Job, HelperProfile, WebboardPost, EnrichedWebboardPost, EnrichedHelperProfile, BlogPost } from '../types/types.ts';
import { Button } from './Button.tsx';
import { UserProfilePage } from './UserProfilePage.tsx';
import { WebboardPostCard } from './WebboardPostCard.tsx';
import { JobCard } from './JobCard.tsx';
import { HelperCard } from './HelperCard.tsx';
import { BlogCard } from './BlogCard.tsx'; // Import BlogCard
import { useUser } from '../hooks/useUser.ts';
import { useJobs } from '../hooks/useJobs.ts';
import { useWebboard } from '../hooks/useWebboard.ts';
import { useHelpers } from '../hooks/useHelpers.ts';
import { useBlog } from '../hooks/useBlog.ts'; // Import useBlog
import { useData } from '../context/DataContext.tsx';
import { useUsers } from '../hooks/useUsers.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { isDateInPast, calculateDaysRemaining } from '../utils/dateUtils.ts';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmModal } from './ConfirmModal.tsx';
import { motion } from 'framer-motion';

const NewProfileIcon = () => <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"><path d="M21,20a2,2,0,0,1-2,2H5a2,2,0,0,1-2-2,6,6,0,0,1,6-6h6A6,6,0,0,1,21,20Zm-9-8A5,5,0,1,0,7,7,5,5,0,0,0,12,12Z"></path></svg>;
const NewJobsIcon = () => <svg fill="currentColor" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"><path d="M452,120h-76C376,53.726,322.274,0,256,0h0c-66.274,0-120,53.726-120,120H60c-33.137,0-60,26.863-60,60v272  c0,33.137,26.863,60,60,60h392c33.137,0,60-26.863,60-60V180C512,146.863,485.137,120,452,120z M256,60c33.137,0,60,26.863,60,60  H196C196,86.863,222.863,60,256,60z M402,260v20c0,16.569-13.431,30-30,30h0c-16.569,0-30-13.431-30-30v-20H170v20  c0,16.569-13.431,30-30,30h0c-16.569,0-30-13.431-30-30v-20c-16.569,0-30-13.431-30-30s13.431-30,30-30h292  c16.569,0,30,13.431,30,30S418.569,260,402,260z"/></svg>;
const NewServicesIcon = () => (
    <svg fill="currentColor" viewBox="0 0 455 455" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
        <g>
        	<path d="M167.902,112.277h10l71.584,0c13.807,0,25-11.193,25-25c0-13.807-11.193-25-25-25c0,0-27.048,0-73.844,0
        		c-47.213,0-96.608,24.17-96.608,24.17l-0.175,114.889C127.959,201.328,167.902,161.379,167.902,112.277z"/>
        	<path d="M430,202.277H274.487v-20.37l0.451,0.37h127.868c13.807,0,25-11.193,25-25s-11.193-25-25-25H196.214
        		c-9.53,56.099-58.43,98.964-117.179,99.056v136.773c0,0,49.395,24.616,96.608,24.616H372.81c13.93,0,25.223-11.293,25.223-25.223
        		s-11.292-25.223-25.223-25.223h-98.323v-20h128.319c13.807,0,25-11.193,25-25s-11.193-25-25-25H274.487v-20H430
        		c13.807,0,25-11.193,25-25S443.807,202.277,430,202.277z"/>
        	<rect y="71.447" width="50" height="311.66"/>
        </g>
    </svg>
);
const WebboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" /></svg>;
const InterestedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const ArticleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM2 10a8 8 0 1116 0 8 8 0 01-16 0z" /><path d="M12 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>; // Placeholder

export type ActiveTab = 'profile' | 'myJobs' | 'myHelperServices' | 'interests' | 'myWebboardPosts';
type ActiveInterestSubTab = 'jobs' | 'helpers' | 'posts' | 'articles';

interface MyRoomPageProps {
  showBanner: (message: string, type?: 'success' | 'error') => void;
}

const formatDateDisplay = (dateInput?: string | Date | null): string => {
  if (dateInput === null || dateInput === undefined) return 'N/A';
  let dateObject: Date;
  if (dateInput instanceof Date) dateObject = dateInput;
  else if (typeof dateInput === 'string') dateObject = new Date(dateInput);
  else if (typeof dateObject === 'object' && 'toDate' in dateObject && typeof (dateObject as any).toDate === 'function') dateObject = (dateObject as any).toDate();
  else return "Invalid date";
  if (isNaN(dateObject.getTime())) return "Processing...";
  return dateObject.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' น.';
};

const BUMP_COOLDOWN_DAYS_MY_ROOM = 30;

const getExpiryWarning = (expiresAt: string | Date | undefined, isHiredOrUnavailable: boolean | undefined, isSuspicious: boolean | undefined): string | null => {
  if (!expiresAt || isHiredOrUnavailable || isSuspicious || isDateInPast(expiresAt)) return null;
  const daysLeft = calculateDaysRemaining(expiresAt);
  if (daysLeft > 0 && daysLeft <= 7) return `⏳ หมดอายุใน ${daysLeft} วัน`;
  return null;
};

export const MyRoomPage: React.FC<MyRoomPageProps> = ({ showBanner }) => {
  const { activeTab = 'profile' } = useParams<{ activeTab: ActiveTab }>();
  const { currentUser } = useAuth();
  const { users } = useUsers();
  const { allJobsForAdmin, deleteJob, toggleHiredJob } = useJobs();
  const { allHelperProfilesForAdmin, deleteHelperProfile, onToggleUnavailableHelperProfileForUserOrAdmin, onBumpProfile } = useHelpers();
  const webboardActions = useWebboard();
  const { allWebboardPostsForAdmin, webboardComments, deleteWebboardPost } = webboardActions;
  const { userInterests, userSavedPosts: userSavedWebboardPosts } = useData();
  const { allBlogPosts } = useBlog();
  const userActions = useUser();
  const navigate = useNavigate();
  const userSavedBlogPosts = currentUser?.savedBlogPosts || [];


  const [activeInterestSubTab, setActiveInterestSubTab] = useState<ActiveInterestSubTab>('jobs');
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);
  
  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = users.find(u => u && u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  }, [users]);
  
  const userJobs = useMemo(() => allJobsForAdmin.filter(j => j.userId === currentUser?.id).sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime()), [allJobsForAdmin, currentUser?.id]);
  const userHelperProfiles = useMemo(() => allHelperProfilesForAdmin.filter(p => p.userId === currentUser?.id).sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime()), [allHelperProfilesForAdmin, currentUser?.id]);
  const userWebboardPosts = useMemo(() => allWebboardPostsForAdmin.filter(p => p.userId === currentUser?.id).map(post => ({ ...post, authorDisplayName: getAuthorDisplayName(post.userId, post.authorDisplayName), commentCount: webboardComments.filter(c => c.postId === post.id).length, authorPhoto: currentUser?.photo || post.authorPhoto, isAuthorAdmin: currentUser?.role === 'Admin' } as EnrichedWebboardPost)).sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()), [allWebboardPostsForAdmin, currentUser?.id, webboardComments, currentUser?.photo, currentUser?.role, getAuthorDisplayName]);

  const interestedJobs = useMemo(() => {
    return allJobsForAdmin
      .filter(j => userInterests.some(i => i.targetType === 'job' && i.targetId === j.id))
      .sort((a,b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime());
  }, [allJobsForAdmin, userInterests]);
  
  const interestedHelpers = useMemo(() => {
    return allHelperProfilesForAdmin
      .filter(p => userInterests.some(i => i.targetType === 'helperProfile' && i.targetId === p.id))
      .map(hp => ({
        ...hp,
        userPhoto: users.find(u => u.id === hp.userId)?.photo,
        userAddress: users.find(u => u.id === hp.userId)?.address,
        verifiedExperienceBadge: hp.adminVerifiedExperience || false,
        profileCompleteBadge: !!users.find(u => u.id === hp.userId)?.profileComplete,
        warningBadge: hp.isSuspicious || false,
        interestedCount: hp.interestedCount || 0,
      }))
      .sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime());
  }, [allHelperProfilesForAdmin, userInterests, users]);

  const savedWebboardPosts = useMemo(() => {
      return allWebboardPostsForAdmin
        .filter(p => userSavedWebboardPosts.includes(p.id))
        .map(post => ({ 
            ...post, 
            authorDisplayName: getAuthorDisplayName(post.userId, post.authorDisplayName), 
            commentCount: webboardComments.filter(c => c.postId === post.id).length, 
            authorPhoto: users.find(u => u.id === post.userId)?.photo || post.authorPhoto, 
            isAuthorAdmin: users.find(u => u.id === post.userId)?.role === 'Admin',
         }))
        .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
  }, [allWebboardPostsForAdmin, userSavedWebboardPosts, users, getAuthorDisplayName, webboardComments]);

  const savedBlogPosts = useMemo(() => {
      return allBlogPosts
        .filter(p => userSavedBlogPosts.includes(p.id))
        .map(post => ({ 
            ...post, 
            author: users.find(u => u.id === post.authorId),
         }));
  }, [allBlogPosts, userSavedBlogPosts, users]);


  const handleDelete = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost', title: string) => {
    setConfirmModalState({
        isOpen: true,
        title: `ยืนยันการลบ`,
        message: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${title}"? การกระทำนี้ไม่สามารถย้อนกลับได้`,
        onConfirm: () => {
            if (itemType === 'job') deleteJob(itemId);
            else if (itemType === 'profile') deleteHelperProfile(itemId);
            else if (itemType === 'webboardPost') deleteWebboardPost(itemId);
        }
    });
  };

  if (!currentUser) return null;

  const tabs: { id: ActiveTab; label: string; icon: JSX.Element }[] = [ { id: 'profile', label: 'โปรไฟล์', icon: <NewProfileIcon /> }, { id: 'myJobs', label: 'ประกาศงาน', icon: <NewJobsIcon /> }, { id: 'myHelperServices', label: 'โปรไฟล์ผู้ช่วย/บริการ', icon: <NewServicesIcon /> }, { id: 'interests', label: 'สิ่งที่สนใจ', icon: <InterestedIcon /> }, { id: 'myWebboardPosts', label: 'กระทู้ของฉัน', icon: <WebboardIcon /> }, ];
  const renderItemStatus = (item: Job | HelperProfile) => {
    const isJob = 'payment' in item; const isTrulyExpired = item.isExpired || (item.expiresAt ? isDateInPast(item.expiresAt) : false);
    let statusText = 'กำลังแสดง'; let statusColor = 'text-green-600';
    if (isJob && item.isHired) { statusText = 'มีคนทำแล้ว'; statusColor = 'text-blue-600'; }
    else if (!isJob && item.isUnavailable) { statusText = 'ไม่ว่าง'; statusColor = 'text-orange-600'; }
    else if (item.isSuspicious) { statusText = 'ถูกระงับชั่วคราว'; statusColor = 'text-red-600'; }
    else if (isTrulyExpired) { statusText = 'หมดอายุ'; statusColor = 'text-neutral-500'; }
    return <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>;
  };
  const renderEmptyState = (title: string, buttonText: string, path: string) => ( <div className="text-center py-10 bg-white p-6 rounded-lg shadow-md border border-neutral-DEFAULT"><p className="text-xl text-neutral-dark mb-6 font-normal">{title}</p><Button onClick={() => navigate(path)} variant="primary" size="md">{buttonText}</Button></div> );

  const NavContent = () => (
      <>
        {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => navigate(`/my-room/${tab.id}`)}
                className={`w-full text-left font-sans font-medium text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50
                            ${activeTab === tab.id ? 'bg-primary-light text-primary-dark font-semibold' : 'text-neutral-medium hover:bg-neutral-light/75 hover:text-primary-dark'}
                            lg:flex lg:items-center lg:gap-3 lg:py-3 lg:px-4
                            whitespace-nowrap flex items-center py-3 px-4 border-b-2 lg:border-b-0
                            `}
                aria-current={activeTab === tab.id ? 'page' : undefined}
            >
                {tab.icon}
                <span>{tab.label}</span>
            </button>
        ))}
      </>
  );

  return (
    <>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-3">
              <div className="sticky top-24">
                <div className="hidden lg:block bg-white p-3 rounded-xl shadow-md border border-neutral-DEFAULT/50 space-y-1">
                    <NavContent />
                </div>
                 <nav className="lg:hidden flex space-x-1 overflow-x-auto pb-px -mb-px border-b border-neutral-DEFAULT" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => navigate(`/my-room/${tab.id}`)}
                          className={`whitespace-nowrap flex items-center py-3 px-4 text-sm font-sans font-medium rounded-t-lg border-b-2 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-offset-0 focus:ring-primary/50
                                      ${activeTab === tab.id ? 'border-primary text-primary-dark' : 'border-transparent text-neutral-medium hover:text-primary-dark'}
                                    `}
                          aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                          {tab.icon}
                          <span className="ml-2">{tab.label}</span>
                        </button>
                    ))}
                 </nav>
              </div>
            </aside>

            <main className="lg:col-span-9">
                <header className="mb-6 pb-4 border-b border-neutral-DEFAULT/50">
                    <h1 className="text-3xl font-bold font-sans text-primary-dark text-center lg:text-left">ห้องของฉัน</h1>
                </header>
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                    {activeTab === 'profile' && <UserProfilePage currentUser={currentUser} onUpdateProfile={userActions.updateUserProfile} onCancel={() => {}} showBanner={showBanner} />}
                    {activeTab === 'myJobs' && (<div>{userJobs.length === 0 ? renderEmptyState("คุณยังไม่มีประกาศงาน", "+ สร้างประกาศงานใหม่", '/post-job') : (<div className="space-y-4">{userJobs.map(job => (<div key={job.id} className="bg-white p-4 rounded-lg shadow border"><h4 className="font-semibold text-lg text-neutral-dark">{job.title}</h4><p className="text-xs text-neutral-medium mb-2">โพสต์เมื่อ: {formatDateDisplay(job.postedAt)}</p><div className="flex items-center gap-2 mb-3">{renderItemStatus(job)}<span className="text-amber-600 text-xs font-medium">{getExpiryWarning(job.expiresAt, job.isHired, job.isSuspicious)}</span></div><div className="flex flex-wrap gap-2"><Button onClick={() => toggleHiredJob(job.id)} variant="outline" size="sm" disabled={job.isSuspicious || isDateInPast(job.expiresAt)}>{job.isHired ? '🔄 แจ้งว่ายังหางาน' : '✅ แจ้งว่าได้งานแล้ว'}</Button><Button onClick={() => navigate(`/job/edit/${job.id}`, { state: { from: 'MY_ROOM', originatingTab: 'myJobs', item: job }})} variant="outline" size="sm" disabled={job.isSuspicious}>✏️ แก้ไข</Button><Button onClick={() => handleDelete(job.id, 'job', job.title)} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button></div></div>))}</div>)}</div>)}
                    {activeTab === 'myHelperServices' && (<div>{userHelperProfiles.length === 0 ? renderEmptyState("คุณยังไม่มีโปรไฟล์ผู้ช่วย", "+ สร้างโปรไฟล์ใหม่", '/post-helper') : (<div className="space-y-4">{userHelperProfiles.map(profile => { const bumpDaysRemaining = profile.lastBumpedAt ? calculateDaysRemaining(new Date(new Date(profile.lastBumpedAt as string).getTime() + BUMP_COOLDOWN_DAYS_MY_ROOM * 24 * 60 * 60 * 1000)) : 0; const canBump = bumpDaysRemaining <= 0 && !isDateInPast(profile.expiresAt); return (<div key={profile.id} className="bg-white p-4 rounded-lg shadow border"><h4 className="font-semibold text-lg text-neutral-dark">{profile.profileTitle}</h4><p className="text-xs text-neutral-medium mb-2">โพสต์เมื่อ: {formatDateDisplay(profile.postedAt)}</p><div className="flex items-center gap-2 mb-3">{renderItemStatus(profile)}<span className="text-amber-600 text-xs font-medium">{getExpiryWarning(profile.expiresAt, profile.isUnavailable, profile.isSuspicious)}</span></div><div className="flex flex-wrap gap-2"><Button onClick={() => onToggleUnavailableHelperProfileForUserOrAdmin(profile.id)} variant="outline" size="sm" disabled={profile.isSuspicious || isDateInPast(profile.expiresAt)}>{profile.isUnavailable ? '🟢 แจ้งว่ากลับมาว่าง' : '🔴 แจ้งว่าไม่ว่างแล้ว'}</Button><Button onClick={() => onBumpProfile(profile.id)} variant="outline" colorScheme="secondary" size="sm" disabled={!canBump || profile.isSuspicious || isDateInPast(profile.expiresAt)}>🚀 Bump {canBump ? '' : `(${bumpDaysRemaining}d)`}</Button><Button onClick={() => navigate(`/helper/edit/${profile.id}`, { state: { from: 'MY_ROOM', originatingTab: 'myHelperServices', item: profile }})} variant="outline" size="sm" disabled={profile.isSuspicious}>✏️ แก้ไข</Button><Button onClick={() => handleDelete(profile.id, 'profile', profile.profileTitle)} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button></div></div>); })}</div>)}</div>)}
                    {activeTab === 'interests' && (<div><div className="flex border-b border-neutral-DEFAULT mb-4"><button onClick={() => setActiveInterestSubTab('jobs')} className={`py-2 px-4 text-sm font-medium ${activeInterestSubTab === 'jobs' ? 'border-b-2 border-primary text-primary-dark' : 'text-neutral-medium hover:text-primary-dark'}`}>ประกาศงาน ({interestedJobs.length})</button><button onClick={() => setActiveInterestSubTab('helpers')} className={`py-2 px-4 text-sm font-medium ${activeInterestSubTab === 'helpers' ? 'border-b-2 border-primary text-primary-dark' : 'text-neutral-medium hover:text-primary-dark'}`}>โปรไฟล์ผู้ช่วย & บริการ ({interestedHelpers.length})</button><button onClick={() => setActiveInterestSubTab('posts')} className={`py-2 px-4 text-sm font-medium ${activeInterestSubTab === 'posts' ? 'border-b-2 border-primary text-primary-dark' : 'text-neutral-medium hover:text-primary-dark'}`}>กระทู้ ({savedWebboardPosts.length})</button><button onClick={() => setActiveInterestSubTab('articles')} className={`py-2 px-4 text-sm font-medium ${activeInterestSubTab === 'articles' ? 'border-b-2 border-primary text-primary-dark' : 'text-neutral-medium hover:text-primary-dark'}`}>บทความ ({savedBlogPosts.length})</button></div><div>{activeInterestSubTab === 'jobs' && (interestedJobs.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีงานที่สนใจ</p> : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">{interestedJobs.map(job => {
                        const author = users.find(u => u.id === job.userId);
                        return <JobCard key={job.id} job={job} currentUser={currentUser} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={() => userActions.toggleInterest(job.id, 'job', job.userId)} isInterested={true} authorPhotoUrl={author?.photo} />;
                    })}</div>)}{activeInterestSubTab === 'helpers' && (interestedHelpers.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีผู้ช่วยที่สนใจ</p> : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">{interestedHelpers.map(profile => <HelperCard key={profile.id} profile={profile} currentUser={currentUser} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={() => userActions.toggleInterest(profile.id, 'helperProfile', profile.userId)} isInterested={true} />)}</div>)}{activeInterestSubTab === 'posts' && (savedWebboardPosts.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีกระทู้ที่บันทึกไว้</p> : <div className="space-y-4">{savedWebboardPosts.map(post => <WebboardPostCard key={post.id} post={post} currentUser={currentUser} onViewPost={(id) => navigate(`/webboard/post/${id}`)} onToggleLike={() => webboardActions.toggleWebboardPostLike(post.id)} onToggleSave={() => userActions.saveWebboardPost(post.id)} isSaved={true} requestLoginForAction={() => navigate('/login')} getAuthorDisplayName={getAuthorDisplayName} onSharePost={() => {}} />)}</div>)}{activeInterestSubTab === 'articles' && (savedBlogPosts.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีบทความที่บันทึกไว้</p> : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">{savedBlogPosts.map(post => <BlogCard key={post.id} post={post} onSelectPost={(slug) => navigate(`/blog/${slug}`)} />)}</div>)}</div></div>)}
                    {activeTab === 'myWebboardPosts' && (<div>{userWebboardPosts.length === 0 ? renderEmptyState("คุณยังไม่มีกระทู้", "+ สร้างกระทู้ใหม่", '/webboard') : (<div className="space-y-4">{userWebboardPosts.map(post => (<div key={post.id} className="bg-white p-4 rounded-lg shadow border"><h4 className="font-semibold text-lg text-neutral-dark">{post.title}</h4><p className="text-xs text-neutral-medium mb-2">โพสต์เมื่อ: {formatDateDisplay(post.createdAt)}</p><p className="text-xs font-sans text-neutral-medium mb-2"> ❤️ {post.likes.length} ไลค์ | 💬 {post.commentCount} คอมเมนต์ </p><div className="flex flex-wrap gap-2"><Button onClick={() => navigate(`/webboard/post/${post.id}`)} variant="outline" colorScheme="neutral" size="sm">👁️ ดูกระทู้</Button><Button onClick={() => navigate(`/webboard/post/${post.id}/edit`, { state: { from: 'MY_ROOM', originatingTab: 'myWebboardPosts', item: post }})} variant="outline" size="sm">✏️ แก้ไข</Button><Button onClick={() => handleDelete(post.id, 'webboardPost', post.title)} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button></div></div>))}</div>)}</div>)}
                </motion.div>
            </main>
        </div>
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