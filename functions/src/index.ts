
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

        // Pre-calculate account age
        let accountAge = "N/A";
        if (userData.createdAt) {
            const createdAt = (userData.createdAt as admin.firestore.Timestamp).toDate();
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - createdAt.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 30) {
                accountAge = `${diffDays} days`;
            } else if (diffDays < 365) {
                accountAge = `${Math.floor(diffDays / 30)} months`;
            } else {
                accountAge = `${Math.floor(diffDays / 365)} years`;
            }
        }

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
            accountAge: accountAge,
            createdAt: userData.createdAt,
            vouchInfo: userData.vouchInfo,
            lastLoginIP: userData.lastLoginIP,
          },
          vouchesGiven,
          vouchesReceived,
          latestPosts: posts.map((p) => ({title: p.title, body: p.body.substring(0, 50)})),
          activitySummary: {
            postCount: posts.length,
            commentCount: comments.length,
          },
        };
        
        const systemInstructionForUser = `You are Orion. Your response MUST follow this EXACT template. DO NOT add any other text:

@[USERNAME] - Trust Score: [SCORE]/100 [EMOJI]

Hey admin, [ONE SENTENCE SUMMARY]. Here's what I found:
- [FINDING 1]
- [FINDING 2]
- [FINDING 3]

My take: [ONE SENTENCE RECOMMENDATION]

RULES:
1. Replace bracketed items with actual values
2. Use EXACTLY this format - no headers, no extra text
3. Maximum 3 bullet points
4. Trust Score: Calculate based on vouches, activity, account age
5. Emoji: ✅ (70+), ⚠️ (30-69), 🚨 (below 30)
6. TOTAL OUTPUT MUST BE UNDER 10 LINES

EXAMPLE OUTPUT:
@john - Trust Score: 85/100 ✅

Hey admin, this user looks legitimate. Here's what I found:
- Active member for 6 months
- Strong vouch network (12 given, 18 received)
- Regular helpful contributions

My take: Solid community member, no action needed.

CRITICAL: If you write more than 10 lines or use any headers like '### User Analysis', you have failed. Follow the template EXACTLY.`;

        const userPrompt = `Analyze this JSON data and generate a report using the template provided in the system instruction:\n\`\`\`json\n${JSON.stringify(analysisPayload, null, 2)}\n\`\`\``;

        const geminiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
          contents: userPrompt,
          config: {
            systemInstruction: systemInstructionForUser,
          },
        });

        res.status(200).send({data: geminiResponse.text});
        return;
      } else {
        // --- GENERAL SCENARIO ANALYSIS PATH ---
        const systemInstructionForScenario = `You are Orion. Your response MUST follow this EXACT template. DO NOT add any other text:

[ANALYSIS_TITLE] - Fraud Risk: [SCORE]/100 [EMOJI]

Hey admin, [ONE SENTENCE SUMMARY]. Here's the breakdown:
- [FINDING 1]
- [FINDING 2]

My take: [ONE SENTENCE RECOMMENDATION]

RULES:
1. Replace bracketed items with actual values.
2. Use EXACTLY this format - no headers, no extra text.
3. Maximum 3 bullet points.
4. Emoji: ✅ (Low Risk), ⚠️ (Medium Risk), 🚨 (High Risk).
5. TOTAL OUTPUT MUST BE UNDER 10 LINES.

EXAMPLE OUTPUT:
Suspicious Vouching Pattern - Fraud Risk: 95/100 🚨

Hey admin, this scenario is highly suspicious. Here's the breakdown:
- Multiple new accounts from a single IP is a classic sign of a sock puppet or collusion ring.
- Immediately vouching for one user is not organic behavior.

My take: High confidence of fraud. Investigate and likely ban all associated accounts.

CRITICAL: If you write more than 10 lines or use any headers like '### Scenario Analysis', you have failed. Follow the template EXACTLY.`;

        const userPrompt = command;

        const geminiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
          contents: userPrompt,
          config: {
            systemInstruction: systemInstructionForScenario,
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
