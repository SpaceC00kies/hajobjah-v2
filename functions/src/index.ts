// functions/src/index.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import admin from "firebase-admin";

// Your singleton Admin SDK + Firestore come from here
import { serverDb } from "./lib/firebase/serverApp.js";

// Filter/search helper
import { filterListings, performFilterAndSearch } from "./listingService.js";

// Pull in both types *and* the JobCategory enum as a value
import {
  AdminDashboardData,
  PlatformVitals,
  ChartDataPoint,
  CategoryDataPoint,
  JobCategory,
} from "./types.js";

// Note: we do NOT call initializeApp() here—it's handled in serverApp.js

const commonOptions = {
  cors: [
    "https://www.hajobja.com",
    "https://hajobja.com",
    "http://localhost:5173",
  ],
};

// 1) Re-export the listing filter
export { filterListings };

// 2) universalSearch wrapper
export const universalSearch = onCall(commonOptions, async (req) => {
  if (!req.auth?.uid) {
    throw new HttpsError("unauthenticated", "Login required");
  }
  const { query, province } = req.data as {
    query?: string;
    province?: string;
  };
  if (!query || typeof query !== "string") {
    throw new HttpsError("invalid-argument", "A search query is required.");
  }

  const { items } = await performFilterAndSearch({
    resultType: "all",
    searchTerm: query,
    province: (province as any) ?? "all",
    pageSize: 100,
  });
  return { results: items };
});

// 3) orionAnalyze stub (drop your real logic here)
export const orionAnalyze = onCall(
  commonOptions,
  async (_req: CallableRequest) => {
    throw new HttpsError("unimplemented", "orionAnalyze not implemented");
  }
);

// 4) getAdminDashboardData
export const getAdminDashboardData = onCall(
  commonOptions,
  async (req: CallableRequest): Promise<AdminDashboardData> => {
    if (!req.auth?.uid) {
      throw new HttpsError("unauthenticated", "Login required");
    }
    const me = await serverDb.collection("users").doc(req.auth.uid).get();
    if (!me.exists || me.data()?.role !== "Admin") {
      throw new HttpsError("permission-denied", "Admins only");
    }

    const now = new Date();
    const nowISO = now.toISOString();

    const [newUsersSnap, activeJobsSnap, activeHelpersSnap, pendingReportsSnap] =
      await Promise.all([
        serverDb
          .collection("users")
          .where("createdAt", ">=", new Date(now.getTime() - 86400e3))
          .count()
          .get(),
        serverDb.collection("jobs").where("expiresAt", ">", nowISO).count().get(),
        serverDb
          .collection("helperProfiles")
          .where("expiresAt", ">", nowISO)
          .count()
          .get(),
        serverDb
          .collection("vouchReports")
          .where("status", "==", "pending_review")
          .count()
          .get(),
      ]);

    const vitals: PlatformVitals = {
      newUsers24h: newUsersSnap.data().count,
      activeJobs: activeJobsSnap.data().count,
      activeHelpers: activeHelpersSnap.data().count,
      pendingReports: pendingReportsSnap.data().count,
    };

    // 30-day user growth
    const thirtyAgo = new Date(now.getTime() - 30 * 86400e3);
    const growthSnap = await serverDb
      .collection("users")
      .where("createdAt", ">=", thirtyAgo)
      .orderBy("createdAt")
      .get();

    const growthMap: Record<string, number> = {};
    growthSnap.forEach((doc) => {
      const day = (doc.data().createdAt as any)
        .toDate()
        .toISOString()
        .slice(0, 10);
      growthMap[day] = (growthMap[day] || 0) + 1;
    });
    const userGrowth: ChartDataPoint[] = Object.entries(growthMap).map(
      ([date, count]) => ({ date, count })
    );

    // Post activity by category
    const jobsSnap = await serverDb.collection("jobs").get();
    const counts: Record<string, number> = {};
    (Object.values(JobCategory) as string[]).forEach((c) => (counts[c] = 0));
    jobsSnap.forEach((doc) => {
      const cat = doc.data().category as JobCategory;
      if (counts[cat] != null) counts[cat]++;
    });
    const postActivity: CategoryDataPoint[] = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { vitals, userGrowth, postActivity };
  }
);

// 5) setUserRole
export const setUserRole = onCall(
  commonOptions,
  async (req: CallableRequest) => {
    if (!req.auth?.uid) {
      throw new HttpsError("unauthenticated", "Login required");
    }
    const me = await serverDb.collection("users").doc(req.auth.uid).get();
    if (!me.exists || me.data()?.role !== "Admin") {
      throw new HttpsError("permission-denied", "Admins only");
    }
    const { userId, role } = req.data as {
      userId?: string;
      role?: string;
    };
    if (!userId || !role) {
      throw new HttpsError(
        "invalid-argument",
        "Must provide both userId and role"
      );
    }
    await admin.auth().setCustomUserClaims(userId, { role });
    await serverDb.collection("users").doc(userId).update({ role });
    return { status: "success" };
  }
);

// 6) syncUserClaims
export const syncUserClaims = onCall(
  commonOptions,
  async (req: CallableRequest) => {
    if (!req.auth?.uid) {
      throw new HttpsError("unauthenticated", "Login required");
    }
    const userId = req.auth.uid;
    const tokenRole = req.auth.token.role;
    const doc = await serverDb.collection("users").doc(userId).get();
    const fireRole = doc.data()?.role;
    if (tokenRole === fireRole) {
      return { status: "already_in_sync", role: fireRole };
    }
    await admin.auth().setCustomUserClaims(userId, { role: fireRole });
    return { status: "synced", newRole: fireRole };
  }
);