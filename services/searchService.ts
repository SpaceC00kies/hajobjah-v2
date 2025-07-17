
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig.ts';
import type { SearchResultItem } from '../types/types.ts';

export const universalSearchService = httpsCallable<{ query: string }, { results: SearchResultItem[] }>(functions, 'universalSearch');
