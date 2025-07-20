// app/find-jobs/page.tsx
import React from 'react';
import { FindJobsClient } from '@/components/FindJobsClient';
import { getJobsPaginated } from '@/services/jobService';
import { getUsersService } from '@/services/userService';

// This is now a Server Component that pre-fetches data.
export default async function FindJobs() {
  // Fetch initial data on the server.
  const initialJobsData = await getJobsPaginated(12, null, 'all', null, 'all', 'all');
  const allUsers = await getUsersService();

  return (
    <FindJobsClient
      initialJobs={initialJobsData.items}
      initialCursor={initialJobsData.cursor}
      allUsers={allUsers}
    />
  );
}
