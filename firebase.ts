
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

// Type Aliases for v8 for clarity, though direct usage of firebase. Hoge.Bar is also common
export type FirebaseAppV8 = firebase.app.App;
export type AuthV8 = firebase.auth.Auth;
export type FirestoreV8 = firebase.firestore.Firestore;
export type FirebaseStorageV8 = firebase.storage.Storage;
export type UserV8 = firebase.User; // Firebase Auth User type for v8

// Your web app's Firebase configuration
// Use Vite environment variables (VITE_FIREBASE_...)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase v8 style
const app: FirebaseAppV8 = firebase.initializeApp(firebaseConfig);
const authInstance: AuthV8 = firebase.auth();
const dbInstance: FirestoreV8 = firebase.firestore();
const storageInstance: FirebaseStorageV8 = firebase.storage();

// Export instances with original names for compatibility with services
export { app, authInstance as auth, dbInstance as db, storageInstance as storage };
// Export the firebase namespace itself for accessing FieldValue, Timestamp, etc.
export { firebase };