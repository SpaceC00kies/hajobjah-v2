

import { auth, db, storage } from '../firebase'; // Real Firebase init
import { logFirebaseError } from '../firebase/logging';
import type { User, Job, HelperProfile, WebboardPost, WebboardComment, SiteConfig, Interaction, UserRole as AppUserRole } from '../types';
import { WebboardCategory, DUMMY_WEBBOARD_POSTS, GenderOption, HelperEducationLevelOption, USER_LEVELS, UserLevelName, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD, View } from '../types';
import type { FirebaseHelperCurrentUser } from '../types/firebaseTypes';
import { isValidThaiMobileNumberUtil } from './somewhere';


export const USE_FIREBASE = true;
function calculateUserLevel(user: any): number {
  const postCount = user?.posts?.length || 0;
  if (postCount >= 10) return 3;
  if (postCount >= 5) return 2;
  return 1;
}

function appCheckProfileCompleteness(user: any): boolean {
  return Boolean(user?.name && user?.birthdate && user?.gender);
}
// --- MOCK DATA STORE ---  
const LS_PREFIX = 'chiangMaiQuick_';
const LS_USERS = `${LS_PREFIX}Users_service`;
const LS_CURRENT_USER_ID = `${LS_PREFIX}CurrentUserId_service`;
const LS_JOBS = `${LS_PREFIX}Jobs_service`;
const LS_HELPER_PROFILES = `${LS_PREFIX}Helpers_service`;
const LS_WEBBOARD_POSTS = `${LS_PREFIX}WebboardPosts_service`;
const LS_WEBBOARD_COMMENTS = `${LS_PREFIX}WebboardComments_service`;
const LS_SITE_CONFIG = `${LS_PREFIX}SiteConfig_service`;
const LS_INTERACTIONS = `${LS_PREFIX}Interactions_service`;
const LS_USER_CLICKED_HELPERS_MAP = `${LS_PREFIX}UserClickedHelpersMap_service`;


const generateContactStringForService = (user: User): string => {
    let contactParts: string[] = [];
    if (user.mobile) contactParts.push(`เบอร์โทร: ${user.mobile}`);
    if (user.lineId) contactParts.push(`LINE ID: ${user.lineId}`);
    if (user.facebook) contactParts.push(`Facebook: ${user.facebook}`);
    return contactParts.join('\n') || 'ไม่ระบุช่องทางติดต่อ';
};


let mockUsers: User[] = (() => {
    const saved = USE_FIREBASE ? null : localStorage.getItem(LS_USERS);
    if (saved) return JSON.parse(saved);
    
    const baseAdminUser: Omit<User, 'userLevel' | 'profileComplete'| 'hashedPassword'> = { /* ... as in App.tsx ... */ 
      id: 'admin-user-001', displayName: 'Admin User', username: ADMIN_USERNAME, email: ADMIN_EMAIL, role: 'Admin' as AppUserRole.Admin, mobile: '088-888-8888', lineId: 'admin_line_id', facebook: 'admin_facebook_profile', gender: GenderOption.NotSpecified, birthdate: '1990-01-01', educationLevel: HelperEducationLevelOption.Bachelor, photo: undefined, address: '1 Admin Road, Admin City', favoriteMusic: 'Classical', hobbies: 'Reading, Coding', isMuted: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const baseTestUser: Omit<User, 'userLevel' | 'profileComplete' | 'hashedPassword'> = { /* ... as in App.tsx ... */ 
      id: 'test-user-002', displayName: 'Test User', username: 'test', email: 'test@user.com', role: 'Member' as AppUserRole.Member, mobile: '081-234-5678', lineId: 'test_user_line', facebook: 'test_user_facebook', gender: GenderOption.Male, birthdate: '1995-05-15', educationLevel: HelperEducationLevelOption.HighSchool, photo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzdlOGM4YSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iOCIgcj0iNSIvPjxwYXRoIGQ9Ik0yMCAyMWE4IDggMCAwIDAtMTYgMCIvPjwvc3ZnPg==', address: '123 Mymoo Road, Chiang Mai', favoriteMovie: 'Inception', introSentence: 'I am a friendly and hardworking individual.', isMuted: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };

    const mockAdminUserWithPass = {...baseAdminUser, hashedPassword: ADMIN_PASSWORD};
    const mockTestUserWithPass = {...baseTestUser, hashedPassword: 'testpass'};

    return [mockAdminUserWithPass, mockTestUserWithPass].map(u => {
        const userWithLevel = { ...u, userLevel: calculateUserLevel(u.id, DUMMY_WEBBOARD_POSTS, []) };
        return { ...userWithLevel, profileComplete: appCheckProfileCompleteness(userWithLevel as User) };
    });
})();

let mockJobs: Job[] = (() => { const saved = USE_FIREBASE ? null : localStorage.getItem(LS_JOBS); return saved ? JSON.parse(saved) : []; })();
let mockHelperProfiles: HelperProfile[] = (() => { const saved = USE_FIREBASE ? null : localStorage.getItem(LS_HELPER_PROFILES); return saved ? JSON.parse(saved) : []; })();
let mockWebboardPosts: WebboardPost[] = (() => { const saved = USE_FIREBASE ? null : localStorage.getItem(LS_WEBBOARD_POSTS); return saved ? JSON.parse(saved) : DUMMY_WEBBOARD_POSTS; })();
let mockWebboardComments: WebboardComment[] = (() => { const saved = USE_FIREBASE ? null : localStorage.getItem(LS_WEBBOARD_COMMENTS); return saved ? JSON.parse(saved) : []; })();
let mockSiteConfig: SiteConfig = (() => { const saved = USE_FIREBASE ? null : localStorage.getItem(LS_SITE_CONFIG); return saved ? JSON.parse(saved) : { isSiteLocked: false }; })();
let mockInteractions: Interaction[] = (() => { const saved = USE_FIREBASE ? null : localStorage.getItem(LS_INTERACTIONS); return saved ? JSON.parse(saved) : []; })();
let mockUserClickedHelpersMap: Record<string, string[]> = (() => { const saved = USE_FIREBASE ? null : localStorage.getItem(LS_USER_CLICKED_HELPERS_MAP); return saved ? JSON.parse(saved) : {}; })();


const persistMockData = () => {
  if (USE_FIREBASE) return;
  localStorage.setItem(LS_USERS, JSON.stringify(mockUsers));
  localStorage.setItem(LS_JOBS, JSON.stringify(mockJobs));
  localStorage.setItem(LS_HELPER_PROFILES, JSON.stringify(mockHelperProfiles));
  localStorage.setItem(LS_WEBBOARD_POSTS, JSON.stringify(mockWebboardPosts));
  localStorage.setItem(LS_WEBBOARD_COMMENTS, JSON.stringify(mockWebboardComments));
  localStorage.setItem(LS_SITE_CONFIG, JSON.stringify(mockSiteConfig));
  localStorage.setItem(LS_INTERACTIONS, JSON.stringify(mockInteractions));
  localStorage.setItem(LS_USER_CLICKED_HELPERS_MAP, JSON.stringify(mockUserClickedHelpersMap));
};

const mockDelay = (ms: number = 30) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to convert Firestore Timestamps
const convertTimestamps = (data: any, fields: string[]): any => {
    if (!data) return data;
    const newData = { ...data };
    fields.forEach(field => {
        if (data[field] && typeof data[field].toDate === 'function') {
            newData[field] = data[field].toDate().toISOString();
        }
    });
    return newData;
};


// --- AUTH FUNCTIONS ---
export const signInWithEmailPasswordService = async (email, password): Promise<User | null> => {
  if (USE_FIREBASE) {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      if (userCredential.user) {
        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
        if (userDoc.exists) {
          const dbData = userDoc.data() as any; // Get raw data
          const userDataWithTimestamps = convertTimestamps(dbData, ['createdAt', 'updatedAt', 'birthdate']) as Omit<User, 'id'>;
          
          localStorage.setItem(LS_CURRENT_USER_ID, userCredential.user.uid);
          // Recalculate level for the fetched user
          const postsSnapshot = await db.collection('webboardPosts').get();
          const postsData = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebboardPost));
          const commentsSnapshot = await db.collection('webboardComments').get();
          const commentsData = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebboardComment));
      
          const finalUserData: User = {
              ...userDataWithTimestamps,
              id: userCredential.user.uid,
              userLevel: calculateUserLevel(userCredential.user.uid, postsData, commentsData),
              profileComplete: appCheckProfileCompleteness({ ...userDataWithTimestamps, id: userCredential.user.uid } as User)
          };
          return finalUserData;
        }
      }
      return null;
    } catch (error) {
      logFirebaseError("signInWithEmailPasswordService", error);
      throw error;
    }
  } else {
    await mockDelay();
    const user = mockUsers.find(u => (u.email.toLowerCase() === email.toLowerCase()) && u.hashedPassword === password);
    if (user) {
      console.log('[MockAuth] Signed in:', user.username);
      localStorage.setItem(LS_CURRENT_USER_ID, user.id);
      return user;
    } else {
      throw new Error("ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง");
    }
  }
};

