"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArticleEditor } from './ArticleEditor';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { UserRole, type BlogPost } from '@/types/types';

export const ArticleEditorClient: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentUser, isLoadingAuth } = useAuth();
    const { allBlogPostsForAdmin, isLoadingData } = useData();

    const [initialData, setInitialData] = useState<BlogPost | undefined>(undefined);
    const [isEditing, setIsEditing] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (isLoadingAuth || isLoadingData) return;

        const editId = searchParams.get('edit');
        if (editId) {
            const postToEdit = allBlogPostsForAdmin.find(p => p.id === editId);
            if (postToEdit) {
                // Check permissions
                if (currentUser?.role === UserRole.Admin || (currentUser?.role === UserRole.Writer && currentUser.id === postToEdit.authorId)) {
                    setInitialData(postToEdit);
                    setIsEditing(true);
                } else {
                    // No permission, redirect
                    router.push('/admin/dashboard');
                }
            } else {
                // Post not found, redirect
                router.push('/admin/dashboard');
            }
        } else {
            setIsEditing(false);
            setInitialData(undefined);
        }
        setIsReady(true);
    }, [searchParams, allBlogPostsForAdmin, currentUser, isLoadingAuth, isLoadingData, router]);

    const handleCancel = () => {
        router.push('/admin/dashboard');
    };

    if (isLoadingAuth || !isReady || !currentUser) {
        return <div className="flex justify-center items-center h-screen w-full"><p>Loading Editor...</p></div>;
    }
    
    if (currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.Writer) {
        // This should be caught by the page guard, but as a fallback
        router.push('/');
        return null;
    }

    return (
        <ArticleEditor
            initialData={initialData}
            isEditing={isEditing}
            onCancel={handleCancel}
            currentUser={currentUser}
        />
    );
};
