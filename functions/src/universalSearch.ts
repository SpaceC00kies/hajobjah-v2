// functions/src/universalSearch.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { performFilterAndSearch } from './listingService.js';

// Note: Firebase Admin is initialized in modules called by this function.

interface SearchParams {
    query: string;
    province: string;
}

export const universalSearch = onCall({
    cors: ["https://www.hajobja.com","https://hajobja.com","http://localhost:5173"]
}, async (request) => {
    // No auth check needed for public search
    const data = request.data as SearchParams;
    if (!data.query) {
        throw new HttpsError("invalid-argument", "Search query is required.");
    }

    const result = await performFilterAndSearch({
        resultType: 'all',
        searchTerm: data.query,
        province: data.province as any,
        pageSize: 100, // Fetch a large number for initial search, client will filter
    });
    
    return { results: result.items };
});