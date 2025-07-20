// components/SearchResultsPage.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SearchResultItem, FilterableCategory, JobSubCategory, Province, User, Job, HelperProfile, EnrichedHelperProfile } from '../types/types';
import { View, JobCategory, JOB_SUBCATEGORIES_MAP } from '../types/types';
import { FilterSidebar } from './FilterSidebar';
import { JobCard } from './JobCard';
import { HelperCard } from './HelperCard';
import { CardSkeleton } from './CardSkeleton';
import { Button } from './Button';
import { motion } from 'framer-motion';
import { universalSearchService } from '@/services/searchService';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useUser } from '@/hooks/useUser';
import { useHelpers } from '@/hooks/useHelpers';
import Link from 'next/link';

type ActiveTab = 'all' | 'jobs' | 'helpers';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};


export const SearchResultsPage: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentUser } = useAuth();
    const { users, userInterests } = useData();
    const userActions = useUser();
    const helperActions = useHelpers();

    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchError, setSearchError] = useState<string | null>(null);

    const searchQuery = searchParams.get('query') || '';
    const initialProvince = searchParams.get('province') || 'all';

    useEffect(() => {
        const performSearch = async () => {
            if (!searchQuery) {
                setIsLoading(false);
                setSearchResults([]);
                return;
            }
            setIsLoading(true);
            setSearchError(null);
            try {
                const result = await universalSearchService({ query: searchQuery, province: initialProvince });
                setSearchResults(result.data.results);
            } catch (error: any) {
                setSearchError(error.message || 'An unexpected error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        performSearch();
    }, [searchQuery, initialProvince]);


  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<FilterableCategory>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<JobSubCategory | 'all'>('all');
  const [selectedProvince, setSelectedProvince] = useState<Province | 'all'>(initialProvince as Province | 'all');
  const [availableSubCategories, setAvailableSubCategories] = useState<JobSubCategory[]>([]);

  useEffect(() => {
    if (selectedCategory !== 'all' && JOB_SUBCATEGORIES_MAP[selectedCategory]) {
      setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[selectedCategory]);
    } else {
      setAvailableSubCategories([]);
    }
    setSelectedSubCategory('all');
  }, [selectedCategory]);

  const getAuthorDisplayName = (userId: string, fallbackName?: string): string => {
      const user = users.find(u => u.id === userId);
      return user?.publicDisplayName || fallbackName || '...';
  }

  const displayedResults = useMemo(() => {
    return searchResults.filter(item => {
      const tabMatch = activeTab === 'all' || (activeTab === 'jobs' && item.resultType === 'job') || (activeTab === 'helpers' && item.resultType === 'helper');
      const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
      const subCategoryMatch = selectedSubCategory === 'all' || item.subCategory === selectedSubCategory;
      const provinceMatch = selectedProvince === 'all' || item.province === selectedProvince;
      return tabMatch && categoryMatch && subCategoryMatch && provinceMatch;
    });
  }, [searchResults, activeTab, selectedCategory, selectedSubCategory, selectedProvince]);
  
  const getTabClass = (tab: ActiveTab) => {
      return activeTab === tab 
        ? 'border-primary text-primary-dark font-semibold' 
        : 'border-transparent text-neutral-medium hover:text-primary-dark hover:border-neutral-dark/30';
  }

  const jobCount = useMemo(() => searchResults.filter(r => r.resultType === 'job').length, [searchResults]);
  const helperCount = useMemo(() => searchResults.filter(r => r.resultType === 'helper').length, [searchResults]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
      <div className="mb-4">
        <Button onClick={() => router.back()} variant="outline" size="sm">&larr; กลับ</Button>
      </div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-sans font-bold text-primary-dark mb-2">ผลการค้นหา</h2>
        <p className="text-neutral-medium font-serif">
          ผลลัพธ์สำหรับ: "<span className="font-semibold text-neutral-dark">{searchQuery}</span>"
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8">
        <aside className="lg:col-span-3 mb-8 lg:mb-0">
          <FilterSidebar
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            availableSubCategories={availableSubCategories}
            selectedSubCategory={selectedSubCategory}
            onSubCategoryChange={setSelectedSubCategory}
            selectedProvince={selectedProvince}
            onProvinceChange={setSelectedProvince}
            searchPlaceholder="ปรับแต่งการค้นหา"
          />
        </aside>

        <section className="lg:col-span-9">
            <div className="border-b border-neutral-DEFAULT mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('all')} className={`py-3 px-1 border-b-2 text-sm font-medium ${getTabClass('all')}`}>
                        ทั้งหมด ({searchResults.length})
                    </button>
                    <button onClick={() => setActiveTab('jobs')} className={`py-3 px-1 border-b-2 text-sm font-medium ${getTabClass('jobs')}`}>
                        📢 งาน ({jobCount})
                    </button>
                    <button onClick={() => setActiveTab('helpers')} className={`py-3 px-1 border-b-2 text-sm font-medium ${getTabClass('helpers')}`}>
                        👥 ผู้ช่วย ({helperCount})
                    </button>
                </nav>
            </div>
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
                </div>
            ) : searchError ? (
                 <div className="text-center py-10 bg-red-50 rounded-lg shadow h-full flex flex-col items-center justify-center">
                    <p className="text-xl text-red-700">พบข้อผิดพลาด</p>
                    <p className="text-sm text-red-600 mt-2">{searchError}</p>
                </div>
            ) : displayedResults.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow flex flex-col items-center justify-center min-h-[300px]">
                    <p className="text-xl text-neutral-dark mb-2">ไม่พบรายการที่ตรงกับการค้นหาของคุณ</p>
                    <p className="text-sm text-neutral-medium">ลองปรับเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                </div>
            ) : (
                <motion.div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                >
                {displayedResults.map(item => {
                    if (item.resultType === 'job') {
                        return (
                            <motion.div key={item.id} variants={itemVariants}>
                                <JobCard
                                    job={item as Job}
                                    onNavigateToPublicProfile={(info) => router.push(`/profile/${info.userId}`)}
                                    currentUser={currentUser}
                                    requestLoginForAction={() => router.push('/login')}
                                    onEditJobFromFindView={(id) => router.push(`/post-job?edit=${id}`)}
                                    getAuthorDisplayName={getAuthorDisplayName}
                                    onToggleInterest={userActions.toggleInterest}
                                    isInterested={userInterests.some(i => i.targetId === item.id)}
                                />
                            </motion.div>
                        );
                    }
                    if (item.resultType === 'helper') {
                        const profile = item as HelperProfile;
                        const user = users.find(u => u.id === profile.userId);
                        const enrichedProfile: EnrichedHelperProfile = {
                            ...profile,
                            userPhoto: user?.photo,
                            userAddress: user?.address,
                            profileCompleteBadge: !!user?.profileComplete,
                            warningBadge: !!profile.isSuspicious,
                            verifiedExperienceBadge: !!profile.adminVerifiedExperience,
                            interestedCount: profile.interestedCount || 0
                        };
                        return (
                             <motion.div key={item.id} variants={itemVariants}>
                                <HelperCard
                                    profile={enrichedProfile}
                                    onNavigateToPublicProfile={(info) => router.push(`/profile/${info.userId}`)}
                                    onLogHelperContact={userActions.logContact}
                                    currentUser={currentUser}
                                    requestLoginForAction={() => router.push('/login')}
                                    onBumpProfile={helperActions.onBumpProfile}
                                    onEditProfileFromFindView={(id) => router.push(`/offer-help?edit=${id}`)}
                                    getAuthorDisplayName={getAuthorDisplayName}
                                    onToggleInterest={userActions.toggleInterest}
                                    isInterested={userInterests.some(i => i.targetId === item.id)}
                                />
                             </motion.div>
                        );
                    }
                    return null;
                })}
                </motion.div>
            )}
        </section>
      </div>
    </div>
  );
};