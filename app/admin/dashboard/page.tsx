// app/admin/dashboard/page.tsx
"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminDashboard } from '@/components/AdminDashboard';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/types';

export default function AdminDashboardPage() {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!currentUser) {
        router.push('/login?redirect=/admin/dashboard');
      } else if (currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.Writer) {
        // If user is not an admin or writer, redirect to homepage
        router.push('/');
      }
    }
  }, [currentUser, isLoadingAuth, router]);

  if (isLoadingAuth || !currentUser || (currentUser.role !== UserRole.Admin && currentUser.role !== UserRole.Writer)) {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <p>Verifying access...</p>
      </div>
    );
  }

  // The AdminDashboard component is now self-sufficient and fetches its own data via hooks.
  return <AdminDashboard />;
}
