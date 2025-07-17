
import type { DocumentSnapshot, DocumentData } from 'firebase/firestore';

export interface PaginatedDocsResponse<T> {
  items: T[];
  lastVisibleDoc: DocumentSnapshot<DocumentData> | null;
}

export enum Province {
  ChiangMai = 'เชียงใหม่',
  Bangkok = 'กรุงเทพมหานคร',
}

export interface Job {
  id: string;
  title: string;
  location: string;
  province: Province; // Added province
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
  posterIsAdminVerified?: boolean; // Flag indicating if the job poster is admin verified
  interestedCount?: number;
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
  province: Province; // Added province
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
  Writer = 'Writer', // New role for blog authors
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
  vouchingActivity: { // For monthly vouch limit
    monthlyCount: number;
    periodStart: string | Date;
  };
}

export interface UserActivityBadge {
  isActive: boolean; 
  lastActivityCheck?: string | Date; 
  last30DaysActivity: number; 
}

export type UserTier = 'free' | 'premium';

export interface VouchInfo {
  total: number;
  worked_together: number;
  colleague: number;
  community: number;
  personal: number;
}

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

  // Business Profile Fields
  isBusinessProfile?: boolean; // New field for business profile toggle
  businessName?: string;
  businessType?: string; // e.g., ร้านค้า, บริษัท, ฟรีแลนซ์
  businessAddress?: string;
  businessWebsite?: string;
  businessSocialProfileLink?: string; // e.g., Link to company Facebook Page, LINE OA
  aboutBusiness?: string;

  // Fields for display name change cooldown
  lastPublicDisplayNameChangeAt?: string | Date;
  publicDisplayNameUpdateCount?: number;
  
  vouchInfo?: VouchInfo; // New field for community verification

  // Fields for Vouch Moderation HUD
  lastLoginIP?: string;
  lastLoginUserAgent?: string;
}

export type RegistrationDataType = Omit<User, 'id' | 'tier' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'isMuted' | 'nickname' | 'firstName' | 'lastName' | 'role' | 'postingLimits' | 'activityBadge' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence' | 'createdAt' | 'updatedAt' | 'savedWebboardPosts' | 'gender' | 'birthdate' | 'educationLevel' | 'lineId' | 'facebook' | 'isBusinessProfile' | 'businessName' | 'businessType' | 'businessAddress' | 'businessWebsite' | 'businessSocialProfileLink' | 'aboutBusiness' | 'lastPublicDisplayNameChangeAt' | 'publicDisplayNameUpdateCount' | 'vouchInfo' | 'lastLoginIP' | 'lastLoginUserAgent'> & { password: string };

