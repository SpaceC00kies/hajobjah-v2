
import { useCallback, useContext } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { JobsContext } from '../context/JobsContext.tsx';
import {
  addJobService,
  updateJobService,
  deleteJobService,
} from '../services/jobService.ts';
import { toggleItemFlagService } from '../services/adminService.ts';
import { getUserDocument } from '../services/userService.ts';
import { containsBlacklistedWords } from '../utils/validation.ts';
import { isDateInPast } from '../utils/dateUtils.ts';
import { logFirebaseError } from '../firebase/logging.ts';
import type { Job, User } from '../types/types.ts';

const JOB_COOLDOWN_DAYS = 3;
const MAX_ACTIVE_JOBS_FREE_TIER = 3;
const MAX_ACTIVE_JOBS_BADGE = 4;

export type JobFormData = Omit<Job, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'posterIsAdminVerified' | 'interestedCount' | 'companyLogoUrl' | 'adminVerified'>;

const generateContactString = (user: User): string => {
    let contactParts: string[] = [];
    if (user.mobile) contactParts.push(`เบอร์โทร: ${user.mobile}`);
    if (user.lineId) contactParts.push(`LINE ID: ${user.lineId}`);
    if (user.facebook) contactParts.push(`Facebook: ${user.facebook}`);
    return contactParts.join('\n') || 'ไม่ระบุช่องทางติดต่อ (โปรดอัปเดตโปรไฟล์)';
};

export const useJobs = () => {
  const context = useContext(JobsContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobsProvider');
  }
  const { allJobsForAdmin, isLoadingJobs } = context;
  const { currentUser, setCurrentUser } = useAuth();

  const checkJobPostingLimits = useCallback(async (): Promise<{ canPost: boolean; message?: string }> => {
    if (!currentUser) return { canPost: false, message: "กรุณาเข้าสู่ระบบ" };
    
    // Admin users have no restrictions
    if (currentUser.role === 'Admin') {
        return { canPost: true };
    }
    
    // Verified users have different limits but still have cooldown
    const isVerified = currentUser.adminVerified;
    const cooldownHoursTotal = JOB_COOLDOWN_DAYS * 24;
    
    if (currentUser.postingLimits.lastJobPostDate) {
        const hoursSinceLastPost = (new Date().getTime() - new Date(currentUser.postingLimits.lastJobPostDate as string).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastPost < cooldownHoursTotal) {
            const hoursRemaining = Math.ceil(cooldownHoursTotal - hoursSinceLastPost);
            return { canPost: false, message: `คุณสามารถโพสต์งานใหม่ได้ในอีก ${hoursRemaining} ชั่วโมง` };
        }
    }
    
    const userActiveJobs = allJobsForAdmin.filter(job => job.userId === currentUser.id && !isDateInPast(job.expiresAt) && !job.isExpired).length;

    let maxJobs = (currentUser.tier === 'free') ? MAX_ACTIVE_JOBS_FREE_TIER : 999;
    if (currentUser.activityBadge?.isActive) {
        maxJobs = MAX_ACTIVE_JOBS_BADGE;
    }
    
    // Verified users can post up to 5 jobs
    if (isVerified) {
        maxJobs = 5;
    }

    if (userActiveJobs >= maxJobs) {
        return { canPost: false, message: `คุณมีงานที่ยังไม่หมดอายุ ${userActiveJobs}/${maxJobs} งานแล้ว` };
    }
    return { canPost: true };
  }, [currentUser, allJobsForAdmin]);

  const addJob = useCallback(async (newJobData: JobFormData) => {
    if (!currentUser) throw new Error("User not authenticated");
    const limitCheck = await checkJobPostingLimits();
    if (!limitCheck.canPost) throw new Error(limitCheck.message);
    if (containsBlacklistedWords(newJobData.description) || containsBlacklistedWords(newJobData.title)) {
      throw new Error('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม');
    }

    try {
      const contactInfo = generateContactString(currentUser);
      await addJobService(newJobData, { userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, contact: contactInfo, authorPhotoUrl: currentUser.photo });
      const updatedUser = await getUserDocument(currentUser.id);
      if (updatedUser) setCurrentUser(updatedUser);
    } catch (error: any) {
      logFirebaseError("useJobs.addJob", error);
      throw error;
    }
  }, [currentUser, checkJobPostingLimits, setCurrentUser]);

  const updateJob = useCallback(async (jobId: string, updatedJobData: JobFormData) => {
    if (!currentUser) throw new Error("User not authenticated");
    const originalJob = allJobsForAdmin.find(j => j.id === jobId);
    if (!originalJob) throw new Error("ไม่พบประกาศรับสมัครเดิม");
    if (originalJob.userId !== currentUser.id) throw new Error("คุณไม่มีสิทธิ์แก้ไขประกาศรับสมัครนี้");
    if (containsBlacklistedWords(updatedJobData.description) || containsBlacklistedWords(updatedJobData.title)) {
        throw new Error('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม');
    }
    try {
        const contactInfo = generateContactString(currentUser);
        await updateJobService(jobId, updatedJobData, contactInfo, currentUser.photo);
    } catch(error: any) {
        logFirebaseError("useJobs.updateJob", error);
        throw error;
    }
  }, [currentUser, allJobsForAdmin]);

  const deleteJob = useCallback(async (jobId: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    const jobToDelete = allJobsForAdmin.find(j => j.id === jobId);
    if(!jobToDelete) throw new Error("Job not found");
    if(jobToDelete.userId !== currentUser.id && currentUser.role !== 'Admin') throw new Error("Permission denied");
    
    try {
        await deleteJobService(jobId);
    } catch (error: any) {
        logFirebaseError("useJobs.deleteJob", error);
        throw error;
    }
  }, [currentUser, allJobsForAdmin]);
  
  const toggleJobFlag = useCallback(async (jobId: string, flagName: keyof Job) => {
    if (!currentUser || currentUser.role !== 'Admin') throw new Error("Permission denied");
    const job = allJobsForAdmin.find(j => j.id === jobId);
    if (!job) throw new Error("Job not found");
    try {
      await toggleItemFlagService('jobs', jobId, flagName, (job as any)[flagName]);
    } catch (error: any) {
      logFirebaseError(`useJobs.toggleJobFlag (${String(flagName)})`, error);
      throw error;
    }
  }, [currentUser, allJobsForAdmin]);

  const toggleSuspiciousJob = (jobId: string) => toggleJobFlag(jobId, 'isSuspicious');
  const togglePinnedJob = (jobId: string) => toggleJobFlag(jobId, 'isPinned');
  const toggleHiredJob = (jobId: string) => toggleJobFlag(jobId, 'isHired');

  return { allJobsForAdmin, addJob, updateJob, deleteJob, checkJobPostingLimits, toggleSuspiciousJob, togglePinnedJob, toggleHiredJob, isLoadingJobs };
};
