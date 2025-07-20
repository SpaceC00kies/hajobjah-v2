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
        const q: Query<DocumentData> = db.collection(collectionName)
            .orderBy("updatedAt", "desc")
            .limit(150);

        const snapshot = await q.get();

        const resultTypeKey = collectionName === 'jobs' ? 'job' : 'helper';
        return snapshot.docs.map(doc => {
            const data = doc.data();
            if (data.updatedAt) data.updatedAt = safeGetDate(data.updatedAt).toISOString();
            if (data.postedAt) data.postedAt = safeGetDate(data.postedAt).toISOString();
            if (data.createdAt) data.createdAt = safeGetDate(data.createdAt).toISOString();
            if (data.expiresAt) data.expiresAt = safeGetDate(data.expiresAt).toISOString();
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

    // STEP 2: Robust In-Memory Processing
    const now = new Date();

    const activeItems = allRecentItems.filter(item => {
        const isExpiredFlag = item.isExpired === true;
        const hasExpiredDate = item.expiresAt ? new Date(item.expiresAt as string) < now : false;
        if (isExpiredFlag || hasExpiredDate) {
            return false;
        }

        if (item.isSuspicious === true) {
            return false;
        }

        if (province && province !== 'all') {
            return item.province === province;
        }

        return true;
    });

    const sortedItems = activeItems.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return safeGetDate(b.updatedAt).getTime() - safeGetDate(a.updatedAt).getTime();
    });

    const filteredResults = sortedItems.filter(item => {
        if (category && category !== 'all' && item.category !== category) {
            return false;
        }
        if (subCategory && subCategory !== 'all' && item.subCategory !== subCategory) {
            return false;
        }
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
        return true;
    });

    const paginatedItems = filteredResults.slice(0, pageSize);
    
    return {
        items: paginatedItems,
        cursor: null 
    };
};

export const filterListings = onCall({
    cors: ["https://www.hajobja.com","https://hajobja.com","http://localhost:5173"]
}, async (request) => {
    const data = request.data as FilterParams;
    if (!data.resultType || !data.pageSize) {
        throw new HttpsError("invalid-argument", "Missing required parameters.");
    }
    return await performFilterAndSearch(data);
});
