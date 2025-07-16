
import { onCall, HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";
import type { CallableRequest } from "firebase-functions/v2/https";
import { type User, type Vouch, type AdminDashboardData, JobCategory, type PlatformVitals, type ChartDataPoint, type CategoryDataPoint } from './types.js';
import type { QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';


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


// Helper function to calculate the Trust Score server-side for deterministic results
const calculateTrustScore = (userData: any, vouchesGivenCount: number, postCount: number, commentCount: number, ipMatchCount: number): number => {
    let score = 50; // Base score

    // Account Age
    if (userData.createdAt) {
        const createdAtDate = (userData.createdAt).toDate ? (userData.createdAt).toDate() : new Date(userData.createdAt);
        if (!isNaN(createdAtDate.getTime())) {
            const diffDays = Math.ceil(Math.abs(new Date().getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 30) score -= 20;
            else if (diffDays >= 180 && diffDays < 365) score += 10;
            else if (diffDays >= 365) score += 20;
        }
    }

    // Vouch Info
    if (userData.vouchInfo) {
        score += (userData.vouchInfo.worked_together || 0) * 5;
        score += (userData.vouchInfo.colleague || 0) * 3;
        score += (userData.vouchInfo.community || 0) * 3;
        score += (userData.vouchInfo.personal || 0) * 1;
    }
    
    // Red Flags
    if (vouchesGivenCount > 5 && (userData.vouchInfo?.total || 0) === 0) {
        score -= 10;
    }
    score -= ipMatchCount * 15;

    // Activity
    const activityScore = (postCount * 2) + (commentCount * 0.5);
    score += Math.min(activityScore, 15); // Cap activity bonus at 15

    return Math.max(0, Math.min(100, Math.round(score))); // Clamp score between 0 and 100
};


export const orionAnalyze = onCall(commonHttpsOptions, async (request: CallableRequest) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const requestingUserDoc = await db.collection("users").doc(request.auth.uid).get();
  if (!requestingUserDoc.exists || requestingUserDoc.data()?.role !== "Admin") {
    throw new HttpsError(
      "permission-denied",
      "Permission denied. You must be an administrator."
    );
  }

  const geminiApiKey = process.env.API_KEY;
  if (!geminiApiKey) {
    console.error("CRITICAL: API_KEY environment variable not set.");
    throw new HttpsError("failed-precondition", "Server is not configured correctly. Missing API Key.");
  }
  const ai = new GoogleGenAI({apiKey: geminiApiKey});

  const command = request.data.command;
  if (!command || typeof command !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a 'command' string in the data payload."
    );
  }

  try {
    const usernameMatch = command.match(/@(\w+)/);

    if (usernameMatch && usernameMatch[1]) {
      const username = usernameMatch[1];
      const usersRef = db.collection("users");
      const userQuery = await usersRef.where("username", "==", username).limit(1).get();

      if (userQuery.empty) {
        return { reply: `User @${username} not found.` };
      }

      const userDoc = userQuery.docs[0];
      const userData = userDoc.data() as User;
      const userId = userDoc.id;

      let accountAge = "N/A";
      if (userData.createdAt) {
        const createdAtDate = (userData.createdAt as any).toDate ? (userData.createdAt as any).toDate() : new Date(userData.createdAt as string);
        if (!isNaN(createdAtDate.getTime())) {
            const diffDays = Math.ceil(Math.abs(new Date().getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 30) accountAge = `${diffDays} days`;
            else if (diffDays < 365) accountAge = `${Math.floor(diffDays / 30)} months`;
            else accountAge = `${Math.floor(diffDays / 365)} years`;
        }
      }

      const vouchesGivenQuery = await db.collection("vouches").where("voucherId", "==", userId).get();
      const vouchesReceivedQuery = await db.collection("vouches").where("voucheeId", "==", userId).get();
      const postsQuery = await db.collection("webboardPosts").where("userId", "==", userId).limit(10).get();
      const commentsQuery = await db.collection("webboardComments").where("userId", "==", userId).limit(20).get();
      
      const vouchesGivenData = vouchesGivenQuery.docs.map((d: QueryDocumentSnapshot) => d.data() as Vouch);
      const ipMatchCount = (await Promise.all(vouchesGivenData.map(async (vouch: Vouch) => {
          const voucheeDoc = await db.collection("users").doc(vouch.voucheeId).get();
          if (!voucheeDoc.exists) return false;
          const voucheeData = voucheeDoc.data() as User;
          return userData.lastLoginIP && voucheeData.lastLoginIP && userData.lastLoginIP === voucheeData.lastLoginIP;
      }))).filter(Boolean).length;


      const trustScore = calculateTrustScore(userData, vouchesGivenQuery.size, postsQuery.size, commentsQuery.size, ipMatchCount);
      const emoji = trustScore < 40 ? "🚨" : trustScore < 60 ? "⚠️" : "✅";
      
      const analysisPayload = {
        userProfile: { id: userId, username: userData.username, publicDisplayName: userData.publicDisplayName, role: userData.role, accountAge: accountAge, createdAt: userData.createdAt, vouchInfo: userData.vouchInfo, lastLoginIP: userData.lastLoginIP },
        vouchesGiven: vouchesGivenQuery.docs.map((doc: QueryDocumentSnapshot) => doc.data() as Vouch),
        vouchesReceived: vouchesReceivedQuery.docs.map((doc: QueryDocumentSnapshot) => doc.data() as Vouch),
        latestPosts: postsQuery.docs.map((p: QueryDocumentSnapshot) => {
            const postData = p.data();
            return {title: postData.title, body: postData.body.substring(0, 50)};
        }),
        activitySummary: { postCount: postsQuery.size, commentCount: commentsQuery.size },
        calculatedTrustScore: trustScore,
      };

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          threat_level: {
            type: Type.STRING,
            description: "A single keyword threat assessment for the user: LOW, GUARDED, ELEVATED, SEVERE, or CRITICAL."
          },
          executive_summary: {
            type: Type.STRING,
            description: "A concise, one-sentence executive summary of the user's status, addressed to the administrator."
          },
          key_intel: {
            type: Type.ARRAY,
            description: "A list of bullet-point findings, both positive and negative, that support the assessment.",
            items: {
              type: Type.STRING
            }
          },
          recommended_action: {
            type: Type.STRING,
            description: "A clear, direct, and actionable recommendation for the administrator (e.g., 'Monitor activity.', 'No action required.', 'Immediate review recommended.')."
          }
        },
        required: ["threat_level", "executive_summary", "key_intel", "recommended_action"]
      };

      const prompt = `
System Instruction:
You are Orion, an elite security and intelligence analyst for the HAJOBJA.COM platform.
Your mission is to analyze user data and provide a sharp, professional, and actionable intelligence report directly to the system administrator.
Your tone is concise and direct. All analysis must be based solely on the data provided.

Task:
Analyze the following user data payload and generate an intelligence report. Populate all fields in the requested JSON schema.

Data Payload:
\`\`\`json
${JSON.stringify(analysisPayload, null, 2)}
\`\`\`
`.trim();


      const aiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          }
      });
      
      if (!aiResponse.text) {
        throw new HttpsError("internal", "Orion AI failed to generate a valid JSON response.");
      }
      const parsedData = JSON.parse(aiResponse.text);

      const replyPayload = {
        ...parsedData,
        trust_score: trustScore,
        emoji: emoji,
      };

      return { reply: replyPayload };

    } else {
      // Fallback for general commands remains the same for now
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze this command for a job platform and provide a summary: "${command}"`,
      });
      return { reply: response.text };
    }
  } catch (error: unknown) {
    console.error("Error in orionAnalyze function logic:", error);
    if (error instanceof HttpsError) {
      throw error; // Re-throw HttpsError instances directly
    }
    const errorMessage = getErrorMessage(error).message;
    throw new HttpsError("internal", `An internal error occurred while processing your request: ${errorMessage}`);
  }
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