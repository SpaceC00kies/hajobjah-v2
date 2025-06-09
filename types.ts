
export interface Job {
  id: string;
  title: string;
  location: string;
  dateTime: string;
  payment: string;
  contact: string;
  description: string;
  category: JobCategory;
  subCategory?: JobSubCategory;
  desiredAgeStart?: number;
  desiredAgeEnd?: number;
  preferredGender?: 'ชาย' | 'หญิง' | 'ไม่จำกัด';
  desiredEducationLevel?: JobDesiredEducationLevelOption;
  dateNeededFrom?: string | Date;
  dateNeededTo?: string | Date;
  timeNeededStart?: string;
  timeNeededEnd?: string;
  postedAt?: string | Date;
  userId: string;
  authorDisplayName: string;
  ownerId?: string;
  isSuspicious?: boolean;
  isPinned?: boolean;
  isHired?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  // New fields for expiration
  expiresAt?: string | Date; // Date when the job expires
  isExpired?: boolean;     // Flag indicating if the job has expired
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
  Vocational = 'ปวช./ปวส.',
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
  category: JobCategory;
  subCategory?: JobSubCategory;
  gender?: GenderOption;
  birthdate?: string;
  educationLevel?: HelperEducationLevelOption;
  availabilityDateFrom?: string | Date;
  availabilityDateTo?: string | Date;
  availabilityTimeDetails?: string;
  postedAt?: string | Date;
  userId: string;
  authorDisplayName: string;
  ownerId?: string;
  isSuspicious?: boolean;
  isPinned?: boolean;
  isUnavailable?: boolean;
  adminVerifiedExperience?: boolean;
  interestedCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  // New fields for expiration and bump feature
  expiresAt?: string | Date;   // Date when the profile expires
  isExpired?: boolean;       // Flag indicating if the profile has expired
  lastBumpedAt?: string | Date; // Timestamp of the last successful bump
}

export enum UserRole {
  Admin = 'Admin',
  Moderator = 'Moderator',
  Member = 'Member',
}

export interface UserPostingLimits {
  lastJobPostDate?: string | Date; // Cooldown for jobs
  lastHelperProfileDate?: string | Date; // Cooldown for helper profiles
  dailyWebboardPosts: { // Retained for structure, not active limiting
    count: number;
    resetDate: string | Date; 
  };
  hourlyComments: { // Retained for structure, not active limiting
    count: number;
    resetTime: string | Date; 
  };
  lastBumpDates: { 
    [profileId: string]: string | Date;
  };
}

export interface UserActivityBadge {
  isActive: boolean; 
  lastActivityCheck?: string | Date; 
  last30DaysActivity: number; 
}

export type UserTier = 'free' | 'premium';


export interface User {
  id: string;
  publicDisplayName: string;
  username: string;
  email: string;
  role: UserRole;
  tier: UserTier; 
  mobile: string;
  lineId?: string;
  facebook?: string;
  gender?: GenderOption;
  birthdate?: string;
  educationLevel?: HelperEducationLevelOption;
  photo?: string;
  address?: string;
  nickname?: string;
  firstName?: string;
  lastName?: string;
  favoriteMusic?: string;
  favoriteBook?: string;
  favoriteMovie?: string;
  hobbies?: string;
  favoriteFood?: string;
  dislikedThing?: string;
  introSentence?: string;
  profileComplete?: boolean;
  userLevel: UserLevel; // This general user level badge remains for profiles etc.
  isMuted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  postingLimits: UserPostingLimits;
  activityBadge: UserActivityBadge;
  savedWebboardPosts?: string[]; // Array of saved post IDs
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
  PasswordReset = 'PASSWORD_RESET',
  CREATE_WEBBOARD_POST = 'CREATE_WEBBOARD_POST', // Added this line
}

export interface EnrichedHelperProfile extends HelperProfile {
  userPhoto?: string;
  userAddress?: string;
  profileCompleteBadge: boolean;
  warningBadge: boolean;
  verifiedExperienceBadge: boolean;
}

export interface Interaction {
  id: string;
  helperUserId: string;
  helperProfileId?: string;
  employerUserId: string;
  timestamp: string | Date;
  type: 'contact_helper';
  createdAt?: string | Date;
}

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

export enum JobCategory {
  DigitalCreative = 'งานดิจิทัลและสร้างสรรค์',
  EducationTutoring = 'การศึกษาและติวเตอร์',
  BusinessAdminSupport = 'งานธุรกิจและสนับสนุนงานธุรการ',
  ITTechnical = 'งานไอทีและเทคนิค',
  SalesEventsPromotion = 'งานขาย, อีเวนต์ และโปรโมชัน',
  HomeDeliveryLifestyle = 'งานบ้าน, รับส่งของ และไลฟ์สไตล์',
  FoodService = 'งานอาหารและบริการ',
  HealthFitnessWellness = 'สุขภาพ ฟิตเนส และสุขภาวะ',
  ArtsCraftsPerformance = 'ศิลปะ งานฝีมือ และการแสดง',
  ShortTermMisc = 'งานระยะสั้นและงานจิปาถะ',
}

