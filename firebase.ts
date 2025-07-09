

import { initializeApp, getApp, getApps } from "@firebase/app";
import type { FirebaseApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";
import type { Auth } from "@firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import type { FirebaseStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import type { Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// This is the key change. We check if an app is already initialized.
// This makes the initialization robust and prevents crashes during production builds.
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth: Auth              = getAuth(app);
const db: Firestore           = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
// ← **make sure you pass your functions region** (us-central1)
const functions: Functions    = getFunctions(app, "us-central1");

export { app, auth, db, storage, functions };