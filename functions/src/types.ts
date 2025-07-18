// functions/src/types.ts

import type { Timestamp } from 'firebase-admin/firestore';

export enum Province {
  ChiangMai = 'เชียงใหม่',
  Bangkok = 'กรุงเทพมหานคร',
}

// ────────────────────────────────────────────────────
// Existing search types
// ────────────────────────────────────────────────────

export enum JobCategory {
  DigitalCreative       = 'งานดิจิทัลและสร้างสรรค์',
  EducationTutoring     = 'การศึกษาและติวเตอร์',
  BusinessAdminSupport  = 'งานธุรกิจและสนับสนุนงานธุรการ',
  ITTechnical           = 'งานไอทีและเทคนิค',
  SalesEventsPromotion  = 'งานขาย, อีเวนต์ และโปรโมชัน',
  HomeDeliveryLifestyle = 'งานบ้าน, รับส่งของ และไลฟ์สไตล์',
  FoodService           = 'งานอาหารและบริการ',
  HealthFitnessWellness = 'สุขภาพ ฟิตเนส และสุขภาวะ',
  ArtsCraftsPerformance = 'ศิลปะ งานฝีมือ และการแสดง',
  ShortTermMisc         = 'งานระยะสั้นและงานจิปาถะ',
}

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

export interface Job {
  id: string;
  title: string;
  description: string;
  category: JobCategory;
  province?: string;
  updatedAt?: Timestamp | Date | string;
  isPinned?: boolean;
  [key: string]: any;
}

export interface HelperProfile {
  id: string;
  profileTitle: string;
  details: string;
  category: JobCategory;
  province?: string;
  updatedAt?: Timestamp | Date | string;
  isPinned?: boolean;
  [key: string]: any;
}

export type SearchResultItem =
  | (Job & { resultType: 'job' })
  | (HelperProfile & { resultType: 'helper' });


// ────────────────────────────────────────────────────
// NEW: Dashboard types for getAdminDashboardData
// ────────────────────────────────────────────────────

/**
 * A summary of key platform vitals.
 */
export interface PlatformVitals {
  newUsers24h: number;
  activeJobs: number;
  activeHelpers: number;
  pendingReports: number;
}

/**
 * Data point for the 30-day user growth chart.
 */
export interface ChartDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

/**
 * Data point for job posts by category.
 */
export interface CategoryDataPoint {
  name: string;
  count: number;
}

/**
 * Full return payload for getAdminDashboardData.
 */
export interface AdminDashboardData {
  vitals: PlatformVitals;
  userGrowth: ChartDataPoint[];
  postActivity: CategoryDataPoint[];
}

/**
 * Pagination cursor for backend functions
 */
export type Cursor = {
  updatedAt: string;
  isPinned: boolean;
};