
import { initializeApp, type FirebaseApp } from 'firebase/app';

import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';

// WARNING: Replace with your actual Firebase project configuration.
// This is a placeholder configuration and will not work.
const firebaseConfig = {
  apiKey: "AIzaSyAmhIItKW9XR4cgtCxtTUm2EKCY17xNOlo", // REPLACE THIS
  authDomain: "hajobjah.firebaseapp.com",        // REPLACE THIS if different
  projectId: "hajobjah",                         // REPLACE THIS if different
  storageBucket: "hajobjah.firebasestorage.app",       // REPLACE THIS (often hajobjah.appspot.com)
  messagingSenderId: "441394350866",             // REPLACE THIS if different
  appId: "1:441394350866:web:7b83583818449c0f3901cb" // REPLACE THIS
};

const app: FirebaseApp = initializeApp(firebaseConfig);
const authInstance: Auth = getAuth(app);
const firestoreInstance: Firestore = getFirestore(app);
const storageInstance: FirebaseStorage = getStorage(app);

export { app, authInstance as auth, firestoreInstance as db, storageInstance as storage };