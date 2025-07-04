import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import type { User, Vouch, WebboardPost, WebboardComment, BlogPost } from "./types";
import cors from "cors";


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
            // Safely convert createdAt (which can be Timestamp, Date, or string) to a Date object.
            const createdAt = userData.createdAt instanceof admin.firestore.Timestamp
                ? userData.createdAt.toDate()
                : new Date(userData.createdAt as string | Date);

            if (!isNaN(createdAt.getTime())) { // Check for valid date
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

        const systemInstructionForUserJSON = `You are Orion, a world-class security and behavior analyst for the HAJOBJA.COM platform.
Your response MUST be a valid JSON object matching this exact schema. Do not add any other text, markdown, or explanations.

{
  "username": string,
  "trustScore": number, // A value between 0 and 100.
  "emoji": "✅" | "⚠️" | "🚨", // ✅ for scores 70+, ⚠️ for 30-69, 🚨 for below 30.
  "summary": string, // A single, concise sentence summarizing the user's status.
  "findings": string[], // An array of 2-4 key observations.
  "recommendation": string // A single, concise recommendation.
}

Analyze the user data and populate the JSON. To ensure consistency, you MUST calculate the trustScore using the following rubric:
1.  **Start with a base score of 50.**
2.  **Account Age:**
    - If account age is less than 30 days, subtract 20 points.
    - If account age is 6-12 months, add 10 points.
    - If account age is over 1 year, add 20 points.
3.  **Vouches Received:**
    - Add 5 points for each 'worked_together' vouch.
    - Add 3 points for each 'colleague' or 'community' vouch.
    - Add 1 point for each 'personal' vouch.
4.  **Platform Activity (cap at +15 points):**
    - Add 2 points per post.
    - Add 0.5 points per comment.
5.  **Red Flags (Deductions):**
    - If vouches given are high but vouches received are zero, subtract 10 points.
    - If the user's lastLoginIP matches the IP of a user who vouched for them, note this as a high-risk finding and subtract 15 points.

Calculate the final score and cap it between 0 and 100. The emoji and summary MUST reflect this calculated score.`;

        const userPrompt = `Analyze this JSON data and generate a report using the schema provided in the system instruction:\n\`\`\`json\n${JSON.stringify(analysisPayload, null, 2)}\n\`\`\``;

        const geminiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
          contents: userPrompt,
          config: {
            systemInstruction: systemInstructionForUserJSON,
            responseMimeType: "application/json",
            temperature: 0,
          },
        });
        
        // Parse the JSON response from the model
        const responseText = geminiResponse.text;
        if (!responseText) {
            console.error("Orion AI returned an empty response for user analysis.");
            res.status(500).send({data: "Orion AI returned an empty response."});
            return;
        }

        let jsonStr = responseText.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }

        const parsedData = JSON.parse(jsonStr);
        
        // Format the parsed data into the desired string template
        const formattedReply = `
@${parsedData.username} - Trust Score: ${parsedData.trustScore}/100 ${parsedData.emoji}

Hey admin, ${parsedData.summary}.

Here's what I found:
${parsedData.findings.map((f: string) => `• ${f}`).join("\n")}

My take: ${parsedData.recommendation}
`.trim().replace(/^\s*[\r\n]/gm, ""); // Also remove blank lines at the start

        res.status(200).send({data: formattedReply});
        return;
      } else {
        // --- GENERAL SCENARIO ANALYSIS PATH ---
         const systemInstructionForScenarioJSON = `You are Orion, an AI analyst. Your response must be a valid JSON object. Do not add other text.

{
  "analysisTitle": string,
  "fraudRisk": number, // A score from 0 (low) to 100 (high)
  "riskEmoji": "✅" | "⚠️" | "🚨", // ✅ (0-29), ⚠️ (30-69), 🚨 (70+)
  "summary": string, // A single, concise sentence summary.
  "findings": string[], // An array of 2 to 3 key findings.
  "recommendation": string // A single, concise recommendation.
}`;

        const userPrompt = command;

        const geminiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
          contents: userPrompt,
          config: {
            systemInstruction: systemInstructionForScenarioJSON,
            responseMimeType: "application/json",
            temperature: 0,
          },
        });
        
        const responseText = geminiResponse.text;
        if (!responseText) {
            console.error("Orion AI returned an empty response for general analysis.");
            res.status(500).send({data: "Orion AI returned an empty response."});
            return;
        }
        
        let jsonStr = responseText.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }

        const parsedData = JSON.parse(jsonStr);

        const formattedReply = `
${parsedData.analysisTitle} - Fraud Risk: ${parsedData.fraudRisk}/100 ${parsedData.riskEmoji}

Hey admin, ${parsedData.summary}.

Here's the breakdown:
${parsedData.findings.map((f: string) => `• ${f}`).join("\n")}

My take: ${parsedData.recommendation}
`.trim().replace(/^\s*[\r\n]/gm, ""); // Also remove blank lines at the start

        res.status(200).send({data: formattedReply});
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

// New function for Starlight Writer (AI blog assistant)
export const starlightWriter = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication is required.");
    }

    const userRole = context.auth.token.role;
    if (userRole !== "Admin" && userRole !== "Writer") {
        throw new functions.https.HttpsError("permission-denied", "You do not have permission to use this feature.");
    }

    const {task, content} = data;
    if (!task || !content || (task !== "title" && task !== "excerpt")) {
        throw new functions.https.HttpsError("invalid-argument", "The function requires a 'task' ('title' or 'excerpt') and 'content'.");
    }

    let prompt = "";
    if (task === "title") {
        prompt = `Based on the following article content, generate 5 catchy, engaging, and SEO-friendly titles in Thai. The titles should be concise and relevant to the content. Return the result as a JSON object with a single key "suggestions" which is an array of strings. Content: """${content}"""`;
    } else { // task === "excerpt"
        prompt = `Based on the following article content, generate a concise and compelling summary of no more than 160 characters in Thai. The summary should entice users to click and read the full article. Return the result as a JSON object with a single key "suggestions" which is an array containing one summary string. Content: """${content}"""`;
    }

    try {
        const geminiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.7,
            },
        });
        const responseText = geminiResponse.text;
        if (!responseText) {
            throw new functions.https.HttpsError("internal", "AI model returned an empty response.");
        }

        let jsonStr = responseText.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error in starlightWriter function:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate AI suggestions.");
    }
});
