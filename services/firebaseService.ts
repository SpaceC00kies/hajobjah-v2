
import { app, auth, db, storage } from '../firebase'; // Import v9 initialized instances
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'; // Value imports
import type { User as FirebaseAuthUser } from 'firebase/auth'; // Type import

import {
  doc,
  collection,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayRemove,
  arrayUnion,
  Timestamp,
  writeBatch,
  type QueryDocumentSnapshot,
  type DocumentData,
  type WhereFilterOp,
  type OrderByDirection,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  ref,
  uploadString,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type StorageReference,
} from 'firebase/storage';

import type { User, UserRole, Job, HelperProfile, WebboardPost, WebboardComment, SiteConfig, WebboardCategory, Interaction, GenderOption, HelperEducationLevelOption } from '../types';
import { logFirebaseError } from '../firebase/logging';

// Helper type for Firebase Auth User from v9
type FirebaseUser = FirebaseAuthUser;

// Helper function to parse storage path from HTTPS URL
const getPathFromHttpUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'firebasestorage.googleapis.com' || urlObj.hostname.endsWith('.appspot.com')) {
      const pathSegments = urlObj.pathname.split('/o/');
      if (pathSegments.length > 1) {
        const encodedPath = pathSegments[1].split('?')[0];
        return decodeURIComponent(encodedPath);
      } else {
        const pathParts = urlObj.pathname.substring(1).split('/');
        if (pathParts.length > 1) {
          return decodeURIComponent(pathParts.slice(1).join('/'));
        }
      }
    }
  } catch (e) { logFirebaseError("getPathFromHttpUrl", e); }
  return null;
};


// Helper function to handle dates (especially Firestore Timestamps)
const convertTimestamp = (timestampInput: any): string => {
  if (!timestampInput) return new Date().toISOString();
  if (timestampInput instanceof Timestamp) {
    return timestampInput.toDate().toISOString();
  }
  if (timestampInput && typeof timestampInput.toDate === 'function') { // For older compat timestamps if any sneak in
    return timestampInput.toDate().toISOString();
  }
  if (typeof timestampInput === 'string') {
    try {
      const parsedDate = new Date(timestampInput);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString();
      }
      return timestampInput; // Return as is if parsing fails but it's a string
    } catch (e) {
      return timestampInput; // Return original string on error
    }
  }
  // For numbers or other direct Date constructor inputs
  try {
    return new Date(timestampInput).toISOString();
  } catch (e) {
    // Fallback if everything else fails
    return new Date().toISOString();
  }
};

