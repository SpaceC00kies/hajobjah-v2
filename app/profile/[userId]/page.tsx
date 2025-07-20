// app/profile/[userId]/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { PublicProfilePage } from '@/components/PublicProfilePage';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getUserDocument } from '@/services/userService';
import { getHelperProfilesByUserId } from '@/services/helperProfileService';
import type { User, HelperProfile } from '@/types/types';

export default function ProfilePage({ params }: { params: { userId: string } }) {
  const [user, setUser] = useState<User | null>(null);
  const [helperProfile, setHelperProfile] = useState<HelperProfile | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const { currentUser } = useAuth();
  const { setVouchModalData, setVouchListModalData } = useData();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const userData = await getUserDocument(params.userId);
        if (!userData) {
          setError(true);
          return;
        }
        setUser(userData);
        
        const profiles = await getHelperProfilesByUserId(params.userId);
        if (profiles.length > 0) {
          setHelperProfile(profiles[0]);
        }
      } catch (e) {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    if (params.userId) {
        fetchData();
    }
  }, [params.userId]);

  if (isLoading) return <div className="p-10 text-center">Loading profile...</div>;
  if (error || !user) return notFound();

  return (
    <PublicProfilePage
      user={user}
      helperProfile={helperProfile}
      onBack={() => router.back()}
      currentUser={currentUser}
      onVouchForUser={(userToVouch) => setVouchModalData({ userToVouch })}
      onShowVouches={(userToList) => setVouchListModalData({ userToList })}
    />
  );
}
