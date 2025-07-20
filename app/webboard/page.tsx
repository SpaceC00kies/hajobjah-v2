// app/webboard/page.tsx
import React, { Suspense } from 'react';
import { WebboardClient } from '@/components/WebboardClient';

function WebboardLoading() {
    return <div className="p-10 text-center">Loading Webboard...</div>;
}

export default function WebboardPage() {
    return (
        <Suspense fallback={<WebboardLoading />}>
            <WebboardClient />
        </Suspense>
    );
}