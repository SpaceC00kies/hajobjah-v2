
import admin from "firebase-admin";
admin.initializeApp();

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenAI, Type } from "@google/genai";
import { type Job, type HelperProfile, type SearchResultItem, JobCategory } from "./types.js";
import type { Timestamp } from "firebase-admin/firestore";

const db = admin.firestore();
const httpsOptions = {
  cors: ["https://www.hajobja.com","https://hajobja.com","http://localhost:5173"]
};

const safeGetDate = (d: string | Date | Timestamp | undefined): Date => {
  if (!d) return new Date(0);
  if (d instanceof Date) return d;
  if (typeof d === "object" && d !== null && "toDate" in d && typeof (d as Timestamp).toDate === 'function') {
      return (d as Timestamp).toDate();
  }
  if (typeof d === 'string') {
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }
  return new Date(0);
};

export const universalSearch = onCall(httpsOptions, async (request) => {
  try {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Must be authenticated.");
    }
    const key = process.env.API_KEY;
    if (!key) {
      console.error("API_KEY environment variable is not set.");
      throw new HttpsError("failed-precondition", "Missing API key.");
    }
    const query = request.data.query;
    if (!query || typeof query !== "string") {
      throw new HttpsError("invalid-argument", "Query string required.");
    }
    console.log("🔍 raw query:", query);

    const ai = new GoogleGenAI({ apiKey: key });
    const schema = {
      type: Type.OBJECT,
      properties: {
        corrected_query: { type: Type.STRING },
        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        location: { type: Type.STRING },
        category: { type: Type.STRING }
      },
      required: ["corrected_query","keywords"]
    };

    const prompt = `System: Analyze and correct this Thai search query. Return JSON with keys corrected_query, keywords, location, category.\nUser Query: “${query}”`;
    
    const aiResp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: schema }
    });

    let params;
    try {
      if (!aiResp.text) throw new Error("AI response is empty");
      params = JSON.parse(aiResp.text);
    } catch (e) {
      console.error("Failed to parse AI response, falling back.", e);
      params = { keywords:[query], location:null, category:null };
    }
    
    const provinceMap: Record<string,string> = {
      "กรุงเทพ": "กรุงเทพมหานคร",
      "กทม": "กรุงเทพมหานคร"
    };
    if (params.location && provinceMap[params.location]) {
      params.location = provinceMap[params.location];
    }
    console.log("🤖 parsed searchParams:", params);

    let jobsQ = db.collection("jobs").where("isExpired","==",false);
    let helpersQ = db.collection("helperProfiles").where("isExpired","==",false);

    if (params.location) {
      jobsQ = jobsQ.where("province","==",params.location);
      helpersQ = helpersQ.where("province","==",params.location);
    }

    if (params.category && Object.values(JobCategory).includes(params.category)) {
      jobsQ = jobsQ.where("category","==",params.category);
      helpersQ = helpersQ.where("category","==",params.category);
    }

    const [jobsSnap, helpersSnap] = await Promise.all([
      jobsQ.limit(50).get(),
      helpersQ.limit(50).get()
    ]);
    console.log("🗃️ jobs fetched:", jobsSnap.size, "helpers fetched:", helpersSnap.size);

    const fields = ["title","description","details","profileTitle","location","province","subCategory"];
    const matches = (doc: any) => {
        if (!params.keywords || !Array.isArray(params.keywords)) return true;
        return params.keywords.some((kw: string) =>
            fields.some(f => (doc[f]||"").toString().toLowerCase().includes(kw.toLowerCase()))
        );
    };

    const jobResults = jobsSnap.docs
      .map(d => ({ ...(d.data() as Job), id: d.id, resultType: "job" as const }))
      .filter(matches);
    const helperResults = helpersSnap.docs
      .map(d => ({ ...(d.data() as HelperProfile), id: d.id, resultType: "helper" as const }))
      .filter(matches);
      
    const allResults: SearchResultItem[] = [...jobResults, ...helperResults]
      .sort((a,b) => safeGetDate(b.updatedAt).getTime() - safeGetDate(a.updatedAt).getTime());

    return { results: allResults };

  } catch (error) {
    console.error("Error in universalSearch function:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    throw new HttpsError("internal", message);
  }
});
