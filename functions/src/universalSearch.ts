// functions/src/universalSearch.ts

import admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { Job, HelperProfile, SearchResultItem } from "./types.js";

admin.initializeApp();
const db = admin.firestore();

export const universalSearch = onCall({
  cors: ["https://www.hajobja.com","https://hajobja.com","http://localhost:5173"]
}, async (request) => {
  // 1) Authentication
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated","You must be logged in.");
  }

  // 2) Validate input
  const raw = request.data.query as string;
  if (!raw || typeof raw !== "string") {
    throw new HttpsError("invalid-argument","Please enter a search term.");
  }

  // 3) Split into keyword + optional province
  const parts = raw.trim().split(/\s+/);
  const keyword = parts[0];
  let province = parts[1];
  const provinceMap: Record<string,string> = {
    "กรุงเทพ": "กรุงเทพมหานคร",
    "กทม":     "กรุงเทพมหานคร"
  };
  if (province && provinceMap[province]) {
    province = provinceMap[province];
  }

  // 4) Build Firestore queries
  let jobsQ = db.collection("jobs")
    .where("isExpired","==",false);
  let helpersQ = db.collection("helperProfiles")
    .where("isExpired","==",false);

  if (province) {
    jobsQ = jobsQ.where("province","==",province);
    helpersQ = helpersQ.where("province","==",province);
  }

  // prefix search on title / profileTitle
  jobsQ = jobsQ
    .orderBy("title")
    .startAt(keyword)
    .endAt(keyword + "\uf8ff")
    .limit(50);

  helpersQ = helpersQ
    .orderBy("profileTitle")
    .startAt(keyword)
    .endAt(keyword + "\uf8ff")
    .limit(50);

  // 5) Execute both
  const [jobsSnap, helpersSnap] = await Promise.all([
    jobsQ.get(),
    helpersQ.get()
  ]);

  // 6) Map results
  const jobResults: SearchResultItem[] = jobsSnap.docs.map(doc => ({
    ...(doc.data() as Job),
    id: doc.id,
    resultType: "job"
  }));

  const helperResults: SearchResultItem[] = helpersSnap.docs.map(doc => ({
    ...(doc.data() as HelperProfile),
    id: doc.id,
    resultType: "helper"
  }));

  // 7) Merge & return
  return { results: [...jobResults, ...helperResults] };
});