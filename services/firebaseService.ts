import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
} from 'firebase/auth';

import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';

import { 
  getStorage 
} from 'firebase/storage';

import { app } from '../firebase'; // Make sure this points to your firebase.ts file
import { logFirebaseError } from '../firebase/logging';

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Create new user
export async function registerUser(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    logFirebaseError('registerUser', error);
    throw error;
  }
}

// Login
export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    logFirebaseError('loginUser', error);
    throw error;
  }
}

// Logout
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    logFirebaseError('logoutUser', error);
    throw error;
  }
}

// Get user profile
export async function getUserProfile(uid: string) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    logFirebaseError('getUserProfile', error);
    throw error;
  }
}

// Update user profile
export async function updateUserProfile(uid: string, profileData: any) {
  try {
    await updateDoc(doc(db, 'users', uid), profileData);
  } catch (error) {
    logFirebaseError('updateUserProfile', error);
    throw error;
  }
}