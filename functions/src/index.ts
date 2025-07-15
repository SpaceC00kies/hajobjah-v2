
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";
import type { User, Vouch, WebboardPost, WebboardComment } from "./types";
// import type { CallableContext } from "firebase-functions/v1/https";


admin.initializeApp();
const db = admin.firestore();


export const orionAnalyze = functions.https.onCall(async (request: any) => {
  // 1. Authentication and Authorization Check (handled by onCall)
  if (request.auth?.token?.role !== "Admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Permission denied. You must be an administrator."
    );
  }

  // 2. API Key and Argument Validation
  const geminiApiKey = functions.config().gemini?.api_key;
  if (!geminiApiKey) {
    console.error("CRITICAL: GEMINI_API_KEY environment variable not set.");
    throw new functions.https.HttpsError("failed-precondition", "Server is not configured correctly. Missing API Key.");
  }
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const command: string = request.data.command;
  if (!command || typeof command !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'command' string in the data payload."
    );
  }

  // 3. Main Logic
  try {
    const usernameMatch = command.match(/@(\w+)/);

    if (usernameMatch && usernameMatch[1]) {
      // --- USER-SPECIFIC ANALYSIS PATH ---
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
        const createdAt = userData.createdAt instanceof admin.firestore.Timestamp
            ? userData.createdAt.toDate()
            : new Date(userData.createdAt as string | Date);
        if (!isNaN(createdAt.getTime())) {
            const diffDays = Math.ceil(Math.abs(new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 30) accountAge = `${diffDays} days`;
            else if (diffDays < 365) accountAge = `${Math.floor(diffDays / 30)} months`;
            else accountAge = `${Math.floor(diffDays / 365)} years`;
        }
      }

      const vouchesGivenQuery = await db.collection("vouches").where("voucherId", "==", userId).get();
      const vouchesReceivedQuery = await db.collection("vouches").where("voucheeId", "==", userId).get();
      const postsQuery = await db.collection("webboardPosts").where("userId", "==", userId).limit(10).get();
      const commentsQuery = await db.collection("webboardComments").where("userId", "==", userId).limit(20).get();

      const analysisPayload = {
        userProfile: { id: userId, username: userData.username, publicDisplayName: userData.publicDisplayName, role: userData.role, accountAge: accountAge, createdAt: userData.createdAt, vouchInfo: userData.vouchInfo, lastLoginIP: userData.lastLoginIP },
        vouchesGiven: vouchesGivenQuery.docs.map((doc) => doc.data() as Vouch),
        vouchesReceived: vouchesReceivedQuery.docs.map((doc) => doc.data() as Vouch),
        latestPosts: postsQuery.docs.map((p) => {
            const postData = p.data();
            return {title: postData.title, body: postData.body.substring(0, 50)};
        }),
        activitySummary: { postCount: postsQuery.size, commentCount: commentsQuery.size },
      };

      const systemInstructionForUserJSON = `You are Orion, a world-class security and behavior analyst for the HAJOBJA.COM platform.
Your response MUST be a valid JSON object matching this exact schema. Do not add any other text, markdown, or explanations.
{ "username": string, "trustScore": number, "emoji": "✅" | "⚠️" | "🚨", "summary": string, "findings": string[], "recommendation": string }
Analyze the user data and populate the JSON. To ensure consistency, you MUST calculate the trustScore using this rubric: Start with 50. Account Age: <30d = -20, 6-12mo = +10, >1y = +20. Vouches Received: worked_together=+5, colleague/community=+3, personal=+1. Activity: +2/post, +0.5/comment (max +15). Red Flags: High vouches given/zero received = -10. IP match with voucher = -15. Cap score 0-100. Emoji/summary must reflect this score.`;

      const userPrompt = `Analyze this JSON data and generate a report using the schema provided in the system instruction:\n\`\`\`json\n${JSON.stringify(analysisPayload, null, 2)}\n\`\`\``;

      const userAnalysisSchema = {
          type: Type.OBJECT,
          properties: {
              username: { type: Type.STRING },
              trustScore: { type: Type.NUMBER },
              emoji: { type: Type.STRING, enum: ["✅", "⚠️", "🚨"] },
              summary: { type: Type.STRING },
              findings: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendation: { type: Type.STRING }
          },
          required: ["username", "trustScore", "emoji", "summary", "findings", "recommendation"]
      };

      const geminiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash", contents: userPrompt,
        config: { systemInstruction: systemInstructionForUserJSON, responseMimeType: "application/json", responseSchema: userAnalysisSchema, temperature: 0 },
      });
      
      if (geminiResponse.promptFeedback?.blockReason) {
        throw new functions.https.HttpsError("invalid-argument", `Request was blocked by the API for safety reasons: ${geminiResponse.promptFeedback.blockReason}. Please rephrase your command.`);
      }
      
      const responseText = geminiResponse.text;
      if (!responseText || responseText.trim() === "") {
        throw new functions.https.HttpsError("internal", "Orion AI returned an empty response. The model may have refused to answer or encountered an error.");
      }
      
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse AI JSON response:", responseText, e);
        throw new functions.https.HttpsError("internal", `Orion's response was not in the correct JSON format. Raw response: ${responseText}`);
      }
      
      const formattedReply = `@${parsedData.username} - Trust Score: ${parsedData.trustScore}/100 ${parsedData.emoji}\n\nHey admin, ${parsedData.summary}.\n\nHere's what I found:\n${parsedData.findings.map((f: string) => `• ${f}`).join("\n")}\n\nMy take: ${parsedData.recommendation}`.trim().replace(/^\s*[\r\n]/gm, "");
      return { reply: formattedReply };

    } else {
      // --- GENERAL SCENARIO ANALYSIS PATH ---
      const systemInstructionForScenarioJSON = `You are Orion, an AI analyst. Your response must be a valid JSON object. Do not add other text.
{ "analysisTitle": string, "fraudRisk": number, "riskEmoji": "✅" | "⚠️" | "🚨", "summary": string, "findings": string[], "recommendation": string }`;

      const scenarioAnalysisSchema = {
          type: Type.OBJECT,
          properties: {
              analysisTitle: { type: Type.STRING },
              fraudRisk: { type: Type.NUMBER },
              riskEmoji: { type: Type.STRING, enum: ["✅", "⚠️", "🚨"] },
              summary: { type: Type.STRING },
              findings: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendation: { type: Type.STRING }
          },
          required: ["analysisTitle", "fraudRisk", "riskEmoji", "summary", "findings", "recommendation"]
      };

      const geminiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash", contents: command,
        config: { systemInstruction: systemInstructionForScenarioJSON, responseMimeType: "application/json", responseSchema: scenarioAnalysisSchema, temperature: 0 },
      });
      
      if (geminiResponse.promptFeedback?.blockReason) {
        throw new functions.https.HttpsError("invalid-argument", `Request was blocked by the API for safety reasons: ${geminiResponse.promptFeedback.blockReason}. Please rephrase your command.`);
      }

      const responseText = geminiResponse.text;
      if (!responseText || responseText.trim() === "") {
          throw new functions.https.HttpsError("internal", "Orion AI returned an empty response. The model may have refused to answer or encountered an error.");
      }

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse AI JSON response:", responseText, e);
        throw new functions.https.HttpsError("internal", `Orion's response was not in the correct JSON format. Raw response: ${responseText}`);
      }

      const formattedReply = `${parsedData.analysisTitle} - Fraud Risk: ${parsedData.fraudRisk}/100 ${parsedData.riskEmoji}\n\nHey admin, ${parsedData.summary}.\n\nHere's the breakdown:\n${parsedData.findings.map((f: string) => `• ${f}`).join("\n")}\n\nMy take: ${parsedData.recommendation}`.trim().replace(/^\s*[\r\n]/gm, "");
      return { reply: formattedReply };
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

export const setUserRole = functions.https.onCall(async (request: any) => {
  if (request.auth?.token?.role !== "Admin") {
    throw new functions.https.HttpsError("permission-denied", "Only administrators can set user roles.");
  }

  const {userId, role} = request.data;
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

export const syncUserClaims = functions.https.onCall(async (request: any) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const userId = request.auth.uid;
  const currentTokenRole = request.auth.token.role;
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
