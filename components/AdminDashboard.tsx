

import React, { useState, useEffect } from 'react';
import type { Job, HelperProfile, User, Interaction, WebboardPost, WebboardComment, UserLevel } from '../types';
import { UserRole, ADMIN_BADGE_DETAILS, MODERATOR_BADGE_DETAILS, USER_LEVELS } from '../types';
import { Button } from './Button';
import { checkProfileCompleteness, getUserDisplayBadge } from '../App'; // Removed checkHasBeenContacted


export interface AdminItem {
  id: string;
  itemType: 'job' | 'profile' | 'webboardPost';
  title: string;
  username?: string;
  userId?: string;
  postedAt?: string; // Ensured this will be a string or undefined
  isPinned?: boolean;
  isSuspicious?: boolean;
  isHiredOrUnavailable?: boolean;
  originalItem: Job | HelperProfile | WebboardPost;

  adminVerifiedExperience?: boolean;
  profileComplete?: boolean;
  // hasBeenContacted?: boolean; // Removed

  likesCount?: number;
  commentsCount?: number;
  authorLevel?: UserLevel;
}

type AdminTab = 'jobs' | 'profiles' | 'webboard' | 'users' | 'site_controls'; // Added site_controls tab

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'jobs', label: '📢 งาน' },
  { id: 'profiles', label: '🧑‍🔧 โปรไฟล์ผู้ช่วย' },
  { id: 'webboard', label: '💬 กระทู้' },
  { id: 'users', label: '👥 จัดการผู้ใช้' },
  { id: 'site_controls', label: '⚙️ ควบคุมระบบ' }, // New tab for site controls
];


interface AdminDashboardProps {
  jobs: Job[];
  helperProfiles: HelperProfile[];
  users: User[];
  interactions: Interaction[];
  webboardPosts: WebboardPost[];
  webboardComments: WebboardComment[];
  onDeleteJob: (jobId: string) => void;
  onDeleteHelperProfile: (profileId: string) => void;
  onToggleSuspiciousJob: (jobId: string) => void;
  onToggleSuspiciousHelperProfile: (profileId: string) => void;
  onTogglePinnedJob: (jobId: string) => void;
  onTogglePinnedHelperProfile: (profileId: string) => void;
  onToggleHiredJob: (jobId: string) => void;
  onToggleUnavailableHelperProfile: (profileId: string) => void;
  onToggleVerifiedExperience: (profileId: string) => void;
  onDeleteWebboardPost: (postId: string) => void;
  onPinWebboardPost: (postId: string) => void;
  onStartEditItem: (item: AdminItem) => void;
  onSetUserRole: (userId: string, newRole: UserRole) => void;
  currentUser: User | null;
  isSiteLocked: boolean; // New prop
  onToggleSiteLock: () => void; // New prop
}

