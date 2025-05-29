

export interface Job {
  id: string;
  title: string;
  location: string;
  dateTime: string;
  payment: string;
  contact: string;
  description: string;
  desiredAgeStart?: number;
  desiredAgeEnd?: number;
  preferredGender?: 'ชาย' | 'หญิง' | 'ไม่จำกัด';
  desiredEducationLevel?: JobDesiredEducationLevelOption;
  dateNeededFrom?: string | Date;
  dateNeededTo?: string | Date;
  timeNeededStart?: string;
  timeNeededEnd?: string;
  postedAt?: string | Date; // Can be ISO string or Firestore Timestamp
  userId: string;
  username: string;
  ownerId?: string; // For Firebase rules
  isSuspicious?: boolean;
  isPinned?: boolean;
  isHired?: boolean;
  createdAt?: string | Date; // Firestore Timestamp
  updatedAt?: string | Date; // Firestore Timestamp
}

export enum GenderOption {
  Male = 'ชาย',
  Female = 'หญิง',
  Other = 'อื่น ๆ / เพศทางเลือก',
  NotSpecified = 'ไม่ระบุ',
}

export enum JobDesiredEducationLevelOption {
  Any = 'ไม่จำกัด',
  MiddleSchool = 'ม.ต้น',
  HighSchool = 'ม.ปลาย',
  Vocational = 'ปวช./ปวส.',
  Bachelor = 'ปริญญาตรี',
  Higher = 'สูงกว่าปริญญาตรี',
}

export enum HelperEducationLevelOption {
  NotStated = 'ไม่ได้ระบุ',
  MiddleSchool = 'ม.ต้น',
  HighSchool = 'ม.ปลาย',
  Vocational = 'ปวช./ปวس.',
  Bachelor = 'ปริญญาตรี',
  Higher = 'สูงกว่าปริญญาตรี',
}

export interface HelperProfile {
  id: string;
  profileTitle: string;
  details: string;
  area: string;
  availability: string;
  contact: string;
  gender?: GenderOption;
  birthdate?: string;
  educationLevel?: HelperEducationLevelOption;
  availabilityDateFrom?: string | Date;
  availabilityDateTo?: string | Date;
  availabilityTimeDetails?: string;
  postedAt?: string | Date;
  userId: string;
  username: string;
  ownerId?: string; // For Firebase rules
  isSuspicious?: boolean;
  isPinned?: boolean;
  isUnavailable?: boolean;
  adminVerifiedExperience?: boolean;
  interestedCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export enum UserRole {
  Admin = 'Admin',
  Moderator = 'Moderator',
  Member = 'Member',
}

export interface User {
  id: string; // Firebase Auth UID
  displayName: string;
  username: string;
  email: string;
  hashedPassword?: string; // Not stored in Firestore if using Firebase Auth
  role: UserRole;
  mobile: string;
  lineId?: string;
  facebook?: string;
  gender?: GenderOption;
  birthdate?: string;
  educationLevel?: HelperEducationLevelOption;
  photo?: string;
  address?: string;

  favoriteMusic?: string;
  favoriteBook?: string;
  favoriteMovie?: string;
  hobbies?: string;
  favoriteFood?: string;
  dislikedThing?: string;
  introSentence?: string;

