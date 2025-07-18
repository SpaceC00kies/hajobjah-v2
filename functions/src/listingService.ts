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
    const { resultType, searchTerm, category, subCategory, province, pageSize = 12 } = params;

    const fetchRecentItems = async (collectionName: 'jobs' | 'helperProfiles'): Promise<SearchResultItem[]> => {
        // This query is now simplified to prevent crashes from missing indexes.
        // The isExpired check is moved to in-memory filtering below.
        const q: Query<DocumentData> = db.collection(collectionName)
            .orderBy("isPinned", "desc")
            .orderBy("updatedAt", "desc")
            .limit(150);

        const snapshot = await q.get();

        // Perform the crucial isExpired check in-memory.
        const nonExpiredDocs = snapshot.docs.filter(doc => doc.data().isExpired !== true);

        const resultTypeKey = collectionName === 'jobs' ? 'job' : 'helper';
        return nonExpiredDocs.map(doc => {
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
    };

    let allRecentItems: SearchResultItem[] = [];
    if (resultType === 'job' || resultType === 'all') {
        allRecentItems.push(...await fetchRecentItems('jobs'));
    }
    if (resultType === 'helper' || resultType === 'all') {
        allRecentItems.push(...await fetchRecentItems('helperProfiles'));
    }

    // Sort combined results if we fetched both (important for 'all' search)
    if (resultType === 'all') {
        allRecentItems.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return safeGetDate(b.updatedAt).getTime() - safeGetDate(a.updatedAt).getTime();
        });
    }

    // Apply all subsequent filters in-memory
    const filteredResults = allRecentItems.filter(item => {
        // Province filter
        if (province && province !== 'all' && item.province !== province) {
            return false;
        }
        // Category filter
        if (category && category !== 'all' && item.category !== category) {
            return false;
        }
        // Sub-category filter
        if (subCategory && subCategory !== 'all' && item.subCategory !== subCategory) {
            return false;
        }
        // Search term filter
        if (searchTerm && searchTerm.trim()) {
            const keywords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
            const filterFields = ["title", "description", "details", "category", "subCategory", "location", "province", "profileTitle", "area"];
            const itemMatchesKeyword = keywords.some(kw =>
                filterFields.some(field =>
                    (item as any)[field] && typeof (item as any)[field] === 'string' && (item as any)[field].toLowerCase().includes(kw)
                )
            );
            if (!itemMatchesKeyword) {
                return false;
            }
        }
        // If all checks pass, keep the item
        return true;
    });

    const paginatedItems = filteredResults.slice(0, pageSize);
    
    // Pagination is simplified in this model. For true infinite scroll on filtered results,
    // a more complex backend cursor strategy would be needed. This serves the immediate need.
    return {
        items: paginatedItems,
        cursor: null 
    };
};

export const filterListings = onCall({
    cors: ["https://www.hajobja.com","https://hajobja.com","http://localhost:5173"]
}, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be logged in to perform this action.");
    }
    const data = request.data as FilterParams;
    if (!data.resultType || !data.pageSize) {
        throw new HttpsError("invalid-argument", "Missing required parameters.");
    }
    return await performFilterAndSearch(data);
});
