
import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";

import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

// Use environment variables for Firebase config, making it secure and deployable.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app: FirebaseApp        = initializeApp(firebaseConfig);
const auth: Auth              = getAuth(app);
const db: Firestore           = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
// ← **make sure you pass your functions region** (us-central1)
const functions: Functions    = getFunctions(app, "us-central1");

export { app, auth, db, storage, functions };