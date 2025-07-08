import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  addHelperProfileService,
  updateHelperProfileService,
  deleteHelperProfileService,
  bumpHelperProfileService
} from '../services/helperProfileService';
import { toggleItemFlagService } from '../services/adminService';
import { getUserDocument } from '../services/userService';
import { containsBlacklistedWords } from '../utils/validation';
import { isDateInPast } from '../utils/dateUtils';
import { logFirebaseError } from '../firebase/logging';
import type { HelperProfile, User, GenderOption, HelperEducationLevelOption } from '../types';

const HELPER_PROFILE_COOLDOWN_DAYS = 3;
const MAX_ACTIVE_HELPER_PROFILES_FREE_TIER = 1;
const MAX_ACTIVE_HELPER_PROFILES_BADGE = 2;
const BUMP_COOLDOWN_DAYS = 30;

type HelperProfileFormData = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'lastBumpedAt'>;

const generateContactString = (user: User): string => {
    let contactParts: string[] = [];
    if (user.mobile) contactParts.push(`เบอร์โทร: ${user.mobile}`);
    if (user.lineId) contactParts.push(`LINE ID: ${user.lineId}`);
    if (user.facebook) contactParts.push(`Facebook: ${user.facebook}`);
    return contactParts.join('\n') || 'ไม่ระบุช่องทางติดต่อ (โปรดอัปเดตโปรไฟล์)';
};

