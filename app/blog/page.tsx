// app/blog/page.tsx
"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import { BlogPage } from '@/components/BlogPage';
import type { EnrichedBlogPost } from '@/types/types';

export default function BlogIndexPage() {
    const router = useRouter();
    const { allBlogPosts, users, isLoadingData } = useData();

    if (isLoadingData) {
        return <div className="text-center p-10">Loading articles...</div>;
    }

    const enrichedPosts: EnrichedBlogPost[] = allBlogPosts
        .filter(post => post.status === 'published')
        .map(post => {
            const author = users.find(u => u.id === post.authorId);
            return {
                ...post,
                authorDisplayName: author?.publicDisplayName || post.authorDisplayName,
                authorPhotoURL: author?.photo || post.authorPhotoURL,
                author: author,
            };
    });

    const handleSelectPost = (slug: string) => {
        router.push(`/blog/${slug}`);
    };

    return (
        <BlogPage
            posts={enrichedPosts}
            onSelectPost={handleSelectPost}
        />
    );
}
