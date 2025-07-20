/**
 * @fileoverview
 * This service module focuses on all operations related to the 'users' collection
 * in Firestore. It handles updating user profiles, subscribing to user data,
 * managing saved posts, and the vouching system.
 */

import {
  db,
} from '@/lib/firebase/clientApp';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  deleteField,
  serverTimestamp,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove,
  addDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import type { User, Vouch, VouchType } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps, cleanDataForFirestore } from './serviceUtils';
import { uploadImageService, deleteImageService } from './storageService';

const USERS_COLLECTION = 'users';
const VOUCHES_COLLECTION = 'vouches';

const DISPLAY_NAME_COOLDOWN_DAYS = 14;
type UserProfileUpdateData = Partial<Omit<User, 'id' | 'email' | 'role' | 'createdAt' | 'updatedAt' | 'username' | 'postingLimits' | 'activityBadge' | 'userLevel' | 'tier' | 'savedWebboardPosts' | 'lastPublicDisplayNameChangeAt' | 'publicDisplayNameUpdateCount' | 'vouchInfo' | 'lastLoginIP' | 'lastLoginUserAgent'>>;

export const updateUserProfileService = async (
  userId: string,
  profileData: UserProfileUpdateData
): Promise<boolean> => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const currentUserSnap = await getDoc(userDocRef);
    if (!currentUserSnap.exists()) {
      throw new Error("User document not found for update.");
    }
    const currentUserData = convertTimestamps(currentUserSnap.data()) as User;

    let dataToUpdate: Partial<User> = { ...profileData, updatedAt: serverTimestamp() as any };

    if (profileData.publicDisplayName && profileData.publicDisplayName !== currentUserData.publicDisplayName) {
      const currentUpdateCount = currentUserData.publicDisplayNameUpdateCount || 0;
      const lastChangeIsoString = currentUserData.lastPublicDisplayNameChangeAt;
      let lastChangeDateForLogic: Date | null = null;
      if (lastChangeIsoString) {
          lastChangeDateForLogic = new Date(lastChangeIsoString as string);
      }

      if (currentUpdateCount > 0 && lastChangeDateForLogic) {
        const cooldownMs = DISPLAY_NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        const now = Date.now();
        if (now - lastChangeDateForLogic.getTime() < cooldownMs) {
          const canChangeDate = new Date(lastChangeDateForLogic.getTime() + cooldownMs);
          throw new Error(`คุณสามารถเปลี่ยนชื่อที่แสดงได้อีกครั้งในวันที่ ${canChangeDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`);
        }
      }
      dataToUpdate.lastPublicDisplayNameChangeAt = serverTimestamp() as any;
      dataToUpdate.publicDisplayNameUpdateCount = currentUpdateCount + 1;
    }

    if (profileData.photo && typeof profileData.photo === 'string' && profileData.photo.startsWith('data:image')) {
      if(currentUserData.photo) {
          await deleteImageService(currentUserData.photo);
      }
      dataToUpdate.photo = await uploadImageService(`profileImages/${userId}/${Date.now()}`, profileData.photo);
    } else if (profileData.hasOwnProperty('photo') && profileData.photo === undefined) {
       if(currentUserData.photo) {
           await deleteImageService(currentUserData.photo);
       }
      dataToUpdate.photo = deleteField() as any;
    }

    if (profileData.hasOwnProperty('isBusinessProfile')) {
        dataToUpdate.isBusinessProfile = !!profileData.isBusinessProfile;
    }

    await updateDoc(userDocRef, cleanDataForFirestore(dataToUpdate as Record<string, any>));
    return true;
  } catch (error: any) {
    logFirebaseError("updateUserProfileService", error);
    throw error;
  }
};

export const subscribeToUsersService = (callback: (users: User[]) => void): (() => void) => {
  const q = collection(db, USERS_COLLECTION);
  return onSnapshot(q, (querySnapshot) => {
    const items = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as User));
    callback(items);
  }, (error) => {
    logFirebaseError(`subscribeToUsersService`, error);
  });
};

export const getUsersService = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as User));
  } catch (error) {
    logFirebaseError("getUsersService", error);
    return [];
  }
};

export const getUserDocument = async (userId: string): Promise<User | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as User;
    }
    return null;
  } catch (error) {
    logFirebaseError("getUserDocument", error);
    return null;
  }
};

export const saveUserWebboardPostService = async (userId: string, postId: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      savedWebboardPosts: arrayUnion(postId)
    });
  } catch (error: any) {
    logFirebaseError("saveUserWebboardPostService", error);
    throw error;
  }
};

export const unsaveUserWebboardPostService = async (userId: string, postId: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      savedWebboardPosts: arrayRemove(postId)
    });
  } catch (error: any) {
    logFirebaseError("unsaveUserWebboardPostService", error);
    throw error;
  }
};

export const subscribeToUserSavedPostsService = (userId: string, callback: (savedPostIds: string[]) => void): (() => void) => {
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const userData = docSnap.data();
      callback(userData.savedWebboardPosts || []);
    } else {
      callback([]);
    }
  }, (error) => {
    logFirebaseError("subscribeToUserSavedPostsService", error);
  });
};

export const vouchForUserService = async (voucher: User, voucheeId: string, vouchType: VouchType, ipAddress: string, userAgent: string, comment?: string): Promise<void> => {
  if (voucher.id === voucheeId) {
    throw new Error("You cannot vouch for yourself.");
  }
  const vouchData: Omit<Vouch, 'id'> = {
    voucherId: voucher.id,
    voucherDisplayName: voucher.publicDisplayName,
    voucheeId: voucheeId,
    vouchType,
    comment: comment || undefined,
    createdAt: serverTimestamp() as any,
    creatorIP: ipAddress,
    creatorUserAgent: userAgent,
  };

  const voucheeRef = doc(db, USERS_COLLECTION, voucheeId);
  const voucherRef = doc(db, USERS_COLLECTION, voucher.id);
  const vouchRef = doc(collection(db, VOUCHES_COLLECTION));

  await runTransaction(db, async (transaction) => {
    transaction.set(vouchRef, vouchData);
    transaction.update(voucheeRef, {
      [`vouchInfo.total`]: increment(1),
      [`vouchInfo.${vouchType}`]: increment(1),
    });
    transaction.update(voucherRef, {
      'postingLimits.vouchingActivity.monthlyCount': increment(1)
    });
  });
};

export const getVouchesForUserService = async (userId: string): Promise<Vouch[]> => {
  try {
    const vouchesRef = collection(db, VOUCHES_COLLECTION);
    const q = query(vouchesRef, where("voucheeId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Vouch));
  } catch (error) {
    logFirebaseError("getVouchesForUserService", error);
    return [];
  }
};
