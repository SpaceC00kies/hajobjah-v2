// THIS TURNS OFF STATIC-EXPORT AND USES SSR INSTEAD
export const dynamic = 'force-dynamic';
import React from 'react';
import { FindHelpersClient } from '@/components/FindHelpersPage';
import { getHelperProfilesPaginatedServer, getUsersServer } from '@/services/serverService';

// This is a Server Component that pre-fetches data.
export default async function FindHelpers() {
  // Fetch initial data on the server using the Admin SDK.
  const initialProfilesData = await getHelperProfilesPaginatedServer(12);
  const allUsers = await getUsersServer();

  return (
    <FindHelpersClient
      initialProfiles={initialProfilesData.items}
      initialCursor={initialProfilesData.cursor}
      allUsers={allUsers}
    />
  );
}
