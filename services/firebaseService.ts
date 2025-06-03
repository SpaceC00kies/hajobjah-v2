
import { app, auth, db, storage } from '../firebase'; // Import v9 initialized instances
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseAuthUser, // Renamed to avoid conflict with local User type
} from 'firebase/auth';
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
  QueryDocumentSnapshot,
  DocumentData,
  WhereFilterOp,
  OrderByDirection,
  Unsubscribe,
} from 'firebase/firestore';
import {
  ref,
  uploadString,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  StorageReference,
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
            const imageStorageRef: StorageReference = ref(storage, filePath);
            await deleteObject(imageStorageRef);
        }
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            // console.warn(`Image not found for deletion, but proceeding: ${imageUrl}`);
        } else {
            logFirebaseError(`deleteImageFromStorageService (${imageUrl})`, error);
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

    const newUserForDb: Omit<User, 'id' | 'userLevel' | 'profileComplete' | 'address' | 'photo' | 'createdAt' | 'updatedAt'> & {
        createdAt: any; 
        updatedAt: any; 
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
      createdAt: new Date().toISOString(), // Or use a server timestamp and re-fetch if precise time is critical
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
    // The onAuthChangeService will typically handle setting the current user state in App.tsx
    // If immediate user object is needed here, call getCurrentUserService.
    return getCurrentUserService(); // Assuming this is desired for immediate feedback
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
      const user = await getCurrentUserService(); // Fetch full user profile from Firestore
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
      const userData = userDocSnap.data() as Omit<User, 'id'>; // Type assertion, be mindful of missing fields
      return {
        id: firebaseUserAuth.uid,
        ...userData,
        // Ensure these are consistently sourced or updated
        photo: firebaseUserAuth.photoURL || userData.photo, // Prioritize Auth photoURL if available
        displayName: firebaseUserAuth.displayName || userData.displayName, // Prioritize Auth displayName
        userLevel: userData.userLevel || { name: '🐣 มือใหม่หัดโพสต์', minScore: 0, colorClass: 'bg-green-200 dark:bg-green-700/50', textColorClass: 'text-green-800 dark:text-green-200' },
        profileComplete: userData.profileComplete || false, // Calculate or ensure this is set
        createdAt: convertTimestamp(userData.createdAt), // Convert Firestore Timestamps
        updatedAt: convertTimestamp(userData.updatedAt),
      };
    }
    // This case means user exists in Auth but not in Firestore 'users' collection.
    // This could happen if Firestore document creation failed during signup.
    // Depending on app logic, might need to create the Firestore doc here or log out user.
    logFirebaseError("getCurrentUserService", `User ${firebaseUserAuth.uid} exists in Auth but not Firestore.`);
    return null; // Or handle as an error/incomplete profile
  } catch (error) {
    logFirebaseError("getCurrentUserService", error);
    return null;
  }
};

// --- Firestore Read Services (Real-time Subscriptions) ---
const createSubscriptionService = <T extends { id: string }>(
  collectionName: string,
  mapFn: (doc: QueryDocumentSnapshot<DocumentData>) => T, // Updated type
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
    logFirebaseError(`subscribeTo${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}Service`, error);
    callback([]); // Call with empty array on error
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
  timestamp: convertTimestamp(d.data().timestamp), // Ensure this is properly converted
  createdAt: convertTimestamp(d.data().createdAt),
  helperProfileId: d.data().helperProfileId // ensure this is captured
} as Interaction), 'timestamp', 'desc');

