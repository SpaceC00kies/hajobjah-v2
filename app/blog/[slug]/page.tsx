// app/blog/[slug]/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { getBlogPostBySlugService } from '@/services/blogService';
import { BlogArticlePage } from '@/components/BlogArticlePage';
import { useData } from '@/context/DataContext';
import type { EnrichedBlogPost, BlogComment } from '@/types/types';

// This is now a client component.
export default function ArticlePage({ params }: { params: { slug: string } }) {
    const [post, setPost] = useState<EnrichedBlogPost | null>(null);
    const [comments, setComments] = useState<BlogComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    
    const { users } = useData();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(false);
            if (!params.slug || users.length === 0) return;
            try {
                const postData = await getBlogPostBySlugService(params.slug);
                if (!postData) {
                    setError(true);
                    return;
                }
                // TODO: Replace with actual blog comment fetching service
                const commentsData: BlogComment[] = []; 

                const author = users.find(u => u.id === postData.authorId);
                const enrichedPost = {
                    ...postData,
                    authorPhotoURL: author?.photo || postData.authorPhotoURL,
                    author: author,
                };
                
                setPost(enrichedPost);
                setComments(commentsData);

            } catch (e) {
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [params.slug, users]);


    if (isLoading) return <div className="p-10 text-center">Loading article...</div>;
    if (error || !post) return notFound();

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <BlogArticlePage
                post={post}
                comments={comments}
                currentUser={null} // Handled by useAuth in the component
                canEditOrDelete={() => false} // Handled by useAuth in the component
            />
        </div>
    );
}