export const signUpWithEmailPasswordService = async (userData: Omit<User, 'id' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'role' | 'isMuted'> & { password: string }): Promise<User | null> => {
  if (USE_FIREBASE) {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(userData.email, userData.password);
      if (userCredential.user) {
        const { password, ...userToSaveRest } = userData;
        // Data to be sent to Firestore, using FieldValue for timestamps
        const newUserForFirebase: Omit<User, 'id' | 'profileComplete' | 'userLevel' | 'createdAt' | 'updatedAt'> & { createdAt: firebase.firestore.FieldValue, updatedAt: firebase.firestore.FieldValue, role: AppUserRole } = {
          ...userToSaveRest,
          role: (userData.username.toLowerCase() === ADMIN_USERNAME || userData.email.toLowerCase() === ADMIN_EMAIL) && userData.password === ADMIN_PASSWORD ? 'Admin' as AppUserRole.Admin : 'Member' as AppUserRole.Member,
          isMuted: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection('users').doc(userCredential.user.uid).set(newUserForFirebase);
        
        // Construct the User object for app state with string timestamps
        const appUserTimestamp = new Date().toISOString();
        const tempUserForApp: User = {
            id: userCredential.user.uid,
            displayName: newUserForFirebase.displayName,
            username: newUserForFirebase.username,
            email: newUserForFirebase.email,
            role: newUserForFirebase.role,
            mobile: newUserForFirebase.mobile,
            lineId: newUserForFirebase.lineId,
            facebook: newUserForFirebase.facebook,
            gender: newUserForFirebase.gender,
            birthdate: newUserForFirebase.birthdate, // Ensure this is string | Date
            educationLevel: newUserForFirebase.educationLevel,
            photo: newUserForFirebase.photo,
            address: newUserForFirebase.address,
            favoriteMusic: newUserForFirebase.favoriteMusic,
            favoriteBook: newUserForFirebase.favoriteBook,
            favoriteMovie: newUserForFirebase.favoriteMovie,
            hobbies: newUserForFirebase.hobbies,
            favoriteFood: newUserForFirebase.favoriteFood,
            dislikedThing: newUserForFirebase.dislikedThing,
            introSentence: newUserForFirebase.introSentence,
            isMuted: newUserForFirebase.isMuted,
            createdAt: appUserTimestamp, 
            updatedAt: appUserTimestamp,
            userLevel: calculateUserLevel(userCredential.user.uid, [], []), // Initial
        };
        const finalUser: User = {
            ...tempUserForApp,
            profileComplete: appCheckProfileCompleteness(tempUserForApp),
        };

        localStorage.setItem(LS_CURRENT_USER_ID, userCredential.user.uid);
        return finalUser;
      }
      return null;
    } catch (error) {
      logFirebaseError("signUpWithEmailPasswordService", error);
      throw error;
    }
  } else {
    await mockDelay();
    if (mockUsers.find(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
      throw new Error('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว โปรดเลือกชื่ออื่น');
    }
    if (mockUsers.find(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('อีเมลนี้ถูกใช้ไปแล้ว โปรดใช้อีเมลอื่น');
    }

    const newUserId = `mock_user_${Date.now()}`;
    const newUserRole = (userData.username.toLowerCase() === ADMIN_USERNAME || userData.email.toLowerCase() === ADMIN_EMAIL) && userData.password === ADMIN_PASSWORD ? 'Admin' as AppUserRole.Admin : 'Member' as AppUserRole.Member;
    const newUserBase: Omit<User, 'profileComplete'| 'userLevel' | 'hashedPassword'> = {
        id: newUserId,
        displayName: userData.displayName,
        username: userData.username,
        email: userData.email,
        role: newUserRole,
        mobile: userData.mobile,
        lineId: userData.lineId || undefined,
        facebook: userData.facebook || undefined,
        gender: userData.gender,
        birthdate: userData.birthdate,
        educationLevel: userData.educationLevel,
        isMuted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    const newUser: User = {
        ...newUserBase,
        hashedPassword: userData.password,
        userLevel: calculateUserLevel(newUserId, mockWebboardPosts, mockWebboardComments),
        profileComplete: appCheckProfileCompleteness(newUserBase as User),
    };
    mockUsers.push(newUser);
    persistMockData();
    localStorage.setItem(LS_CURRENT_USER_ID, newUser.id);
    console.log('[MockAuth] Registered:', newUser.username);
    return newUser;
  }
};

export const signOutUserService = async (): Promise<void> => {
  if (USE_FIREBASE) {
    try {
      await auth.signOut();
      localStorage.removeItem(LS_CURRENT_USER_ID);
    } catch (error) {
      logFirebaseError("signOutUserService", error);
      throw error;
    }
  } else {
    await mockDelay();
    localStorage.removeItem(LS_CURRENT_USER_ID);
    console.log('[MockAuth] Signed out');
  }
};

export const onAuthChangeService = (callback: (user: User | null) => void): (() => void) => {
  if (USE_FIREBASE) {
    return auth.onAuthStateChanged(async firebaseUser => {
      if (firebaseUser) {
        const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
        if (userDoc.exists) {
            const dbData = userDoc.data() as any;
            const dbUserWithTimestamps: Omit<User, 'id'> = convertTimestamps(dbData, ['createdAt', 'updatedAt', 'birthdate']);
            
            const postsSnapshot = await db.collection('webboardPosts').get();
            const postsData = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebboardPost));
            const commentsSnapshot = await db.collection('webboardComments').get();
            const commentsData = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebboardComment));

            const fullUser: User = {
                ...dbUserWithTimestamps,
                id: firebaseUser.uid,
                userLevel: calculateUserLevel(firebaseUser.uid, postsData, commentsData),
                profileComplete: appCheckProfileCompleteness({...dbUserWithTimestamps, id:firebaseUser.uid} as User),
            };
            callback(fullUser);
        } else {
            callback(null); 
        }
      } else {
        callback(null);
      }
    });
  } else {
    const currentUserId = localStorage.getItem(LS_CURRENT_USER_ID);
    if (currentUserId) {
      const user = mockUsers.find(u => u.id === currentUserId);
      if(user) {
        user.userLevel = calculateUserLevel(user.id, mockWebboardPosts, mockWebboardComments);
        user.profileComplete = appCheckProfileCompleteness(user);
      }
      callback(user || null);
    } else {
      callback(null);
    }
    return () => { console.log('[MockAuth] onAuthChange listener removed (mock)'); };
  }
};

