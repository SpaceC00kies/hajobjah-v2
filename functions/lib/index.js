"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orionAnalyze = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const genai_1 = require("@google/genai");
admin.initializeApp();
const db = admin.firestore();
// Access the API key from the function's environment variables
const geminiApiKey = functions.config().gemini.key;
if (!geminiApiKey) {
    console.error("GEMINI_API_KEY environment variable not set.");
}
const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey || "" });
exports.orionAnalyze = functions.https.onCall((request) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // 1. Security Check: Ensure the user is an admin.
    if (((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== "Admin") {
        throw new functions.https.HttpsError("permission-denied", "You must be an administrator to use this feature.");
    }
    const command = request.data.command;
    if (!command) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with a command.");
    }
    try {
        const analyzeUserMatch = command.match(/analyze user @(\w+)/i);
        if (analyzeUserMatch && analyzeUserMatch[1]) {
            const username = analyzeUserMatch[1];
            // 2. Data Gathering: Fetch user and related data from Firestore.
            const usersRef = db.collection("users");
            const userQuery = yield usersRef.where("username", "==", username).limit(1).get();
            if (userQuery.empty) {
                return `User @${username} not found.`;
            }
            const userDoc = userQuery.docs[0];
            const userData = userDoc.data();
            const userId = userDoc.id;
            // Fetch related data
            const vouchesGivenQuery = yield db.collection("vouches").where("voucherId", "==", userId).get();
            const vouchesReceivedQuery = yield db.collection("vouches").where("voucheeId", "==", userId).get();
            const postsQuery = yield db.collection("webboardPosts").where("userId", "==", userId).limit(10).get();
            const commentsQuery = yield db.collection("webboardComments").where("userId", "==", userId).limit(20).get();
            const vouchesGiven = vouchesGivenQuery.docs.map((doc) => doc.data());
            const vouchesReceived = vouchesReceivedQuery.docs.map((doc) => doc.data());
            const posts = postsQuery.docs.map((doc) => doc.data());
            const comments = commentsQuery.docs.map((doc) => doc.data());
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
            const response = yield ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17",
                contents: prompt,
            });
            // 4. Return Response
            return response.text;
        }
        // Default response for unrecognized commands
        const response = yield ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: `An admin on HAJOBJA.COM asked: "${command}". Provide a helpful, general answer.`,
        });
        return response.text;
    }
    catch (error) {
        console.error("Error in orionAnalyze function:", error);
        throw new functions.https.HttpsError("internal", "An error occurred while processing your request.");
    }
}));
