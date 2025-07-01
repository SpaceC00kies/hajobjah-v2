import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser,
  type AuthError,
} from '@firebase/auth';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type WriteBatch,
  type QueryConstraint,
  collectionGroup,
  deleteField,
  startAfter,
  type DocumentSnapshot,
  type DocumentData,
  runTransaction,
  increment,
} from '@firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadString,
} from '@firebase/storage';
import { httpsCallable } from 'firebase/functions'; // Import httpsCallable

import { auth, db, storage, functions } from '../firebase'; // Import functions instance
import {
  USER_LEVELS,
  UserRole,
  WebboardCategory,
  VouchReportStatus,
  type User,
  type Job,
  type HelperProfile,
  type WebboardPost,
  type WebboardComment,
  type Interaction,
  type SiteConfig,
  type UserPostingLimits,
  type UserActivityBadge,
  type UserTier,
  type UserSavedWebboardPostEntry,
  type Province,
  type JobSubCategory,
  type Interest,
  type Vouch,
  type VouchType,
  type VouchInfo,
  type VouchReport,
  type GenderOption,
  type HelperEducationLevelOption,
} from '../types';
import { logFirebaseError } from '../firebase/logging';


// Collection Names
const USERS_COLLECTION = 'users';
const JOBS_COLLECTION = 'jobs';
const HELPER_PROFILES_COLLECTION = 'helperProfiles';
const WEBBOARD_POSTS_COLLECTION = 'webboardPosts';
const WEBBOARD_COMMENTS_COLLECTION = 'webboardComments';
const INTERACTIONS_COLLECTION = 'interactions';
const SITE_CONFIG_COLLECTION = 'siteConfig';
const SITE_CONFIG_DOC_ID = 'main';
const FEEDBACK_COLLECTION = 'feedback';
const USER_SAVED_POSTS_SUBCOLLECTION = 'savedWebboardPosts';
const INTERESTS_COLLECTION = 'interests';
const VOUCHES_COLLECTION = 'vouches';
const VOUCH_REPORTS_COLLECTION = 'vouchReports';

// --- Paginated Response Type ---
interface PaginatedDocsResponse<T> {
  items: T[];
  lastVisibleDoc: DocumentSnapshot<DocumentData> | null;
}

// --- Helper to convert Firestore Timestamps to ISO strings for consistency ---
const convertTimestamps = (data: any): any => {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  if (Array.isArray(data)) {
    return data.map(convertTimestamps);
  }
  const result: { [key: string]: any } = {};
  for (const key in data) {
    result[key] = convertTimestamps(data[key]);
  }
  return result;
};

const cleanDataForFirestore = <T extends Record<string, any>>(data: T): Partial<T> => {
  const cleanedData: Partial<T> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    }
  }
  return cleanedData;
};

// Updated RegistrationDataType for simplified registration
type RegistrationDataType = Omit<User, 'id' | 'tier' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'isMuted' | 'nickname' | 'firstName' | 'lastName' | 'role' | 'postingLimits' | 'activityBadge' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence' | 'createdAt' | 'updatedAt' | 'savedWebboardPosts' | 'gender' | 'birthdate' | 'educationLevel' | 'lineId' | 'facebook' | 'isBusinessProfile' | 'businessName' | 'businessType' | 'businessAddress' | 'businessWebsite' | 'businessSocialProfileLink' | 'aboutBusiness' | 'lastPublicDisplayNameChangeAt' | 'publicDisplayNameUpdateCount' | 'vouchInfo' | 'lastLoginIP' | 'lastLoginUserAgent'> & { password: string };



// --- Authentication Services ---
export const signUpWithEmailPasswordService = async (
  userData: RegistrationDataType
): Promise<User | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const firebaseUser = userCredential.user;
    const { password, ...userProfileData } = userData; // userProfileData now only contains publicDisplayName, username, email, mobile

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

    await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), cleanDataForFirestore(newUser as Record<string, any>));
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
      const usersRef = collection(db, USERS_COLLECTION);
      const q = query(usersRef, where("username", "==", loginIdentifier.toLowerCase()), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        if (userData && userData.email) {
          emailToSignIn = userData.email;
        } else {
          logFirebaseError("signInWithEmailPasswordService", new Error(`User document for username ${loginIdentifier} lacks an email.`));
          throw new Error("Invalid username or password.");
        }
      } else {
        logFirebaseError("signInWithEmailPasswordService", new Error(`Username ${loginIdentifier} not found.`));
        throw new Error("Invalid username or password.");
      }
    }

    const userCredential = await signInWithEmailAndPassword(auth, emailToSignIn, passwordAttempt);
    const firebaseUser = userCredential.user;

    const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const postingLimits = userData.postingLimits || {
        lastJobPostDate: threeDaysAgo.toISOString(),
        lastHelperProfileDate: threeDaysAgo.toISOString(),
        dailyWebboardPosts: { count: 0, resetDate: new Date(0).toISOString() },
        hourlyComments: { count: 0, resetTime: new Date(0).toISOString() },
        lastBumpDates: {},
        vouchingActivity: { monthlyCount: 0, periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() }
      };
      const activityBadge = userData.activityBadge || {
        isActive: false,
        last30DaysActivity: 0,
      };
      const tier = userData.tier || ('free' as UserTier);
      const savedWebboardPosts = userData.savedWebboardPosts || [];
      const vouchInfo = userData.vouchInfo || { total: 0, worked_together: 0, colleague: 0, community: 0, personal: 0 };


      // Ensure business fields are present, defaulting if necessary
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
      logFirebaseError("signInWithEmailPasswordService", new Error(`User ${firebaseUser.uid} authenticated but no Firestore data.`));
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