export const getCurrentUserService = async (): Promise<User | null> => {
    if (USE_FIREBASE) {
        const fbUser = auth.currentUser;
        if (fbUser) {
            const userDoc = await db.collection('users').doc(fbUser.uid).get();
            if (userDoc.exists) {
                const dbData = userDoc.data() as any;
                const dbUserWithTimestamps: Omit<User, 'id'> = convertTimestamps(dbData, ['createdAt', 'updatedAt', 'birthdate']);

                const postsSnapshot = await db.collection('webboardPosts').get();
                const postsData = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebboardPost));
                const commentsSnapshot = await db.collection('webboardComments').get();
                const commentsData = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebboardComment));
                
                const fullUser: User = {
                    ...dbUserWithTimestamps,
                    id: fbUser.uid,
                    userLevel: calculateUserLevel(fbUser.uid, postsData, commentsData),
                    profileComplete: appCheckProfileCompleteness({...dbUserWithTimestamps, id:fbUser.uid} as User),
                };
                return fullUser;
            }
        }
        return null;
    } else {
        await mockDelay();
        const currentUserId = localStorage.getItem(LS_CURRENT_USER_ID);
        if (currentUserId) {
            const user = mockUsers.find(u => u.id === currentUserId);
            if(user) { 
              user.userLevel = calculateUserLevel(user.id, mockWebboardPosts, mockWebboardComments);
              user.profileComplete = appCheckProfileCompleteness(user);
            }
            return user || null;
        }
        return null;
    }
};


// --- Generic Get All ---
const getAllMockItems = async <T>(mockDataSource: T[], storageKey: string): Promise<T[]> => {
    await mockDelay();
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(mockDataSource)) {
          mockDataSource.length = 0; 
          Array.prototype.push.apply(mockDataSource, parsed);
        }
        return parsed;
      } catch (e) { console.error(`Error parsing ${storageKey} from localStorage`, e); }
    }
    return [...mockDataSource]; 
  };

export const getAllUsersService = async (): Promise<User[]> => {
    if (USE_FIREBASE) {
        const snapshot = await db.collection('users').get();
        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            const userWithAppTimestamps = convertTimestamps(data, ['createdAt', 'updatedAt', 'birthdate']);
            // App.tsx will enrich with userLevel and profileComplete
            return { ...userWithAppTimestamps, id: doc.id } as User; 
        });
    } else {
        return getAllMockItems(mockUsers, LS_USERS);
    }
}

