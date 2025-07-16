
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";
import type { User, Vouch } from "./types";

admin.initializeApp();
const db = admin.firestore();

// Helper function to calculate the Trust Score server-side for deterministic results
const calculateTrustScore = (userData: User, vouchesGivenCount: number, postCount: number, commentCount: number, ipMatchCount: number): number => {
    let score = 50; // Base score

    // Account Age
    if (userData.createdAt) {
        const createdAtDate = (userData.createdAt as any).toDate ? (userData.createdAt as any).toDate() : new Date(userData.createdAt as string);
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


export const orionAnalyze = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const requestingUserDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!requestingUserDoc.exists || requestingUserDoc.data()?.role !== "Admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Permission denied. You must be an administrator."
    );
  }

  const geminiApiKey = process.env.API_KEY;
  if (!geminiApiKey) {
    console.error("CRITICAL: API_KEY environment variable not set.");
    throw new functions.https.HttpsError("failed-precondition", "Server is not configured correctly. Missing API Key.");
  }
  const ai = new GoogleGenAI({apiKey: geminiApiKey});

  const command: string = data.command;
  if (!command || typeof command !== "string") {
    throw new functions.https.HttpsError(
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
      
      const vouchesGivenData = vouchesGivenQuery.docs.map(d => d.data() as Vouch);
      const ipMatchCount = (await Promise.all(vouchesGivenData.map(async (vouch) => {
          const voucheeDoc = await db.collection("users").doc(vouch.voucheeId).get();
          if (!voucheeDoc.exists) return false;
          const voucheeData = voucheeDoc.data() as User;
          return userData.lastLoginIP && voucheeData.lastLoginIP && userData.lastLoginIP === voucheeData.lastLoginIP;
      }))).filter(Boolean).length;


      const trustScore = calculateTrustScore(userData, vouchesGivenQuery.size, postsQuery.size, commentsQuery.size, ipMatchCount);
      const emoji = trustScore < 40 ? "🚨" : trustScore < 60 ? "⚠️" : "✅";
      
      const analysisPayload = {
        userProfile: { id: userId, username: userData.username, publicDisplayName: userData.publicDisplayName, role: userData.role, accountAge: accountAge, createdAt: userData.createdAt, vouchInfo: userData.vouchInfo, lastLoginIP: userData.lastLoginIP },
        vouchesGiven: vouchesGivenQuery.docs.map((doc) => doc.data() as Vouch),
        vouchesReceived: vouchesReceivedQuery.docs.map((doc) => doc.data() as Vouch),
        latestPosts: postsQuery.docs.map((p) => {
            const postData = p.data();
            return {title: postData.title, body: postData.body.substring(0, 50)};
        }),
        activitySummary: { postCount: postsQuery.size, commentCount: commentsQuery.size },
        calculatedTrustScore: trustScore,
      };

      const responseSchema = {
          type: Type.OBJECT,
          properties: {
              summary: { type: Type.STRING, description: "A brief, one-sentence summary of the user's status." },
              findings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of key observations, both positive and negative." },
              recommendation: { type: Type.STRING, description: "Your final recommendation or assessment for the administrator." },
          },
          required: ["summary", "findings", "recommendation"],
      };

      const aiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `You are Orion, a world-class security and behavior analyst. Analyze the user data provided and generate a summary, key findings, and a recommendation based on the pre-calculated trust score. Be insightful and concise. DATA TO ANALYZE: \`\`\`json\n${JSON.stringify(analysisPayload, null, 2)}\n\`\`\``,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          }
      });
      
      const parsedData = JSON.parse(aiResponse.text);

      const formattedReply = `@${userData.username} - Trust Score: ${trustScore}/100 ${emoji}\n\n${parsedData.summary}\n\nHere's what I found:\n${parsedData.findings.map((f: string) => `• ${f}`).join("\n")}\n\nMy take: ${parsedData.recommendation}`.trim().replace(/^\s*[\r\n]/gm, "");
      return { reply: formattedReply };

    } else {
      // Fallback for general commands remains the same for now
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze this command for a job platform and provide a summary: "${command}"`,
      });
      return { reply: response.text };
    }
  } catch (error) {
    console.error("Error in orionAnalyze function logic:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HttpsError instances directly
    }
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new functions.https.HttpsError("internal", `An internal error occurred while processing your request: ${errorMessage}`);
  }
});

export const setUserRole = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const adminUserDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!adminUserDoc.exists || adminUserDoc.data()?.role !== "Admin") {
    throw new functions.https.HttpsError("permission-denied", "Only administrators can set user roles.");
  }

  const {userId, role} = data;
  if (!userId || !role) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'userId' and 'role'.");
  }

  try {
    await admin.auth().setCustomUserClaims(userId, {role});
    await db.collection("users").doc(userId).update({role});
    return {status: "success", message: `Role for user ${userId} updated to ${role}.`};
  } catch (error) {
    console.error("Error setting user role:", error);
    throw new functions.https.HttpsError("internal", "An error occurred while setting the user role.");
  }
});

export const syncUserClaims = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const userId = context.auth.uid;
  const currentTokenRole = context.auth.token.role;
  let userDoc: admin.firestore.DocumentSnapshot;

  try {
    userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User document not found during claim sync.");
    }
  } catch (error: any) {
    console.error(`Error syncing claims for user ${userId} (Firestore read):`, error);
    throw new functions.https.HttpsError("internal", `Failed to read user document. Error: ${error.message} (Code: ${error.code || "N/A"})`);
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
  } catch (error: any) {
    console.error(`CRITICAL ERROR syncing claims for user ${userId} (setCustomUserClaims):`, {
        errorMessage: error.message,
        errorCode: error.code,
    });
    throw new functions.https.HttpsError("internal", `Failed to set custom claims. This is likely an IAM permission issue. Error: ${error.message} (Code: ${error.code || "N/A"})`);
  }
});