// --- Image Upload Helper ---
const uploadImageToStorageService = async (fileOrBase64: string | File, path: string): Promise<string> => {
  const sRef: StorageReference = ref(storage, path);
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
    logFirebaseError(\`uploadImageToStorageService (\${path})\`, error);
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
            const imageStorageRef: StorageReference = ref(storage, filePath);
            await deleteObject(imageStorageRef);
        }
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            // console.warn(\`Image not found for deletion, but proceeding: \${imageUrl}\`);
        } else {
            logFirebaseError(\`deleteImageFromStorageService (\${imageUrl})\`, error);
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

    await updateProfile(firebaseUser, { displayName: userData.displayName });

    const newUserForDb = {
        displayName: userData.displayName,
        username: userData.username,
        email: firebaseUser.email!,
        role: userData.role,
        mobile: userData.mobile,
        lineId: userData.lineId || null,
        facebook: userData.facebook || null,
        gender: userData.gender || null,
        birthdate: userData.birthdate || null,
        educationLevel: userData.educationLevel || null,
        photo: null, // Initially no photo
        address: null, // Initially no address
        favoriteMusic: userData.favoriteMusic || null,
        favoriteBook: userData.favoriteBook || null,
        favoriteMovie: userData.favoriteMovie || null,
        hobbies: userData.hobbies || null,
        favoriteFood: userData.favoriteFood || null,
        dislikedThing: userData.dislikedThing || null,
        introSentence: userData.introSentence || null,
        isMuted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userDocRef, newUserForDb);

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
      photo: newUserForDb.photo,
      address: newUserForDb.address,
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
        photo: firebaseUserAuth.photoURL || userData.photo || null,
        displayName: firebaseUserAuth.displayName || userData.displayName,
        userLevel: userData.userLevel || { name: '🐣 มือใหม่หัดโพสต์', minScore: 0, colorClass: 'bg-green-200 dark:bg-green-700/50', textColorClass: 'text-green-800 dark:text-green-200' },
        profileComplete: userData.profileComplete || false,
        createdAt: convertTimestamp(userData.createdAt),
        updatedAt: convertTimestamp(userData.updatedAt),
      };
    }
    logFirebaseError("getCurrentUserService", \`User \${firebaseUserAuth.uid} exists in Auth but not Firestore.\`);
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
  defaultOrderByDirection: OrderByDirection = 'desc',
  additionalQueryConstraints: { field: string, op: WhereFilterOp, value: any }[] = []
) => (callback: (data: T[]) => void): Unsubscribe => {
  const collRef = collection(db, collectionName);
  let q = query(collRef, orderBy(defaultOrderByField, defaultOrderByDirection));

  additionalQueryConstraints.forEach(constraint => {
    q = query(q, where(constraint.field, constraint.op, constraint.value));
  });
  
  return onSnapshot(q, (snapshot) => {
    const dataList = snapshot.docs.map(d => mapFn(d));
    callback(dataList);
  }, (error) => {
    logFirebaseError(\`subscribeTo\${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}Service\`, error);
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
    logFirebaseError(\`subscribeToWebboardPostsService\`, error);
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
  helperProfileId: d.data().helperProfileId || null 
} as Interaction), 'timestamp', 'desc');

export const subscribeToSiteConfigService = (callback: (config: SiteConfig) => void): Unsubscribe => {
  const docRef = doc(db, 'config', 'siteStatus');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as DocumentData;
      callback({
        isSiteLocked: data.isSiteLocked || false,
        updatedAt: data.updatedAt ? convertTimestamp(data.updatedAt) : undefined,
        updatedBy: data.updatedBy || null,
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
    const dataToUpdate: { [key: string]: any } = { updatedAt: serverTimestamp() };
    
    let newPhotoURL: string | null | undefined = profileData.photo;

    // Handle explicit photo update logic first
    if (profileData.photo && typeof profileData.photo === 'string' && profileData.photo.startsWith('data:image')) {
      const oldUserDoc = await getDoc(userDocRef);
      const oldPhotoURL = oldUserDoc.exists() ? oldUserDoc.data()?.photo : null;
      if (oldPhotoURL && typeof oldPhotoURL === 'string') {
          await deleteImageFromStorageService(oldPhotoURL);
      }
      newPhotoURL = await uploadImageToStorageService(profileData.photo, \`profileImages/\${userId}/\${Date.now()}\`);
      dataToUpdate.photo = newPhotoURL;
    } else if (profileData.hasOwnProperty('photo') && profileData.photo === undefined) {
      const oldUserDoc = await getDoc(userDocRef);
      const oldPhotoURL = oldUserDoc.exists() ? oldUserDoc.data()?.photo : null;
      if (oldPhotoURL && typeof oldPhotoURL === 'string') {
          await deleteImageFromStorageService(oldPhotoURL);
      }
      newPhotoURL = null;
      dataToUpdate.photo = null;
    } else if (profileData.hasOwnProperty('photo') && profileData.photo !== undefined) {
      // If photo is provided but not base64 (i.e. it's an existing URL string or null)
      dataToUpdate.photo = profileData.photo; 
    }


    const fieldsToProcess: Array<keyof typeof profileData> = [
        'displayName', 'mobile', 'lineId', 'facebook', 'gender', 'birthdate', 
        'educationLevel', 'address', 'favoriteMusic', 'favoriteBook', 
        'favoriteMovie', 'hobbies', 'favoriteFood', 'dislikedThing', 'introSentence'
    ];

    fieldsToProcess.forEach(key => {
        if (profileData.hasOwnProperty(key)) {
            const value = profileData[key];
            dataToUpdate[key] = value === undefined ? null : value;
        }
    });
    
    await updateDoc(userDocRef, dataToUpdate);

    let authProfileUpdates: { displayName?: string | null; photoURL?: string | null } = {};
    if (profileData.hasOwnProperty('displayName') && (profileData.displayName || null) !== currentUserAuth.displayName) {
        authProfileUpdates.displayName = profileData.displayName || null;
    }
    
    // This condition ensures photoURL in Auth is updated only if 'newPhotoURL' was determined (new upload or deletion)
    // and it's different from the current Auth photoURL.
    if (newPhotoURL !== undefined && newPhotoURL !== currentUserAuth.photoURL) { 
        authProfileUpdates.photoURL = newPhotoURL; // newPhotoURL is string or null
    }
    
    if (Object.keys(authProfileUpdates).length > 0) {
        await updateProfile(currentUserAuth, authProfileUpdates);
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
    const jobPayload = {
      title: jobData.title,
      location: jobData.location,
      dateTime: jobData.dateTime, // Assumed to be string from JobFormData
      payment: jobData.payment,
      description: jobData.description,
      desiredAgeStart: jobData.desiredAgeStart === undefined ? null : jobData.desiredAgeStart,
      desiredAgeEnd: jobData.desiredAgeEnd === undefined ? null : jobData.desiredAgeEnd,
      preferredGender: jobData.preferredGender || null,
      desiredEducationLevel: jobData.desiredEducationLevel || null,
      dateNeededFrom: jobData.dateNeededFrom || null,
      dateNeededTo: jobData.dateNeededTo || null,
      timeNeededStart: jobData.timeNeededStart || null,
      timeNeededEnd: jobData.timeNeededEnd || null,
      userId: currentUserAuth.uid,
      username: currentUserAuth.displayName || 'Anonymous',
      contact: contactInfo,
      isSuspicious: false,
      isPinned: false,
      isHired: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'jobs'), jobPayload);
    return docRef.id;
  } catch (error) {
    logFirebaseError("addJobService", error);
    throw error;
  }
};

export const updateJobService = async (jobId: string, jobData: JobFormData, contactInfo: string): Promise<void> => {
  try {
    const jobDocRef = doc(db, 'jobs', jobId);
    const jobUpdatePayload = {
      title: jobData.title,
      location: jobData.location,
      dateTime: jobData.dateTime,
      payment: jobData.payment,
      description: jobData.description,
      desiredAgeStart: jobData.desiredAgeStart === undefined ? null : jobData.desiredAgeStart,
      desiredAgeEnd: jobData.desiredAgeEnd === undefined ? null : jobData.desiredAgeEnd,
      preferredGender: jobData.preferredGender || null,
      desiredEducationLevel: jobData.desiredEducationLevel || null,
      dateNeededFrom: jobData.dateNeededFrom || null,
      dateNeededTo: jobData.dateNeededTo || null,
      timeNeededStart: jobData.timeNeededStart || null,
      timeNeededEnd: jobData.timeNeededEnd || null,
      contact: contactInfo,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(jobDocRef, jobUpdatePayload);
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
    userId: string;
    contact: string;
};

export const addHelperProfileService = async (profileData: HelperProfileFormData, userServiceData: HelperProfileUserServiceData): Promise<string> => {
  const currentUserAuth = auth.currentUser;
  if (!currentUserAuth || currentUserAuth.uid !== userServiceData.userId) throw new Error("User not authenticated or mismatch");
  try {
    const helperProfilePayload = {
      profileTitle: profileData.profileTitle,
      details: profileData.details,
      area: profileData.area,
      availability: profileData.availability, // Assumed string from HelperProfileFormData
      availabilityDateFrom: profileData.availabilityDateFrom || null,
      availabilityDateTo: profileData.availabilityDateTo || null,
      availabilityTimeDetails: profileData.availabilityTimeDetails || null,
      userId: userServiceData.userId,
      username: userServiceData.username,
      contact: userServiceData.contact,
      gender: userServiceData.gender || null, // User's gender can be optional
      birthdate: userServiceData.birthdate || null, // User's birthdate can be optional
      educationLevel: userServiceData.educationLevel || null, // User's education can be optional
      isSuspicious: false,
      isPinned: false,
      isUnavailable: false,
      adminVerifiedExperience: false,
      interestedCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'helperProfiles'), helperProfilePayload);
    return docRef.id;
  } catch (error) {
    logFirebaseError("addHelperProfileService", error);
    throw error;
  }
};

export const updateHelperProfileService = async (profileId: string, profileData: HelperProfileFormData, contactInfo: string): Promise<void> => {
  try {
    const profileDocRef = doc(db, 'helperProfiles', profileId);
    const helperProfileUpdatePayload = {
      profileTitle: profileData.profileTitle,
      details: profileData.details,
      area: profileData.area,
      availability: profileData.availability,
      availabilityDateFrom: profileData.availabilityDateFrom || null,
      availabilityDateTo: profileData.availabilityDateTo || null,
      availabilityTimeDetails: profileData.availabilityTimeDetails || null,
      contact: contactInfo,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(profileDocRef, helperProfileUpdatePayload);
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
    const helperProfileDocRef = doc(db, 'helperProfiles', helperProfileId);
    const helperProfileDoc = await getDoc(helperProfileDocRef);
    if (!helperProfileDoc.exists()) throw new Error("Helper profile not found.");
    const helperUserId = helperProfileDoc.data()?.userId;
    if (!helperUserId) throw new Error("Helper profile has no user ID.");

    await addDoc(collection(db, 'interactions'), {
      helperUserId: helperUserId,
      helperProfileId: helperProfileId || null, // Ensure helperProfileId is not undefined
      employerUserId: employerUserId,
      timestamp: serverTimestamp(),
      type: 'contact_helper',
      createdAt: serverTimestamp(),
    });
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
            imageUrl = await uploadImageToStorageService(postData.image, \`webboardImages/\${authorInfo.userId}/\${Date.now()}\`);
        }
        
        const webboardPostPayload = {
            title: postData.title,
            body: postData.body,
            category: postData.category,
            image: imageUrl || null,
            userId: authorInfo.userId,
            username: authorInfo.username,
            authorPhoto: authorInfo.photo || null,
            likes: [],
            isPinned: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, 'webboardPosts'), webboardPostPayload);
        return docRef.id;
    } catch (error) {
        logFirebaseError("addWebboardPostService", error);
        throw error;
    }
};

export const updateWebboardPostService = async (
    postId: string,
    postData: { title: string; body: string; category: WebboardCategory; image?: string },
    authorPhoto?: string 
): Promise<void> => {
    try {
        const postDocRef = doc(db, 'webboardPosts', postId);
        const updatePayload: { [key: string]: any } = { // Use a more flexible type for the payload
            title: postData.title,
            body: postData.body,
            category: postData.category,
            updatedAt: serverTimestamp(),
        };

        if (postData.hasOwnProperty('image')) {
            const oldPostDoc = await getDoc(postDocRef);
            const oldImageUrl = oldPostDoc.exists() ? oldPostDoc.data()?.image : null;

            if (postData.image && postData.image.startsWith('data:image')) {
                if (oldImageUrl) await deleteImageFromStorageService(oldImageUrl);
                updatePayload.image = await uploadImageToStorageService(postData.image, \`webboardImages/\${auth.currentUser?.uid || 'unknown_user'}/\${Date.now()}\`);
            } else if (postData.image === undefined && oldImageUrl) {
                await deleteImageFromStorageService(oldImageUrl);
                updatePayload.image = null;
            } else if (postData.image !== undefined) { // Existing URL or explicitly null
                updatePayload.image = postData.image;
            }
        }
        
        if (authorPhoto !== undefined) { // Handle explicit update of authorPhoto
             updatePayload.authorPhoto = authorPhoto || null;
        }

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
    const commentPayload = {
      postId,
      text,
      userId: authorInfo.userId,
      username: authorInfo.username,
      authorPhoto: authorInfo.photo || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'webboardComments'), commentPayload);
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

    if (currentValue === undefined) {
        const docSnap = await getDoc(itemDocRef);
        if (!docSnap.exists()) throw new Error("Document not found to toggle flag.");
        newValue = !docSnap.data()?.[flagName];
    }
    
    await updateDoc(itemDocRef, { [flagName]: newValue, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    logFirebaseError(\`toggle\${flagName.charAt(0).toUpperCase() + flagName.slice(1)}Service for \${collectionName}\`, error);
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
    const siteConfigPayload = {
      isSiteLocked: isLocked,
      updatedAt: serverTimestamp(),
      updatedBy: adminUserId || null, // Ensure adminUserId is not undefined
    };
    await setDoc(siteConfigDocRef, siteConfigPayload, { merge: true });
  } catch (error) {
    logFirebaseError("setSiteLockService", error);
    throw error;
  }
};