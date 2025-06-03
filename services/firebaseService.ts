
import { auth, db, storage, firebase, UserV8 } from '../firebase'; // Import v8 instances and firebase namespace
// Removed v9 imports like createUserWithEmailAndPassword, doc, collection, etc.

import type { User, UserRole, Job, HelperProfile, WebboardPost, WebboardComment, SiteConfig, WebboardCategory, Interaction, GenderOption, HelperEducationLevelOption } from '../types';
import { logFirebaseError } from '../firebase/logging';

// Helper type for Firebase Auth User from v8
type FirebaseUser = UserV8;
// Firestore types from v8 firebase namespace
type FirestoreQueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
type DocumentData = firebase.firestore.DocumentData;
type WhereFilterOp = firebase.firestore.WhereFilterOp;
type OrderByDirection = firebase.firestore.OrderByDirection;
type Timestamp = firebase.firestore.Timestamp; // Explicitly use Firestore's type
type Unsubscribe = () => void;


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
const convertTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp instanceof firebase.firestore.Timestamp) { // Use v8 Timestamp
    return timestamp.toDate().toISOString();
  }
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
const uploadImageToStorageService = async (fileOrBase64: string | File, path: string): Promise<string> => {
  const sRef = storage.ref(path); // v8 storage.ref()
  try {
    if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:image')) {
      await sRef.putString(fileOrBase64, 'data_url'); // v8 putString
    } else if (fileOrBase64 instanceof File) {
      await sRef.put(fileOrBase64); // v8 put
    } else {
      throw new Error('Invalid image format for upload.');
    }
    return await sRef.getDownloadURL(); // v8 getDownloadURL
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
            const imageStorageRef = storage.ref(filePath); // v8 storage.ref()
            await imageStorageRef.delete(); // v8 delete()
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
    const result = await auth.createUserWithEmailAndPassword(userData.email, userData.password); // v8 auth.createUserWithEmailAndPassword
    const firebaseUser = result.user;

    if (!firebaseUser) {
        throw new Error("User creation failed, no user object returned.");
    }

    await firebaseUser.updateProfile({ displayName: userData.displayName }); // v8 user.updateProfile

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
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), // v8 serverTimestamp
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // v8 serverTimestamp
    };

    await db.collection('users').doc(firebaseUser.uid).set(newUserForDb); // v8 db.collection.doc.set

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
      const usersCollRef = db.collection('users'); // v8 db.collection
      const q = usersCollRef.where('username', '==', loginIdentifier); // v8 query
      const usersSnapshot = await q.get(); // v8 get
      if (usersSnapshot.empty) {
        throw new Error('ไม่พบชื่อผู้ใช้นี้');
      }
      const foundUserDoc = usersSnapshot.docs[0];
      emailToLogin = foundUserDoc.data().email;
       if (!emailToLogin) {
        throw new Error('ไม่พบอีเมลสำหรับชื่อผู้ใช้นี้');
      }
    }
    await auth.signInWithEmailAndPassword(emailToLogin, passwordAttempt); // v8 auth.signInWithEmailAndPassword
    return getCurrentUserService();
  } catch (error) {
    logFirebaseError("signInWithEmailPasswordService", error);
    throw error;
  }
};

export const signOutUserService = async (): Promise<void> => {
  try {
    await auth.signOut(); // v8 auth.signOut
  } catch (error) {
    logFirebaseError("signOutUserService", error);
    throw error;
  }
};

