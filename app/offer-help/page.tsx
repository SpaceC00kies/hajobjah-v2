// app/offer-help/page.tsx
"use client";
import { OfferHelpForm } from '@/components/OfferHelpForm';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

// This page component handles the logic for creating a new helper profile.
export default function CreateHelperPage() {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();

  // Protect the route client-side.
  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.push('/login?redirect=/offer-help');
    }
  }, [currentUser, isLoadingAuth, router]);

  // Display a loading state while auth status is determined.
  if (isLoadingAuth || !currentUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Render the form for creating a new helper profile.
  return <OfferHelpForm isEditing={false} />;
}
