// types/types.ts
import type { DocumentSnapshot, DocumentData } from '@firebase/firestore';

export interface PaginatedDocsResponse<T> {
  items: T[];
  cursor: Cursor | null;
}

export type Cursor = {
  updatedAt: string;
  isPinned: boolean;
};

export enum Province {
  ChiangMai = 'เชียงใหม่',
  Bangkok = 'กรุงเทพมหานคร',
}

export interface Job {
  id: string; title: string; location: string; province: Province; dateTime: string; payment: string; contact: string; description: string; category: JobCategory; subCategory?: JobSubCategory; desiredAgeStart?: number; desiredAgeEnd?: number; preferredGender?: 'ชาย' | 'หญิง' | 'ไม่จำกัด'; desiredEducationLevel?: JobDesiredEducationLevelOption; dateNeededFrom?: string | Date; dateNeededTo?: string | Date; timeNeededStart?: string; timeNeededEnd?: string; postedAt?: string | Date; userId: string; authorDisplayName: string; ownerId?: string; isSuspicious?: boolean; isPinned?: boolean; isHired?: boolean; createdAt?: string | Date; updatedAt?: string | Date; expiresAt?: string | Date; isExpired?: boolean; adminVerified?: boolean; posterIsAdminVerified?: boolean; interestedCount?: number; companyLogoUrl?: string;
}

export enum GenderOption { Male = 'ชาย', Female = 'หญิง', Other = 'อื่น ๆ / เพศทางเลือก', NotSpecified = 'ไม่ระบุ' }
export enum JobDesiredEducationLevelOption { Any = 'ไม่จำกัด', MiddleSchool = 'ม.ต้น', HighSchool = 'ม.ปลาย', Vocational = 'ปวช./ปวส.', Bachelor = 'ปริญญาตรี', Higher = 'สูงกว่าปริญญาตรี' }
export enum HelperEducationLevelOption { NotStated = 'ไม่ได้ระบุ', MiddleSchool = 'ม.ต้น', HighSchool = 'ม.ปลาย', Vocational = 'ปวช./ปวส.', Bachelor = 'ปริญญาตรี', Higher = 'สูงกว่าปริญญาตรี' }

export interface HelperProfile {
  id: string; profileTitle: string; details: string; area: string; province: Province; availability: string; contact: string; category: JobCategory; subCategory?: JobSubCategory; gender?: GenderOption; birthdate?: string; educationLevel?: HelperEducationLevelOption; availabilityDateFrom?: string | Date; availabilityDateTo?: string | Date; availabilityTimeDetails?: string; postedAt?: string | Date; userId: string; authorDisplayName: string; ownerId?: string; isSuspicious?: boolean; isPinned?: boolean; isUnavailable?: boolean; adminVerifiedExperience?: boolean; interestedCount?: number; createdAt?: string | Date; updatedAt?: string | Date; expiresAt?: string | Date; isExpired?: boolean; lastBumpedAt?: string | Date;
}

export enum UserRole { Admin = 'Admin', Moderator = 'Moderator', Writer = 'Writer', Member = 'Member' }

export interface UserPostingLimits { lastJobPostDate?: string | Date; lastHelperProfileDate?: string | Date; dailyWebboardPosts: { count: number; resetDate: string | Date; }; hourlyComments: { count: number; resetTime: string | Date; }; lastBumpDates: { [profileId: string]: string | Date; }; vouchingActivity: { monthlyCount: number; periodStart: string | Date; }; }
export interface UserActivityBadge { isActive: boolean; lastActivityCheck?: string | Date; last30DaysActivity: number; }
export type UserTier = 'free' | 'premium';
export interface VouchInfo { total: number; worked_together: number; colleague: number; community: number; personal: number; }