export const onAuthChangeService = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
      try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
          const postingLimits = userData.postingLimits || {
            lastJobPostDate: threeDaysAgo.toISOString(),
            lastHelperProfileDate: threeDaysAgo.toISOString(),
            dailyWebboardPosts: { count: 0, resetDate: new Date(0).toISOString() },
            hourlyComments: { count: 0, resetTime: new Date(0).toISOString() },
            lastBumpDates: {},
             vouchingActivity: { monthlyCount: 0, periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() }
          };
          const activityBadge = userData.activityBadge || {
            isActive: false,
            last30DaysActivity: 0,
          };
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
          callback({ id: firebaseUser.uid, ...fullUserData } as User);
        } else {
          logFirebaseError("onAuthChangeService", new Error(`User ${firebaseUser.uid} not found in Firestore.`));
          callback(null);
          await signOut(auth);
        }
      } catch (error) {
        logFirebaseError("onAuthChangeService - getDoc", error);
        callback(null);
      }
    } else {
      callback(null);
    }
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

// --- Storage Service ---
export const uploadImageService = async (path: string, fileOrBase64: File | string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    if (typeof fileOrBase64 === 'string') {
      await uploadString(storageRef, fileOrBase64, 'data_url');
    } else {
      await uploadBytes(storageRef, fileOrBase64);
    }
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    logFirebaseError("uploadImageService", error);
    throw error;
  }
};

export const deleteImageService = async (imageUrl?: string | null): Promise<void> => {
  if (!imageUrl) return;
  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error: any) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code !== 'storage/object-not-found') {
      logFirebaseError("deleteImageService", error);
      throw error;
    } else if (typeof error === 'object' && error !== null && !('code' in error)) {
      logFirebaseError("deleteImageService", error);
      throw error;
    }
  }
};

// --- User Profile Service ---
const DISPLAY_NAME_COOLDOWN_DAYS = 14;
type UserProfileUpdateData = Partial<Omit<User, 'id' | 'email' | 'role' | 'createdAt' | 'updatedAt' | 'username' | 'postingLimits' | 'activityBadge' | 'userLevel' | 'tier' | 'savedWebboardPosts' | 'lastPublicDisplayNameChangeAt' | 'publicDisplayNameUpdateCount' | 'vouchInfo' | 'lastLoginIP' | 'lastLoginUserAgent'>>;


export const updateUserProfileService = async (
  userId: string,
  profileData: UserProfileUpdateData
): Promise<boolean> => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const currentUserSnap = await getDoc(userDocRef);
    if (!currentUserSnap.exists()) {
      throw new Error("User document not found for update.");
    }
    const rawFirestoreUserData = currentUserSnap.data();
    if (!rawFirestoreUserData) {
        throw new Error("User data is unexpectedly empty.");
    }
    const currentUserData = convertTimestamps(rawFirestoreUserData) as User;

    let dataToUpdate: Partial<User> = { ...profileData, updatedAt: serverTimestamp() as any };

    if (profileData.publicDisplayName && profileData.publicDisplayName !== currentUserData.publicDisplayName) {
      const currentUpdateCount = currentUserData.publicDisplayNameUpdateCount || 0;
      const lastChangeIsoString = currentUserData.lastPublicDisplayNameChangeAt;
      let lastChangeDateForLogic: Date | null = null;
      if (lastChangeIsoString) {
          lastChangeDateForLogic = new Date(lastChangeIsoString);
      }

      if (currentUpdateCount > 0 && lastChangeDateForLogic) {
        const cooldownMs = DISPLAY_NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        const now = Date.now();
        if (now - lastChangeDateForLogic.getTime() < cooldownMs) {
          const canChangeDate = new Date(lastChangeDateForLogic.getTime() + cooldownMs);
          throw new Error(`คุณสามารถเปลี่ยนชื่อที่แสดงได้อีกครั้งในวันที่ ${canChangeDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`);
        }
      }
      dataToUpdate.lastPublicDisplayNameChangeAt = serverTimestamp() as any;
      dataToUpdate.publicDisplayNameUpdateCount = currentUpdateCount + 1;
    }


    if (profileData.photo && typeof profileData.photo === 'string' && profileData.photo.startsWith('data:image')) {
      if(currentUserData.photo) {
          await deleteImageService(currentUserData.photo);
      }
      dataToUpdate.photo = await uploadImageService(`profileImages/${userId}/${Date.now()}`, profileData.photo);
    } else if (profileData.hasOwnProperty('photo') && profileData.photo === undefined) {
       if(currentUserData.photo) {
           await deleteImageService(currentUserData.photo);
       }
      dataToUpdate.photo = deleteField() as any;
    }

    if (profileData.hasOwnProperty('isBusinessProfile')) {
        dataToUpdate.isBusinessProfile = !!profileData.isBusinessProfile;
    }

    await updateDoc(userDocRef, cleanDataForFirestore(dataToUpdate as Record<string, any>));
    return true;
  } catch (error: any) {
    logFirebaseError("updateUserProfileService", error);
    throw error;
  }
};

