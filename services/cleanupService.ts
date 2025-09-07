import { db } from '../firebaseConfig.ts';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from '@firebase/firestore';
import { logFirebaseError } from '../firebase/logging.ts';

const JOBS_COLLECTION = 'jobs';
const HELPER_PROFILES_COLLECTION = 'helperProfiles';
const AUTO_DELETE_DAYS_AFTER_EXPIRY = 30;

/**
 * Automatically deletes expired jobs and helper profiles that have been expired for more than 30 days
 * AND where the original poster hasn't taken any action (no updates since expiration)
 * This helps save storage space by removing old, unused content that users have abandoned
 */
export const cleanupExpiredPosts = async (): Promise<{ deletedJobs: number; deletedProfiles: number }> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - AUTO_DELETE_DAYS_AFTER_EXPIRY);

  let deletedJobs = 0;
  let deletedProfiles = 0;

  try {
    // Clean up expired jobs that haven't been touched by their owners
    const expiredJobsQuery = query(
      collection(db, JOBS_COLLECTION),
      where('isExpired', '==', true),
      where('expiresAt', '<', thirtyDaysAgo.toISOString())
    );

    const expiredJobsSnapshot = await getDocs(expiredJobsQuery);

    for (const jobDoc of expiredJobsSnapshot.docs) {
      try {
        const jobData = jobDoc.data();
        const expiresAt = new Date(jobData.expiresAt);
        const updatedAt = jobData.updatedAt ? new Date(jobData.updatedAt.toDate ? jobData.updatedAt.toDate() : jobData.updatedAt) : null;

        // Only delete if user hasn't updated the post since it expired
        const userHasntTouchedSinceExpiry = !updatedAt || updatedAt <= expiresAt;

        if (userHasntTouchedSinceExpiry) {
          await deleteDoc(doc(db, JOBS_COLLECTION, jobDoc.id));
          deletedJobs++;
        }
      } catch (error) {
        logFirebaseError(`cleanupService.cleanupExpiredPosts - job ${jobDoc.id}`, error);
      }
    }

    // Clean up expired helper profiles that haven't been touched by their owners
    const expiredProfilesQuery = query(
      collection(db, HELPER_PROFILES_COLLECTION),
      where('isExpired', '==', true),
      where('expiresAt', '<', thirtyDaysAgo.toISOString())
    );

    const expiredProfilesSnapshot = await getDocs(expiredProfilesQuery);

    for (const profileDoc of expiredProfilesSnapshot.docs) {
      try {
        const profileData = profileDoc.data();
        const expiresAt = new Date(profileData.expiresAt);
        const updatedAt = profileData.updatedAt ? new Date(profileData.updatedAt.toDate ? profileData.updatedAt.toDate() : profileData.updatedAt) : null;

        // Only delete if user hasn't updated the profile since it expired
        const userHasntTouchedSinceExpiry = !updatedAt || updatedAt <= expiresAt;

        if (userHasntTouchedSinceExpiry) {
          await deleteDoc(doc(db, HELPER_PROFILES_COLLECTION, profileDoc.id));
          deletedProfiles++;
        }
      } catch (error) {
        logFirebaseError(`cleanupService.cleanupExpiredPosts - profile ${profileDoc.id}`, error);
      }
    }

    console.log(`Cleanup completed: ${deletedJobs} jobs and ${deletedProfiles} profiles deleted (only untouched expired posts)`);
    return { deletedJobs, deletedProfiles };

  } catch (error) {
    logFirebaseError('cleanupService.cleanupExpiredPosts', error);
    throw error;
  }
};

/**
 * Marks posts as expired if their expiry date has passed
 * This should be run periodically to update the isExpired flag
 */
export const markExpiredPosts = async (): Promise<{ markedJobs: number; markedProfiles: number }> => {
  const now = new Date().toISOString();
  let markedJobs = 0;
  let markedProfiles = 0;

  try {
    // Mark expired jobs
    const jobsToExpireQuery = query(
      collection(db, JOBS_COLLECTION),
      where('isExpired', '==', false),
      where('expiresAt', '<', now)
    );

    const jobsToExpireSnapshot = await getDocs(jobsToExpireQuery);

    for (const jobDoc of jobsToExpireSnapshot.docs) {
      try {
        await updateDoc(doc(db, JOBS_COLLECTION, jobDoc.id), { isExpired: true });
        markedJobs++;
      } catch (error) {
        logFirebaseError(`cleanupService.markExpiredPosts - job ${jobDoc.id}`, error);
      }
    }

    // Mark expired helper profiles
    const profilesToExpireQuery = query(
      collection(db, HELPER_PROFILES_COLLECTION),
      where('isExpired', '==', false),
      where('expiresAt', '<', now)
    );

    const profilesToExpireSnapshot = await getDocs(profilesToExpireQuery);

    for (const profileDoc of profilesToExpireSnapshot.docs) {
      try {
        await updateDoc(doc(db, HELPER_PROFILES_COLLECTION, profileDoc.id), { isExpired: true });
        markedProfiles++;
      } catch (error) {
        logFirebaseError(`cleanupService.markExpiredPosts - profile ${profileDoc.id}`, error);
      }
    }

    console.log(`Expiry marking completed: ${markedJobs} jobs and ${markedProfiles} profiles marked as expired`);
    return { markedJobs, markedProfiles };

  } catch (error) {
    logFirebaseError('cleanupService.markExpiredPosts', error);
    throw error;
  }
};