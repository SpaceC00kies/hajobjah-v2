// services/helperProfileService.ts
import {
  db
} from '@/lib/firebase/clientApp';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import type { HelperProfile, User, Province, JobSubCategory, PaginatedDocsResponse, Cursor, JobCategory } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps, cleanDataForFirestore } from './serviceUtils';
import { filterListingsService } from './searchService.ts';


const HELPER_PROFILES_COLLECTION = 'helperProfiles';
const USERS_COLLECTION = 'users';

type HelperProfileFormData = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'lastBumpedAt'>;
interface HelperProfileAuthorInfo { userId: string; authorDisplayName: string; contact: string; gender: User['gender']; birthdate: User['birthdate']; educationLevel: User['educationLevel']; }

export const addHelperProfileService = async (profileData: HelperProfileFormData, author: HelperProfileAuthorInfo): Promise<string> => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const newProfileDoc: Omit<HelperProfile, 'id'> = {
      ...profileData, userId: author.userId, authorDisplayName: author.authorDisplayName, contact: author.contact, gender: author.gender, birthdate: author.birthdate, educationLevel: author.educationLevel, isPinned: false, isUnavailable: false, isSuspicious: false, adminVerifiedExperience: false, interestedCount: 0,
      postedAt: serverTimestamp() as any, createdAt: serverTimestamp() as any, updatedAt: serverTimestamp() as any, expiresAt: expiresAt.toISOString(), isExpired: false, lastBumpedAt: null as any,
    };
    const docRef = await addDoc(collection(db, HELPER_PROFILES_COLLECTION), cleanDataForFirestore(newProfileDoc as any));
    await updateDoc(doc(db, USERS_COLLECTION, author.userId), { 'postingLimits.lastHelperProfileDate': serverTimestamp() });
    return docRef.id;
  } catch (error: any) { logFirebaseError("addHelperProfileService", error); throw error; }
};

export const updateHelperProfileService = async (profileId: string, profileData: Partial<HelperProfileFormData>, contact: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId), cleanDataForFirestore({ ...profileData, contact, updatedAt: serverTimestamp() } as any));
    return true;
  } catch (error: any) { logFirebaseError("updateHelperProfileService", error); throw error; }
};

export const bumpHelperProfileService = async (profileId: string, userId: string): Promise<boolean> => {
  try {
    const now = serverTimestamp();
    await updateDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId), { updatedAt: now, lastBumpedAt: now });
    await updateDoc(doc(db, USERS_COLLECTION, userId), { [`postingLimits.lastBumpDates.${profileId}`]: now });
    return true;
  } catch (error: any) { logFirebaseError("bumpHelperProfileService", error); throw error; }
};

export const deleteHelperProfileService = async (profileId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId));
    return true;
  } catch (error: any) { logFirebaseError("deleteHelperProfileService", error); throw error; }
};

export const getHelperProfilesPaginated = async (pageSize: number, cursor: Cursor | null, categoryFilter: string | null, searchTerm: string | null, subCategoryFilter: JobSubCategory | 'all', provinceFilter: Province | 'all'): Promise<PaginatedDocsResponse<HelperProfile>> => {
  try {
    const result = await filterListingsService({ resultType: 'helper', pageSize, paginationCursor: cursor || undefined, category: categoryFilter as JobCategory | 'all', searchTerm: searchTerm || undefined, subCategory: subCategoryFilter, province: provinceFilter });
    return { items: result.data.items as HelperProfile[], cursor: result.data.cursor };
  } catch (error: any) { logFirebaseError("getHelperProfilesPaginated", error); throw error; }
};

export const subscribeToAllHelperProfilesService = (callback: (profiles: HelperProfile[]) => void): (() => void) => {
  const q = query(collection(db, HELPER_PROFILES_COLLECTION), orderBy('postedAt', 'desc'));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as HelperProfile))), (error) => logFirebaseError(`subscribeToAllHelperProfilesService`, error));
};

export const getHelperProfileDocument = async (profileId: string): Promise<HelperProfile | null> => {
  try {
    const docSnap = await getDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId));
    return docSnap.exists() ? { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as HelperProfile : null;
  } catch (error) { logFirebaseError("getHelperProfileDocument", error); return null; }
};

export const getHelperProfilesByUserId = async (userId: string): Promise<HelperProfile[]> => {
    try {
        const q = query(collection(db, HELPER_PROFILES_COLLECTION), where("userId", "==", userId), orderBy("updatedAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as HelperProfile));
    } catch (error) { logFirebaseError("getHelperProfilesByUserId", error); return []; }
};