export const getAllJobsService = async (): Promise<Job[]> => {
    if (USE_FIREBASE) {
        const snapshot = await db.collection('jobs').orderBy('postedAt', 'desc').get();
        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return { ...convertTimestamps(data, ['postedAt', 'createdAt', 'updatedAt', 'dateNeededFrom', 'dateNeededTo']), id: doc.id } as Job;
        });
    } else {
        return getAllMockItems(mockJobs, LS_JOBS);
    }
};

export const getAllHelperProfilesService = async (): Promise<HelperProfile[]> => {
    if (USE_FIREBASE) {
        const snapshot = await db.collection('helperProfiles').orderBy('postedAt', 'desc').get();
         return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return { ...convertTimestamps(data, ['postedAt', 'createdAt', 'updatedAt', 'birthdate', 'availabilityDateFrom', 'availabilityDateTo']), id: doc.id } as HelperProfile;
        });
    } else {
        return getAllMockItems(mockHelperProfiles, LS_HELPER_PROFILES);
    }
};

export const getAllWebboardPostsService = async (): Promise<WebboardPost[]> => {
    if (USE_FIREBASE) {
        const snapshot = await db.collection('webboardPosts').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return { ...convertTimestamps(data, ['createdAt', 'updatedAt']), id: doc.id } as WebboardPost;
        });
    } else {
        return getAllMockItems(mockWebboardPosts, LS_WEBBOARD_POSTS);
    }
};

export const getAllWebboardCommentsService = async (): Promise<WebboardComment[]> => {
    if (USE_FIREBASE) {
        const snapshot = await db.collection('webboardComments').orderBy('createdAt', 'asc').get();
        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return { ...convertTimestamps(data, ['createdAt', 'updatedAt']), id: doc.id } as WebboardComment;
        });
    } else {
        return getAllMockItems(mockWebboardComments, LS_WEBBOARD_COMMENTS);
    }
};
export const getAllInteractionsService = async (): Promise<Interaction[]> => {
    if (USE_FIREBASE) {
        const snapshot = await db.collection('interactions').orderBy('timestamp', 'desc').get();
        return snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return { ...convertTimestamps(data, ['timestamp', 'createdAt']), interactionId: doc.id } as Interaction;
        });
    } else {
        return getAllMockItems(mockInteractions, LS_INTERACTIONS);
    }
};

export const getUserClickedHelpersMapService = async(): Promise<Record<string, string[]>> => {
    if (USE_FIREBASE) {
        console.warn("getUserClickedHelpersMapService: Firebase implementation not straightforward, returning empty for now.");
        return {};
    } else {
        await mockDelay();
        const saved = localStorage.getItem(LS_USER_CLICKED_HELPERS_MAP);
        if(saved) mockUserClickedHelpersMap = JSON.parse(saved);
        return {...mockUserClickedHelpersMap};
    }
};

export const updateUserClickedHelpersMapService = async (newMap: Record<string, string[]>): Promise<void> => {
    if (USE_FIREBASE) {
        console.warn("updateUserClickedHelpersMapService: Firebase implementation not straightforward.");
    } else {
        await mockDelay();
        mockUserClickedHelpersMap = {...newMap};
        localStorage.setItem(LS_USER_CLICKED_HELPERS_MAP, JSON.stringify(mockUserClickedHelpersMap));
        persistMockData();
    }
};


// --- JOB FUNCTIONS ---
export const addJobService = async (jobData: Omit<Job, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt'>, currentUser: User): Promise<Job> => {
  const appTimestamp = new Date().toISOString();
  if (USE_FIREBASE) {
    const newJobForFirebase = {
      ...jobData,
      dateNeededFrom: jobData.dateNeededFrom ? (typeof jobData.dateNeededFrom === 'object' && jobData.dateNeededFrom instanceof Date ? jobData.dateNeededFrom.toISOString().split('T')[0] : String(jobData.dateNeededFrom)) : null,
      dateNeededTo: jobData.dateNeededTo ? (typeof jobData.dateNeededTo === 'object' && jobData.dateNeededTo instanceof Date ? jobData.dateNeededTo.toISOString().split('T')[0] : String(jobData.dateNeededTo)) : null,
      ownerId: currentUser.id,
      userId: currentUser.id,
      username: currentUser.username,
      contact: generateContactStringForService(currentUser),
      postedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      isSuspicious: false,
      isPinned: false,
      isHired: false,
    };
    const docRef = await db.collection("jobs").add(newJobForFirebase);
    return { ...newJobForFirebase, id: docRef.id, postedAt: appTimestamp, createdAt: appTimestamp, updatedAt: appTimestamp }; 
  } else {
    await mockDelay();
    const newJob: Job = {
      ...jobData,
      id: `mock_job_${Date.now()}`,
      postedAt: appTimestamp,
      createdAt: appTimestamp,
      updatedAt: appTimestamp,
      userId: currentUser.id,
      username: currentUser.username,
      ownerId: currentUser.id,
      contact: generateContactStringForService(currentUser),
      isSuspicious: false,
      isPinned: false,
      isHired: false,
    };
    mockJobs.unshift(newJob);
    persistMockData();
    return newJob;
  }
};

export const updateJobService = async (jobId: string, jobData: Partial<Omit<Job, 'id' | 'userId' | 'username' | 'ownerId' | 'contact'>>, currentUser: User): Promise<Job> => {
  if (USE_FIREBASE) {
    const jobRef = db.collection('jobs').doc(jobId);
    const updatedJobData = {
        ...jobData,
        dateNeededFrom: jobData.dateNeededFrom ? (typeof jobData.dateNeededFrom === 'object' && jobData.dateNeededFrom instanceof Date ? jobData.dateNeededFrom.toISOString().split('T')[0] : String(jobData.dateNeededFrom)) : null,
        dateNeededTo: jobData.dateNeededTo ? (typeof jobData.dateNeededTo === 'object' && jobData.dateNeededTo instanceof Date ? jobData.dateNeededTo.toISOString().split('T')[0] : String(jobData.dateNeededTo)) : null,
        contact: generateContactStringForService(currentUser), 
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await jobRef.update(updatedJobData);
    const docSnap = await jobRef.get();
    const data = docSnap.data() as any;
    return { ...convertTimestamps(data, ['postedAt', 'createdAt', 'updatedAt', 'dateNeededFrom', 'dateNeededTo']), id: docSnap.id } as Job;
  } else {
    await mockDelay();
    const jobIndex = mockJobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) throw new Error("Job not found for update");
    const originalJob = mockJobs[jobIndex];
    mockJobs[jobIndex] = {
        ...originalJob,
        ...jobData,
        contact: generateContactStringForService(currentUser),
        updatedAt: new Date().toISOString()
    };
    persistMockData();
    return mockJobs[jobIndex];
  }
};