export const subscribeToSiteConfigService = (callback: (config: SiteConfig) => void): Unsubscribe => {
  const docRef = doc(db, 'config', 'siteStatus');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as DocumentData;
      callback({
        isSiteLocked: data.isSiteLocked || false,
        updatedAt: data.updatedAt ? convertTimestamp(data.updatedAt) : undefined,
        updatedBy: data.updatedBy,
      });
    } else {
      // Document doesn't exist, return default state
      callback({ isSiteLocked: false });
    }
  }, (error) => {
    logFirebaseError("subscribeToSiteConfigService", error);
    callback({ isSiteLocked: false }); // Fallback on error
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
    let newPhotoURL: string | null | undefined = profileData.photo; // Keep track of new URL for Auth update

    // Handle photo upload/deletion
    if (profileData.photo && typeof profileData.photo === 'string' && profileData.photo.startsWith('data:image')) {
      // New photo provided as base64
      const oldUserDoc = await getDoc(userDocRef);
      const oldPhotoURL = oldUserDoc.exists() ? oldUserDoc.data()?.photo : null;
      if (oldPhotoURL && typeof oldPhotoURL === 'string') {
          await deleteImageFromStorageService(oldPhotoURL);
      }
      newPhotoURL = await uploadImageToStorageService(profileData.photo, `profileImages/${userId}/${Date.now()}`);
      dataToUpdate.photo = newPhotoURL;
    } else if (profileData.hasOwnProperty('photo') && profileData.photo === undefined) {
      // Photo explicitly set to undefined, meaning delete it
      const oldUserDoc = await getDoc(userDocRef);
      const oldPhotoURL = oldUserDoc.exists() ? oldUserDoc.data()?.photo : null;
      if (oldPhotoURL && typeof oldPhotoURL === 'string') {
          await deleteImageFromStorageService(oldPhotoURL);
      }
      newPhotoURL = null; // Mark for Auth update
      dataToUpdate.photo = null; // Set to null in Firestore
    }
    // Else, if profileData.photo is an existing URL or not provided, Firestore photo field is not changed here unless explicitly part of profileData

    await updateDoc(userDocRef, dataToUpdate);

    // Update Firebase Auth profile if displayName or photoURL changed
    let authProfileUpdates: { displayName?: string | null; photoURL?: string | null } = {};
    if (profileData.hasOwnProperty('displayName') && profileData.displayName !== currentUserAuth.displayName) {
        authProfileUpdates.displayName = profileData.displayName;
    }
    // Only update auth photoURL if it was actually changed (new upload or deletion)
    if (newPhotoURL !== undefined && newPhotoURL !== currentUserAuth.photoURL) { // newPhotoURL could be a new URL string or null
        authProfileUpdates.photoURL = newPhotoURL;
    }
    
    if (Object.keys(authProfileUpdates).length > 0) {
        await updateProfile(currentUserAuth, authProfileUpdates);
    }
    return true;
  } catch (error) {
    logFirebaseError("updateUserProfileService", error);
    throw error; // Re-throw to allow App.tsx to handle UI feedback
  }
};


