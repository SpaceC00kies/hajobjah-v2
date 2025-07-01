
import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";

import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAmhIItKW9XR4cgtCxtTUm2EKCY17xNOlo",
  authDomain: "hajobjah.firebaseapp.com",
  projectId: "hajobjah",
  storageBucket: "hajobjah.firebasestorage.app",
  messagingSenderId: "441394350866",
  appId: "1:441394350866:web:7b83583818449c0f3901cb",
};

const app: FirebaseApp        = initializeApp(firebaseConfig);
const auth: Auth              = getAuth(app);
const db: Firestore           = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
// ← **make sure you pass your functions region** (us-central1)
const functions: Functions    = getFunctions(app, "us-central1");

export { app, auth, db, storage, functions };