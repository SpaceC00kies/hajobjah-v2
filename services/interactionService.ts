/**
 * @fileoverview
 * This service module manages user-to-user interactions on the platform.
 * It handles the creation and subscription of 'contact' events and the 'interest'
 * system, which allows users to show interest in jobs or helper profiles.
 */

import {
  db,
} from '@/lib/firebase/clientApp';
import {
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  increment,
  getDocs,
} from 'firebase/firestore';
import type { Interaction, Interest } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps } from './serviceUtils';

const INTERACTIONS_COLLECTION = 'interactions';
const INTERESTS_COLLECTION = 'interests';
const JOBS_COLLECTION = 'jobs';
const HELPER_PROFILES_COLLECTION = 'helperProfiles';

export const subscribeToInteractionsService = (callback: (interactions: Interaction[]) => void): (() => void) => {
  const q = query(collection(db, INTERACTIONS_COLLECTION), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const items = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as Interaction));
    callback(items);
  }, (error) => {
    logFirebaseError(`subscribeToInteractionsService`, error);
  });
};

export const logHelperContactInteractionService = async (helperProfileId: string, employerUserId: string, helperUserId: string): Promise<void> => {
  try {
    await addDoc(collection(db, INTERACTIONS_COLLECTION), {
      helperProfileId,
      employerUserId,
      helperUserId,
      timestamp: serverTimestamp(),
      type: 'contact_helper',
      createdAt: serverTimestamp()
    });
  } catch (error: any) {
    logFirebaseError("logHelperContactInteractionService", error);
    throw error;
  }
};

export const subscribeToUserInterestsService = (userId: string, callback: (interests: Interest[]) => void): (() => void) => {
    const q = query(collection(db, INTERESTS_COLLECTION), where("userId", "==", userId));
    return onSnapshot(q, (querySnapshot) => {
        const items = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...convertTimestamps(docSnap.data()),
        } as Interest));
        callback(items);
    }, (error) => {
        logFirebaseError("subscribeToUserInterestsService", error);
    });
};

export const toggleInterestService = async (targetId: string, targetType: 'job' | 'helperProfile', targetOwnerId: string, currentUserId: string): Promise<void> => {
  try {
    const interestsRef = collection(db, INTERESTS_COLLECTION);
    const q = query(interestsRef, where("userId", "==", currentUserId), where("targetId", "==", targetId));
    
    await runTransaction(db, async (transaction) => {
      const querySnapshot = await getDocs(q);
      const targetCollectionName = targetType === 'job' ? JOBS_COLLECTION : HELPER_PROFILES_COLLECTION;
      const targetRef = doc(db, targetCollectionName, targetId);

      if (!querySnapshot.empty) { // Interest exists, so remove it
        const interestDocId = querySnapshot.docs[0].id;
        transaction.delete(doc(interestsRef, interestDocId));
        transaction.update(targetRef, { interestedCount: increment(-1) });
      } else { // Interest does not exist, so add it
        transaction.set(doc(interestsRef), {
          userId: currentUserId,
          targetId,
          targetType,
          targetOwnerId,
          createdAt: serverTimestamp(),
        });
        transaction.update(targetRef, { interestedCount: increment(1) });
      }
    });
  } catch (error: any) {
    logFirebaseError("toggleInterestService", error);
    throw error;
  }
};
