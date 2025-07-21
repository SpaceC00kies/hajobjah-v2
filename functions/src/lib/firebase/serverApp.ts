// functions/src/lib/firebase/serverApp.ts
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

function getAppInstance() {
  if (getApps().length) {
    return getApps()[0];
  }

  // If you explicitly provided SA env-vars, use them:
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Otherwise let the platform (Cloud Functions) supply its default service account
    admin.initializeApp();
  }

  return admin.app();
}

export const serverApp = getAppInstance();
export const serverDb  = admin.firestore(serverApp);