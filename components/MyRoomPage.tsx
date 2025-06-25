
import React, { useState, useMemo, useEffect } from 'react'; // Added useEffect
import type { User, Job, HelperProfile, WebboardPost, WebboardComment, UserLevel, EnrichedWebboardPost } from '../types';
import { View, UserTier } from '../types'; // Added UserTier
import { Button } from './Button';
import { UserProfilePage } from './UserProfilePage';
import { WebboardPostCard } from './WebboardPostCard'; // For Saved Posts
import { isDateInPast, calculateDaysRemaining } from '../App'; // Import utilities
import { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';

// Import icons (simple text for now, can be replaced with SVGs)
const ProfileIcon = () => <span role="img" aria-label="Profile" className="mr-1.5 sm:mr-2">👤</span>;
const JobsIcon = () => <span role="img" aria-label="Jobs" className="mr-1.5 sm:mr-2">💼</span>;
const ServicesIcon = () => <span role="img" aria-label="Services" className="mr-1.5 sm:mr-2">🛠️</span>;
const WebboardIcon = () => <span role="img" aria-label="Webboard" className="mr-1.5 sm:mr-2">💬</span>;
const SavedIcon = () => <span role="img" aria-label="Saved" className="mr-1.5 sm:mr-2">💾</span>;

export type ActiveTab = 'profile' | 'myJobs' | 'myHelperServices' | 'myWebboardPosts' | 'savedPosts';


interface MyRoomPageProps {
  currentUser: User;
  users: User[];
  allJobsForAdmin: Job[];
  allHelperProfilesForAdmin: HelperProfile[];
  allWebboardPostsForAdmin: WebboardPost[];
  webboardComments: WebboardComment[];
  navigateTo: (view: View, payload?: any) => void;
  onEditItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost', originatingTab: ActiveTab) => void; // Added originatingTab
  onDeleteItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => void;
  onToggleHiredStatus: (itemId: string, itemType: 'job' | 'profile') => void;
  onUpdateUserProfile: (updatedData: Partial<User>) => Promise<boolean>;
  getUserDisplayBadge: (user: User | null | undefined) => UserLevel;
  onSavePost: (postId: string) => void; // For un-saving
  onBumpProfile: (profileId: string) => void;
  onNavigateToPublicProfile: (profileInfo: { userId: string; helperProfileId?: string }) => void;
  initialTab?: ActiveTab | null; // New prop for initial tab
  onInitialTabProcessed?: () => void; // New prop to signal consumption
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
}

// Animation Variants
const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.07,
      delayChildren: 0.1,
    } as Transition,
  },
};

const itemVariants: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    } as Transition,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    } as Transition,
  },
};


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

// Constants for posting limits (mirrored from App.tsx or MyPostsPage for local use)
const JOB_COOLDOWN_DAYS_DISPLAY = 3;
const HELPER_PROFILE_COOLDOWN_DAYS_DISPLAY = 3;
const MAX_ACTIVE_JOBS_FREE_TIER_DISPLAY = 3;
const MAX_ACTIVE_HELPER_PROFILES_FREE_TIER_DISPLAY = 1;
const MAX_ACTIVE_JOBS_BADGE_DISPLAY = 4; // For users with activity badge
const MAX_ACTIVE_HELPER_PROFILES_BADGE_DISPLAY = 2; // For users with activity badge

/**
 * Determines if an expiry warning should be shown for a job or helper profile.
 * The warning "⏳ หมดอายุใน X วัน" is displayed if ALL of the following conditions are true:
 * 1. The item has a valid `expiresAt` date.
 * 2. The item is NOT hired (for jobs) or unavailable (for profiles).
 * 3. The item is NOT suspicious.
 * 4. The item has NOT already expired (i.e., `isDateInPast(expiresAt)` is false).
 * 5. The item is due to expire in 1 to 7 days (inclusive).
 *
 * @param expiresAt The expiration date of the item.
 * @param isHiredOrUnavailable Boolean indicating if the item is hired (job) or unavailable (profile).
 * @param isSuspicious Boolean indicating if the item is marked as suspicious.
 * @returns A string with the warning message if conditions are met, otherwise null.
 */
