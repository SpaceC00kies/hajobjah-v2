import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  setSiteLockService,
  setUserRoleService,
  resolveVouchReportService,
  toggleItemFlagService,
  getVouchDocument,
  orionAnalyzeService,
  forceResolveVouchReportService,
} from '../services/adminService';
import { deleteBlogPostService } from '../services/blogService';
import type { UserRole, VouchReportStatus, VouchType, Job, HelperProfile, WebboardPost } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging';

export const useAdmin = () => {
  const { currentUser } = useAuth();
  const { allJobsForAdmin, allHelperProfilesForAdmin, allWebboardPostsForAdmin } = useData();
  
  const checkAdmin = useCallback(() => {
      if (!currentUser || currentUser.role !== 'Admin') {
          throw new Error("Permission denied. Administrator access required.");
      }
  }, [currentUser]);

  const setUserRole = useCallback(async (userIdToUpdate: string, newRole: UserRole) => {
    checkAdmin();
    if (userIdToUpdate === currentUser!.id) throw new Error("Administrators cannot change their own role.");
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

  const forceResolveVouchReport = useCallback(async (reportId: string, vouchId: string, voucheeId: string, vouchType: VouchType) => {
    checkAdmin();
    try {
      await forceResolveVouchReportService(reportId, currentUser!.id, vouchId, voucheeId, vouchType);
      alert('The report has been resolved and the ghost vouch has been cleared.');
    } catch (error: any) {
      logFirebaseError("useAdmin.forceResolveVouchReport", error);
      throw error;
    }
  }, [currentUser, checkAdmin]);

  const toggleItemFlag = useCallback(async (collectionName: 'jobs' | 'helperProfiles' | 'webboardPosts', itemId: string, flagName: keyof Job | keyof HelperProfile | keyof WebboardPost) => {
    checkAdmin();
    const collectionMap = {
      jobs: allJobsForAdmin,
      helperProfiles: allHelperProfilesForAdmin,
      webboardPosts: allWebboardPostsForAdmin,
    };
    const item = collectionMap[collectionName].find(i => i.id === itemId);
    if (!item) throw new Error("Item not found");
    await toggleItemFlagService(collectionName, itemId, flagName, (item as any)[flagName]);
  }, [checkAdmin, allJobsForAdmin, allHelperProfilesForAdmin, allWebboardPostsForAdmin]);
  
  // Job specific admin actions
  const toggleSuspiciousJob = (jobId: string) => toggleItemFlag('jobs', jobId, 'isSuspicious');
  const togglePinnedJob = (jobId: string) => toggleItemFlag('jobs', jobId, 'isPinned');
  const toggleVerifiedJob = (jobId: string) => toggleItemFlag('jobs', jobId, 'adminVerified');

  // Helper specific admin actions
  const toggleSuspiciousHelperProfile = (profileId: string) => toggleItemFlag('helperProfiles', profileId, 'isSuspicious');
  const togglePinnedHelperProfile = (profileId: string) => toggleItemFlag('helperProfiles', profileId, 'isPinned');
  const toggleVerifiedExperience = (profileId: string) => toggleItemFlag('helperProfiles', profileId, 'adminVerifiedExperience');

  // Webboard specific admin actions
  const pinWebboardPost = (postId: string) => toggleItemFlag('webboardPosts', postId, 'isPinned');
  
  return {
    setUserRole,
    toggleSiteLock,
    resolveVouchReport,
    getVouchDocument, // Passthrough from service
    orionAnalyzeService, // Passthrough from service
    forceResolveVouchReport,
    toggleSuspiciousJob,
    togglePinnedJob,
    toggleVerifiedJob,
    toggleSuspiciousHelperProfile,
    togglePinnedHelperProfile,
    toggleVerifiedExperience,
    pinWebboardPost,
    deleteBlogPost: deleteBlogPostService, // Passthrough
  };
};