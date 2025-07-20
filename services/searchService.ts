import { httpsCallable } from '@firebase/functions';
import { functions } from '@/lib/firebase/clientApp';
import type { SearchResultItem, Province, Cursor, JobCategory, JobSubCategory } from '../types/types';

type SearchParams = {
  query: string;
  province: string;
};

type FilterParams = {
    resultType: 'job' | 'helper';
    searchTerm?: string;
    category?: JobCategory | 'all';
    subCategory?: JobSubCategory | 'all';
    province?: Province | 'all';
    pageSize: number;
    paginationCursor?: Cursor;
};

type FilterResult = {
    items: SearchResultItem[];
    cursor: Cursor | null;
}

export const universalSearchService = httpsCallable<SearchParams, { results: SearchResultItem[] }>(functions, 'universalSearch');

export const filterListingsService = httpsCallable<FilterParams, FilterResult>(functions, 'filterListings');