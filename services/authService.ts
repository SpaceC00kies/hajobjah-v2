/**
 * @fileoverview
 * This service module handles all user authentication logic. It provides a
 * unified interface for signing up, signing in, signing out, handling auth state
 * changes, and resetting passwords. By centralizing these functions, we ensure
 * consistent and secure authentication flows throughout the application.
 */

import {
  auth,
  db,
  functions,
} from '@/lib/firebase/clientApp';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { User, UserRole, UserTier, VouchInfo, GenderOption, HelperEducationLevelOption } from '../types/types';
import { USER_LEVELS } from '../types/types';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps, cleanDataForFirestore } from './serviceUtils';

type RegistrationDataType = Omit<User, 'id' | 'tier' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'isMuted' | 'nickname' | 'firstName' | 'lastName' | 'role' | 'postingLimits' | 'activityBadge' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence' | 'createdAt' | 'updatedAt' | 'savedWebboardPosts' | 'gender' | 'birthdate' | 'educationLevel' | 'lineId' | 'facebook' | 'isBusinessProfile' | 'businessName' | 'businessType' | 'businessAddress' | 'businessWebsite' | 'businessSocialProfileLink' | 'aboutBusiness' | 'lastPublicDisplayNameChangeAt' | 'publicDisplayNameUpdateCount' | 'vouchInfo' | 'lastLoginIP' | 'lastLoginUserAgent'> & { password: string };

export const signUpWithEmailPasswordService = async (
  userData: RegistrationDataType
): Promise<User | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const firebaseUser = userCredential.user;
    const { password, ...userProfileData } = userData;

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const initialVouchInfo: VouchInfo = { total: 0, worked_together: 0, colleague: 0, community: 0, personal: 0 };

    const newUser: Omit<User, 'id'> = {
      ...userProfileData,
      gender: 'ไม่ระบุ' as GenderOption,
      birthdate: undefined,
      educationLevel: 'ไม่ได้ระบุ' as HelperEducationLevelOption,
      lineId: '',
      facebook: '',
      tier: 'free' as UserTier,
      photo: undefined,
      address: '',
      nickname: '',
      firstName: '',
      lastName: '',
      role: 'Member' as UserRole,
      userLevel: USER_LEVELS[0],
      profileComplete: false,
      isMuted: false,
      favoriteMusic: '',
      favoriteBook: '',
      favoriteMovie: '',
      hobbies: '',
      favoriteFood: '',
      dislikedThing: '',
      introSentence: '',
      postingLimits: {
        lastJobPostDate: threeDaysAgo.toISOString(),
        lastHelperProfileDate: threeDaysAgo.toISOString(),
        dailyWebboardPosts: { count: 0, resetDate: new Date(0).toISOString() },
        hourlyComments: { count: 0, resetTime: new Date(0).toISOString() },
        lastBumpDates: {},
        vouchingActivity: { monthlyCount: 0, periodStart: firstOfMonth.toISOString() },
      },
      activityBadge: {
        isActive: false,
        last30DaysActivity: 0,
      },
      savedWebboardPosts: [],
      isBusinessProfile: false,
      businessName: '',
      businessType: '',
      businessAddress: '',
      businessWebsite: '',
      businessSocialProfileLink: '',
      aboutBusiness: '',
      lastPublicDisplayNameChangeAt: undefined,
      publicDisplayNameUpdateCount: 0,
      vouchInfo: initialVouchInfo,
      lastLoginIP: 'not_recorded',
      lastLoginUserAgent: 'not_recorded',
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), cleanDataForFirestore(newUser as Record<string, any>));
    return { id: firebaseUser.uid, ...convertTimestamps(newUser) };
  } catch (error: any) {
    logFirebaseError("signUpWithEmailPasswordService", error);
    throw error;
  }
};

export const signInWithEmailPasswordService = async (loginIdentifier: string, passwordAttempt: string): Promise<User | null> => {
  try {
    let emailToSignIn = loginIdentifier;

    if (!loginIdentifier.includes('@')) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("username", "==", loginIdentifier.toLowerCase()), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData: any = querySnapshot.docs[0].data();
        if (userData && userData.email) {
          emailToSignIn = userData.email;
        } else {
          throw new Error("Invalid username or password.");
        }
      } else {
        throw new Error("Invalid username or password.");
      }
    }

    const userCredential = await signInWithEmailAndPassword(auth, emailToSignIn, passwordAttempt);
    const firebaseUser = userCredential.user;

    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      const userData: any = userDoc.data();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const postingLimits = userData.postingLimits || {
        lastJobPostDate: threeDaysAgo.toISOString(),
        lastHelperProfileDate: threeDaysAgo.toISOString(),
        dailyWebboardPosts: { count: 0, resetDate: new Date(0).toISOString() },
        hourlyComments: { count: 0, resetTime: new Date(0).toISOString() },
        lastBumpDates: {},
        vouchingActivity: { monthlyCount: 0, periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() }
      };
      const activityBadge = userData.activityBadge || { isActive: false, last30DaysActivity: 0 };
      const tier = userData.tier || ('free' as UserTier);
      const savedWebboardPosts = userData.savedWebboardPosts || [];
      const vouchInfo = userData.vouchInfo || { total: 0, worked_together: 0, colleague: 0, community: 0, personal: 0 };

      const fullUserData = {
        ...convertTimestamps(userData),
        isBusinessProfile: userData.isBusinessProfile || false,
        businessName: userData.businessName || '',
        businessType: userData.businessType || '',
        businessAddress: userData.businessAddress || '',
        businessWebsite: userData.businessWebsite || '',
        businessSocialProfileLink: userData.businessSocialProfileLink || '',
        aboutBusiness: userData.aboutBusiness || '',
        lastPublicDisplayNameChangeAt: userData.lastPublicDisplayNameChangeAt || undefined,
        publicDisplayNameUpdateCount: userData.publicDisplayNameUpdateCount || 0,
        tier,
        postingLimits: convertTimestamps(postingLimits),
        activityBadge: convertTimestamps(activityBadge),
        savedWebboardPosts,
        vouchInfo,
      };

      return { id: firebaseUser.uid, ...fullUserData } as User;
    } else {
      await signOut(auth);
      throw new Error("Login failed due to a system issue. Please try again later.");
    }

  } catch (error: any) {
    logFirebaseError("signInWithEmailPasswordService", error);
    if (error.message === "Invalid username or password." || error.message === "Login failed due to a system issue. Please try again later.") {
      throw error;
    }
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const authErrorCode = (error as any).code;
      if (
          authErrorCode === 'auth/wrong-password' ||
          authErrorCode === 'auth/user-not-found' ||
          authErrorCode === 'auth/invalid-credential' ||
          authErrorCode === 'auth/invalid-email'
      ) {
        throw new Error("Invalid username or password.");
      }
    }
    throw new Error("Login failed. Please try again.");
  }
};

export const signOutUserService = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    logFirebaseError("signOutUserService", error);
    throw error;
  }
};

export const onAuthChangeService = (callback: (user: FirebaseUser | null) => void): (() => void) => {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    callback(firebaseUser);
  });
};

export const sendPasswordResetEmailService = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    logFirebaseError("sendPasswordResetEmailService", error);
    throw error;
  }
};