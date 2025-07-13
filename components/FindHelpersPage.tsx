

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { HelperProfile, EnrichedHelperProfile, FilterableCategory, JobSubCategory, User, PaginatedDocsResponse } from '../types/types.ts';
import { View, JobCategory, JOB_SUBCATEGORIES_MAP, Province } from '../types/types.ts';
import { HelperCard } from './HelperCard.tsx';
import { Button } from './Button.tsx';
import { SearchInputWithRecent } from './SearchInputWithRecent.tsx';
import { getHelperProfilesPaginated } from '../services/helperProfileService.ts';
import { getRecentSearches, addRecentSearch } from '../utils/localStorageUtils.ts';
import { useUser } from '../hooks/useUser.ts';
import { useHelpers } from '../hooks/useHelpers.ts';
import { useData } from '../context/DataContext.tsx';
import type { DocumentSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';

interface FindHelpersPageProps {
  navigateTo: (view: View, payload?: any) => void;
  onNavigateToPublicProfile: (profileInfo: { userId: string; helperProfileId?: string }) => void;
  currentUser: User | null;
  requestLoginForAction: (view: View, payload?: any) => void;
  onEditProfileFromFindView: (profileId: string) => void;
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
}

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

export const FindHelpersPage: React.FC<FindHelpersPageProps> = ({
  navigateTo,
  onNavigateToPublicProfile,
  currentUser,
  requestLoginForAction,
  onEditProfileFromFindView,
  getAuthorDisplayName,
}) => {
  const [profiles, setProfiles] = useState<EnrichedHelperProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterableCategory>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<JobSubCategory | 'all'>('all');
  const [selectedProvince, setSelectedProvince] = useState<Province | 'all'>(Province.ChiangMai);
  const [availableSubCategories, setAvailableSubCategories] = useState<JobSubCategory[]>([]);
  const { users, userInterests } = useData();
  const userActions = useUser();
  const helperActions = useHelpers();
  
  const loaderRef = useRef<HTMLDivElement>(null);
  const recentSearchesKey = 'recentHelperSearches';
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches(recentSearchesKey));

  const enrichProfiles = useCallback((profilesToEnrich: HelperProfile[]): EnrichedHelperProfile[] => {
    return profilesToEnrich.map(profile => {
      const user = users.find(u => u.id === profile.userId);
      return {
        ...profile,
        userPhoto: user?.photo,
        userAddress: user?.address,
        profileCompleteBadge: !!user?.profileComplete,
        warningBadge: !!profile.isSuspicious,
        verifiedExperienceBadge: !!profile.adminVerifiedExperience,
        interestedCount: profile.interestedCount || 0,
      };
    });
  }, [users]);

  const loadProfiles = useCallback(async (isInitialLoad = false) => {
    if (isLoading && !isInitialLoad) return;
    setIsLoading(true);

    const startAfterDoc = isInitialLoad ? null : lastVisible;
    try {
      const result: PaginatedDocsResponse<HelperProfile> = await getHelperProfilesPaginated(
        12,
        startAfterDoc,
        selectedCategory,
        debouncedSearchTerm,
        selectedSubCategory,
        selectedProvince
      );
      const enriched = enrichProfiles(result.items);
      setProfiles(prev => isInitialLoad ? enriched : [...prev, ...enriched]);
      setLastVisible(result.lastVisibleDoc);
      setHasMore(result.items.length === 12 && result.lastVisibleDoc !== null);
    } catch (error) {
      console.error("Failed to load helper profiles:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, selectedCategory, selectedSubCategory, selectedProvince, lastVisible, isLoading, enrichProfiles]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      if(searchTerm) {
          addRecentSearch(recentSearchesKey, searchTerm);
          setRecentSearches(getRecentSearches(recentSearchesKey));
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    loadProfiles(true);
  }, [debouncedSearchTerm, selectedCategory, selectedSubCategory, selectedProvince, enrichProfiles]);

  useEffect(() => {
    if (selectedCategory !== 'all' && JOB_SUBCATEGORIES_MAP[selectedCategory]) {
      setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[selectedCategory]);
    } else {
      setAvailableSubCategories([]);
    }
    setSelectedSubCategory('all');
  }, [selectedCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadProfiles();
        }
      },
      { threshold: 1.0 }
    );
    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);
    return () => { if (currentLoader) observer.unobserve(currentLoader); };
  }, [hasMore, isLoading, loadProfiles]);
  
  const handleRecentSearchSelect = (term: string) => {
    setSearchTerm(term);
  };


  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-sans font-bold text-primary-dark mb-2">👥 โปรไฟล์ผู้ช่วยและบริการ</h2>
        <p className="text-neutral-medium font-serif">เลือกคนที่ตรงกับความต้องการ แล้วติดต่อได้เลย!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8">
        <aside className="lg:col-span-3 mb-8 lg:mb-0">
          <div className="sticky top-24 bg-white p-4 rounded-xl shadow-lg border border-primary-light">
            <div className="space-y-6">
              <SearchInputWithRecent
                  searchTerm={searchTerm}
                  onSearchTermChange={setSearchTerm}
                  placeholder="ค้นหาทักษะ, พื้นที่..."
                  recentSearches={recentSearches}
                  onRecentSearchSelect={handleRecentSearchSelect}
                  ariaLabel="ค้นหาโปรไฟล์ผู้ช่วย"
              />
              <div>
                <label htmlFor="province-filter-helper" className="block text-sm font-sans font-medium text-primary-dark mb-1">จังหวัด:</label>
                <select id="province-filter-helper" value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value as Province | 'all')} className="w-full">
                  <option value="all">ทุกจังหวัด</option>
                  {Object.values(Province).map(prov => <option key={prov} value={prov}>{prov}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="category-filter-helper" className="block text-sm font-sans font-medium text-primary-dark mb-1">หมวดหมู่:</label>
                <select id="category-filter-helper" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as FilterableCategory)} className="w-full">
                    <option value="all">ทุกหมวดหมู่</option>
                    {Object.values(JobCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="subcategory-filter-helper" className="block text-sm font-sans font-medium text-primary-dark mb-1">หมวดหมู่ย่อย:</label>
                <select id="subcategory-filter-helper" value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value as JobSubCategory | 'all')} disabled={availableSubCategories.length === 0} className="w-full">
                  <option value="all">ทุกหมวดหมู่ย่อย</option>
                  {availableSubCategories.map(subCat => <option key={subCat} value={subCat}>{subCat}</option>)}
                </select>
              </div>
              <Button onClick={() => currentUser ? navigateTo(View.OfferHelp) : requestLoginForAction(View.OfferHelp)} variant="secondary" className="w-full">
                + สร้างโปรไฟล์
              </Button>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-9">
          {isLoading && profiles.length === 0 ? (
            <div className="text-center py-10 text-primary-dark font-sans">กำลังโหลด...</div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-lg shadow h-full flex items-center justify-center">
              <p className="text-xl text-neutral-dark">ไม่พบโปรไฟล์ผู้ช่วยที่ตรงกับเงื่อนไข</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {profiles.map(profile => (
                <motion.div key={profile.id} variants={itemVariants}>
                  <HelperCard
                    profile={profile}
                    onNavigateToPublicProfile={onNavigateToPublicProfile}
                    navigateTo={navigateTo}
                    onLogHelperContact={userActions.logContact}
                    currentUser={currentUser}
                    requestLoginForAction={requestLoginForAction}
                    onBumpProfile={helperActions.onBumpHelperProfile}
                    onEditProfileFromFindView={onEditProfileFromFindView}
                    getAuthorDisplayName={getAuthorDisplayName}
                    onToggleInterest={userActions.toggleInterest}
                    isInterested={userInterests.some(i => i.targetId === profile.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          <div ref={loaderRef} className="h-10 flex justify-center items-center mt-4">
            {isLoading && profiles.length > 0 && <p className="text-sm text-neutral-medium">กำลังโหลดเพิ่มเติม...</p>}
            {!hasMore && profiles.length > 0 && <p className="text-sm text-neutral-medium mt-4">🎉 คุณดูครบทุกรายการแล้ว</p>}
          </div>
        </section>
      </div>
    </div>
  );
};