export const deleteJobService = async (jobId: string): Promise<void> => {
  if (USE_FIREBASE) {
    await db.collection('jobs').doc(jobId).delete();
  } else {
    await mockDelay();
    mockJobs = mockJobs.filter(j => j.id !== jobId);
    persistMockData();
  }
};

// --- HELPER PROFILE FUNCTIONS ---
export const addHelperProfileService = async (profileData: Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt'>, currentUser: User): Promise<HelperProfile> => {
  const appTimestamp = new Date().toISOString();
  if (USE_FIREBASE) {
    const newProfileForFirebase = {
        ...profileData,
        availabilityDateFrom: profileData.availabilityDateFrom ? (typeof profileData.availabilityDateFrom === 'object' && profileData.availabilityDateFrom instanceof Date ? profileData.availabilityDateFrom.toISOString().split('T')[0] : String(profileData.availabilityDateFrom)) : null,
        availabilityDateTo: profileData.availabilityDateTo ? (typeof profileData.availabilityDateTo === 'object' && profileData.availabilityDateTo instanceof Date ? profileData.availabilityDateTo.toISOString().split('T')[0] : String(profileData.availabilityDateTo)) : null,
        ownerId: currentUser.id,
        userId: currentUser.id,
        username: currentUser.username,
        contact: generateContactStringForService(currentUser),
        gender: currentUser.gender,
        birthdate: currentUser.birthdate || null,
        educationLevel: currentUser.educationLevel,
        postedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        isSuspicious: false,
        isPinned: false,
        isUnavailable: false,
        adminVerifiedExperience: false,
        interestedCount: 0,
    };
    const docRef = await db.collection("helperProfiles").add(newProfileForFirebase);
    return { ...newProfileForFirebase, id: docRef.id, postedAt: appTimestamp, createdAt: appTimestamp, updatedAt: appTimestamp };
  } else {
    await mockDelay();
    const newProfile: HelperProfile = {
      ...profileData,
      id: `mock_profile_${Date.now()}`,
      postedAt: appTimestamp,
      createdAt: appTimestamp,
      updatedAt: appTimestamp,
      userId: currentUser.id,
      username: currentUser.username,
      ownerId: currentUser.id,
      contact: generateContactStringForService(currentUser),
      gender: currentUser.gender,
      birthdate: currentUser.birthdate,
      educationLevel: currentUser.educationLevel,
      isSuspicious: false,
      isPinned: false,
      isUnavailable: false,
      adminVerifiedExperience: false,
      interestedCount: 0,
    };
    mockHelperProfiles.unshift(newProfile);
    persistMockData();
    return newProfile;
  }
};

export const updateHelperProfileService = async (profileId: string, profileData: Partial<Omit<HelperProfile, 'id' | 'userId' | 'username' | 'ownerId' | 'contact' | 'gender' | 'birthdate' | 'educationLevel'>>, currentUser: User): Promise<HelperProfile> => {
  if (USE_FIREBASE) {
    const profileRef = db.collection('helperProfiles').doc(profileId);
     const updatedProfileData = {
        ...profileData,
        availabilityDateFrom: profileData.availabilityDateFrom ? (typeof profileData.availabilityDateFrom === 'object' && profileData.availabilityDateFrom instanceof Date ? profileData.availabilityDateFrom.toISOString().split('T')[0] : String(profileData.availabilityDateFrom)) : null,
        availabilityDateTo: profileData.availabilityDateTo ? (typeof profileData.availabilityDateTo === 'object' && profileData.availabilityDateTo instanceof Date ? profileData.availabilityDateTo.toISOString().split('T')[0] : String(profileData.availabilityDateTo)) : null,
        contact: generateContactStringForService(currentUser),
        gender: currentUser.gender, 
        birthdate: currentUser.birthdate || null, 
        educationLevel: currentUser.educationLevel, 
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await profileRef.update(updatedProfileData);
    const docSnap = await profileRef.get();
    const data = docSnap.data() as any;
    return { ...convertTimestamps(data, ['postedAt', 'createdAt', 'updatedAt', 'birthdate', 'availabilityDateFrom', 'availabilityDateTo']), id: docSnap.id } as HelperProfile;
  } else {
    await mockDelay();
    const profileIndex = mockHelperProfiles.findIndex(p => p.id === profileId);
    if (profileIndex === -1) throw new Error("Helper profile not found for update");
    const originalProfile = mockHelperProfiles[profileIndex];
    mockHelperProfiles[profileIndex] = {
        ...originalProfile,
        ...profileData,
        contact: generateContactStringForService(currentUser), 
        gender: currentUser.gender, 
        birthdate: currentUser.birthdate,
        educationLevel: currentUser.educationLevel,
        updatedAt: new Date().toISOString()
    };
    persistMockData();
    return mockHelperProfiles[profileIndex];
  }
};

export const deleteHelperProfileService = async (profileId: string): Promise<void> => {
  if (USE_FIREBASE) {
    await db.collection('helperProfiles').doc(profileId).delete();
  } else {
    await mockDelay();
    mockHelperProfiles = mockHelperProfiles.filter(p => p.id !== profileId);
    persistMockData();
  }
};

// --- USER PROFILE FUNCTIONS ---
export const updateUserProfileService = async (userId: string, profileData: Partial<Omit<User, 'id' | 'email' | 'hashedPassword' | 'role' | 'createdAt' | 'updatedAt' | 'userLevel' | 'profileComplete'>>): Promise<User> => {
  if (USE_FIREBASE) {
    const userDocRef = db.collection("users").doc(userId);
    const dataToUpdate = {
        ...profileData,
        birthdate: profileData.birthdate || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }
    await userDocRef.update(dataToUpdate);
    const updatedDoc = await userDocRef.get();
    const updatedDbData = updatedDoc.data() as any;
    const updatedDataWithTimestamps = convertTimestamps(updatedDbData, ['createdAt', 'updatedAt', 'birthdate']) as Omit<User, 'id'>;
    
    const postsSnapshot = await db.collection('webboardPosts').get();
    const postsData = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebboardPost));
    const commentsSnapshot = await db.collection('webboardComments').get();
    const commentsData = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebboardComment));
    
    const finalUser: User = {
      ...updatedDataWithTimestamps,
      id: userId,
      userLevel: calculateUserLevel(userId, postsData, commentsData),
      profileComplete: appCheckProfileCompleteness({...updatedDataWithTimestamps, id:userId} as User)
    };
    return finalUser;
  } else {
    await mockDelay();
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found for update");
    mockUsers[userIndex] = {
      ...mockUsers[userIndex],
      ...profileData,
      updatedAt: new Date().toISOString(),
    };
    mockUsers[userIndex].profileComplete = appCheckProfileCompleteness(mockUsers[userIndex]);
    mockUsers[userIndex].userLevel = calculateUserLevel(mockUsers[userIndex].id, mockWebboardPosts, mockWebboardComments);

    persistMockData();
    return mockUsers[userIndex];
  }
};

