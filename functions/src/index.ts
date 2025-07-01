
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import type { User, Vouch, WebboardPost, WebboardComment } from "./types.ts";
import * as cors from "cors";


admin.initializeApp();
const db = admin.firestore();

// Define the origins allowed to access the functions.
const allowedOrigins = [
  "https://www.hajobja.com",
  "https://hajobja.com",
  /hajobjah\.web\.app$/,
  /hajobjah\.firebaseapp\.com$/,
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsHandler = cors({ origin: allowedOrigins });


// Access the API key from the function's environment variables as requested.
const geminiApiKey = functions.config().gemini.api_key;

if (!geminiApiKey) {
  console.error("CRITICAL: GEMINI_API_KEY environment variable not set. Run 'firebase functions:config:set gemini.api_key=\"YOUR_KEY\"'");
}
const ai = new GoogleGenAI({apiKey: geminiApiKey || ""});


export const orionAnalyze = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    // 1. Security Checks for onRequest (Callable Protocol)
    if (req.method !== "POST") {
        res.status(405).send({error: {message: "Method Not Allowed"}});
        return;
    }

    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
      console.error("No Firebase ID token was passed as a Bearer token in the Authorization header.");
      res.status(401).send({error: {status: "UNAUTHENTICATED", message: "Unauthorized."}});
      return;
    }

    const idToken = req.headers.authorization.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error("Error while verifying Firebase ID token:", error);
      res.status(401).send({error: {status: "UNAUTHENTICATED", message: "Unauthorized. Invalid token."}});
      return;
    }

    if (decodedToken.role !== "Admin") {
      res.status(403).send({error: {status: "PERMISSION_DENIED", message: "Permission denied. You must be an administrator."}});
      return;
    }

    // 2. Argument Validation (Callable Protocol wraps data)
    const command: string = req.body.data?.command;
    if (!command) {
      res.status(400).send({error: {status: "INVALID_ARGUMENT", message: "The function must be called with a 'command' in the data payload."}});
      return;
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
          res.status(200).send({data: `User @${username} not found.`});
          return;
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data() as User;
        const userId = userDoc.id;

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
        
        // Updated System Instruction for User Analysis with strict formatting
        const systemInstruction = `You are Orion, a security analysis AI for HAJOBJA.COM. Your ONLY function is to analyze the JSON data provided and generate a report in the EXACT format below.

**FORMAT TEMPLATE:**
🔍 **Analysis: @[username]**
━━━━━━━━━━━━━━━━━━━━━━

📊 **Trust Score: [score]/100** [star_rating]

**Status:** [status_emoji] [Status Text]
**Account Age:** [age]
**Activity:** [level] (**[X]** posts, **[Y]** comments)
**Vouches:** Given: **[A]** | Received: **[B]**

🚨 **Key Findings:** (OMIT this section entirely if no warnings)
- [Bullet point finding 1]
- [Bullet point finding 2]

💡 **Recommendation:**
[A short, direct recommendation.]

━━━━━━━━━━━━━━━━━━━━━━

**FORMATTING RULES:**
- **DO NOT** deviate from the template.
- **Trust Score:** Calculate a score from 0-100 based on the data (age, activity, vouch ratio).
- **Star Rating:** Convert the score to a 5-star rating (e.g., 85/100 is ⭐⭐⭐⭐☆).
- **Status:** Choose ONE: ✅ Trusted, ⚠️ Monitor, or 🚨 Suspicious.
- **Key Findings:** Use bullet points for CRITICAL warnings only (e.g., IP match, suspicious vouch patterns). If none, OMIT the entire "Key Findings" section.
- **Conciseness:** The entire response MUST be under 15 lines.
- **Bold** all numbers.`;

        const userPrompt = `Perform a security analysis on the following user data payload:\n\n\`\`\`json\n${JSON.stringify(analysisPayload, null, 2)}\n\`\`\``;


        const geminiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
          contents: userPrompt,
          config: {
            systemInstruction: systemInstruction,
          },
        });

        res.status(200).send({data: geminiResponse.text});
        return;
      } else {
        // --- GENERAL SCENARIO ANALYSIS PATH ---
        const systemInstruction = `You are Orion, a security analysis AI for HAJOBJA.COM. Your ONLY function is to analyze the user's text-based fraud scenario and generate a report in the EXACT format below.

**FORMAT TEMPLATE:**
🔍 **Scenario Analysis**
━━━━━━━━━━━━━━━━━━━━━━

📊 **Fraud Risk: [score]/100** [star_rating]

🚨 **Key Findings:**
- [Bullet point explaining finding 1]
- [Bullet point explaining finding 2]

💡 **Recommendation:**
[A short, direct recommendation.]

━━━━━━━━━━━━━━━━━━━━━━

**FORMATTING RULES:**
- **DO NOT** deviate from the template.
- **Fraud Risk:** Calculate a score from 0-100 based on the described scenario.
- **Star Rating:** Convert the score to a 5-star rating (e.g., 70/100 is ⭐⭐⭐⭐☆).
- **Key Findings:** Use bullet points to explain your reasoning.
- **Conciseness:** The entire response MUST be under 15 lines.`;

        const userPrompt = command;

        const geminiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
          contents: userPrompt,
          config: {
            systemInstruction: systemInstruction,
          },
        });
        res.status(200).send({data: geminiResponse.text});
        return;
      }
    } catch (error) {
      console.error("Error in orionAnalyze function logic:", error);
      res.status(500).send({error: {status: "INTERNAL", message: "An internal error occurred while processing your request."}});
    }
  });
});

export const setUserRole = functions.https.onCall(async (data, context) => {
  if (context.auth?.token?.role !== "Admin") {
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

export const syncUserClaims = functions.https.onCall(async (data, context) => {
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