// --- Generic Firestore Subscription Service ---
const subscribeToCollectionService = <T>(
  collectionName: string,
  callback: (data: T[]) => void,
  constraints: QueryConstraint[] = []
): (() => void) => {
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(q, (querySnapshot) => {
    const items = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as T));
    callback(items);
  }, (error) => {
    logFirebaseError(`subscribeToCollectionService (${collectionName})`, error);
  });
};

// --- Specific Data Services ---

// Jobs
type JobFormData = Omit<Job, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'posterIsAdminVerified' | 'interestedCount'>;
export const addJobService = async (jobData: JobFormData, author: { userId: string; authorDisplayName: string; contact: string }): Promise<string> => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newJobDoc: Omit<Job, 'id'> = {
      ...jobData,
      userId: author.userId,
      authorDisplayName: author.authorDisplayName,
      contact: author.contact,
      ownerId: author.userId,
      isPinned: false,
      isHired: false,
      isSuspicious: false,
      postedAt: serverTimestamp() as any,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
      expiresAt: expiresAt.toISOString(),
      isExpired: false,
      interestedCount: 0,
    };
    const docRef = await addDoc(collection(db, JOBS_COLLECTION), cleanDataForFirestore(newJobDoc as Record<string, any>));

    await updateDoc(doc(db, USERS_COLLECTION, author.userId), {
      'postingLimits.lastJobPostDate': serverTimestamp()
    });
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addJobService", error);
    throw error;
  }
};
export const updateJobService = async (jobId: string, jobData: Partial<JobFormData>, contact: string): Promise<boolean> => {
  try {
    const dataToUpdate = { ...jobData, contact, updatedAt: serverTimestamp() as any };
    await updateDoc(doc(db, JOBS_COLLECTION, jobId), cleanDataForFirestore(dataToUpdate as Record<string, any>));
    return true;
  } catch (error: any) {
    logFirebaseError("updateJobService", error);
    throw error;
  }
};
export const deleteJobService = async (jobId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, JOBS_COLLECTION, jobId));
    return true;
  } catch (error: any) {
    logFirebaseError("deleteJobService", error);
    throw error;
  }
};

export const getJobsPaginated = async (
  pageSize: number,
  startAfterDoc: DocumentSnapshot<DocumentData> | null = null,
  categoryFilter: string | null = null,
  searchTerm: string | null = null,
  subCategoryFilter: JobSubCategory | 'all' = 'all',
  provinceFilter: Province | 'all' = 'all'
): Promise<PaginatedDocsResponse<Job>> => {
  try {
    const constraints: QueryConstraint[] = [
      orderBy("isPinned", "desc"),
      orderBy("postedAt", "desc"),
      limit(pageSize)
    ];

    if (categoryFilter && categoryFilter !== 'all') {
      constraints.unshift(where("category", "==", categoryFilter));
    }
    
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const q = query(collection(db, JOBS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    let jobsData = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as Job));

    if (searchTerm && searchTerm.trim() !== '') {
      const termLower = searchTerm.toLowerCase();
      jobsData = jobsData.filter(job =>
        job.title.toLowerCase().includes(termLower) ||
        job.description.toLowerCase().includes(termLower) ||
        job.location.toLowerCase().includes(termLower)
      );
    }

    if (subCategoryFilter !== 'all') {
      jobsData = jobsData.filter(job => job.subCategory === subCategoryFilter);
    }

    if (provinceFilter !== 'all') {
      jobsData = jobsData.filter(job => job.province === provinceFilter);
    }

    const lastVisible = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

    return { items: jobsData, lastVisibleDoc: lastVisible };
  } catch (error: any) {
    logFirebaseError("getJobsPaginated", error);
    throw error;
  }
};


export const getJobDocument = async (jobId: string): Promise<Job | null> => {
  try {
    const docRef = doc(db, JOBS_COLLECTION, jobId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Job;
    }
    return null;
  } catch (error) {
    logFirebaseError("getJobDocument", error);
    return null;
  }
};


// Helper Profiles
type HelperProfileFormData = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'lastBumpedAt'>;
interface HelperProfileAuthorInfo { userId: string; authorDisplayName: string; contact: string; gender: User['gender']; birthdate: User['birthdate']; educationLevel: User['educationLevel']; }
export const addHelperProfileService = async (profileData: HelperProfileFormData, author: HelperProfileAuthorInfo): Promise<string> => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const nowServerTimestamp = serverTimestamp();

    const newProfileDoc: Omit<HelperProfile, 'id'> = {
      ...profileData,
      userId: author.userId,
      authorDisplayName: author.authorDisplayName,
      contact: author.contact,
      gender: author.gender,
      birthdate: author.birthdate,
      educationLevel: author.educationLevel,
      ownerId: author.userId,
      isPinned: false, isUnavailable: false, isSuspicious: false, adminVerifiedExperience: false, interestedCount: 0,
      postedAt: nowServerTimestamp as any,
      createdAt: nowServerTimestamp as any,
      updatedAt: nowServerTimestamp as any,
      expiresAt: expiresAt.toISOString(),
      isExpired: false,
      lastBumpedAt: null as any,
    };
    const docRef = await addDoc(collection(db, HELPER_PROFILES_COLLECTION), cleanDataForFirestore(newProfileDoc as Record<string, any>));

    await updateDoc(doc(db, USERS_COLLECTION, author.userId), {
      'postingLimits.lastHelperProfileDate': serverTimestamp()
    });
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addHelperProfileService", error);
    throw error;
  }
};

