// components/FindJobsClient.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Job, FilterableCategory, JobSubCategory, User, PaginatedDocsResponse, Cursor } from '../types/types';
import { View, JobCategory, JOB_SUBCATEGORIES_MAP, Province } from '../types/types';
import { JobCard } from './JobCard';
import { getJobsPaginated } from '../services/jobService';
import { useUser } from '../hooks/useUser';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { motion } from 'framer-motion';
import { FilterSidebar } from './FilterSidebar';
import { CardSkeleton } from './CardSkeleton';

interface FindJobsClientProps {
  initialJobs: Job[];
  initialCursor: Cursor | null;
  allUsers: User[];
}

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

export const FindJobsClient: React.FC<FindJobsClientProps> = ({ initialJobs, initialCursor, allUsers }) => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { userInterests } = useData();
  const userActions = useUser();

  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [isLoading, setIsLoading] = useState(false);
  const [cursor, setCursor] = useState<Cursor | null>(initialCursor);
  const [hasMore, setHasMore] = useState(!!initialCursor);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterableCategory>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<JobSubCategory | 'all'>('all');
  const [selectedProvince, setSelectedProvince] = useState<Province | 'all'>('all');
  const [availableSubCategories, setAvailableSubCategories] = useState<JobSubCategory[]>([]);
  
  const loaderRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => {
    const user = allUsers.find(u => u.id === userId);
    return user?.publicDisplayName || fallbackName || userId;
  }, [allUsers]);

  const onNavigateToPublicProfile = (profileInfo: { userId: string }) => router.push(`/profile/${profileInfo.userId}`);
  const onEditJobFromFindView = (jobId: string) => router.push(`/post-job?edit=${jobId}`);
  const requestLoginForAction = (view: View, payload?: any) => router.push('/login');

  const loadJobs = useCallback(async (isInitialLoad = false) => {
    if (!isInitialLoad && (isLoading || !hasMore)) return;
    setIsLoading(true);
    const startAfterCursor = isInitialLoad ? null : cursor;
    try {
      const result: PaginatedDocsResponse<Job> = await getJobsPaginated(12, startAfterCursor, selectedCategory, debouncedSearchTerm, selectedSubCategory, selectedProvince);
      setJobs(prev => isInitialLoad ? result.items : [...prev, ...result.items]);
      setCursor(result.cursor);
      setHasMore(!!result.cursor);
    } catch (error) {
      console.error("Failed to load jobs:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, cursor, selectedCategory, selectedProvince, selectedSubCategory, isLoading, hasMore]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    loadJobs(true);
  }, [debouncedSearchTerm, selectedCategory, selectedSubCategory, selectedProvince]);
  
  useEffect(() => {
    if (selectedCategory !== 'all' && JOB_SUBCATEGORIES_MAP[selectedCategory]) {
      setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[selectedCategory]);
    } else {
      setAvailableSubCategories([]);
    }
    if (selectedCategory !== 'all') setSelectedSubCategory('all');
  }, [selectedCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoading) loadJobs();
    }, { threshold: 1.0 });
    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);
    return () => { if (currentLoader) observer.unobserve(currentLoader); };
  }, [loadJobs, hasMore, isLoading]);

  const showSkeletons = isLoading && jobs.length === 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-sans font-bold text-primary-dark mb-2">📢 ประกาศงาน</h2>
        <p className="text-neutral-medium font-serif">เวลาและทักษะตรงกับงานไหน ติดต่อเลย!</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8">
        <aside className="lg:col-span-3 mb-8 lg:mb-0">
          <FilterSidebar
            selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory}
            availableSubCategories={availableSubCategories} selectedSubCategory={selectedSubCategory} onSubCategoryChange={setSelectedSubCategory}
            selectedProvince={selectedProvince} onProvinceChange={setSelectedProvince}
            searchTerm={searchTerm} onSearchTermChange={setSearchTerm}
            searchPlaceholder="ค้นหางาน, รายละเอียด..." actionButtonText="ลงประกาศงาน"
            onActionButtonClick={() => currentUser ? router.push('/post-job') : requestLoginForAction(View.PostJob)}
          />
        </aside>
        <section className="lg:col-span-9">
          {showSkeletons ? (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <CardSkeleton key={`skeleton-${i}`} />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-lg shadow flex flex-col items-center justify-center min-h-[300px]">
              <p className="text-xl text-neutral-dark mb-2">ไม่พบประกาศงานที่ตรงกับเงื่อนไขของคุณ</p>
              <p className="text-sm text-neutral-medium">ลองปรับเปลี่ยนตัวกรอง</p>
            </div>
          ) : (
            <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" variants={containerVariants} initial="hidden" animate="visible">
              {jobs.map(job => (
                <motion.div key={job.id} variants={itemVariants}>
                  <JobCard
                    job={job} onNavigateToPublicProfile={onNavigateToPublicProfile} currentUser={currentUser} requestLoginForAction={requestLoginForAction}
                    onEditJobFromFindView={onEditJobFromFindView} getAuthorDisplayName={getAuthorDisplayName}
                    onToggleInterest={userActions.toggleInterest} isInterested={userInterests.some(i => i.targetId === job.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
          <div ref={loaderRef} className="h-10 flex justify-center items-center mt-4">
            {isLoading && jobs.length > 0 && <p className="text-sm text-neutral-medium">กำลังโหลดเพิ่มเติม...</p>}
            {!hasMore && jobs.length > 0 && <p className="text-sm text-neutral-medium mt-4">🎉 คุณดูครบทุกรายการแล้ว</p>}
          </div>
        </section>
      </div>
    </div>
  );
};