// --- Jobs ---
type JobFormData = Omit<Job, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export const addJobService = async (jobData: JobFormData, contactInfo: string): Promise<string> => {
  const currentUserAuth = auth.currentUser;
  if (!currentUserAuth) throw new Error("User not authenticated");
  try {
    const docRef = await addDoc(collection(db, 'jobs'), {
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
      contact: contactInfo, // Ensure contact is updated if it can change via user profile
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
    throw error; // Re-throw to allow UI to handle success/failure
  }
};

// --- Helper Profiles ---
type HelperProfileFormData = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt'>;

// Includes fields that are derived from the main User profile but stored denormalized on the HelperProfile
type HelperProfileUserServiceData = Pick<User, 'username' | 'gender' | 'birthdate' | 'educationLevel'> & {
    userId: string; // This should be currentUser.id
    contact: string; // This is the generated contact string from User's profile
};


export const addHelperProfileService = async (profileData: HelperProfileFormData, userServiceData: HelperProfileUserServiceData): Promise<string> => {
  const currentUserAuth = auth.currentUser;
  if (!currentUserAuth || currentUserAuth.uid !== userServiceData.userId) throw new Error("User not authenticated or mismatch");
  try {
    const docRef = await addDoc(collection(db, 'helperProfiles'), {
      ...profileData,
      userId: userServiceData.userId,
      username: userServiceData.username,
      contact: userServiceData.contact, // From user's main profile
      gender: userServiceData.gender, // From user's main profile
      birthdate: userServiceData.birthdate, // From user's main profile
      educationLevel: userServiceData.educationLevel, // From user's main profile
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
    // Note: gender, birthdate, educationLevel are part of the User profile and not directly updated here.
    // They are set at creation. If they need to be synced, it's a separate process or done at creation.
    await updateDoc(profileDocRef, {
      ...profileData, // This includes profileTitle, details, area, availability, etc.
      contact: contactInfo, // Update contact string if user's main profile changed
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
    // Fetch the helper profile to get the helper's actual userId
    const helperProfileDocRef = doc(db, 'helperProfiles', helperProfileId);
    const helperProfileDoc = await getDoc(helperProfileDocRef);
    if (!helperProfileDoc.exists()) throw new Error("Helper profile not found.");
    const helperUserId = helperProfileDoc.data()?.userId;
    if (!helperUserId) throw new Error("Helper profile has no user ID.");

    // Log the interaction
    await addDoc(collection(db, 'interactions'), {
      helperUserId: helperUserId, // The ID of the user being contacted
      helperProfileId: helperProfileId, // The ID of their profile post
      employerUserId: employerUserId, // The ID of the user initiating contact
      timestamp: serverTimestamp(),
      type: 'contact_helper', // Or other interaction types if added later
      createdAt: serverTimestamp(), // For general record keeping
    });
    // Increment interestedCount on the helper's profile
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
    authorInfo: { userId: string; username: string; photo?: string } // photo is from User.photo
): Promise<string> => {
    try {
        let imageUrl: string | undefined = undefined;
        if (postData.image && postData.image.startsWith('data:image')) { // Image is a new base64 upload
            imageUrl = await uploadImageToStorageService(postData.image, `webboardImages/${authorInfo.userId}/${Date.now()}`);
        }
        // If postData.image is an existing URL or undefined, it's handled by the spread or set to undefined

        const docRef = await addDoc(collection(db, 'webboardPosts'), {
            ...postData, // title, body, category
            image: imageUrl, // Uploaded image URL or undefined
            userId: authorInfo.userId,
            username: authorInfo.username,
            authorPhoto: authorInfo.photo || null, // Use author's profile photo
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
    postData: { title: string; body: string; category: WebboardCategory; image?: string }, // image can be new base64, existing URL, or undefined to delete
    authorPhoto?: string // This is current User.photo, might not be needed here unless authorPhoto on post needs update
): Promise<void> => {
    try {
        const postDocRef = doc(db, 'webboardPosts', postId);
        const updatePayload: any = {
            title: postData.title,
            body: postData.body,
            category: postData.category,
            updatedAt: serverTimestamp(),
        };

        // Handle image update/deletion
        if (postData.hasOwnProperty('image')) { // Check if 'image' key is present in postData
            const oldPostDoc = await getDoc(postDocRef);
            const oldImageUrl = oldPostDoc.exists() ? oldPostDoc.data()?.image : null;

            if (postData.image && postData.image.startsWith('data:image')) { // New base64 image
                if (oldImageUrl) await deleteImageFromStorageService(oldImageUrl);
                updatePayload.image = await uploadImageToStorageService(postData.image, `webboardImages/${auth.currentUser?.uid || 'unknown_user'}/${Date.now()}`);
            } else if (postData.image === undefined && oldImageUrl) { // Undefined means delete existing image
                await deleteImageFromStorageService(oldImageUrl);
                updatePayload.image = null; // Or delete field: FieldValue.delete()
            }
            // If postData.image is an existing URL (string not starting with data:), we assume it's unchanged.
        }
        // If authorPhoto needs to be updated based on current user profile, add it to updatePayload here.
        // e.g., if (authorPhoto !== undefined) updatePayload.authorPhoto = authorPhoto;

        await updateDoc(postDocRef, updatePayload);
    } catch (error) {
        logFirebaseError("updateWebboardPostService", error);
        throw error;
    }
};

export const deleteWebboardPostService = async (postId: string): Promise<boolean> => {
  try {
    // Delete the image from storage if it exists
    const postDocRef = doc(db, 'webboardPosts', postId);
    const postDocSnap = await getDoc(postDocRef);
    if (postDocSnap.exists() && postDocSnap.data().image) {
        await deleteImageFromStorageService(postDocSnap.data().image);
    }
    // Delete the post document
    await deleteDoc(postDocRef);

    // Delete all comments associated with the post
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
    const docRef = await addDoc(collection(db, 'webboardComments'), {
      postId,
      text,
      userId: authorInfo.userId,
      username: authorInfo.username,
      authorPhoto: authorInfo.photo || null, // User's profile photo
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
    let newValue = !currentValue; // Default toggle logic

    // If currentValue is not provided, fetch from DB to ensure correct toggle
    if (currentValue === undefined) {
        const docSnap = await getDoc(itemDocRef);
        if (!docSnap.exists()) throw new Error("Document not found to toggle flag.");
        newValue = !docSnap.data()?.[flagName];
    }
    
    await updateDoc(itemDocRef, { [flagName]: newValue, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    logFirebaseError(`toggle${flagName.charAt(0).toUpperCase() + flagName.slice(1)}Service for ${collectionName}`, error);
    throw error; // Re-throw for UI handling
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
    // To toggle atomically, it's better to fetch the document and then update.
    // However, Firestore transactions or batched writes might be more robust for complex scenarios.
    // For a simple like, arrayUnion/arrayRemove is atomic on its own.
    const postSnap = await getDoc(postDocRef);
    if (!postSnap.exists()) throw new Error("Post not found");

    const likes = postSnap.data()?.likes || [];
    const userHasLiked = likes.includes(userId);

    await updateDoc(postDocRef, {
      likes: userHasLiked ? arrayRemove(userId) : arrayUnion(userId),
      updatedAt: serverTimestamp(), // Keep track of update
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
    }, { merge: true }); // Use merge to avoid overwriting other config fields if any
  } catch (error) {
    logFirebaseError("setSiteLockService", error);
    throw error;
  }
};