export type FilterableCategory = JobCategory | 'all';

export const JOB_CATEGORY_EMOJIS_MAP: Record<JobCategory, string> = {
  [JobCategory.DigitalCreative]: '🎨',
  [JobCategory.EducationTutoring]: '📚',
  [JobCategory.BusinessAdminSupport]: '💼',
  [JobCategory.ITTechnical]: '💻',
  [JobCategory.SalesEventsPromotion]: '🎉',
  [JobCategory.HomeDeliveryLifestyle]: '🏠',
  [JobCategory.FoodService]: '🍽️',
  [JobCategory.HealthFitnessWellness]: '💪',
  [JobCategory.ArtsCraftsPerformance]: '🎭',
  [JobCategory.ShortTermMisc]: '⚡',
};


export const JOB_CATEGORY_STYLES: Record<JobCategory, { bg: string; text: string; border?: string }> = {
  [JobCategory.DigitalCreative]: { bg: 'bg-violet-100 dark:bg-violet-700/40', text: 'text-violet-700 dark:text-violet-200', border: 'border-violet-300 dark:border-violet-500' },
  [JobCategory.EducationTutoring]: { bg: 'bg-teal-100 dark:bg-teal-700/40', text: 'text-teal-700 dark:text-teal-200', border: 'border-teal-300 dark:border-teal-500' },
  [JobCategory.BusinessAdminSupport]: { bg: 'bg-slate-100 dark:bg-slate-700/40', text: 'text-slate-700 dark:text-slate-200', border: 'border-slate-300 dark:border-slate-500' },
  [JobCategory.ITTechnical]: { bg: 'bg-blue-100 dark:bg-blue-700/40', text: 'text-blue-700 dark:text-blue-200', border: 'border-blue-300 dark:border-blue-500' },
  [JobCategory.SalesEventsPromotion]: { bg: 'bg-rose-100 dark:bg-rose-700/40', text: 'text-rose-700 dark:text-rose-200', border: 'border-rose-300 dark:border-rose-500' },
  [JobCategory.HomeDeliveryLifestyle]: { bg: 'bg-orange-100 dark:bg-orange-700/40', text: 'text-orange-700 dark:text-orange-200', border: 'border-orange-300 dark:border-orange-500' },
  [JobCategory.FoodService]: { bg: 'bg-lime-100 dark:bg-lime-700/40', text: 'text-lime-700 dark:text-lime-200', border: 'border-lime-300 dark:border-lime-500' },
  [JobCategory.HealthFitnessWellness]: { bg: 'bg-cyan-100 dark:bg-cyan-700/40', text: 'text-cyan-700 dark:text-cyan-200', border: 'border-cyan-300 dark:border-cyan-500' },
  [JobCategory.ArtsCraftsPerformance]: { bg: 'bg-fuchsia-100 dark:bg-fuchsia-700/40', text: 'text-fuchsia-700 dark:text-fuchsia-200', border: 'border-fuchsia-300 dark:border-fuchsia-500' },
  [JobCategory.ShortTermMisc]: { bg: 'bg-pink-100 dark:bg-pink-700/40', text: 'text-pink-700 dark:text-pink-200', border: 'border-pink-300 dark:border-pink-500' },
};

