import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  updateUserProfileService,
  saveUserWebboardPostService,
  unsaveUserWebboardPostService,
  vouchForUserService,
  getUserDocument,
} from '../services/userService';
import { toggleInterestService } from '../services/interactionService';
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

  const vouchForUser = useCallback(async (voucheeId: string, vouchType: VouchType, comment?: string) => {
    if (!currentUser) throw new Error("User not authenticated for vouching.");
    try {
      const ipAddress = "127.0.0.1"; // Placeholder for client-side IP
      const userAgent = navigator.userAgent;
      await vouchForUserService(currentUser, voucheeId, vouchType, ipAddress, userAgent, comment);
      alert("ขอบคุณสำหรับการรับรอง!");
    } catch (error: any) {
      logFirebaseError("useUser.vouchForUser", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  }, [currentUser]);
  
  const reportVouch = useCallback(async (vouch: Vouch, comment: string) => {
    if (!currentUser) throw new Error("User not authenticated for reporting.");
    try {
      await reportVouchService(vouch, currentUser.id, comment);
      alert("ขอบคุณที่รายงานเข้ามา เราจะทำการตรวจสอบโดยเร็วที่สุด");
    } catch (error: any) {
      logFirebaseError("useUser.reportVouch", error);
      alert(`เกิดข้อผิดพลาดในการส่งรายงาน: ${error.message}`);
    }
  }, [currentUser]);

  return {
    updateUserProfile,
    toggleInterest,
    saveWebboardPost,
    vouchForUser,
    reportVouch,
  };
};