export const useHelpers = () => {
  const { currentUser, setCurrentUser } = useAuth();
  const { allHelperProfilesForAdmin } = useData();

  const checkHelperProfilePostingLimits = useCallback(async (): Promise<{ canPost: boolean; message?: string }> => {
    if (!currentUser) return { canPost: false, message: "กรุณาเข้าสู่ระบบ" };
    
    const cooldownHoursTotal = HELPER_PROFILE_COOLDOWN_DAYS * 24;
    if (currentUser.postingLimits.lastHelperProfileDate) {
        const hoursSinceLastPost = (new Date().getTime() - new Date(currentUser.postingLimits.lastHelperProfileDate as string).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastPost < cooldownHoursTotal) {
            const hoursRemaining = Math.ceil(cooldownHoursTotal - hoursSinceLastPost);
            return { canPost: false, message: `คุณสามารถสร้างโปรไฟล์ผู้ช่วยใหม่ได้ในอีก ${hoursRemaining} ชั่วโมง` };
        }
    }
    
    const userActiveProfiles = allHelperProfilesForAdmin.filter(p => p.userId === currentUser.id && !isDateInPast(p.expiresAt) && !p.isExpired).length;
    let maxProfiles = currentUser.tier === 'free' ? MAX_ACTIVE_HELPER_PROFILES_FREE_TIER : 999;
    if (currentUser.activityBadge?.isActive) {
        maxProfiles = MAX_ACTIVE_HELPER_PROFILES_BADGE;
    }

    if (userActiveProfiles >= maxProfiles) {
        return { canPost: false, message: `คุณมีโปรไฟล์ผู้ช่วยที่ยังไม่หมดอายุ ${userActiveProfiles}/${maxProfiles} โปรไฟล์แล้ว` };
    }
    return { canPost: true };
  }, [currentUser, allHelperProfilesForAdmin]);

  const addHelperProfile = useCallback(async (newProfileData: HelperProfileFormData) => {
    if (!currentUser) throw new Error("User not authenticated");
    const limitCheck = await checkHelperProfilePostingLimits();
    if (!limitCheck.canPost) throw new Error(limitCheck.message);

    if (containsBlacklistedWords(newProfileData.details) || containsBlacklistedWords(newProfileData.profileTitle)) {
      throw new Error('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม');
    }

    if (!currentUser.gender || currentUser.gender === 'ไม่ระบุ' as GenderOption || !currentUser.birthdate || !currentUser.educationLevel || currentUser.educationLevel === 'ไม่ได้ระบุ' as HelperEducationLevelOption) {
      throw new Error('กรุณาอัปเดตข้อมูลส่วนตัว (เพศ, วันเกิด, ระดับการศึกษา) ในหน้าโปรไฟล์ของคุณก่อน');
    }

    try {
      await addHelperProfileService(newProfileData, {
        userId: currentUser.id,
        authorDisplayName: currentUser.publicDisplayName,
        contact: generateContactString(currentUser),
        gender: currentUser.gender,
        birthdate: currentUser.birthdate,
        educationLevel: currentUser.educationLevel,
      });
      const updatedUser = await getUserDocument(currentUser.id);
      if (updatedUser) setCurrentUser(updatedUser);
    } catch (error) {
      logFirebaseError("useHelpers.addHelperProfile", error);
      throw error;
    }
  }, [currentUser, checkHelperProfilePostingLimits, setCurrentUser]);

  const updateHelperProfile = useCallback(async (profileId: string, updatedProfileData: HelperProfileFormData) => {
    if (!currentUser) throw new Error("User not authenticated");
    const originalProfile = allHelperProfilesForAdmin.find(p => p.id === profileId);
    if (!originalProfile) throw new Error("ไม่พบโปรไฟล์เดิม");
    if (originalProfile.userId !== currentUser.id && currentUser.role !== 'Admin') {
      throw new Error("คุณไม่มีสิทธิ์แก้ไขโปรไฟล์นี้");
    }
    if (containsBlacklistedWords(updatedProfileData.details) || containsBlacklistedWords(updatedProfileData.profileTitle)) {
      throw new Error('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม');
    }

    try {
      await updateHelperProfileService(profileId, updatedProfileData, generateContactString(currentUser));
    } catch (error) {
      logFirebaseError("useHelpers.updateHelperProfile", error);
      throw error;
    }
  }, [currentUser, allHelperProfilesForAdmin]);
  
  const deleteHelperProfile = useCallback(async (profileId: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    const profileToDelete = allHelperProfilesForAdmin.find(p => p.id === profileId);
    if (!profileToDelete) throw new Error("Profile not found");
    if (profileToDelete.userId !== currentUser.id && currentUser.role !== 'Admin') {
      throw new Error("Permission denied");
    }
    
    try {
      await deleteHelperProfileService(profileId);
    } catch (error) {
      logFirebaseError("useHelpers.deleteHelperProfile", error);
      throw error;
    }
  }, [currentUser, allHelperProfilesForAdmin]);

  const onBumpHelperProfile = useCallback(async (profileId: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    const localProfile = allHelperProfilesForAdmin.find(p => p.id === profileId);
    if (!localProfile || localProfile.userId !== currentUser.id) {
        throw new Error("ไม่พบโปรไฟล์ หรือคุณไม่ใช่เจ้าของโปรไฟล์นี้");
    }

    const lastBumpDateForThisProfile = currentUser.postingLimits.lastBumpDates?.[profileId] || localProfile.lastBumpedAt;
    if (lastBumpDateForThisProfile) {
        const daysSinceLastBump = (new Date().getTime() - new Date(lastBumpDateForThisProfile as string).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastBump < BUMP_COOLDOWN_DAYS) {
            const daysRemaining = BUMP_COOLDOWN_DAYS - Math.floor(daysSinceLastBump);
            throw new Error(`คุณสามารถ Bump โปรไฟล์นี้ได้อีกครั้งใน ${daysRemaining} วัน`);
        }
    }
    try {
        await bumpHelperProfileService(profileId, currentUser.id);
        const updatedUser = await getUserDocument(currentUser.id);
        if (updatedUser) setCurrentUser(updatedUser);
    } catch (error: any) {
        logFirebaseError("useHelpers.onBumpHelperProfile", error);
        throw error;
    }
  }, [currentUser, allHelperProfilesForAdmin, setCurrentUser]);

  const toggleHelperFlag = useCallback(async (profileId: string, flagName: keyof HelperProfile) => {
    if (!currentUser || currentUser.role !== 'Admin') throw new Error("Permission denied");
    const profile = allHelperProfilesForAdmin.find(p => p.id === profileId);
    if (!profile) throw new Error("Profile not found");
    try {
      await toggleItemFlagService('helperProfiles', profileId, flagName, (profile as any)[flagName]);
    } catch (error: any) {
      logFirebaseError(`useHelpers.toggleHelperFlag (${String(flagName)})`, error);
      throw error;
    }
  }, [currentUser, allHelperProfilesForAdmin]);

  const onToggleSuspiciousHelperProfile = (profileId: string) => toggleHelperFlag(profileId, 'isSuspicious');
  const onTogglePinnedHelperProfile = (profileId: string) => toggleHelperFlag(profileId, 'isPinned');
  const onToggleVerifiedExperience = (profileId: string) => toggleHelperFlag(profileId, 'adminVerifiedExperience');
  const onToggleUnavailableHelperProfileForUserOrAdmin = (profileId: string) => toggleHelperFlag(profileId, 'isUnavailable');
  
  return {
    addHelperProfile,
    updateHelperProfile,
    deleteHelperProfile,
    onBumpHelperProfile,
    onToggleSuspiciousHelperProfile,
    onTogglePinnedHelperProfile,
    onToggleVerifiedExperience,
    onToggleUnavailableHelperProfileForUserOrAdmin,
  };
};
