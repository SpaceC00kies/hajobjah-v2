// lib/firebase/serverApp.ts
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // The private key must be properly formatted. Vercel's multiline env var handling helps.
  // If issues persist, base64 encoding/decoding is a common workaround.
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const getFirebaseAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
};

const serverApp = getFirebaseAdminApp();
const serverDb = admin.firestore(serverApp);

export { serverApp, serverDb };