export const updateHelperProfileService = async (profileId: string, profileData: Partial<HelperProfileFormData>, contact: string): Promise<boolean> => {
  try {
    const dataToUpdate = { ...profileData, contact, updatedAt: serverTimestamp() as any };
    await updateDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId), cleanDataForFirestore(dataToUpdate as Record<string, any>));
    return true;
  } catch (error: any) {
    logFirebaseError("updateHelperProfileService", error);
    throw error;
  }
};

export const bumpHelperProfileService = async (profileId: string, userId: string): Promise<boolean> => {
  try {
    const now = serverTimestamp();
    await updateDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId), {
      updatedAt: now,
      lastBumpedAt: now
    });
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      [`postingLimits.lastBumpDates.${profileId}`]: now
    });
    return true;
  } catch (error: any) {
    logFirebaseError("bumpHelperProfileService", error);
    throw error;
  }
};

export const deleteHelperProfileService = async (profileId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId));
    return true;
  } catch (error: any) {
    logFirebaseError("deleteHelperProfileService", error);
    throw error;
  }
};

export const getHelperProfilesPaginated = async (
  pageSize: number,
  startAfterDoc: DocumentSnapshot<DocumentData> | null = null,
  categoryFilter: string | null = null,
  searchTerm: string | null = null,
  subCategoryFilter: JobSubCategory | 'all' = 'all',
  provinceFilter: Province | 'all' = 'all'
): Promise<PaginatedDocsResponse<HelperProfile>> => {
  try {
    const constraints: QueryConstraint[] = [
      orderBy("isPinned", "desc"),
      orderBy("updatedAt", "desc"),
      limit(pageSize)
    ];

    if (categoryFilter && categoryFilter !== 'all') {
      constraints.unshift(where("category", "==", categoryFilter));
    }

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const q = query(collection(db, HELPER_PROFILES_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    let profilesData = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as HelperProfile));

    if (searchTerm && searchTerm.trim() !== '') {
      const termLower = searchTerm.toLowerCase();
      profilesData = profilesData.filter(profile =>
        profile.profileTitle.toLowerCase().includes(termLower) ||
        profile.details.toLowerCase().includes(termLower) ||
        profile.area.toLowerCase().includes(termLower)
      );
    }

    if (subCategoryFilter !== 'all') {
      profilesData = profilesData.filter(profile => profile.subCategory === subCategoryFilter);
    }

    if (provinceFilter !== 'all') {
      profilesData = profilesData.filter(profile => profile.province === provinceFilter);
    }

    const lastVisible = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

    return { items: profilesData, lastVisibleDoc: lastVisible };
  } catch (error: any) {
    logFirebaseError("getHelperProfilesPaginated", error);
    throw error;
  }
};


export const getHelperProfileDocument = async (profileId: string): Promise<HelperProfile | null> => {
  try {
    const docRef = doc(db, HELPER_PROFILES_COLLECTION, profileId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as HelperProfile;
    }
    return null;
  } catch (error) {
    logFirebaseError("getHelperProfileDocument", error);
    return null;
  }
};


