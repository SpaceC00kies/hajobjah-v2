
import { auth, db, storage } from '../firebase';
import type { User as AuthUserType } from 'firebase/auth'; // Firebase Auth User type
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
  QueryDocumentSnapshot,
  DocumentData,
  WhereFilterOp,
  OrderByDirection,
} from 'firebase/firestore';
import {
  ref as storageRef, // Alias ref to avoid conflict
  uploadString,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

import type { User, UserRole, Job, HelperProfile, WebboardPost, WebboardComment, SiteConfig, WebboardCategory, Interaction, GenderOption, HelperEducationLevelOption } from '../types';
import { logFirebaseError } from '../firebase/logging';

// Helper type for FirebaseUser from firebase/auth
type FirebaseUser = AuthUserType;
type FirestoreQueryDocumentSnapshot = QueryDocumentSnapshot<DocumentData>; // Explicitly use Firestore's type
type Unsubscribe = () => void;


// Helper function to parse storage path from HTTPS URL
const getPathFromHttpUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'firebasestorage.googleapis.com' || urlObj.hostname.endsWith('.appspot.com')) {
      // Pathname is like /v0/b/your-bucket.appspot.com/o/path%2Fto%2Ffile.jpg?alt=media&token=...
      // Or for older GCS URLs, it might be /bucket-name/path%2Fto%2Ffile.jpg
      const pathSegments = urlObj.pathname.split('/o/');
      if (pathSegments.length > 1) {
        const encodedPath = pathSegments[1].split('?')[0];
        return decodeURIComponent(encodedPath);
      } else {
        // Handle cases like /bucketname/objectpath if needed, assuming direct path after initial segment
        const pathParts = urlObj.pathname.substring(1).split('/'); // remove leading /
        if (pathParts.length > 1) {
          // This logic might need adjustment based on exact URL structure if not firebase storage default
          return decodeURIComponent(pathParts.slice(1).join('/'));
        }
      }
    }
  } catch (e) { logFirebaseError("getPathFromHttpUrl", e); }
  return null;
};


// Helper function to handle dates (especially Firestore Timestamps)
const convertTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp && typeof timestamp.toDate === 'function') { // Handle older compat Timestamp if any leak
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === 'string') {
    try {
      const parsedDate = new Date(timestamp);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString();
      }
      return timestamp;
    } catch (e) {
      return timestamp;
    }
  }
  try {
    return new Date(timestamp).toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
};

// --- Image Upload Helper ---
const uploadImageToStorageService = async (fileOrBase64: string | File, path: string): Promise<string> => {
  const sRef = storageRef(storage, path);
  try {
    if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:image')) {
      await uploadString(sRef, fileOrBase64, 'data_url');
    } else if (fileOrBase64 instanceof File) {
      await uploadBytes(sRef, fileOrBase64);
    } else {
      throw new Error('Invalid image format for upload.');
    }
    return await getDownloadURL(sRef);
  } catch (error) {
    logFirebaseError(`uploadImageToStorageService (${path})`, error);
    throw error;
  }
};

const deleteImageFromStorageService = async (imageUrl: string | undefined | null): Promise<void> => {
    if (!imageUrl || !(imageUrl.startsWith('https://firebasestorage.googleapis.com/') || imageUrl.includes('.appspot.com/'))) {
        return;
    }
    try {
        const filePath = getPathFromHttpUrl(imageUrl);
        if (filePath) {
            const imageStorageRef = storageRef(storage, filePath);
            await deleteObject(imageStorageRef);
        } else {
           // console.warn(`Could not parse path from image URL for deletion: ${imageUrl}`);
        }
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            // console.warn(`Image not found for deletion, but proceeding: ${imageUrl}`);
        } else {
            logFirebaseError(`deleteImageFromStorageService (${imageUrl})`, error);
            // Don't throw, allow Firestore update to proceed if deletion fails but is not critical
        }
    }
};


