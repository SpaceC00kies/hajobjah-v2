// app/admin/editor/page.tsx
import React, { Suspense } from 'react';
import { ArticleEditorClient } from '@/components/ArticleEditorClient';

function EditorLoading() {
    return (
        <div className="flex justify-center items-center h-screen w-full">
            <p>Loading Editor...</p>
        </div>
    );
}

export default function ArticleEditorPage() {
    return (
        <Suspense fallback={<EditorLoading />}>
            <ArticleEditorClient />
        </Suspense>
    );
}