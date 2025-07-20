// app/webboard/[postId]/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { getWebboardPostByIdService, getCommentsForPostService } from '@/services/webboardService';
import { WebboardPostDetail } from '@/components/WebboardPostDetail';
import type { EnrichedWebboardPost, EnrichedWebboardComment, User } from '@/types/types';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useWebboard } from '@/hooks/useWebboard';
import { useUser } from '@/hooks/useUser';
import { useAdmin } from '@/hooks/useAdmin';
import { useRouter } from 'next/navigation';
import { View } from '@/types/types';

export default function WebboardPostPage({ params }: { params: { postId: string } }) {
    const [post, setPost] = useState<EnrichedWebboardPost | null>(null);
    const [comments, setComments] = useState<EnrichedWebboardComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    const { users } = useData();
    const { currentUser } = useAuth();
    const webboardActions = useWebboard();
    const userActions = useUser();
    const adminActions = useAdmin();
    const router = useRouter();
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(false);
            try {
                const postData = await getWebboardPostByIdService(params.postId);
                if (!postData) {
                    setError(true);
                    return;
                }
                const commentsData = await getCommentsForPostService(params.postId);

                const author = users.find(u => u.id === postData.userId);
                const enrichedPost: EnrichedWebboardPost = {
                    ...postData,
                    commentCount: commentsData.length,
                    authorPhoto: author?.photo || postData.authorPhoto,
                    isAuthorAdmin: author?.role === 'Admin',
                };
                
                const enrichedComments: EnrichedWebboardComment[] = commentsData.map(comment => {
                    const commenter = users.find(u => u.id === comment.userId);
                    return { ...comment, authorPhoto: commenter?.photo || comment.authorPhoto, isAuthorAdmin: commenter?.role === 'Admin' };
                });

                setPost(enrichedPost);
                setComments(enrichedComments);

            } catch(e) {
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        if (params.postId && users.length > 0) {
            fetchData();
        }
    }, [params.postId, users]);

    const getAuthorDisplayName = (userId: string, fallbackName?: string) => {
        const user = users.find(u => u.id === userId);
        return user?.publicDisplayName || fallbackName || '...';
    };

    if (isLoading) return <div className="p-10 text-center">Loading post...</div>;
    if (error || !post) return notFound();

    return (
        <WebboardPostDetail
            post={post}
            comments={comments}
            currentUser={currentUser}
            users={users}
            onToggleLike={webboardActions.toggleWebboardPostLike}
            onSavePost={userActions.saveWebboardPost}
            onSharePost={(postId, postTitle) => { /* Implement share logic */ }}
            onAddComment={webboardActions.addWebboardComment}
            onDeletePost={(postId) => webboardActions.deleteWebboardPost(postId).then(() => router.push('/webboard'))}
            onPinPost={adminActions.pinWebboardPost}
            onEditPost={(postToEdit) => router.push(`/webboard?edit=${postToEdit.id}`)}
            onDeleteComment={webboardActions.deleteWebboardComment}
            onUpdateComment={webboardActions.updateWebboardComment}
            requestLoginForAction={(view, payload) => router.push('/login')}
            onNavigateToPublicProfile={(profileInfo) => router.push(`/profile/${profileInfo.userId}`)}
            checkWebboardCommentLimits={webboardActions.checkWebboardCommentLimits}
            getAuthorDisplayName={getAuthorDisplayName}
        />
    );
}
