

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
            onActionButtonClick={() => currentUser ? navigate('/post-helper') : navigate('/login')}
          />
        </aside>

        <section className="lg:col-span-9">
          {isLoading && profiles.length === 0 ? (
            <div className="text-center py-10 text-primary-dark font-sans">กำลังโหลด...</div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-lg shadow flex flex-col items-center justify-center min-h-[300px]">
              <p className="text-xl text-neutral-dark mb-2">ไม่พบโปรไฟล์ผู้ช่วยที่ตรงกับเงื่อนไขของคุณ</p>
              <p className="text-sm text-neutral-medium">ลองปรับเปลี่ยนตัวกรอง</p>
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
                    currentUser={currentUser}
                    getAuthorDisplayName={getAuthorDisplayName}
                    onToggleInterest={() => userActions.toggleInterest(profile.id, 'helperProfile', profile.userId)}
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