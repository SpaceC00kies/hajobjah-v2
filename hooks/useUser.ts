import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  updateUserProfileService,
  saveUserWebboardPostService,
  unsaveUserWebboardPostService,
  vouchForUserService,
  getUserDocument,
} from '../services/userService';
import { toggleInterestService, logHelperContactInteractionService } from '../services/interactionService';
import { getHelperProfileDocument } from '../services/helperProfileService';
import { reportVouchService } from '../services/adminService';
import type { User, Vouch, VouchType } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging';

export const useUser = () => {
  const { currentUser, setCurrentUser } = useAuth();

  const updateUserProfile = useCallback(async (updatedProfileData: Partial<User>): Promise<boolean> => {
    if (!currentUser) {
      alert('ผู้ใช้ไม่ได้เข้าสู่ระบบ');
      return false;
    }
    try {
      await updateUserProfileService(currentUser.id, updatedProfileData);
      const updatedUser = await getUserDocument(currentUser.id);
      if (updatedUser) setCurrentUser(updatedUser);
      return true;
    } catch (error: any) {
      logFirebaseError("useUser.updateUserProfile", error);
      throw error;
    }
  }, [currentUser, setCurrentUser]);

  const toggleInterest = useCallback(async (targetId: string, targetType: 'job' | 'helperProfile', targetOwnerId: string) => {
    if (!currentUser) throw new Error("User not authenticated for toggling interest.");
    try {
      await toggleInterestService(targetId, targetType, targetOwnerId, currentUser.id);
      // UI updates are handled by the real-time listener in DataContext
    } catch (error) {
      logFirebaseError("useUser.toggleInterest", error);
      alert(`เกิดข้อผิดพลาดในการบันทึกความสนใจ: ${error}`);
    }
  }, [currentUser]);
  
  const saveWebboardPost = useCallback(async (postId: string) => {
    if (!currentUser) throw new Error("User not authenticated for saving post.");
    try {
      const isCurrentlySaved = currentUser.savedWebboardPosts?.includes(postId);
      if (isCurrentlySaved) {
        await unsaveUserWebboardPostService(currentUser.id, postId);
      } else {
        await saveUserWebboardPostService(currentUser.id, postId);
      }
      // UI updates are handled by the real-time listener in DataContext
    } catch (error) {
      logFirebaseError("useUser.saveWebboardPost", error);
      alert("เกิดข้อผิดพลาดในการบันทึกโพสต์");
    }
  }, [currentUser]);

  const vouchForUser = useCallback(async (voucheeId: string, vouchType: VouchType, comment?: string): Promise<void> => {
    if (!currentUser) {
        alert("กรุณาเข้าสู่ระบบเพื่อรับรองผู้ใช้");
        return;
    }

    const VOUCH_LIMIT_PER_MONTH = 5;
    const now = new Date();
    const currentPeriodStart = new Date(currentUser.postingLimits.vouchingActivity.periodStart as string);

    let currentCount = currentUser.postingLimits.vouchingActivity.monthlyCount;
    let periodNeedsReset = false;
    
    // Check if we are in a new month
    if (now.getMonth() !== currentPeriodStart.getMonth() || now.getFullYear() !== currentPeriodStart.getFullYear()) {
        periodNeedsReset = true;
        currentCount = 0;
    }

    if (currentCount >= VOUCH_LIMIT_PER_MONTH) {
        alert(`คุณใช้สิทธิ์การรับรองครบ ${VOUCH_LIMIT_PER_MONTH} ครั้งในเดือนนี้แล้ว`);
        return;
    }

    try {
      // The service expects IP and user agent. Since we cannot get this reliably on the client,
      // this should ideally be a Cloud Function call. For now, we pass placeholders.
      await vouchForUserService(currentUser, voucheeId, vouchType, 'not_recorded', 'not_recorded', comment);
      
      // Update user's vouch count locally for immediate feedback, though Firestore trigger is the source of truth
      const updatedUser = { ...currentUser };
      if (periodNeedsReset) {
          updatedUser.postingLimits.vouchingActivity = {
              monthlyCount: 1,
              periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          };
      } else {
          updatedUser.postingLimits.vouchingActivity.monthlyCount += 1;
      }
      setCurrentUser(updatedUser);

      alert("ขอบคุณสำหรับการรับรอง!");
    } catch (error) {
      logFirebaseError("useUser.vouchForUser", error);
      alert(`เกิดข้อผิดพลาดในการรับรอง: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [currentUser, setCurrentUser]);

  const reportVouch = useCallback(async (vouch: Vouch, comment: string): Promise<void> => {
    if (!currentUser) {
        alert("กรุณาเข้าสู่ระบบเพื่อรายงาน");
        return;
    }
    try {
        await reportVouchService(vouch, currentUser.id, comment);
        alert("ขอบคุณสำหรับรายงาน เราจะทำการตรวจสอบโดยเร็วที่สุด");
    } catch (error) {
        logFirebaseError("useUser.reportVouch", error);
        alert("เกิดข้อผิดพลาดในการส่งรายงาน");
    }
  }, [currentUser]);

  const logContact = useCallback(async (helperProfileId: string) => {
    if (!currentUser) return;
    try {
      const helperProfile = await getHelperProfileDocument(helperProfileId);
      if (!helperProfile) throw new Error('Helper profile not found.');
      if (helperProfile.userId === currentUser.id) return; // Don't log self-contact
      await logHelperContactInteractionService(helperProfileId, currentUser.id, helperProfile.userId);
    } catch (error) {
      logFirebaseError('useUser.logContact', error);
      // Fail silently, not critical for user experience
    }
  }, [currentUser]);

  return {
    updateUserProfile,
    toggleInterest,
    saveWebboardPost,
    vouchForUser,
    reportVouch,
    logContact,
  };
};