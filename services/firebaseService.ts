
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail, // Import sendPasswordResetEmail
  User as FirebaseUser,
} from 'firebase/auth';
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
  WriteBatch,
  QueryConstraint,
  collectionGroup,
  deleteField, // Import deleteField
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadString,
} from 'firebase/storage';

import { auth, db, storage } from '../firebase'; // Corrected import path
import type { User, Job, HelperProfile, WebboardPost, WebboardComment, Interaction, SiteConfig, UserRole } from '../types';
import { WebboardCategory } from '../types'; // Added import for WebboardCategory
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

// Helper function to remove undefined properties from an object
// Firestore does not support undefined values. Null is supported.
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


// --- Authentication Services ---
export const signUpWithEmailPasswordService = async (
  userData: Omit<User, 'id' | 'userLevel' | 'profileComplete'> & { password: string }
): Promise<User | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const firebaseUser = userCredential.user;
    const { password, ...userProfileData } = userData;

    const newUser: Omit<User, 'id'> = {
      ...userProfileData,
      photo: null,
      address: '',
      userLevel: { name: "🐣 มือใหม่หัดโพสต์", minScore: 0, colorClass: 'bg-green-200 dark:bg-green-700/50', textColorClass: 'text-green-800 dark:text-green-200' },
      profileComplete: false,
      isMuted: false,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), cleanDataForFirestore(newUser));
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
      const q = query(usersRef, where("username", "==", loginIdentifier), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        emailToSignIn = querySnapshot.docs[0].data().email;
      } else {
        throw new Error("User not found with this username.");
      }
    }

    const userCredential = await signInWithEmailAndPassword(auth, emailToSignIn, passwordAttempt);
    const firebaseUser = userCredential.user;
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));
    if (userDoc.exists()) {
      return { id: firebaseUser.uid, ...convertTimestamps(userDoc.data()) } as User;
    }
    throw new Error("User data not found in Firestore.");
  } catch (error: any) {
    logFirebaseError("signInWithEmailPasswordService", error);
    throw error;
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
          callback({ id: firebaseUser.uid, ...convertTimestamps(userDocSnap.data()) } as User);
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
    // Firebase errors like 'auth/user-not-found' or 'auth/invalid-email' could be caught here.
    // For better UX, we might not want to expose 'user-not-found' directly.
    // The modal itself will handle displaying a generic success or a specific error message based on the promise.
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
    if (error.code !== 'storage/object-not-found') {
      logFirebaseError("deleteImageService", error);
      throw error;
    }
  }
};

