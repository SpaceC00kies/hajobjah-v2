import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useJobs } from './useJobs.ts';
import { useHelpers } from './useHelpers.ts';
import { useWebboard } from './useWebboard.ts';
import { useBlog } from './useBlog.ts';
import {
  setSiteLockService,
  setUserRoleService,
  resolveVouchReportService,
  getVouchDocument,
  orionAnalyzeService,
  forceResolveVouchReportService,
  toggleItemFlagService,
} from '../services/adminService.ts';
import type { UserRole, VouchReportStatus, VouchType } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging.ts';

export const useAdmin = () => {
  const { currentUser } = useAuth();
  const { toggleSuspiciousJob, togglePinnedJob, toggleVerifiedJob } = useJobs();
  const { onToggleSuspiciousHelperProfile: toggleSuspiciousHelperProfile, onTogglePinnedHelperProfile: togglePinnedHelperProfile, onToggleVerifiedExperience: toggleVerifiedExperience } = useHelpers();
  const { allWebboardPostsForAdmin, canEditOrDelete: canWebboardEditOrDelete } = useWebboard();
  const { deleteBlogPost } = useBlog();

  const checkAdmin = useCallback(() => {
      if (!currentUser || currentUser.role !== 'Admin') {
          throw new Error("Permission denied. Administrator access required.");
      }
  }, [currentUser]);

  const setUserRole = useCallback(async (userIdToUpdate: string, newRole: UserRole) => {
    checkAdmin();
    if (currentUser && userIdToUpdate === currentUser.id) throw new Error("Administrators cannot change their own role.");
    try {
      await setUserRoleService(userIdToUpdate, newRole);
      alert(`User role updated successfully.`);
    } catch (error: any) {
      logFirebaseError("useAdmin.setUserRole", error);
      throw error;
    }
  }, [currentUser, checkAdmin]);

  const toggleSiteLock = useCallback(async (currentLockState: boolean) => {
    checkAdmin();
    try {
      await setSiteLockService(!currentLockState, currentUser!.id);
    } catch (error: any) {
      logFirebaseError("useAdmin.toggleSiteLock", error);
      throw error;
    }
  }, [currentUser, checkAdmin]);
  
  const resolveVouchReport = useCallback(async (reportId: string, resolution: VouchReportStatus.ResolvedDeleted | VouchReportStatus.ResolvedKept, vouchId: string, voucheeId: string, vouchType?: VouchType) => {
    checkAdmin();
    try {
      await resolveVouchReportService(reportId, resolution, currentUser!.id, vouchId, voucheeId, vouchType);
      alert(`Report resolved successfully.`);
    } catch (error: any) {
      logFirebaseError("useAdmin.resolveVouchReport", error);
      throw error;
    }
  }, [currentUser, checkAdmin]);

  const forceResolveVouchReport = useCallback(async (reportId: string, vouchId: string, voucheeId: string, vouchType: VouchType | null) => {
    checkAdmin();
    try {
      await forceResolveVouchReportService(reportId, currentUser!.id, vouchId, voucheeId, vouchType);
      alert('The report has been resolved and cleanup has been performed.');
    } catch (error: any) {
      logFirebaseError("useAdmin.forceResolveVouchReport", error);
      throw error;
    }
  }, [currentUser, checkAdmin]);

  const pinWebboardPost = useCallback(async (postId: string) => {
    const post = allWebboardPostsForAdmin.find(p => p.id === postId);
    if (!post || !canWebboardEditOrDelete(post.userId, post.ownerId)) throw new Error("Permission denied");
    await toggleItemFlagService('webboardPosts', postId, 'isPinned', post.isPinned);
  }, [allWebboardPostsForAdmin, canWebboardEditOrDelete]);

  return {
    setUserRole,
    toggleSiteLock,
    resolveVouchReport,
    getVouchDocument, 
    orionAnalyzeService,
    forceResolveVouchReport,
    toggleSuspiciousJob,
    togglePinnedJob,
    toggleVerifiedJob,
    toggleSuspiciousHelperProfile,
    togglePinnedHelperProfile,
    toggleVerifiedExperience,
    pinWebboardPost,
    deleteBlogPost,
  };
};