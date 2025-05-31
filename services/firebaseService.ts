
// No direct imports from 'firebase/compat/auth' for functions, use 'auth' instance from '../firebase'
// Types can still be referenced via the main 'firebase' export from firebase.ts
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
  onSnapshot,
  deleteField,
  type Unsubscribe,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadString,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
} from 'firebase/storage';

import { auth, db, storage, firebase } from '../firebase'; // Import firebase for types
import type { User, UserRole, Job, HelperProfile, WebboardPost, WebboardComment, SiteConfig, WebboardCategory, Interaction } from '../types';
import { logFirebaseError } from '../firebase/logging';

// Helper type for FirebaseUser
type FirebaseUser = firebase.User;

// Helper function to handle dates (especially Firestore Timestamps)
const convertTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp && typeof timestamp.toDate === 'function') {
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
const uploadImageToStorageService = async (fileOrBase64: string | File, storagePath: string): Promise<string> => {
  const sRef = storageRef(storage, storagePath);
  try {
    if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:image')) {
      await uploadString(sRef, fileOrBase64, 'data_url');
    } else if (fileOrBase64 instanceof File) {
      await uploadBytesResumable(sRef, fileOrBase64);
    } else {
      throw new Error('Invalid image format for upload.');
    }
    return await getDownloadURL(sRef);
  } catch (error) {
    logFirebaseError(`uploadImageToStorageService (${storagePath})`, error);
    throw error;
  }
};

const deleteImageFromStorageService = async (imageUrl: string | undefined | null): Promise<void> => {
    if (!imageUrl || !imageUrl.startsWith('https://firebasestorage.googleapis.com/')) {
        return;
    }
    try {
        const imageRef = storageRef(storage, imageUrl);
        await deleteObject(imageRef);
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
    const result = await auth.createUserWithEmailAndPassword(userData.email, userData.password);
    const firebaseUser = result.user;
    
    if (!firebaseUser) { // Should not happen if createUserWithEmailAndPassword succeeds
        throw new Error("User creation failed, no user object returned.");
    }

    await firebaseUser.updateProfile({ displayName: userData.displayName });

    const newUserForDb: Omit<User, 'id' | 'userLevel' | 'profileComplete' | 'address' | 'photo'> & {createdAt: any, updatedAt: any} = {
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
      const usersQuery = query(collection(db, 'users'), where('username', '==', loginIdentifier));
      const usersSnapshot = await getDocs(usersQuery);
      if (usersSnapshot.empty) {
        throw new Error('ไม่พบชื่อผู้ใช้นี้');
      }
      const foundUserDoc = usersSnapshot.docs[0];
      emailToLogin = foundUserDoc.data().email;
       if (!emailToLogin) {
        throw new Error('ไม่พบอีเมลสำหรับชื่อผู้ใช้นี้');
      }
    }
    await auth.signInWithEmailAndPassword(emailToLogin, passwordAttempt);
    return getCurrentUserService(); 
  } catch (error) {
    logFirebaseError("signInWithEmailPasswordService", error);
    throw error;
  }
};

export const signOutUserService = async (): Promise<void> => {
  try {
    await auth.signOut();
  } catch (error) {
    logFirebaseError("signOutUserService", error);
    throw error;
  }
};

export const onAuthChangeService = (callback: (user: User | null) => void): Unsubscribe => {
  return auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
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
  mapFn: (doc: QueryDocumentSnapshot<DocumentData>) => T,
  defaultOrderByField: string = 'createdAt',
  defaultOrderByDirection: 'asc' | 'desc' = 'desc',
  additionalQueryConstraints: any[] = []
) => (callback: (data: T[]) => void): Unsubscribe => {
  const queryConstraints = [orderBy(defaultOrderByField, defaultOrderByDirection), ...additionalQueryConstraints];
  const q = query(collection(db, collectionName), ...queryConstraints);
  
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

export const subscribeToWebboardPostsService = createSubscriptionService<WebboardPost>('webboardPosts', d => ({
  id: d.id, ...d.data(), likes: d.data().likes || [], createdAt: convertTimestamp(d.data().createdAt), updatedAt: convertTimestamp(d.data().updatedAt)
} as WebboardPost), 'createdAt', 'desc', [orderBy('isPinned', 'desc')]); 

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
    if (profileData.displayName && profileData.displayName !== currentUserAuth.displayName) {
        authProfileUpdates.displayName = profileData.displayName;
    }
    if (newPhotoURL !== undefined && newPhotoURL !== currentUserAuth.photoURL) { 
        authProfileUpdates.photoURL = newPhotoURL; 
    }

    if (Object.keys(authProfileUpdates).length > 0) {
        await currentUserAuth.updateProfile(authProfileUpdates);
    }
    return true;
  } catch (error) {
    logFirebaseError("updateUserProfileService", error);
    throw error;
  }
};