  profileComplete?: boolean;
  userLevel: UserLevel;
  isMuted?: boolean; // For Firebase rules and app logic
  createdAt?: string | Date;
  updatedAt?: string | Date;
  // isAdmin flag can be derived from 'role'
}

export enum View {
  Home = 'HOME',
  PostJob = 'POST_JOB',
  FindJobs = 'FIND_JOBS',
  OfferHelp = 'OFFER_HELP',
  FindHelpers = 'FIND_HELPERS',
  Login = 'LOGIN',
  Register = 'REGISTER',
  AdminDashboard = 'ADMIN_DASHBOARD',
  MyPosts = 'MY_POSTS',
  UserProfile = 'USER_PROFILE',
  AboutUs = 'ABOUT_US',
  PublicProfile = 'PUBLIC_PROFILE',
  Safety = 'SAFETY',
  Webboard = 'WEBBOARD',
}

export interface EnrichedHelperProfile extends HelperProfile {
  userPhoto?: string;
  userAddress?: string;
  userDisplayName: string;
  profileCompleteBadge: boolean;
  warningBadge: boolean;
  verifiedExperienceBadge: boolean;
}

export interface Interaction {
  interactionId: string;
  helperUserId: string;
  employerUserId: string;
  timestamp: string | Date;
  type: 'contact_helper';
  // Add ownerId if needed by rules, though interactions might be simpler
  // ownerId?: string;
  createdAt?: string | Date;
}

// --- Webboard/Blog System Types ---
export enum WebboardCategory {
  QA = "ถาม-ตอบ",
  Knowledge = "ความรู้",
  HowTo = "How-to",
  General = "ทั่วไป",
  Other = "อื่น ๆ",
}

export const WEBBOARD_CATEGORY_STYLES: Record<WebboardCategory, { bg: string; text: string; border?: string }> = {
  [WebboardCategory.QA]: { bg: 'bg-blue-100 dark:bg-blue-700/40', text: 'text-blue-700 dark:text-blue-200', border: 'border-blue-300 dark:border-blue-500' },
  [WebboardCategory.Knowledge]: { bg: 'bg-green-100 dark:bg-green-700/40', text: 'text-green-700 dark:text-green-200', border: 'border-green-300 dark:border-green-500' },
  [WebboardCategory.HowTo]: { bg: 'bg-purple-100 dark:bg-purple-700/40', text: 'text-purple-700 dark:text-purple-200', border: 'border-purple-300 dark:border-purple-500' },
  [WebboardCategory.General]: { bg: 'bg-gray-100 dark:bg-gray-700/40', text: 'text-gray-700 dark:text-gray-200', border: 'border-gray-300 dark:border-gray-500' },
  [WebboardCategory.Other]: { bg: 'bg-pink-100 dark:bg-pink-700/40', text: 'text-pink-700 dark:text-pink-200', border: 'border-pink-300 dark:border-pink-500' },
};

export interface WebboardPost {
  id: string;
  title: string;
  body: string;
  category: WebboardCategory;
  image?: string;
  userId: string;
  username: string;
  ownerId?: string; // For Firebase rules
  authorPhoto?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  likes: string[];
  isPinned?: boolean;
  isEditing?: boolean;
}

export interface WebboardComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  ownerId?: string; // For Firebase rules
  authorPhoto?: string;
  text: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export enum UserLevelName {
  Level1_NewbiePoster = "🐣 มือใหม่หัดโพสต์",
  Level2_FieryNewbie = "🔥 เด็กใหม่ไฟแรง",
  Level3_RegularSenior = "👑 รุ่นพี่ขาประจำ",
  Level4_ClassTeacher = "📘 ครูประจำชั้น",
  Level5_KnowledgeGuru = "🧠 กูรูผู้รอบรู้",
  Level6_BoardFavorite = "💖 ขวัญใจชาวบอร์ด",
  Level7_LegendOfHajobjah = "🪄 ตำนานผู้มีของหาจ๊อบจ้า",
}

export interface UserLevel {
  name: string;
  minScore?: number;
  colorClass: string;
  textColorClass?: string;
}

export const USER_LEVELS: UserLevel[] = [
  { name: UserLevelName.Level1_NewbiePoster, minScore: 0, colorClass: 'bg-green-200 dark:bg-green-700/50', textColorClass: 'text-green-800 dark:text-green-200' },
  { name: UserLevelName.Level2_FieryNewbie, minScore: 5, colorClass: 'bg-lime-200 dark:bg-lime-700/50', textColorClass: 'text-lime-800 dark:text-lime-200' },
  { name: UserLevelName.Level3_RegularSenior, minScore: 15, colorClass: 'bg-cyan-200 dark:bg-cyan-700/50', textColorClass: 'text-cyan-800 dark:text-cyan-200' },
  { name: UserLevelName.Level4_ClassTeacher, minScore: 30, colorClass: 'bg-amber-300 dark:bg-amber-600/60', textColorClass: 'text-amber-800 dark:text-amber-100' },
  { name: UserLevelName.Level5_KnowledgeGuru, minScore: 50, colorClass: 'bg-violet-300 dark:bg-violet-600/60', textColorClass: 'text-violet-800 dark:text-violet-100' },
  { name: UserLevelName.Level6_BoardFavorite, minScore: 80, colorClass: 'bg-pink-300 dark:bg-pink-600/60', textColorClass: 'text-pink-800 dark:text-pink-100' },
  { name: UserLevelName.Level7_LegendOfHajobjah, minScore: 120, colorClass: 'bg-teal-300 dark:bg-teal-600/60', textColorClass: 'text-teal-800 dark:text-teal-100' },
];

export const ADMIN_BADGE_DETAILS: UserLevel = {
  name: "🌟 ผู้พิทักษ์จักรวาล",
  colorClass: 'bg-yellow-100 dark:bg-yellow-700/30',
  textColorClass: 'text-yellow-800 dark:text-yellow-200',
};

export const MODERATOR_BADGE_DETAILS: UserLevel = {
  name: "👮 ผู้ตรวจการ",
  colorClass: 'bg-blue-400 dark:bg-blue-500/70',
  textColorClass: 'text-blue-900 dark:text-blue-50',
};

export interface EnrichedWebboardPost extends WebboardPost {
  commentCount: number;
  authorLevel: UserLevel;
  isAuthorAdmin?: boolean;
}

export interface EnrichedWebboardComment extends WebboardComment {
  authorLevel: UserLevel;
}

// For site configuration in Firestore, e.g., /config/siteStatus
export interface SiteConfig {
    isSiteLocked: boolean;
    updatedAt?: string | Date;
    updatedBy?: string; // Admin UID
}

// Added for firebaseService.ts, previously in App.tsx
export const DUMMY_WEBBOARD_POSTS: WebboardPost[] = [
  {
    id: 'dummy-post-001',
    title: "👋 ยินดีต้อนรับสู่เว็บบอร์ดหาจ๊อบจ้า!",
    body: "สวัสดีครับทุกคน! นี่คือพื้นที่สำหรับพูดคุย แลกเปลี่ยนความคิดเห็น และช่วยเหลือกันในชุมชนหาจ๊อบจ้าของเรานะครับ มีอะไรอยากแชร์ อยากถาม โพสต์ได้เลย! \n\nอย่าลืมอ่านกฎกติกาของบอร์ดเราด้วยนะ 😊",
    category: WebboardCategory.General,
    userId: 'admin-user-001', // Matched to default admin in firebaseService
    username: 'admin',
    ownerId: 'admin-user-001',
    authorPhoto: undefined,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    likes: ['test-user-002'], // Matched to default test user
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
  // ... other dummy posts if any ...
];

// Added from App.tsx for firebaseService.ts
export const ADMIN_USERNAME = "admin";
export const ADMIN_EMAIL = "admin@hajobjah.com";
export const ADMIN_PASSWORD = "adminpass";
