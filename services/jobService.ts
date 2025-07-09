/**
 * @fileoverview
 * This service module manages all CRUD (Create, Read, Update, Delete) operations
 * for Job postings. It includes functions for paginated fetching of jobs,
 * as well as adding, updating, and deleting individual job documents in Firestore.
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
import { db } from '../firebaseConfig.ts';
import type { Job, Province, JobSubCategory, PaginatedDocsResponse } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps, cleanDataForFirestore } from './serviceUtils';

const JOBS_COLLECTION = 'jobs';
const USERS_COLLECTION = 'users';

type JobFormData = Omit<Job, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'posterIsAdminVerified' | 'interestedCount'>;

export const addJobService = async (jobData: JobFormData, author: { userId: string; authorDisplayName: string; contact: string }): Promise<string> => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newJobDoc: Omit<Job, 'id'> = {
      ...jobData,
      userId: author.userId,
      authorDisplayName: author.authorDisplayName,
      contact: author.contact,
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

export const updateJobService = async (jobId: string, jobData: Partial<JobFormData>, contact: string): Promise<boolean> => {
  try {
    const dataToUpdate = { ...jobData, contact, updatedAt: serverTimestamp() as any };
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
  startAfterDoc: DocumentSnapshot<DocumentData> | null = null,
  categoryFilter: string | null = null,
  searchTerm: string | null = null,
  subCategoryFilter: JobSubCategory | 'all' = 'all',
  provinceFilter: Province | 'all' = 'all'
): Promise<PaginatedDocsResponse<Job>> => {
  try {
    const constraints: QueryConstraint[] = [
      orderBy("isPinned", "desc"),
      orderBy("postedAt", "desc"),
      limit(pageSize)
    ];

    // The conditional `where` clause is removed to prevent complex index requirements.
    // Filtering will be done client-side after the fetch.

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const q = query(collection(db, JOBS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    let jobsData = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as Job));

    // Apply all filtering on the client side for robustness
    if (categoryFilter && categoryFilter !== 'all') {
        jobsData = jobsData.filter(job => job.category === categoryFilter);
    }

    if (searchTerm && searchTerm.trim() !== '') {
      const termLower = searchTerm.toLowerCase();
      jobsData = jobsData.filter(job =>
        job.title.toLowerCase().includes(termLower) ||
        job.description.toLowerCase().includes(termLower) ||
        job.location.toLowerCase().includes(termLower)
      );
    }

    if (subCategoryFilter !== 'all') {
      jobsData = jobsData.filter(job => job.subCategory === subCategoryFilter);
    }

    if (provinceFilter !== 'all') {
      jobsData = jobsData.filter(job => job.province === provinceFilter);
    }

    const lastVisible = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

    return { items: jobsData, lastVisibleDoc: lastVisible };
  } catch (error: any) {
    logFirebaseError("getJobsPaginated", error);
    throw error;
  }
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