// Jobs
export const addJobService = async (
  jobData: Omit<Job, 'id' | 'postedAt' | 'userId' | 'username' | 'ownerId' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'createdAt' | 'updatedAt'>,
  contactInfo: string
): Promise<string> => {
  const currentUserAuth = auth.currentUser;
  if (!currentUserAuth) throw new Error("User not authenticated for addJobService");
  try {
    const docRef = await addDoc(collection(db, 'jobs'), {
      ...jobData,
      userId: currentUserAuth.uid,
      username: currentUserAuth.displayName || currentUserAuth.email?.split('@')[0] || 'anonymous',
      ownerId: currentUserAuth.uid,
      contact: contactInfo,
      isSuspicious: false, isPinned: false, isHired: false,
      postedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) { logFirebaseError("addJobService", error); throw error; }
};

export const updateJobService = async (jobId: string, jobData: Partial<Omit<Job, 'id' | 'userId' | 'username' | 'ownerId' | 'createdAt' | 'postedAt' | 'contact' >>, contactInfo?: string): Promise<boolean> => {
  try {
    const dataToUpdate: any = { ...jobData, updatedAt: serverTimestamp() };
    if (contactInfo) dataToUpdate.contact = contactInfo; 
    await updateDoc(doc(db, 'jobs', jobId), dataToUpdate);
    return true;
  } catch (error) { logFirebaseError("updateJobService", error); throw error; }
};

export const deleteJobService = async (jobId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'jobs', jobId));
    return true;
  } catch (error) { logFirebaseError("deleteJobService", error); throw error; }
};

// Helper Profiles
export const addHelperProfileService = async (
    profileData: Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'username' | 'ownerId' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'createdAt' | 'updatedAt'>,
    currentUserDetails: { userId: string; username: string; contact: string; gender?: User['gender']; birthdate?: User['birthdate']; educationLevel?: User['educationLevel'] }
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'helperProfiles'), {
      ...profileData,
      userId: currentUserDetails.userId, username: currentUserDetails.username, ownerId: currentUserDetails.userId,
      contact: currentUserDetails.contact, gender: currentUserDetails.gender, birthdate: currentUserDetails.birthdate, educationLevel: currentUserDetails.educationLevel,
      isSuspicious: false, isPinned: false, isUnavailable: false, adminVerifiedExperience: false, interestedCount: 0,
      postedAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) { logFirebaseError("addHelperProfileService", error); throw error; }
};

export const updateHelperProfileService = async (profileId: string, profileData: Partial<Omit<HelperProfile, 'id' | 'userId' | 'username' | 'ownerId' | 'createdAt' | 'postedAt' | 'contact'>>, contactInfo?: string): Promise<boolean> => {
  try {
    const dataToUpdate: any = { ...profileData, updatedAt: serverTimestamp() };
    if (contactInfo) dataToUpdate.contact = contactInfo;
    await updateDoc(doc(db, 'helperProfiles', profileId), dataToUpdate);
    return true;
  } catch (error) { logFirebaseError("updateHelperProfileService", error); throw error; }
};

export const deleteHelperProfileService = async (profileId: string): Promise<boolean> => {
 try {
    await deleteDoc(doc(db, 'helperProfiles', profileId));
    return true;
  } catch (error) { logFirebaseError("deleteHelperProfileService", error); throw error; }
};

