import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
} from '@firebase/firestore';
import { db } from '../firebaseConfig.ts';
import type { Job, User, JobApplication } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging.ts';
import { convertTimestamps } from './serviceUtils.ts';
import { uploadAudioService } from './storageService.ts';

const APPLICATIONS_COLLECTION = 'jobApplications';

export const addJobApplicationService = async (job: Job, applicant: User, audioBlob: Blob): Promise<void> => {
    try {
        const audioUrl = await uploadAudioService(`jobApplicationAudio/${job.id}/${applicant.id}.webm`, audioBlob);

        const newApplication: Omit<JobApplication, 'id'> = {
            jobId: job.id,
            jobOwnerId: job.userId,
            applicantId: applicant.id,
            applicantName: applicant.publicDisplayName,
            applicantAvatar: applicant.photo || null,
            audioUrl,
            createdAt: serverTimestamp() as any,
        };

        await addDoc(collection(db, APPLICATIONS_COLLECTION), newApplication);

    } catch (error: any) {
        logFirebaseError("addJobApplicationService", error);
        throw error;
    }
};

export const subscribeToApplicationsForUserJobsService = (
  jobIds: string[],
  callback: (apps: JobApplication[]) => void
): (() => void) => {
  if (jobIds.length === 0) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, APPLICATIONS_COLLECTION),
    where("jobOwnerId", "in", jobIds),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const applications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data()),
    } as JobApplication));
    callback(applications);
  }, (error) => {
    logFirebaseError("subscribeToApplicationsForUserJobsService", error);
  });
};