// --- WEBBOARD POST FUNCTIONS ---
export const addWebboardPostService = async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, currentUser: User): Promise<WebboardPost> => {
  const appTimestamp = new Date().toISOString();
  if (USE_FIREBASE) {
    const newPostForFirebase = {
        ...postData,
        category: postData.category,
        ownerId: currentUser.id,
        userId: currentUser.id,
        username: currentUser.username,
        authorPhoto: currentUser.photo || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: [],
        isPinned: false,
    };
    const docRef = await db.collection("webboardPosts").add(newPostForFirebase);
    return { ...newPostForFirebase, id: docRef.id, createdAt: appTimestamp, updatedAt: appTimestamp };
  } else {
    await mockDelay();
    const newPost: WebboardPost = {
      id: `mock_wbpost_${Date.now()}`,
      ...postData,
      userId: currentUser.id,
      username: currentUser.username,
      ownerId: currentUser.id,
      authorPhoto: currentUser.photo,
      createdAt: appTimestamp,
      updatedAt: appTimestamp,
      likes: [],
      isPinned: false,
    };
    mockWebboardPosts.unshift(newPost);
    persistMockData();
    const authorIndex = mockUsers.findIndex(u => u.id === currentUser.id);
    if(authorIndex !== -1) {
        mockUsers[authorIndex].userLevel = calculateUserLevel(currentUser.id, mockWebboardPosts, mockWebboardComments);
        persistMockData();
    }
    return newPost;
  }
};

export const updateWebboardPostService = async (postId: string, postData: Partial<Omit<WebboardPost, 'id' | 'userId' | 'username' | 'ownerId' | 'authorPhoto' | 'createdAt' | 'likes' | 'isPinned'>>, currentUser: User): Promise<WebboardPost> => {
  if (USE_FIREBASE) {
     const postRef = db.collection('webboardPosts').doc(postId);
     const updatedPostData = {
        ...postData,
        authorPhoto: currentUser.photo || '', 
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await postRef.update(updatedPostData);
    const docSnap = await postRef.get();
    const data = docSnap.data() as any;
    return { ...convertTimestamps(data, ['createdAt', 'updatedAt']), id: docSnap.id } as WebboardPost;
  } else {
    await mockDelay();
    const postIndex = mockWebboardPosts.findIndex(p => p.id === postId);
    if (postIndex === -1) throw new Error("Webboard post not found for update");
    mockWebboardPosts[postIndex] = {
      ...mockWebboardPosts[postIndex],
      ...postData,
      authorPhoto: currentUser.photo,
      updatedAt: new Date().toISOString(),
    };
    persistMockData();
    return mockWebboardPosts[postIndex];
  }
};

export const deleteWebboardPostService = async (postId: string): Promise<void> => {
  if (USE_FIREBASE) {
    await db.collection('webboardPosts').doc(postId).delete();
    const commentsQuery = db.collection('webboardComments').where('postId', '==', postId);
    const commentsSnapshot = await commentsQuery.get();
    const batch = db.batch();
    commentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } else {
    await mockDelay();
    const postToDelete = mockWebboardPosts.find(p => p.id === postId);
    mockWebboardPosts = mockWebboardPosts.filter(p => p.id !== postId);
    mockWebboardComments = mockWebboardComments.filter(c => c.postId !== postId); 
    persistMockData();
    if(postToDelete){
        const authorIndex = mockUsers.findIndex(u => u.id === postToDelete.userId);
        if(authorIndex !== -1) {
            mockUsers[authorIndex].userLevel = calculateUserLevel(postToDelete.userId, mockWebboardPosts, mockWebboardComments);
            persistMockData();
        }
    }
  }
};

export const toggleWebboardPostLikeService = async (postId: string, userId: string): Promise<WebboardPost> => {
  if (USE_FIREBASE) {
    const postRef = db.collection('webboardPosts').doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) throw new Error("Post not found");
    const postDbData = postDoc.data() as WebboardPost;
    const likes = postDbData.likes || [];
    let newLikes;
    if (likes.includes(userId)) {
      newLikes = likes.filter(uid => uid !== userId);
    } else {
      newLikes = [...likes, userId];
    }
    await postRef.update({ likes: newLikes });
    const data = { ...postDbData, id: postId, likes: newLikes };
    return { ...convertTimestamps(data, ['createdAt', 'updatedAt']) } as WebboardPost;
  } else {
    await mockDelay();
    const postIndex = mockWebboardPosts.findIndex(p => p.id === postId);
    if (postIndex === -1) throw new Error("Webboard post not found for like toggle");
    const post = mockWebboardPosts[postIndex];
    const alreadyLiked = post.likes.includes(userId);
    post.likes = alreadyLiked
      ? post.likes.filter(uid => uid !== userId)
      : [...post.likes, userId];
    persistMockData();
    return post;
  }
};

