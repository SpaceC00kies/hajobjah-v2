// components/HomePageClient.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UniversalSearchBar } from './UniversalSearchBar';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

export const HomePageClient: React.FC = () => {
    const { currentUser } = useAuth();
    const { setIsLocationModalOpen } = useData();
    const [isSearching, setIsSearching] = useState(false);
    const [homeProvince, setHomeProvince] = useState<string>('all');
    const router = useRouter();

    const handleSearch = async (searchParams: { query: string, province: string }) => {
        setIsSearching(true);
        router.push(`/search?query=${encodeURIComponent(searchParams.query)}&province=${encodeURIComponent(searchParams.province)}`);
    };

    return (
        <div className="w-full h-full flex items-center justify-center hero-section">
            <div className="container mx-auto flex flex-col items-center px-6 text-center py-12 sm:py-20">
                <h1 className="hero-title">✨ หาจ๊อบจ้า ✨</h1>
                <p className="hero-subtitle">แพลตฟอร์มที่อยู่เคียงข้างคนขยัน</p>

                <UniversalSearchBar
                    onSearch={handleSearch}
                    isLoading={isSearching}
                    selectedProvince={homeProvince}
                    onProvinceChange={setHomeProvince}
                    onOpenLocationModal={() => setIsLocationModalOpen(true)}
                />

                <div className="flex items-center space-x-6 mt-4">
                    <button onClick={() => router.push('/find-jobs')} className="secondary-browse-link">
                        ดูประกาศงานทั้งหมด
                    </button>
                    <span className="text-neutral-medium">|</span>
                    <button onClick={() => router.push('/find-helpers')} className="secondary-browse-link">
                        ดูโปรไฟล์ทั้งหมด
                    </button>
                </div>
            </div>
        </div>
    );
};