const getExpiryWarning = (expiresAt: string | Date | undefined, isHiredOrUnavailable: boolean | undefined, isSuspicious: boolean | undefined): string | null => {
  // Condition 1: expiresAt must exist.
  // Condition 2: Must NOT be hired/unavailable.
  // Condition 3: Must NOT be suspicious.
  // Condition 4: Must NOT be already past its expiry date.
  if (!expiresAt || isHiredOrUnavailable || isSuspicious || isDateInPast(expiresAt)) {
    return null;
  }

  const daysLeft = calculateDaysRemaining(expiresAt); // calculateDaysRemaining ensures daysLeft >= 0 if not expired.

  // Condition 5: Must be expiring within 1 to 7 days (inclusive).
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
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab || 'profile');

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
    if (initialTab && onInitialTabProcessed) {
      onInitialTabProcessed(); // Signal that the initialTab prop has been processed
    }
  }, [initialTab, activeTab, onInitialTabProcessed]);


  const userJobs = useMemo(() => allJobsForAdmin.filter(job => job.userId === currentUser.id)
    .sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime()), [allJobsForAdmin, currentUser.id]);

  const userHelperProfiles = useMemo(() => allHelperProfilesForAdmin.filter(profile => profile.userId === currentUser.id)
    .sort((a, b) => new Date(b.postedAt as string).getTime() - new Date(a.postedAt as string).getTime()), [allHelperProfilesForAdmin, currentUser.id]);

  const userWebboardPosts = useMemo(() => allWebboardPostsForAdmin.filter(post => post.userId === currentUser.id)
    .map(post => ({
      ...post,
      authorDisplayName: getAuthorDisplayName(post.userId, post.authorDisplayName), // Use live display name
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
          authorDisplayName: getAuthorDisplayName(post.userId, post.authorDisplayName), // Use live display name
          commentCount: webboardComments.filter(c => c.postId === post.id).length,
          authorPhoto: author?.photo || post.authorPhoto,
          isAuthorAdmin: author?.role === 'Admin',
        } as EnrichedWebboardPost;
      })
      .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
  }, [allWebboardPostsForAdmin, currentUser.savedWebboardPosts, webboardComments, users, getAuthorDisplayName]);


  const tabs: { id: ActiveTab; label: string; icon: JSX.Element }[] = [
    { id: 'profile', label: 'โปรไฟล์', icon: <ProfileIcon /> },
    { id: 'myJobs', label: 'ประกาศงาน', icon: <JobsIcon /> },
    { id: 'myHelperServices', label: 'งานที่เสนอ', icon: <ServicesIcon /> },
    { id: 'myWebboardPosts', label: 'กระทู้ของฉัน', icon: <WebboardIcon /> },
    { id: 'savedPosts', label: 'กระทู้ที่บันทึก', icon: <SavedIcon /> },
  ];

  const renderItemStatus = (item: Job | HelperProfile) => {
    const isJob = 'payment' in item;
    const isTrulyExpired = item.isExpired || (item.expiresAt ? isDateInPast(item.expiresAt) : false);
    let statusText = 'กำลังแสดง';
    let statusColor = 'text-green-600';

    if (isJob && item.isHired) {
      statusText = 'มีคนทำแล้ว';
      statusColor = 'text-blue-600';
    } else if (!isJob && item.isUnavailable) {
      statusText = 'ไม่ว่าง';
      statusColor = 'text-orange-600';
    } else if (item.isSuspicious) {
      statusText = 'ถูกระงับชั่วคราว';
      statusColor = 'text-red-600';
    } else if (isTrulyExpired) {
      statusText = 'หมดอายุ';
      statusColor = 'text-neutral-500';
    }
    return <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>;
  };


  // --- Posting Limit Calculations ---
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
    const canCreate = cooldownHours <= 0;

    return {
      userActiveJobsCount: activeJobs,
      maxJobsAllowed: maxJobs,
      jobCooldownHoursRemaining: cooldownHours,
      jobCanCreate: canCreate,
    };
  }, [userJobs, currentUser.tier, currentUser.activityBadge, currentUser.postingLimits]);

  const {
    userActiveHelperProfilesCount,
    maxHelperProfilesAllowed,
    helperProfileCooldownHoursRemaining,
    profileCanCreate,
  } = useMemo(() => {
    const activeProfiles = userHelperProfiles.filter(
      profile => !profile.isExpired && (profile.expiresAt ? !isDateInPast(profile.expiresAt) : true)
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
    const canCreate = cooldownHours <= 0;

    return {
      userActiveHelperProfilesCount: activeProfiles,
      maxHelperProfilesAllowed: maxProfiles,
      helperProfileCooldownHoursRemaining: cooldownHours,
      profileCanCreate: canCreate,
    };
  }, [userHelperProfiles, currentUser.tier, currentUser.activityBadge, currentUser.postingLimits]);


  const renderMyJobsTab = () => (
    <div className="space-y-4">
       <div className="mb-6 p-3 bg-neutral-light/50 shadow-sm rounded-lg border border-neutral-DEFAULT/30">
        <h3 className="text-md font-sans font-semibold text-neutral-700 mb-2 text-center">
         📊 สถานะประกาศงาน
        </h3>
        <div className="space-y-1 text-xs sm:text-sm font-sans text-neutral-dark">
          <div className="flex justify-between items-center p-1.5 bg-white/50 rounded">
            <span>จำนวนประกาศ: {userActiveJobsCount}/{maxJobsAllowed}</span>
            {jobCanCreate ? (
              <span className="text-green-600">✅ พร้อมสร้าง</span>
            ) : (
              <span className="text-orange-600">⏳ รออีก {jobCooldownHoursRemaining} ชั่วโมง</span>
            )}
          </div>
        </div>
      </div>

      {userJobs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-neutral-medium mb-4">คุณยังไม่ได้ลงประกาศงาน</p>
          <Button onClick={() => navigateTo(View.PostJob)} variant="primary" size="sm" disabled={!jobCanCreate && userActiveJobsCount >= maxJobsAllowed}>
            {jobCanCreate && userActiveJobsCount < maxJobsAllowed ? '+ สร้างประกาศงานใหม่' : 'ไม่สามารถสร้างได้ตอนนี้'}
          </Button>
        </div>
      ) : (
        userJobs.map(job => {
          const jobExpiryWarning = getExpiryWarning(job.expiresAt, job.isHired, job.isSuspicious);
          const isTrulyActiveAndNotExpiringSoon = !job.isHired && !job.isSuspicious && job.expiresAt && !isDateInPast(job.expiresAt) && !jobExpiryWarning;
          let daysRemainingText = null;
          if (isTrulyActiveAndNotExpiringSoon) {
            const daysLeft = calculateDaysRemaining(job.expiresAt);
            if (daysLeft > 0) {
              daysRemainingText = `(เหลือ ${daysLeft} วัน)`;
            }
          }
          return (
            <div key={job.id} className="bg-white p-4 rounded-lg shadow border">
              <h4 className="font-semibold text-lg text-primary mb-1">{job.title}</h4>
              <p className="text-xs text-neutral-medium mb-1">หมวดหมู่: {job.category} {job.subCategory && `(${job.subCategory})`}</p>
              <p className="text-xs text-neutral-medium mb-2">ลงประกาศเมื่อ: {formatDateDisplay(job.postedAt)}</p>
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                {renderItemStatus(job)}
                {jobExpiryWarning && <span className="text-xs text-amber-600">{jobExpiryWarning}</span>}
                {!jobExpiryWarning && daysRemainingText && <span className="text-xs text-sky-600">{daysRemainingText}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button onClick={() => onEditItem(job.id, 'job', activeTab)} variant="outline" colorScheme="neutral" size="sm" disabled={job.isSuspicious}>✏️ แก้ไข</Button>
                <Button onClick={() => onToggleHiredStatus(job.id, 'job')} variant="outline" colorScheme="neutral" size="sm" disabled={job.isSuspicious}>{job.isHired ? '🔄 แจ้งว่ายังหาคน' : '✅ แจ้งว่าได้คนแล้ว'}</Button>
                <Button onClick={() => onDeleteItem(job.id, 'job')} variant="outline" colorScheme="accent" size="sm" disabled={job.isSuspicious}>🗑️ ลบ</Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderMyHelperServicesTab = () => (
    <div className="space-y-4">
      <div className="mb-6 p-3 bg-neutral-light/50 shadow-sm rounded-lg border border-neutral-DEFAULT/30">
        <h3 className="text-md font-sans font-semibold text-neutral-700 mb-2 text-center">
         📊 สถานะโปรไฟล์ผู้ช่วย
        </h3>
        <div className="space-y-1 text-xs sm:text-sm font-sans text-neutral-dark">
          <div className="flex justify-between items-center p-1.5 bg-white/50 rounded">
            <span>จำนวนโปรไฟล์: {userActiveHelperProfilesCount}/{maxHelperProfilesAllowed}</span>
             {profileCanCreate ? (
              <span className="text-green-600">✅ พร้อมสร้าง</span>
            ) : (
              <span className="text-orange-600">⏳ รออีก {helperProfileCooldownHoursRemaining} ชั่วโมง</span>
            )}
          </div>
        </div>
      </div>

      {userHelperProfiles.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-neutral-medium mb-4">คุณยังไม่ได้สร้างโปรไฟล์ผู้ช่วย/บริการ</p>
          <Button onClick={() => navigateTo(View.OfferHelp)} variant="secondary" size="sm" disabled={!profileCanCreate && userActiveHelperProfilesCount >= maxHelperProfilesAllowed}>
             {profileCanCreate && userActiveHelperProfilesCount < maxHelperProfilesAllowed ? '+ สร้างโปรไฟล์ใหม่' : 'ไม่สามารถสร้างได้ตอนนี้'}
          </Button>
        </div>
      ) : (
        userHelperProfiles.map(profile => {
          const lastBump = currentUser.postingLimits.lastBumpDates?.[profile.id] || profile.lastBumpedAt;
          const bumpDaysLeft = lastBump ? calculateDaysRemaining(new Date(new Date(lastBump as string).getTime() + BUMP_COOLDOWN_DAYS_MY_ROOM * 24 * 60 * 60 * 1000)) : 0;
          const canBumpProfile = bumpDaysLeft === 0 && !profile.isExpired && !profile.isUnavailable && (profile.expiresAt ? !isDateInPast(profile.expiresAt) : true);
          const profileExpiryWarning = getExpiryWarning(profile.expiresAt, profile.isUnavailable, profile.isSuspicious);
          const isTrulyActiveAndNotExpiringSoon = !profile.isUnavailable && !profile.isSuspicious && profile.expiresAt && !isDateInPast(profile.expiresAt) && !profileExpiryWarning;
          let daysRemainingText = null;
          if (isTrulyActiveAndNotExpiringSoon) {
            const daysLeft = calculateDaysRemaining(profile.expiresAt);
            if (daysLeft > 0) {
              daysRemainingText = `(เหลือ ${daysLeft} วัน)`;
            }
          }
          return (
            <div key={profile.id} className="bg-white p-4 rounded-lg shadow border">
              <h4
                className="font-semibold text-lg text-secondary mb-1 cursor-pointer hover:underline"
                onClick={() => onNavigateToPublicProfile({ userId: profile.userId, helperProfileId: profile.id })}
                title="ดูโปรไฟล์สาธารณะ"
                aria-label={`ดูโปรไฟล์สาธารณะของ ${profile.profileTitle}`}
              >
                {profile.profileTitle}
              </h4>
              <p className="text-xs text-neutral-medium mb-1">หมวดหมู่: {profile.category} {profile.subCategory && `(${profile.subCategory})`}</p>
              <p className="text-xs text-neutral-medium mb-2">ลงประกาศเมื่อ: {formatDateDisplay(profile.postedAt)} (อัปเดตล่าสุด: {formatDateDisplay(profile.updatedAt)})</p>
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                {renderItemStatus(profile)}
                {profileExpiryWarning && <span className="text-xs text-amber-600">{profileExpiryWarning}</span>}
                {!profileExpiryWarning && daysRemainingText && <span className="text-xs text-sky-600">{daysRemainingText}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button onClick={() => onEditItem(profile.id, 'profile', activeTab)} variant="outline" colorScheme="neutral" size="sm" disabled={profile.isSuspicious}>✏️ แก้ไข</Button>
                <Button onClick={() => onToggleHiredStatus(profile.id, 'profile')} variant="outline" colorScheme="neutral" size="sm" disabled={profile.isSuspicious}>{profile.isUnavailable ? '🟢 แจ้งว่าว่าง' : '🔴 แจ้งว่าไม่ว่าง'}</Button>
                <Button
                  onClick={() => onBumpProfile(profile.id)}
                  variant="outline"
                  colorScheme="neutral" // Changed to neutral
                  size="sm"
                  disabled={!canBumpProfile || profile.isSuspicious}
                  title={canBumpProfile ? "Bump โปรไฟล์ของคุณขึ้นไปบนสุด" : profile.isSuspicious ? "ไม่สามารถ Bump โปรไฟล์ที่ถูกระงับ" : `รออีก ${bumpDaysLeft} วัน`}
                >
                  🚀 Bump {canBumpProfile ? '' : `(${bumpDaysLeft} วัน)`}
                </Button>
                <Button onClick={() => onDeleteItem(profile.id, 'profile')} variant="outline" colorScheme="accent" size="sm" disabled={profile.isSuspicious}>🗑️ ลบ</Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderMyWebboardPostsTab = () => (
    <div className="space-y-4">
      {userWebboardPosts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-neutral-medium mb-4">คุณยังไม่ได้สร้างกระทู้</p>
          <Button
            onClick={() => navigateTo(View.Webboard, 'create')}
            variant="outline" // Changed variant
            colorScheme="neutral" // Changed colorScheme
            size="sm"
          >
            + สร้างกระทู้ใหม่
          </Button>
        </div>
      ) : (
        userWebboardPosts.map(post => (
          <div key={post.id} className="bg-white p-4 rounded-lg shadow border">
            <h4 className="font-semibold text-lg text-accent mb-1">{post.title}</h4>
            <p className="text-xs text-neutral-medium mb-1">หมวดหมู่: {post.category}</p>
            <p className="text-xs text-neutral-medium mb-2">สร้างเมื่อ: {formatDateDisplay(post.createdAt)} | {post.likes.length} ไลค์, {post.commentCount} คอมเมนต์</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigateTo(View.Webboard, post.id)} variant="outline" colorScheme="neutral" size="sm">👁️ ดูกระทู้</Button>
              <Button onClick={() => onEditItem(post.id, 'webboardPost', activeTab)} variant="outline" colorScheme="neutral" size="sm">✏️ แก้ไข</Button>
              <Button onClick={() => onDeleteItem(post.id, 'webboardPost')} variant="outline" colorScheme="accent" size="sm">🗑️ ลบ</Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderSavedPostsTab = () => (
    <div className="space-y-4">
      {savedWebboardPosts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-neutral-medium mb-4">คุณยังไม่มีกระทู้ที่บันทึกไว้</p>
          <Button onClick={() => navigateTo(View.Webboard)} variant="outline" colorScheme="neutral" size="sm">
            ไปที่กระดานสนทนา
          </Button>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            className="space-y-4" // Use space-y-4 instead of grid for a single column list
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {savedWebboardPosts.map(post => (
              <motion.div key={post.id} variants={itemVariants}>
                <div className="bg-white p-0.5 rounded-lg shadow border">
                  <WebboardPostCard
                      post={post}
                      currentUser={currentUser}
                      onViewPost={(postId) => navigateTo(View.Webboard, postId)}
                      onToggleLike={() => { /* Not primary action here */ }}
                      onSavePost={onSavePost} // This will trigger un-save
                      onSharePost={() => { /* Not primary action here */ }}
                      requestLoginForAction={() => {}} // User is logged in
                      onNavigateToPublicProfile={(profileInfo) => onNavigateToPublicProfile(profileInfo)}
                      getAuthorDisplayName={getAuthorDisplayName} // Pass down
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-sans font-semibold text-neutral-800">
          🛋️ ห้องของฉัน
        </h2>
        <p className="text-sm text-neutral-medium">
          จัดการโปรไฟล์และกิจกรรมทั้งหมดของคุณได้ที่นี่
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 sm:mb-8 border-b border-neutral-DEFAULT/70">
        <nav className="flex overflow-x-auto space-x-1 sm:space-x-2 -mb-px" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`
                whitespace-nowrap flex items-center rounded-t-md
                py-2.5 px-3 sm:py-3 sm:px-4
                font-sans font-medium text-xs sm:text-sm transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-offset-1
                ${activeTab === tab.id
                  ? 'border-b-2 border-neutral-700 text-neutral-800 bg-neutral-light/20 focus:ring-neutral-700'
                  : 'border-b-2 border-transparent text-neutral-medium hover:text-neutral-dark hover:border-neutral-DEFAULT/80 focus:ring-neutral-DEFAULT'
                }
              `}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-2">
        {activeTab === 'profile' && (
          <div role="tabpanel" id="tabpanel-profile" aria-labelledby="tab-profile">
            <UserProfilePage
              currentUser={currentUser}
              onUpdateProfile={onUpdateUserProfile}
              onCancel={() => { /* No specific cancel navigation needed from here */ }}
            />
          </div>
        )}
        {activeTab === 'myJobs' && <div role="tabpanel" id="tabpanel-myJobs" aria-labelledby="tab-myJobs">{renderMyJobsTab()}</div>}
        {activeTab === 'myHelperServices' && <div role="tabpanel" id="tabpanel-myHelperServices" aria-labelledby="tab-myHelperServices">{renderMyHelperServicesTab()}</div>}
        {activeTab === 'myWebboardPosts' && <div role="tabpanel" id="tabpanel-myWebboardPosts" aria-labelledby="tab-myWebboardPosts">{renderMyWebboardPostsTab()}</div>}
        {activeTab === 'savedPosts' && <div role="tabpanel" id="tabpanel-savedPosts" aria-labelledby="tab-savedPosts">{renderSavedPostsTab()}</div>}
      </div>
    </div>
  );
};