export enum JobSubCategory {
  DigitalCreative_GraphicDesign = "ออกแบบกราฟิก (โลโก้, โปสเตอร์, สื่อโซเชียล)",
  DigitalCreative_WritingTranslation = "เขียนและแปลภาษา (แปลภาษา, เขียนบทความ, คอนเทนต์)",
  DigitalCreative_WebMobileDev = "พัฒนาเว็บไซต์และแอป (เว็บไซต์, แอพมือถือ)",
  DigitalCreative_VideoAudioEditing = "ตัดต่อวิดีโอและเสียง (ตัดต่อวิดีโอ, ทำเพลง, พากย์เสียง)",
  DigitalCreative_MarketingSocialMedia = "การตลาดและโซเชียลมีเดีย (บริหารเพจ, โฆษณาออนไลน์)",
  EducationTutoring_LanguageTeaching = "สอนภาษา (สอนภาษาอังกฤษ, จีน, ญี่ปุ่น ฯลฯ)",
  EducationTutoring_AcademicTutoring = "ติววิชาการ (คณิต, วิทย์, สังคม, ดนตรี)",
  EducationTutoring_ExamPrep = "ติวสอบ (GAT/PAT, IELTS/TOEFL)",
  EducationTutoring_WorkshopCraftTeaching = "สอนเวิร์กช็อป/งานฝีมือ",
  BusinessAdminSupport_DataEntry = "คีย์ข้อมูล",
  BusinessAdminSupport_OnlineAssistant = "ผู้ช่วยออนไลน์",
  BusinessAdminSupport_CustomerService = "บริการลูกค้า",
  BusinessAdminSupport_AccountingFinance = "บัญชีและการเงิน",
  BusinessAdminSupport_MarketResearch = "งานวิจัย/สำรวจตลาด",
  ITTechnical_SoftwareDevelopment = "พัฒนาโปรแกรม",
  ITTechnical_ITSupportRepair = "ซ่อมคอมและช่วยเหลือด้านไอที",
  ITTechnical_AIDataAnalysis = "งาน AI และวิเคราะห์ข้อมูล",
  ITTechnical_WebsiteMaintenance = "ดูแลเว็บไซต์",
  SalesEventsPromotion_SalesPromotionStaff = "พนักงานขาย/โปรโมทสินค้า",
  SalesEventsPromotion_EventStaffMCFlyer = "พนักงานอีเวนต์/MC/แจกใบปลิว",
  SalesEventsPromotion_MarketSurveyStaff = "สำรวจตลาด",
  SalesEventsPromotion_BoothStaff = "พนักงานบูธ/ออกบูธ",
  HomeDeliveryLifestyle_HousekeepingCleaning = "แม่บ้าน/ทำความสะอาด",
  HomeDeliveryLifestyle_DeliveryErrands = "รับส่งของ/งานธุรการ (รับ-ส่งเอกสาร, ช่วยซื้อของ)",
  HomeDeliveryLifestyle_RepairmanHandyman = "ช่างซ่อม/ซ่อมแซม (ช่างไฟ, ช่างประปา)",
  HomeDeliveryLifestyle_GardeningPetCare = "ดูแลสวน/สัตว์เลี้ยง (เดินสุนัข, เลี้ยงสัตว์)",
  HomeDeliveryLifestyle_MovingHauling = "ช่วยขนย้าย/รถรับจ้าง",
  FoodService_Barista = "พนักงานร้านกาแฟ",
  FoodService_KitchenAssistantCook = "ผู้ช่วยครัว/พ่อครัว/แม่ครัว",
  FoodService_CateringServing = "จัดเลี้ยง/เสิร์ฟอาหาร",
  FoodService_WaiterWaitress = "พนักงานเสิร์ฟ",
  HealthFitnessWellness_PersonalTrainerFitnessCoach = "เทรนเนอร์ส่วนตัว/โค้ชฟิตเนส",
  HealthFitnessWellness_MassageSpa = "นวด/สปา",
  HealthFitnessWellness_YogaPilatesInstructor = "ครูสอนโยคะ/พิลาทิส",
  HealthFitnessWellness_HealthNutritionCoach = "โค้ชสุขภาพ/โภชนาการ",
  ArtsCraftsPerformance_HandicraftsGifts = "งานฝีมือ/ของขวัญทำมือ",
  ArtsCraftsPerformance_PhotographyVideography = "ถ่ายภาพ/วิดีโอ",
  ArtsCraftsPerformance_MusicPerformanceSinger = "ดนตรี/การแสดง/นักร้อง",
  ArtsCraftsPerformance_PaintingArtist = "วาดภาพ/ศิลปิน",
  ShortTermMisc_TemporaryDailyWorker = "พนักงานชั่วคราว/รายวัน",
  ShortTermMisc_SeasonalProjectWork = "งานตามฤดูกาล/โปรเจกต์",
  ShortTermMisc_OtherMiscTasks = "งานอื่นๆ/งานจิปาถะ",
}