// --- User Authentication Services ---
export const signUpWithEmailPasswordService = async (userData: Omit<User, 'id' | 'userLevel' | 'profileComplete' | 'photo' | 'address'> & {password: string}): Promise<User | null> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const firebaseUser = result.user;

    if (!firebaseUser) {
        throw new Error("User creation failed, no user object returned.");
    }

    await firebaseUpdateProfile(firebaseUser, { displayName: userData.displayName });

    const newUserForDb: Omit<User, 'id' | 'userLevel' | 'profileComplete' | 'address' | 'photo' | 'createdAt' | 'updatedAt'> & {
        createdAt: any; // FieldValue
        updatedAt: any; // FieldValue
        displayName: string; username: string; email: string; role: UserRole; mobile: string;
        lineId?: string; facebook?: string; gender?: GenderOption; birthdate?: string;
        educationLevel?: HelperEducationLevelOption; favoriteMusic?: string; favoriteBook?: string;
        favoriteMovie?: string; hobbies?: string; favoriteFood?: string; dislikedThing?: string;
        introSentence?: string; isMuted?: boolean;
    } = {
        displayName: userData.displayName,
        username: userData.username,
        email: firebaseUser.email!,
        role: userData.role,
        mobile: userData.mobile,
        lineId: userData.lineId || undefined,
        facebook: userData.facebook || undefined,
        gender: userData.gender,
        birthdate: userData.birthdate,
        educationLevel: userData.educationLevel,
        favoriteMusic: userData.favoriteMusic || undefined,
        favoriteBook: userData.favoriteBook || undefined,
        favoriteMovie: userData.favoriteMovie || undefined,
        hobbies: userData.hobbies || undefined,
        favoriteFood: userData.favoriteFood || undefined,
        dislikedThing: userData.dislikedThing || undefined,
        introSentence: userData.introSentence || undefined,
        isMuted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), newUserForDb);

    const createdUser: User = {
      id: firebaseUser.uid,
      displayName: newUserForDb.displayName,
      username: newUserForDb.username,
      email: newUserForDb.email,
      role: newUserForDb.role,
      mobile: newUserForDb.mobile,
      lineId: newUserForDb.lineId,
      facebook: newUserForDb.facebook,
      gender: newUserForDb.gender,
      birthdate: newUserForDb.birthdate,
      educationLevel: newUserForDb.educationLevel,
      photo: undefined,
      address: undefined,
      favoriteMusic: newUserForDb.favoriteMusic,
      favoriteBook: newUserForDb.favoriteBook,
      favoriteMovie: newUserForDb.favoriteMovie,
      hobbies: newUserForDb.hobbies,
      favoriteFood: newUserForDb.favoriteFood,
      dislikedThing: newUserForDb.dislikedThing,
      introSentence: newUserForDb.introSentence,
      userLevel: { name: '🐣 มือใหม่หัดโพสต์', minScore: 0, colorClass: 'bg-green-200 dark:bg-green-700/50', textColorClass: 'text-green-800 dark:text-green-200' },
      profileComplete: false,
      isMuted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return createdUser;

  } catch (error) {
    logFirebaseError("signUpWithEmailPasswordService", error);
    throw error;
  }
};

export const signInWithEmailPasswordService = async (loginIdentifier: string, passwordAttempt: string): Promise<User | null> => {
  try {
    let emailToLogin = loginIdentifier;
    if (!loginIdentifier.includes('@')) {
      const usersCollRef = collection(db, 'users');
      const q = query(usersCollRef, where('username', '==', loginIdentifier));
      const usersSnapshot = await getDocs(q);
      if (usersSnapshot.empty) {
        throw new Error('ไม่พบชื่อผู้ใช้นี้');
      }
      const foundUserDoc = usersSnapshot.docs[0];
      emailToLogin = foundUserDoc.data().email;
       if (!emailToLogin) {
        throw new Error('ไม่พบอีเมลสำหรับชื่อผู้ใช้นี้');
      }
    }
    await signInWithEmailAndPassword(auth, emailToLogin, passwordAttempt);
    return getCurrentUserService();
  } catch (error) {
    logFirebaseError("signInWithEmailPasswordService", error);
    throw error;
  }
};

export const signOutUserService = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    logFirebaseError("signOutUserService", error);
    throw error;
  }
};

