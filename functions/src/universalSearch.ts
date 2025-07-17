
import { onCall, HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";
import { type Job, type HelperProfile, JobCategory } from './types.js';
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

export const universalSearch = onCall(httpsOptions, async (request) => {
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

    // This type-safe helper function is crucial for correct sorting.
    const safeGetDate = (dateLike: string | Date | Timestamp | undefined): Date => {
        if (!dateLike) {
            return new Date(0); // Return a very old date if undefined/null
        }
        // Check if it's a Firestore Timestamp
        if (typeof dateLike === 'object' && dateLike !== null && 'toDate' in dateLike && typeof (dateLike as Timestamp).toDate === 'function') {
            return (dateLike as Timestamp).toDate();
        }
        // Check if it's already a Date object
        if (dateLike instanceof Date) {
            return dateLike;
        }
        // Assume it's a string
        if (typeof dateLike === 'string') {
            const d = new Date(dateLike);
            // Return valid date or epoch if string is invalid
            return isNaN(d.getTime()) ? new Date(0) : d;
        }
        // Fallback for any other type
        return new Date(0);
    };

    try {
        const db = admin.firestore();
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                corrected_query: { type: Type.STRING, description: "The user's query with any spelling mistakes corrected." },
                keywords: { type: Type.ARRAY, description: "An array of relevant keywords extracted from the query, including synonyms or related terms in both Thai and English if applicable. Should always contain at least one keyword.", items: { type: Type.STRING } },
                location: { type: Type.STRING, description: "The primary location (e.g., city, province) mentioned in the query. If no location is found, this should be null." },
                category: { type: Type.STRING, description: `The most relevant job category. Must be one of: [${Object.values(JobCategory).join(', ')}]. If no category is relevant, this should be null.` }
            },
            required: ["corrected_query", "keywords"]
        };

        const masterPrompt = `System Instruction: You are a highly efficient Thai job platform search analyst. Your task is to analyze a user's raw search query. You must correct any typos in Thai words (e.g., 'เสิฟ' to 'เสิร์ฟ'). From the corrected query, extract key search entities. Your entire response MUST be a single, valid JSON object conforming to the specified schema, with no additional text or explanation.\n\nUser Query: "${query}"`;
        
        const aiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: masterPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        if (!aiResponse.text) {
            throw new HttpsError("internal", "AI failed to generate a valid response.");
        }
        
        const searchParams = JSON.parse(aiResponse.text);

        const jobsQuery = async () => {
            let q = db.collection('jobs').where('isExpired', '!=', true);
            if (searchParams.location) {
                q = q.where('province', '==', searchParams.location);
            }
            if (searchParams.category) {
                q = q.where('category', '==', searchParams.category);
            }
            const snapshot = await q.get();
            let docs = snapshot.docs.map(doc => ({ ...doc.data() as Job, id: doc.id, resultType: 'job' }));
            
            // In-memory keyword filtering
            if (searchParams.keywords && searchParams.keywords.length > 0) {
                docs = docs.filter(doc => {
                    const title = doc.title.toLowerCase();
                    const description = doc.description.toLowerCase();
                    return searchParams.keywords.some((kw: string) => title.includes(kw.toLowerCase()) || description.includes(kw.toLowerCase()));
                });
            }
            return docs;
        };

        const helpersQuery = async () => {
            let q = db.collection('helperProfiles').where('isExpired', '!=', true);
            if (searchParams.location) {
                q = q.where('province', '==', searchParams.location);
            }
            if (searchParams.category) {
                q = q.where('category', '==', searchParams.category);
            }
            const snapshot = await q.get();
            let docs = snapshot.docs.map(doc => ({ ...doc.data() as HelperProfile, id: doc.id, resultType: 'helper' }));

            // In-memory keyword filtering
            if (searchParams.keywords && searchParams.keywords.length > 0) {
                docs = docs.filter(doc => {
                    const title = doc.profileTitle.toLowerCase();
                    const details = doc.details.toLowerCase();
                    return searchParams.keywords.some((kw: string) => title.includes(kw.toLowerCase()) || details.includes(kw.toLowerCase()));
                });
            }
            return docs;
        };

        const [jobResults, helperResults] = await Promise.all([jobsQuery(), helpersQuery()]);
        
        const allResults = [...jobResults, ...helperResults];

        allResults.sort((a, b) => {
            const dateA = safeGetDate(a.updatedAt);
            const dateB = safeGetDate(b.updatedAt);
            return dateB.getTime() - dateA.getTime();
        });

        return { results: allResults };

    } catch (error) {
        console.error("Error in universalSearch:", error);
        const err = getErrorMessage(error);
        throw new HttpsError("internal", err.message);
    }
});
