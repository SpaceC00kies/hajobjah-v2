// app/admin/editor/page.tsx
"use client";
import React, { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { ArticleEditor } from '@/components/ArticleEditor';
import { UserRole } from '@/types/types';

export default function ArticleEditorPage() {
  const { currentUser, isLoadingAuth } = useAuth();
  const { allBlogPostsForAdmin } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();

  const editPostId = searchParams.get('edit');

  const initialData = useMemo(() => {
    if (editPostId) {
      return allBlogPostsForAdmin.find(p => p.id === editPostId);
    }
    return undefined;
  }, [editPostId, allBlogPostsForAdmin]);

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!currentUser) {
        router.push('/login?redirect=/admin/dashboard');
      } else if (currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.Writer) {
        router.push('/');
      }
    }
  }, [currentUser, isLoadingAuth, router]);

  if (isLoadingAuth || !currentUser || (currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.Writer)) {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <p>Loading Editor...</p>
      </div>
    );
  }

  const handleCancel = () => {
    router.push('/admin/dashboard');
  };

  return (
    <ArticleEditor
      onCancel={handleCancel}
      initialData={initialData}
      isEditing={!!editPostId}
      currentUser={currentUser}
    />
  );
}