// Webboard Posts
interface WebboardPostAuthorInfo { userId: string; authorDisplayName: string; photo?: string | null; }
export const addWebboardPostService = async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, author: WebboardPostAuthorInfo): Promise<string> => {
  try {
    if (postData.body.length > 5000) {
      throw new Error("Post body exceeds 5000 characters.");
    }
    let imageUrl: string | undefined = undefined;
    if (postData.image && postData.image.startsWith('data:image')) {
      imageUrl = await uploadImageService(`webboardImages/${author.userId}/${Date.now()}`, postData.image);
    }

    const newPostDoc: Omit<WebboardPost, 'id'> = {
      title: postData.title,
      body: postData.body,
      category: postData.category,
      image: imageUrl,
      userId: author.userId,
      authorDisplayName: author.authorDisplayName,
      authorPhoto: author.photo || undefined,
      ownerId: author.userId,
      likes: [],
      isPinned: false,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    const docRef = await addDoc(collection(db, WEBBOARD_POSTS_COLLECTION), cleanDataForFirestore(newPostDoc as Record<string, any>));

    const userRef = doc(db, USERS_COLLECTION, author.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      await updateDoc(userRef, {
        'activityBadge.last30DaysActivity': (userData.activityBadge.last30DaysActivity || 0) + 1
      });
    }
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addWebboardPostService", error);
    throw error;
  }
};

export const updateWebboardPostService = async (postId: string, postData: { title?: string; body?: string; category?: WebboardCategory; image?: string | null }, currentUserPhoto?: string | null): Promise<boolean> => {
  try {
    if (postData.body && postData.body.length > 5000) {
      throw new Error("Post body exceeds 5000 characters.");
    }
    const postRef = doc(db, WEBBOARD_POSTS_COLLECTION, postId);
    const basePayload: Partial<WebboardPost> = {};
    if (postData.title !== undefined) basePayload.title = postData.title;
    if (postData.body !== undefined) basePayload.body = postData.body;
    if (postData.category !== undefined) basePayload.category = postData.category;

    basePayload.updatedAt = serverTimestamp() as any;
    
    let finalUpdatePayload = { ...basePayload };

    if (postData.hasOwnProperty('image')) {
      if (postData.image && typeof postData.image === 'string' && postData.image.startsWith('data:image')) {
        const oldPostSnap = await getDoc(postRef);
        if(oldPostSnap.exists() && oldPostSnap.data().image) {
          await deleteImageService(oldPostSnap.data().image);
        }
        finalUpdatePayload.image = await uploadImageService(`webboardImages/${auth.currentUser?.uid}/${Date.now()}_edit`, postData.image);
      } else if (postData.image === null) {
        const oldPostSnap = await getDoc(postRef);
        if(oldPostSnap.exists() && oldPostSnap.data().image) {
          await deleteImageService(oldPostSnap.data().image);
        }
        finalUpdatePayload.image = deleteField() as any;
      }
    }
    await updateDoc(postRef, cleanDataForFirestore(finalUpdatePayload as Record<string, any>));
    return true;
  } catch (error: any) {
    logFirebaseError("updateWebboardPostService", error);
    throw error;
  }
};

export const deleteWebboardPostService = async (postId: string): Promise<boolean> => {
  try {
    const postRef = doc(db, WEBBOARD_POSTS_COLLECTION, postId);
    const postSnap = await getDoc(postRef);
    const postData = postSnap.data() as WebboardPost;

    if (postSnap.exists() && postData.image) {
      await deleteImageService(postData.image);
    }
    const commentsQuery = query(collection(db, WEBBOARD_COMMENTS_COLLECTION), where("postId", "==", postId));
    const commentsSnapshot = await getDocs(commentsQuery);
    const batch: WriteBatch = writeBatch(db);
    commentsSnapshot.forEach(commentDoc => batch.delete(commentDoc.ref));

    const savedPostsQuery = query(collectionGroup(db, USER_SAVED_POSTS_SUBCOLLECTION), where('postId', '==', postId));
    const savedPostsSnapshot = await getDocs(savedPostsQuery);
    savedPostsSnapshot.forEach(docSnap => batch.delete(docSnap.ref));

    await batch.commit();

    await deleteDoc(postRef);

    if (postData && postData.userId) {
        const userRef = doc(db, USERS_COLLECTION, postData.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            await updateDoc(userRef, {
                'activityBadge.last30DaysActivity': Math.max(0, (userData.activityBadge.last30DaysActivity || 0) - 1)
            });
        }
    }
    return true;
  } catch (error: any) {
    logFirebaseError("deleteWebboardPostService", error);
    throw error;
  }
};

export const getWebboardPostsPaginated = async (
  pageSize: number = 10,
  startAfterDoc: DocumentSnapshot<DocumentData> | null = null,
  categoryFilter: string | null = null,
  searchTerm: string | null = null
): Promise<PaginatedDocsResponse<WebboardPost>> => {
  try {
    const constraints: QueryConstraint[] = [
      orderBy("isPinned", "desc"),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    ];

    if (categoryFilter && categoryFilter !== 'all') {
      constraints.unshift(where("category", "==", categoryFilter));
    }

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const q = query(collection(db, WEBBOARD_POSTS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const postsData = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as WebboardPost));

    let searchedPostsData = postsData;
    if (searchTerm && searchTerm.trim() !== '') {
        const termLower = searchTerm.toLowerCase();
        searchedPostsData = postsData.filter(post =>
            post.title.toLowerCase().includes(termLower) ||
            post.body.toLowerCase().includes(termLower) ||
            post.authorDisplayName.toLowerCase().includes(termLower)
        );
    }

    const lastVisible = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

    return { items: searchedPostsData, lastVisibleDoc: lastVisible };
  } catch (error: any) {
    logFirebaseError("getWebboardPostsPaginated", error);
    throw error;
  }
};

export const toggleWebboardPostLikeService = async (postId: string, userId: string): Promise<void> => {
  const postRef = doc(db, WEBBOARD_POSTS_COLLECTION, postId);
  try {
    await runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) {
        throw new Error("Post does not exist!");
      }
      const postData = postDoc.data() as WebboardPost;
      const likes = postData.likes || [];
      
      if (likes.includes(userId)) {
        transaction.update(postRef, {
          likes: likes.filter(id => id !== userId)
        });
      } else {
        transaction.update(postRef, {
          likes: [...likes, userId]
        });
      }
    });
  } catch (error: any) {
    logFirebaseError("toggleWebboardPostLikeService", error);
    throw error;
  }
};