// Webboard Posts
export const addWebboardPostService = async (
  postData: { title: string; body: string; category: WebboardCategory; image?: string }, 
  currentUserDetails: { userId: string; username: string; photo?: string; }
): Promise<string> => {
  try {
    let imageUrlInFirestore: string | undefined = undefined;
    if (postData.image) { 
        const imagePathId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        imageUrlInFirestore = await uploadImageToStorageService(postData.image, `webboardImages/${currentUserDetails.userId}/${imagePathId}`);
    }

    const docRef = await addDoc(collection(db, 'webboardPosts'), {
      title: postData.title, body: postData.body, category: postData.category,
      image: imageUrlInFirestore, 
      userId: currentUserDetails.userId, username: currentUserDetails.username, ownerId: currentUserDetails.userId,
      authorPhoto: currentUserDetails.photo || '', likes: [], isPinned: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) { logFirebaseError("addWebboardPostService", error); throw error; }
};

export const updateWebboardPostService = async (
  postId: string,
  postData: Partial<Omit<WebboardPost, 'id' | 'userId' | 'username' | 'ownerId' | 'createdAt' | 'likes' | 'authorPhoto'>>, 
  authorPhoto?: string 
): Promise<boolean> => {
  try {
    const dataToUpdate: any = { ...postData, updatedAt: serverTimestamp() };
    
    const postDocRef = doc(db, 'webboardPosts', postId);
    const oldPostSnap = await getDoc(postDocRef);
    const oldImageURL = oldPostSnap.exists() ? oldPostSnap.data()?.image : null;

    if (postData.image && typeof postData.image === 'string' && postData.image.startsWith('data:image')) { 
      if (oldImageURL && typeof oldImageURL === 'string') {
        await deleteImageFromStorageService(oldImageURL);
      }
      dataToUpdate.image = await uploadImageToStorageService(postData.image, `webboardImages/${postId}/${Date.now()}`);
    } else if (postData.hasOwnProperty('image') && postData.image === undefined) { 
      if (oldImageURL && typeof oldImageURL === 'string') {
        await deleteImageFromStorageService(oldImageURL);
      }
      dataToUpdate.image = deleteField(); 
    }
    
    await updateDoc(postDocRef, dataToUpdate);
    return true;
  } catch (error) { logFirebaseError("updateWebboardPostService", error); throw error; }
};

export const deleteWebboardPostService = async (postId: string): Promise<boolean> => {
  try {
    const postDocRef = doc(db, 'webboardPosts', postId);
    const postSnap = await getDoc(postDocRef);
    if (postSnap.exists()) {
        const postImageURL = postSnap.data()?.image;
        if (postImageURL && typeof postImageURL === 'string') {
            await deleteImageFromStorageService(postImageURL);
        }
    }

    const commentsQuery = query(collection(db, 'webboardComments'), where('postId', '==', postId));
    const commentsSnapshot = await getDocs(commentsQuery);
    const batch = writeBatch(db);
    commentsSnapshot.docs.forEach(commentDoc => batch.delete(commentDoc.ref));
    batch.delete(postDocRef);
    await batch.commit();
    return true;
  } catch (error) { logFirebaseError("deleteWebboardPostService", error); throw error; }
};

// Webboard Comments
export const addWebboardCommentService = async (
    postId: string, text: string,
    currentUserDetails: { userId: string; username: string; photo?: string; }
): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, 'webboardComments'), {
            postId, text, userId: currentUserDetails.userId, username: currentUserDetails.username, ownerId: currentUserDetails.userId,
            authorPhoto: currentUserDetails.photo || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) { logFirebaseError("addWebboardCommentService", error); throw error; }
};

export const updateWebboardCommentService = async (commentId: string, newText: string): Promise<boolean> => {
    try {
        await updateDoc(doc(db, 'webboardComments', commentId), { text: newText, updatedAt: serverTimestamp() });
        return true;
    } catch (error) { logFirebaseError("updateWebboardCommentService", error); throw error; }
};

export const deleteWebboardCommentService = async (commentId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, 'webboardComments', commentId));
        return true;
    } catch (error) { logFirebaseError("deleteWebboardCommentService", error); throw error; }
};

// Toggle Services
export const toggleWebboardPostLikeService = async (postId: string, userId: string): Promise<boolean> => {
    try {
        const postRef = doc(db, 'webboardPosts', postId);
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) throw new Error("Post not found");
        const postData = postSnap.data() as WebboardPost;
        const alreadyLiked = postData.likes.includes(userId);
        await updateDoc(postRef, { likes: alreadyLiked ? arrayRemove(userId) : arrayUnion(userId), updatedAt: serverTimestamp() });
        return true;
    } catch (error) { logFirebaseError("toggleWebboardPostLikeService", error); throw error; }
};

