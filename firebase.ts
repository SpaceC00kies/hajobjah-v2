
import { initializeApp } from 'firebase/app'; 
import type { FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// WARNING: Replace with your actual Firebase project configuration.
// This is a placeholder configuration and will not work.
const firebaseConfig = {
  apiKey: "AIzaSyDYXXXXXXXXXXXXXXXXXXXXXXXXXXXX", // REPLACE THIS
  authDomain: "hajobjah.firebaseapp.com",        // REPLACE THIS if different
  projectId: "hajobjah",                         // REPLACE THIS if different
  storageBucket: "hajobjah.appspot.com",       // REPLACE THIS (often hajobjah.appspot.com)
  messagingSenderId: "529002298721",             // REPLACE THIS if different
  appId: "1:529002298721:web:88888888888888888888888" // REPLACE THIS
};

const app: FirebaseApp = initializeApp(firebaseConfig); // Updated initialization
const authInstance: Auth = getAuth(app);
const firestoreInstance: Firestore = getFirestore(app);
const storageInstance: FirebaseStorage = getStorage(app);

export { app, authInstance as auth, firestoreInstance as db, storageInstance as storage };