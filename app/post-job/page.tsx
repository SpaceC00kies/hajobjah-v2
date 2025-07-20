// app/post-job/page.tsx
"use client";
import { PostJobForm } from '@/components/PostJobForm';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

// This page component handles the logic for creating a new job post.
export default function CreateJobPage() {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();

  // Protect the route client-side.
  // In a production app, middleware would be a better solution for this.
  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.push('/login?redirect=/post-job');
    }
  }, [currentUser, isLoadingAuth, router]);

  // Display a loading state while authentication status is being determined.
  if (isLoadingAuth || !currentUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Render the form for creating a new job.
  // The 'initialData' prop is omitted and isEditing is false for the create flow.
  return <PostJobForm isEditing={false} />;
}
