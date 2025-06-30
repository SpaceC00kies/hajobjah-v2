"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orionAnalyze = void 0;
var functions = require("firebase-functions");
var admin = require("firebase-admin");
var genai_1 = require("@google/genai");
admin.initializeApp();
var db = admin.firestore();
// Access the API key from the function's environment variables
var geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    console.error("GEMINI_API_KEY environment variable not set.");
}
var ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey || "" });
exports.orionAnalyze = functions.https.onCall(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var command, analyzeUserMatch, username, usersRef, userQuery, userDoc, userData, userId, vouchesGivenQuery, vouchesReceivedQuery, postsQuery, commentsQuery, vouchesGiven, vouchesReceived, posts, comments, analysisPayload, systemInstruction, prompt_1, response_1, response, error_1;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                // 1. Security Check: Ensure the user is an admin.
                if (((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== "Admin") {
                    throw new functions.https.HttpsError("permission-denied", "You must be an administrator to use this feature.");
                }
                command = request.data.command;
                if (!command) {
                    throw new functions.https.HttpsError("invalid-argument", "The function must be called with a command.");
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 10, , 11]);
                analyzeUserMatch = command.match(/analyze user @(\w+)/i);
                if (!(analyzeUserMatch && analyzeUserMatch[1])) return [3 /*break*/, 8];
                username = analyzeUserMatch[1];
                usersRef = db.collection("users");
                return [4 /*yield*/, usersRef.where("username", "==", username).limit(1).get()];
            case 2:
                userQuery = _c.sent();
                if (userQuery.empty) {
                    return [2 /*return*/, "User @".concat(username, " not found.")];
                }
                userDoc = userQuery.docs[0];
                userData = userDoc.data();
                userId = userDoc.id;
                return [4 /*yield*/, db.collection("vouches").where("voucherId", "==", userId).get()];
            case 3:
                vouchesGivenQuery = _c.sent();
                return [4 /*yield*/, db.collection("vouches").where("voucheeId", "==", userId).get()];
            case 4:
                vouchesReceivedQuery = _c.sent();
                return [4 /*yield*/, db.collection("webboardPosts").where("userId", "==", userId).limit(10).get()];
            case 5:
                postsQuery = _c.sent();
                return [4 /*yield*/, db.collection("webboardComments").where("userId", "==", userId).limit(20).get()];
            case 6:
                commentsQuery = _c.sent();
                vouchesGiven = vouchesGivenQuery.docs.map(function (doc) { return doc.data(); });
                vouchesReceived = vouchesReceivedQuery.docs.map(function (doc) { return doc.data(); });
                posts = postsQuery.docs.map(function (doc) { return doc.data(); });
                comments = commentsQuery.docs.map(function (doc) { return doc.data(); });
                analysisPayload = {
                    userProfile: {
                        id: userId,
                        username: userData.username,
                        publicDisplayName: userData.publicDisplayName,
                        role: userData.role,
                        createdAt: userData.createdAt,
                        vouchInfo: userData.vouchInfo,
                        lastLoginIP: userData.lastLoginIP,
                    },
                    vouchesGiven: vouchesGiven,
                    vouchesReceived: vouchesReceived,
                    activitySummary: {
                        postCount: posts.length,
                        commentCount: comments.length,
                        latestPosts: posts.map(function (p) { return p.title; }).slice(0, 5),
                    },
                };
                systemInstruction = "You are Orion, a world-class security and behavior analyst for the HAJOBJA.COM platform.\n      Your task is to analyze the provided JSON data about a user and generate a concise, actionable report for the administrator.\n      Focus on patterns of trust, risk, and platform engagement.\n      Provide a 'Genuineness Score' from 0 (highly suspicious) to 100 (highly trustworthy) and a clear recommendation.\n      Format your response in Markdown with headings.";
                prompt_1 = "".concat(systemInstruction, "\n\n      Analyze the following data:\n      ").concat(JSON.stringify(analysisPayload, null, 2), "\n\n      Your Analysis:");
                return [4 /*yield*/, ai.models.generateContent({
                        model: "gemini-2.5-flash-preview-04-17",
                        contents: prompt_1,
                    })];
            case 7:
                response_1 = _c.sent();
                // 4. Return Response
                return [2 /*return*/, response_1.text];
            case 8: return [4 /*yield*/, ai.models.generateContent({
                    model: "gemini-2.5-flash-preview-04-17",
                    contents: "An admin on HAJOBJA.COM asked: \"".concat(command, "\". Provide a helpful, general answer."),
                })];
            case 9:
                response = _c.sent();
                return [2 /*return*/, response.text];
            case 10:
                error_1 = _c.sent();
                console.error("Error in orionAnalyze function:", error_1);
                throw new functions.https.HttpsError("internal", "An error occurred while processing your request.");
            case 11: return [2 /*return*/];
        }
    });
}); });
