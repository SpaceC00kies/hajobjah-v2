// functions/src/listingService.ts

import admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { JobCategory, JobSubCategory, Province, SearchResultItem } from "./types.js";
import type { Timestamp, Query, DocumentData } from "firebase-admin/firestore";

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

const safeGetDate = (d: string | Date | Timestamp | undefined): Date => {
  if (!d) return new Date(0);
  if (d instanceof Date) return d;
  if (typeof d === 'object' && 'toDate' in d) return (d as Timestamp).toDate();
  const parsed = new Date(d as string);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

interface FilterParams {
    resultType: 'job' | 'helper' | 'all';
    searchTerm?: string;
    category?: JobCategory | 'all';
    subCategory?: JobSubCategory | 'all';
    province?: Province | 'all';
    pageSize: number;
    paginationCursor?: {
        updatedAt: string; // ISO string
        isPinned: boolean;
    };
}

export const performFilterAndSearch = async (params: FilterParams) => {
    const { resultType, searchTerm, category, subCategory, province, pageSize = 12, paginationCursor } = params;

    const fetchCollection = async (collectionName: 'jobs' | 'helperProfiles'): Promise<SearchResultItem[]> => {
        let q: Query<DocumentData> = db.collection(collectionName)
            .where("isExpired", "==", false)
            .orderBy("isPinned", "desc")
            .orderBy("updatedAt", "desc")
            .limit(pageSize);

        if (province && province !== 'all') q = q.where("province", "==", province);
        if (category && category !== 'all') q = q.where("category", "==", category);
        if (subCategory && subCategory !== 'all') q = q.where("subCategory", "==", subCategory);

        if (paginationCursor) {
            q = q.startAfter(paginationCursor.isPinned, new Date(paginationCursor.updatedAt));
        }

        const snapshot = await q.get();
        const resultTypeKey = collectionName === 'jobs' ? 'job' : 'helper';
        const items: SearchResultItem[] = snapshot.docs.map(doc => {
            const data = doc.data();
            // Ensure date fields are converted to strings for JSON serialization
            if (data.updatedAt) data.updatedAt = safeGetDate(data.updatedAt).toISOString();
            if (data.postedAt) data.postedAt = safeGetDate(data.postedAt).toISOString();
            if (data.createdAt) data.createdAt = safeGetDate(data.createdAt).toISOString();
            return {
                ...data,
                id: doc.id,
                resultType: resultTypeKey
            } as SearchResultItem;
        });
        return items;
    };

    let results: SearchResultItem[] = [];
    if (resultType === 'job') {
        results = await fetchCollection('jobs');
    } else if (resultType === 'helper') {
        results = await fetchCollection('helperProfiles');
    } else {
        const [jobResults, helperResults] = await Promise.all([
            fetchCollection('jobs'),
            fetchCollection('helperProfiles'),
        ]);
        results = [...jobResults, ...helperResults].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return safeGetDate(b.updatedAt).getTime() - safeGetDate(a.updatedAt).getTime();
        }).slice(0, pageSize);
    }

    if (searchTerm && searchTerm.trim()) {
        const keywords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
        const filterFields = ["title", "description", "details", "category", "subCategory", "location", "province", "profileTitle", "area"];
        
        results = results.filter(item => {
            return keywords.some(kw => 
                filterFields.some(field => 
                    (item as any)[field] && typeof (item as any)[field] === 'string' && (item as any)[field].toLowerCase().includes(kw)
                )
            );
        });
    }

    const lastItem = results.length > 0 ? results[results.length - 1] : null;
    const nextCursor = lastItem ? {
        updatedAt: safeGetDate(lastItem.updatedAt).toISOString(),
        isPinned: lastItem.isPinned || false
    } : null;
    
    return {
        items: results,
        cursor: results.length < pageSize ? null : nextCursor
    };
};

export const filterListings = onCall({
    cors: ["https://www.hajobja.com","https://hajobja.com","http://localhost:5173"]
}, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be logged in to perform this action.");
    }
    // Basic validation
    const data = request.data as FilterParams;
    if (!data.resultType || !data.pageSize) {
        throw new HttpsError("invalid-argument", "Missing required parameters.");
    }
    return await performFilterAndSearch(data);
});