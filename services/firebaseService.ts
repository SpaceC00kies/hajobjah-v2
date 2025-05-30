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

// ✅ FIXED: Correct relative path to firebase.ts
import { app } from '../firebase';
import { logFirebaseError } from '../firebase/logging';

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Register
export async function registerUser(email: string, password: string): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    logFirebaseError('registerUser', error);
    throw error;
  }
}

// Login
export async function loginUser(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    logFirebaseError('loginUser', error);
    throw error;
  }
}

// Logout
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    logFirebaseError('logoutUser', error);
    throw error;
  }
}

// Update name
export async function updateUserProfile(user: User, name: string): Promise<void> {
  try {
    await updateProfile(user, { displayName: name });
  } catch (error) {
    logFirebaseError('updateUserProfile', error);
    throw error;
  }
}

// On auth state change
export function listenToAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}