// Webboard Comments
interface WebboardCommentAuthorInfo { userId: string; authorDisplayName: string; photo?: string | null; }
export const addWebboardCommentService = async (postId: string, text: string, author: WebboardCommentAuthorInfo): Promise<string> => {
  try {
    const newCommentDoc: Omit<WebboardComment, 'id'> = {
      postId,
      text,
      userId: author.userId,
      authorDisplayName: author.authorDisplayName,
      authorPhoto: author.photo || undefined,
      ownerId: author.userId,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    const docRef = await addDoc(collection(db, WEBBOARD_COMMENTS_COLLECTION), cleanDataForFirestore(newCommentDoc as Record<string, any>));

    const userRef = doc(db, USERS_COLLECTION, author.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      await updateDoc(userRef, {
        'activityBadge.last30DaysActivity': (userData.activityBadge.last30DaysActivity || 0) + 1
      });
    }
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addWebboardCommentService", error);
    throw error;
  }
};
export const updateWebboardCommentService = async (commentId: string, newText: string): Promise<boolean> => {
  try {
    const dataToUpdate = { text: newText, updatedAt: serverTimestamp() as any };
    await updateDoc(doc(db, WEBBOARD_COMMENTS_COLLECTION, commentId), cleanDataForFirestore(dataToUpdate));
    return true;
  } catch (error: any) {
    logFirebaseError("updateWebboardCommentService", error);
    throw error;
  }
};
export const deleteWebboardCommentService = async (commentId: string): Promise<boolean> => {
  try {
    const commentRef = doc(db, WEBBOARD_COMMENTS_COLLECTION, commentId);
    const commentSnap = await getDoc(commentRef);
    const commentData = commentSnap.data() as WebboardComment;

    await deleteDoc(commentRef);

    if (commentData && commentData.userId) {
        const userRef = doc(db, USERS_COLLECTION, commentData.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            await updateDoc(userRef, {
                'activityBadge.last30DaysActivity': Math.max(0, (userData.activityBadge.last30DaysActivity || 0) - 1)
            });
        }
    }
    return true;
  } catch (error: any) {
    logFirebaseError("deleteWebboardCommentService", error);
    throw error;
  }
};
export const subscribeToWebboardCommentsService = (callback: (data: WebboardComment[]) => void, postId?: string) => {
  const constraints = postId ? [where("postId", "==", postId), orderBy("createdAt", "asc")] : [orderBy("createdAt", "asc")];
  return subscribeToCollectionService<WebboardComment>(WEBBOARD_COMMENTS_COLLECTION, callback, constraints);
}

// User Saved Webboard Posts
export const saveUserWebboardPostService = async (userId: string, postId: string): Promise<void> => {
  try {
    const savedPostRef = doc(db, USERS_COLLECTION, userId, USER_SAVED_POSTS_SUBCOLLECTION, postId);
    const data: UserSavedWebboardPostEntry = { postId, savedAt: serverTimestamp() as any };
    await setDoc(savedPostRef, data);
  } catch (error) {
    logFirebaseError("saveUserWebboardPostService", error);
    throw error;
  }
};

export const unsaveUserWebboardPostService = async (userId: string, postId: string): Promise<void> => {
  try {
    const savedPostRef = doc(db, USERS_COLLECTION, userId, USER_SAVED_POSTS_SUBCOLLECTION, postId);
    await deleteDoc(savedPostRef);
  } catch (error) {
    logFirebaseError("unsaveUserWebboardPostService", error);
    throw error;
  }
};

export const subscribeToUserSavedPostsService = (userId: string, callback: (postIds: string[]) => void): (() => void) => {
  const q = collection(db, USERS_COLLECTION, userId, USER_SAVED_POSTS_SUBCOLLECTION);
  return onSnapshot(q, (querySnapshot) => {
    const postIds = querySnapshot.docs.map(docSnap => docSnap.id);
    callback(postIds);
  }, (error) => {
    logFirebaseError("subscribeToUserSavedPostsService", error);
  });
};


// Interactions
export const logHelperContactInteractionService = async (helperProfileId: string, employerUserId: string, helperUserId: string): Promise<string> => {
  try {
    const interactionsRef = collection(db, INTERACTIONS_COLLECTION);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const q = query(interactionsRef,
      where("helperProfileId", "==", helperProfileId),
      where("employerUserId", "==", employerUserId),
      where("timestamp", ">", tenMinutesAgo)
    );
    const recentInteractionsSnap = await getDocs(q);

    if (!recentInteractionsSnap.empty) {
        return recentInteractionsSnap.docs[0].id;
    }

    const newInteractionDoc: Omit<Interaction, 'id'> = {
      helperUserId: helperUserId,
      helperProfileId,
      employerUserId,
      timestamp: serverTimestamp() as any,
      type: 'contact_helper',
      createdAt: serverTimestamp() as any,
    };
    const docRef = await addDoc(collection(db, INTERACTIONS_COLLECTION), cleanDataForFirestore(newInteractionDoc as Record<string, any>));
    
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("logHelperContactInteractionService", error);
    throw error;
  }
};
export const subscribeToInteractionsService = (callback: (data: Interaction[]) => void) =>
  subscribeToCollectionService<Interaction>(INTERACTIONS_COLLECTION, callback, [orderBy("timestamp", "desc")]);

// --- New Interest Services ---
export const toggleInterestService = async (
  targetId: string,
  targetType: 'job' | 'helperProfile',
  targetOwnerId: string,
  currentUserId: string
): Promise<{ isInterested: boolean }> => {
  const interestId = `${currentUserId}_${targetId}`;
  const interestRef = doc(db, INTERESTS_COLLECTION, interestId);
  
  const targetCollection = targetType === 'job' ? JOBS_COLLECTION : HELPER_PROFILES_COLLECTION;
  const targetRef = doc(db, targetCollection, targetId);

  try {
    let isNowInterested = false;
    await runTransaction(db, async (transaction) => {
      const interestDoc = await transaction.get(interestRef);
      if (interestDoc.exists()) {
        // Interest exists, so we are un-interesting it
        transaction.delete(interestRef);
        transaction.update(targetRef, { interestedCount: increment(-1) });
        isNowInterested = false;
      } else {
        // Interest does not exist, so we are adding it
        const newInterest: Omit<Interest, 'id'> = {
          userId: currentUserId,
          targetId,
          targetType,
          targetOwnerId,
          createdAt: serverTimestamp() as any,
        };
        transaction.set(interestRef, newInterest);
        transaction.update(targetRef, { interestedCount: increment(1) });
        isNowInterested = true;
      }
    });
    return { isInterested: isNowInterested };
  } catch (error) {
    logFirebaseError("toggleInterestService", error);
    throw new Error('Failed to update interest.');
  }
};

export const subscribeToUserInterestsService = (
  userId: string,
  callback: (interests: Interest[]) => void
): (() => void) => {
  const q = query(collection(db, INTERESTS_COLLECTION), where("userId", "==", userId));
  return onSnapshot(q, (querySnapshot) => {
    const interests = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as Interest));
    callback(interests);
  }, (error) => {
    logFirebaseError("subscribeToUserInterestsService", error);
  });
};

