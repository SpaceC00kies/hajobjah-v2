// functions/src/types.ts

import type { Timestamp } from 'firebase-admin/firestore';

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

export interface Job {
  id: string;
  title: string;
  description: string;
  category: JobCategory;
  province?: string;
  updatedAt?: Timestamp | Date | string;
  [key: string]: any;
}

export interface HelperProfile {
  id: string;
  profileTitle: string;
  details: string;
  category: JobCategory;
  province?: string;
  updatedAt?: Timestamp | Date | string;
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