export const onAuthChangeService = (callback: (user: User | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const user = await getCurrentUserService();
      callback(user);
    } else {
      callback(null);
    }
  });
};

export const getCurrentUserService = async (): Promise<User | null> => {
  const firebaseUserAuth = auth.currentUser;
  if (!firebaseUserAuth) return null;
  try {
    const userDocRef = doc(db, 'users', firebaseUserAuth.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data() as Omit<User, 'id'>;
      return {
        id: firebaseUserAuth.uid,
        ...userData,
        photo: firebaseUserAuth.photoURL || userData.photo,
        displayName: firebaseUserAuth.displayName || userData.displayName,
        userLevel: userData.userLevel || { name: '🐣 มือใหม่หัดโพสต์', minScore: 0, colorClass: 'bg-green-200 dark:bg-green-700/50', textColorClass: 'text-green-800 dark:text-green-200' },
        profileComplete: userData.profileComplete || false,
        createdAt: convertTimestamp(userData.createdAt),
        updatedAt: convertTimestamp(userData.updatedAt),
      };
    }
    logFirebaseError("getCurrentUserService", `User ${firebaseUserAuth.uid} exists in Auth but not Firestore.`);
    return null;
  } catch (error) {
    logFirebaseError("getCurrentUserService", error);
    return null;
  }
};

// --- Firestore Read Services (Real-time Subscriptions) ---
const createSubscriptionService = <T extends { id: string }>(
  collectionName: string,
  mapFn: (doc: FirestoreQueryDocumentSnapshot) => T,
  defaultOrderByField: string = 'createdAt',
  defaultOrderByDirection: OrderByDirection = 'desc',
  additionalQueryConstraints: { field: string, op: WhereFilterOp, value: any }[] = []
) => (callback: (data: T[]) => void): Unsubscribe => {
  const collRef = collection(db, collectionName);
  let q = query(collRef); // Start with the base collection reference

  additionalQueryConstraints.forEach(constraint => {
    q = query(q, where(constraint.field, constraint.op, constraint.value));
  });

  q = query(q, orderBy(defaultOrderByField, defaultOrderByDirection));

  return onSnapshot(q, (snapshot) => {
    const dataList = snapshot.docs.map(d => mapFn(d));
    callback(dataList);
  }, (error) => {
    logFirebaseError(`subscribeTo${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}Service`, error);
    callback([]);
  });
};

export const subscribeToJobsService = createSubscriptionService<Job>('jobs', d => ({
  id: d.id, ...d.data(), postedAt: convertTimestamp(d.data().postedAt), createdAt: convertTimestamp(d.data().createdAt), updatedAt: convertTimestamp(d.data().updatedAt)
} as Job));

export const subscribeToHelperProfilesService = createSubscriptionService<HelperProfile>('helperProfiles', d => ({
  id: d.id, ...d.data(), postedAt: convertTimestamp(d.data().postedAt), createdAt: convertTimestamp(d.data().createdAt), updatedAt: convertTimestamp(d.data().updatedAt)
} as HelperProfile));

export const subscribeToUsersService = createSubscriptionService<User>('users', d => ({
  id: d.id, ...d.data(), createdAt: convertTimestamp(d.data().createdAt), updatedAt: convertTimestamp(d.data().updatedAt),
  userLevel: d.data().userLevel || { name: '🐣 มือใหม่หัดโพสต์', minScore: 0, colorClass: 'bg-green-200 dark:bg-green-700/50', textColorClass: 'text-green-800 dark:text-green-200' }
} as User), 'username', 'asc');

export const subscribeToWebboardPostsService = (callback: (data: WebboardPost[]) => void): Unsubscribe => {
  const collRef = collection(db, 'webboardPosts');
  const q = query(collRef, orderBy('isPinned', 'desc'), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const dataList = snapshot.docs.map(d => ({
        id: d.id, ...d.data(), likes: d.data().likes || [], createdAt: convertTimestamp(d.data().createdAt), updatedAt: convertTimestamp(d.data().updatedAt)
    } as WebboardPost));
    callback(dataList);
  }, (error) => {
    logFirebaseError(`subscribeToWebboardPostsService`, error);
    callback([]);
  });
};

