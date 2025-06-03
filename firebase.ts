
import { initializeApp, type FirebaseApp } from 'firebase/app';
// Removed: import firebase from 'firebase/compat/app';
// Removed: import 'firebase/compat/auth'; 

import { getAuth, type Auth, type User as FirebaseUser } from 'firebase/auth'; // Import v9 Auth and User
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Type Aliases
export type FirebaseAppV9 = FirebaseApp;
export type AuthV9 = Auth; // Updated to v9 Auth
export type FirestoreV9 = Firestore;
export type FirebaseStorageV9 = FirebaseStorage;
export type UserV9 = FirebaseUser; // Updated to v9 User

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

console.log('Firebase Config (from import.meta.env):', firebaseConfig);
console.log('Environment variables loaded checks:', {
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  hasAuthDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  apiKeyLength: import.meta.env.VITE_FIREBASE_API_KEY?.length || 0,
  VITE_FIREBASE_API_KEY_Value: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_PROJECT_ID_Value: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});

if (!firebaseConfig.apiKey) {
  console.error('Firebase API Key is missing in firebaseConfig. Value from env:', import.meta.env.VITE_FIREBASE_API_KEY);
  throw new Error('Firebase API Key is missing. Check Vercel environment variables.');
}
if (!firebaseConfig.projectId) {
    console.error('Firebase Project ID is missing in firebaseConfig. Value from env:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
    throw new Error('Firebase Project ID is missing. Check Vercel environment variables.');
}

let app: FirebaseAppV9;
let authInstance: AuthV9; // Will be v9 Auth instance
let dbInstance: FirestoreV9;
let storageInstance: FirebaseStorageV9;

try {
  // Initialize the main app using v9 initializeApp
  app = initializeApp(firebaseConfig); // Use v9 initializeApp from 'firebase/app'
  
  console.log('Firebase initialized successfully. Project ID:', app.options.projectId);
  
  authInstance = getAuth(app); // Use v9 getAuth
  dbInstance = getFirestore(app); 
  storageInstance = getStorage(app);

} catch (error: any) {
  console.error('Firebase initialization error:', error);
  console.error('Error details:', error.message, error.stack);
  throw error;
}

export { app, authInstance as auth, dbInstance as db, storageInstance as storage };
