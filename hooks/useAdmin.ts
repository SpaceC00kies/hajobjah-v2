
import React, { useCallback } from 'react';
import type { User, UserRole, VouchReport, VouchReportStatus, VouchType, WebboardPost } from '../types/types.ts';
import {
  setSiteLockService,
  setUserRoleService,
  resolveVouchReportService,
  getVouchDocument as getVouchDocumentService,
  forceResolveVouchReportService,
  orionAnalyzeService as orionAnalyzeServiceFunction,
} from '../services/adminService.ts';
import { getUserDocument as getUserDocumentService } from '../services/userService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { logFirebaseError } from '../firebase/logging.ts';

export const useAdmin = () => {
  const { currentUser } = useAuth();

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
  
  const getVouchDocument = useCallback(async (vouchId: string) => {
      checkAdmin();
      return getVouchDocumentService(vouchId);
  }, [checkAdmin]);
  
  const getUserDocument = useCallback(async (userId: string) => {
      checkAdmin();
      return getUserDocumentService(userId);
  }, [checkAdmin]);
  
  const orionAnalyzeService = useCallback(async (params: { command: string; history: any[] }) => {
      checkAdmin();
      return orionAnalyzeServiceFunction(params);
  }, [checkAdmin]);

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

  return {
    setUserRole,
    toggleSiteLock,
    resolveVouchReport,
    getVouchDocument,
    getUserDocument,
    orionAnalyzeService,
    forceResolveVouchReport,
  };
};