export interface User {
  id: string; publicDisplayName: string; username: string; email: string; role: UserRole; tier: UserTier; mobile: string; lineId?: string; facebook?: string; gender?: GenderOption; birthdate?: string; educationLevel?: HelperEducationLevelOption; photo?: string; address?: string; nickname?: string; firstName?: string; lastName?: string; favoriteMusic?: string; favoriteBook?: string; favoriteMovie?: string; hobbies?: string; favoriteFood?: string; dislikedThing?: string; introSentence?: string; profileComplete?: boolean; userLevel: UserLevel; isMuted?: boolean; createdAt?: string | Date; updatedAt?: string | Date; postingLimits: UserPostingLimits; activityBadge: UserActivityBadge; savedWebboardPosts?: string[]; isBusinessProfile?: boolean; businessName?: string; businessType?: string; businessAddress?: string; businessWebsite?: string; businessSocialProfileLink?: string; aboutBusiness?: string; lastPublicDisplayNameChangeAt?: string | Date; publicDisplayNameUpdateCount?: number; vouchInfo?: VouchInfo; lastLoginIP?: string; lastLoginUserAgent?: string;
}

export type RegistrationDataType = Omit<User, 'id' | 'tier' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'isMuted' | 'nickname' | 'firstName' | 'lastName' | 'role' | 'postingLimits' | 'activityBadge' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence' | 'createdAt' | 'updatedAt' | 'savedWebboardPosts' | 'gender' | 'birthdate' | 'educationLevel' | 'lineId' | 'facebook' | 'isBusinessProfile' | 'businessName' | 'businessType' | 'businessAddress' | 'businessWebsite' | 'businessSocialProfileLink' | 'aboutBusiness' | 'lastPublicDisplayNameChangeAt' | 'publicDisplayNameUpdateCount' | 'vouchInfo' | 'lastLoginIP' | 'lastLoginUserAgent'> & { password: string };
export enum View { Home = 'HOME', PostJob = 'POST_JOB', FindJobs = 'FIND_JOBS', OfferHelp = 'OFFER_HELP', FindHelpers = 'FIND_HELPERS', Login = 'LOGIN', Register = 'REGISTER', AdminDashboard = 'ADMIN_DASHBOARD', MyPosts = 'MY_POSTS', UserProfile = 'USER_PROFILE', MyRoom = 'MY_ROOM', AboutUs = 'ABOUT_US', PublicProfile = 'PUBLIC_PROFILE', Safety = 'SAFETY', Webboard = 'WEBBOARD', PasswordReset = 'PASSWORD_RESET', Blog = 'BLOG', ArticleEditor = 'ARTICLE_EDITOR', SearchResults = 'SEARCH_RESULTS', }
export interface EnrichedHelperProfile extends HelperProfile { userPhoto?: string; userAddress?: string; profileCompleteBadge: boolean; warningBadge: boolean; verifiedExperienceBadge: boolean; }
export interface Interaction { id: string; helperUserId: string; helperProfileId?: string; employerUserId: string; timestamp: string | Date; type: 'contact_helper'; createdAt?: string | Date; }
export interface Interest { id: string; userId: string; targetId: string; targetType: 'job' | 'helperProfile'; targetOwnerId: string; createdAt: string | Date; }

export enum VouchType { WorkedTogether = 'worked_together', Colleague = 'colleague', Community = 'community', Personal = 'personal' }
export const VOUCH_TYPE_LABELS: Record<VouchType, string> = { [VouchType.WorkedTogether]: 'เคยร่วมงานกัน', [VouchType.Colleague]: 'เคยเป็นเพื่อนร่วมงาน', [VouchType.Community]: 'คนในชุมชน/พื้นที่เดียวกัน', [VouchType.Personal]: 'รู้จักเป็นการส่วนตัว' };
export interface Vouch { id: string; voucherId: string; voucherDisplayName: string; voucheeId: string; vouchType: VouchType; comment?: string; createdAt: string | Date; creatorIP?: string; creatorUserAgent?: string; }
export enum VouchReportStatus { Pending = 'pending_review', ResolvedKept = 'resolved_kept', ResolvedDeleted = 'resolved_deleted' }
export interface VouchReport { id: string; vouchId: string; reporterId: string; reporterComment: string; voucheeId: string; voucherId: string; vouchType?: VouchType; status: VouchReportStatus; createdAt: string | Date; resolvedAt?: string | Date; resolvedBy?: string; }

