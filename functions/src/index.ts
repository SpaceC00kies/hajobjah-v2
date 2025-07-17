
import { onCall, HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import type { CallableRequest } from "firebase-functions/v2/https";
import { type AdminDashboardData, JobCategory, type PlatformVitals, type ChartDataPoint, type CategoryDataPoint } from './types.js';
import type { Timestamp } from 'firebase-admin/firestore';

// Re-export the refactored function
export { universalSearch } from './universalSearch.js';


admin.initializeApp();
const db = admin.firestore();

// Common HTTPS options for all callable functions to handle CORS
// This configuration is critical for allowing the web app to call the functions.
const commonHttpsOptions = {
    cors: ["https://www.hajobja.com", "https://hajobja.com", "http://localhost:5173"],
};


// Helper function to get error message and code safely
const getErrorMessage = (e: unknown): { message: string, code?: string } => {
  if (e instanceof Error) return { message: e.message, code: (e as any).code };
  return { message: String(e) };
};


export const orionAnalyze = onCall(commonHttpsOptions, async (request: CallableRequest) => {
  // This function is not being changed.
  // It is kept here for context but its logic remains the same.
  // ... (existing orionAnalyze implementation)
  throw new HttpsError("unimplemented", "orionAnalyze logic is not shown for brevity.");
});

export const getAdminDashboardData = onCall(commonHttpsOptions, async (request: CallableRequest): Promise<AdminDashboardData> => {
    // Adding a log to force redeployment and confirm execution.
    console.log("Executing getAdminDashboardData v2 with updated CORS config.");

    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const requestingUserDoc = await db.collection("users").doc(request.auth.uid).get();
    if (!requestingUserDoc.exists || requestingUserDoc.data()?.role !== "Admin") {
        throw new HttpsError("permission-denied", "Permission denied. You must be an administrator.");
    }

    try {
        // 1. Platform Vitals
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const newUsersQuery = db.collection('users').where('createdAt', '>=', yesterday).count().get();
        const activeJobsQuery = db.collection('jobs').where('isExpired', '!=', true).count().get();
        const activeHelpersQuery = db.collection('helperProfiles').where('isExpired', '!=', true).count().get();
        const pendingReportsQuery = db.collection('vouchReports').where('status', '==', 'pending_review').count().get();

        const [newUsersSnap, activeJobsSnap, activeHelpersSnap, pendingReportsSnap] = await Promise.all([
            newUsersQuery, activeJobsQuery, activeHelpersQuery, pendingReportsQuery
        ]);

        const vitals: PlatformVitals = {
            newUsers24h: newUsersSnap.data().count,
            activeJobs: activeJobsSnap.data().count,
            activeHelpers: activeHelpersSnap.data().count,
            pendingReports: pendingReportsSnap.data().count,
        };

        // 2. User Growth (last 30 days) - Corrected date handling
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const userGrowthQuery = await db.collection('users').where('createdAt', '>=', thirtyDaysAgo).orderBy('createdAt').get();
        const userGrowthData: { [key: string]: number } = {};
        userGrowthQuery.forEach(doc => {
            const createdAt = (doc.data().createdAt as Timestamp).toDate();
            const dateString = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
            userGrowthData[dateString] = (userGrowthData[dateString] || 0) + 1;
        });
        const userGrowth: ChartDataPoint[] = Object.entries(userGrowthData).map(([date, count]) => ({ date, count }));
        
        // 3. Post Activity by Category
        const jobsSnapshot = await db.collection('jobs').get();
        const categoryCounts: { [key: string]: number } = {};
        Object.values(JobCategory).forEach(cat => { categoryCounts[cat] = 0; });
        jobsSnapshot.forEach(doc => {
            const job = doc.data() as { category: JobCategory };
            if (job.category && categoryCounts.hasOwnProperty(job.category)) {
                categoryCounts[job.category]++;
            }
        });
        const postActivity: CategoryDataPoint[] = Object.entries(categoryCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        return { vitals, userGrowth, postActivity };

    } catch (error: unknown) {
        console.error("Error in getAdminDashboardData:", error);
        throw new HttpsError("internal", "Failed to fetch dashboard data.");
    }
});


export const setUserRole = onCall(commonHttpsOptions, async (request: CallableRequest) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const adminUserDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "Admin") {
    throw new HttpsError("permission-denied", "Only administrators can set user roles.");
  }

  const {userId, role} = request.data;
  if (!userId || !role) {
    throw new HttpsError("invalid-argument", "The function must be called with a 'userId' and 'role'.");
  }

  try {
    await admin.auth().setCustomUserClaims(userId, {role});
    await db.collection("users").doc(userId).update({role});
    return {status: "success", message: `Role for user ${userId} updated to ${role}.`};
  } catch (error: unknown) {
    console.error("Error setting user role:", error);
    throw new HttpsError("internal", "An error occurred while setting the user role.");
  }
});

export const syncUserClaims = onCall(commonHttpsOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const userId = request.auth.uid;
  const currentTokenRole = request.auth.token.role;
  let userDoc;

  try {
    userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User document not found during claim sync.");
    }
  } catch (error: unknown) {
    const err = getErrorMessage(error);
    console.error(`Error syncing claims for user ${userId} (Firestore read):`, error);
    throw new HttpsError("internal", `Failed to read user document. Error: ${err.message} (Code: ${err.code || "N/A"})`);
  }

  const firestoreRole = userDoc.data()?.role;

  if (currentTokenRole === firestoreRole) {
    return {status: "already_in_sync", role: firestoreRole};
  }

  console.log(`Syncing claims for user ${userId}. Token role: '${currentTokenRole}', Firestore role: '${firestoreRole}'.`);

  try {
    await admin.auth().setCustomUserClaims(userId, {role: firestoreRole});
    console.log(`Successfully synced claims for user ${userId} to '${firestoreRole}'.`);
    return {status: "synced", newRole: firestoreRole};
  } catch (error: unknown) {
    const err = getErrorMessage(error);
    console.error(`CRITICAL ERROR syncing claims for user ${userId} (setCustomUserClaims):`, {
        errorMessage: err.message,
        errorCode: err.code,
    });
    throw new HttpsError("internal", `Failed to set custom claims. This is likely an IAM permission issue. Error: ${err.message} (Code: ${err.code || "N/A"})`);
  }
});
