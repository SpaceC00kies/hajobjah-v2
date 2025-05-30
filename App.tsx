
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Job, HelperProfile, User, EnrichedHelperProfile, Interaction, WebboardPost, WebboardComment, UserLevel, EnrichedWebboardPost, EnrichedWebboardComment } from './types';
import type { AdminItem as AdminItemType } from './components/AdminDashboard';
import { View, GenderOption, HelperEducationLevelOption, USER_LEVELS, UserLevelName, UserRole, ADMIN_BADGE_DETAILS, MODERATOR_BADGE_DETAILS, WebboardCategory } from './types'; // Added WebboardCategory
import { PostJobForm } from './components/PostJobForm';
import { JobCard } from './components/JobCard';
import { Button } from './components/Button';
import { OfferHelpForm } from './components/OfferHelpForm';
import { HelperCard } from './components/HelperCard';
import { RegistrationForm } from './components/RegistrationForm';
import { LoginForm } from './components/LoginForm';
import { AdminDashboard } from './components/AdminDashboard';
import { ConfirmModal } from './components/ConfirmModal';
import { MyPostsPage } from './components/MyPostsPage';
import { UserProfilePage } from './components/UserProfilePage';
import { AboutUsPage } from './components/AboutUsPage';
import { PublicProfilePage } from './components/PublicProfilePage';
import { SafetyPage } from './components/SafetyPage';
import { FeedbackForm } from './components/FeedbackForm';
import { WebboardPage } from './components/WebboardPage';
import { UserLevelBadge } from './components/UserLevelBadge';
import { SiteLockOverlay } from './components/SiteLockOverlay'; 

// --- Firebase Integration Flag (for future use) ---
// To use Firebase, set VITE_USE_FIREBASE=true in your .env file and ensure it's defined in vite.config.ts process.env
// Using process.env here for potentially broader compatibility if import.meta.env has issues with TS/bundler setup.
const USE_FIREBASE = process.env.VITE_USE_FIREBASE === 'true';

const ADMIN_USERNAME = "admin";
const ADMIN_EMAIL = "admin@hajobjah.com";
const ADMIN_PASSWORD = "adminpass"; 

const USER_CLICKED_HELPERS_LS_KEY = 'chiangMaiUserClickedHelpersMap';
const SITE_LOCKED_LS_KEY = 'chiangMaiSiteLockedStatus'; 

// --- START OF WORD BLACKLIST ---
// !!! IMPORTANT: THIS IS A PLACEHOLDER. POPULATE WITH ACTUAL WORDS. !!!
export const THAI_PROFANITY_BLACKLIST: string[] = [
  "คำหยาบ1", "คำต้องห้าม2", "badword3", "inappropriate_phrase",
  // Example: "สัส", "เหี้ย", "ควย", "ควาย" (these are examples, tailor to your needs)
];

export const containsBlacklistedWords = (text: string): boolean => {
  if (!text || THAI_PROFANITY_BLACKLIST.length === 0) return false;
  const lowerText = text.toLowerCase();
  return THAI_PROFANITY_BLACKLIST.some(word => lowerText.includes(word.toLowerCase()));
};
// --- END OF WORD BLACKLIST ---


export const isValidThaiMobileNumberUtil = (mobile: string): boolean => {
  if (!mobile) return false;
  const cleaned = mobile.replace(/[\s-]/g, '');
  return /^0[689]\d{8}$/.test(cleaned);
};

export const checkProfileCompleteness = (user: User): boolean => {
  if (!user) return false;
  const hasRequiredContact = !!user.mobile;
  const hasPhoto = !!user.photo;
  const hasAddress = !!user.address && user.address.trim() !== '';

  const hasPersonalityInfo = !!(
    user.favoriteMusic?.trim() ||
    user.favoriteBook?.trim() ||
    user.favoriteMovie?.trim() ||
    user.hobbies?.trim() ||
    user.favoriteFood?.trim() ||
    user.dislikedThing?.trim() ||
    user.introSentence?.trim()
  );
  return hasRequiredContact && hasPhoto && hasAddress && hasPersonalityInfo;
};

export const calculateUserLevel = (userId: string, posts: WebboardPost[], comments: WebboardComment[]): UserLevel => {
  const userPostsCount = posts.filter(p => p.userId === userId).length;
  const userCommentsCount = comments.filter(c => c.userId === userId).length;
  const score = (userPostsCount * 2) + (userCommentsCount * 0.5);

  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    if (USER_LEVELS[i].minScore !== undefined && score >= USER_LEVELS[i].minScore!) {
      return USER_LEVELS[i];
    }
  }
  return USER_LEVELS[0];
};

export const getUserDisplayBadge = (user: User | null | undefined, posts: WebboardPost[], comments: WebboardComment[]): UserLevel => {
  if (!user) return USER_LEVELS[0]; 
  if (user.role === UserRole.Admin) return ADMIN_BADGE_DETAILS;
  if (user.role === UserRole.Moderator) return MODERATOR_BADGE_DETAILS;
  return user.userLevel || calculateUserLevel(user.id, posts, comments);
};