const toggleFirestoreFlagService = async (collectionName: string, docId: string, fieldName: string, currentValue?: boolean): Promise<boolean> => {
  try {
    const docRef = doc(db, collectionName, docId);
    let newValue;
    if (currentValue === undefined) { 
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error(`Document ${docId} not found in ${collectionName} for toggling flag ${fieldName}`);
        newValue = !docSnap.data()?.[fieldName];
    } else {
        newValue = !currentValue;
    }
    await updateDoc(docRef, { [fieldName]: newValue, updatedAt: serverTimestamp() });
    return true;
  } catch (error) { logFirebaseError(`toggleFirestoreFlagService (${collectionName}/${docId}.${fieldName})`, error); throw error; }
};

export const togglePinWebboardPostService = (postId: string, currentPinnedStatus?: boolean) => toggleFirestoreFlagService('webboardPosts', postId, 'isPinned', currentPinnedStatus);
export const togglePinnedJobService = (jobId: string, currentPinnedStatus?: boolean) => toggleFirestoreFlagService('jobs', jobId, 'isPinned', currentPinnedStatus);
export const toggleHiredJobService = (jobId: string, currentHiredStatus?: boolean) => toggleFirestoreFlagService('jobs', jobId, 'isHired', currentHiredStatus);
export const toggleSuspiciousJobService = (jobId: string, currentSuspiciousStatus?: boolean) => toggleFirestoreFlagService('jobs', jobId, 'isSuspicious', currentSuspiciousStatus);
export const togglePinnedHelperProfileService = (profileId: string, currentPinnedStatus?: boolean) => toggleFirestoreFlagService('helperProfiles', profileId, 'isPinned', currentPinnedStatus);
export const toggleUnavailableHelperProfileService = (profileId: string, currentUnavailableStatus?: boolean) => toggleFirestoreFlagService('helperProfiles', profileId, 'isUnavailable', currentUnavailableStatus);
export const toggleSuspiciousHelperProfileService = (profileId: string, currentSuspiciousStatus?: boolean) => toggleFirestoreFlagService('helperProfiles', profileId, 'isSuspicious', currentSuspiciousStatus);
export const toggleVerifiedExperienceService = (profileId: string, currentVerifiedStatus?: boolean) => toggleFirestoreFlagService('helperProfiles', profileId, 'adminVerifiedExperience', currentVerifiedStatus);

// Admin / Site Services
export const setUserRoleService = async (userId: string, newRole: UserRole): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'users', userId), { role: newRole, updatedAt: serverTimestamp() });
    return true;
  } catch (error) { logFirebaseError("setUserRoleService", error); throw error; }
};

export const setSiteLockService = async (isLocked: boolean, adminId: string): Promise<boolean> => {
  try {
    const siteStatusDocRef = doc(db, 'config', 'siteStatus');
    await setDoc(siteStatusDocRef, { 
        isSiteLocked: isLocked, 
        updatedAt: serverTimestamp(), 
        updatedBy: adminId 
    }, { merge: true });
    return true;
  } catch (error) { logFirebaseError("setSiteLockService", error); throw error; }
};

export const logHelperContactInteractionService = async (helperProfileId: string, employerUserId: string): Promise<boolean> => {
    if (!helperProfileId) {
        logFirebaseError("logHelperContactInteractionService", "Helper Profile ID is missing.");
        throw new Error("Helper Profile ID is missing.");
    }
    try {
        const helperProfileRef = doc(db, "helperProfiles", helperProfileId);
        const helperProfileSnap = await getDoc(helperProfileRef);

        if (!helperProfileSnap.exists()) {
            logFirebaseError("logHelperContactInteractionService", `HelperProfile with ID ${helperProfileId} not found.`);
            throw new Error(`HelperProfile with ID ${helperProfileId} not found.`);
        }
        const helperUserId = helperProfileSnap.data().userId; 

        const q = query(collection(db, "interactions"),
            where("helperProfileId", "==", helperProfileId), 
            where("employerUserId", "==", employerUserId),
            where("type", "==", "contact_helper")
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) { 
            const batch = writeBatch(db);
            const interactionRef = doc(collection(db, "interactions")); 
            batch.set(interactionRef, {
                helperUserId: helperUserId, 
                helperProfileId: helperProfileId, 
                employerUserId,
                timestamp: serverTimestamp(),
                createdAt: serverTimestamp(),
                type: 'contact_helper',
            });
            batch.update(helperProfileRef, { interestedCount: increment(1) });
            await batch.commit();
            return true;
        }
        return true; 
    } catch (error) { logFirebaseError("logHelperContactInteractionService", error); throw error; }
};
