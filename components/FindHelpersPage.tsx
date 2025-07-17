
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { HelperProfile, EnrichedHelperProfile, FilterableCategory, JobSubCategory, User, PaginatedDocsResponse } from '../types/types.ts';
import { View, JobCategory, JOB_SUBCATEGORIES_MAP, Province } from '../types/types.ts';
import { HelperCard } from './HelperCard.tsx';
import { getHelperProfilesPaginated } from '../services/helperProfileService.ts';
import { useUser } from '../hooks/useUser.ts';
import { useHelpers } from '../hooks/useHelpers.ts';
import { useData } from '../context/DataContext.tsx';
import type { DocumentSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { isDateInPast } from '../utils/dateUtils.ts';
import { FilterSidebar } from './FilterSidebar.tsx';

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
  const [selectedProvince, setSelectedProvince] = useState<Province | 'all'>('all');
  const [availableSubCategories, setAvailableSubCategories] = useState<JobSubCategory[]>([]);
  const { users, userInterests } = useData();
  const userActions = useUser();
  const helperActions = useHelpers();
  
  const loaderRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(isLoading);
  const hasMoreRef = useRef(hasMore);

  useEffect(() => {
    isLoadingRef.current = isLoading;
    hasMoreRef.current = hasMore;
  }, [isLoading, hasMore]);


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
      const activeProfiles = result.items.filter(profile => 
        !profile.isExpired && (!profile.expiresAt || !isDateInPast(profile.expiresAt as string))
      );
      const enriched = enrichProfiles(activeProfiles);
      setProfiles(prev => isInitialLoad ? enriched : [...prev, ...enriched]);
      setLastVisible(result.lastVisibleDoc);
      setHasMore(result.items.length === 12 && result.lastVisibleDoc !== null);
    } catch (error) {
      console.error("Failed to load helper profiles:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, lastVisible, selectedCategory, selectedSubCategory, selectedProvince, enrichProfiles]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    loadProfiles(true);
  }, [debouncedSearchTerm, selectedCategory, selectedSubCategory, selectedProvince, loadProfiles]);

  useEffect(() => {
    if (selectedCategory !== 'all' && JOB_SUBCATEGORIES_MAP[selectedCategory]) {
      setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[selectedCategory]);
    } else {
      setAvailableSubCategories([]);
    }
    if (selectedCategory !== 'all') {
        setSelectedSubCategory('all');
    }
  }, [selectedCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
          loadProfiles();
        }
      },
      { threshold: 1.0 }
    );
    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);
    return () => { if (currentLoader) observer.unobserve(currentLoader); };
  }, [loadProfiles]);
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-sans font-bold text-primary-dark mb-2">👥 โปรไฟล์ผู้ช่วยและบริการ</h2>
        <p className="text-neutral-medium font-serif">เลือกคนที่ตรงกับความต้องการ แล้วติดต่อได้เลย!</p>
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
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="ค้นหาทักษะ, พื้นที่..."
            actionButtonText="สร้างโปรไฟล์"
            onActionButtonClick={() => currentUser ? navigateTo(View.OfferHelp) : requestLoginForAction(View.OfferHelp)}
          />
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