export enum WebboardCategory { QA = "ถาม-ตอบ", Knowledge = "ความรู้", HowTo = "How-to", General = "ทั่วไป", Other = "อื่น ๆ" }
export const WEBBOARD_CATEGORY_STYLES: Record<WebboardCategory, { bg: string; text: string; border?: string }> = { [WebboardCategory.QA]: { bg: 'bg-primary-light', text: 'text-primary-dark', border: 'border-primary' }, [WebboardCategory.Knowledge]: { bg: 'bg-brandGreen/20', text: 'text-brandGreen-text', border: 'border-brandGreen' }, [WebboardCategory.HowTo]: { bg: 'bg-secondary/40', text: 'text-neutral-700', border: 'border-secondary' }, [WebboardCategory.General]: { bg: 'bg-neutral-light', text: 'text-neutral-dark', border: 'border-neutral-dark/30' }, [WebboardCategory.Other]: { bg: 'bg-neutral-light', text: 'text-neutral-dark', border: 'border-neutral-dark/30' } };

export enum JobCategory { DigitalCreative = 'งานดิจิทัลและสร้างสรรค์', EducationTutoring = 'การศึกษาและติวเตอร์', BusinessAdminSupport = 'งานธุรกิจและสนับสนุนงานธุรการ', ITTechnical = 'งานไอทีและเทคนิค', SalesEventsPromotion = 'งานขาย, อีเวนต์ และโปรโมชัน', HomeDeliveryLifestyle = 'งานบ้าน, รับส่งของ และไลฟ์สไตล์', FoodService = 'งานอาหารและบริการ', HealthFitnessWellness = 'สุขภาพ ฟิตเนส และสุขภาวะ', ArtsCraftsPerformance = 'ศิลปะ งานฝีมือ และการแสดง', ShortTermMisc = 'งานระยะสั้นและงานจิปาถะ' }
export type FilterableCategory = JobCategory | 'all';
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
    JobSubCategory.DigitalCreative_MarketingSocialMedia
  ],
  [JobCategory.EducationTutoring]: [
    JobSubCategory.EducationTutoring_LanguageTeaching,
    JobSubCategory.EducationTutoring_AcademicTutoring,
    JobSubCategory.EducationTutoring_ExamPrep,
    JobSubCategory.EducationTutoring_WorkshopCraftTeaching
  ],
  [JobCategory.BusinessAdminSupport]: [
    JobSubCategory.BusinessAdminSupport_DataEntry,
    JobSubCategory.BusinessAdminSupport_OnlineAssistant,
    JobSubCategory.BusinessAdminSupport_CustomerService,
    JobSubCategory.BusinessAdminSupport_AccountingFinance,
    JobSubCategory.BusinessAdminSupport_MarketResearch
  ],
  [JobCategory.ITTechnical]: [
    JobSubCategory.ITTechnical_SoftwareDevelopment,
    JobSubCategory.ITTechnical_ITSupportRepair,
    JobSubCategory.ITTechnical_AIDataAnalysis,
    JobSubCategory.ITTechnical_WebsiteMaintenance
  ],
  [JobCategory.SalesEventsPromotion]: [
    JobSubCategory.SalesEventsPromotion_SalesPromotionStaff,
    JobSubCategory.SalesEventsPromotion_EventStaffMCFlyer,
    JobSubCategory.SalesEventsPromotion_MarketSurveyStaff,
    JobSubCategory.SalesEventsPromotion_BoothStaff
  ],
  [JobCategory.HomeDeliveryLifestyle]: [
    JobSubCategory.HomeDeliveryLifestyle_HousekeepingCleaning,
    JobSubCategory.HomeDeliveryLifestyle_DeliveryErrands,
    JobSubCategory.HomeDeliveryLifestyle_RepairmanHandyman,
    JobSubCategory.HomeDeliveryLifestyle_GardeningPetCare,
    JobSubCategory.HomeDeliveryLifestyle_MovingHauling
  ],
  [JobCategory.FoodService]: [
    JobSubCategory.FoodService_Barista,
    JobSubCategory.FoodService_KitchenAssistantCook,
    JobSubCategory.FoodService_CateringServing,
    JobSubCategory.FoodService_WaiterWaitress
  ],
  [JobCategory.HealthFitnessWellness]: [
    JobSubCategory.HealthFitnessWellness_PersonalTrainerFitnessCoach,
    JobSubCategory.HealthFitnessWellness_MassageSpa,
    JobSubCategory.HealthFitnessWellness_YogaPilatesInstructor,
    JobSubCategory.HealthFitnessWellness_HealthNutritionCoach
  ],
  [JobCategory.ArtsCraftsPerformance]: [
    JobSubCategory.ArtsCraftsPerformance_HandicraftsGifts,
    JobSubCategory.ArtsCraftsPerformance_PhotographyVideography,
    JobSubCategory.ArtsCraftsPerformance_MusicPerformanceSinger,
    JobSubCategory.ArtsCraftsPerformance_PaintingArtist
  ],
  [JobCategory.ShortTermMisc]: [
    JobSubCategory.ShortTermMisc_TemporaryDailyWorker,
    JobSubCategory.ShortTermMisc_SeasonalProjectWork,
    JobSubCategory.ShortTermMisc_OtherMiscTasks
  ]
};

