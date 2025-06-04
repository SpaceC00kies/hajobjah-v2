
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
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
  collectionGroup
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
      photo: null, // Will be updated if they upload one
      address: '', // Default empty
      userLevel: { name: "🐣 มือใหม่หัดโพสต์", minScore: 0, colorClass: 'bg-green-200 dark:bg-green-700/50', textColorClass: 'text-green-800 dark:text-green-200' }, // Default level
      profileComplete: false, // Default
      isMuted: false,
      createdAt: serverTimestamp() as any, // Firestore will convert this
      updatedAt: serverTimestamp() as any,
    };

    await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), newUser);
    return { id: firebaseUser.uid, ...convertTimestamps(newUser) };
  } catch (error: any) {
    logFirebaseError("signUpWithEmailPasswordService", error);
    throw error; // Re-throw for App.tsx to handle UI
  }
};

export const signInWithEmailPasswordService = async (loginIdentifier: string, passwordAttempt: string): Promise<User | null> => {
  try {
    let emailToSignIn = loginIdentifier;
    // If loginIdentifier is not an email, try to find user by username
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
          // This case might happen if user record in Firestore is deleted but auth record remains
          logFirebaseError("onAuthChangeService", new Error(`User ${firebaseUser.uid} not found in Firestore.`));
          callback(null); // Treat as signed out
          await signOut(auth); // Sign out from Firebase Auth as well
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


// --- Storage Service ---
export const uploadImageService = async (path: string, fileOrBase64: File | string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    if (typeof fileOrBase64 === 'string') { // Assuming base64 data URL
      await uploadString(storageRef, fileOrBase64, 'data_url');
    } else { // Assuming File object
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
    // Ignore "object-not-found" errors, as it might have been already deleted or never existed.
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
      // If new photo is base64, upload it
      const oldUserSnap = await getDoc(userDocRef);
      if(oldUserSnap.exists() && oldUserSnap.data().photo) {
          await deleteImageService(oldUserSnap.data().photo);
      }
      dataToUpdate.photo = await uploadImageService(`profileImages/${userId}/${Date.now()}`, profileData.photo);
    } else if (profileData.hasOwnProperty('photo') && profileData.photo === undefined) {
      // If photo is explicitly set to undefined, it means remove it
       const oldUserSnap = await getDoc(userDocRef);
       if(oldUserSnap.exists() && oldUserSnap.data().photo) {
           await deleteImageService(oldUserSnap.data().photo);
       }
      dataToUpdate.photo = null;
    }
    // If profileData.photo is an existing URL or not provided, it won't be processed here for upload.

    await updateDoc(userDocRef, dataToUpdate);
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
    const docRef = await addDoc(collection(db, JOBS_COLLECTION), newJobDoc);
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addJobService", error);
    throw error;
  }
};
export const updateJobService = async (jobId: string, jobData: Partial<JobFormData>, contact: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, JOBS_COLLECTION, jobId), { ...jobData, contact, updatedAt: serverTimestamp() as any });
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
    const docRef = await addDoc(collection(db, HELPER_PROFILES_COLLECTION), newProfileDoc);
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addHelperProfileService", error);
    throw error;
  }
};
export const updateHelperProfileService = async (profileId: string, profileData: Partial<HelperProfileFormData>, contact: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, HELPER_PROFILES_COLLECTION, profileId), { ...profileData, contact, updatedAt: serverTimestamp() as any });
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
    let imageUrl: string | undefined = undefined;
    if (postData.image) {
      imageUrl = await uploadImageService(`webboardImages/${author.userId}/${Date.now()}`, postData.image);
    }
    const newPostDoc: Omit<WebboardPost, 'id'> = {
      title: postData.title,
      body: postData.body,
      category: postData.category,
      image: imageUrl,
      userId: author.userId,
      username: author.username,
      authorPhoto: author.photo || undefined,
      ownerId: author.userId,
      likes: [],
      isPinned: false,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    const docRef = await addDoc(collection(db, WEBBOARD_POSTS_COLLECTION), newPostDoc);
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addWebboardPostService", error);
    throw error;
  }
};
export const updateWebboardPostService = async (postId: string, postData: { title?: string; body?: string; category?: WebboardCategory; image?: string | null }, currentUserPhoto?: string | null): Promise<boolean> => {
  try {
    const postRef = doc(db, WEBBOARD_POSTS_COLLECTION, postId);
    const updatePayload: Partial<WebboardPost> = { ...postData, updatedAt: serverTimestamp() as any };

    if (postData.image && typeof postData.image === 'string' && postData.image.startsWith('data:image')) {
      const oldPostSnap = await getDoc(postRef);
      if(oldPostSnap.exists() && oldPostSnap.data().image) {
        await deleteImageService(oldPostSnap.data().image);
      }
      updatePayload.image = await uploadImageService(`webboardImages/${auth.currentUser?.uid}/${Date.now()}_edit`, postData.image);
    } else if (postData.hasOwnProperty('image') && postData.image === null) {
      const oldPostSnap = await getDoc(postRef);
      if(oldPostSnap.exists() && oldPostSnap.data().image) {
        await deleteImageService(oldPostSnap.data().image);
      }
      updatePayload.image = undefined; // Explicitly remove image
    }
    if (currentUserPhoto !== undefined) {
        updatePayload.authorPhoto = currentUserPhoto || undefined;
    }

    await updateDoc(postRef, updatePayload);
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
    // Delete comments associated with the post
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
    const docRef = await addDoc(collection(db, WEBBOARD_COMMENTS_COLLECTION), newCommentDoc);
    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addWebboardCommentService", error);
    throw error;
  }
};
export const updateWebboardCommentService = async (commentId: string, newText: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, WEBBOARD_COMMENTS_COLLECTION, commentId), { text: newText, updatedAt: serverTimestamp() as any });
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
    // Check for recent interaction to prevent spamming interestedCount
    const interactionsRef = collection(db, INTERACTIONS_COLLECTION);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const q = query(interactionsRef,
      where("helperProfileId", "==", helperProfileId),
      where("employerUserId", "==", employerUserId),
      where("timestamp", ">", tenMinutesAgo)
    );
    const recentInteractionsSnap = await getDocs(q);

    if (!recentInteractionsSnap.empty) {
        // Already logged recently, just return existing ID to avoid duplicate count increase
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
    const docRef = await addDoc(collection(db, INTERACTIONS_COLLECTION), newInteractionDoc);

    // Increment interestedCount on HelperProfile
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
      // Default config if not found
      callback({ isSiteLocked: false });
    }
  }, (error) => {
    logFirebaseError("subscribeToSiteConfigService", error);
    callback({ isSiteLocked: false }); // Fallback on error
  });
};
export const setSiteLockService = async (isLocked: boolean, adminUserId: string): Promise<boolean> => {
  try {
    await setDoc(doc(db, SITE_CONFIG_COLLECTION, SITE_CONFIG_DOC_ID), {
      isSiteLocked: isLocked,
      updatedAt: serverTimestamp() as any,
      updatedBy: adminUserId,
    }, { merge: true });
    return true;
  } catch (error: any) {
    logFirebaseError("setSiteLockService", error);
    throw error;
  }
};

// User Management (Admin)
export const setUserRoleService = async (userIdToUpdate: string, newRole: UserRole): Promise<boolean> => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userIdToUpdate), { role: newRole, updatedAt: serverTimestamp() as any });
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
  currentValue?: boolean // Optional: pass current value to ensure toggle logic is correct if state is stale
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

    await updateDoc(itemRef, { [flagName]: finalValueToSet, updatedAt: serverTimestamp() as any });
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
      newLikes = likes.filter(id => id !== userId); // Unlike
    } else {
      newLikes = [...likes, userId]; // Like
    }
    await updateDoc(postRef, { likes: newLikes, updatedAt: serverTimestamp() as any });
    return true;
  } catch (error: any) {
    logFirebaseError("toggleWebboardPostLikeService", error);
    throw error;
  }
};

export const submitFeedbackService = async (feedbackText: string, page: string, userId?: string): Promise<boolean> => {
  try {
    await addDoc(collection(db, FEEDBACK_COLLECTION), {
      text: feedbackText,
      page,
      userId: userId || null,
      submittedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    logFirebaseError("submitFeedbackService", error);
    throw error;
  }
};
