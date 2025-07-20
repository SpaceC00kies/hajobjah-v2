// app/find-helpers/page.tsx
"use client";
import React from 'react';
import { FindHelpersPage } from '@/components/FindHelpersPage';
import { useData } from '@/context/DataContext';

// This is now a client component wrapper that provides user data from context.
export default function FindHelpers() {
  const { users, isLoadingData } = useData();
  
  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <p>Loading...</p>
      </div>
    );
  }

  // The FindHelpersPage component now handles its own initial data fetching.
  return (
    <FindHelpersPage
      allUsers={users}
    />
  );
}