export const subscribeToWebboardCommentsService = createSubscriptionService<WebboardComment>('webboardComments', d => ({
  id: d.id, ...d.data(), createdAt: convertTimestamp(d.data().createdAt), updatedAt: convertTimestamp(d.data().updatedAt)
} as WebboardComment), 'createdAt', 'asc');

export const subscribeToInteractionsService = createSubscriptionService<Interaction>('interactions', d => ({
  id: d.id,
  ...d.data(),
  timestamp: convertTimestamp(d.data().timestamp),
  createdAt: convertTimestamp(d.data().createdAt),
  helperProfileId: d.data().helperProfileId
} as Interaction), 'timestamp', 'desc');

export const subscribeToSiteConfigService = (callback: (config: SiteConfig) => void): Unsubscribe => {
  const docRef = doc(db, 'config', 'siteStatus');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        isSiteLocked: data.isSiteLocked || false,
        updatedAt: data.updatedAt ? convertTimestamp(data.updatedAt) : undefined,
        updatedBy: data.updatedBy,
      });
    } else {
      callback({ isSiteLocked: false });
    }
  }, (error) => {
    logFirebaseError("subscribeToSiteConfigService", error);
    callback({ isSiteLocked: false });
  });
};

// --- Firestore Write Services ---
// User Profile
export const updateUserProfileService = async (
  userId: string,
  profileData: Partial<Omit<User, 'id' | 'email' | 'role' | 'createdAt' | 'updatedAt' | 'username' | 'userLevel' | 'profileComplete'>>
): Promise<boolean> => {
  const currentUserAuth = auth.currentUser;
  if (!currentUserAuth || currentUserAuth.uid !== userId) {
    throw new Error("Unauthorized attempt to update profile or user mismatch.");
  }
  try {
    const userDocRef = doc(db, 'users', userId);
    const dataToUpdate: any = { ...profileData, updatedAt: serverTimestamp() };
    let newPhotoURL: string | null | undefined = profileData.photo;

    if (profileData.photo && typeof profileData.photo === 'string' && profileData.photo.startsWith('data:image')) {
      const oldUserDoc = await getDoc(userDocRef);
      const oldPhotoURL = oldUserDoc.exists() ? oldUserDoc.data()?.photo : null;
      if (oldPhotoURL && typeof oldPhotoURL === 'string') {
          await deleteImageFromStorageService(oldPhotoURL);
      }
      newPhotoURL = await uploadImageToStorageService(profileData.photo, `profileImages/${userId}/${Date.now()}`);
      dataToUpdate.photo = newPhotoURL;
    } else if (profileData.hasOwnProperty('photo') && profileData.photo === undefined) {
      const oldUserDoc = await getDoc(userDocRef);
      const oldPhotoURL = oldUserDoc.exists() ? oldUserDoc.data()?.photo : null;
      if (oldPhotoURL && typeof oldPhotoURL === 'string') {
          await deleteImageFromStorageService(oldPhotoURL);
      }
      newPhotoURL = null;
      dataToUpdate.photo = null;
    }

    await updateDoc(userDocRef, dataToUpdate);

    let authProfileUpdates: { displayName?: string | null; photoURL?: string | null } = {};
    if (profileData.hasOwnProperty('displayName') && profileData.displayName !== currentUserAuth.displayName) {
        authProfileUpdates.displayName = profileData.displayName;
    }
    if (newPhotoURL !== undefined && newPhotoURL !== currentUserAuth.photoURL) { // Check if photo actually changed
        authProfileUpdates.photoURL = newPhotoURL;
    }

    if (Object.keys(authProfileUpdates).length > 0) {
        await firebaseUpdateProfile(currentUserAuth, authProfileUpdates);
    }
    return true;
  } catch (error) {
    logFirebaseError("updateUserProfileService", error);
    throw error;
  }
};