export const onAuthChangeService = (callback: (user: User | null) => void): Unsubscribe => {
  return auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => { // v8 auth.onAuthStateChanged
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
    const userDocRef = db.collection('users').doc(firebaseUserAuth.uid); // v8
    const userDocSnap = await userDocRef.get(); // v8
    if (userDocSnap.exists) {
      const userData = userDocSnap.data() as Omit<User, 'id'>; // type assertion
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
  let queryRef: firebase.firestore.Query = db.collection(collectionName); // v8

  additionalQueryConstraints.forEach(constraint => {
    queryRef = queryRef.where(constraint.field, constraint.op, constraint.value);
  });

  queryRef = queryRef.orderBy(defaultOrderByField, defaultOrderByDirection);

  return queryRef.onSnapshot((snapshot) => { // v8 onSnapshot
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
  let queryRef: firebase.firestore.Query = db.collection('webboardPosts'); // v8
  queryRef = queryRef.orderBy('isPinned', 'desc').orderBy('createdAt', 'desc'); // v8

  return queryRef.onSnapshot((snapshot) => { // v8
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
  const docRef = db.collection('config').doc('siteStatus'); // v8
  return docRef.onSnapshot((docSnap) => { // v8
    if (docSnap.exists) {
      const data = docSnap.data() as DocumentData; // type assertion
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
    const userDocRef = db.collection('users').doc(userId); // v8
    const dataToUpdate: any = { ...profileData, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    let newPhotoURL: string | null | undefined = profileData.photo;

    if (profileData.photo && typeof profileData.photo === 'string' && profileData.photo.startsWith('data:image')) {
      const oldUserDoc = await userDocRef.get(); //v8
      const oldPhotoURL = oldUserDoc.exists ? (oldUserDoc.data() as DocumentData)?.photo : null; //v8
      if (oldPhotoURL && typeof oldPhotoURL === 'string') {
          await deleteImageFromStorageService(oldPhotoURL);
      }
      newPhotoURL = await uploadImageToStorageService(profileData.photo, `profileImages/${userId}/${Date.now()}`);
      dataToUpdate.photo = newPhotoURL;
    } else if (profileData.hasOwnProperty('photo') && profileData.photo === undefined) {
      const oldUserDoc = await userDocRef.get(); //v8
      const oldPhotoURL = oldUserDoc.exists ? (oldUserDoc.data() as DocumentData)?.photo : null; //v8
      if (oldPhotoURL && typeof oldPhotoURL === 'string') {
          await deleteImageFromStorageService(oldPhotoURL);
      }
      newPhotoURL = null;
      dataToUpdate.photo = null;
    }

    await userDocRef.update(dataToUpdate); // v8

    let authProfileUpdates: { displayName?: string | null; photoURL?: string | null } = {};
    if (profileData.hasOwnProperty('displayName') && profileData.displayName !== currentUserAuth.displayName) {
        authProfileUpdates.displayName = profileData.displayName;
    }
    if (newPhotoURL !== undefined && newPhotoURL !== currentUserAuth.photoURL) {
        authProfileUpdates.photoURL = newPhotoURL;
    }

    if (Object.keys(authProfileUpdates).length > 0) {
        await currentUserAuth.updateProfile(authProfileUpdates); // v8 user.updateProfile
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
    const jobsCollRef = db.collection('jobs'); // v8
    const docRef = await jobsCollRef.add({ // v8 add
      ...jobData,
      userId: currentUserAuth.uid,
      username: currentUserAuth.displayName || 'Anonymous',
      contact: contactInfo,
      isSuspicious: false,
      isPinned: false,
      isHired: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
    });
    return docRef.id;
  } catch (error) {
    logFirebaseError("addJobService", error);
    throw error;
  }
};

export const updateJobService = async (jobId: string, jobData: JobFormData, contactInfo: string): Promise<void> => {
  try {
    const jobDocRef = db.collection('jobs').doc(jobId); // v8
    await jobDocRef.update({ // v8 update
      ...jobData,
      contact: contactInfo,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
    });
  } catch (error) {
    logFirebaseError("updateJobService", error);
    throw error;
  }
};

export const deleteJobService = async (jobId: string): Promise<boolean> => {
  try {
    const jobDocRef = db.collection('jobs').doc(jobId); // v8
    await jobDocRef.delete(); // v8 delete
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
    const profilesCollRef = db.collection('helperProfiles'); // v8
    const docRef = await profilesCollRef.add({ // v8 add
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
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
    });
    return docRef.id;
  } catch (error) {
    logFirebaseError("addHelperProfileService", error);
    throw error;
  }
};

export const updateHelperProfileService = async (profileId: string, profileData: HelperProfileFormData, contactInfo: string): Promise<void> => {
  try {
    const profileDocRef = db.collection('helperProfiles').doc(profileId); // v8
    await profileDocRef.update({ // v8 update
      ...profileData,
      contact: contactInfo,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
    });
  } catch (error) {
    logFirebaseError("updateHelperProfileService", error);
    throw error;
  }
};

export const deleteHelperProfileService = async (profileId: string): Promise<boolean> => {
  try {
    const profileDocRef = db.collection('helperProfiles').doc(profileId); // v8
    await profileDocRef.delete(); // v8 delete
    return true;
  } catch (error) {
    logFirebaseError("deleteHelperProfileService", error);
    throw error;
  }
};

// --- Interactions ---
export const logHelperContactInteractionService = async (helperProfileId: string, employerUserId: string): Promise<void> => {
  try {
    const helperProfileDocRef = db.collection('helperProfiles').doc(helperProfileId); // v8
    const helperProfileDoc = await helperProfileDocRef.get(); // v8
    if (!helperProfileDoc.exists) throw new Error("Helper profile not found.");
    const helperUserId = (helperProfileDoc.data() as DocumentData)?.userId;
    if (!helperUserId) throw new Error("Helper profile has no user ID.");

    const interactionsCollRef = db.collection('interactions'); // v8
    await interactionsCollRef.add({ // v8 add
      helperUserId: helperUserId,
      helperProfileId: helperProfileId,
      employerUserId: employerUserId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(), // v8
      type: 'contact_helper',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
    });
    const profileRef = db.collection('helperProfiles').doc(helperProfileId); // v8
    await profileRef.update({ interestedCount: firebase.firestore.FieldValue.increment(1) }); // v8 increment
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

        const postsCollRef = db.collection('webboardPosts'); // v8
        const docRef = await postsCollRef.add({ // v8 add
            ...postData,
            image: imageUrl,
            userId: authorInfo.userId,
            username: authorInfo.username,
            authorPhoto: authorInfo.photo || null,
            likes: [],
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
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
    authorPhoto?: string
): Promise<void> => {
    try {
        const postDocRef = db.collection('webboardPosts').doc(postId); // v8
        const updatePayload: any = {
            title: postData.title,
            body: postData.body,
            category: postData.category,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
        };

        if (postData.hasOwnProperty('image')) {
            const oldPostDoc = await postDocRef.get(); // v8
            const oldImageUrl = oldPostDoc.exists ? (oldPostDoc.data() as DocumentData)?.image : null;

            if (postData.image && postData.image.startsWith('data:image')) {
                if (oldImageUrl) await deleteImageFromStorageService(oldImageUrl);
                updatePayload.image = await uploadImageToStorageService(postData.image, `webboardImages/${auth.currentUser?.uid || 'unknown_user'}/${Date.now()}`);
            } else if (postData.image === undefined && oldImageUrl) {
                await deleteImageFromStorageService(oldImageUrl);
                updatePayload.image = null; 
            }
        }
        await postDocRef.update(updatePayload); // v8 update
    } catch (error) {
        logFirebaseError("updateWebboardPostService", error);
        throw error;
    }
};

export const deleteWebboardPostService = async (postId: string): Promise<boolean> => {
  try {
    const postDocRef = db.collection('webboardPosts').doc(postId); // v8
    const postDocSnap = await postDocRef.get(); // v8
    if (postDocSnap.exists && (postDocSnap.data() as DocumentData).image) {
        await deleteImageFromStorageService((postDocSnap.data() as DocumentData).image);
    }
    await postDocRef.delete(); // v8 delete

    const commentsCollRef = db.collection('webboardComments'); // v8
    const q = commentsCollRef.where('postId', '==', postId); // v8 query
    const commentsSnapshot = await q.get(); // v8 get
    const batch = db.batch(); // v8 batch
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
    const commentsCollRef = db.collection('webboardComments'); // v8
    const docRef = await commentsCollRef.add({ // v8 add
      postId,
      text,
      userId: authorInfo.userId,
      username: authorInfo.username,
      authorPhoto: authorInfo.photo || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
    });
    return docRef.id;
  } catch (error) {
    logFirebaseError("addWebboardCommentService", error);
    throw error;
  }
};

export const updateWebboardCommentService = async (commentId: string, newText: string): Promise<void> => {
  try {
    const commentDocRef = db.collection('webboardComments').doc(commentId); // v8
    await commentDocRef.update({ text: newText, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); // v8
  } catch (error) {
    logFirebaseError("updateWebboardCommentService", error);
    throw error;
  }
};

export const deleteWebboardCommentService = async (commentId: string): Promise<boolean> => {
  try {
    const commentDocRef = db.collection('webboardComments').doc(commentId); // v8
    await commentDocRef.delete(); // v8
    return true;
  } catch (error) {
    logFirebaseError("deleteWebboardCommentService", error);
    throw error;
  }
};

// --- Toggles & Admin ---
const toggleItemFlagService = async (collectionName: string, itemId: string, flagName: string, currentValue?: boolean): Promise<boolean> => {
  try {
    const itemDocRef = db.collection(collectionName).doc(itemId); // v8
    let newValue = !currentValue;
    if (currentValue === undefined) {
        const docSnap = await itemDocRef.get(); // v8
        if (!docSnap.exists) throw new Error("Document not found to toggle flag.");
        newValue = !(docSnap.data() as DocumentData)?.[flagName];
    }
    await itemDocRef.update({ [flagName]: newValue, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); // v8
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
    const postDocRef = db.collection('webboardPosts').doc(postId); // v8
    const postSnap = await postDocRef.get(); // v8
    if (!postSnap.exists) throw new Error("Post not found");
    const likes = (postSnap.data() as DocumentData)?.likes || [];
    const userHasLiked = likes.includes(userId);
    await postDocRef.update({ // v8
      likes: userHasLiked ? firebase.firestore.FieldValue.arrayRemove(userId) : firebase.firestore.FieldValue.arrayUnion(userId), // v8
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
    });
  } catch (error) {
    logFirebaseError("toggleWebboardPostLikeService", error);
    throw error;
  }
};

export const setUserRoleService = async (userIdToUpdate: string, newRole: UserRole): Promise<void> => {
  try {
    const userDocRef = db.collection('users').doc(userIdToUpdate); // v8
    await userDocRef.update({ role: newRole, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); // v8
  } catch (error) {
    logFirebaseError("setUserRoleService", error);
    throw error;
  }
};

export const setSiteLockService = async (isLocked: boolean, adminUserId: string): Promise<void> => {
  try {
    const siteConfigDocRef = db.collection('config').doc('siteStatus'); // v8
    await siteConfigDocRef.set({ // v8 set with merge
      isSiteLocked: isLocked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // v8
      updatedBy: adminUserId,
    }, { merge: true });
  } catch (error) {
    logFirebaseError("setSiteLockService", error);
    throw error;
  }
};
