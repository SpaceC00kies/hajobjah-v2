// app/webboard/page.tsx
"use client";
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WebboardPage } from '@/components/WebboardPage';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useWebboard } from '@/hooks/useWebboard';
import { useUser } from '@/hooks/useUser';
import { View, WebboardPost } from '@/types/types';

export default function Webboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentUser } = useAuth();
    const { users, webboardComments, allWebboardPostsForAdmin } = useData();
    const webboardActions = useWebboard();
    const userActions = useUser();

    const editingPostId = searchParams.get('edit');

    const editingPost = editingPostId ? allWebboardPostsForAdmin.find(p => p.id === editingPostId) : null;
    
    const getAuthorDisplayName = (userId: string, fallbackName?: string) => {
        const user = users.find(u => u.id === userId);
        return user?.publicDisplayName || fallbackName || '...';
    }
    
    const onNavigateToPublicProfile = (profileInfo: { userId: string; helperProfileId?: string }) => {
        router.push(`/profile/${profileInfo.userId}`);
    };

    return (
        <WebboardPage
            currentUser={currentUser}
            users={users}
            comments={webboardComments}
            onAddOrUpdatePost={webboardActions.addOrUpdateWebboardPost}
            onToggleLike={webboardActions.toggleWebboardPostLike}
            onSavePost={userActions.saveWebboardPost}
            onSharePost={(postId, postTitle) => { /* Implement share logic */ }}
            editingPost={editingPost as WebboardPost | null}
            onCancelEdit={() => router.push('/webboard')}
            requestLoginForAction={() => router.push('/login')}
            onNavigateToPublicProfile={onNavigateToPublicProfile}
            checkWebboardPostLimits={webboardActions.checkWebboardPostLimits}
            pageSize={10}
            getAuthorDisplayName={getAuthorDisplayName}
        />
    );
}