// --- General Data Services ---
export const subscribeToUsersService = (callback: (data: User[]) => void) =>
  subscribeToCollectionService<User>(USERS_COLLECTION, callback);

export const getUserDocument = async (userId: string): Promise<User | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as User;
    }
    return null;
  } catch (error) {
    logFirebaseError("getUserDocument", error);
    return null;
  }
};

// --- Site Config Service ---
export const subscribeToSiteConfigService = (callback: (config: SiteConfig) => void): (() => void) => {
  const docRef = doc(db, SITE_CONFIG_COLLECTION, SITE_CONFIG_DOC_ID);
  return onSnapshot(docRef, (docSnap) => {
    const defaultConfig: SiteConfig = { isSiteLocked: false };
    if (docSnap.exists()) {
      callback({ ...defaultConfig, ...convertTimestamps(docSnap.data()) });
    } else {
      callback(defaultConfig);
    }
  }, (error) => {
    logFirebaseError("subscribeToSiteConfigService", error);
  });
};

// --- Admin Services ---
export const setSiteLockService = async (isLocked: boolean, adminId: string): Promise<boolean> => {
  try {
    const configRef = doc(db, SITE_CONFIG_COLLECTION, SITE_CONFIG_DOC_ID);
    await setDoc(configRef, { 
      isSiteLocked: isLocked,
      updatedAt: serverTimestamp(),
      updatedBy: adminId,
    }, { merge: true });
    return true;
  } catch (error: any) {
    logFirebaseError("setSiteLockService", error);
    throw error;
  }
};
export const setUserRoleService = async (userIdToUpdate: string, newRole: UserRole): Promise<boolean> => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userIdToUpdate), { role: newRole });
    return true;
  } catch (error: any) {
    logFirebaseError("setUserRoleService", error);
    throw error;
  }
};
export const toggleItemFlagService = async (
  collectionName: 'jobs' | 'helperProfiles' | 'webboardPosts',
  itemId: string,
  flagName: keyof Job | keyof HelperProfile | keyof WebboardPost,
  currentValue?: boolean
): Promise<boolean> => {
  try {
    const dataToUpdate = { [flagName]: !currentValue, updatedAt: serverTimestamp() as any };
    await updateDoc(doc(db, collectionName, itemId), cleanDataForFirestore(dataToUpdate as Record<string, any>));
    return true;
  } catch (error: any) {
    logFirebaseError("toggleItemFlagService", error);
    throw error;
  }
};

// --- Vouching Services ---
const VOUCH_MONTHLY_LIMIT = 5;

