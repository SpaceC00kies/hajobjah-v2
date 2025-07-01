import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import type { User, Vouch, WebboardPost, WebboardComment } from "../../types.ts";

admin.initializeApp();
const db = admin.firestore();

// Access the API key from the function's environment variables
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.error("GEMINI_API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({apiKey: geminiApiKey || ""});


export const orionAnalyze = functions.https.onCall(async (request) => {
  // 1. Security Check: Ensure the user is an admin.
  if (request.auth?.token?.role !== "Admin") {
    throw new functions.https.HttpsError(
        "permission-denied",
        "You must be an administrator to use this feature.",
    );
  }

  const command: string = request.data.command;
  if (!command) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a command.",
    );
  }

  try {
    const analyzeUserMatch = command.match(/analyze user @(\w+)/i);

    if (analyzeUserMatch && analyzeUserMatch[1]) {
      const username = analyzeUserMatch[1];

      // 2. Data Gathering: Fetch user and related data from Firestore.
      const usersRef = db.collection("users");
      const userQuery = await usersRef.where("username", "==", username).limit(1).get();

      if (userQuery.empty) {
        return `User @${username} not found.`;
      }

      const userDoc = userQuery.docs[0];
      const userData = userDoc.data() as User;
      const userId = userDoc.id;

      // Fetch related data
      const vouchesGivenQuery = await db.collection("vouches").where("voucherId", "==", userId).get();
      const vouchesReceivedQuery = await db.collection("vouches").where("voucheeId", "==", userId).get();
      const postsQuery = await db.collection("webboardPosts").where("userId", "==", userId).limit(10).get();
      const commentsQuery = await db.collection("webboardComments").where("userId", "==", userId).limit(20).get();

      const vouchesGiven = vouchesGivenQuery.docs.map((doc) => doc.data() as Vouch);
      const vouchesReceived = vouchesReceivedQuery.docs.map((doc) => doc.data() as Vouch);
      const posts = postsQuery.docs.map((doc) => doc.data() as WebboardPost);
      const comments = commentsQuery.docs.map((doc) => doc.data() as WebboardComment);

      const analysisPayload = {
        userProfile: {
          id: userId,
          username: userData.username,
          publicDisplayName: userData.publicDisplayName,
          role: userData.role,
          createdAt: userData.createdAt,
          vouchInfo: userData.vouchInfo,
          lastLoginIP: userData.lastLoginIP,
        },
        vouchesGiven,
        vouchesReceived,
        activitySummary: {
          postCount: posts.length,
          commentCount: comments.length,
          latestPosts: posts.map((p) => p.title).slice(0, 5),
        },
      };

      // 3. Prompt Engineering & Gemini API Call
      const systemInstruction = `You are Orion, a world-class security and behavior analyst for the HAJOBJA.COM platform.
      Your task is to analyze the provided JSON data about a user and generate a concise, actionable report for the administrator.
      Focus on patterns of trust, risk, and platform engagement.
      Provide a 'Genuineness Score' from 0 (highly suspicious) to 100 (highly trustworthy) and a clear recommendation.
      Format your response in Markdown with headings.`;

      const prompt = `${systemInstruction}

      Analyze the following data:
      ${JSON.stringify(analysisPayload, null, 2)}

      Your Analysis:`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
      });

      // 4. Return Response
      return response.text;
    }

    // Default response for unrecognized commands
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: `An admin on HAJOBJA.COM asked: "${command}". Provide a helpful, general answer.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error in orionAnalyze function:", error);
    throw new functions.https.HttpsError(
        "internal",
        "An error occurred while processing your request.",
    );
  }
});

// New function to securely set a user's role
export const setUserRole = functions.https.onCall(async (request) => {
  // 1. Security Check: Ensure the caller is an admin.
  if (request.auth?.token?.role !== "Admin") {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Only administrators can set user roles.",
    );
  }

  const {userId, role} = request.data;
  if (!userId || !role) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a 'userId' and 'role'.",
    );
  }

  try {
    // 2. Set custom claims on the user's auth token
    await admin.auth().setCustomUserClaims(userId, {role});
    // 3. Update the role in the user's Firestore document
    await db.collection("users").doc(userId).update({role});
    return {status: "success", message: `Role for user ${userId} updated to ${role}.`};
  } catch (error) {
    console.error("Error setting user role:", error);
    throw new functions.https.HttpsError(
        "internal",
        "An error occurred while setting the user role.",
    );
  }
});

// New function to self-heal and sync a user's auth token with their Firestore role
export const syncUserClaims = functions.https.onCall(async (request) => {
  // 1. Security Check: Ensure user is authenticated.
  if (!request.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const userId = request.auth.uid;
  const currentTokenRole = request.auth.token.role;

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      // This should ideally not happen for an authenticated user.
      throw new functions.https.HttpsError("not-found", "User document not found.");
    }

    const firestoreRole = userDoc.data()?.role;

    if (currentTokenRole === firestoreRole) {
      return {status: "already_in_sync"};
    }

    // 2. Roles are out of sync, update the custom claims to match Firestore.
    await admin.auth().setCustomUserClaims(userId, {role: firestoreRole});
    return {status: "synced", newRole: firestoreRole};
  } catch (error) {
    console.error(`Error syncing claims for user ${userId}:`, error);
    throw new functions.https.HttpsError(
        "internal",
        "An error occurred while syncing user claims.",
    );
  }
});