// --- WEBBOARD COMMENT FUNCTIONS ---
export const addWebboardCommentService = async (postId: string, commentData: { text: string }, currentUser: User): Promise<WebboardComment> => {
  const appTimestamp = new Date().toISOString();
  if (USE_FIREBASE) {
    const newCommentForFirebase = {
        postId,
        text: commentData.text,
        ownerId: currentUser.id,
        userId: currentUser.id,
        username: currentUser.username,
        authorPhoto: currentUser.photo || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection("webboardComments").add(newCommentForFirebase);
    return { ...newCommentForFirebase, id: docRef.id, createdAt: appTimestamp, updatedAt: appTimestamp };
  } else {
    await mockDelay();
    const newComment: WebboardComment = {
      id: `mock_comment_${Date.now()}`,
      postId,
      text: commentData.text,
      userId: currentUser.id,
      username: currentUser.username,
      ownerId: currentUser.id,
      authorPhoto: currentUser.photo,
      createdAt: appTimestamp,
      updatedAt: appTimestamp,
    };
    mockWebboardComments.push(newComment);
    persistMockData();
    const authorIndex = mockUsers.findIndex(u => u.id === currentUser.id);
    if(authorIndex !== -1) {
        mockUsers[authorIndex].userLevel = calculateUserLevel(currentUser.id, mockWebboardPosts, mockWebboardComments);
        persistMockData();
    }
    return newComment;
  }
};

export const updateWebboardCommentService = async (commentId: string, newText: string, currentUser: User): Promise<WebboardComment> => {
  if (USE_FIREBASE) {
    const commentRef = db.collection('webboardComments').doc(commentId);
    await commentRef.update({
        text: newText,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    const docSnap = await commentRef.get();
    const data = docSnap.data() as any;
    return { ...convertTimestamps(data, ['createdAt', 'updatedAt']), id: docSnap.id } as WebboardComment;
  } else {
    await mockDelay();
    const commentIndex = mockWebboardComments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) throw new Error("Comment not found for update");
    mockWebboardComments[commentIndex].text = newText;
    mockWebboardComments[commentIndex].updatedAt = new Date().toISOString();
    persistMockData();
    return mockWebboardComments[commentIndex];
  }
};

export const deleteWebboardCommentService = async (commentId: string): Promise<void> => {
  if (USE_FIREBASE) {
    await db.collection('webboardComments').doc(commentId).delete();
  } else {
    await mockDelay();
    const commentToDelete = mockWebboardComments.find(c => c.id === commentId);
    mockWebboardComments = mockWebboardComments.filter(c => c.id !== commentId);
    persistMockData();
    if(commentToDelete){
        const authorIndex = mockUsers.findIndex(u => u.id === commentToDelete.userId);
        if(authorIndex !== -1) {
            mockUsers[authorIndex].userLevel = calculateUserLevel(commentToDelete.userId, mockWebboardPosts, mockWebboardComments);
            persistMockData();
        }
    }
  }
};

// --- ADMIN FUNCTIONS ---
export const toggleSuspiciousJobService = async (jobId: string, isSuspicious: boolean): Promise<void> => {
    if (USE_FIREBASE) { await db.collection('jobs').doc(jobId).update({ isSuspicious }); }
    else { await mockDelay(); const job = mockJobs.find(j => j.id === jobId); if (job) job.isSuspicious = isSuspicious; persistMockData(); }
};
export const togglePinnedJobService = async (jobId: string, isPinned: boolean): Promise<void> => {
    if (USE_FIREBASE) { await db.collection('jobs').doc(jobId).update({ isPinned }); }
    else { await mockDelay(); const job = mockJobs.find(j => j.id === jobId); if (job) job.isPinned = isPinned; persistMockData(); }
};
export const toggleHiredJobService = async (jobId: string, isHired: boolean): Promise<void> => {
    if (USE_FIREBASE) { await db.collection('jobs').doc(jobId).update({ isHired }); }
    else { await mockDelay(); const job = mockJobs.find(j => j.id === jobId); if (job) job.isHired = isHired; persistMockData(); }
};

export const toggleSuspiciousHelperProfileService = async (profileId: string, isSuspicious: boolean): Promise<void> => {
    if (USE_FIREBASE) { await db.collection('helperProfiles').doc(profileId).update({ isSuspicious }); }
    else { await mockDelay(); const p = mockHelperProfiles.find(hp => hp.id === profileId); if (p) p.isSuspicious = isSuspicious; persistMockData(); }
};
export const togglePinnedHelperProfileService = async (profileId: string, isPinned: boolean): Promise<void> => {
    if (USE_FIREBASE) { await db.collection('helperProfiles').doc(profileId).update({ isPinned }); }
    else { await mockDelay(); const p = mockHelperProfiles.find(hp => hp.id === profileId); if (p) p.isPinned = isPinned; persistMockData(); }
};
export const toggleUnavailableHelperProfileService = async (profileId: string, isUnavailable: boolean): Promise<void> => {
    if (USE_FIREBASE) { await db.collection('helperProfiles').doc(profileId).update({ isUnavailable }); }
    else { await mockDelay(); const p = mockHelperProfiles.find(hp => hp.id === profileId); if (p) p.isUnavailable = isUnavailable; persistMockData(); }
};
export const toggleVerifiedExperienceService = async (profileId: string, adminVerifiedExperience: boolean): Promise<void> => {
    if (USE_FIREBASE) { await db.collection('helperProfiles').doc(profileId).update({ adminVerifiedExperience }); }
    else { await mockDelay(); const p = mockHelperProfiles.find(hp => hp.id === profileId); if (p) p.adminVerifiedExperience = adminVerifiedExperience; persistMockData(); }
};

export const togglePinWebboardPostService = async (postId: string, isPinned: boolean): Promise<void> => {
    if (USE_FIREBASE) { await db.collection('webboardPosts').doc(postId).update({ isPinned }); }
    else { await mockDelay(); const post = mockWebboardPosts.find(p => p.id === postId); if (post) post.isPinned = isPinned; persistMockData(); }
};

export const setUserRoleService = async (userId: string, role: AppUserRole): Promise<void> => {
    if (USE_FIREBASE) { await db.collection('users').doc(userId).update({ role }); }
    else { await mockDelay(); const user = mockUsers.find(u => u.id === userId); if (user) user.role = role; persistMockData(); }
};


// --- SITE CONFIG ---
export const getSiteConfigService = async (): Promise<SiteConfig> => {
    if (USE_FIREBASE) {
        const docRef = db.collection('config').doc('siteStatus');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data() as any;
            return convertTimestamps(data, ['updatedAt']) as SiteConfig;
        }
        return { isSiteLocked: false }; 
    } else {
        await mockDelay();
        const saved = localStorage.getItem(LS_SITE_CONFIG);
        if (saved) mockSiteConfig = JSON.parse(saved);
        return mockSiteConfig;
    }
};

export const setSiteLockService = async (isLocked: boolean, adminId: string): Promise<void> => {
    if (USE_FIREBASE) {
        await db.collection('config').doc('siteStatus').set({
            isSiteLocked: isLocked,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: adminId,
        }, { merge: true });
    } else {
        await mockDelay();
        mockSiteConfig.isSiteLocked = isLocked;
        mockSiteConfig.updatedAt = new Date().toISOString();
        mockSiteConfig.updatedBy = adminId;
        persistMockData();
    }
};

// --- INTERACTIONS ---
export const logHelperContactInteractionService = async (helperUserId: string, employerUserId: string): Promise<Interaction> => {
    const clientTimestamp = new Date().toISOString();
    const newInteractionBase = {
        helperUserId,
        employerUserId,
        timestamp: clientTimestamp,
        type: 'contact_helper' as const,
    };

    if (USE_FIREBASE) {
        const interactionForFirebase = {
            ...newInteractionBase,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(), 
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        const docRef = await db.collection('interactions').add(interactionForFirebase);
        // For app state, use client timestamp or fetch and convert server one
        return { ...newInteractionBase, interactionId: docRef.id, createdAt: clientTimestamp };
    } else {
        await mockDelay();
        const newInteraction: Interaction = {
            ...newInteractionBase,
            interactionId: `mock_interaction_${Date.now()}`,
            createdAt: clientTimestamp,
        };
        mockInteractions.push(newInteraction);
        persistMockData();
        return newInteraction;
    }
};


// Mock-specific utility to clear all mock data from localStorage
export const clearMockStorage = () => {
  if (USE_FIREBASE) return; // Only affects mock mode
  localStorage.removeItem(LS_USERS);
  localStorage.removeItem(LS_CURRENT_USER_ID);
  localStorage.removeItem(LS_JOBS);
  localStorage.removeItem(LS_HELPER_PROFILES);
  localStorage.removeItem(LS_WEBBOARD_POSTS);
  localStorage.removeItem(LS_WEBBOARD_COMMENTS);
  localStorage.removeItem(LS_SITE_CONFIG);
  localStorage.removeItem(LS_INTERACTIONS);
  localStorage.removeItem(LS_USER_CLICKED_HELPERS_MAP);
  console.log('[MockService] All mock localStorage data cleared.');

    mockUsers = (() => {
        const adminCreatedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
        const testUserCreatedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago
        const baseAdminUser: Omit<User, 'userLevel' | 'profileComplete'| 'hashedPassword'> = { id: 'admin-user-001', displayName: 'Admin User', username: ADMIN_USERNAME, email: ADMIN_EMAIL, role: 'Admin' as AppUserRole.Admin, mobile: '088-888-8888', lineId: 'admin_line_id', facebook: 'admin_facebook_profile', gender: GenderOption.NotSpecified, birthdate: '1990-01-01', educationLevel: HelperEducationLevelOption.Bachelor, photo: undefined, address: '1 Admin Road, Admin City', favoriteMusic: 'Classical', hobbies: 'Reading, Coding', isMuted: false, createdAt: adminCreatedAt, updatedAt: adminCreatedAt };
        const baseTestUser: Omit<User, 'userLevel' | 'profileComplete' | 'hashedPassword'> = { id: 'test-user-002', displayName: 'Test User', username: 'test', email: 'test@user.com', role: 'Member' as AppUserRole.Member, mobile: '081-234-5678', lineId: 'test_user_line', facebook: 'test_user_facebook', gender: GenderOption.Male, birthdate: '1995-05-15', educationLevel: HelperEducationLevelOption.HighSchool, photo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzdlOGM4YSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iOCIgcj0iNSIvPjxwYXRoIGQ9Ik0yMCAyMWE4IDggMCAwIDAtMTYgMCIvPjwvc3ZnPg==', address: '123 Mymoo Road, Chiang Mai', favoriteMovie: 'Inception', introSentence: 'I am a friendly and hardworking individual.', isMuted: false, createdAt: testUserCreatedAt, updatedAt: testUserCreatedAt };
        const mockAdminUserWithPass = {...baseAdminUser, hashedPassword: ADMIN_PASSWORD};
        const mockTestUserWithPass = {...baseTestUser, hashedPassword: 'testpass'};
        return [mockAdminUserWithPass, mockTestUserWithPass].map(u => { const userWithLevel = { ...u, userLevel: calculateUserLevel(u.id, DUMMY_WEBBOARD_POSTS, []) }; return { ...userWithLevel, profileComplete: appCheckProfileCompleteness(userWithLevel as User) };});
    })();
    mockJobs = [];
    mockHelperProfiles = [];
    mockWebboardPosts = [...DUMMY_WEBBOARD_POSTS];
    mockWebboardComments = [];
    mockSiteConfig = { isSiteLocked: false, updatedAt: new Date().toISOString(), updatedBy: 'system_reset' };
    mockInteractions = [];
    mockUserClickedHelpersMap = {};
};
