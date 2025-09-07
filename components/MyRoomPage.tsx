import React, { useState, useMemo, useCallback } from 'react';
import type { User, Job, HelperProfile, WebboardPost, EnrichedWebboardPost, EnrichedHelperProfile, BlogPost } from '../types/types.ts';
import { Button } from './Button.tsx';
import { UserProfilePage } from './UserProfilePage.tsx';
import { WebboardPostCard } from './WebboardPostCard.tsx';
import { JobCard } from './JobCard.tsx';
import { HelperCard } from './HelperCard.tsx';
import { BlogCard } from './BlogCard.tsx';
import { useUser } from '../hooks/useUser.ts';
import { useJobs } from '../hooks/useJobs.ts';
import { useWebboard } from '../hooks/useWebboard.ts';
import { useHelpers } from '../hooks/useHelpers.ts';
import { useBlog } from '../hooks/useBlog.ts';
import { useData } from '../context/DataContext.tsx';
import { useUsers } from '../hooks/useUsers.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { isDateInPast, calculateDaysRemaining } from '../utils/dateUtils.ts';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmModal } from './ConfirmModal.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useApplications } from '../hooks/useApplications.ts';
import { AudioPlayer } from './AudioPlayer.tsx';



const ApplicantFallbackAvatar: React.FC<{ name: string }> = ({ name }) => (
    <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary-dark font-bold flex-shrink-0">
        {name.charAt(0).toUpperCase()}
    </div>
);


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
    return dateObject.toLocaleDateString('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' น.';
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
    const { allWebboardPostsForAdmin, webboardComments, deleteWebboardPost, pinWebboardPost } = webboardActions;
    const { userInterests, userSavedPosts: userSavedWebboardPosts } = useData();
    const { allBlogPosts } = useBlog();
    const userActions = useUser();
    const navigate = useNavigate();
    const userSavedBlogPosts = currentUser?.savedBlogPosts || [];
    const { applicationsForUserJobs } = useApplications();
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null);


    const [activeInterestSubTab, setActiveInterestSubTab] = useState<ActiveInterestSubTab>('jobs');
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);

    const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
        const author = users.find(u => u && u.id === userId);
        return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
    }, [users]);

    const userJobs = useMemo(() => allJobsForAdmin.filter(j => j.userId === currentUser?.id && !j.isExpired && !isDateInPast(j.expiresAt)).sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime()), [allJobsForAdmin, currentUser?.id]);
    const userHelperProfiles = useMemo(() => allHelperProfilesForAdmin.filter(p => p.userId === currentUser?.id && !p.isExpired && !isDateInPast(p.expiresAt)).sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime()), [allHelperProfilesForAdmin, currentUser?.id]);
    const userWebboardPosts = useMemo(() => allWebboardPostsForAdmin.filter(p => p.userId === currentUser?.id).map(post => ({ ...post, authorDisplayName: getAuthorDisplayName(post.userId, post.authorDisplayName), commentCount: webboardComments.filter(c => c.postId === post.id).length, authorPhoto: currentUser?.photo || post.authorPhoto, isAuthorAdmin: currentUser?.role === 'Admin' } as EnrichedWebboardPost)).sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()), [allWebboardPostsForAdmin, currentUser?.id, webboardComments, currentUser?.photo, currentUser?.role, getAuthorDisplayName]);

    const interestedJobs = useMemo(() => {
        return allJobsForAdmin
            .filter(j => userInterests.some(i => i.targetType === 'job' && i.targetId === j.id) && !j.isExpired && !isDateInPast(j.expiresAt))
            .sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime());
    }, [allJobsForAdmin, userInterests]);

    const interestedHelpers = useMemo(() => {
        return allHelperProfilesForAdmin
            .filter(p => userInterests.some(i => i.targetType === 'helperProfile' && i.targetId === p.id) && !p.isExpired && !isDateInPast(p.expiresAt))
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

    const tabs: { id: ActiveTab; label: string }[] = [
        { id: 'profile', label: 'โปรไฟล์' },
        { id: 'myJobs', label: 'ประกาศรับสมัคร' },
        { id: 'myHelperServices', label: 'เสนอโปรไฟล์' },
        { id: 'interests', label: 'สิ่งที่สนใจ' },
        // { id: 'myWebboardPosts', label: 'กระทู้ของฉัน' }, // Hidden while webboard is disabled
    ];
    const renderItemStatus = (item: Job | HelperProfile) => {
        const isJob = 'payment' in item; const isTrulyExpired = item.isExpired || (item.expiresAt ? isDateInPast(item.expiresAt) : false);
        let statusText = 'กำลังแสดง'; let statusColor = 'text-green-600';
        if (isJob && item.isHired) { statusText = 'มีคนทำแล้ว'; statusColor = 'text-blue-600'; }
        else if (!isJob && item.isUnavailable) { statusText = 'ไม่ว่าง'; statusColor = 'text-orange-600'; }
        else if (item.isSuspicious) { statusText = 'ถูกระงับชั่วคราว'; statusColor = 'text-red-600'; }
        else if (isTrulyExpired) { statusText = 'หมดอายุ'; statusColor = 'text-neutral-500'; }
        return <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>;
    };
    const renderEmptyState = (title: string, buttonText: string, path: string) => (<div className="text-center py-10 bg-white p-6 rounded-lg shadow-md border border-neutral-DEFAULT"><p className="text-xl text-neutral-dark mb-6 font-normal">{title}</p><Button onClick={() => navigate(path)} variant="primary" size="md">{buttonText}</Button></div>);

    const NavContent = () => (
        <>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => navigate(`/my-room/${tab.id}`)}
                    className={`w-full text-left font-sans font-medium text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50
                            ${activeTab === tab.id ? 'bg-primary-light text-primary-dark font-semibold' : 'text-neutral-medium hover:bg-neutral-light/75 hover:text-primary-dark'}
                            lg:flex lg:items-center lg:py-3 lg:px-4
                            whitespace-nowrap flex items-center py-3 px-4 border-b-2 lg:border-b-0
                            `}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                    <span>{tab.label}</span>
                </button>
            ))}
        </>
    );

    return (
        <>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    <aside className="lg:col-span-3">
                        <div className="sticky top-24">
                            <div className="hidden lg:block bg-white p-3 rounded-xl shadow-md border border-neutral-DEFAULT/50 space-y-1">
                                <NavContent />
                            </div>
                            <nav className="lg:hidden flex space-x-2 overflow-x-auto pb-3 scrollbar-hide" aria-label="Tabs">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => navigate(`/my-room/${tab.id}`)}
                                        className={`whitespace-nowrap flex items-center py-3 px-4 text-sm font-sans font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-fit
                                      ${activeTab === tab.id ? 'text-primary-dark bg-primary-light shadow-sm' : 'text-neutral-medium hover:text-primary-dark hover:bg-neutral-light/50'}
                                    `}
                                        aria-current={activeTab === tab.id ? 'page' : undefined}
                                    >
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    <main className="lg:col-span-9">
                        <header className="mb-6 pb-4 border-b border-neutral-DEFAULT/50">
                            <h1 className="text-2xl lg:text-3xl font-bold font-sans text-primary-dark text-center lg:text-left">ห้องของฉัน</h1>
                        </header>
                        <div>
                            {activeTab === 'profile' && <UserProfilePage currentUser={currentUser} onUpdateProfile={userActions.updateUserProfile} onCancel={() => { }} showBanner={showBanner} />}
                            {activeTab === 'myJobs' && (<div>{userJobs.length === 0 ? renderEmptyState("คุณยังไม่มีประกาศรับสมัคร", "+ ลงประกาศรับสมัครใหม่", '/post-job') : (<div className="space-y-4">{userJobs.map(job => {
                                const jobApps = applicationsForUserJobs.filter(app => app.jobId === job.id);
                                const isExpanded = expandedJobId === job.id;
                                return (<div key={job.id} className="bg-white p-4 rounded-lg shadow border transition-all duration-300">
                                    <div onClick={() => setExpandedJobId(isExpanded ? null : job.id)} className="cursor-pointer">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-semibold text-lg text-neutral-dark">{job.title}</h4>
                                            {jobApps.length > 0 && <span className="flex-shrink-0 ml-4 text-sm font-semibold bg-accent-peach text-primary-dark px-3 py-1 rounded-full">🎤 {jobApps.length} ใบสมัคร</span>}
                                        </div>
                                        <p className="text-xs text-neutral-medium mb-2">โพสต์เมื่อ: {formatDateDisplay(job.postedAt)}</p>
                                        <div className="flex items-center gap-2 mb-3">{renderItemStatus(job)}<span className="text-amber-600 text-xs font-medium">{getExpiryWarning(job.expiresAt, job.isHired, job.isSuspicious)}</span></div>
                                    </div>
                                    <div className="flex flex-wrap gap-2"><Button onClick={() => toggleHiredJob(job.id)} variant="outline" size="sm" disabled={job.isSuspicious || isDateInPast(job.expiresAt)}>{job.isHired ? '🔄 แจ้งว่ายังหางาน' : '✅ แจ้งว่าได้งานแล้ว'}</Button><Button onClick={() => navigate(`/job/edit/${job.id}`, { state: { from: 'MY_ROOM', originatingTab: 'myJobs', item: job } })} variant="outline" size="sm" disabled={job.isSuspicious}>✏️ แก้ไข</Button><Button onClick={() => handleDelete(job.id, 'job', job.title)} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button></div>
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                animate={{ height: 'auto', opacity: 1, marginTop: '16px' }}
                                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <h5 className="font-semibold text-md text-primary-dark border-t border-primary-light pt-3" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>ใบสมัครด้วยเสียง</h5>
                                                {jobApps.length > 0 ? (
                                                    <div className="space-y-3 mt-2">
                                                        {jobApps.map(app => (
                                                            <div key={app.id} className="flex flex-col gap-3 p-3 bg-neutral-light rounded-lg">
                                                                <div className="flex items-center gap-3">
                                                                    {app.applicantAvatar ? (
                                                                        <img src={app.applicantAvatar} alt={app.applicantName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                                                    ) : (
                                                                        <ApplicantFallbackAvatar name={app.applicantName} />
                                                                    )}
                                                                    <button onClick={() => navigate(`/profile/${app.applicantId}`)} className="font-semibold text-sm text-primary-dark hover:underline text-left">
                                                                        {app.applicantName}
                                                                    </button>
                                                                </div>
                                                                <div className="w-full max-w-sm">
                                                                    <AudioPlayer audioUrl={app.audioUrl} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-sm text-neutral-medium mt-2">ยังไม่มีใบสมัครด้วยเสียงสำหรับงานนี้</p>}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>)
                            })}</div>)}</div>)}
                            {activeTab === 'myHelperServices' && (<div>{userHelperProfiles.length === 0 ? renderEmptyState("คุณยังไม่มี👩🏻‍💼 เสนอโปรไฟล์", "+ ลงประกาศโปรไฟล์ใหม่", '/post-helper') : (<div className="space-y-4">{userHelperProfiles.map(profile => { return (<div key={profile.id} className="bg-white p-4 rounded-lg shadow border"><h4 className="font-semibold text-lg text-neutral-dark font-modern">{profile.profileTitle}</h4><p className="text-xs text-neutral-medium mb-2">โพสต์เมื่อ: {formatDateDisplay(profile.postedAt)}</p><div className="flex items-center gap-2 mb-3">{renderItemStatus(profile)}<span className="text-amber-600 text-xs font-medium">{getExpiryWarning(profile.expiresAt, profile.isUnavailable, profile.isSuspicious)}</span></div><div className="flex flex-wrap gap-2"><Button onClick={() => onToggleUnavailableHelperProfileForUserOrAdmin(profile.id)} variant="outline" size="sm" disabled={profile.isSuspicious || isDateInPast(profile.expiresAt)}>{profile.isUnavailable ? '🟢 แจ้งว่ากลับมาว่าง' : '🔴 แจ้งว่าไม่ว่างแล้ว'}</Button><Button onClick={() => navigate(`/helper/edit/${profile.id}`, { state: { from: 'MY_ROOM', originatingTab: 'myHelperServices', item: profile } })} variant="outline" size="sm" disabled={profile.isSuspicious}>✏️ แก้ไข</Button><Button onClick={() => handleDelete(profile.id, 'profile', profile.profileTitle)} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button></div></div>); })}</div>)}</div>)}
                            {activeTab === 'interests' && (<div><div className="flex overflow-x-auto mb-4 scrollbar-hide space-x-2 pb-3"><button onClick={() => setActiveInterestSubTab('jobs')} className={`py-3 px-4 text-sm font-modern font-medium whitespace-nowrap min-w-fit rounded-lg transition-all duration-200 ${activeInterestSubTab === 'jobs' ? 'text-primary-dark bg-primary-light shadow-sm' : 'text-neutral-medium hover:text-primary-dark hover:bg-neutral-light/50'}`}>ประกาศรับสมัคร ({interestedJobs.length})</button><button onClick={() => setActiveInterestSubTab('helpers')} className={`py-3 px-4 text-sm font-modern font-medium whitespace-nowrap min-w-fit rounded-lg transition-all duration-200 ${activeInterestSubTab === 'helpers' ? 'text-primary-dark bg-primary-light shadow-sm' : 'text-neutral-medium hover:text-primary-dark hover:bg-neutral-light/50'}`}>โปรไฟล์/บริการ ({interestedHelpers.length})</button><button onClick={() => setActiveInterestSubTab('articles')} className={`py-3 px-4 text-sm font-modern font-medium whitespace-nowrap min-w-fit rounded-lg transition-all duration-200 ${activeInterestSubTab === 'articles' ? 'text-primary-dark bg-primary-light shadow-sm' : 'text-neutral-medium hover:text-primary-dark hover:bg-neutral-light/50'}`}>บทความ ({savedBlogPosts.length})</button></div><div>{activeInterestSubTab === 'jobs' && (interestedJobs.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีงานที่สนใจ</p> : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">{interestedJobs.map(job => {
                                const author = users.find(u => u.id === job.userId);
                                return <JobCard key={job.id} job={job} currentUser={currentUser} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={() => userActions.toggleInterest(job.id, 'job', job.userId)} isInterested={true} authorPhotoUrl={author?.photo} />;
                            })}</div>)}{activeInterestSubTab === 'helpers' && (interestedHelpers.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีผู้ช่วยที่สนใจ</p> : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">{interestedHelpers.map(profile => <HelperCard key={profile.id} profile={profile} currentUser={currentUser} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={() => userActions.toggleInterest(profile.id, 'helperProfile', profile.userId)} isInterested={true} />)}</div>)}{activeInterestSubTab === 'articles' && (savedBlogPosts.length === 0 ? <p className="text-center p-6 text-neutral-medium">ยังไม่มีบทความที่บันทึกไว้</p> : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">{savedBlogPosts.map(post => <BlogCard key={post.id} post={post} onSelectPost={(slug) => navigate(`/blog/${slug}`)} />)}</div>)}</div></div>)}

                        </div>
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