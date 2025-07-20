"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import type { Job, HelperProfile, User, WebboardPost, WebboardComment, UserLevel } from '../types/types';
import { Button } from './Button';
import { isDateInPast, calculateHoursRemaining } from '../utils/dateUtils';

interface MyPostsPageProps {
  currentUser: User;
  jobs: Job[];
  helperProfiles: HelperProfile[];
  webboardPosts: WebboardPost[];
  webboardComments: WebboardComment[];
  onEditItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => void;
  onDeleteItem: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => void;
  onToggleHiredStatus: (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => void;
  getUserDisplayBadge: (user: User | null | undefined, posts: WebboardPost[], comments: WebboardComment[]) => UserLevel;
}

interface UserPostItem {
  id: string;
  title: string;
  type: 'job' | 'profile' | 'webboardPost';
  postedAt?: string;
  isHiredOrUnavailable?: boolean;
  isSuspicious?: boolean;
  originalItem: Job | HelperProfile | WebboardPost;
  likesCount?: number;
  commentsCount?: number;
  expiresAt?: string | Date; // Added for calculating days remaining for job/profile
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

export const MyPostsPage: React.FC<MyPostsPageProps> = ({
  currentUser,
  jobs,
  helperProfiles,
  webboardPosts,
  webboardComments,
  onEditItem,
  onDeleteItem,
  onToggleHiredStatus,
}) => {
  const router = useRouter();
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
      expiresAt: job.expiresAt,
    })),
    ...userHelperProfiles.map(profile => ({
      id: profile.id,
      title: profile.profileTitle,
      type: 'profile' as const,
      postedAt: ensureStringDate(profile.postedAt),
      isHiredOrUnavailable: profile.isUnavailable,
      isSuspicious: profile.isSuspicious,
      originalItem: profile,
      expiresAt: profile.expiresAt,
    })),
    ...userWebboardPosts.map(post => ({
      id: post.id,
      title: post.title,
      type: 'webboardPost' as const,
      postedAt: ensureStringDate(post.createdAt),
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
    let isTrulyExpired = false;
    if (item.type === 'job' || item.type === 'profile') {
        const originalPost = item.originalItem as Job | HelperProfile;
        isTrulyExpired = originalPost.isExpired || (originalPost.expiresAt ? isDateInPast(originalPost.expiresAt) : false);
    }

    let statusText = '';
    let dotColorClass = '';
    let badgeBgColorClass = '';
    let badgeTextColorClass = '';

    if (item.type === 'job') {
      if (item.isHiredOrUnavailable) {
        statusText = 'ได้งานแล้ว';
        dotColorClass = 'bg-green-500';
        badgeBgColorClass = 'bg-green-50';
        badgeTextColorClass = 'text-green-700';
      } else if (item.isSuspicious) {
        statusText = 'น่าสงสัย (รอตรวจสอบ)';
        dotColorClass = 'bg-yellow-500';
        badgeBgColorClass = 'bg-yellow-100';
        badgeTextColorClass = 'text-yellow-700';
      } else if (isTrulyExpired) {
        statusText = 'หมดอายุ';
        dotColorClass = 'bg-gray-400';
        badgeBgColorClass = 'bg-gray-100';
        badgeTextColorClass = 'text-gray-700';
      } else {
        statusText = 'แสดงอยู่';
        dotColorClass = 'bg-blue-500';
        badgeBgColorClass = 'bg-blue-50';
        badgeTextColorClass = 'text-blue-700';
      }
    } else if (item.type === 'profile') {
      if (item.isHiredOrUnavailable) {
        statusText = 'ไม่ว่างแล้ว';
        dotColorClass = 'bg-red-500';
        badgeBgColorClass = 'bg-red-50';
        badgeTextColorClass = 'text-red-700';
      } else if (item.isSuspicious) {
        statusText = 'น่าสงสัย (รอตรวจสอบ)';
        dotColorClass = 'bg-yellow-500';
        badgeBgColorClass = 'bg-yellow-100';
        badgeTextColorClass = 'text-yellow-700';
      } else if (isTrulyExpired) {
        statusText = 'หมดอายุ';
        dotColorClass = 'bg-gray-400';
        badgeBgColorClass = 'bg-gray-100';
        badgeTextColorClass = 'text-gray-700';
      } else {
        statusText = 'แสดงอยู่';
        dotColorClass = 'bg-blue-500';
        badgeBgColorClass = 'bg-blue-50';
        badgeTextColorClass = 'text-blue-700';
      }
    } else if (item.type === 'webboardPost') {
      return null;
    }

    if (!statusText) return null;

    return (
      <>
        <span className="font-sans text-sm text-neutral-dark">สถานะ: </span>
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

  const JOB_COOLDOWN_DAYS_DISPLAY = 3;
  const HELPER_PROFILE_COOLDOWN_DAYS_DISPLAY = 3;
  const MAX_ACTIVE_JOBS_FREE_TIER_DISPLAY = 3;
  const MAX_ACTIVE_HELPER_PROFILES_FREE_TIER_DISPLAY = 1;
  const MAX_ACTIVE_JOBS_BADGE_DISPLAY = 4;
  const MAX_ACTIVE_HELPER_PROFILES_BADGE_DISPLAY = 2;


  const userActiveJobsCount = userJobs.filter(
    job => !job.isExpired && (job.expiresAt ? !isDateInPast(job.expiresAt) : true)
  ).length;
  
  let maxJobsAllowed = (currentUser.tier === 'free') ? MAX_ACTIVE_JOBS_FREE_TIER_DISPLAY : 999;
  if (currentUser.activityBadge?.isActive) {
    maxJobsAllowed = MAX_ACTIVE_JOBS_BADGE_DISPLAY;
  }

  let jobCooldownHoursRemaining = 0;
  const lastJobPostDate = currentUser.postingLimits?.lastJobPostDate;
  if (lastJobPostDate) {
    const jobCooldownTotalHours = JOB_COOLDOWN_DAYS_DISPLAY * 24;
    const hoursSinceLastJobPost = (new Date().getTime() - new Date(lastJobPostDate as string).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastJobPost < jobCooldownTotalHours) {
      jobCooldownHoursRemaining = Math.ceil(jobCooldownTotalHours - hoursSinceLastJobPost);
    }
  }
  const jobCanCreate = jobCooldownHoursRemaining <= 0;

  const userActiveHelperProfilesCount = userHelperProfiles.filter(
    profile => !profile.isExpired && (profile.expiresAt ? !isDateInPast(profile.expiresAt) : true)
  ).length;

  let maxHelperProfilesAllowed = (currentUser.tier === 'free') ? MAX_ACTIVE_HELPER_PROFILES_FREE_TIER_DISPLAY : 999;
  if (currentUser.activityBadge?.isActive) {
    maxHelperProfilesAllowed = MAX_ACTIVE_HELPER_PROFILES_BADGE_DISPLAY;
  }

  let helperProfileCooldownHoursRemaining = 0;
  const lastHelperProfileDate = currentUser.postingLimits?.lastHelperProfileDate;
  if (lastHelperProfileDate) {
    const helperCooldownTotalHours = HELPER_PROFILE_COOLDOWN_DAYS_DISPLAY * 24;
    const hoursSinceLastHelperProfilePost = (new Date().getTime() - new Date(lastHelperProfileDate as string).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastHelperProfilePost < helperCooldownTotalHours) {
      helperProfileCooldownHoursRemaining = Math.ceil(helperCooldownTotalHours - hoursSinceLastHelperProfilePost);
    }
  }
  const profileCanCreate = helperProfileCooldownHoursRemaining <= 0;


  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-sans font-semibold text-neutral-800 mb-2">
          📁 โพสต์ของฉัน
        </h2>
        <p className="text-md font-sans text-neutral-dark">
          รวมโพสต์ทั้งหมดของคุณที่นี่
        </p>
      </div>

      <div className="mb-8 p-4 bg-white shadow-md rounded-lg border border-neutral-DEFAULT">
        <h3 className="text-xl font-sans font-semibold text-neutral-700 mb-3 text-center">
         📊 สถานะโพสต์
        </h3>
        <div className="space-y-2 text-sm font-sans text-neutral-dark">
          <div className="flex justify-between items-center p-2 bg-neutral-light/50 rounded">
            <span>ประกาศงาน: {userActiveJobsCount}/{maxJobsAllowed}</span>
            {jobCanCreate ? (
              <span className="text-green-600"> (พร้อมสร้าง)</span>
            ) : (
              <span className="text-orange-600"> (พร้อมสร้าง)</span>
            )}
          </div>
          <div className="flex justify-between items-center p-2 bg-neutral-light/50 rounded">
            <span>โปรไฟล์ผู้ช่วย: {userActiveHelperProfilesCount}/{maxHelperProfilesAllowed}</span>
            {profileCanCreate ? (
              <span className="text-green-600"> (พร้อมสร้าง)</span>
            ) : (
              <span className="text-orange-600"> (พร้อมสร้าง)</span>
            )}
          </div>
        </div>
      </div>


      {userItems.length === 0 ? (
        <div className="text-center py-10 bg-white p-6 rounded-lg shadow">
          <svg className="mx-auto h-16 w-16 text-neutral-DEFAULT mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-xl text-neutral-dark mb-6 font-normal">คุณยังไม่มีประกาศหรือโพสต์ใดๆ เลยนะ</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={() => router.push('/post-job')} variant="primary" size="md">
              + สร้างประกาศงาน
            </Button>
            <Button onClick={() => router.push('/offer-help')} variant="secondary" size="md">
              + สร้างโปรไฟล์ผู้ช่วย
            </Button>
            <Button onClick={() => router.push('/webboard?action=create')} variant="accent" size="md">
              + สร้างกระทู้ใหม่
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {userItems.map(item => {
            let daysRemainingElement = null;
            if (item.type === 'job' || item.type === 'profile') {
              const expiresAt = item.expiresAt;
              const isTrulyActive = !item.isHiredOrUnavailable && !item.isSuspicious && expiresAt && !isDateInPast(expiresAt);

              if (isTrulyActive) {
                const hoursLeft = calculateHoursRemaining(expiresAt); // Use hours for precision
                if (hoursLeft > 0) {
                  const daysLeftDisplay = Math.ceil(hoursLeft / 24); // Display in days
                  daysRemainingElement = (
                    <span className="text-xs font-sans text-blue-600">
                      (⏳ เหลือเวลา {daysLeftDisplay} วัน)
                    </span>
                  );
                }
              }
            }

            return (
              <div key={`${item.type}-${item.id}`} className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-neutral-DEFAULT">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-2">
                  <div>
                      <h4 className="font-semibold text-xl mb-1 text-neutral-800">
                        {item.title}
                      </h4>
                      <span className="text-xs font-sans text-neutral-medium">
                        ประเภท: {item.type === 'job' ? 'ประกาศงาน' : item.type === 'profile' ? 'โปรไฟล์ผู้ช่วย' : 'กระทู้พูดคุย'}
                      </span>
                       {item.type === 'webboardPost' && (
                          <span className="text-xs font-sans text-neutral-medium ml-2">
                             ❤️ {item.likesCount || 0} ไลค์ | 💬 {item.commentsCount || 0} คอมเมนต์
                          </span>
                       )}
                       {daysRemainingElement}
                  </div>
                  <span className="text-xs font-sans text-neutral-medium mt-1 sm:mt-0">
                    โพสต์เมื่อ: {formatDateDisplay(item.postedAt)}
                  </span>
                </div>
                <div className="mb-3">
                  {getStatusBadge(item)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(item.type === 'job' || item.type === 'profile') && (
                    <Button
                      onClick={() => onToggleHiredStatus(item.id, item.type)}
                      variant="outline"
                      colorScheme="neutral"
                      size="sm"
                      disabled={item.isSuspicious || (item.expiresAt ? isDateInPast(item.expiresAt) : false)}
                    >
                      {getToggleStatusButtonText(item)}
                    </Button>
                  )}
                  {item.type === 'webboardPost' && (
                     <Button onClick={() => router.push(`/webboard/${item.id}`)} variant="outline" colorScheme="neutral" size="sm">
                        👁️ ดูกระทู้
                     </Button>
                  )}
                  <Button onClick={() => onEditItem(item.id, item.type)} variant="outline" colorScheme="neutral" size="sm" disabled={item.isSuspicious}>✏️ แก้ไข</Button>
                  <Button onClick={() => onDeleteItem(item.id, item.type)} variant="outline" colorScheme="accent" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white" size="sm" disabled={item.isSuspicious}>🗑️ ลบ</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