export const JOB_SUBCATEGORIES_MAP: Record<JobCategory, JobSubCategory[]> = {
  [JobCategory.DigitalCreative]: [
    JobSubCategory.DigitalCreative_GraphicDesign,
    JobSubCategory.DigitalCreative_WritingTranslation,
    JobSubCategory.DigitalCreative_WebMobileDev,
    JobSubCategory.DigitalCreative_VideoAudioEditing,
    JobSubCategory.DigitalCreative_MarketingSocialMedia,
  ],
  [JobCategory.EducationTutoring]: [
    JobSubCategory.EducationTutoring_LanguageTeaching,
    JobSubCategory.EducationTutoring_AcademicTutoring,
    JobSubCategory.EducationTutoring_ExamPrep,
    JobSubCategory.EducationTutoring_WorkshopCraftTeaching,
  ],
  [JobCategory.BusinessAdminSupport]: [
    JobSubCategory.BusinessAdminSupport_DataEntry,
    JobSubCategory.BusinessAdminSupport_OnlineAssistant,
    JobSubCategory.BusinessAdminSupport_CustomerService,
    JobSubCategory.BusinessAdminSupport_AccountingFinance,
    JobSubCategory.BusinessAdminSupport_MarketResearch,
  ],
  [JobCategory.ITTechnical]: [
    JobSubCategory.ITTechnical_SoftwareDevelopment,
    JobSubCategory.ITTechnical_ITSupportRepair,
    JobSubCategory.ITTechnical_AIDataAnalysis,
    JobSubCategory.ITTechnical_WebsiteMaintenance,
  ],
  [JobCategory.SalesEventsPromotion]: [
    JobSubCategory.SalesEventsPromotion_SalesPromotionStaff,
    JobSubCategory.SalesEventsPromotion_EventStaffMCFlyer,
    JobSubCategory.SalesEventsPromotion_MarketSurveyStaff,
    JobSubCategory.SalesEventsPromotion_BoothStaff,
  ],
  [JobCategory.HomeDeliveryLifestyle]: [
    JobSubCategory.HomeDeliveryLifestyle_HousekeepingCleaning,
    JobSubCategory.HomeDeliveryLifestyle_DeliveryErrands,
    JobSubCategory.HomeDeliveryLifestyle_RepairmanHandyman,
    JobSubCategory.HomeDeliveryLifestyle_GardeningPetCare,
    JobSubCategory.HomeDeliveryLifestyle_MovingHauling,
  ],
  [JobCategory.FoodService]: [
    JobSubCategory.FoodService_Barista,
    JobSubCategory.FoodService_KitchenAssistantCook,
    JobSubCategory.FoodService_CateringServing,
    JobSubCategory.FoodService_WaiterWaitress,
  ],
  [JobCategory.HealthFitnessWellness]: [
    JobSubCategory.HealthFitnessWellness_PersonalTrainerFitnessCoach,
    JobSubCategory.HealthFitnessWellness_MassageSpa,
    JobSubCategory.HealthFitnessWellness_YogaPilatesInstructor,
    JobSubCategory.HealthFitnessWellness_HealthNutritionCoach,
  ],
  [JobCategory.ArtsCraftsPerformance]: [
    JobSubCategory.ArtsCraftsPerformance_HandicraftsGifts,
    JobSubCategory.ArtsCraftsPerformance_PhotographyVideography,
    JobSubCategory.ArtsCraftsPerformance_MusicPerformanceSinger,
    JobSubCategory.ArtsCraftsPerformance_PaintingArtist,
  ],
  [JobCategory.ShortTermMisc]: [
    JobSubCategory.ShortTermMisc_TemporaryDailyWorker,
    JobSubCategory.ShortTermMisc_SeasonalProjectWork,
    JobSubCategory.ShortTermMisc_OtherMiscTasks,
  ],
};


export interface WebboardPost {
  id: string;
  title: string;
  body: string;
  category: WebboardCategory;
  image?: string; // URL of the image
  userId: string;
  authorDisplayName: string;
  ownerId?: string; // Retained for consistency, usually same as userId
  authorPhoto?: string; // URL of author's profile photo
  createdAt: string | Date;
  updatedAt: string | Date;
  likes: string[]; // Array of user IDs who liked the post
  isPinned?: boolean;
  isEditing?: boolean; // UI state, not stored in DB
  savedAt?: string | Date; // Timestamp for when it was saved by current user (not directly on post doc)
}

export interface WebboardComment {
  id: string;
  postId: string;
  userId: string;
  authorDisplayName: string;
  ownerId?: string; // Retained for consistency, usually same as userId
  authorPhoto?: string; // URL of author's profile photo
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

export const ACTIVITY_BADGE_DETAILS: UserLevel = { // For "🔥 ขยันใช้เว็บ"
    name: "🔥 ขยันใช้เว็บ",
    colorClass: 'bg-orange-200 dark:bg-orange-600/40',
    textColorClass: 'text-orange-800 dark:text-orange-200',
};

// Enriched types for Webboard - authorLevel is removed as badges are not shown on webboard items
export interface EnrichedWebboardPost extends WebboardPost {
  commentCount: number;
  // authorLevel: UserLevel; // Removed for webboard card/detail
  isAuthorAdmin?: boolean;
}

export interface EnrichedWebboardComment extends WebboardComment {
  // authorLevel: UserLevel; // Removed for webboard comments
  isAuthorAdmin?: boolean;
}

export interface SiteConfig {
    isSiteLocked: boolean;
    updatedAt?: string | Date;
    updatedBy?: string;
}

// For storing user's saved posts in Firestore
export interface UserSavedWebboardPostEntry {
  postId: string;
  savedAt: string | Date;
}
