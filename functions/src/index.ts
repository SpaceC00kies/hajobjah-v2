
import admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { type AdminDashboardData, JobCategory, type PlatformVitals, type ChartDataPoint, type CategoryDataPoint } from './types.js';
import type { Timestamp } from 'firebase-admin/firestore';
import { performFilterAndSearch } from './listingService.js';

// Re-export the new master filter function
export { filterListings } from './listingService.js';

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Common HTTPS options for all callable functions to handle CORS
const commonHttpsOptions = {
    cors: ["https://www.hajobja.com","https://hajobja.com","http://localhost:5173"],
};

// This assumes API_KEY is set in the function's environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper function to get error message and code safely
const getErrorMessage = (e: unknown): { message: string, code?: string } => {
  if (e instanceof Error) return { message: e.message, code: (e as any).code };
  return { message: String(e) };
};

// Refactored universalSearch to be a lightweight wrapper
export const universalSearch = onCall(commonHttpsOptions, async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated","You must be logged in to search.");
    }
    const { query, province } = request.data;
    if (!query || typeof query !== "string" || !province || typeof province !== "string") {
      throw new HttpsError("invalid-argument","A search query and province are required.");
    }

    const results = await performFilterAndSearch({
        resultType: 'all',
        searchTerm: query,
        province: province as any,
        pageSize: 20, // A reasonable default for universal search
    });
    
    // The wrapper needs to return a compatible format for the SearchResultsPage
    return { results: results.items };
});


export const orionAnalyze = onCall(commonHttpsOptions, async (request: CallableRequest) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "You must be logged in to use Orion.");
  }
  const requestingUserDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!requestingUserDoc.exists || requestingUserDoc.data()?.role !== "Admin") {
    throw new HttpsError("permission-denied", "Only administrators can use Orion.");
  }

  const { command } = request.data;
  if (!command || typeof command !== "string") {
    throw new HttpsError("invalid-argument", "A command string is required.");
  }

  const usernameMatch = command.match(/@(\w+)/);
  if (!usernameMatch) {
    return { reply: "Invalid command. Please specify a user to analyze, e.g., 'analyze user @username'." };
  }

  try {
    const username = usernameMatch[1];
    const usersRef = db.collection('users');
    const userQuery = usersRef.where('username', '==', username).limit(1);
    const userSnapshot = await userQuery.get();

    if (userSnapshot.empty) {
        return { reply: `User @${username} not found.` };
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    const jobsCount = (await db.collection('jobs').where('userId', '==', userDoc.id).count().get()).data().count;
    const profilesCount = (await db.collection('helperProfiles').where('userId', '==', userDoc.id).count().get()).data().count;
    const postsCount = (await db.collection('webboardPosts').where('userId', '==', userDoc.id).count().get()).data().count;

    const userDataForPrompt = {
        username: userData.username,
        publicDisplayName: userData.publicDisplayName,
        role: userData.role,
        createdAt: userData.createdAt.toDate().toISOString(),
        profileComplete: userData.profileComplete,
        isSuspicious: userData.isSuspicious,
        vouchInfo: userData.vouchInfo,
        postCounts: {
            jobs: jobsCount,
            helperProfiles: profilesCount,
            webboardPosts: postsCount,
        }
    };
    
    const systemInstruction = `You are Orion, an AI assistant for the admin of HAJOBJA.COM, a job posting platform in Thailand. Your task is to analyze user data and provide a threat assessment report in JSON format. Based on the provided user data, you must determine a trust score (0-100), a threat level, provide an executive summary, key intelligence points, and a recommended action.

    Consider these factors for your analysis:
    - Profile completeness (photo, personal info, etc.). A complete profile is a positive signal.
    - Posting history (number of jobs, helper profiles). High activity can be good, but check for spam.
    - User vouches (vouchInfo). Many vouches from different users is a strong positive signal.
    - Account age (createdAt). Very new accounts might be riskier.
    - Admin flags (isSuspicious). This is a strong negative signal.
    - A user being a 'Writer' or 'Moderator' is a strong positive signal. 'Admin' is the highest trust.

    Threat Levels:
    - LOW: Normal user, no suspicious activity.
    - GUARDED: Minor concerns, like an incomplete profile or very new account.
    - ELEVATED: Some concerning patterns, like many posts in a short time or a report against them.
    - SEVERE: Strong indicators of malicious intent, like being flagged as suspicious.
    - CRITICAL: Confirmed malicious user.

    Provide a concise, data-driven analysis. The output MUST be a JSON object matching the provided schema.`;

    const userPrompt = `Analyze the following user data:
    ${JSON.stringify(userDataForPrompt, null, 2)}
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            threat_level: { type: Type.STRING, description: "Threat level from LOW, GUARDED, ELEVATED, SEVERE, CRITICAL" },
            trust_score: { type: Type.INTEGER, description: "A score from 0-100 representing trustworthiness." },
            emoji: { type: Type.STRING, description: "A single emoji that represents the user's profile." },
            executive_summary: { type: Type.STRING, description: "A brief one-sentence summary of the user's activity and potential risk." },
            key_intel: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A list of key insights or facts about the user's behavior. Maximum 5 items."
            },
            recommended_action: { type: Type.STRING, description: "A concise recommended action for the administrator." },
        },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { role: 'user', parts: [{ text: userPrompt }] },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0,
        seed: 42,
      },
    });

    let replyData;
    try {
        const jsonString = (response.text || "").trim();
        if (jsonString) {
            replyData = JSON.parse(jsonString);
        } else {
            replyData = "Orion returned an empty response. Please try rephrasing your command.";
        }
    } catch (e) {
        // If parsing fails, return the raw text. The frontend can handle it.
        replyData = response.text || "";
    }
    
    return { reply: replyData };

  } catch (error: unknown) {
      console.error("Error in orionAnalyze:", error);
      const err = getErrorMessage(error);
      throw new HttpsError("internal", `Failed to analyze user. Error: ${err.message}`);
  }
});

export const getAdminDashboardData = onCall(commonHttpsOptions, async (request: CallableRequest): Promise<AdminDashboardData> => {
    // Adding a log to force redeployment and confirm execution.
    console.log("Executing getAdminDashboardData v3 with corrected query logic.");

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
        
        // ================== FIX IMPLEMENTED HERE ==================
        // Correctly query for active jobs/helpers by checking the expiration date.
        // The `expiresAt` field is stored as an ISO string, so we must compare against an ISO string.
        const nowISO = now.toISOString();
        const activeJobsQuery = db.collection('jobs').where('expiresAt', '>', nowISO).count().get();
        const activeHelpersQuery = db.collection('helperProfiles').where('expiresAt', '>', nowISO).count().get();
        // ==========================================================
        
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