export enum View {
  Home = 'HOME',
  PostJob = 'POST_JOB',
  FindJobs = 'FIND_JOBS',
  OfferHelp = 'OFFER_HELP',
  FindHelpers = 'FIND_HELPERS',
  Login = 'LOGIN',
  Register = 'REGISTER',
  AdminDashboard = 'ADMIN_DASHBOARD',
  MyPosts = 'MY_POSTS', // This might be deprecated in favor of MyRoom
  UserProfile = 'USER_PROFILE', // This might be deprecated in favor of MyRoom's profile tab
  MyRoom = 'MY_ROOM', // New dashboard view
  AboutUs = 'ABOUT_US',
  PublicProfile = 'PUBLIC_PROFILE',
  Safety = 'SAFETY',
  Webboard = 'WEBBOARD',
  PasswordReset = 'PASSWORD_RESET',
  Blog = 'BLOG', // New view for the blog/journal
  ArticleEditor = 'ARTICLE_EDITOR', // New view for the blog post editor
  SearchResults = 'SEARCH_RESULTS',
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

export interface Interest {
    id: string;
    userId: string; // The user who is interested
    targetId: string; // The ID of the Job or HelperProfile
    targetType: 'job' | 'helperProfile';
    targetOwnerId: string; // The ID of the user who owns the target
    createdAt: string | Date;
}

export enum VouchType {
  WorkedTogether = 'worked_together',
  Colleague = 'colleague',
  Community = 'community',
  Personal = 'personal',
}

export const VOUCH_TYPE_LABELS: Record<VouchType, string> = {
  [VouchType.WorkedTogether]: 'เคยร่วมงานกัน (ในฐานะผู้ว่าจ้าง/ผู้รับจ้าง)',
  [VouchType.Colleague]: 'เคยเป็นเพื่อนร่วมงาน',
  [VouchType.Community]: 'คนในชุมชน/พื้นที่เดียวกันที่น่าเชื่อถือ',
  [VouchType.Personal]: 'รู้จักเป็นการส่วนตัว (เพื่อน, คนรู้จัก)',
};

export interface Vouch {
  id: string;
  voucherId: string;
  voucherDisplayName: string;
  voucheeId: string;
  vouchType: VouchType;
  comment?: string;
  createdAt: string | Date;
  creatorIP?: string; // For moderation HUD
  creatorUserAgent?: string; // For moderation HUD
}

export enum VouchReportStatus {
  Pending = 'pending_review',
  ResolvedKept = 'resolved_kept',
  ResolvedDeleted = 'resolved_deleted',
}

export interface VouchReport {
  id: string;
  vouchId: string;
  reporterId: string;
  reporterComment: string;
  voucheeId: string; // Denormalized for easier querying
  voucherId: string; // Denormalized for easier querying
  status: VouchReportStatus;
  createdAt: string | Date;
  resolvedAt?: string | Date;
  resolvedBy?: string; // Admin ID
}


export enum WebboardCategory {
  QA = "ถาม-ตอบ",
  Knowledge = "ความรู้",
  HowTo = "How-to",
  General = "ทั่วไป",
  Other = "อื่น ๆ",
}

export const WEBBOARD_CATEGORY_STYLES: Record<WebboardCategory, { bg: string; text: string; border?: string }> = {
  [WebboardCategory.QA]: { bg: 'bg-primary-light', text: 'text-primary-dark', border: 'border-primary' },
  [WebboardCategory.Knowledge]: { bg: 'bg-brandGreen/20', text: 'text-brandGreen-text', border: 'border-brandGreen' },
  [WebboardCategory.HowTo]: { bg: 'bg-secondary/40', text: 'text-neutral-700', border: 'border-secondary' },
  [WebboardCategory.General]: { bg: 'bg-neutral-light', text: 'text-neutral-dark', border: 'border-neutral-dark/30' },
  [WebboardCategory.Other]: { bg: 'bg-neutral-light', text: 'text-neutral-dark', border: 'border-neutral-dark/30' },
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
  [JobCategory.DigitalCreative]: { bg: 'bg-primary-light', text: 'text-primary-dark', border: 'border-primary' },
  [JobCategory.EducationTutoring]: { bg: 'bg-brandGreen/20', text: 'text-brandGreen-text', border: 'border-brandGreen' },
  [JobCategory.BusinessAdminSupport]: { bg: 'bg-neutral-light', text: 'text-neutral-dark', border: 'border-neutral-dark/30' },
  [JobCategory.ITTechnical]: { bg: 'bg-primary-light', text: 'text-primary-dark', border: 'border-primary' },
  [JobCategory.SalesEventsPromotion]: { bg: 'bg-secondary/40', text: 'text-neutral-700', border: 'border-secondary' },
  [JobCategory.HomeDeliveryLifestyle]: { bg: 'bg-brandGreen/20', text: 'text-brandGreen-text', border: 'border-brandGreen' },
  [JobCategory.FoodService]: { bg: 'bg-secondary/40', text: 'text-neutral-700', border: 'border-secondary' },
  [JobCategory.HealthFitnessWellness]: { bg: 'bg-brandGreen/20', text: 'text-brandGreen-text', border: 'border-brandGreen' },
  [JobCategory.ArtsCraftsPerformance]: { bg: 'bg-secondary/40', text: 'text-neutral-700', border: 'border-secondary' },
  [JobCategory.ShortTermMisc]: { bg: 'bg-neutral-light', text: 'text-neutral-dark', border: 'border-neutral-dark/30' },
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

// New Types for Blog/Journal feature
export enum BlogCategory {
    JobTips = "เคล็ดลับหางาน",
    SuccessStories = "เรื่องราวความสำเร็จ",
    CareerAdvice = "แนะนำอาชีพ",
    Finance = "การเงินและการลงทุน",
    SelfDevelopment = "พัฒนาตัวเอง",
    IndustryNews = "ข่าวสารในวงการ",
    Interviews = "สัมภาษณ์บุคคลน่าสนใจ",
    Lifestyle = "ไลฟ์สไตล์และการทำงาน",
}

export type FilterableBlogCategory = BlogCategory | 'all';

export interface BlogPost {
  id: string;
  title: string;
  slug: string; // e.g., "how-to-write-a-great-resume"
  content: string; // Storing HTML or JSON from the rich text editor
  excerpt: string;
  coverImageURL?: string; // Optional now
  authorId: string; // The User ID of the writer
  authorDisplayName: string; // Denormalized for performance
  authorPhotoURL?: string; // Denormalized
  status: 'draft' | 'published' | 'archived';
  category: BlogCategory | '';
  tags: string[];
  createdAt: string | Date;
  publishedAt?: string | Date; // Set only when status becomes 'published'
  updatedAt: string | Date;
  likes: string[]; // Array of user IDs
  likeCount: number; // Denormalized count
}

export interface BlogComment {
    id: string;
    postId: string;
    userId: string;
    authorDisplayName: string;
    authorPhotoURL?: string;
    text: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}


export interface EnrichedBlogPost extends BlogPost {
    author?: User; // The full author object, if available
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
  { name: UserLevelName.Level1_NewbiePoster, minScore: 0, colorClass: 'bg-primary-light', textColorClass: 'text-primary-dark' },
  { name: UserLevelName.Level2_FieryNewbie, minScore: 5, colorClass: 'bg-green-100', textColorClass: 'text-green-800' },
  { name: UserLevelName.Level3_RegularSenior, minScore: 15, colorClass: 'bg-blue-100', textColorClass: 'text-blue-800' },
  { name: UserLevelName.Level4_ClassTeacher, minScore: 30, colorClass: 'bg-purple-100', textColorClass: 'text-purple-800' },
  { name: UserLevelName.Level5_KnowledgeGuru, minScore: 50, colorClass: 'bg-yellow-100', textColorClass: 'text-yellow-800' },
  { name: UserLevelName.Level6_BoardFavorite, minScore: 80, colorClass: 'bg-pink-100', textColorClass: 'text-pink-800' },
  { name: UserLevelName.Level7_LegendOfHajobjah, minScore: 120, colorClass: 'bg-teal-100', textColorClass: 'text-teal-800' },
];

export const ADMIN_BADGE_DETAILS: UserLevel = {
  name: "🌟 ผู้พิทักษ์จักรวาล",
  colorClass: 'bg-secondary',
  textColorClass: 'text-neutral-dark',
};

export const MODERATOR_BADGE_DETAILS: UserLevel = {
  name: "👮 ผู้ตรวจการ",
  colorClass: 'bg-primary',
  textColorClass: 'text-white',
};

export const ACTIVITY_BADGE_DETAILS: UserLevel = {
    name: "🔥 ขยันใช้เว็บ",
    colorClass: 'bg-red-200',
    textColorClass: 'text-red-800',
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

// For Orion Command Center
export interface OrionInsightData {
  threat_level: 'LOW' | 'GUARDED' | 'ELEVATED' | 'SEVERE' | 'CRITICAL';
  trust_score: number;
  emoji: string;
  executive_summary: string;
  key_intel: string[];
  recommended_action: string;
}

export interface OrionMessage {
  id: string;
  sender: 'user' | 'orion';
  isError?: boolean;
  text?: string;
  insightPayload?: OrionInsightData;
}

// Types for Admin Mission Control Dashboard
export interface PlatformVitals {
  newUsers24h: number;
  activeJobs: number;
  activeHelpers: number;
  pendingReports: number;
}

export interface ChartDataPoint {
  date: string; // e.g., "Jun 20"
  count: number;
}

export interface CategoryDataPoint {
  name: string;
  count: number;
}

export interface AdminDashboardData {
  vitals: PlatformVitals;
  userGrowth: ChartDataPoint[];
  postActivity: CategoryDataPoint[];
}

// Type for Universal Search results
export type SearchResultItem = (Job | HelperProfile) & { resultType: 'job' | 'helper' };