export interface WebboardPost { id: string; title: string; body: string; category: WebboardCategory; image?: string; userId: string; authorDisplayName: string; ownerId?: string; authorPhoto?: string; createdAt: string | Date; updatedAt: string | Date; likes: string[]; isPinned?: boolean; isEditing?: boolean; savedAt?: string | Date; }
export interface WebboardComment { id: string; postId: string; userId: string; authorDisplayName: string; ownerId?: string; authorPhoto?: string; text: string; createdAt: string | Date; updatedAt: string | Date; }

export enum BlogCategory { JobTips = "เคล็ดลับหางาน", SuccessStories = "เรื่องราวความสำเร็จ", CareerAdvice = "แนะนำอาชีพ", Finance = "การเงินและการลงทุน", SelfDevelopment = "พัฒนาตัวเอง", IndustryNews = "ข่าวสารในวงการ", Interviews = "สัมภาษณ์บุคคลน่าสนใจ", Lifestyle = "ไลฟ์สไตล์และการทำงาน" }
export type FilterableBlogCategory = BlogCategory | 'all';
export interface BlogPost { id: string; title: string; slug: string; content: string; excerpt: string; coverImageURL?: string; authorId: string; authorDisplayName: string; authorPhotoURL?: string; status: 'draft' | 'published' | 'archived'; category: BlogCategory | ''; tags: string[]; createdAt: string | Date; publishedAt?: string | Date; updatedAt: string | Date; likes: string[]; likeCount: number; }
export interface BlogComment { id: string; postId: string; userId: string; authorDisplayName: string; authorPhotoURL?: string; text: string; createdAt: string | Date; updatedAt: string | Date; }
export interface EnrichedBlogPost extends BlogPost { author?: User; }

export interface UserLevel { name: string; minScore?: number; colorClass: string; textColorClass?: string; }
export const USER_LEVELS: UserLevel[] = [ { name: "🐣 มือใหม่", minScore: 0, colorClass: 'bg-primary-light' } ];
export const ADMIN_BADGE_DETAILS: UserLevel = { name: "🌟 ผู้ดูแล", colorClass: 'bg-secondary' };
export const MODERATOR_BADGE_DETAILS: UserLevel = { name: "👮 ผู้ตรวจ", colorClass: 'bg-primary' };
export const ACTIVITY_BADGE_DETAILS: UserLevel = { name: "🔥 ขยัน", colorClass: 'bg-red-200' };

export interface EnrichedWebboardPost extends WebboardPost { commentCount: number; isAuthorAdmin?: boolean; }
export interface EnrichedWebboardComment extends WebboardComment { isAuthorAdmin?: boolean; }
export interface SiteConfig { isSiteLocked: boolean; updatedAt?: string | Date; updatedBy?: string; }
export interface OrionInsightData { threat_level: 'LOW' | 'GUARDED' | 'ELEVATED' | 'SEVERE' | 'CRITICAL'; trust_score: number; emoji: string; executive_summary: string; key_intel: string[]; recommended_action: string; }
export interface OrionMessage { id: string; sender: 'user' | 'orion'; isError?: boolean; text?: string; insightPayload?: OrionInsightData; }
export type SearchResultItem = (Job | HelperProfile) & { resultType: 'job' | 'helper' };

// Admin Dashboard Types
export interface PlatformVitals { newUsers24h: number; activeJobs: number; activeHelpers: number; pendingReports: number; }
export interface ChartDataPoint { date: string; count: number; }
export interface CategoryDataPoint { name: string; count: number; }
export interface AdminDashboardData { vitals: PlatformVitals; userGrowth: ChartDataPoint[]; postActivity: CategoryDataPoint[]; }