// --- User Profile Service ---
export const updateUserProfileService = async (
  userId: string,
  profileData: Partial<Omit<User, 'id' | 'email' | 'role' | 'createdAt' | 'updatedAt' | 'username'>>
): Promise<boolean> => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    let dataToUpdate: Partial<User> = { ...profileData, updatedAt: serverTimestamp() as any };

    if (profileData.photo && typeof profileData.photo === 'string' && profileData.photo.startsWith('data:image')) {
      const oldUserSnap = await getDoc(userDocRef);
      if(oldUserSnap.exists() && oldUserSnap.data().photo) {
          await deleteImageService(oldUserSnap.data().photo);
      }
      dataToUpdate.photo = await uploadImageService(`profileImages/${userId}/${Date.now()}`, profileData.photo);
    } else if (profileData.hasOwnProperty('photo') && profileData.photo === undefined) { // User wants to remove photo
       const oldUserSnap = await getDoc(userDocRef);
       if(oldUserSnap.exists() && oldUserSnap.data().photo) {
           await deleteImageService(oldUserSnap.data().photo);
       }
      dataToUpdate.photo = null; // Set to null instead of undefined
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
type JobFormData = Omit<Job, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export const addJobService = async (jobData: JobFormData, author: { userId: string; username: string; contact: string }): Promise<string> => {
  try {
    const newJobDoc: Omit<Job, 'id'> = {
      ...jobData,
      userId: author.userId,
      username: author.username,
      contact: author.contact,
      ownerId: author.userId,
      isPinned: false,
      isHired: false,
      isSuspicious: false,
      postedAt: serverTimestamp() as any,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    const docRef = await addDoc(collection(db, JOBS_COLLECTION), cleanDataForFirestore(newJobDoc as Record<string, any>));
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
export const subscribeToJobsService = (callback: (data: Job[]) => void) =>
  subscribeToCollectionService<Job>(JOBS_COLLECTION, callback, [orderBy("isPinned", "desc"), orderBy("postedAt", "desc")]);


// Helper Profiles
type HelperProfileFormData = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt'>;
interface HelperProfileAuthorInfo { userId: string; username: string; contact: string; gender: User['gender']; birthdate: User['birthdate']; educationLevel: User['educationLevel']; }
export const addHelperProfileService = async (profileData: HelperProfileFormData, author: HelperProfileAuthorInfo): Promise<string> => {
  try {
    const newProfileDoc: Omit<HelperProfile, 'id'> = {
      ...profileData,
      userId: author.userId,
      username: author.username,
      contact: author.contact,
      gender: author.gender,
      birthdate: author.birthdate,
      educationLevel: author.educationLevel,
      ownerId: author.userId,
      isPinned: false, isUnavailable: false, isSuspicious: false, adminVerifiedExperience: false, interestedCount: 0,
      postedAt: serverTimestamp() as any,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    const docRef = await addDoc(collection(db, HELPER_PROFILES_COLLECTION), cleanDataForFirestore(newProfileDoc as Record<string, any>));
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
export const deleteHelperProfileService = async (profileId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId));
    return true;
  } catch (error: any) {
    logFirebaseError("deleteHelperProfileService", error);
    throw error;
  }
};
export const subscribeToHelperProfilesService = (callback: (data: HelperProfile[]) => void) =>
  subscribeToCollectionService<HelperProfile>(HELPER_PROFILES_COLLECTION, callback, [orderBy("isPinned", "desc"), orderBy("postedAt", "desc")]);

// Webboard Posts
interface WebboardPostAuthorInfo { userId: string; username: string; photo?: string | null; }
export const addWebboardPostService = async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, author: WebboardPostAuthorInfo): Promise<string> => {
  try {
    let imageUrl: string | undefined = undefined; // Keep as undefined if no image
    if (postData.image && postData.image.startsWith('data:image')) { // Ensure it's a base64 string for upload
      imageUrl = await uploadImageService(`webboardImages/${author.userId}/${Date.now()}`, postData.image);
    }

    const newPostDoc: Omit<WebboardPost, 'id'> = {
      title: postData.title,
      body: postData.body,
      category: postData.category,
      image: imageUrl, // This will be undefined if no image, and cleanDataForFirestore will omit it
      userId: author.userId,
      username: author.username,
      authorPhoto: author.photo || undefined, // Omitted if undefined
      ownerId: author.userId,
      likes: [],
      isPinned: false,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    const docRef = await addDoc(collection(db, WEBBOARD_POSTS_COLLECTION), cleanDataForFirestore(newPostDoc as Record<string, any>));
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addWebboardPostService", error);
    throw error;
  }
};

export const updateWebboardPostService = async (postId: string, postData: { title?: string; body?: string; category?: WebboardCategory; image?: string | null }, currentUserPhoto?: string | null): Promise<boolean> => {
  try {
    const postRef = doc(db, WEBBOARD_POSTS_COLLECTION, postId);
    // Create a base payload, ensuring properties that might be undefined are handled
    const basePayload: Partial<WebboardPost> = {};
    if (postData.title !== undefined) basePayload.title = postData.title;
    if (postData.body !== undefined) basePayload.body = postData.body;
    if (postData.category !== undefined) basePayload.category = postData.category;
    
    basePayload.updatedAt = serverTimestamp() as any;
    if (currentUserPhoto !== undefined) {
      basePayload.authorPhoto = currentUserPhoto || null; // Use null if currentUserPhoto is explicitly null
    }


    let finalUpdatePayload = { ...basePayload };

    if (postData.hasOwnProperty('image')) { // Check if 'image' key exists in postData
      if (postData.image && typeof postData.image === 'string' && postData.image.startsWith('data:image')) {
        // New image to upload
        const oldPostSnap = await getDoc(postRef);
        if(oldPostSnap.exists() && oldPostSnap.data().image) {
          await deleteImageService(oldPostSnap.data().image);
        }
        finalUpdatePayload.image = await uploadImageService(`webboardImages/${auth.currentUser?.uid}/${Date.now()}_edit`, postData.image);
      } else if (postData.image === null) {
        // Explicit request to remove image
        const oldPostSnap = await getDoc(postRef);
        if(oldPostSnap.exists() && oldPostSnap.data().image) {
          await deleteImageService(oldPostSnap.data().image);
        }
        finalUpdatePayload.image = null; // Set to null in Firestore
      }
      // If postData.image is undefined, it won't be added to finalUpdatePayload here,
      // cleanDataForFirestore will handle it later.
      // If postData.image is an existing URL, it also won't be added here, meaning no change to image.
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
    if (postSnap.exists() && postSnap.data().image) {
      await deleteImageService(postSnap.data().image);
    }
    const commentsQuery = query(collection(db, WEBBOARD_COMMENTS_COLLECTION), where("postId", "==", postId));
    const commentsSnapshot = await getDocs(commentsQuery);
    const batch: WriteBatch = writeBatch(db);
    commentsSnapshot.forEach(commentDoc => batch.delete(commentDoc.ref));
    await batch.commit();

    await deleteDoc(postRef);
    return true;
  } catch (error: any) {
    logFirebaseError("deleteWebboardPostService", error);
    throw error;
  }
};
export const subscribeToWebboardPostsService = (callback: (data: WebboardPost[]) => void) =>
  subscribeToCollectionService<WebboardPost>(WEBBOARD_POSTS_COLLECTION, callback, [orderBy("isPinned", "desc"), orderBy("createdAt", "desc")]);


// Webboard Comments
interface WebboardCommentAuthorInfo { userId: string; username: string; photo?: string | null; }
export const addWebboardCommentService = async (postId: string, text: string, author: WebboardCommentAuthorInfo): Promise<string> => {
  try {
    const newCommentDoc: Omit<WebboardComment, 'id'> = {
      postId,
      text,
      userId: author.userId,
      username: author.username,
      authorPhoto: author.photo || undefined,
      ownerId: author.userId,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    const docRef = await addDoc(collection(db, WEBBOARD_COMMENTS_COLLECTION), cleanDataForFirestore(newCommentDoc as Record<string, any>));
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
    await deleteDoc(doc(db, WEBBOARD_COMMENTS_COLLECTION, commentId));
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

    const helperProfileRef = doc(db, HELPER_PROFILES_COLLECTION, helperProfileId);
    const helperProfileSnap = await getDoc(helperProfileRef);
    if (helperProfileSnap.exists()) {
      const currentCount = helperProfileSnap.data().interestedCount || 0;
      await updateDoc(helperProfileRef, { interestedCount: currentCount + 1 });
    }
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("logHelperContactInteractionService", error);
    throw error;
  }
};
export const subscribeToInteractionsService = (callback: (data: Interaction[]) => void) =>
  subscribeToCollectionService<Interaction>(INTERACTIONS_COLLECTION, callback, [orderBy("timestamp", "desc")]);


// Site Config
export const subscribeToSiteConfigService = (callback: (config: SiteConfig) => void): (() => void) => {
  const docRef = doc(db, SITE_CONFIG_COLLECTION, SITE_CONFIG_DOC_ID);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(convertTimestamps(docSnap.data()) as SiteConfig);
    } else {
      callback({ isSiteLocked: false });
    }
  }, (error) => {
    logFirebaseError("subscribeToSiteConfigService", error);
    callback({ isSiteLocked: false });
  });
};
export const setSiteLockService = async (isLocked: boolean, adminUserId: string): Promise<boolean> => {
  try {
    const dataToSet = {
      isSiteLocked: isLocked,
      updatedAt: serverTimestamp() as any,
      updatedBy: adminUserId,
    };
    await setDoc(doc(db, SITE_CONFIG_COLLECTION, SITE_CONFIG_DOC_ID), cleanDataForFirestore(dataToSet), { merge: true });
    return true;
  } catch (error: any) {
    logFirebaseError("setSiteLockService", error);
    throw error;
  }
};

// User Management (Admin)
export const setUserRoleService = async (userIdToUpdate: string, newRole: UserRole): Promise<boolean> => {
  try {
    const dataToUpdate = { role: newRole, updatedAt: serverTimestamp() as any };
    await updateDoc(doc(db, USERS_COLLECTION, userIdToUpdate), cleanDataForFirestore(dataToUpdate));
    return true;
  } catch (error: any) {
    logFirebaseError("setUserRoleService", error);
    throw error;
  }
};
export const subscribeToUsersService = (callback: (data: User[]) => void) =>
  subscribeToCollectionService<User>(USERS_COLLECTION, callback, [orderBy("createdAt", "desc")]);

// Generic Item Flag Toggler
type ItemWithFlags = Job | HelperProfile | WebboardPost;
type ItemFlagKeys = 'isPinned' | 'isHired' | 'isSuspicious' | 'isUnavailable' | 'adminVerifiedExperience';

export const toggleItemFlagService = async (
  collectionName: 'jobs' | 'helperProfiles' | 'webboardPosts',
  itemId: string,
  flagName: ItemFlagKeys,
  currentValue?: boolean
): Promise<boolean> => {
  try {
    const itemRef = doc(db, collectionName, itemId);
    let finalValueToSet: boolean;

    if (typeof currentValue === 'boolean') {
        finalValueToSet = !currentValue;
    } else {
        const itemSnap = await getDoc(itemRef);
        if (!itemSnap.exists()) throw new Error("Item not found.");
        finalValueToSet = !(itemSnap.data() as any)[flagName];
    }
    const dataToUpdate = { [flagName]: finalValueToSet, updatedAt: serverTimestamp() as any };
    await updateDoc(itemRef, cleanDataForFirestore(dataToUpdate));
    return true;
  } catch (error: any) {
    logFirebaseError(`toggleItemFlagService for ${flagName} on ${collectionName}`, error);
    throw error;
  }
};

export const toggleWebboardPostLikeService = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const postRef = doc(db, WEBBOARD_POSTS_COLLECTION, postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) throw new Error("Post not found.");

    const postData = postSnap.data() as WebboardPost;
    const likes = postData.likes || [];
    const userLikedIndex = likes.indexOf(userId);

    let newLikes: string[];
    if (userLikedIndex > -1) {
      newLikes = likes.filter(id => id !== userId);
    } else {
      newLikes = [...likes, userId];
    }
    const dataToUpdate = { likes: newLikes, updatedAt: serverTimestamp() as any };
    await updateDoc(postRef, cleanDataForFirestore(dataToUpdate));
    return true;
  } catch (error: any) {
    logFirebaseError("toggleWebboardPostLikeService", error);
    throw error;
  }
};

export const submitFeedbackService = async (feedbackText: string, page: string, userId?: string): Promise<boolean> => {
  try {
    const dataToAdd = {
      text: feedbackText,
      page,
      userId: userId || null, // Ensure userId is null if undefined
      submittedAt: serverTimestamp(),
    };
    await addDoc(collection(db, FEEDBACK_COLLECTION), cleanDataForFirestore(dataToAdd as Record<string, any>));
    return true;
  } catch (error) {
    logFirebaseError("submitFeedbackService", error);
    throw error;
  }
};