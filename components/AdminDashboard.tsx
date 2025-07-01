import React, { useState, useEffect } from 'react';
import type { Job, HelperProfile, User, Interaction, WebboardPost, WebboardComment, UserLevel, VouchReport, Vouch, VouchType } from '../types';
import { UserRole, ADMIN_BADGE_DETAILS, MODERATOR_BADGE_DETAILS, USER_LEVELS, VouchReportStatus, VOUCH_TYPE_LABELS } from '../types';
import { Button } from './Button';
import { checkProfileCompleteness } from '../App'; // Removed checkHasBeenContacted
import { OrionCommandCenter } from './OrionCommandCenter'; // Import Orion


export interface AdminItem {
  id: string;
  itemType: 'job' | 'profile' | 'webboardPost';
  title: string;
  authorDisplayName?: string; // This will be the live or fallback display name
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

type AdminTab = 'jobs' | 'profiles' | 'webboard' | 'users' | 'site_controls' | 'vouch_reports' | 'orion_command_center';

const TABS: { id: AdminTab; label: string, badgeCount?: number }[] = [
  { id: 'orion_command_center', label: 'Orion 🤖'},
  { id: 'jobs', label: '📢 งาน' },
  { id: 'profiles', label: '🧑‍🔧 โปรไฟล์ผู้ช่วย' },
  { id: 'webboard', label: '💬 กระทู้' },
  { id: 'vouch_reports', label: '🛡️ รายงาน Vouch' },
  { id: 'users', label: '👥 จัดการผู้ใช้' },
  { id: 'site_controls', label: '⚙️ ควบคุมระบบ' },
];


interface AdminDashboardProps {
  jobs: Job[];
  helperProfiles: HelperProfile[];
  users: User[];
  interactions: Interaction[];
  webboardPosts: WebboardPost[];
  webboardComments: WebboardComment[];
  vouchReports: VouchReport[]; // New prop
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
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
  getUserDisplayBadge: (user: User) => UserLevel;
  onResolveVouchReport: (reportId: string, resolution: VouchReportStatus.ResolvedDeleted | VouchReportStatus.ResolvedKept, vouchId: string, voucheeId: string, vouchType: VouchType) => void; // New prop
  getVouchDocument: (vouchId: string) => Promise<Vouch | null>; // New prop
  orionAnalyzeService: (command: string) => Promise<string>;
}

const formatDateDisplay = (dateInput?: string | Date | null): string => {
  if (dateInput === null || dateInput === undefined) {
    return 'N/A';
  }

  let dateObject: Date;
  if (dateInput instanceof Date) {
    dateObject = dateInput;
  } else if (typeof dateInput === 'string') {
    dateObject = new Date(dateInput);
  } else {
    if (typeof dateInput === 'object' && dateInput && 'toDate' in dateInput && typeof (dateInput as any).toDate === 'function') {
      dateObject = (dateInput as any).toDate();
    } else {
      console.warn("formatDateDisplay received unexpected dateInput type:", dateInput);
      return "Invalid date input";
    }
  }

  if (isNaN(dateObject.getTime())) {
    return 'Invalid Date';
  }
  try {
    return dateObject.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.';
  } catch (e) {
    console.error("Error formatting date:", e);
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
  vouchReports,
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
  getAuthorDisplayName,
  getUserDisplayBadge,
  onResolveVouchReport,
  getVouchDocument,
  orionAnalyzeService,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('orion_command_center');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<VouchReport | null>(null);
  const [selectedVouch, setSelectedVouch] = useState<Vouch | null>(null);
  const [isHudLoading, setIsHudLoading] = useState(false);

  useEffect(() => {
    setSearchTerm(''); // Reset search term when tab changes
  }, [activeTab]);

  useEffect(() => {
    if (selectedReport) {
      setIsHudLoading(true);
      getVouchDocument(selectedReport.vouchId)
        .then(vouch => {
          setSelectedVouch(vouch);
        })
        .catch(err => console.error("Error fetching vouch for HUD:", err))
        .finally(() => setIsHudLoading(false));
    } else {
      setSelectedVouch(null);
    }
  }, [selectedReport, getVouchDocument]);

  if (currentUser?.role !== UserRole.Admin) {
    return <div className="p-8 text-center text-red-500 font-sans">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
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
        authorDisplayName: getAuthorDisplayName(job.userId, job.authorDisplayName),
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
            authorDisplayName: getAuthorDisplayName(profile.userId, profile.authorDisplayName),
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
            authorDisplayName: getAuthorDisplayName(post.userId, post.authorDisplayName),
            userId: post.userId,
            postedAt: ensureStringDate(post.createdAt), // Use createdAt for webboard posts
            isPinned: post.isPinned,
            isSuspicious: false, // Webboard posts don't have this field directly
            originalItem: post,
            likesCount: post.likes.length,
            commentsCount: webboardComments.filter(c => c.postId === post.id).length,
            authorLevel: author ? getUserDisplayBadge(author) : USER_LEVELS[0],
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
        {item.adminVerifiedExperience && <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium">⭐ ยืนยันตัวตน</span>}
        {item.profileComplete && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">🟢 ครบถ้วน</span>}
        {/* Removed: Has Been Contacted Badge
        {item.hasBeenContacted && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">📌 ผู้ติดต่อ</span>}
        */}
        {item.isSuspicious && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">🔺 ระวัง</span>}
      </div>
    );
  };

  const renderStatusBadges = (item: AdminItem) => {
    const postedAtVal = item.postedAt ? new Date(item.postedAt) : null;
    const isExpired = item.itemType !== 'webboardPost' && !item.isHiredOrUnavailable && postedAtVal && !isNaN(postedAtVal.getTime())
        ? (new Date().getTime() - postedAtVal.getTime()) / (1000 * 60 * 60 * 24) > 30 
        : false;


    let statusElements = [];

    if (item.isPinned) {
      statusElements.push( // Consistent yellow for all pinned items
        <span key="pinned" className={`inline-block text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800`}>
          📌 ปักหมุด
        </span>
      );
    }
    if (item.itemType === 'job' && item.isHiredOrUnavailable) {
        statusElements.push(
          <span key="hired_job" className="inline-block bg-green-100 text-green-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
            ✅ ถูกจ้างแล้ว
          </span>);
    } else if (item.itemType === 'profile' && item.isHiredOrUnavailable) {
        statusElements.push(
          <span key="unavailable_profile" className="inline-block bg-red-100 text-red-700 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
            🚫 ไม่ว่างแล้ว
          </span>);
    }

    if (item.itemType === 'job' && item.isSuspicious) {
       statusElements.push(
        <span key="suspicious_job" className="inline-block bg-red-100 text-red-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
          ⚠️ งานน่าสงสัย
        </span>);
    }
    if (item.itemType !== 'webboardPost' && isExpired) {
      statusElements.push(
        <span key="expired" className="inline-block bg-neutral-200 text-neutral-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
          ⏳ หมดอายุ
        </span>);
    }

    if (statusElements.length === 0 && !(item.itemType === 'profile' && item.isSuspicious)) {
       statusElements.push(
        <span key="active" className="inline-block bg-green-100 text-green-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
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
            {item.adminVerifiedExperience ? 'ยกเลิกยืนยันตัวตน' : '⭐ ยืนยันตัวตน'}
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
        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
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
        className="w-full p-3 bg-white border border-neutral-DEFAULT rounded-lg text-neutral-dark focus:outline-none focus:ring-2 focus:ring-neutral-DEFAULT"
      />
    </div>
  );

  const renderUserRoleManagement = () => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filteredUsers = users.filter(user =>
      user.id !== currentUser?.id &&
      (user.username.toLowerCase().includes(lowerSearchTerm) ||
       getAuthorDisplayName(user.id, user.publicDisplayName).toLowerCase().includes(lowerSearchTerm))
    );

    return (
      <div className="mt-2"> {/* Reduced top margin for closer search */}
        {renderSearchInput()}
        <h3 className="text-2xl font-semibold text-accent mb-6 text-center">
          👥 จัดการบทบาทผู้ใช้
        </h3>
        {filteredUsers.length === 0 ? (
          <p className="text-center text-neutral-medium">
            {searchTerm ? 'ไม่พบผู้ใช้ที่ตรงกับการค้นหา' : 'ไม่มีผู้ใช้อื่นในระบบ'}
          </p>
        ) : (
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-neutral-DEFAULT">
            <ul className="space-y-3">
              {filteredUsers.map(user => {
                const displayBadge = getUserDisplayBadge(user);
                const actualDisplayName = getAuthorDisplayName(user.id, user.publicDisplayName);
                return (
                  <li key={user.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border-b border-neutral-DEFAULT/50 last:border-b-0">
                    <div>
                      <span className="font-semibold text-neutral-dark">@{user.username}</span> ({actualDisplayName})
                      <br/>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full inline-block mt-1 ${displayBadge.colorClass} ${displayBadge.textColorClass || ''}`}>
                        {displayBadge.name}
                      </span>
                      <span className="text-xs text-neutral-medium ml-2"> (Role: {user.role})</span>
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
                        <span className="text-sm text-neutral-medium px-2 py-1">(Admin)</span>
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
      <div className="mt-2 bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-neutral-DEFAULT">
        <h3 className="text-2xl font-semibold text-accent mb-6 text-center">
          ⚙️ ควบคุมระบบเว็บไซต์
        </h3>
        <div className="flex flex-col items-center space-y-4">
          <p className="text-neutral-dark">
            สถานะปัจจุบัน: {isSiteLocked 
              ? <span className="font-semibold text-red-600">🔴 ล็อกระบบแล้ว</span> 
              : <span className="font-semibold text-green-600">🟢 ระบบเปิดใช้งานปกติ</span>}
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
            <p className="text-sm text-red-600 text-center max-w-md">
              เมื่อล็อกระบบ ผู้ใช้ทั่วไป (ที่ไม่ใช่แอดมิน) จะไม่สามารถเข้าใช้งานเว็บไซต์ได้ จะเห็นเพียงหน้าแจ้งเตือนการระงับชั่วคราว
            </p>
          )}
           {!isSiteLocked && (
            <p className="text-sm text-neutral-medium text-center max-w-md">
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
            (item.authorDisplayName || '').toLowerCase().includes(lowerSearchTerm)
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
            (item.authorDisplayName || '').toLowerCase().includes(lowerSearchTerm)
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
            (item.authorDisplayName || '').toLowerCase().includes(lowerSearchTerm)
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
          <p className="text-center text-neutral-medium py-10">
            {searchTerm ? noSearchResultsMessage : noItemMessage}
          </p>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-accent mb-4">{tabTitle} ({itemsToDisplay.length})</h3>
            {itemsToDisplay.map(item => (
              <div key={`${item.itemType}-${item.id}`} className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-neutral-DEFAULT">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2">
                    <h4 className={`font-semibold text-xl ${item.itemType === 'job' ? 'text-accent' : item.itemType === 'profile' ? 'text-accent' : 'text-accent' }`}>
                    {item.title}
                    </h4>
                    <span className="text-sm text-neutral-medium mt-1 sm:mt-0">
                    {item.itemType === 'job' ? 'ประกาศงาน' : item.itemType === 'profile' ? 'โปรไฟล์ผู้ช่วย' : 'โพสต์กระทู้'}
                    </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-medium">
                โพสต์โดย: @{item.authorDisplayName || 'N/A'} (User ID: {item.userId})
                {item.itemType === 'webboardPost' && item.authorLevel && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${item.authorLevel.colorClass} ${item.authorLevel.textColorClass || ''}`}>{item.authorLevel.name}</span>
                )}
                </p>
                <p className="text-xs sm:text-sm text-neutral-medium mb-2">
                🕒 โพสต์เมื่อ: {formatDateDisplay(item.postedAt)}
                </p>
                {item.itemType === 'webboardPost' && (
                    <p className="text-xs sm:text-sm text-neutral-medium mb-2">
                        ❤️ {item.likesCount || 0} ไลค์ | 💬 {item.commentsCount || 0} คอมเมนต์
                    </p>
                )}
                {renderStatusBadges(item)}
                {item.itemType === 'profile' && renderTrustBadgesForItem(item)}
                {item.itemType === 'job' && (item.originalItem as Job).description && (
                    <p className="text-sm mt-2 text-neutral-dark whitespace-pre-wrap">
                        <strong className="font-medium">รายละเอียด:</strong> {(item.originalItem as Job).description.substring(0,150)}{( (item.originalItem as Job).description.length > 150) ? '...' : ''}
                    </p>
                )}
                {item.itemType === 'profile' && (item.originalItem as HelperProfile).details && (
                    <p className="text-sm mt-2 text-neutral-dark whitespace-pre-wrap">
                        <strong className="font-medium">เกี่ยวกับฉัน:</strong> {(item.originalItem as HelperProfile).details.substring(0,150)}{((item.originalItem as HelperProfile).details.length > 150) ? '...' : ''}
                    </p>
                )}
                {item.itemType === 'webboardPost' && (item.originalItem as WebboardPost).body && (
                    <p className="text-sm mt-2 text-neutral-dark whitespace-pre-wrap">
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
  
  const renderVouchReportsTab = () => {
    const voucher = selectedReport ? users.find(u => u.id === selectedReport.voucherId) : null;
    const vouchee = selectedReport ? users.find(u => u.id === selectedReport.voucheeId) : null;
    const reporter = selectedReport ? users.find(u => u.id === selectedReport.reporterId) : null;

    if (selectedReport && selectedVouch) {
      return (
        <div className="mt-2">
          <Button onClick={() => setSelectedReport(null)} variant="outline" size="sm" className="mb-4">&larr; กลับไปหน้ารายงานทั้งหมด</Button>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-neutral-DEFAULT grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Report Context */}
            <div>
              <h4 className="text-xl font-semibold text-accent mb-4">รายละเอียดรายงาน</h4>
              <p><strong>ผู้รายงาน:</strong> {getAuthorDisplayName(reporter?.id || '','ไม่ทราบชื่อ')} (@{reporter?.username})</p>
              <p><strong>ผู้รับรอง (Voucher):</strong> {getAuthorDisplayName(voucher?.id || '','ไม่ทราบชื่อ')} (@{voucher?.username})</p>
              <p><strong>ผู้ถูกรับรอง (Vouchee):</strong> {getAuthorDisplayName(vouchee?.id || '', 'ไม่ทราบชื่อ')} (@{vouchee?.username})</p>
              <p><strong>ประเภทการรับรอง:</strong> {VOUCH_TYPE_LABELS[selectedVouch.vouchType]}</p>
              <p className="mt-2"><strong>ความคิดเห็นจากผู้รับรอง:</strong></p>
              <blockquote className="border-l-2 pl-2 text-sm italic">{selectedVouch.comment || "(ไม่มี)"}</blockquote>
              <p className="mt-2"><strong>เหตุผลที่รายงาน:</strong></p>
              <blockquote className="border-l-2 pl-2 text-sm italic bg-yellow-50 p-2 rounded-r-md">{selectedReport.reporterComment || "(ไม่มี)"}</blockquote>
            </div>

            {/* Right Column: Risk Signals HUD */}
            <div className="bg-neutral-light p-4 rounded-lg">
              <h4 className="text-xl font-semibold text-neutral-dark mb-4">Risk Signals HUD</h4>
              {isHudLoading ? <p>Loading signals...</p> : (
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    {voucher?.lastLoginIP === selectedVouch.creatorIP ? 
                      <><span className="mr-2">⚠️</span> <strong>IP ADDRESS MATCH:</strong> Voucher IP ({selectedVouch.creatorIP}) ตรงกับ IP ล่าสุดของผู้ถูกรับรอง</> :
                      <><span className="mr-2">✅</span> <strong>IP ADDRESS MISMATCH:</strong> IP ไม่ตรงกัน (Voucher: {selectedVouch.creatorIP}, Vouchee: {vouchee?.lastLoginIP || 'N/A'})</>
                    }
                  </li>
                  <li className="flex items-start">
                    {voucher?.lastLoginUserAgent === selectedVouch.creatorUserAgent ?
                      <><span className="mr-2">⚠️</span> <strong>SHARED DEVICE FOOTPRINT:</strong> User-Agent ตรงกัน</> :
                      <><span className="mr-2">✅</span> <strong>UNIQUE DEVICE FOOTPRINT:</strong> User-Agent ไม่ตรงกัน</>
                    }
                  </li>
                  <li className="flex items-start">
                    {(new Date(selectedVouch.createdAt as string).getTime() - new Date(voucher?.createdAt as string).getTime()) < (72 * 60 * 60 * 1000) ?
                      <><span className="mr-2">⚠️</span> <strong>NEW ACCOUNT:</strong> บัญชีผู้รับรองถูกสร้างน้อยกว่า 72 ชม. ก่อนการรับรอง</> :
                      <><span className="mr-2">✅</span> <strong>ESTABLISHED ACCOUNT:</strong> บัญชีผู้รับรองมีอายุมากกว่า 72 ชม.</>
                    }
                  </li>
                  {/* Additional checks can be added here */}
                </ul>
              )}
            </div>
            
            {/* Actions */}
            <div className="md:col-span-2 mt-4 flex justify-end gap-3">
               <Button onClick={() => onResolveVouchReport(selectedReport.id, VouchReportStatus.ResolvedKept, selectedVouch.id, selectedVouch.voucheeId, selectedVouch.vouchType)} variant="outline" colorScheme="neutral" size="md">ยกเลิกรายงาน (เก็บ Vouch ไว้)</Button>
               <Button onClick={() => onResolveVouchReport(selectedReport.id, VouchReportStatus.ResolvedDeleted, selectedVouch.id, selectedVouch.voucheeId, selectedVouch.vouchType)} variant="accent" size="md">ลบ Vouch นี้</Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="mt-2">
        <h3 className="text-xl font-semibold text-accent mb-4">รายงานการรับรองที่รอตรวจสอบ ({vouchReports.length})</h3>
        {vouchReports.length === 0 ? <p className="text-center text-neutral-medium py-10">ไม่มีรายงานที่รอการตรวจสอบ</p> : (
          <div className="space-y-4">
            {vouchReports.map(report => (
              <div key={report.id} className="bg-white p-4 rounded-lg shadow border flex justify-between items-center">
                <div>
                  <p><strong>ผู้รายงาน:</strong> {getAuthorDisplayName(report.reporterId, 'Unknown')}</p>
                  <p className="text-sm"><strong>Voucher:</strong> {getAuthorDisplayName(report.voucherId, 'Unknown')} &rarr; <strong>Vouchee:</strong> {getAuthorDisplayName(report.voucheeId, 'Unknown')}</p>
                  <p className="text-xs text-neutral-medium">Reported: {formatDateDisplay(report.createdAt)}</p>
                </div>
                <Button onClick={() => setSelectedReport(report)} variant="primary" size="sm">ตรวจสอบ</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="container mx-auto p-4 sm:p-8 font-sans">
      <h2 className="text-3xl font-semibold text-accent mb-8 text-center">
        🔐 Admin Dashboard
      </h2>

      <div className="flex border-b border-neutral-DEFAULT mb-4 overflow-x-auto"> {/* Reduced bottom margin */}
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-3 sm:px-4 font-medium text-sm sm:text-base whitespace-nowrap flex-shrink-0
              ${activeTab === tab.id
                ? 'border-b-2 border-accent text-accent'
                : 'text-neutral-medium hover:text-accent'
              }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
            {tab.id === 'vouch_reports' && vouchReports.length > 0 && <span className="ml-1.5 inline-block bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{vouchReports.length}</span>}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'orion_command_center' && <OrionCommandCenter orionAnalyzeService={orionAnalyzeService} />}
        {activeTab === 'jobs' && renderContentForTab('jobs')}
        {activeTab === 'profiles' && renderContentForTab('profiles')}
        {activeTab === 'webboard' && renderContentForTab('webboard')}
        {activeTab === 'users' && renderUserRoleManagement()}
        {activeTab === 'site_controls' && renderSiteControls()}
        {activeTab === 'vouch_reports' && renderVouchReportsTab()}
      </div>
    </div>
  );
};