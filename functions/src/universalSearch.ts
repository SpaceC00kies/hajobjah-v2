// functions/src/universalSearch.ts

import admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { Job, HelperProfile, SearchResultItem } from "./types.js";

admin.initializeApp();
const db = admin.firestore();

export const universalSearch = onCall({
  cors: ["https://www.hajobja.com","https://hajobja.com","http://localhost:5173"]
}, async (request) => {
  // 1) Auth
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated","You must be logged in.");
  }

  // 2) Validate
  const raw = request.data.query as string;
  if (!raw || typeof raw !== "string") {
    throw new HttpsError("invalid-argument","Please enter a search term.");
  }

  // 3) Split keyword + optional province
  const parts = raw.trim().split(/\s+/);
  const keyword = parts[0].toLowerCase();
  let province = parts[1];
  const provinceMap: Record<string,string> = {
    "กรุงเทพ": "กรุงเทพมหานคร",
    "กทม":     "กรุงเทพมหานคร"
  };
  if (province && provinceMap[province]) {
    province = provinceMap[province];
  }

  // 4) Fetch a small batch of active docs
  const [jobsSnap, helpersSnap] = await Promise.all([
    db.collection("jobs")
      .where("isExpired","==",false)
      .limit(100)
      .get(),
    db.collection("helperProfiles")
      .where("isExpired","==",false)
      .limit(100)
      .get()
  ]);

  // 5) In-memory filter
  const matches = (text: any) =>
    typeof text === "string" && text.toLowerCase().includes(keyword);

  const jobResults: SearchResultItem[] = jobsSnap.docs
    .map(d => ({ ...(d.data() as Job), id: d.id, resultType: "job" as const }))
    .filter(job =>
      matches(job.title) &&
      (!province || job.province === province)
    );

  const helperResults: SearchResultItem[] = helpersSnap.docs
    .map(d => ({ ...(d.data() as HelperProfile), id: d.id, resultType: "helper" as const }))
    .filter(help =>
      matches(help.profileTitle) &&
      (!province || help.province === province)
    );

  // 6) Return
  return { results: [...jobResults, ...helperResults] };
});