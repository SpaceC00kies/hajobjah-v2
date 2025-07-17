
import { onCall, HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";
import { type Job, type HelperProfile, JobCategory, type SearchResultItem } from './types.js';
import type { Timestamp } from 'firebase-admin/firestore';

// Helper function to get error message and code safely, local to this module
const getErrorMessage = (e: unknown): { message: string, code?: string } => {
  if (e instanceof Error) return { message: e.message, code: (e as any).code };
  return { message: String(e) };
};

// Common HTTPS options for this callable function to handle CORS
const httpsOptions = {
    cors: ["https://www.hajobja.com", "https://hajobja.com", "http://localhost:5173"],
};

// This type-safe helper function is crucial for correct sorting.
const safeGetDate = (dateLike: string | Date | Timestamp | undefined): Date => {
    if (!dateLike) return new Date(0); // Return epoch for null/undefined
    if (dateLike instanceof Date) return dateLike;
    if (typeof dateLike === 'object' && 'toDate' in dateLike && typeof (dateLike as Timestamp).toDate === 'function') {
        return (dateLike as Timestamp).toDate();
    }
    if (typeof dateLike === 'string') {
        const d = new Date(dateLike);
        return isNaN(d.getTime()) ? new Date(0) : d;
    }
    return new Date(0);
};


export const universalSearch = onCall(httpsOptions, async (request) => {
    // Phase 1: Authentication & AI Analysis
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const geminiApiKey = process.env.API_KEY;
    if (!geminiApiKey) {
        console.error("CRITICAL: API_KEY environment variable not set.");
        throw new HttpsError("failed-precondition", "Server is not configured correctly. Missing API Key.");
    }

    const query = request.data.query;
    if (!query || typeof query !== "string") {
        throw new HttpsError("invalid-argument", "The function must be called with a 'query' string.");
    }
    
    console.log("🔍 raw query:", query);

    try {
        const db = admin.firestore();
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                corrected_query: { type: Type.STRING, description: "The user's query with any spelling mistakes corrected." },
                keywords: { type: Type.ARRAY, description: "An array of relevant keywords extracted from the query, including synonyms. Should always contain at least one keyword.", items: { type: Type.STRING } },
                location: { type: Type.STRING, description: "The primary location (e.g., city, province) mentioned. If none, this should be null." },
                category: { type: Type.STRING, description: `The most relevant job category. Must be one of: [${Object.values(JobCategory).join(', ')}]. If none, this should be null.` }
            },
            required: ["corrected_query", "keywords"]
        };

        const masterPrompt = `System Instruction: You are a Thai job platform search analyst. Analyze the user's query and correct any typos. Extract the Job Title, Location, and relevant Job Category. Your response MUST be a JSON object with the keys: "corrected_query", "keywords", "location", "category".\n\nUser Query: "${query}"`;
        
        const aiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: masterPrompt,
            config: { responseMimeType: "application/json", responseSchema }
        });
        
        if (!aiResponse.text) {
            throw new HttpsError("internal", "AI failed to generate a valid response.");
        }
        
        let searchParams;
        try {
            searchParams = JSON.parse(aiResponse.text);
        } catch (e) {
            console.error("Failed to parse AI JSON response:", aiResponse.text);
            searchParams = { keywords: [query], location: null, category: null }; // Fallback
        }

        console.log("🤖 parsed searchParams:", searchParams);


        // Phase 2: Parallel Firestore Queries
        const jobsQuery = () => {
            let q = db.collection('jobs').where("isExpired", "!=", true);
            if (searchParams.location) {
                q = q.where("province", "==", searchParams.location);
            }
            if (searchParams.category && Object.values(JobCategory).includes(searchParams.category)) {
                q = q.where("category", "==", searchParams.category);
            }
            return q.limit(50).get();
        };

        const helpersQuery = () => {
            let q = db.collection('helperProfiles').where("isExpired", "!=", true);
            if (searchParams.location) {
                q = q.where("province", "==", searchParams.location);
            }
            if (searchParams.category && Object.values(JobCategory).includes(searchParams.category)) {
                q = q.where("category", "==", searchParams.category);
            }
            return q.limit(50).get();
        };
        
        const [jobsSnap, helpersSnap] = await Promise.all([jobsQuery(), helpersQuery()]);

        // Phase 3: In-memory keyword filter
        const filterFields = ["title", "description", "details", "profileTitle", "location", "province", "subCategory"];
        const matches = (data: any): boolean => {
            if (!searchParams.keywords || searchParams.keywords.length === 0) return true; // No keywords, no filtering
            return searchParams.keywords.some((kw: string) =>
                filterFields.some(f =>
                    (data[f] || "").toString().toLowerCase().includes(kw.toLowerCase())
                )
            );
        };
        
        // Phase 4: Finalize and Return Results
        const jobResults = jobsSnap.docs
            .map(d => ({ ...d.data() as Job, id: d.id, resultType: 'job' as const }))
            .filter(matches);
            
        const helperResults = helpersSnap.docs
            .map(d => ({ ...d.data() as HelperProfile, id: d.id, resultType: 'helper' as const }))
            .filter(matches);
        
        const allResults: SearchResultItem[] = [...jobResults, ...helperResults]
            .sort((a, b) => safeGetDate(b.updatedAt).getTime() - safeGetDate(a.updatedAt).getTime());

        return { results: allResults };

    } catch (error) {
        console.error("Error in universalSearch:", error);
        const err = getErrorMessage(error);
        throw new HttpsError("internal", err.message);
    }
});
