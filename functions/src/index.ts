
import { onCall, HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";
import type { CallableRequest } from "firebase-functions/v2/https";
import type { User, Vouch } from './types.js';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';


admin.initializeApp();
const db = admin.firestore();

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


export const orionAnalyze = onCall(async (request: CallableRequest) => {
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
      
      if (!aiResponse.text) {
        throw new HttpsError("internal", "Orion AI failed to generate a valid JSON response.");
      }
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
  } catch (error: unknown) {
    console.error("Error in orionAnalyze function logic:", error);
    if (error instanceof HttpsError) {
      throw error; // Re-throw HttpsError instances directly
    }
    const errorMessage = getErrorMessage(error).message;
    throw new HttpsError("internal", `An internal error occurred while processing your request: ${errorMessage}`);
  }
});

export const setUserRole = onCall(async (request: CallableRequest) => {
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

export const syncUserClaims = onCall(async (request: CallableRequest) => {
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
