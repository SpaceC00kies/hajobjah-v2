import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { getStorage } from 'firebase/storage';
import { app } from '../firebase'; // correct path to firebase.ts
import { logFirebaseError } from '../firebase/logging'; // make sure this exists or remove

// Firebase core services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth
export async function registerUser(email: string, password: string): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logoutUser(): Promise<void> {
  return await signOut(auth);
}

export async function updateUserProfile(user: User, name: string): Promise<void> {
  await updateProfile(user, { displayName: name });
}

export function listenToAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// STUB EXPORTED SERVICES — just to make App.tsx stop erroring.
// Later you can fill them in.
export const getAllUsersService = () => [];
export const getAllJobsService = () => [];
export const getAllHelperProfilesService = () => [];
export const getAllWebboardPostsService = () => [];
export const getAllWebboardCommentsService = () => [];
export const getSiteConfigService = () => null;
export const getAllInteractionsService = () => [];
export const getUserClickedHelpersMapService = () => ({});
export const getCurrentUserService = () => ({});
export const onAuthChangeService = () => null;
export const setSiteLockService = () => null;
export const signUpWithEmailPasswordService = () => null;
export const signInWithEmailPasswordService = () => null;
export const signOutUserService = () => null;
export const updateUserProfileService = () => null;
export const addJobService = () => null;
export const updateJobService = () => null;
export const addHelperProfileService = () => null;
export const updateHelperProfileService = () => null;
export const deleteJobService = () => null;
export const deleteHelperProfileService = () => null;
export const toggleSuspiciousJobService = () => null;
export const togglePinnedJobService = () => null;
export const toggleHiredJobService = () => null;
export const toggleSuspiciousHelperProfileService = () => null;
export const togglePinnedHelperProfileService = () => null;
export const toggleUnavailableHelperProfileService = () => null;
export const toggleVerifiedExperienceService = () => null;
export const logHelperContactInteractionService = () => null;
export const setUserRoleService = () => null;
export const updateWebboardPostService = () => null;
export const addWebboardPostService = () => null;
export const addWebboardCommentService = () => null;
export const updateWebboardCommentService = () => null;
export const deleteWebboardCommentService = () => null;
export const toggleWebboardPostLikeService = () => null;
export const deleteWebboardPostService = () => null;
export const togglePinnedWebboardPostService = () => null;