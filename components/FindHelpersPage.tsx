import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { HelperProfile, EnrichedHelperProfile, FilterableCategory, JobSubCategory, PaginatedDocsResponse, Cursor } from '../types/types.ts';
import { JobCategory, JOB_SUBCATEGORIES_MAP, Province } from '../types/types.ts';
import { HelperCard } from './HelperCard.tsx';
import { getHelperProfilesPaginated } from '../services/helperProfileService.ts';
import { useData } from '../context/DataContext.tsx';
import { motion } from 'framer-motion';
import { FilterSidebar } from './FilterSidebar.tsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useUsers } from '../hooks/useUsers.ts';
import { useUser } from '../hooks/useUser.ts';
import { ListingPageLayout, itemVariants } from './ListingPageLayout.tsx';
import { FastLottie } from './FastLottie.tsx';
import '../utils/lottiePreloader.ts';

type FullyEnrichedHelperProfile = EnrichedHelperProfile;

export const FindHelpersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users } = useUsers();
  const { userInterests } = useData();
  const userActions = useUser();

  const [profiles, setProfiles] = useState<FullyEnrichedHelperProfile[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterableCategory>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<JobSubCategory | 'all'>('all');
  const [selectedProvince, setSelectedProvince] = useState<Province | 'all'>('all');
  const [availableSubCategories, setAvailableSubCategories] = useState<JobSubCategory[]>([]);

  const loaderRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(isLoading);
  const hasMoreRef = useRef(hasMore);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    const saveScroll = () => {
      scrollPositionRef.current = window.scrollY;
    };
    window.addEventListener('scroll', saveScroll);
    return () => window.removeEventListener('scroll', saveScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, scrollPositionRef.current);
  }, [profiles]);

  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = users.find(u => u && u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  }, [users]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
    hasMoreRef.current = hasMore;
  }, [isLoading, hasMore]);


  const loadProfiles = useCallback(async (isInitialLoad = false) => {
    setIsLoading(true);
    const startAfterCursor = isInitialLoad ? null : cursor;
    try {
      const result: PaginatedDocsResponse<HelperProfile> = await getHelperProfilesPaginated(
        12,
        startAfterCursor,
        selectedCategory,
        debouncedSearchTerm,
        selectedSubCategory,
        selectedProvince
      );

      const enriched = result.items.map(profile => {
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

      setProfiles(prev => isInitialLoad ? enriched : [...prev, ...enriched]);
      setCursor(result.cursor);
      setHasMore(!!result.cursor);
    } catch (error) {
      console.error("Failed to load helper profiles:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, cursor, selectedCategory, selectedSubCategory, selectedProvince, users]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setProfiles([]);
    loadProfiles(true);
  }, [debouncedSearchTerm, selectedCategory, selectedSubCategory, selectedProvince]);

  const handleCategoryChange = useCallback((category: FilterableCategory) => {
    setSelectedCategory(category);
    const newSubCategories = category !== 'all'
      ? JOB_SUBCATEGORIES_MAP[category] || []
      : [];
    setAvailableSubCategories(newSubCategories);
    setSelectedSubCategory('all');
  }, []);

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

  const sidebarContent = (
    <FilterSidebar
      selectedCategory={selectedCategory}
      onCategoryChange={handleCategoryChange}
      availableSubCategories={availableSubCategories}
      selectedSubCategory={selectedSubCategory}
      onSubCategoryChange={setSelectedSubCategory}
      selectedProvince={selectedProvince}
      onProvinceChange={setSelectedProvince}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      searchPlaceholder="ค้นหาทักษะ, พื้นที่..."
      actionButtonText="ลงประกาศโปรไฟล์"
      onActionButtonClick={() => currentUser ? navigate('/post-helper') : navigate('/login')}
    />
  );

  const loadMoreContent = (
    <div ref={loaderRef} className="h-10 flex justify-center items-center">
      {isLoading && profiles.length > 0 && (
        <p className="text-sm text-neutral-medium" role="status" aria-live="polite">
          กำลังโหลดเพิ่มเติม...
        </p>
      )}
      {!hasMore && profiles.length > 0 && (
        <p className="text-sm text-neutral-medium" role="status">
          🎉 คุณดูครบทุกรายการแล้ว
        </p>
      )}
    </div>
  );

  return (
    <ListingPageLayout
      title="เสนอโปรไฟล์"
      titleIcon={
        <FastLottie
          src="https://lottie.host/a8f69183-d5b6-42b9-a728-d647b294b2f6/RbAE7JTZfY.lottie"
          width="5rem"
          height="5rem"
          title="Helper profile animation"
          priority="high"
        />
      }
      subtitle="รับฟรีแลนซ์หรือมองหาตำแหน่ง พรีเซนต์ตัวเองเลย"
      sidebar={sidebarContent}
      isLoading={isLoading}
      hasItems={profiles.length > 0}
      emptyStateMessage="ไม่พบโปรไฟล์ที่ตรงกับเงื่อนไขของคุณ"
      emptyStateSubMessage="ลองปรับเปลี่ยนตัวกรอง"
      loadMoreContent={loadMoreContent}
    >
      {profiles.map(profile => {
        const author = users.find(u => u.id === profile.userId);
        return (
          <motion.div
            key={profile.id}
            variants={itemVariants}
            role="listitem"
          >
            <HelperCard
              profile={profile}
              currentUser={currentUser}
              getAuthorDisplayName={getAuthorDisplayName}
              onToggleInterest={() => userActions.toggleInterest(profile.id, 'helperProfile', profile.userId)}
              isInterested={userInterests.some(i => i.targetId === profile.id)}
              isAuthorVerified={author?.adminVerified}
            />
          </motion.div>
        );
      })}
    </ListingPageLayout>
  );
};
