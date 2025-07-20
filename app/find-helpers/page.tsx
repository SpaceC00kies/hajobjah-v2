// app/find-helpers/page.tsx
import React from 'react';
import { FindHelpersClient } from '@/components/FindHelpersPage';
import { getHelperProfilesPaginated } from '@/services/helperProfileService';
import { getUsersService } from '@/services/userService';

// This is now a Server Component that pre-fetches data.
export default async function FindHelpers() {
  // Fetch initial data on the server.
  const initialProfilesData = await getHelperProfilesPaginated(12, null, 'all', null, 'all', 'all');
  const allUsers = await getUsersService();

  return (
    <FindHelpersClient
      initialProfiles={initialProfilesData.items}
      initialCursor={initialProfilesData.cursor}
      allUsers={allUsers}
    />
  );
}
