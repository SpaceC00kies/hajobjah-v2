// app/my-room/page.tsx
"use client";
import { MyRoomPage } from '@/components/MyRoomPage';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

// This page component acts as a client-side wrapper to protect the route
// and provide the necessary user context to the main dashboard component.
export default function MyRoom() {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();

  // Protect the route client-side.
  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.push('/login?redirect=/my-room');
    }
  }, [currentUser, isLoadingAuth, router]);

  // Display a loading state while authentication status is being determined.
  if (isLoadingAuth || !currentUser) {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <p>Loading Your Room...</p>
      </div>
    );
  }

  // Render the main "My Room" component, passing only the essential currentUser object.
  return <MyRoomPage currentUser={currentUser} />;
}
