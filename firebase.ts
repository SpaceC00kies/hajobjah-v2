
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // Value import
import type { Auth, User as FirebaseAuthUser } from 'firebase/auth'; // Type imports
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Type Aliases for v9 for clarity within this file if needed, or for export if used elsewhere.
export type FirebaseAppV9 = FirebaseApp;
export type AuthV9 = Auth;
export type FirestoreV9 = Firestore;
export type FirebaseStorageV9 = FirebaseStorage;
export type UserV9 = FirebaseAuthUser; // Firebase Auth User type for v9

// Your web app's Firebase configuration
// Use Vite environment variables (VITE_FIREBASE_...)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // measurementId is optional but often included
};

// Add debugging
console.log('Firebase Config (from import.meta.env):', firebaseConfig);
console.log('Environment variables loaded checks:', {
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  hasAuthDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  apiKeyLength: import.meta.env.VITE_FIREBASE_API_KEY?.length || 0,
  VITE_FIREBASE_API_KEY_Value: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_PROJECT_ID_Value: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});


// Add error checking
if (!firebaseConfig.apiKey) {
  console.error('Firebase API Key is missing in firebaseConfig. Value from env:', import.meta.env.VITE_FIREBASE_API_KEY);
  throw new Error('Firebase API Key is missing. Check Vercel environment variables.');
}
if (!firebaseConfig.projectId) {
    console.error('Firebase Project ID is missing in firebaseConfig. Value from env:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
    throw new Error('Firebase Project ID is missing. Check Vercel environment variables.');
}


// Initialize Firebase v9 style
let app: FirebaseAppV9;
let authInstance: AuthV9;
let dbInstance: FirestoreV9;
let storageInstance: FirebaseStorageV9;

try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully. Project ID:', app.options.projectId);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
} catch (error: any) {
  console.error('Firebase initialization error:', error);
  console.error('Error details:', error.message, error.stack);
  throw error;
}


// Export instances with original names for compatibility with services
export { app, authInstance as auth, dbInstance as db, storageInstance as storage };
// No longer export the 'firebase' namespace itself. Specific v9 functions (like serverTimestamp, doc, collection)
// will be imported directly in services/firebaseService.ts from their respective 'firebase/*' modules.