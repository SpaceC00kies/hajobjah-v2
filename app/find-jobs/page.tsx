// THIS TURNS OFF STATIC-EXPORT AND USES SSR INSTEAD
export const dynamic = 'force-dynamic';
import React from 'react';
import { FindJobsClient } from '@/components/FindJobsPage';
import { getJobsPaginatedServer, getUsersServer } from '@/services/serverService';

// This is a Server Component that pre-fetches data.
export default async function FindJobs() {
  // Fetch initial data on the server using the Admin SDK.
  const initialJobsData = await getJobsPaginatedServer(12);
  const allUsers = await getUsersServer();

  return (
    <FindJobsClient
      initialJobs={initialJobsData.items}
      initialCursor={initialJobsData.cursor}
      allUsers={allUsers}
    />
  );
}
