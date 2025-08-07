import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  updateUserProfileService,
  saveUserWebboardPostService,
  unsaveUserWebboardPostService,
  saveUserBlogPostService,
  unsaveUserBlogPostService,
  vouchForUserService,
} from '../services/userService.ts';
import { toggleInterestService, logHelperContactInteractionService } from '../services/interactionService.ts';
import { getHelperProfileDocument } from '../services/helperProfileService.ts';
import { reportVouchService } from '../services/adminService.ts';
import type { User, Vouch, VouchType } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging.ts';
import { getUserDocument } from '../services/userService.ts';

export const useUser = () => {
  const { currentUser, setCurrentUser } = useAuth();

  const updateUserProfile = useCallback(
    async (updatedProfileData: Partial<User>): Promise<void> => {
      if (!currentUser) {
        throw new Error("User not authenticated");
      }
      try {
        await updateUserProfileService(currentUser.id, updatedProfileData);
        const updatedUser = await getUserDocument(currentUser.id);
        if (updatedUser) {
            setCurrentUser(updatedUser);
        }
      } catch (err: any) {
        logFirebaseError("useUser.updateUserProfile", err);
        throw err;
      }
    },
    [currentUser, setCurrentUser]
  );

  const toggleInterest = useCallback(async (targetId: string, targetType: 'job' | 'helperProfile', targetOwnerId: string) => {
    if (!currentUser) throw new Error("User not authenticated for toggling interest.");
    
    try {
      await toggleInterestService(targetId, targetType, targetOwnerId, currentUser.id);
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
    } catch (error) {
      logFirebaseError("useUser.saveWebboardPost", error);
      alert("เกิดข้อผิดพลาดในการบันทึกโพสต์");
    }
  }, [currentUser]);

  const saveBlogPost = useCallback(async (postId: string) => {
    if (!currentUser) throw new Error("User not authenticated for saving blog post.");
    
    try {
      const isCurrentlySaved = currentUser.savedBlogPosts?.includes(postId);
      if (isCurrentlySaved) {
        await unsaveUserBlogPostService(currentUser.id, postId);
      } else {
        await saveUserBlogPostService(currentUser.id, postId);
      }
    } catch (error) {
      logFirebaseError("useUser.saveBlogPost", error);
      alert("เกิดข้อผิดพลาดในการบันทึกบทความ");
    }
  }, [currentUser]);

  const vouchForUser = useCallback(async (voucheeId: string, vouchType: VouchType, comment?: string): Promise<void> => {
    if (!currentUser) {
        alert("กรุณาเข้าสู่ระบบเพื่อรับรองผู้ใช้");
        return;
    }

    const VOUCH_LIMIT_PER_MONTH = 5;
    const now = new Date();

    // Defensively get vouching activity, providing a default if it doesn't exist for older users.
    const vouchingActivity = currentUser.postingLimits?.vouchingActivity || {
        monthlyCount: 0,
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    };

    const currentPeriodStart = new Date(vouchingActivity.periodStart as string);
    let currentCount = vouchingActivity.monthlyCount;
    let periodNeedsReset = false;
    
    // Check if the vouching period has reset (new month).
    if (now.getMonth() !== currentPeriodStart.getMonth() || now.getFullYear() !== currentPeriodStart.getFullYear()) {
        periodNeedsReset = true;
        currentCount = 0;
    }

    if (currentCount >= VOUCH_LIMIT_PER_MONTH) {
        alert(`คุณใช้สิทธิ์การรับรองครบ ${VOUCH_LIMIT_PER_MONTH} ครั้งในเดือนนี้แล้ว`);
        return;
    }

    try {
      // This service call handles the backend transaction.
      await vouchForUserService(currentUser, voucheeId, vouchType, 'not_recorded', 'not_recorded', comment);
      
      // Optimistically update the local user state for immediate UI feedback.
      const updatedUser = { ...currentUser };
      
      const newVouchingActivity = periodNeedsReset
        ? {
            monthlyCount: 1,
            periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          }
        : {
            ...vouchingActivity,
            monthlyCount: vouchingActivity.monthlyCount + 1,
          };

      // Safely update the nested property.
      updatedUser.postingLimits = {
        ...(updatedUser.postingLimits || {}),
        vouchingActivity: newVouchingActivity,
      } as any;
      
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
    }
  }, [currentUser]);

  return {
    updateUserProfile,
    toggleInterest,
    saveWebboardPost,
    saveBlogPost,
    vouchForUser,
    reportVouch,
    logContact,
  };
};