const formatDateDisplay = (dateInput?: string | Date): string => {
  if (!dateInput) return 'N/A';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.';
  } catch (e) {
    return 'Error Formatting Date';
  }
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  jobs,
  helperProfiles,
  users,
  interactions,
  webboardPosts,
  webboardComments,
  onDeleteJob,
  onDeleteHelperProfile,
  onToggleSuspiciousJob,
  onToggleSuspiciousHelperProfile,
  onTogglePinnedJob,
  onTogglePinnedHelperProfile,
  onToggleHiredJob,
  onToggleUnavailableHelperProfile,
  onToggleVerifiedExperience,
  onDeleteWebboardPost,
  onPinWebboardPost,
  onStartEditItem,
  onSetUserRole,
  currentUser,
  isSiteLocked,
  onToggleSiteLock,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('jobs');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setSearchTerm(''); // Reset search term when tab changes
  }, [activeTab]);

  if (currentUser?.role !== UserRole.Admin) {
    return <div className="p-8 text-center text-red-500 dark:text-red-400 font-sans">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }
  
  const ensureStringDate = (dateInput: string | Date | undefined): string | undefined => {
    if (!dateInput) return undefined;
    return dateInput instanceof Date ? dateInput.toISOString() : dateInput;
  };

  const allContentItems: AdminItem[] = [
    ...jobs.map(job => ({
        id: job.id,
        itemType: 'job' as const,
        title: job.title,
        username: job.username,
        userId: job.userId,
        postedAt: ensureStringDate(job.postedAt),
        isPinned: job.isPinned,
        isSuspicious: job.isSuspicious,
        isHiredOrUnavailable: job.isHired,
        originalItem: job
    })),
    ...helperProfiles.map(profile => {
        const user = users.find(u => u.id === profile.userId);
        const profileIsComplete = user ? checkProfileCompleteness(user) : false;
        // const userHasBeenContacted = user ? checkHasBeenContacted(profile.userId, interactions) : false; // Removed

        return {
            id: profile.id,
            itemType: 'profile' as const,
            title: profile.profileTitle,
            username: profile.username,
            userId: profile.userId,
            postedAt: ensureStringDate(profile.postedAt),
            isPinned: profile.isPinned,
            isSuspicious: profile.isSuspicious,
            isHiredOrUnavailable: profile.isUnavailable,
            originalItem: profile,
            adminVerifiedExperience: profile.adminVerifiedExperience || false,
            profileComplete: profileIsComplete,
            // hasBeenContacted: userHasBeenContacted, // Removed
        };
    }),
    ...webboardPosts.map(post => {
        const author = users.find(u => u.id === post.userId);
        return {
            id: post.id,
            itemType: 'webboardPost' as const,
            title: post.title,
            username: post.username,
            userId: post.userId,
            postedAt: ensureStringDate(post.createdAt), // Use createdAt for webboard posts
            isPinned: post.isPinned,
            isSuspicious: false, // Webboard posts don't have this field directly
            originalItem: post,
            likesCount: post.likes.length,
            commentsCount: webboardComments.filter(c => c.postId === post.id).length,
            authorLevel: author ? getUserDisplayBadge(author, webboardPosts, webboardComments) : USER_LEVELS[0],
        };
    }),
  ];

  const getSortedItems = (items: AdminItem[]) => {
    return items.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.postedAt && b.postedAt) {
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
        }
        return 0;
    });
  }


  const handleDeleteItemClick = (item: AdminItem) => {
    if (item.itemType === 'job') {
      onDeleteJob(item.id);
    } else if (item.itemType === 'profile') {
      onDeleteHelperProfile(item.id);
    } else if (item.itemType === 'webboardPost') {
      onDeleteWebboardPost(item.id);
    }
  };

  const renderTrustBadgesForItem = (item: AdminItem) => {
    if (item.itemType !== 'profile') return null;
    return (
      <div className="flex gap-1 flex-wrap my-1">
        {item.adminVerifiedExperience && <span className="bg-yellow-200 text-yellow-800 dark:bg-yellow-600/30 dark:text-yellow-200 text-xs px-2 py-0.5 rounded-full font-medium">⭐ ผ่านงาน</span>}
        {item.profileComplete && <span className="bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-200 text-xs px-2 py-0.5 rounded-full font-medium">🟢 ครบถ้วน</span>}
        {/* Removed: Has Been Contacted Badge
        {item.hasBeenContacted && <span className="bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-200 text-xs px-2 py-0.5 rounded-full font-medium">📌 ผู้ติดต่อ</span>}
        */}
        {item.isSuspicious && <span className="bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-200 text-xs px-2 py-0.5 rounded-full font-medium">🔺 ระวัง</span>}
      </div>
    );
  };

  const renderStatusBadges = (item: AdminItem) => {
    const postedAtDate = item.postedAt ? new Date(item.postedAt) : null;
    const isExpired = item.itemType !== 'webboardPost' && !item.isHiredOrUnavailable && postedAtDate ? (new Date().getTime() - postedAtDate.getTime()) / (1000 * 60 * 60 * 24) > 30 : false;

    let statusElements = [];

    if (item.isPinned) {
      statusElements.push( // Consistent yellow for all pinned items
        <span key="pinned" className={`inline-block text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-dark-secondary-DEFAULT/30 dark:text-dark-secondary-hover`}>
          📌 ปักหมุด
        </span>
      );
    }
    if (item.itemType === 'job' && item.isHiredOrUnavailable) {
        statusElements.push(
          <span key="hired_job" className="inline-block bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
            ✅ ถูกจ้างแล้ว
          </span>);
    } else if (item.itemType === 'profile' && item.isHiredOrUnavailable) {
        statusElements.push(
          <span key="unavailable_profile" className="inline-block bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
            🚫 ไม่ว่างแล้ว
          </span>);
    }

    if (item.itemType === 'job' && item.isSuspicious) {
       statusElements.push(
        <span key="suspicious_job" className="inline-block bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-red-300 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
          ⚠️ งานน่าสงสัย
        </span>);
    }
    if (item.itemType !== 'webboardPost' && isExpired) {
      statusElements.push(
        <span key="expired" className="inline-block bg-neutral-200 text-neutral-800 dark:bg-dark-border dark:text-dark-textMuted text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
          ⏳ หมดอายุ
        </span>);
    }

    if (statusElements.length === 0 && !(item.itemType === 'profile' && item.isSuspicious)) {
       statusElements.push(
        <span key="active" className="inline-block bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
          🟢 ใช้งานอยู่
        </span>);
    }
    return <div className="mt-2 mb-3">{statusElements}</div>;
  };


  const renderAdminItemActions = (item: AdminItem) => {
    const isJob = item.itemType === 'job';
    const isProfile = item.itemType === 'profile';
    const isWebboardPost = item.itemType === 'webboardPost';

    const deleteButtonText = isJob ? '🗑️ ลบประกาศงาน' : isProfile ? '🗑️ ลบโปรไฟล์' : '🗑️ ลบโพสต์';

    let pinButtonHandler, hiredButtonHandler, suspiciousButtonHandler;
    
    // Pin button should use 'secondary' (yellow) color scheme consistently
    const pinButtonVariant = item.isPinned ? "secondary" : "outline";
    const pinButtonColorScheme = "secondary";


    if (isJob) {
        pinButtonHandler = () => onTogglePinnedJob(item.id);
        hiredButtonHandler = () => onToggleHiredJob(item.id);
        suspiciousButtonHandler = () => onToggleSuspiciousJob(item.id);
    } else if (isProfile) {
        pinButtonHandler = () => onTogglePinnedHelperProfile(item.id);
        hiredButtonHandler = () => onToggleUnavailableHelperProfile(item.id);
        suspiciousButtonHandler = () => onToggleSuspiciousHelperProfile(item.id);
    } else { // Webboard Post
        pinButtonHandler = () => onPinWebboardPost(item.id);
    }

    return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
      {pinButtonHandler && (
        <Button
            onClick={pinButtonHandler}
            variant={pinButtonVariant}
            colorScheme={pinButtonColorScheme}
            size="sm"
        >
            {item.isPinned ? 'ยกเลิกปักหมุด' : '📌 ปักหมุด'}
        </Button>
      )}

      {(isJob || isProfile) && hiredButtonHandler && (
        <Button
            onClick={hiredButtonHandler}
            variant={item.isHiredOrUnavailable ? "secondary" : "outline"}
            colorScheme={item.isHiredOrUnavailable ? "secondary" : "primary"}
            size="sm"
        >
            {item.isHiredOrUnavailable ? (isJob ? 'ยกเลิกสถานะ' : 'ยกเลิกสถานะ') : (isJob ? 'แจ้งว่ามีคนทำแล้ว' : 'แจ้งว่าไม่ว่างแล้ว')}
        </Button>
      )}

      {(isJob || isProfile) && suspiciousButtonHandler && (
        <Button
            onClick={suspiciousButtonHandler}
            variant={item.isSuspicious ? "accent" : "outline"}
            colorScheme={"accent"}
            size="sm"
        >
            {item.isSuspicious ? (isJob ? 'ยกเลิกงานน่าสงสัย' : 'ยกเลิก User น่าสงสัย') : (isJob ? '⚠️ ตั้งเป็นงานน่าสงสัย' : '🔺 ตั้ง User น่าสงสัย')}
        </Button>
      )}

      {isProfile && (
         <Button
            onClick={() => onToggleVerifiedExperience(item.id)}
            variant={item.adminVerifiedExperience ? "secondary" : "outline"}
            colorScheme={item.adminVerifiedExperience ? "secondary" : "primary"}
            size="sm"
        >
            {item.adminVerifiedExperience ? 'ยกเลิก Verified Exp.' : '⭐ Verified Exp.'}
        </Button>
      )}

      <Button
          onClick={() => onStartEditItem(item)}
          variant="outline"
          colorScheme="primary"
          size="sm"
      >
          ✏️ แก้ไข
      </Button>

      <Button
        onClick={() => handleDeleteItemClick(item)}
        variant="outline"
        colorScheme="accent"
        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400 dark:hover:text-neutral-dark"
        size="sm"
      >
        {deleteButtonText}
      </Button>
    </div>
  )};

  const renderSearchInput = () => (
    <div className="mb-6">
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={`ค้นหาในแท็บ ${TABS.find(t => t.id === activeTab)?.label}...`}
        className="w-full p-3 bg-white dark:bg-dark-inputBg border border-neutral-DEFAULT dark:border-dark-border rounded-lg text-neutral-dark dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-neutral-DEFAULT dark:focus:ring-dark-border"
      />
    </div>
  );

  const renderUserRoleManagement = () => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filteredUsers = users.filter(user =>
      user.id !== currentUser?.id &&
      (user.username.toLowerCase().includes(lowerSearchTerm) ||
       user.displayName.toLowerCase().includes(lowerSearchTerm))
    );

    return (
      <div className="mt-2"> {/* Reduced top margin for closer search */}
        {renderSearchInput()}
        <h3 className="text-2xl font-semibold text-accent dark:text-dark-accent-DEFAULT mb-6 text-center">
          👥 จัดการบทบาทผู้ใช้
        </h3>
        {filteredUsers.length === 0 ? (
          <p className="text-center text-neutral-medium dark:text-dark-textMuted">
            {searchTerm ? 'ไม่พบผู้ใช้ที่ตรงกับการค้นหา' : 'ไม่มีผู้ใช้อื่นในระบบ'}
          </p>
        ) : (
          <div className="bg-white dark:bg-dark-cardBg p-4 sm:p-6 rounded-lg shadow-lg border dark:border-dark-border">
            <ul className="space-y-3">
              {filteredUsers.map(user => {
                const displayBadge = getUserDisplayBadge(user, webboardPosts, webboardComments);
                return (
                  <li key={user.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border-b dark:border-dark-border/50 last:border-b-0">
                    <div>
                      <span className="font-semibold text-neutral-dark dark:text-dark-text">@{user.username}</span> ({user.displayName})
                      <br/>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full inline-block mt-1 ${displayBadge.colorClass} ${displayBadge.textColorClass || ''}`}>
                        {displayBadge.name}
                      </span>
                      <span className="text-xs text-neutral-medium dark:text-dark-textMuted ml-2"> (Role: {user.role})</span>
                    </div>
                    <div className="mt-2 sm:mt-0 flex gap-2">
                      {user.role === UserRole.Member && (
                        <Button onClick={() => onSetUserRole(user.id, UserRole.Moderator)} variant="primary" size="sm">
                          👮 ตั้งเป็นผู้ตรวจการ
                        </Button>
                      )}
                      {user.role === UserRole.Moderator && (
                        <Button onClick={() => onSetUserRole(user.id, UserRole.Member)} variant="outline" colorScheme="secondary" size="sm">
                          👤 ยกเลิกผู้ตรวจการ
                        </Button>
                      )}
                       {user.role === UserRole.Admin && (
                        <span className="text-sm text-neutral-medium dark:text-dark-textMuted px-2 py-1">(Admin)</span>
                       )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderSiteControls = () => {
    return (
      <div className="mt-2 bg-white dark:bg-dark-cardBg p-4 sm:p-6 rounded-lg shadow-lg border dark:border-dark-border">
        <h3 className="text-2xl font-semibold text-accent dark:text-dark-accent-DEFAULT mb-6 text-center">
          ⚙️ ควบคุมระบบเว็บไซต์
        </h3>
        <div className="flex flex-col items-center space-y-4">
          <p className="text-neutral-dark dark:text-dark-text">
            สถานะปัจจุบัน: {isSiteLocked 
              ? <span className="font-semibold text-red-600 dark:text-red-400">🔴 ล็อกระบบแล้ว</span> 
              : <span className="font-semibold text-green-600 dark:text-green-400">🟢 ระบบเปิดใช้งานปกติ</span>}
          </p>
          <Button 
            onClick={onToggleSiteLock}
            variant={isSiteLocked ? "primary" : "accent"}
            size="lg"
            className="w-full max-w-xs"
          >
            {isSiteLocked ? '🟢 ปลดล็อกระบบ' : '🔴 ล็อกระบบ'}
          </Button>
          {isSiteLocked && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center max-w-md">
              เมื่อล็อกระบบ ผู้ใช้ทั่วไป (ที่ไม่ใช่แอดมิน) จะไม่สามารถเข้าใช้งานเว็บไซต์ได้ จะเห็นเพียงหน้าแจ้งเตือนการระงับชั่วคราว
            </p>
          )}
           {!isSiteLocked && (
            <p className="text-sm text-neutral-medium dark:text-dark-textMuted text-center max-w-md">
              ใช้ปุ่มนี้ในกรณีฉุกเฉิน หรือต้องการระงับการใช้งานเว็บไซต์ชั่วคราวสำหรับผู้ใช้ทั่วไป
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderContentForTab = (tab: AdminTab) => {
    let itemsToDisplay: AdminItem[] = [];
    let tabTitle = '';
    let noItemMessage = 'ยังไม่มีรายการในแท็บนี้';
    let noSearchResultsMessage = 'ไม่พบรายการที่ตรงกับการค้นหา';

    const lowerSearchTerm = searchTerm.toLowerCase();

    if (tab === 'jobs') {
      itemsToDisplay = getSortedItems(
        allContentItems.filter(item =>
          item.itemType === 'job' &&
          (!searchTerm ||
            (item.originalItem as Job).title.toLowerCase().includes(lowerSearchTerm) ||
            (item.originalItem as Job).description.toLowerCase().includes(lowerSearchTerm) ||
            (item.username || '').toLowerCase().includes(lowerSearchTerm)
          )
        )
      );
      tabTitle = 'รายการประกาศงานทั้งหมด';
      noItemMessage = 'ยังไม่มีประกาศงานในระบบ';
    } else if (tab === 'profiles') {
      itemsToDisplay = getSortedItems(
        allContentItems.filter(item =>
          item.itemType === 'profile' &&
          (!searchTerm ||
            (item.originalItem as HelperProfile).profileTitle.toLowerCase().includes(lowerSearchTerm) ||
            (item.originalItem as HelperProfile).details.toLowerCase().includes(lowerSearchTerm) ||
            (item.username || '').toLowerCase().includes(lowerSearchTerm)
          )
        )
      );
      tabTitle = 'รายการโปรไฟล์ผู้ช่วยทั้งหมด';
      noItemMessage = 'ยังไม่มีโปรไฟล์ผู้ช่วยในระบบ';
    } else if (tab === 'webboard') {
      itemsToDisplay = getSortedItems(
        allContentItems.filter(item =>
          item.itemType === 'webboardPost' &&
          (!searchTerm ||
            (item.originalItem as WebboardPost).title.toLowerCase().includes(lowerSearchTerm) ||
            (item.originalItem as WebboardPost).body.toLowerCase().includes(lowerSearchTerm) ||
            (item.username || '').toLowerCase().includes(lowerSearchTerm)
          )
        )
      );
      tabTitle = 'รายการกระทู้พูดคุยทั้งหมด';
      noItemMessage = 'ยังไม่มีกระทู้ในระบบ';
    }

    return (
      <div className="mt-2"> {/* Reduced top margin */}
        {renderSearchInput()}
        {itemsToDisplay.length === 0 ? (
          <p className="text-center text-neutral-medium dark:text-dark-textMuted py-10">
            {searchTerm ? noSearchResultsMessage : noItemMessage}
          </p>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-accent dark:text-dark-accent-DEFAULT mb-4">{tabTitle} ({itemsToDisplay.length})</h3>
            {itemsToDisplay.map(item => (
              <div key={`${item.itemType}-${item.id}`} className="bg-white dark:bg-dark-cardBg p-4 sm:p-6 rounded-lg shadow-lg border dark:border-dark-border">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2">
                    <h4 className={`font-semibold text-xl ${item.itemType === 'job' ? 'text-accent dark:text-dark-accent-DEFAULT' : item.itemType === 'profile' ? 'text-accent dark:text-dark-accent-DEFAULT' : 'text-accent dark:text-dark-accent-DEFAULT' }`}>
                    {item.title}
                    </h4>
                    <span className="text-sm text-neutral-medium dark:text-dark-textMuted mt-1 sm:mt-0">
                    {item.itemType === 'job' ? 'ประกาศงาน' : item.itemType === 'profile' ? 'โปรไฟล์ผู้ช่วย' : 'โพสต์กระทู้'}
                    </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-medium dark:text-dark-textMuted">
                โพสต์โดย: @{item.username || 'N/A'} (User ID: {item.userId})
                {item.itemType === 'webboardPost' && item.authorLevel && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${item.authorLevel.colorClass} ${item.authorLevel.textColorClass || ''}`}>{item.authorLevel.name}</span>
                )}
                </p>
                <p className="text-xs sm:text-sm text-neutral-medium dark:text-dark-textMuted mb-2">
                🕒 โพสต์เมื่อ: {formatDateDisplay(item.postedAt)}
                </p>
                {item.itemType === 'webboardPost' && (
                    <p className="text-xs sm:text-sm text-neutral-medium dark:text-dark-textMuted mb-2">
                        ❤️ {item.likesCount || 0} ไลค์ | 💬 {item.commentsCount || 0} คอมเมนต์
                    </p>
                )}
                {renderStatusBadges(item)}
                {item.itemType === 'profile' && renderTrustBadgesForItem(item)}
                {item.itemType === 'job' && (item.originalItem as Job).description && (
                    <p className="text-sm mt-2 text-neutral-dark dark:text-dark-textMuted whitespace-pre-wrap">
                        <strong className="font-medium">รายละเอียด:</strong> {(item.originalItem as Job).description.substring(0,150)}{( (item.originalItem as Job).description.length > 150) ? '...' : ''}
                    </p>
                )}
                {item.itemType === 'profile' && (item.originalItem as HelperProfile).details && (
                    <p className="text-sm mt-2 text-neutral-dark dark:text-dark-textMuted whitespace-pre-wrap">
                        <strong className="font-medium">เกี่ยวกับฉัน:</strong> {(item.originalItem as HelperProfile).details.substring(0,150)}{((item.originalItem as HelperProfile).details.length > 150) ? '...' : ''}
                    </p>
                )}
                {item.itemType === 'webboardPost' && (item.originalItem as WebboardPost).body && (
                    <p className="text-sm mt-2 text-neutral-dark dark:text-dark-textMuted whitespace-pre-wrap">
                        <strong className="font-medium">เนื้อหา:</strong> {(item.originalItem as WebboardPost).body.substring(0,150)}{((item.originalItem as WebboardPost).body.length > 150) ? '...' : ''}
                    </p>
                )}
                {renderAdminItemActions(item)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="container mx-auto p-4 sm:p-8 font-sans">
      <h2 className="text-3xl font-semibold text-accent dark:text-dark-accent-DEFAULT mb-8 text-center">
        🔐 Admin Dashboard
      </h2>

      <div className="flex border-b dark:border-dark-border mb-4 overflow-x-auto"> {/* Reduced bottom margin */}
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-3 sm:px-4 font-medium text-sm sm:text-base whitespace-nowrap flex-shrink-0
              ${activeTab === tab.id
                ? 'border-b-2 border-accent dark:border-dark-accent-DEFAULT text-accent dark:text-dark-accent-DEFAULT'
                : 'text-neutral-medium dark:text-dark-textMuted hover:text-accent dark:hover:text-dark-accent-hover'
              }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'jobs' && renderContentForTab('jobs')}
        {activeTab === 'profiles' && renderContentForTab('profiles')}
        {activeTab === 'webboard' && renderContentForTab('webboard')}
        {activeTab === 'users' && renderUserRoleManagement()}
        {activeTab === 'site_controls' && renderSiteControls()}
      </div>
    </div>
  );
};
