// app/find-jobs/page.tsx
"use client";
import React from 'react';
import { FindJobsPage } from '@/components/FindJobsPage';
import { useData } from '@/context/DataContext';

// This is now a client component wrapper that provides user data from context.
export default function FindJobs() {
  const { users, isLoadingData } = useData();

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <p>Loading...</p>
      </div>
    );
  }

  // The FindJobsPage component now handles its own initial data fetching.
  return (
    <FindJobsPage
      allUsers={users}
    />
  );
}
