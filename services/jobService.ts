/**
 * @fileoverview
 * This service module manages all CRUD (Create, Read, Update, Delete) operations
 * for Job postings. It includes functions for paginated fetching of jobs,
 * as well as adding, updating, and deleting individual job documents in Firestore.
 */

import {
  db,
} from '@/lib/firebase/clientApp';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  QuerySnapshot,
} from 'firebase/firestore';
import type { Job, Province, JobSubCategory, PaginatedDocsResponse, Cursor, JobCategory } from '../types/types';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps, cleanDataForFirestore } from './serviceUtils';
import { filterListingsService } from './searchService';


const JOBS_COLLECTION = 'jobs';
const USERS_COLLECTION = 'users';

type JobFormData = Omit<Job, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'posterIsAdminVerified' | 'interestedCount' | 'companyLogoUrl'>;
interface JobAuthorInfo {
    userId: string;
    authorDisplayName: string;
    contact: string;
    authorPhotoUrl?: string;
}

export const addJobService = async (jobData: JobFormData, author: JobAuthorInfo): Promise<string> => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newJobDoc: Omit<Job, 'id'> = {
      ...jobData,
      userId: author.userId,
      authorDisplayName: author.authorDisplayName,
      contact: author.contact,
      companyLogoUrl: author.authorPhotoUrl,
      ownerId: author.userId,
      isPinned: false,
      isHired: false,
      isSuspicious: false,
      postedAt: serverTimestamp() as any,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
      expiresAt: expiresAt.toISOString(),
      isExpired: false,
      interestedCount: 0,
    };
    const docRef = await addDoc(collection(db, JOBS_COLLECTION), cleanDataForFirestore(newJobDoc as Record<string, any>));

    await updateDoc(doc(db, USERS_COLLECTION, author.userId), {
      'postingLimits.lastJobPostDate': serverTimestamp()
    });
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addJobService", error);
    throw error;
  }
};

export const updateJobService = async (jobId: string, jobData: Partial<JobFormData>, contact: string, authorPhotoUrl?: string): Promise<boolean> => {
  try {
    const dataToUpdate = { ...jobData, contact, companyLogoUrl: authorPhotoUrl, updatedAt: serverTimestamp() as any };
    await updateDoc(doc(db, JOBS_COLLECTION, jobId), cleanDataForFirestore(dataToUpdate as Record<string, any>));
    return true;
  } catch (error: any) {
    logFirebaseError("updateJobService", error);
    throw error;
  }
};

export const deleteJobService = async (jobId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, JOBS_COLLECTION, jobId));
    return true;
  } catch (error: any) {
    logFirebaseError("deleteJobService", error);
    throw error;
  }
};

export const getJobsPaginated = async (
  pageSize: number,
  cursor: Cursor | null = null,
  categoryFilter: string | null = null,
  searchTerm: string | null = null,
  subCategoryFilter: JobSubCategory | 'all' = 'all',
  provinceFilter: Province | 'all' = 'all'
): Promise<PaginatedDocsResponse<Job>> => {
  try {
    const result = await filterListingsService({
      resultType: 'job',
      pageSize,
      paginationCursor: cursor || undefined,
      category: categoryFilter as JobCategory | 'all',
      searchTerm: searchTerm || undefined,
      subCategory: subCategoryFilter,
      province: provinceFilter
    });
    
    return {
      items: result.data.items as Job[],
      cursor: result.data.cursor
    };

  } catch (error: any) {
    logFirebaseError("getJobsPaginated", error);
    throw error;
  }
};

export const subscribeToAllJobsService = (callback: (jobs: Job[]) => void): (() => void) => {
  const q = query(collection(db, JOBS_COLLECTION), orderBy('postedAt', 'desc'));
  return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
    const items = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as Job));
    callback(items);
  }, (error) => {
    logFirebaseError(`subscribeToAllJobsService`, error);
  });
};

export const getJobDocument = async (jobId: string): Promise<Job | null> => {
  try {
    const docRef = doc(db, JOBS_COLLECTION, jobId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Job;
    }
    return null;
  } catch (error) {
    logFirebaseError("getJobDocument", error);
    return null;
  }
};