const DUMMY_WEBBOARD_POSTS: WebboardPost[] = [
  {
    id: 'dummy-post-001',
    title: "👋 ยินดีต้อนรับสู่เว็บบอร์ดหาจ๊อบจ้า!",
    body: "สวัสดีครับทุกคน! นี่คือพื้นที่สำหรับพูดคุย แลกเปลี่ยนความคิดเห็น และช่วยเหลือกันในชุมชนหาจ๊อบจ้าของเรานะครับ มีอะไรอยากแชร์ อยากถาม โพสต์ได้เลย! \n\nอย่าลืมอ่านกฎกติกาของบอร์ดเราด้วยนะ 😊",
    category: WebboardCategory.General,
    userId: 'admin-user-001',
    username: 'admin',
    ownerId: 'admin-user-001',
    authorPhoto: undefined,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    likes: ['test-user-002'],
    isPinned: true,
  },
  {
    id: 'dummy-post-002',
    title: "❓ ใครเคยทำงานพาร์ทไทม์ร้านกาแฟบ้าง ขอคำแนะนำหน่อยครับ",
    body: "พอดีสนใจอยากลองทำงานพาร์ทไทม์ที่ร้านกาแฟในเชียงใหม่ครับ ไม่เคยมีประสบการณ์เลย อยากทราบว่าปกติเขาทำอะไรกันบ้าง เตรียมตัวยังไงดี ขอบคุณล่วงหน้าครับ 🙏",
    category: WebboardCategory.QA,
    userId: 'test-user-002',
    username: 'test',
    ownerId: 'test-user-002',
    authorPhoto: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzdlOGM4YSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iOCIgcj0iNSIvPjxwYXRoIGQ9Ik0yMCAyMWE4IDggMCAwIDAtMTYgMCIvPjwvc3ZnPg==',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    likes: [],
  },
  {
    id: 'dummy-post-003',
    title: "💡 เคล็ดลับการสัมภาษณ์งานพาร์ทไทม์ให้ปัง!",
    body: "มาแชร์เคล็ดลับเล็กๆ น้อยๆ สำหรับน้องๆ ที่กำลังจะไปสัมภาษณ์งานพาร์ทไทม์กันครับ:\n1. ตรงต่อเวลาเสมอ\n2. แต่งกายสุภาพเรียบร้อย\n3. ศึกษาข้อมูลร้าน/บริษัทไปบ้าง\n4. เตรียมคำถามที่เราสงสัยไปด้วย\n5. ยิ้มแย้มแจ่มใส เป็นตัวของตัวเอง\n\nใครมีเคล็ดลับอื่นอีก มาแชร์กันได้นะครับ! ✨",
    image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTUwIDEwMCI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZHRoPSIxMDAiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZHRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM3NTc1NzUiPlBsYWNlaG9sZGVyPC90ZXh0Pjwvc3ZnPg==', // Simple placeholder SVG
    category: WebboardCategory.HowTo,
    userId: 'admin-user-001',
    username: 'admin',
    ownerId: 'admin-user-001',
    authorPhoto: undefined,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    likes: ['test-user-002'],
  },
  {
    id: 'dummy-post-004',
    title: "หาคนช่วยย้ายของในเมืองเชียงใหม่ เสาร์นี้ครับ",
    body: "ใครว่างรับจ้างช่วยย้ายของเล็กน้อย (มีแค่กล่องเสื้อผ้ากับโต๊ะเล็กๆ) จากแถวสันติธรรมไปแถวหลัง มช. วันเสาร์นี้ไหมครับ ขอเป็นช่วงบ่าย มีค่าขนมให้ครับ ติดต่อมาได้เลย 😊",
    category: WebboardCategory.General,
    userId: 'test-user-002',
    username: 'test',
    ownerId: 'test-user-002',
    authorPhoto: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzdlOGM4YSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iOCIgcj0iNSIvPjxwYXRoIGQ9Ik0yMCAyMWE4IDggMCAwIDAtMTYgMCIvPjwvc3ZnPg==',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    likes: [],
  },
  {
    id: 'dummy-post-005',
    title: "ย้ำเตือน! 🛡️ เพื่อความปลอดภัยในการนัดเจอและตกลงงาน",
    body: "เพื่อความปลอดภัยของทุกคน ขอเน้นย้ำเรื่องการนัดเจอเพื่อตกลงงานหรือรับงานนะครับ:\n- นัดเจอในที่สาธารณะ ปลอดภัย\n- หากเป็นไปได้ ควรมีเพื่อนไปด้วย\n- **ห้ามโอนเงินมัดจำใดๆ ก่อนเริ่มงานเด็ดขาด**\n\nอ่านเพิ่มเติมได้ที่หน้า 'โปรดอ่านเพื่อความปลอดภัย' ของเรานะครับ ด้วยความเป็นห่วง ❤️",
    category: WebboardCategory.Knowledge,
    userId: 'admin-user-001',
    username: 'admin',
    ownerId: 'admin-user-001',
    authorPhoto: undefined,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    likes: [],
  },
];


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Home);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackSubmissionStatus, setFeedbackSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedbackSubmissionMessage, setFeedbackSubmissionMessage] = useState<string | null>(null);

  const [interactions, setInteractions] = useState<Interaction[]>(() => {
    const savedInteractions = localStorage.getItem('chiangMaiQuickInteractions');
    if (savedInteractions) {
      try {
        return JSON.parse(savedInteractions);
      } catch (e) {
        console.error("Error parsing interactions from localStorage", e);
      }
    }
    return [];
  });

  const [webboardPosts, setWebboardPosts] = useState<WebboardPost[]>(() => {
    const saved = localStorage.getItem('chiangMaiWebboardPosts');
    return saved ? JSON.parse(saved) : DUMMY_WEBBOARD_POSTS;
  });
  const [webboardComments, setWebboardComments] = useState<WebboardComment[]>(() => {
    const saved = localStorage.getItem('chiangMaiWebboardComments');
    if (saved) {
        try {
            const parsedComments = JSON.parse(saved) as WebboardComment[];
            // Ensure ownerId is present, default if missing (for older data)
            return parsedComments.map(c => ({
                ...c,
                ownerId: c.ownerId || c.userId, // Default ownerId to userId if missing
                createdAt: c.createdAt || new Date().toISOString(),
                updatedAt: c.updatedAt || c.createdAt || new Date().toISOString(),
            }));
        } catch (e) {
            console.error("Error parsing webboard comments from localStorage", e);
        }
    }
    return []; // Start with empty array if no dummy comments defined initially
  });
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const [isSiteLocked, setIsSiteLocked] = useState<boolean>(() => {
    const savedLockStatus = localStorage.getItem(SITE_LOCKED_LS_KEY);
    return savedLockStatus === 'true';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginRedirectInfo, setLoginRedirectInfo] = useState<{ view: View; payload?: any } | null>(null);


  useEffect(() => {
    localStorage.setItem(SITE_LOCKED_LS_KEY, String(isSiteLocked));
  }, [isSiteLocked]);

  const handleToggleSiteLock = () => {
    if (currentUser?.role !== UserRole.Admin) {
      // TODO (UX): Refactor to use a non-blocking toast notification system.
      alert("คุณไม่มีสิทธิ์ดำเนินการนี้");
      return;
    }
    setIsSiteLocked(prev => !prev);
  };


  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('chiangMaiQuickUsers');

    const webboardPostsData = localStorage.getItem('chiangMaiWebboardPosts') || JSON.stringify(DUMMY_WEBBOARD_POSTS);
    const tempPosts = JSON.parse(webboardPostsData);
    const webboardCommentsData = localStorage.getItem('chiangMaiWebboardComments');
    const tempComments = webboardCommentsData ? JSON.parse(webboardCommentsData) : [];

    const baseAdminUser: Omit<User, 'userLevel' | 'profileComplete' | 'hashedPassword' > = { 
      id: 'admin-user-001',
      displayName: 'Admin User',
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      // hashedPassword: ADMIN_PASSWORD, // Not stored directly if using Firebase Auth
      role: UserRole.Admin,
      mobile: '088-888-8888',
      lineId: 'admin_line_id',
      facebook: 'admin_facebook_profile',
      gender: GenderOption.NotSpecified,
      birthdate: '1990-01-01',
      educationLevel: HelperEducationLevelOption.Bachelor,
      photo: undefined,
      address: '1 Admin Road, Admin City',
      favoriteMusic: 'Classical',
      hobbies: 'Reading, Coding',
    };
    const baseTestUser: Omit<User, 'userLevel' | 'profileComplete' | 'hashedPassword'> = { 
      id: 'test-user-002',
      displayName: 'Test User',
      username: 'test',
      email: 'test@user.com',
      // hashedPassword: 'testpass', // Not stored directly
      role: UserRole.Member,
      mobile: '081-234-5678',
      lineId: 'test_user_line',
      facebook: 'test_user_facebook',
      gender: GenderOption.Male,
      birthdate: '1995-05-15',
      educationLevel: HelperEducationLevelOption.HighSchool,
      photo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzdlOGM4YSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iOCIgcj0iNSIvPjxwYXRoIGQ9Ik0yMCAyMWE4IDggMCAwIDAtMTYgMCIvPjwvc3ZnPg==',
      address: '123 Mymoo Road, Chiang Mai',
      favoriteMovie: 'Inception',
      introSentence: 'I am a friendly and hardworking individual.',
    };
    
    // For mock mode, include hashedPassword
    const mockAdminUser = {...baseAdminUser, hashedPassword: ADMIN_PASSWORD};
    const mockTestUser = {...baseTestUser, hashedPassword: 'testpass'};


    let initialUsers: User[] = [mockAdminUser, mockTestUser].map(u => {
      const userWithLevelAndCompleteness = {
        ...u,
        userLevel: calculateUserLevel(u.id, tempPosts, tempComments)
      };
      return {
        ...userWithLevelAndCompleteness,
        profileComplete: checkProfileCompleteness(userWithLevelAndCompleteness as User),
      };
    });

    if (savedUsers) {
      try {
        const parsedUsers = JSON.parse(savedUsers) as Partial<User>[];
        if (Array.isArray(parsedUsers)) {
           let adminExists = false;
           let regularTestUserExists = false;
           const loadedUsers: User[] = parsedUsers.map(u => {
            const role = u.role || (u.username === ADMIN_USERNAME ? UserRole.Admin : UserRole.Member); 
            const completeUserBase = {
                id: u.id || Date.now().toString(),
                displayName: u.displayName || 'Unknown User',
                username: u.username || `user${Date.now()}`,
                email: u.email || `unknown${Date.now()}@example.com`,
                hashedPassword: u.hashedPassword || 'defaultpass', // Keep for mock
                mobile: u.mobile || '',
                lineId: u.lineId || undefined,
                facebook: u.facebook || undefined,
                gender: u.gender || GenderOption.NotSpecified,
                birthdate: u.birthdate || undefined,
                educationLevel: u.educationLevel || HelperEducationLevelOption.NotStated,
                photo: u.photo || undefined,
                address: u.address || undefined,
                favoriteMusic: u.favoriteMusic || undefined,
                favoriteBook: u.favoriteBook || undefined,
                favoriteMovie: u.favoriteMovie || undefined,
                hobbies: u.hobbies || undefined,
                favoriteFood: u.favoriteFood || undefined,
                dislikedThing: u.dislikedThing || undefined,
                introSentence: u.introSentence || undefined,
                role: role,
                isMuted: u.isMuted || false,
                userLevel: calculateUserLevel(u.id || '', tempPosts, tempComments)
            };
            const finalUser: User = {
                ...completeUserBase,
                profileComplete: checkProfileCompleteness(completeUserBase as User),
            };

            if (finalUser.username === ADMIN_USERNAME && finalUser.email === ADMIN_EMAIL) {
              adminExists = true;
              return { ...initialUsers.find(iu => iu.id === mockAdminUser.id)!, ...finalUser, role: UserRole.Admin };
            }
            if (finalUser.username === 'test' && finalUser.email === 'test@user.com') {
              regularTestUserExists = true;
              return { ...initialUsers.find(iu => iu.id === mockTestUser.id)!, ...finalUser, role: UserRole.Member };
            }
            return finalUser;
          }).filter(u => u.id && u.username && u.email);

          if (!adminExists) loadedUsers.unshift(initialUsers.find(iu => iu.id === mockAdminUser.id)!);
          if (!regularTestUserExists && !adminExists) {
             loadedUsers.splice(1,0, initialUsers.find(iu => iu.id === mockTestUser.id)!);
          } else if (!regularTestUserExists) {
             loadedUsers.splice(0,0, initialUsers.find(iu => iu.id === mockTestUser.id)!);
          }
          initialUsers = loadedUsers;
        }
      } catch (e) {
        console.error("Error parsing users from localStorage, re-initializing.", e);
      }
    }
    return initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('chiangMaiQuickCurrentUser');
    if (savedUser) {
        try {
            const parsedUser = JSON.parse(savedUser) as User;
            const fullUserFromList = users.find(u => u.id === parsedUser.id);

            // In mock mode, we check hashedPassword. With Firebase, this would be an auth token.
            if (fullUserFromList && fullUserFromList.hashedPassword === parsedUser.hashedPassword) {
                 return fullUserFromList;
            }
            return null;
        } catch (e) {
            console.error("Error parsing current user from localStorage", e);
            return null;
        }
    }
    return null;
  });

  const [jobs, setJobs] = useState<Job[]>(() => {
    const savedJobs = localStorage.getItem('chiangMaiQuickJobs');
    if (savedJobs) {
        try {
            return JSON.parse(savedJobs);
        } catch (e) {
            console.error("Error parsing jobs from localStorage", e);
        }
    }
    return [];
  });

  const [helperProfiles, setHelperProfiles] = useState<HelperProfile[]>(() => {
    const savedHelpers = localStorage.getItem('chiangMaiQuickHelpers');
     if (savedHelpers) {
        try {
            const parsed = JSON.parse(savedHelpers) as HelperProfile[];
            return parsed.map(hp => ({
              ...hp,
              adminVerifiedExperience: hp.adminVerifiedExperience || false,
              interestedCount: hp.interestedCount || 0
            }));
        } catch (e) {
            console.error("Error parsing helper profiles from localStorage", e);
        }
    }
    return [];
  });

  const [itemToEdit, setItemToEdit] = useState<Job | HelperProfile | WebboardPost | null>(null);
  const [editingItemType, setEditingItemType] = useState<'job' | 'profile' | 'webboardPost' | null>(null);
  const [sourceViewForForm, setSourceViewForForm] = useState<View | null>(null);


  useEffect(() => {
    // Ensure light theme is default and dark class is not applied to html element
    document.documentElement.classList.remove('dark');
  }, []);


  const updateUserLevelsAndRoles = useCallback(() => {
    setUsers(prevUsers =>
      prevUsers.map(u => ({
        ...u,
        userLevel: calculateUserLevel(u.id, webboardPosts, webboardComments),
      }))
    );
  }, [webboardPosts, webboardComments]);


  useEffect(() => {
    localStorage.setItem('chiangMaiQuickUsers', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('chiangMaiQuickInteractions', JSON.stringify(interactions));
  }, [interactions]);


  useEffect(() => {
    if (currentUser?.id) {
      const liveUserFromUsersArray = users.find(u => u.id === currentUser.id);

      if (liveUserFromUsersArray) {
        const newCurrentUserInfo: User = {
          ...liveUserFromUsersArray,
          profileComplete: checkProfileCompleteness(liveUserFromUsersArray),
          userLevel: calculateUserLevel(liveUserFromUsersArray.id, webboardPosts, webboardComments),
        };

        if (JSON.stringify(currentUser) !== JSON.stringify(newCurrentUserInfo)) {
           setCurrentUser(newCurrentUserInfo);
        }
        localStorage.setItem('chiangMaiQuickCurrentUser', JSON.stringify(newCurrentUserInfo));
      } else {
        setCurrentUser(null);
        localStorage.removeItem('chiangMaiQuickCurrentUser');
      }
    } else {
      localStorage.removeItem('chiangMaiQuickCurrentUser');
      if (currentUser !== null) {
        setCurrentUser(null);
      }
    }
  }, [users, interactions, webboardPosts, webboardComments, currentUser?.id]); 

  useEffect(() => {
    localStorage.setItem('chiangMaiQuickJobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('chiangMaiQuickHelpers', JSON.stringify(helperProfiles));
  }, [helperProfiles]);

  useEffect(() => {
    localStorage.setItem('chiangMaiWebboardPosts', JSON.stringify(webboardPosts));
    updateUserLevelsAndRoles();
  }, [webboardPosts, updateUserLevelsAndRoles]);

  useEffect(() => {
    localStorage.setItem('chiangMaiWebboardComments', JSON.stringify(webboardComments));
    updateUserLevelsAndRoles();
  }, [webboardComments, updateUserLevelsAndRoles]);

  const requestLoginForAction = (originalView: View, originalPayload?: any) => {
    if (!currentUser) {
      setLoginRedirectInfo({ view: originalView, payload: originalPayload });
      setCurrentView(View.Login);
      setIsMobileMenuOpen(false);
    }
  };

  const navigateTo = (view: View, payload?: any) => {
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);

    const protectedViews: View[] = [
      View.PostJob,
      View.OfferHelp,
      View.UserProfile,
      View.MyPosts,
      View.AdminDashboard,
      // View.PublicProfile is handled below
    ];
    
    if (view === View.PublicProfile && typeof payload === 'string') {
        const targetUser = users.find(u => u.id === payload);
        if (targetUser && targetUser.role === UserRole.Admin) {
            alert("โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้ โปรดใช้หน้าโปรไฟล์ส่วนตัวหรือ Dashboard สำหรับแอดมิน");
            return; // Block navigation
        }
        if (!currentUser) { // Public profiles require login
            setLoginRedirectInfo({ view, payload });
            setCurrentView(View.Login);
            return;
        }
        setViewingProfileId(payload);
    } else if (view !== View.PublicProfile) {
      if (viewingProfileId !== null) setViewingProfileId(null);
    }
    
    if (!currentUser && protectedViews.includes(view)) {
      setLoginRedirectInfo({ view, payload });
      setCurrentView(View.Login);
      return;
    }


    if (view === View.Webboard) {
      if (typeof payload === 'string') {
        if (payload === 'create') {
          setSelectedPostId('create');
        } else {
          setSelectedPostId(payload);
        }
      } else if (payload && typeof payload === 'object' && payload.postId) {
        setSelectedPostId(payload.postId);
      } else if (payload === null || payload === undefined) {
        setSelectedPostId(null);
      }
    } else if (selectedPostId !== null && view !== View.AdminDashboard) {
      setSelectedPostId(null);
    }
    setCurrentView(view);
  };


  const handleNavigateToPublicProfile = (userId: string) => {
    navigateTo(View.PublicProfile, userId);
  };

  const handleRegister = (userData: Omit<User, 'id' | 'hashedPassword' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'role' | 'isMuted'> & { password: string }) => {
    if (users.find(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
      alert('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว โปรดเลือกชื่ออื่น');
      return false;
    }
    if (users.find(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      alert('อีเมลนี้ถูกใช้ไปแล้ว โปรดใช้อีเมลอื่น');
      return false;
    }
    if (!isValidThaiMobileNumberUtil(userData.mobile)) {
      alert('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
      return false;
    }
    if (!userData.gender || !userData.birthdate || !userData.educationLevel) {
        alert('กรุณากรอกข้อมูลส่วนตัว (เพศ, วันเกิด, ระดับการศึกษา) ให้ครบถ้วน');
        return false;
    }

    const newUserId = Date.now().toString();
    const newUserRole = (userData.username.toLowerCase() === ADMIN_USERNAME || userData.email.toLowerCase() === ADMIN_EMAIL) && userData.password === ADMIN_PASSWORD ? UserRole.Admin : UserRole.Member;

    const newUserBase: Omit<User, 'profileComplete' | 'userLevel' | 'hashedPassword'> = { 
      id: newUserId,
      displayName: userData.displayName,
      username: userData.username,
      email: userData.email,
      // hashedPassword: userData.password, // Keep for mock
      role: newUserRole,
      mobile: userData.mobile,
      lineId: userData.lineId || undefined,
      facebook: userData.facebook || undefined,
      gender: userData.gender,
      birthdate: userData.birthdate,
      educationLevel: userData.educationLevel,
      isMuted: false,
    };
    const newUser: User = {
        ...newUserBase,
        hashedPassword: userData.password, // Keep for mock
        userLevel: calculateUserLevel(newUserId, webboardPosts, webboardComments),
        profileComplete: checkProfileCompleteness(newUserBase as User),
    };

    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser); 
    alert('ลงทะเบียนสำเร็จแล้ว!');

    if (loginRedirectInfo) {
      navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload);
      setLoginRedirectInfo(null);
    } else {
      navigateTo(View.Home);
    }
    return true;
  };

  const handleLogin = (loginIdentifier: string, passwordAttempt: string) => {
    const userFromList = users.find(
      u => (u.username.toLowerCase() === loginIdentifier.toLowerCase() || u.email.toLowerCase() === loginIdentifier.toLowerCase()) &&
           u.hashedPassword === passwordAttempt // Mock mode check
    );
    if (userFromList) {
      const loggedInUser: User = userFromList;
      setCurrentUser(loggedInUser);
      alert(`ยินดีต้อนรับ @${loggedInUser.displayName}!`);
      if (loginRedirectInfo) {
        navigateTo(loginRedirectInfo.view, loginRedirectInfo.payload);
        setLoginRedirectInfo(null);
      } else {
        navigateTo(View.Home);
      }
      return true;
    } else {
      alert('ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง');
      return false;
    }
  };

  const handleUpdateUserProfile = (
    updatedProfileData: Pick<User, 'mobile' | 'lineId' | 'facebook' | 'gender' | 'birthdate' | 'educationLevel' | 'photo' | 'address' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence'>
  ) => {
    if (!currentUser) {
      alert('เกิดข้อผิดพลาด: ไม่พบข้อมูลผู้ใช้ปัจจุบัน');
      return false;
    }
     if (!isValidThaiMobileNumberUtil(updatedProfileData.mobile)) {
      alert('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 08X-XXX-XXXX)');
      return false;
    }
    if (!updatedProfileData.gender || updatedProfileData.gender === GenderOption.NotSpecified) {
      alert('กรุณาเลือกเพศ');
      return false;
    }
    if (!updatedProfileData.birthdate) {
      alert('กรุณาเลือกวันเกิด');
      return false;
    }
    if (!updatedProfileData.educationLevel || updatedProfileData.educationLevel === HelperEducationLevelOption.NotStated) {
      alert('กรุณาเลือกระดับการศึกษา');
      return false;
    }

    setUsers(prevUsers =>
      prevUsers.map(u =>
        u.id === currentUser.id
          ? {
              ...u,
              ...updatedProfileData,
              profileComplete: checkProfileCompleteness({ ...u, ...updatedProfileData }),
            }
          : u
      )
    );
    return true;
  };


  const handleLogout = () => {
    setCurrentUser(null);
    setLoginRedirectInfo(null); 
    setItemToEdit(null);
    setEditingItemType(null);
    setSourceViewForForm(null);
    setViewingProfileId(null);
    setSelectedPostId(null);
    setIsMobileMenuOpen(false);
    alert('ออกจากระบบเรียบร้อยแล้ว');
    navigateTo(View.Home);
  };

 const handleStartEditItemFromAdmin = (item: AdminItemType) => {
    if (item.itemType === 'job') {
        const originalItem = jobs.find(j => j.id === item.id);
        if (originalItem) {
            setItemToEdit(originalItem);
            setEditingItemType('job');
            setSourceViewForForm(View.AdminDashboard);
            navigateTo(View.PostJob);
        } else { console.error("Job not found for editing from Admin:", item); }
    } else if (item.itemType === 'profile') {
        const originalItem = helperProfiles.find(p => p.id === item.id);
        if (originalItem) {
            setItemToEdit(originalItem);
            setEditingItemType('profile');
            setSourceViewForForm(View.AdminDashboard);
            navigateTo(View.OfferHelp);
        } else { console.error("Helper profile not found for editing from Admin:", item); }
    } else if (item.itemType === 'webboardPost') {
        const originalPost = webboardPosts.find(p => p.id === item.id);
        if (originalPost) {
            setItemToEdit({ ...originalPost, isEditing: true });
            setEditingItemType('webboardPost');
            setSourceViewForForm(View.AdminDashboard);
            navigateTo(View.Webboard, 'create');
        } else { console.error("Webboard post not found for editing from Admin:", item); }
    }
  };

  const handleStartEditMyItem = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
    if (itemType === 'job') {
        const originalItem = jobs.find(j => j.id === itemId);
        if (originalItem && originalItem.userId === currentUser?.id) {
            setItemToEdit(originalItem);
            setEditingItemType(itemType);
            setSourceViewForForm(View.MyPosts);
            navigateTo(View.PostJob);
        } else { 
            alert("เกิดข้อผิดพลาด: ไม่พบรายการ หรือคุณไม่ใช่เจ้าของ"); 
        }
    } else if (itemType === 'profile') {
        const originalItem = helperProfiles.find(p => p.id === itemId);
        if (originalItem && originalItem.userId === currentUser?.id) {
            setItemToEdit(originalItem);
            setEditingItemType(itemType);
            setSourceViewForForm(View.MyPosts);
            navigateTo(View.OfferHelp);
        } else { 
            alert("เกิดข้อผิดพลาด: ไม่พบรายการ หรือคุณไม่ใช่เจ้าของ"); 
        }
    } else if (itemType === 'webboardPost') {
        const originalPost = webboardPosts.find(p => p.id === itemId);
        if (originalPost && originalPost.userId === currentUser?.id) {
            setItemToEdit({ ...originalPost, isEditing: true });
            setEditingItemType('webboardPost');
            setSourceViewForForm(View.MyPosts);
            navigateTo(View.Webboard, 'create');
        } else { 
            alert("เกิดข้อผิดพลาด: ไม่พบรายการ หรือคุณไม่ใช่เจ้าของ"); 
        }
    }
  };

  type JobFormData = Omit<Job, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt'>;
  type HelperProfileFormData = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt'>;


  const handleUpdateJob = (updatedJobDataFromForm: JobFormData & { id: string }) => {
    const originalJob = jobs.find(j => j.id === updatedJobDataFromForm.id);
    if (!originalJob) {
      alert('เกิดข้อผิดพลาด: ไม่พบประกาศงานเดิม');
      return;
    }
    if (originalJob.userId !== currentUser?.id && currentUser?.role !== UserRole.Admin) {
        alert('คุณไม่มีสิทธิ์แก้ไขประกาศงานนี้');
        return;
    }
    if (containsBlacklistedWords(updatedJobDataFromForm.description) || containsBlacklistedWords(updatedJobDataFromForm.title)) {
        alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม โปรดแก้ไข');
        return;
    }
    const contactInfo = currentUser ? generateContactString(currentUser) : 'ข้อมูลติดต่อไม่พร้อมใช้งาน';
    const updatedJob: Job = {
      ...originalJob,
      ...updatedJobDataFromForm,
      contact: contactInfo,
      updatedAt: new Date().toISOString(),
    };
    setJobs(prevJobs => prevJobs.map(j => (j.id === updatedJob.id ? updatedJob : j)));
    setItemToEdit(null);
    setEditingItemType(null);
    navigateTo(sourceViewForForm || View.Home);
    setSourceViewForForm(null);
    alert('แก้ไขประกาศงานเรียบร้อยแล้ว');
  };

  const handleUpdateHelperProfile = (updatedProfileDataFromForm: HelperProfileFormData & { id: string }) => {
    const originalProfile = helperProfiles.find(p => p.id === updatedProfileDataFromForm.id);
    if (!originalProfile) {
      alert('เกิดข้อผิดพลาด: ไม่พบโปรไฟล์เดิม');
      return;
    }
    if (originalProfile.userId !== currentUser?.id && currentUser?.role !== UserRole.Admin) {
        alert('คุณไม่มีสิทธิ์แก้ไขโปรไฟล์นี้');
        return;
    }
    if (containsBlacklistedWords(updatedProfileDataFromForm.details) || containsBlacklistedWords(updatedProfileDataFromForm.profileTitle)) {
        alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม โปรดแก้ไข');
        return;
    }
    const contactInfo = currentUser ? generateContactString(currentUser) : 'ข้อมูลติดต่อไม่พร้อมใช้งาน';
    const updatedProfile: HelperProfile = {
      ...originalProfile,
      ...updatedProfileDataFromForm,
      contact: contactInfo,
      updatedAt: new Date().toISOString(),
    };
    setHelperProfiles(prevProfiles => prevProfiles.map(p => (p.id === updatedProfile.id ? updatedProfile : p)));
    setItemToEdit(null);
    setEditingItemType(null);
    navigateTo(sourceViewForForm || View.Home);
    setSourceViewForForm(null);
    alert('แก้ไขโปรไฟล์ผู้ช่วยเรียบร้อยแล้ว');
  };

  const handleSubmitJobForm = (formDataFromForm: JobFormData & { id?: string }) => {
    if (containsBlacklistedWords(formDataFromForm.description) || containsBlacklistedWords(formDataFromForm.title)) {
        alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม โปรดแก้ไข');
        return;
    }
    if (formDataFromForm.id && itemToEdit && editingItemType === 'job') {
      handleUpdateJob(formDataFromForm as JobFormData & { id: string });
    } else {
      handleAddJob(formDataFromForm);
    }
  };

  const handleSubmitHelperProfileForm = (formDataFromForm: HelperProfileFormData & { id?: string }) => {
    if (containsBlacklistedWords(formDataFromForm.details) || containsBlacklistedWords(formDataFromForm.profileTitle)) {
        alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม โปรดแก้ไข');
        return;
    }
    if (formDataFromForm.id && itemToEdit && editingItemType === 'profile') {
      handleUpdateHelperProfile(formDataFromForm as HelperProfileFormData & { id: string });
    } else {
      handleAddHelperProfile(formDataFromForm);
    }
  };

  const handleCancelEditOrPost = () => {
    const targetView = sourceViewForForm || View.Home;
    setItemToEdit(null);
    setEditingItemType(null);
    setSourceViewForForm(null);
    setSelectedPostId(null);
    navigateTo(targetView);
  };

  const generateContactString = (user: User): string => {
    let contactParts: string[] = [];
    if (user.mobile) contactParts.push(`เบอร์โทร: ${user.mobile}`);
    if (user.lineId) contactParts.push(`LINE ID: ${user.lineId}`);
    if (user.facebook) contactParts.push(`Facebook: ${user.facebook}`);
    return contactParts.join('\n') || 'ไม่ระบุช่องทางติดต่อ';
  };

  const handleAddJob = useCallback((newJobData: JobFormData) => {
    if (!currentUser) {
      requestLoginForAction(View.PostJob);
      return;
    }
    if (containsBlacklistedWords(newJobData.description) || containsBlacklistedWords(newJobData.title)) {
        alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม โปรดแก้ไข');
        return;
    }
    const contactInfo = generateContactString(currentUser);
    const now = new Date().toISOString();
    const newJobWithUser: Job = {
      ...(newJobData as Omit<Job, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt'>),
      id: Date.now().toString(),
      postedAt: now,
      createdAt: now,
      updatedAt: now,
      userId: currentUser.id,
      username: currentUser.username,
      ownerId: currentUser.id, // For Firebase rules
      contact: contactInfo,
      isSuspicious: false,
      isPinned: false,
      isHired: false,
    };
    setJobs(prevJobs => [newJobWithUser, ...prevJobs]);
    navigateTo(sourceViewForForm === View.MyPosts ? View.MyPosts : View.FindJobs);
    setSourceViewForForm(null);
    alert('ประกาศงานของคุณถูกเพิ่มเรียบร้อยแล้ว!');
  }, [currentUser, sourceViewForForm, navigateTo, requestLoginForAction]);

  const handleAddHelperProfile = useCallback((newProfileData: HelperProfileFormData) => {
    if (!currentUser) {
      requestLoginForAction(View.OfferHelp);
      return;
    }
    if (containsBlacklistedWords(newProfileData.details) || containsBlacklistedWords(newProfileData.profileTitle)) {
        alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม โปรดแก้ไข');
        return;
    }
    if (!currentUser.gender || !currentUser.birthdate || !currentUser.educationLevel ||
        currentUser.gender === GenderOption.NotSpecified || currentUser.educationLevel === HelperEducationLevelOption.NotStated) {
        alert('กรุณาอัปเดตข้อมูลส่วนตัว (เพศ, วันเกิด, ระดับการศึกษา) ในหน้าโปรไฟล์ของคุณก่อนสร้างโปรไฟล์ผู้ช่วย');
        navigateTo(View.UserProfile);
        return;
    }

    const contactInfo = generateContactString(currentUser);
    const now = new Date().toISOString();
    const newProfileWithUser: HelperProfile = {
      ...(newProfileData as Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt'>),
      id: Date.now().toString(),
      postedAt: now,
      createdAt: now,
      updatedAt: now,
      userId: currentUser.id,
      username: currentUser.username,
      ownerId: currentUser.id, // For Firebase rules
      contact: contactInfo,
      gender: currentUser.gender,
      birthdate: currentUser.birthdate,
      educationLevel: currentUser.educationLevel,
      isSuspicious: false,
      isPinned: false,
      isUnavailable: false,
      adminVerifiedExperience: false,
      interestedCount: 0,
    };
    setHelperProfiles(prevProfiles => [newProfileWithUser, ...prevProfiles]);
    navigateTo(sourceViewForForm === View.MyPosts ? View.MyPosts : View.FindHelpers);
    setSourceViewForForm(null);
    alert('โปรไฟล์ของคุณถูกเพิ่มเรียบร้อยแล้ว!');
  }, [currentUser, sourceViewForForm, navigateTo, requestLoginForAction]);


  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalTitle(title);
    setConfirmModalMessage(message);
    setOnConfirmAction(() => onConfirm);
    setIsConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setConfirmModalMessage('');
    setConfirmModalTitle('');
    setOnConfirmAction(null);
  };

  const handleConfirmDeletion = () => {
    if (onConfirmAction) {
      onConfirmAction();
    }
    closeConfirmModal();
  };

  const handleDeleteItemFromMyPosts = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
    if (itemType === 'job') {
        handleDeleteJob(itemId);
    } else if (itemType === 'profile') {
        handleDeleteHelperProfile(itemId);
    } else if (itemType === 'webboardPost') {
        handleDeleteWebboardPost(itemId);
    }
  };

  const handleDeleteJob = (jobId: string) => {
    const jobToDelete = jobs.find(job => job.id === jobId);
    if (!jobToDelete) {
      alert('เกิดข้อผิดพลาด: ไม่พบประกาศงานที่ต้องการลบในระบบ');
      return;
    }
    if (jobToDelete.userId !== currentUser?.id && currentUser?.role !== UserRole.Admin) {
      alert('คุณไม่มีสิทธิ์ลบประกาศงานนี้');
      return;
    }

    openConfirmModal(
      'ยืนยันการลบประกาศงาน',
      `คุณแน่ใจหรือไม่ว่าต้องการลบประกาศงาน "${jobToDelete.title}" (ID: ${jobId})? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      () => {
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
        alert(`ลบประกาศงาน "${jobToDelete.title}" เรียบร้อยแล้ว`);
      }
    );
  };

  const handleDeleteHelperProfile = (profileId: string) => {
    const profileToDelete = helperProfiles.find(profile => profile.id === profileId);
     if (!profileToDelete) {
      alert('เกิดข้อผิดพลาด: ไม่พบโปรไฟล์ที่ต้องการลบในระบบ');
      return;
    }
    if (profileToDelete.userId !== currentUser?.id && currentUser?.role !== UserRole.Admin) {
      alert('คุณไม่มีสิทธิ์ลบโปรไฟล์นี้');
      return;
    }

    openConfirmModal(
      'ยืนยันการลบโปรไฟล์',
      `คุณแน่ใจหรือไม่ว่าต้องการลบโปรไฟล์ "${profileToDelete.profileTitle}" (ID: ${profileId})? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      () => {
        setHelperProfiles(prevProfiles => prevProfiles.filter(profile => profile.id !== profileId));
        alert(`ลบโปรไฟล์ "${profileToDelete.profileTitle}" เรียบร้อยแล้ว`);
      }
    );
  };

  const handleToggleSuspiciousJob = (jobId: string) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId ? { ...job, isSuspicious: !job.isSuspicious } : job
      )
    );
  };

  const handleToggleSuspiciousHelperProfile = (profileId: string) => {
    setHelperProfiles(prevProfiles =>
      prevProfiles.map(profile =>
        profile.id === profileId ? { ...profile, isSuspicious: !profile.isSuspicious } : profile
      )
    );
  };

  const handleTogglePinnedJob = (jobId: string) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId ? { ...job, isPinned: !job.isPinned } : job
      )
    );
  };

  const handleTogglePinnedHelperProfile = (profileId: string) => {
    setHelperProfiles(prevProfiles =>
      prevProfiles.map(profile =>
        profile.id === profileId ? { ...profile, isPinned: !profile.isPinned } : profile
      )
    );
  };

  const handleToggleVerifiedExperience = (profileId: string) => {
    setHelperProfiles(prevProfiles =>
      prevProfiles.map(profile =>
        profile.id === profileId ? { ...profile, adminVerifiedExperience: !profile.adminVerifiedExperience } : profile
      )
    );
  };


  const handleToggleHiredJobForUserOrAdmin = (jobId: string) => {
    setJobs(prevJobs =>
      prevJobs.map(job => {
        if (job.id === jobId) {
          if (job.userId === currentUser?.id || currentUser?.role === UserRole.Admin) {
            return { ...job, isHired: !job.isHired };
          }
        }
        return job;
      })
    );
  };

  const handleToggleUnavailableHelperProfileForUserOrAdmin = (profileId: string) => {
    setHelperProfiles(prevProfiles =>
      prevProfiles.map(profile => {
        if (profile.id === profileId) {
          if (profile.userId === currentUser?.id || currentUser?.role === UserRole.Admin) {
            return { ...profile, isUnavailable: !profile.isUnavailable };
          }
        }
        return profile;
      })
    );
  };

  const handleToggleItemStatusFromMyPosts = (itemId: string, itemType: 'job' | 'profile' | 'webboardPost') => {
    if (itemType === 'job') {
        handleToggleHiredJobForUserOrAdmin(itemId);
    } else if (itemType === 'profile') {
        handleToggleUnavailableHelperProfileForUserOrAdmin(itemId);
    }
  };

  const handleLogHelperContactInteraction = (helperProfileId: string) => {
    if (!currentUser) {
      requestLoginForAction(View.FindHelpers, { intent: 'contactHelper', postId: helperProfileId });
      return;
    }

    const helperProfile = helperProfiles.find(hp => hp.id === helperProfileId);
    if (!helperProfile) {
      console.warn(`Helper profile with ID ${helperProfileId} not found for interaction logging.`);
      return;
    }

    if (currentUser.id === helperProfile.userId) {
      return; 
    }

    let clickedMap: { [userId: string]: string[] } = {};
    const savedClickedMap = localStorage.getItem(USER_CLICKED_HELPERS_LS_KEY);
    if (savedClickedMap) {
      try {
        clickedMap = JSON.parse(savedClickedMap);
      } catch (e) {
        console.error("Error parsing clicked helpers map from localStorage", e);
      }
    }

    const userClickedList = clickedMap[currentUser.id] || [];

    if (userClickedList.includes(helperProfileId)) {
      // User has already "contacted" this specific profile
    } else {
      setHelperProfiles(prevProfiles =>
        prevProfiles.map(hp =>
          hp.id === helperProfileId
            ? { ...hp, interestedCount: (hp.interestedCount || 0) + 1 }
            : hp
        )
      );
      clickedMap[currentUser.id] = [...userClickedList, helperProfileId];
      localStorage.setItem(USER_CLICKED_HELPERS_LS_KEY, JSON.stringify(clickedMap));

      const newInteraction: Interaction = {
        interactionId: Date.now().toString() + Math.random().toString(36).substring(2, 15),
        helperUserId: helperProfile.userId, 
        employerUserId: currentUser.id,
        timestamp: new Date().toISOString(),
        type: 'contact_helper',
      };
      setInteractions(prevInteractions => [...prevInteractions, newInteraction]);
    }
  };


  const handleAddOrUpdateWebboardPost = (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => {
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: postIdToUpdate ? 'editPost' : 'createPost', postId: postIdToUpdate });
      return;
    }
    if (containsBlacklistedWords(postData.title) || containsBlacklistedWords(postData.body)) {
        alert('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม โปรดแก้ไข');
        return;
    }
    const now = new Date().toISOString();
    if (postIdToUpdate) {
        const postToEdit = webboardPosts.find(p => p.id === postIdToUpdate);
        if (!postToEdit) {
            alert('ไม่พบโพสต์ที่ต้องการแก้ไข');
            return;
        }
        if (postToEdit.userId !== currentUser.id && currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.Moderator) {
            alert('คุณไม่มีสิทธิ์แก้ไขโพสต์นี้');
            return;
        }
        setWebboardPosts(prevPosts =>
            prevPosts.map(post =>
                post.id === postIdToUpdate
                    ? { ...post, ...postData, category: postData.category, authorPhoto: currentUser.photo, updatedAt: now, isEditing: false }
                    : post
            )
        );
        alert('แก้ไขโพสต์เรียบร้อยแล้ว!');
    } else {
        const newPost: WebboardPost = {
            id: Date.now().toString(),
            title: postData.title,
            body: postData.body,
            category: postData.category,
            image: postData.image,
            ownerId: currentUser.id, 
            userId: currentUser.id,
            username: currentUser.username,
            authorPhoto: currentUser.photo,
            createdAt: now,
            updatedAt: now,
            likes: [],
            isPinned: false,
        };
        setWebboardPosts(prev => [newPost, ...prev]);
        alert('สร้างโพสต์ใหม่เรียบร้อยแล้ว!');
    }
    setItemToEdit(null);
    setEditingItemType(null);
    const newSelectedPostId = postIdToUpdate || webboardPosts.find(p => p.title === postData.title)?.id || null;
    setSelectedPostId(newSelectedPostId); 
    navigateTo(View.Webboard, newSelectedPostId); 
  };


  const handleAddWebboardComment = (postId: string, text: string) => {
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: 'comment', postId: postId });
      return;
    }
    if (containsBlacklistedWords(text)) {
        alert('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม โปรดแก้ไข');
        return;
    }
    const now = new Date().toISOString();
    const newComment: WebboardComment = {
      id: Date.now().toString(),
      postId,
      ownerId: currentUser.id, 
      userId: currentUser.id,
      username: currentUser.username,
      authorPhoto: currentUser.photo,
      text,
      createdAt: now,
      updatedAt: now,
    };
    setWebboardComments(prev => [...prev, newComment]);
  };

  const handleUpdateWebboardComment = (commentId: string, newText: string) => {
    if (!currentUser) {
      alert("คุณต้องเข้าสู่ระบบเพื่อแก้ไขคอมเมนต์");
      return;
    }
    if (containsBlacklistedWords(newText)) {
        alert('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม โปรดแก้ไข');
        return;
    }
    setWebboardComments(prevComments =>
      prevComments.map(comment => {
        if (comment.id === commentId && comment.userId === currentUser.id) {
          return { ...comment, text: newText, updatedAt: new Date().toISOString() };
        }
        return comment;
      })
    );
    alert('แก้ไขคอมเมนต์เรียบร้อยแล้ว');
  };

  const handleDeleteWebboardComment = (commentId: string) => {
    const commentToDelete = webboardComments.find(c => c.id === commentId);
    if (!commentToDelete) {
        alert('ไม่พบคอมเมนต์ที่ต้องการลบ');
        return;
    }
    if (!currentUser) {
        alert('คุณต้องเข้าสู่ระบบเพื่อลบคอมเมนต์');
        return;
    }

    const commentAuthor = users.find(u => u.id === commentToDelete.userId);
    
    let canDelete = false;
    if (commentToDelete.userId === currentUser.id) { // Author
        canDelete = true;
    } else if (currentUser.role === UserRole.Admin) { // Admin
        canDelete = true;
    } else if (currentUser.role === UserRole.Moderator) { // Moderator
        if (commentAuthor?.role !== UserRole.Admin) { // Mod can delete non-Admin comments
            canDelete = true;
        } else {
            alert("ผู้ตรวจการไม่สามารถลบคอมเมนต์ของแอดมินได้");
            return;
        }
    }

    if (!canDelete) {
        alert('คุณไม่มีสิทธิ์ลบคอมเมนต์นี้');
        return;
    }
    
    openConfirmModal(
        'ยืนยันการลบคอมเมนต์',
        `คุณแน่ใจหรือไม่ว่าต้องการลบคอมเมนต์นี้? การกระทำนี้ไม่สามารถย้อนกลับได้`,
        () => {
            setWebboardComments(prev => prev.filter(c => c.id !== commentId));
            alert('ลบคอมเมนต์เรียบร้อยแล้ว');
        }
    );
  };


  const handleToggleWebboardPostLike = (postId: string) => {
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: 'like', postId: postId });
      return;
    }
    setWebboardPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          const alreadyLiked = post.likes.includes(currentUser.id);
          return {
            ...post,
            likes: alreadyLiked
              ? post.likes.filter(uid => uid !== currentUser.id)
              : [...post.likes, currentUser.id],
          };
        }
        return post;
      })
    );
  };

  const handleDeleteWebboardPost = (postIdToDelete: string) => {
    const postToDelete = webboardPosts.find(p => p.id === postIdToDelete);
    if (!postToDelete) return;

    let canDelete = false;
    if (currentUser?.role === UserRole.Admin) {
        canDelete = true;
    } else if (currentUser?.role === UserRole.Moderator) {
        const postAuthor = users.find(u => u.id === postToDelete.userId);
        if (postAuthor?.role !== UserRole.Admin) {
            canDelete = true;
        } else {
            alert("ผู้ตรวจการไม่สามารถลบโพสต์ของแอดมินได้");
            return;
        }
    } else if (postToDelete.userId === currentUser?.id) {
        canDelete = true;
    }


    if (canDelete) {
       openConfirmModal(
        'ยืนยันการลบโพสต์',
        `คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์ "${postToDelete.title}"? การกระทำนี้ไม่สามารถย้อนกลับได้ และจะลบคอมเมนต์ทั้งหมดที่เกี่ยวข้องด้วย`,
        () => {
            setWebboardPosts(prev => prev.filter(p => p.id !== postIdToDelete));
            setWebboardComments(prev => prev.filter(c => c.postId !== postIdToDelete));
            alert(`ลบโพสต์ "${postToDelete.title}" เรียบร้อยแล้ว`);
            if (selectedPostId === postIdToDelete) {
                setSelectedPostId(null);
                navigateTo(View.Webboard);
            }
        }
        );
    } else {
        alert("คุณไม่มีสิทธิ์ลบโพสต์นี้");
    }
  };

  const handlePinWebboardPost = (postId: string) => {
    if (currentUser?.role !== UserRole.Admin) {
        alert("เฉพาะแอดมินเท่านั้นที่สามารถปักหมุดโพสต์ได้");
        return;
    }
    setWebboardPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId ? { ...post, isPinned: !post.isPinned } : post
      )
    );
  };

  const handleSetUserRole = (userIdToUpdate: string, newRole: UserRole) => {
    if (currentUser?.role !== UserRole.Admin) {
      alert("คุณไม่มีสิทธิ์เปลี่ยนบทบาทผู้ใช้");
      return;
    }
    if (userIdToUpdate === currentUser.id) {
        alert("ไม่สามารถเปลี่ยนบทบาทของตัวเองได้");
        return;
    }
    const userToUpdate = users.find(u => u.id === userIdToUpdate);
    if (userToUpdate && userToUpdate.role === UserRole.Admin && newRole !== UserRole.Admin) {
        alert("ไม่สามารถเปลี่ยนบทบาทของ Admin หลักได้");
        return;
    }

    setUsers(prevUsers =>
      prevUsers.map(u =>
        u.id === userIdToUpdate
          ? { ...u, role: newRole }
          : u
      )
    );
    alert(`อัปเดตบทบาทของผู้ใช้ @${users.find(u=>u.id===userIdToUpdate)?.username} เป็น ${newRole} เรียบร้อยแล้ว`);
  };


  const handleFeedbackSubmit = async (feedbackText: string): Promise<boolean> => {
    if (!feedbackText.trim()) {
        setFeedbackSubmissionStatus('error');
        setFeedbackSubmissionMessage('กรุณาใส่ความคิดเห็นของคุณ');
        return false;
    }

    setFeedbackSubmissionStatus('submitting');
    setFeedbackSubmissionMessage(null);

    try {
        // TODO (UX): Refactor to use a non-blocking toast notification system instead of alert.
        const response = await fetch('https://formspree.io/f/xvgaepzq', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                feedback: feedbackText,
                page: currentView,
                timestamp: new Date().toISOString(),
                userId: currentUser?.id || 'anonymous',
                username: currentUser?.username || 'anonymous',
                userAgent: navigator.userAgent,
            })
        });

        if (response.ok) {
            setFeedbackSubmissionStatus('success');
            setFeedbackSubmissionMessage('ขอบคุณสำหรับความคิดเห็นของคุณ!');
            setIsFeedbackModalOpen(false);

            setTimeout(() => {
                setFeedbackSubmissionStatus('idle');
                setFeedbackSubmissionMessage(null);
            }, 4000);
            return true;
        } else {
            const errorData = await response.json();
            console.error('Formspree error:', errorData);
            const errorMessage = errorData.errors?.map((e: { message: string }) => e.message).join(', ') || 'เกิดข้อผิดพลาดในการส่งความคิดเห็น โปรดลองอีกครั้ง';
            setFeedbackSubmissionStatus('error');
            setFeedbackSubmissionMessage(errorMessage);
            return false;
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        setFeedbackSubmissionStatus('error');
        setFeedbackSubmissionMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ โปรดลองอีกครั้ง');
        return false;
    }
  };

  const renderNavLinks = (isMobile: boolean) => {
    const displayBadge = getUserDisplayBadge(currentUser, webboardPosts, webboardComments);
    const commonButtonPropsBase = isMobile
      ? { size: 'md' as const, className: 'font-medium w-full text-left justify-start py-3 px-4 text-base' }
      : { size: 'sm' as const, className: 'font-medium flex-shrink-0' };

    const navigateAndCloseMenu = (view: View, payload?: any) => {
      navigateTo(view, payload); 
    };
    
    const navItemSpanClass = "inline-flex items-center gap-1.5"; 

    if (currentUser) {
        return (
          <>
            {isMobile && (
              <div className={`font-sans font-medium mb-3 py-2 px-4 border-b border-neutral-DEFAULT/50 dark:border-dark-border/50 w-full text-center`}>
                สวัสดี, @{currentUser.displayName}!
                <UserLevelBadge level={displayBadge} size="sm" />
              </div>
            )}
            {!isMobile && (
               <div className={`font-sans font-medium mr-3 text-xs sm:text-sm items-center flex`}> {/* Added mr-3 for more space */}
                สวัสดี, @{currentUser.displayName}!
                <UserLevelBadge level={displayBadge} size="sm" />
              </div>
            )}

            {currentView !== View.Home && (
              <Button onClick={() => navigateAndCloseMenu(View.Home)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>🏠</span><span>หน้าแรก</span></span>
              </Button>
            )}

            {currentView !== View.UserProfile && (
              <Button onClick={() => navigateAndCloseMenu(View.UserProfile)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>👤</span><span>โปรไฟล์ของฉัน</span></span>
              </Button>
            )}

            {currentUser.role !== UserRole.Admin && currentView !== View.MyPosts && (
                 <Button onClick={() => navigateAndCloseMenu(View.MyPosts)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                    <span className={navItemSpanClass}><span>📁</span><span>โพสต์ของฉัน</span></span>
                  </Button>
            )}

            {currentUser.role === UserRole.Admin && currentView !== View.AdminDashboard && (
              <Button onClick={() => navigateAndCloseMenu(View.AdminDashboard)} variant="accent" {...commonButtonPropsBase}>
                 <span className={navItemSpanClass}><span>🔐</span><span>Admin</span></span>
              </Button>
            )}

            {currentView !== View.Webboard && (
               <Button onClick={() => navigateAndCloseMenu(View.Webboard)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                 <span className={navItemSpanClass}><span>💬</span><span>กระทู้พูดคุย</span></span>
               </Button>
            )}
            
            {currentView === View.FindJobs ? (
              <Button onClick={() => { setSourceViewForForm(View.FindJobs); navigateAndCloseMenu(View.PostJob);}} variant="outline" colorScheme="primary" {...commonButtonPropsBase}>
                + ลงประกาศงาน
              </Button>
            ) : (currentView !== View.PostJob || (currentView === View.PostJob && itemToEdit)) && (
              <Button onClick={() => navigateAndCloseMenu(View.FindJobs)} variant="primary" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>👀</span><span>หางาน</span></span>
              </Button>
            )}
            {isMobile && currentView === View.PostJob && !itemToEdit && (
                <Button onClick={() => navigateAndCloseMenu(View.FindJobs)} variant="primary" {...commonButtonPropsBase}>
                  <span className={navItemSpanClass}><span>👀</span><span>หางาน</span></span>
                </Button>
            )}

            {currentView === View.FindHelpers ? (
              <Button onClick={() => { setSourceViewForForm(View.FindHelpers); navigateAndCloseMenu(View.OfferHelp);}} variant="outline" colorScheme="secondary" {...commonButtonPropsBase}>
                + เสนอตัวช่วยงาน
              </Button>
            ) : (currentView !== View.OfferHelp || (currentView === View.OfferHelp && itemToEdit )) && (
              <Button onClick={() => navigateAndCloseMenu(View.FindHelpers)} variant="secondary" {...commonButtonPropsBase}>
                <span className={navItemSpanClass}><span>🫂</span><span>ค้นหาผู้ช่วย</span></span>
              </Button>
            )}
            {isMobile && currentView === View.OfferHelp && !itemToEdit && (
                <Button onClick={() => navigateAndCloseMenu(View.FindHelpers)} variant="secondary" {...commonButtonPropsBase}>
                  <span className={navItemSpanClass}><span>🫂</span><span>ค้นหาผู้ช่วย</span></span>
                </Button>
            )}

            <Button
              onClick={handleLogout} 
              variant="outline"
              colorScheme="accent"
              className={`${commonButtonPropsBase.className} border-red-500 text-red-500 hover:bg-red-500 hover:text-white dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400 dark:hover:text-neutral-dark focus:ring-red-500 dark:focus:ring-red-400`}
              size={commonButtonPropsBase.size}
            >
              <span className={navItemSpanClass}><span>🔓</span><span>ออกจากระบบ</span></span>
            </Button>
          </>
        );
    } else {
        return (
            <>
              {currentView !== View.Home && (
                <Button onClick={() => navigateAndCloseMenu(View.Home)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                   <span className={navItemSpanClass}><span>🏠</span><span>หน้าแรก</span></span>
                </Button>
              )}
              <Button 
                onClick={() => navigateAndCloseMenu(View.Login)} 
                variant="outline" 
                colorScheme="brandGreen"
                size={commonButtonPropsBase.size}
                className={`${commonButtonPropsBase.className}`}
              >
                  <span className={navItemSpanClass}><span>🔑</span><span>เข้าสู่ระบบ</span></span>
              </Button>
              <Button onClick={() => navigateAndCloseMenu(View.Register)} variant="outline" colorScheme="neutral" {...commonButtonPropsBase}>
                 <span className={navItemSpanClass}><span>📝</span><span>ลงทะเบียน</span></span>
              </Button>
            </>
        );
    }
  };


  const renderHeader = () => {
    return (
      <header
        className="sticky top-0 z-30 w-full bg-headerBlue-DEFAULT text-neutral-dark p-3 sm:p-4 shadow-md"
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex-shrink-0">
            <span
              onClick={() => { navigateTo(View.Home); setIsMobileMenuOpen(false); }}
              className="cursor-pointer font-sans font-bold text-lg text-neutral-dark"
              aria-label="ไปหน้าแรก HAJOBJA.COM"
            >
              HAJOBJA.COM
            </span>
          </div>

          <div className="flex items-center flex-shrink-0">
              <nav className="hidden sm:flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
              {renderNavLinks(false)}
              </nav>

              <div className="sm:hidden ml-2">
              <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 rounded-md text-neutral-dark hover:bg-neutral/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-neutral"
                  aria-label="Open menu"
                  aria-expanded={isMobileMenuOpen}
              >
                  <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
              </button>
              </div>
          </div>
        </div>
      </header>
    );
  };

  const renderMobileMenu = () => {
    if (!isMobileMenuOpen) return null;

    return (
      <div className="fixed inset-0 z-40 sm:hidden" role="dialog" aria-modal="true">
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        ></div>

        <div
          className={`fixed top-0 right-0 h-full w-4/5 max-w-xs bg-white shadow-xl p-5 z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-sans font-semibold text-neutral-medium">เมนู</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 rounded-md text-neutral-dark hover:bg-neutral-light/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              aria-label="Close menu"
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col space-y-2">
            {renderNavLinks(true)}
          </nav>
        </div>
      </div>
    );
  };


  const renderHome = () => (
    <div className="flex flex-col items-center justify-center pt-3 sm:pt-4 pb-6 px-6 sm:pb-8 sm:px-8 text-center">
      <h2 className="text-3xl sm:text-4xl font-sans font-medium text-neutral-dark mb-2 tracking-tight leading-snug">
        ✨ หาจ๊อบจ้า ✨
      </h2>
      <p className="text-base sm:text-lg text-neutral-dark max-w-xl leading-relaxed mb-8 font-normal font-serif">
        เชื่อมคนมีสกิลกับงานที่ใช่ มีใจก็ลองดู ❤︎
      </p>

      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-primary/30">
          <h3 className="text-lg font-sans font-semibold text-primary mb-4">หาคนทำงาน</h3>
          <div className="space-y-4">
            <Button
              onClick={() => {
                setSourceViewForForm(View.Home);
                navigateTo(View.PostJob); 
              }}
              variant="primary"
              size="lg"
              className="w-full text-base md:text-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <span>📢</span>
                <span>มีงานด่วน? ฝากไว้ตรงนี้</span>
              </span>
            </Button>
            <Button
              onClick={() => navigateTo(View.FindHelpers)}
              variant="outline"
              colorScheme="primary"
              size="lg"
              className="w-full text-base md:text-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <span>🔍</span>
                <span>กำลังหาคนช่วย? ดูโปรไฟล์เลย</span>
              </span>
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-secondary/30">
          <h3 className="text-lg font-sans font-semibold text-secondary-hover mb-4">คนอยากหางาน</h3>
          <div className="space-y-4">
            <Button
              onClick={() => {
                setSourceViewForForm(View.Home);
                navigateTo(View.OfferHelp); 
              }}
              variant="secondary"
              size="lg"
              className="w-full text-base md:text-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <span>🙋</span>
                <span>ว่างอยู่! พร้อมรับงาน</span>
              </span>
            </Button>
            <Button
              onClick={() => navigateTo(View.FindJobs)}
              variant="outline"
              colorScheme="secondary"
              size="lg"
              className="w-full text-base md:text-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <span>👀</span>
                <span>อยากหางาน? ดูโพสต์งานเลย</span>
              </span>
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-8 text-center font-mono text-xs text-gray-400">
        HJJ v2 Beta
      </div>
    </div>
  );

  const renderPostJob = () => {
    if (!currentUser) {
      return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>;
    }
    return (
      <PostJobForm
        onSubmitJob={handleSubmitJobForm}
        onCancel={handleCancelEditOrPost}
        initialData={editingItemType === 'job' ? itemToEdit as Job : undefined}
        isEditing={!!itemToEdit && editingItemType === 'job'}
      />
    );
  };

  const renderOfferHelpForm = () => {
    if (!currentUser) {
      return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>;
    }
    return (
      <OfferHelpForm
        onSubmitProfile={handleSubmitHelperProfileForm}
        onCancel={handleCancelEditOrPost}
        initialData={editingItemType === 'profile' ? itemToEdit as HelperProfile : undefined}
        isEditing={!!itemToEdit && editingItemType === 'profile'}
      />
    );
  };

  const renderFindJobs = () => (
    <div className="container mx-auto p-4 sm:p-8">
      <h2 className="text-3xl font-sans font-semibold text-primary mb-3 text-center">👀 รายการงาน</h2>
      <p className="text-md font-serif text-neutral-dark mb-8 text-center max-w-xl mx-auto font-normal">
        มีเวลา มีทักษะ ลองทำดูนะ!
      </p>
      {currentUser && (
        <div className="text-center mb-8">
          <Button
            onClick={() => {
              setSourceViewForForm(View.FindJobs);
              navigateTo(View.PostJob);
            }}
            variant="primary"
            size="lg"
          >
            <span className="flex items-center justify-center gap-2">
              <span>📣</span>
              <span>มีงานด่วน? ฝากไว้ตรงนี้</span>
            </span>
          </Button>
        </div>
      )}
      {jobs.length === 0 ? (
        <div className="text-center py-10">
          <svg className="mx-auto h-24 w-24 text-neutral-DEFAULT" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <p className="mt-3 text-xl font-serif text-neutral-dark font-normal">ยังไม่มีงานประกาศในขณะนี้ ลองแวะมาใหม่นะ</p>
          {currentUser && jobs.length === 0 && ( 
            <Button onClick={() => { setSourceViewForForm(View.FindJobs); navigateTo(View.PostJob);}} variant="primary" size="md" className="mt-6 font-medium">
              เป็นคนแรกที่ลงประกาศงาน!
            </Button>
          )}
          {!currentUser && jobs.length === 0 && (
            <Button onClick={() => requestLoginForAction(View.PostJob)} variant="primary" size="md" className="mt-6 font-medium">
              เข้าสู่ระบบเพื่อลงประกาศงาน
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {jobs.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.postedAt instanceof Date ? b.postedAt.toISOString() : b.postedAt as string).getTime() - new Date(a.postedAt instanceof Date ? a.postedAt.toISOString() : a.postedAt as string).getTime()).map(job => (
            <JobCard key={job.id} job={job} navigateTo={navigateTo} currentUser={currentUser} requestLoginForAction={requestLoginForAction} />
          ))}
        </div>
      )}
    </div>
  );

  const renderFindHelpers = () => {
    const enrichedHelperProfilesList: EnrichedHelperProfile[] = helperProfiles.map(hp => {
      const user = users.find(u => u.id === hp.userId);
      return {
        ...hp,
        userPhoto: user?.photo,
        userAddress: user?.address,
        userDisplayName: user?.displayName || user?.username || 'User',
        verifiedExperienceBadge: hp.adminVerifiedExperience || false,
        profileCompleteBadge: user?.profileComplete || false,
        warningBadge: hp.isSuspicious || false,
        interestedCount: hp.interestedCount || 0,
      };
    }).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.postedAt instanceof Date ? b.postedAt.toISOString() : b.postedAt as string).getTime() - new Date(a.postedAt instanceof Date ? a.postedAt.toISOString() : a.postedAt as string).getTime());

    return (
    <div className="container mx-auto p-4 sm:p-8">
      <h2 className="text-3xl font-sans font-semibold text-secondary-hover mb-3 text-center">🧑‍🔧 คนขยันพร้อมช่วย อยู่ตรงนี้แล้ว</h2>
      <p className="text-md font-serif text-neutral-dark mb-8 text-center max-w-xl mx-auto font-normal">
        เลือกคนที่ตรงกับความต้องการ แล้วติดต่อได้เลย!
      </p>
      {currentUser && (
        <div className="text-center mb-8">
          <Button
            onClick={() => {
              setSourceViewForForm(View.FindHelpers);
              navigateTo(View.OfferHelp);
            }}
            variant="secondary"
            size="lg"
          >
            <span className="flex items-center justify-center gap-2">
              <span>🙋</span>
              <span>ว่างอยู่! พร้อมรับงาน</span>
            </span>
          </Button>
        </div>
      )}
      {enrichedHelperProfilesList.length === 0 ? (
         <div className="text-center py-10">
           <svg className="mx-auto h-24 w-24 text-neutral-DEFAULT" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-2.144M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <p className="mt-3 text-xl font-serif text-neutral-dark font-normal">ยังไม่มีผู้เสนอตัวช่วยงานในขณะนี้</p>
          {currentUser && enrichedHelperProfilesList.length === 0 && ( 
            <Button onClick={() => { setSourceViewForForm(View.FindHelpers); navigateTo(View.OfferHelp);}} variant="secondary" size="md" className="mt-6 font-medium">
              เป็นคนแรกที่เสนอตัวช่วยงาน!
            </Button>
          )}
          {!currentUser && enrichedHelperProfilesList.length === 0 && (
             <Button onClick={() => requestLoginForAction(View.OfferHelp)} variant="secondary" size="md" className="mt-6 font-medium">
              เข้าสู่ระบบเพื่อเสนอตัวช่วยงาน
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {enrichedHelperProfilesList.map(profile => (
            <HelperCard
              key={profile.id}
              profile={profile}
              onNavigateToPublicProfile={handleNavigateToPublicProfile}
              navigateTo={navigateTo}
              onLogHelperContact={() => handleLogHelperContactInteraction(profile.id)}
              currentUser={currentUser}
              requestLoginForAction={requestLoginForAction}
            />
          ))}
        </div>
      )}
    </div>
    );
  };

  const renderRegister = () => (
    <RegistrationForm onRegister={handleRegister} onSwitchToLogin={() => navigateTo(View.Login)} />
  );

  const renderLogin = () => (
    <LoginForm onLogin={handleLogin} onSwitchToRegister={() => navigateTo(View.Register)} />
  );

  const renderUserProfile = () => {
    if (!currentUser) {
      return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทางไปยังหน้าเข้าสู่ระบบ...</p>;
    }
    return (
      <UserProfilePage
        currentUser={currentUser}
        onUpdateProfile={handleUpdateUserProfile}
        onCancel={() => navigateTo(View.Home)}
      />
    );
  };

  const renderAdminDashboard = () => {
    if (currentUser?.role !== UserRole.Admin) {
      return <p className="text-center p-8 font-serif">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กำลังเปลี่ยนเส้นทาง...</p>;
    }
    return (
      <AdminDashboard
        jobs={jobs}
        helperProfiles={helperProfiles}
        users={users}
        interactions={interactions}
        webboardPosts={webboardPosts}
        webboardComments={webboardComments}
        onDeleteJob={handleDeleteJob}
        onDeleteHelperProfile={handleDeleteHelperProfile}
        onToggleSuspiciousJob={handleToggleSuspiciousJob}
        onToggleSuspiciousHelperProfile={handleToggleSuspiciousHelperProfile}
        onTogglePinnedJob={handleTogglePinnedJob}
        onTogglePinnedHelperProfile={handleTogglePinnedHelperProfile}
        onToggleHiredJob={handleToggleHiredJobForUserOrAdmin}
        onToggleUnavailableHelperProfile={handleToggleUnavailableHelperProfileForUserOrAdmin}
        onToggleVerifiedExperience={handleToggleVerifiedExperience}
        onDeleteWebboardPost={handleDeleteWebboardPost}
        onPinWebboardPost={handlePinWebboardPost}
        onStartEditItem={handleStartEditItemFromAdmin}
        onSetUserRole={handleSetUserRole}
        currentUser={currentUser}
        isSiteLocked={isSiteLocked}
        onToggleSiteLock={handleToggleSiteLock}
      />
    );
  };

  const renderMyPostsPage = () => {
    if (!currentUser || currentUser.role === UserRole.Admin) {
        return <p className="text-center p-8 font-serif">กำลังเปลี่ยนเส้นทาง...</p>;
    }
    return (
        <MyPostsPage
            currentUser={currentUser}
            jobs={jobs}
            helperProfiles={helperProfiles}
            webboardPosts={webboardPosts}
            webboardComments={webboardComments}
            onEditItem={handleStartEditMyItem}
            onDeleteItem={handleDeleteItemFromMyPosts}
            onToggleHiredStatus={handleToggleItemStatusFromMyPosts}
            navigateTo={navigateTo}
            getUserDisplayBadge={(user) => getUserDisplayBadge(user, webboardPosts, webboardComments)}
        />
    );
  };

  const renderAboutUsPage = () => <AboutUsPage />;
  const renderSafetyPage = () => <SafetyPage />;

  const renderPublicProfile = () => {
    if (!currentUser) { 
      return <p className="text-center p-8 font-serif">คุณต้องเข้าสู่ระบบเพื่อดูโปรไฟล์นี้ กำลังเปลี่ยนเส้นทาง...</p>;
    }
    if (!viewingProfileId) {
      navigateTo(View.Home); 
      return <p className="text-center p-8 font-serif">ไม่พบ ID โปรไฟล์...</p>;
    }
    const profileUser = users.find(u => u.id === viewingProfileId);
    if (!profileUser) {
      return <p className="text-center p-8 font-serif text-red-500 dark:text-red-400">ไม่พบโปรไฟล์ผู้ใช้</p>;
    }
    if (profileUser.role === UserRole.Admin) {
        return <div className="text-center p-8 font-serif text-red-500 dark:text-red-400">โปรไฟล์ของแอดมินไม่สามารถดูในหน้านี้ได้</div>;
    }

    const helperProfileForBio = helperProfiles.find(hp => hp.userId === viewingProfileId);
    const displayBadge = getUserDisplayBadge(profileUser, webboardPosts, webboardComments);
    return <PublicProfilePage currentUser={currentUser} user={{...profileUser, userLevel: displayBadge}} helperProfile={helperProfileForBio} onBack={() => navigateTo(View.FindHelpers)} />;
  };

  const renderWebboardPage = () => (
    <WebboardPage
        currentUser={currentUser}
        users={users}
        posts={webboardPosts}
        comments={webboardComments}
        onAddOrUpdatePost={handleAddOrUpdateWebboardPost}
        onAddComment={handleAddWebboardComment}
        onToggleLike={handleToggleWebboardPostLike}
        onDeletePost={handleDeleteWebboardPost}
        onPinPost={handlePinWebboardPost}
        onEditPost={(post) => {
            setItemToEdit({...post, isEditing: true});
            setEditingItemType('webboardPost');
            setSelectedPostId('create'); 
            setCurrentView(View.Webboard); 
        }}
        onDeleteComment={handleDeleteWebboardComment}
        onUpdateComment={handleUpdateWebboardComment}
        selectedPostId={selectedPostId} 
        setSelectedPostId={setSelectedPostId} 
        navigateTo={navigateTo}
        editingPost={editingItemType === 'webboardPost' ? itemToEdit as WebboardPost : null}
        onCancelEdit={() => {
            setItemToEdit(null);
            setEditingItemType(null);
            setSelectedPostId(null); 
        }}
        getUserDisplayBadge={(user) => getUserDisplayBadge(user, webboardPosts, webboardComments)}
        requestLoginForAction={requestLoginForAction}
    />
  );


  let currentViewContent;
  switch (currentView) {
    case View.Home:
      currentViewContent = renderHome();
      break;
    case View.PostJob:
      currentViewContent = renderPostJob();
      break;
    case View.FindJobs:
      currentViewContent = renderFindJobs();
      break;
    case View.OfferHelp:
      currentViewContent = renderOfferHelpForm();
      break;
    case View.FindHelpers:
      currentViewContent = renderFindHelpers();
      break;
    case View.Register:
      currentViewContent = renderRegister();
      break;
    case View.Login:
      currentViewContent = renderLogin();
      break;
    case View.AdminDashboard:
      currentViewContent = renderAdminDashboard();
      break;
    case View.MyPosts:
      currentViewContent = renderMyPostsPage();
      break;
    case View.UserProfile:
      currentViewContent = renderUserProfile();
      break;
    case View.AboutUs:
      currentViewContent = renderAboutUsPage();
      break;
    case View.PublicProfile:
      currentViewContent = renderPublicProfile();
      break;
    case View.Safety:
      currentViewContent = renderSafetyPage();
      break;
    case View.Webboard:
      currentViewContent = renderWebboardPage();
      break;
    default:
      currentViewContent = renderHome();
  }

  if (isSiteLocked && currentUser?.role !== UserRole.Admin) {
    return <SiteLockOverlay />;
  }

  return (
    <>
      {renderMobileMenu()}
      <div className="flex flex-col flex-1 bg-neutral-light min-h-screen">
        {renderHeader()}
        <main className="flex-1 overflow-y-auto pt-20 sm:pt-24 pb-16"> 
          {currentViewContent}
        </main>
        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={closeConfirmModal}
          onConfirm={handleConfirmDeletion}
          title={confirmModalTitle}
          message={confirmModalMessage}
        />
        <FeedbackForm
            isOpen={isFeedbackModalOpen}
            onClose={() => {
                setIsFeedbackModalOpen(false);
                if (feedbackSubmissionStatus !== 'success') {
                  setFeedbackSubmissionStatus('idle');
                  setFeedbackSubmissionMessage(null);
                }
            }}
            onSubmit={handleFeedbackSubmit}
            submissionStatus={feedbackSubmissionStatus}
            submissionMessage={feedbackSubmissionMessage}
        />
        {feedbackSubmissionStatus === 'success' && feedbackSubmissionMessage && !isFeedbackModalOpen && (
            <div
                className="fixed bottom-24 sm:bottom-5 right-5 p-3 rounded-md shadow-lg text-sm font-medium z-[60] transition-opacity duration-300 ease-in-out bg-green-100 dark:bg-green-700/80 border border-green-300 dark:border-green-500 text-green-700 dark:text-green-200"
                role="alert"
            >
                {feedbackSubmissionMessage}
            </div>
        )}
      </div>
    </>
  );
};

export default App;
