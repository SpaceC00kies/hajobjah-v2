
import React from 'react';
import type { Job, HelperProfile, User, WebboardPost, WebboardComment, UserLevel } from '../types';
import { View, USER_LEVELS } from '../types'; 
import { Button } from './Button';
import { UserLevelBadge } from './UserLevelBadge'; 
// Removed calculateUserLevel as getUserDisplayBadge is passed

interface MyPostsPageProps {
  currentUser: User;
  jobs: Job[];
  helperProfiles: HelperProfile[];
  webboardPosts: WebboardPost[]; 
  webboardComments: WebboardComment[]; 
  onEditItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => void; 
  onDeleteItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => void; 
  onToggleHiredStatus: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => void; 
  navigateTo: (view: View, payload?: any) => void; 
  getUserDisplayBadge: (user: User | null | undefined, posts: WebboardPost[], comments: WebboardComment[]) => UserLevel;
}

interface UserPostItem {
  id: string;
  title: string;
  type: 'job' | 'profile' | 'webboardPost'; 
  postedAt?: string; // Ensured this will be a string or undefined
  isHiredOrUnavailable?: boolean; 
  isSuspicious?: boolean; 
  originalItem: Job | HelperProfile | WebboardPost; 
  likesCount?: number;
  commentsCount?: number;
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

export const MyPostsPage: React.FC<MyPostsPageProps> = ({
  currentUser,
  jobs,
  helperProfiles,
  webboardPosts,
  webboardComments, 
  onEditItem,
  onDeleteItem,
  onToggleHiredStatus,
  navigateTo,
  getUserDisplayBadge,
}) => {
  const userJobs = jobs.filter(job => job.userId === currentUser.id);
  const userHelperProfiles = helperProfiles.filter(profile => profile.userId === currentUser.id);
  const userWebboardPosts = webboardPosts.filter(post => post.userId === currentUser.id); 

  const ensureStringDate = (dateInput: string | Date | undefined): string | undefined => {
    if (!dateInput) return undefined;
    return dateInput instanceof Date ? dateInput.toISOString() : dateInput;
  };

  const userItems: UserPostItem[] = [
    ...userJobs.map(job => ({
      id: job.id,
      title: job.title,
      type: 'job' as const,
      postedAt: ensureStringDate(job.postedAt),
      isHiredOrUnavailable: job.isHired,
      isSuspicious: job.isSuspicious,
      originalItem: job,
    })),
    ...userHelperProfiles.map(profile => ({
      id: profile.id,
      title: profile.profileTitle,
      type: 'profile' as const,
      postedAt: ensureStringDate(profile.postedAt),
      isHiredOrUnavailable: profile.isUnavailable,
      isSuspicious: profile.isSuspicious,
      originalItem: profile,
    })),
    ...userWebboardPosts.map(post => ({ 
      id: post.id,
      title: post.title,
      type: 'webboardPost' as const,
      postedAt: ensureStringDate(post.createdAt), // Use createdAt for webboard posts
      isHiredOrUnavailable: false, 
      isSuspicious: false, 
      originalItem: post,
      likesCount: post.likes.length,
      commentsCount: webboardComments.filter(c => c.postId === post.id).length,
    })),
  ].sort((a, b) => {
    if (a.postedAt && b.postedAt) {
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    }
    return 0;
  });

  const getStatusBadge = (item: UserPostItem) => {
    const postedAtDate = item.postedAt ? new Date(item.postedAt) : null;
    const isExpired = item.type !== 'webboardPost' && !item.isHiredOrUnavailable && postedAtDate ? (new Date().getTime() - postedAtDate.getTime()) / (1000 * 60 * 60 * 24) > 30 : false;

    let statusText = '';
    let dotColorClass = '';
    let badgeBgColorClass = '';
    let badgeTextColorClass = '';

    if (item.type === 'job') {
      if (item.isHiredOrUnavailable) {
        statusText = 'ได้งานแล้ว';
        dotColorClass = 'bg-green-500';
        badgeBgColorClass = 'bg-green-50 dark:bg-green-700/20';
        badgeTextColorClass = 'text-green-700 dark:text-green-300';
      } else if (item.isSuspicious) {
        statusText = 'น่าสงสัย (รอตรวจสอบ)';
        dotColorClass = 'bg-yellow-500';
        badgeBgColorClass = 'bg-yellow-100 dark:bg-yellow-700/20';
        badgeTextColorClass = 'text-yellow-700 dark:text-yellow-300';
      } else if (isExpired) {
        statusText = 'หมดอายุ';
        dotColorClass = 'bg-gray-400';
        badgeBgColorClass = 'bg-gray-100 dark:bg-gray-700/20';
        badgeTextColorClass = 'text-gray-700 dark:text-gray-300';
      } else {
        statusText = 'แสดงอยู่';
        dotColorClass = 'bg-blue-500';
        badgeBgColorClass = 'bg-blue-50 dark:bg-blue-700/20';
        badgeTextColorClass = 'text-blue-700 dark:text-blue-300';
      }
    } else if (item.type === 'profile') {
      if (item.isHiredOrUnavailable) {
        statusText = 'ไม่ว่างแล้ว';
        dotColorClass = 'bg-red-500';
        badgeBgColorClass = 'bg-red-50 dark:bg-red-700/20';
        badgeTextColorClass = 'text-red-700 dark:text-red-300';
      } else if (item.isSuspicious) {
        statusText = 'น่าสงสัย (รอตรวจสอบ)';
        dotColorClass = 'bg-yellow-500';
        badgeBgColorClass = 'bg-yellow-100 dark:bg-yellow-700/20';
        badgeTextColorClass = 'text-yellow-700 dark:text-yellow-300';
      } else if (isExpired) {
        statusText = 'หมดอายุ';
        dotColorClass = 'bg-gray-400';
        badgeBgColorClass = 'bg-gray-100 dark:bg-gray-700/20';
        badgeTextColorClass = 'text-gray-700 dark:text-gray-300';
      } else {
        statusText = 'แสดงอยู่';
        dotColorClass = 'bg-blue-500';
        badgeBgColorClass = 'bg-blue-50 dark:bg-blue-700/20';
        badgeTextColorClass = 'text-blue-700 dark:text-blue-300';
      }
    } else if (item.type === 'webboardPost') {
      // No status needed for webboard posts as per requirement
      return null;
    }

    if (!statusText) return null;

    return (
      <>
        <span className="font-sans text-sm text-neutral-dark dark:text-dark-textMuted">สถานะ: </span>
        <span className={`inline-flex items-center text-xs font-sans font-medium px-2 py-0.5 rounded-md ${badgeBgColorClass} ${badgeTextColorClass}`}>
          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${dotColorClass}`}></span>
          {statusText}
        </span>
      </>
    );
  };
  
  const getToggleStatusButtonText = (item: UserPostItem) => {
    if (item.type === 'job') {
        return item.isHiredOrUnavailable ? '🔄 แจ้งว่ายังหางาน' : '✅ แจ้งว่าได้งานแล้ว';
    } else if (item.type === 'profile') {
        return item.isHiredOrUnavailable ? '🟢 แจ้งว่ากลับมาว่าง' : '🔴 แจ้งว่าไม่ว่างแล้ว';
    }
    return null; 
  };

  const displayBadge = getUserDisplayBadge(currentUser, webboardPosts, webboardComments);

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-sans font-semibold text-neutral-800 dark:text-dark-text mb-2">
          📁 โพสต์ของฉัน
        </h2>
        <p className="text-md font-sans text-neutral-dark dark:text-dark-textMuted">
          จัดการประกาศงาน, โปรไฟล์ผู้ช่วย, และกระทู้ที่คุณสร้างไว้ @{currentUser.username} 
          <UserLevelBadge level={displayBadge} size="sm" />
        </p>
      </div>


      {userItems.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-dark-cardBg p-6 rounded-lg shadow">
          <svg className="mx-auto h-16 w-16 text-neutral-DEFAULT dark:text-dark-border mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-xl text-neutral-dark dark:text-dark-textMuted mb-6 font-normal">คุณยังไม่มีประกาศหรือโพสต์ใดๆ เลยนะ</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={() => navigateTo(View.PostJob)} variant="primary" size="md">
              + สร้างประกาศงาน
            </Button>
            <Button onClick={() => navigateTo(View.OfferHelp)} variant="secondary" size="md">
              + สร้างโปรไฟล์ผู้ช่วย
            </Button>
            <Button onClick={() => navigateTo(View.Webboard, 'create')} variant="accent" size="md">
              + สร้างกระทู้ใหม่
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {userItems.map(item => (
            <div key={`${item.type}-${item.id}`} className="bg-white dark:bg-dark-cardBg p-4 sm:p-6 rounded-lg shadow-lg border dark:border-dark-border">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-2">
                <div>
                    <h4 className="font-semibold text-xl mb-1 text-neutral-800 dark:text-dark-text">
                      {item.title}
                    </h4>
                    <span className="text-xs font-sans text-neutral-medium dark:text-dark-textMuted">
                      ประเภท: {item.type === 'job' ? 'ประกาศงาน' : item.type === 'profile' ? 'โปรไฟล์ผู้ช่วย' : 'กระทู้พูดคุย'}
                    </span>
                     {item.type === 'webboardPost' && (
                        <span className="text-xs font-sans text-neutral-medium dark:text-dark-textMuted ml-2">
                           ❤️ {item.likesCount || 0} ไลค์ | 💬 {item.commentsCount || 0} คอมเมนต์
                        </span>
                     )}
                </div>
                <span className="text-xs font-sans text-neutral-medium dark:text-dark-textMuted mt-1 sm:mt-0">
                  🕒 โพสต์เมื่อ: {formatDateDisplay(item.postedAt)}
                </span>
              </div>
              
              {(item.type === 'job' || item.type === 'profile') && (
                <div className="my-3 font-sans">
                    {getStatusBadge(item)}
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-sans">
                {(item.type === 'job' || item.type === 'profile' || item.type === 'webboardPost') && 
                    <Button
                      onClick={() => onEditItem(item.id, item.type)}
                      variant="outline"
                      colorScheme="neutral"
                      size="sm"
                      className="w-full"
                    >
                      ✏️ แก้ไขโพสต์
                    </Button>
                }

                {getToggleStatusButtonText(item) && (
                    <Button
                      onClick={() => onToggleHiredStatus(item.id, item.type)}
                      variant="outline"
                      colorScheme="neutral"
                      size="sm"
                      className="w-full"
                      disabled={item.isSuspicious}
                    >
                      {getToggleStatusButtonText(item)}
                    </Button>
                )}
                <Button
                  onClick={() => onDeleteItem(item.id, item.type)}
                  variant="outline" // Keep outline for structure, custom classes will handle colors
                  size="sm"
                  className="w-full text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-900/20 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white hover:border-transparent focus:ring-red-500"
                >
                  🗑️ ลบโพสต์
                </Button>
                {item.type === 'webboardPost' && (
                     <Button
                        onClick={() => navigateTo(View.Webboard, { postId: item.id })} 
                        variant="outline"
                        colorScheme="neutral"
                        size="sm"
                        className="w-full"
                    >
                        👁️ ดูกระทู้
                    </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