export const vouchForUserService = async (
    voucher: User, 
    voucheeId: string, 
    vouchType: VouchType,
    ipAddress: string,
    userAgent: string,
    comment?: string
): Promise<void> => {
  if (voucher.id === voucheeId) throw new Error("You cannot vouch for yourself.");
  
  // Check monthly limit
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const currentPeriodStart = voucher.postingLimits.vouchingActivity.periodStart;

  if (currentPeriodStart < firstOfMonth) {
      // It's a new month, reset the counter
      voucher.postingLimits.vouchingActivity = { monthlyCount: 0, periodStart: firstOfMonth };
  }
  if (voucher.postingLimits.vouchingActivity.monthlyCount >= VOUCH_MONTHLY_LIMIT) {
    throw new Error(`You have reached your monthly vouching limit of ${VOUCH_MONTHLY_LIMIT}.`);
  }
  
  // Check if already vouched in this relationship
  const q = query(collection(db, VOUCHES_COLLECTION), 
    where('voucherId', '==', voucher.id), 
    where('voucheeId', '==', voucheeId),
    where('vouchType', '==', vouchType)
  );
  const existingVouchSnap = await getDocs(q);
  if (!existingVouchSnap.empty) {
    throw new Error(`You have already vouched for this user with the same relationship type.`);
  }

  const vouchRef = doc(collection(db, VOUCHES_COLLECTION));
  const voucheeRef = doc(db, USERS_COLLECTION, voucheeId);
  const voucherRef = doc(db, USERS_COLLECTION, voucher.id);

  const newVouch: Omit<Vouch, 'id'> = {
    voucherId: voucher.id,
    voucherDisplayName: voucher.publicDisplayName,
    voucheeId,
    vouchType,
    comment: comment?.trim() || '',
    createdAt: serverTimestamp() as any,
    creatorIP: ipAddress,
    creatorUserAgent: userAgent,
  };

  try {
    await runTransaction(db, async (transaction) => {
        // 1. Create the vouch document
        transaction.set(vouchRef, newVouch);

        // 2. Increment the specific vouch type and total on the vouchee's profile
        transaction.update(voucheeRef, {
            [`vouchInfo.${vouchType}`]: increment(1),
            'vouchInfo.total': increment(1)
        });

        // 3. Increment the voucher's monthly count
        transaction.update(voucherRef, {
            'postingLimits.vouchingActivity.monthlyCount': increment(1)
        });
    });
  } catch (error) {
    logFirebaseError("vouchForUserService", error);
    throw new Error('Failed to submit vouch.');
  }
};

export const getVouchesForUserService = async (userId: string): Promise<Vouch[]> => {
    try {
        const q = query(collection(db, VOUCHES_COLLECTION), where("voucheeId", "==", userId), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Vouch));
    } catch (error) {
        logFirebaseError("getVouchesForUserService", error);
        throw error;
    }
};

export const getVouchDocument = async (vouchId: string): Promise<Vouch | null> => {
    try {
        const docRef = doc(db, VOUCHES_COLLECTION, vouchId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Vouch;
        }
        return null;
    } catch (error) {
        logFirebaseError("getVouchDocument", error);
        return null;
    }
};

// --- Vouch Reporting Services ---
export const reportVouchService = async (vouch: Vouch, reporterId: string, reporterComment: string): Promise<void> => {
    const reportRef = doc(collection(db, VOUCH_REPORTS_COLLECTION));
    const newReport: Omit<VouchReport, 'id'> = {
        vouchId: vouch.id,
        reporterId,
        reporterComment,
        voucheeId: vouch.voucheeId,
        voucherId: vouch.voucherId,
        status: VouchReportStatus.Pending,
        createdAt: serverTimestamp() as any,
    };
    try {
        await setDoc(reportRef, newReport);
    } catch (error) {
        logFirebaseError("reportVouchService", error);
        throw new Error('Failed to submit report.');
    }
};

export const subscribeToVouchReportsService = (callback: (reports: VouchReport[]) => void): (() => void) => {
    const q = query(collection(db, VOUCH_REPORTS_COLLECTION), where("status", "==", VouchReportStatus.Pending), orderBy("createdAt", "asc"));
    return subscribeToCollectionService<VouchReport>(VOUCH_REPORTS_COLLECTION, callback, [where("status", "==", VouchReportStatus.Pending), orderBy("createdAt", "asc")]);
};

export const resolveVouchReportService = async (
    reportId: string, 
    resolution: VouchReportStatus.ResolvedDeleted | VouchReportStatus.ResolvedKept, 
    adminId: string,
    vouchId: string,
    voucheeId: string,
    vouchType: VouchType
): Promise<void> => {
    const reportRef = doc(db, VOUCH_REPORTS_COLLECTION, reportId);
    
    try {
        if (resolution === VouchReportStatus.ResolvedDeleted) {
            const vouchRef = doc(db, VOUCHES_COLLECTION, vouchId);
            const voucheeRef = doc(db, USERS_COLLECTION, voucheeId);

            await runTransaction(db, async (transaction) => {
                transaction.delete(vouchRef);
                transaction.update(voucheeRef, {
                    [`vouchInfo.${vouchType}`]: increment(-1),
                    'vouchInfo.total': increment(-1)
                });
                transaction.update(reportRef, {
                    status: resolution,
                    resolvedAt: serverTimestamp(),
                    resolvedBy: adminId,
                });
            });
        } else { // ResolvedKept
            await updateDoc(reportRef, {
                status: resolution,
                resolvedAt: serverTimestamp(),
                resolvedBy: adminId,
            });
        }
    } catch (error) {
        logFirebaseError("resolveVouchReportService", error);
        throw new Error('Failed to resolve report.');
    }
};

// --- Cloud Function Services ---
export const orionAnalyzeService = async (command: string): Promise<string> => {
  try {
    const orionAnalyzeFunction = httpsCallable(functions, 'orionAnalyze');
    const result = await orionAnalyzeFunction({ command });
    return result.data as string;
  } catch (error: any) {
    logFirebaseError("orionAnalyzeService", error);
    // Provide a user-friendly error message
    return `Error: ${error.message || 'Could not connect to Orion AI.'}`;
  }
};