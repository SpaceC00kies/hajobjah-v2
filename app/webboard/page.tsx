// THIS TURNS OFF STATIC-EXPORT AND USES SSR INSTEAD
export const dynamic = 'force-dynamic';
import React, { Suspense } from 'react';
import { WebboardClient } from '@/components/WebboardClient';
import { getWebboardPostsPaginatedServer } from '@/services/serverService';

function WebboardLoading() {
    return <div className="p-10 text-center">Loading Webboard...</div>;
}

// This is now a Server Component that pre-fetches initial posts.
export default async function WebboardPage() {
    const initialPostsData = await getWebboardPostsPaginatedServer(10);

    return (
        <Suspense fallback={<WebboardLoading />}>
            <WebboardClient 
              initialPosts={initialPostsData.items}
              initialCursor={initialPostsData.cursor}
            />
        </Suspense>
    );
}
