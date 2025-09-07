import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Job, FilterableCategory, JobSubCategory, PaginatedDocsResponse, Cursor } from '../types/types.ts';
import { JOB_SUBCATEGORIES_MAP, Province } from '../types/types.ts';
import { JobCard } from './JobCard.tsx';
import { getJobsPaginated } from '../services/jobService.ts';
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useUsers } from '../hooks/useUsers.ts';
import { useUser } from '../hooks/useUser.ts';
import { motion } from 'framer-motion';
import { FilterSidebar } from './FilterSidebar.tsx';
import { useNavigate } from 'react-router-dom';
import { ListingPageLayout, itemVariants } from './ListingPageLayout.tsx';
import { FastLottie } from './FastLottie.tsx';
import '../utils/lottiePreloader.ts';

type EnrichedJob = Job;

export const FindJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users } = useUsers();
  const { userInterests } = useData();
  const userActions = useUser();

  const [jobs, setJobs] = useState<EnrichedJob[]>([]);

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
  }, [jobs]);

  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const author = users.find(u => u && u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  }, [users]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
    hasMoreRef.current = hasMore;
  }, [isLoading, hasMore]);

  const loadJobs = useCallback(async (isInitialLoad = false) => {
    setIsLoading(true);
    const startAfterCursor = isInitialLoad ? null : cursor;

    try {
      const result: PaginatedDocsResponse<Job> = await getJobsPaginated(
        12,
        startAfterCursor,
        selectedCategory,
        debouncedSearchTerm,
        selectedSubCategory,
        selectedProvince
      );

      const enriched = result.items.map(job => ({ ...job }));

      setJobs(prev => isInitialLoad ? enriched : [...prev, ...enriched]);
      setCursor(result.cursor);
      setHasMore(!!result.cursor);
    } catch (error) {
      console.error("Failed to load jobs:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, cursor, selectedCategory, selectedProvince, selectedSubCategory]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setJobs([]);
    loadJobs(true);
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
          loadJobs();
        }
      },
      { threshold: 1.0 }
    );
    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);
    return () => { if (currentLoader) observer.unobserve(currentLoader); };
  }, [loadJobs]);

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
      searchPlaceholder="ค้นหางาน, รายละเอียด..."
      actionButtonText="ลงประกาศรับสมัคร"
      onActionButtonClick={() => navigate('/post-job')}
    />
  );

  const loadMoreContent = (
    <div ref={loaderRef} className="h-10 flex justify-center items-center">
      {isLoading && jobs.length > 0 && (
        <p className="text-sm text-neutral-medium" role="status" aria-live="polite">
          กำลังโหลดเพิ่มเติม...
        </p>
      )}
      {!hasMore && jobs.length > 0 && (
        <p className="text-sm text-neutral-medium" role="status">
          🎉 คุณดูครบทุกรายการแล้ว
        </p>
      )}
    </div>
  );

  return (
    <ListingPageLayout
      title="ประกาศรับสมัคร"
      titleIcon={
        <FastLottie
          src="https://lottie.host/66d7b594-e55f-4009-95c6-973c443ca44f/H5nAQT6qnO.lottie"
          width="4rem"
          height="4rem"
          title="Megaphone animation"
          priority="high"
        />
      }
      subtitle="รับสมัครพนักงานหรือผู้ช่วยประกาศตรงนี้"
      sidebar={sidebarContent}
      isLoading={isLoading}
      hasItems={jobs.length > 0}
      emptyStateMessage="ไม่พบประกาศรับสมัครที่ตรงกับเงื่อนไขของคุณ"
      emptyStateSubMessage="ลองปรับเปลี่ยนตัวกรอง"
      loadMoreContent={loadMoreContent}
    >
      {jobs.map(job => {
        const author = users.find(u => u.id === job.userId);
        return (
          <motion.div
            key={job.id}
            variants={itemVariants}
            role="listitem"
          >
            <JobCard
              job={job}
              currentUser={currentUser}
              getAuthorDisplayName={getAuthorDisplayName}
              onToggleInterest={() => userActions.toggleInterest(job.id, 'job', job.userId)}
              isInterested={userInterests.some(i => i.targetId === job.id)}
              authorPhotoUrl={author?.photo}
              isAuthorVerified={author?.adminVerified}
            />
          </motion.div>
        );
      })}
    </ListingPageLayout>
  );
};
