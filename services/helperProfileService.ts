/**
 * @fileoverview
 * This service module is dedicated to all CRUD (Create, Read, Update, Delete)
 * operations related to Helper Profiles. It handles pagination, adding,
 * updating, and deleting profiles, as well as specialized actions like bumping.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  startAfter,
  serverTimestamp,
  type DocumentSnapshot,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { HelperProfile, User, Province, JobSubCategory, PaginatedDocsResponse } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps, cleanDataForFirestore } from './serviceUtils';

const HELPER_PROFILES_COLLECTION = 'helperProfiles';
const USERS_COLLECTION = 'users';

type HelperProfileFormData = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'lastBumpedAt'>;
interface HelperProfileAuthorInfo { userId: string; authorDisplayName: string; contact: string; gender: User['gender']; birthdate: User['birthdate']; educationLevel: User['educationLevel']; }

export const addHelperProfileService = async (profileData: HelperProfileFormData, author: HelperProfileAuthorInfo): Promise<string> => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const nowServerTimestamp = serverTimestamp();

    const newProfileDoc: Omit<HelperProfile, 'id'> = {
      ...profileData,
      userId: author.userId,
      authorDisplayName: author.authorDisplayName,
      contact: author.contact,
      gender: author.gender,
      birthdate: author.birthdate,
      educationLevel: author.educationLevel,
      ownerId: author.userId,
      isPinned: false, isUnavailable: false, isSuspicious: false, adminVerifiedExperience: false, interestedCount: 0,
      postedAt: nowServerTimestamp as any,
      createdAt: nowServerTimestamp as any,
      updatedAt: nowServerTimestamp as any,
      expiresAt: expiresAt.toISOString(),
      isExpired: false,
      lastBumpedAt: null as any,
    };
    const docRef = await addDoc(collection(db, HELPER_PROFILES_COLLECTION), cleanDataForFirestore(newProfileDoc as Record<string, any>));

    await updateDoc(doc(db, USERS_COLLECTION, author.userId), {
      'postingLimits.lastHelperProfileDate': serverTimestamp()
    });
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addHelperProfileService", error);
    throw error;
  }
};

export const updateHelperProfileService = async (profileId: string, profileData: Partial<HelperProfileFormData>, contact: string): Promise<boolean> => {
  try {
    const dataToUpdate = { ...profileData, contact, updatedAt: serverTimestamp() as any };
    await updateDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId), cleanDataForFirestore(dataToUpdate as Record<string, any>));
    return true;
  } catch (error: any) {
    logFirebaseError("updateHelperProfileService", error);
    throw error;
  }
};

export const bumpHelperProfileService = async (profileId: string, userId: string): Promise<boolean> => {
  try {
    const now = serverTimestamp();
    await updateDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId), {
      updatedAt: now,
      lastBumpedAt: now
    });
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      [`postingLimits.lastBumpDates.${profileId}`]: now
    });
    return true;
  } catch (error: any) {
    logFirebaseError("bumpHelperProfileService", error);
    throw error;
  }
};

export const deleteHelperProfileService = async (profileId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId));
    return true;
  } catch (error: any) {
    logFirebaseError("deleteHelperProfileService", error);
    throw error;
  }
};

export const getHelperProfilesPaginated = async (
  pageSize: number,
  startAfterDoc: DocumentSnapshot<DocumentData> | null = null,
  categoryFilter: string | null = null,
  searchTerm: string | null = null,
  subCategoryFilter: JobSubCategory | 'all' = 'all',
  provinceFilter: Province | 'all' = 'all'
): Promise<PaginatedDocsResponse<HelperProfile>> => {
  try {
    const constraints: QueryConstraint[] = [
      orderBy("isPinned", "desc"),
      orderBy("updatedAt", "desc"),
      limit(pageSize)
    ];

    // The conditional `where` clause is removed to prevent complex index requirements.
    // Filtering will be done client-side after the fetch.

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const q = query(collection(db, HELPER_PROFILES_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    let profilesData = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as HelperProfile));

    // Apply all filtering on the client side for robustness
    if (categoryFilter && categoryFilter !== 'all') {
      profilesData = profilesData.filter(profile => profile.category === categoryFilter);
    }
    
    if (searchTerm && searchTerm.trim() !== '') {
      const termLower = searchTerm.toLowerCase();
      profilesData = profilesData.filter(profile =>
        profile.profileTitle.toLowerCase().includes(termLower) ||
        profile.details.toLowerCase().includes(termLower) ||
        profile.area.toLowerCase().includes(termLower)
      );
    }

    if (subCategoryFilter !== 'all') {
      profilesData = profilesData.filter(profile => profile.subCategory === subCategoryFilter);
    }

    if (provinceFilter !== 'all') {
      profilesData = profilesData.filter(profile => profile.province === provinceFilter);
    }

    const lastVisible = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

    return { items: profilesData, lastVisibleDoc: lastVisible };
  } catch (error: any) {
    logFirebaseError("getHelperProfilesPaginated", error);
    throw error;
  }
};

export const getHelperProfileDocument = async (profileId: string): Promise<HelperProfile | null> => {
  try {
    const docRef = doc(db, HELPER_PROFILES_COLLECTION, profileId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as HelperProfile;
    }
    return null;
  } catch (error) {
    logFirebaseError("getHelperProfileDocument", error);
    return null;
  }
};