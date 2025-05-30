import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import { UserRole } from '../types';

// Helper function to handle dates
const convertTimestamp = (timestamp) => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  return timestamp;
};

// Get all users from database
export const getAllUsersService = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      userLevel: { name: '🐣 มือใหม่หัดโพสต์', minScore: 0, colorClass: 'bg-green-200', textColorClass: 'text-green-800' },
    }));
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// Get all jobs
export const getAllJobsService = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'jobs'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      postedAt: convertTimestamp(doc.data().postedAt),
    }));
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// Get all helper profiles
export const getAllHelperProfilesService = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'helperProfiles'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      postedAt: convertTimestamp(doc.data().postedAt),
    }));
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// Get all posts
export const getAllWebboardPostsService = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'webboardPosts'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      likes: doc.data().likes || [],
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt),
    }));
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// Get all comments
export const getAllWebboardCommentsService = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'webboardComments'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt),
    }));
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// Get site settings
export const getSiteConfigService = async () => {
  try {
    const docRef = await getDoc(doc(db, 'config', 'siteStatus'));
    if (docRef.exists()) {
      return docRef.data();
    }
    return { isSiteLocked: false };
  } catch (error) {
    console.error('Error:', error);
    return { isSiteLocked: false };
  }
};

// Get interactions
export const getAllInteractionsService = async () => {
  return [];
};

// Get clicked helpers
export const getUserClickedHelpersMapService = async () => {
  return {};
};

// Get current user
export const getCurrentUserService = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data(),
        userLevel: { name: '🐣 มือใหม่หัดโพสต์', minScore: 0, colorClass: 'bg-green-200', textColorClass: 'text-green-800' },
      };
    }
    return null;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};

// Listen for login/logout
export const onAuthChangeService = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const user = await getCurrentUserService();
      callback(user);
    } else {
      callback(null);
    }
  });
};

// Sign up new user
export const signUpWithEmailPasswordService = async (userData) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const newUser = {
      id: result.user.uid,
      email: userData.email,
      displayName: userData.displayName,
      username: userData.username,
      mobile: userData.mobile,
      lineId: userData.lineId,
      facebook: userData.facebook,
      gender: userData.gender,
      birthdate: userData.birthdate,
      educationLevel: userData.educationLevel,
      role: UserRole.Member,
      userLevel: { name: '🐣 มือใหม่หัดโพสต์', minScore: 0, colorClass: 'bg-green-200', textColorClass: 'text-green-800' },
      profileComplete: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', result.user.uid), newUser);
    return newUser;
  } catch (error) {
    throw error;
  }
};

// Sign in existing user
export const signInWithEmailPasswordService = async (loginIdentifier, password) => {
  try {
    let email = loginIdentifier;
    
    // Check if user entered username instead of email
    if (!loginIdentifier.includes('@')) {
      // This is a username, we need to find the email
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let foundEmail = null;
      
      usersSnapshot.docs.forEach(doc => {
        if (doc.data().username === loginIdentifier) {
          foundEmail = doc.data().email;
        }
      });
      
      if (!foundEmail) {
        throw new Error('ไม่พบชื่อผู้ใช้นี้');
      }
      
      email = foundEmail;
    }
    
    // Now login with the email
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = await getCurrentUserService();
    return user;
  } catch (error) {
    throw error;
  }
};

// Sign out
export const signOutUserService = async () => {
  await signOut(auth);
};

// These functions will be implemented later
export const setSiteLockService = async () => {};
export const updateUserProfileService = async (userId, profileData) => {
  try {
    // Update user in database
    await updateDoc(doc(db, 'users', userId), {
      ...profileData,
      updatedAt: new Date().toISOString()
    });
    
    // Get and return updated user
    const updatedDoc = await getDoc(doc(db, 'users', userId));
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      userLevel: { name: '🐣 มือใหม่หัดโพสต์', minScore: 0, colorClass: 'bg-green-200', textColorClass: 'text-green-800' },
    };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};
export const addJobService = async () => ({});
export const updateJobService = async () => ({});
export const addHelperProfileService = async () => ({});
export const updateHelperProfileService = async () => ({});
export const deleteJobService = async () => {};
export const deleteHelperProfileService = async () => {};
export const toggleSuspiciousJobService = async () => {};
export const togglePinnedJobService = async () => {};
export const toggleHiredJobService = async () => {};
export const toggleSuspiciousHelperProfileService = async () => {};
export const togglePinnedHelperProfileService = async () => {};
export const toggleUnavailableHelperProfileService = async () => {};
export const toggleVerifiedExperienceService = async () => {};
export const logHelperContactInteractionService = async () => {};
export const setUserRoleService = async () => {};
export const updateWebboardPostService = async () => ({});
export const addWebboardPostService = async (postData, currentUser) => {
  try {
    // 1. Create the base payload without the image field initially
    const newPostPayload: any = { 
      title: postData.title,
      body: postData.body,
      category: postData.category,
      userId: currentUser.id,
      username: currentUser.username,
      authorPhoto: currentUser.photo || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: [],
      isPinned: false,
    };

    // 2. Conditionally add the image field to newPostPayload
    //    This is the crucial part of the fix.
    if (postData.image !== undefined) {
      newPostPayload.image = postData.image;
    }

    // 3. Send newPostPayload to Firebase (which now only includes 'image' if it was defined)
    const docRef = await addDoc(collection(db, 'webboardPosts'), newPostPayload);
    
    // 4. Return the saved data, including the ID from Firebase
    return {
      id: docRef.id,
      ...newPostPayload // This will correctly reflect what was sent
    };
  } catch (error) {
    console.error('Error adding webboard post:', error); // For debugging in browser console
    throw error; // So App.tsx can catch it and show your "เกิดข้อผิดพลาด" alert
  }
};
export const updateWebboardCommentService = async () => ({});
export const deleteWebboardCommentService = async () => {};
export const toggleWebboardPostLikeService = async () => ({});
export const deleteWebboardPostService = async () => {};
export const togglePinnedWebboardPostService = async () => {};
export const updateUserClickedHelpersMapService = async () => {};
export const togglePinWebboardPostService = async () => {};