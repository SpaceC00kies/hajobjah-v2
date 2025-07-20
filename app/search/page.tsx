// app/search/page.tsx
"use client";
import React, { Suspense } from 'react';
import { SearchResultsPage } from '@/components/SearchResultsPage';
import { CardSkeleton } from '@/components/CardSkeleton';

function Search() {
  return (
      <Suspense fallback={
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
        </div>
      }>
          <SearchResultsPage />
      </Suspense>
  );
}

export default Search;
