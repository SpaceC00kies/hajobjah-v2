/**
 * @fileoverview
 * This service module centralizes all administrator-specific interactions with Firebase.
 * It includes functions for managing site-wide settings, user roles, moderating
 * content (flagging, pinning), and handling vouch reports. This ensures that
 * privileged operations are isolated and consistently managed.
 */

import { 
  db, 
  functions
} from '@/lib/firebase/clientApp';
import { doc, onSnapshot, setDoc, updateDoc, collection, addDoc, orderBy, query, runTransaction, deleteDoc, getDoc, increment, QuerySnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { type SiteConfig, type UserRole, type Vouch, type VouchReport, VouchReportStatus, type VouchType, type Job, type HelperProfile, type WebboardPost } from '../types/types';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps } from './serviceUtils';

const USERS_COLLECTION = 'users';

// Site Config
export const subscribeToSiteConfigService = (callback: (config: SiteConfig) => void): (() => void) => {
  const SITE_CONFIG_COLLECTION = 'siteConfig';
  const SITE_CONFIG_DOC_ID = 'main';
  const docRef = doc(db, SITE_CONFIG_COLLECTION, SITE_CONFIG_DOC_ID);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(convertTimestamps(docSnap.data()) as SiteConfig);
    } else {
      callback({ isSiteLocked: false });
    }
  }, (error) => {
    logFirebaseError("subscribeToSiteConfigService", error);
  });
};

export const setSiteLockService = async (isLocked: boolean, updatedBy: string): Promise<void> => {
  const SITE_CONFIG_COLLECTION = 'siteConfig';
  const SITE_CONFIG_DOC_ID = 'main';
  try {
    await setDoc(doc(db, SITE_CONFIG_COLLECTION, SITE_CONFIG_DOC_ID), {
      isSiteLocked: isLocked,
      updatedAt: new Date(),
      updatedBy: updatedBy
    }, { merge: true });
  } catch (error: any) {
    logFirebaseError("setSiteLockService", error);
    throw error;
  }
};

// User Management
export const setUserRoleService = async (userId: string, newRole: UserRole): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
    const setUserRoleFunction = httpsCallable(functions, 'setUserRole');
    await setUserRoleFunction({ userId, role: newRole });
  } catch (error: any) {
    logFirebaseError("setUserRoleService", error);
    throw error;
  }
};

// Generic Item Flagging
export const toggleItemFlagService = async (collectionName: 'jobs' | 'helperProfiles' | 'webboardPosts', itemId: string, flagName: keyof Job | keyof HelperProfile | keyof WebboardPost, currentValue?: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, collectionName, itemId), { [flagName as string]: !currentValue });
  } catch (error: any) {
    logFirebaseError(`toggleItemFlagService (${String(flagName)})`, error);
    throw error;
  }
};

// Vouching System
export const getVouchDocument = async (vouchId: string): Promise<Vouch | null> => {
    const VOUCHES_COLLECTION = 'vouches';
    const docRef = doc(db, VOUCHES_COLLECTION, vouchId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Vouch : null;
};

export const reportVouchService = async (vouch: Vouch, reporterId: string, reporterComment: string): Promise<void> => {
    const VOUCH_REPORTS_COLLECTION = 'vouchReports';
    const reportData: Omit<VouchReport, 'id'> = {
        vouchId: vouch.id,
        reporterId: reporterId,
        reporterComment: reporterComment,
        voucheeId: vouch.voucheeId,
        voucherId: vouch.voucherId,
        vouchType: vouch.vouchType, // Store the vouch type for resilience
        status: VouchReportStatus.Pending,
        createdAt: new Date(),
    };
    await addDoc(collection(db, VOUCH_REPORTS_COLLECTION), reportData);
};

export const subscribeToVouchReportsService = (callback: (reports: VouchReport[]) => void): (() => void) => {
    const VOUCH_REPORTS_COLLECTION = 'vouchReports';
    const q = query(collection(db, VOUCH_REPORTS_COLLECTION), orderBy("createdAt", "desc"));
    return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
        const items = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...convertTimestamps(docSnap.data()),
        } as VouchReport));
        callback(items);
    }, (error) => {
        logFirebaseError("subscribeToVouchReportsService", error);
    });
};

export const resolveVouchReportService = async (reportId: string, resolution: VouchReportStatus.ResolvedDeleted | VouchReportStatus.ResolvedKept, adminId: string, vouchId: string, voucheeId: string, vouchType?: VouchType): Promise<void> => {
    const VOUCH_REPORTS_COLLECTION = 'vouchReports';
    const VOUCHES_COLLECTION = 'vouches';
    
    await runTransaction(db, async (transaction) => {
        const reportRef = doc(db, VOUCH_REPORTS_COLLECTION, reportId);
        transaction.update(reportRef, {
            status: resolution,
            resolvedAt: new Date(),
            resolvedBy: adminId,
        });

        if (resolution === VouchReportStatus.ResolvedDeleted && vouchType) {
            const vouchRef = doc(db, VOUCHES_COLLECTION, vouchId);
            const voucheeRef = doc(db, USERS_COLLECTION, voucheeId);
            transaction.delete(vouchRef);
            transaction.update(voucheeRef, {
                [`vouchInfo.total`]: increment(-1),
                [`vouchInfo.${vouchType}`]: increment(-1),
            });
        }
    });
};

export const forceResolveVouchReportService = async (reportId: string, adminId: string, vouchId: string, voucheeId: string, vouchType: VouchType | null): Promise<void> => {
    const VOUCH_REPORTS_COLLECTION = 'vouchReports';
    const VOUCHES_COLLECTION = 'vouches';

    await runTransaction(db, async (transaction) => {
        const reportRef = doc(db, VOUCH_REPORTS_COLLECTION, reportId);
        const vouchRef = doc(db, VOUCHES_COLLECTION, vouchId);
        const voucheeRef = doc(db, USERS_COLLECTION, voucheeId);
        const voucheeSnap = await transaction.get(voucheeRef);

        // 1. Mark the report as resolved.
        transaction.update(reportRef, {
            status: VouchReportStatus.ResolvedDeleted,
            resolvedAt: new Date(),
            resolvedBy: adminId,
        });

        // 2. Attempt to delete the vouch document (safe even if it doesn't exist).
        transaction.delete(vouchRef);

        // 3. Decrement user's stats, handling unknown vouchType and non-existent user.
        if (voucheeSnap.exists()) {
            const updates: { [key: string]: any } = {
                'vouchInfo.total': increment(-1),
            };

            // Only decrement the specific type if it's known
            if (vouchType) {
                updates[`vouchInfo.${vouchType}`] = increment(-1);
            }
            transaction.update(voucheeRef, updates);
        }
    });
};


// Orion AI Service
export const orionAnalyzeService = httpsCallable<{command: string; history: any[]}, {reply: any}>(functions, 'orionAnalyze');