// --- Jobs ---
type JobFormData = Omit<Job, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export const addJobService = async (jobData: JobFormData, contactInfo: string): Promise<string> => {
  const currentUserAuth = auth.currentUser;
  if (!currentUserAuth) throw new Error("User not authenticated");
  try {
    const jobsCollRef = collection(db, 'jobs');
    const docRef = await addDoc(jobsCollRef, {
      ...jobData,
      userId: currentUserAuth.uid,
      username: currentUserAuth.displayName || 'Anonymous',
      contact: contactInfo,
      isSuspicious: false,
      isPinned: false,
      isHired: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    logFirebaseError("addJobService", error);
    throw error;
  }
};

export const updateJobService = async (jobId: string, jobData: JobFormData, contactInfo: string): Promise<void> => {
  try {
    const jobDocRef = doc(db, 'jobs', jobId);
    await updateDoc(jobDocRef, {
      ...jobData,
      contact: contactInfo,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logFirebaseError("updateJobService", error);
    throw error;
  }
};

export const deleteJobService = async (jobId: string): Promise<boolean> => {
  try {
    const jobDocRef = doc(db, 'jobs', jobId);
    await deleteDoc(jobDocRef);
    return true;
  } catch (error) {
    logFirebaseError("deleteJobService", error);
    throw error;
  }
};

// --- Helper Profiles ---
type HelperProfileFormData = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt'>;

type HelperProfileUserServiceData = Pick<User, 'username' | 'gender' | 'birthdate' | 'educationLevel'> & {
    userId: string; // This comes from currentUser.id, not from User type directly
    contact: string; // This is the generated contact string
};


export const addHelperProfileService = async (profileData: HelperProfileFormData, userServiceData: HelperProfileUserServiceData): Promise<string> => {
  const currentUserAuth = auth.currentUser;
  if (!currentUserAuth || currentUserAuth.uid !== userServiceData.userId) throw new Error("User not authenticated or mismatch");
  try {
    const profilesCollRef = collection(db, 'helperProfiles');
    const docRef = await addDoc(profilesCollRef, {
      ...profileData,
      userId: userServiceData.userId,
      username: userServiceData.username,
      contact: userServiceData.contact,
      gender: userServiceData.gender,
      birthdate: userServiceData.birthdate,
      educationLevel: userServiceData.educationLevel,
      isSuspicious: false,
      isPinned: false,
      isUnavailable: false,
      adminVerifiedExperience: false,
      interestedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    logFirebaseError("addHelperProfileService", error);
    throw error;
  }
};

export const updateHelperProfileService = async (profileId: string, profileData: HelperProfileFormData, contactInfo: string): Promise<void> => {
  try {
    const profileDocRef = doc(db, 'helperProfiles', profileId);
    await updateDoc(profileDocRef, {
      ...profileData,
      contact: contactInfo,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logFirebaseError("updateHelperProfileService", error);
    throw error;
  }
};

export const deleteHelperProfileService = async (profileId: string): Promise<boolean> => {
  try {
    const profileDocRef = doc(db, 'helperProfiles', profileId);
    await deleteDoc(profileDocRef);
    return true;
  } catch (error) {
    logFirebaseError("deleteHelperProfileService", error);
    throw error;
  }
};

// --- Interactions ---
export const logHelperContactInteractionService = async (helperProfileId: string, employerUserId: string): Promise<void> => {
  try {
    const helperProfileDoc = await getDoc(doc(db, 'helperProfiles', helperProfileId));
    if (!helperProfileDoc.exists()) throw new Error("Helper profile not found.");
    const helperUserId = helperProfileDoc.data()?.userId;
    if (!helperUserId) throw new Error("Helper profile has no user ID.");

    const interactionsCollRef = collection(db, 'interactions');
    await addDoc(interactionsCollRef, {
      helperUserId: helperUserId,
      helperProfileId: helperProfileId,
      employerUserId: employerUserId,
      timestamp: serverTimestamp(),
      type: 'contact_helper',
      createdAt: serverTimestamp(),
    });
    // Increment interestedCount
    const profileRef = doc(db, 'helperProfiles', helperProfileId);
    await updateDoc(profileRef, { interestedCount: increment(1) });
  } catch (error) {
    logFirebaseError("logHelperContactInteractionService", error);
    throw error;
  }
};

// --- Webboard Posts ---
export const addWebboardPostService = async (
    postData: { title: string; body: string; category: WebboardCategory; image?: string },
    authorInfo: { userId: string; username: string; photo?: string }
): Promise<string> => {
    try {
        let imageUrl: string | undefined = undefined;
        if (postData.image && postData.image.startsWith('data:image')) {
            imageUrl = await uploadImageToStorageService(postData.image, `webboardImages/${authorInfo.userId}/${Date.now()}`);
        }

        const postsCollRef = collection(db, 'webboardPosts');
        const docRef = await addDoc(postsCollRef, {
            ...postData,
            image: imageUrl, // Store URL or undefined
            userId: authorInfo.userId,
            username: authorInfo.username,
            authorPhoto: authorInfo.photo || null,
            likes: [],
            isPinned: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        logFirebaseError("addWebboardPostService", error);
        throw error;
    }
};

export const updateWebboardPostService = async (
    postId: string,
    postData: { title: string; body: string; category: WebboardCategory; image?: string },
    authorPhoto?: string // Not typically updated here, but if service expects it
): Promise<void> => {
    try {
        const postDocRef = doc(db, 'webboardPosts', postId);
        const updatePayload: any = {
            title: postData.title,
            body: postData.body,
            category: postData.category,
            updatedAt: serverTimestamp(),
        };

        if (postData.hasOwnProperty('image')) { // Check if image field is explicitly part of update
            const oldPostDoc = await getDoc(postDocRef);
            const oldImageUrl = oldPostDoc.exists() ? oldPostDoc.data()?.image : null;

            if (postData.image && postData.image.startsWith('data:image')) { // New image uploaded
                if (oldImageUrl) await deleteImageFromStorageService(oldImageUrl);
                updatePayload.image = await uploadImageToStorageService(postData.image, `webboardImages/${auth.currentUser?.uid || 'unknown_user'}/${Date.now()}`);
            } else if (postData.image === undefined && oldImageUrl) { // Image explicitly removed
                await deleteImageFromStorageService(oldImageUrl);
                updatePayload.image = null; // Or delete field: firebase.firestore.FieldValue.delete()
            } else if (postData.image && !postData.image.startsWith('data:image')) {
                // Image is an existing URL, no change needed unless it's different from oldImageUrl
                // This path implies "keep existing image if image field is a URL and same as before"
                // Or if it's a *new* URL, this logic isn't for uploading it.
            }
        }
        // If authorPhoto needs update: updatePayload.authorPhoto = authorPhoto;
        await updateDoc(postDocRef, updatePayload);
    } catch (error) {
        logFirebaseError("updateWebboardPostService", error);
        throw error;
    }
};

export const deleteWebboardPostService = async (postId: string): Promise<boolean> => {
  try {
    const postDocRef = doc(db, 'webboardPosts', postId);
    const postDocSnap = await getDoc(postDocRef);
    if (postDocSnap.exists() && postDocSnap.data().image) {
        await deleteImageFromStorageService(postDocSnap.data().image);
    }
    await deleteDoc(postDocRef);
    // Delete associated comments
    const commentsCollRef = collection(db, 'webboardComments');
    const q = query(commentsCollRef, where('postId', '==', postId));
    const commentsSnapshot = await getDocs(q);
    const batch = writeBatch(db);
    commentsSnapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return true;
  } catch (error) {
    logFirebaseError("deleteWebboardPostService", error);
    throw error;
  }
};

// --- Webboard Comments ---
export const addWebboardCommentService = async (
  postId: string, text: string, authorInfo: { userId: string; username: string; photo?: string }
): Promise<string> => {
  try {
    const commentsCollRef = collection(db, 'webboardComments');
    const docRef = await addDoc(commentsCollRef, {
      postId,
      text,
      userId: authorInfo.userId,
      username: authorInfo.username,
      authorPhoto: authorInfo.photo || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    logFirebaseError("addWebboardCommentService", error);
    throw error;
  }
};

export const updateWebboardCommentService = async (commentId: string, newText: string): Promise<void> => {
  try {
    const commentDocRef = doc(db, 'webboardComments', commentId);
    await updateDoc(commentDocRef, { text: newText, updatedAt: serverTimestamp() });
  } catch (error) {
    logFirebaseError("updateWebboardCommentService", error);
    throw error;
  }
};

export const deleteWebboardCommentService = async (commentId: string): Promise<boolean> => {
  try {
    const commentDocRef = doc(db, 'webboardComments', commentId);
    await deleteDoc(commentDocRef);
    return true;
  } catch (error) {
    logFirebaseError("deleteWebboardCommentService", error);
    throw error;
  }
};

// --- Toggles & Admin ---
const toggleItemFlagService = async (collectionName: string, itemId: string, flagName: string, currentValue?: boolean): Promise<boolean> => {
  try {
    const itemDocRef = doc(db, collectionName, itemId);
    let newValue = !currentValue;
    if (currentValue === undefined) { // If current value is not passed, fetch it
        const docSnap = await getDoc(itemDocRef);
        if (!docSnap.exists()) throw new Error("Document not found to toggle flag.");
        newValue = !docSnap.data()?.[flagName];
    }
    await updateDoc(itemDocRef, { [flagName]: newValue, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    logFirebaseError(`toggle${flagName.charAt(0).toUpperCase() + flagName.slice(1)}Service for ${collectionName}`, error);
    throw error;
  }
};

export const toggleSuspiciousJobService = (jobId: string, currentValue?: boolean) => toggleItemFlagService('jobs', jobId, 'isSuspicious', currentValue);
export const togglePinnedJobService = (jobId: string, currentValue?: boolean) => toggleItemFlagService('jobs', jobId, 'isPinned', currentValue);
export const toggleHiredJobService = (jobId: string, currentValue?: boolean) => toggleItemFlagService('jobs', jobId, 'isHired', currentValue);

export const toggleSuspiciousHelperProfileService = (profileId: string, currentValue?: boolean) => toggleItemFlagService('helperProfiles', profileId, 'isSuspicious', currentValue);
export const togglePinnedHelperProfileService = (profileId: string, currentValue?: boolean) => toggleItemFlagService('helperProfiles', profileId, 'isPinned', currentValue);
export const toggleUnavailableHelperProfileService = (profileId: string, currentValue?: boolean) => toggleItemFlagService('helperProfiles', profileId, 'isUnavailable', currentValue);
export const toggleVerifiedExperienceService = (profileId: string, currentValue?: boolean) => toggleItemFlagService('helperProfiles', profileId, 'adminVerifiedExperience', currentValue);

export const togglePinWebboardPostService = (postId: string, currentValue?: boolean) => toggleItemFlagService('webboardPosts', postId, 'isPinned', currentValue);

export const toggleWebboardPostLikeService = async (postId: string, userId: string): Promise<void> => {
  try {
    const postDocRef = doc(db, 'webboardPosts', postId);
    const postSnap = await getDoc(postDocRef);
    if (!postSnap.exists()) throw new Error("Post not found");
    const likes = postSnap.data()?.likes || [];
    const userHasLiked = likes.includes(userId);
    await updateDoc(postDocRef, {
      likes: userHasLiked ? arrayRemove(userId) : arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logFirebaseError("toggleWebboardPostLikeService", error);
    throw error;
  }
};

export const setUserRoleService = async (userIdToUpdate: string, newRole: UserRole): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userIdToUpdate);
    await updateDoc(userDocRef, { role: newRole, updatedAt: serverTimestamp() });
  } catch (error) {
    logFirebaseError("setUserRoleService", error);
    throw error;
  }
};

export const setSiteLockService = async (isLocked: boolean, adminUserId: string): Promise<void> => {
  try {
    const siteConfigDocRef = doc(db, 'config', 'siteStatus');
    await setDoc(siteConfigDocRef, {
      isSiteLocked: isLocked,
      updatedAt: serverTimestamp(),
      updatedBy: adminUserId,
    }, { merge: true });
  } catch (error) {
    logFirebaseError("setSiteLockService", error);
    throw error;
  }
};