

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Job, FilterableCategory, JobSubCategory, User, PaginatedDocsResponse } from '../types/types.ts';
import { View, JobCategory, JOB_SUBCATEGORIES_MAP, Province } from '../types/types.ts';
import { JobCard } from './JobCard.tsx';
import { SearchInputWithRecent } from './SearchInputWithRecent.tsx';
import { getJobsPaginated } from '../services/jobService.ts';
import { getRecentSearches, addRecentSearch } from '../utils/localStorageUtils.ts';
import { useUser } from '../hooks/useUser.ts';
import { useData } from '../context/DataContext.tsx';
import type { DocumentSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';

interface FindJobsPageProps {
  navigateTo: (view: View, payload?: any) => void;
  onEditJobFromFindView: (jobId: string) => void;
  currentUser: User | null;
  requestLoginForAction: (view: View, payload?: any) => void;
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

export const FindJobsPage: React.FC<FindJobsPageProps> = ({
  navigateTo,
  onEditJobFromFindView,
  currentUser,
  requestLoginForAction,
  getAuthorDisplayName,
}) => {
  // --- STATE MANAGEMENT: All hooks are at the top level ---
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterableCategory>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<JobSubCategory | 'all'>('all');
  const [selectedProvince, setSelectedProvince] = useState<Province | 'all'>(Province.ChiangMai);
  const [availableSubCategories, setAvailableSubCategories] = useState<JobSubCategory[]>([]);
  const { userInterests } = useData();
  const userActions = useUser();
  
  const loaderRef = useRef<HTMLDivElement>(null);
  const recentSearchesKey = 'recentJobSearches';
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches(recentSearchesKey));

  // --- DATA FETCHING ---
  const loadJobs = useCallback(async (isInitialLoad = false) => {
    if (isLoading && !isInitialLoad) return;
    setIsLoading(true);

    const startAfterDoc = isInitialLoad ? null : lastVisible;
    try {
      const result: PaginatedDocsResponse<Job> = await getJobsPaginated(
        12,
        startAfterDoc,
        selectedCategory,
        debouncedSearchTerm,
        selectedSubCategory,
        selectedProvince
      );
      setJobs(prev => isInitialLoad ? result.items : [...prev, ...result.items]);
      setLastVisible(result.lastVisibleDoc);
      setHasMore(result.items.length === 12 && result.lastVisibleDoc !== null);
    } catch (error) {
      console.error("Failed to load jobs:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, selectedCategory, selectedSubCategory, selectedProvince, lastVisible, isLoading]);

  // --- EFFECTS ---
  // Debounce search input
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

  // Trigger initial load or filter change
  useEffect(() => {
    loadJobs(true);
  }, [debouncedSearchTerm, selectedCategory, selectedSubCategory, selectedProvince]);

  // Update available subcategories when category changes
  useEffect(() => {
    if (selectedCategory !== 'all' && JOB_SUBCATEGORIES_MAP[selectedCategory]) {
      setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[selectedCategory]);
    } else {
      setAvailableSubCategories([]);
    }
    setSelectedSubCategory('all');
  }, [selectedCategory]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadJobs();
        }
      },
      { threshold: 1.0 }
    );
    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);
    return () => { if (currentLoader) observer.unobserve(currentLoader); };
  }, [hasMore, isLoading, loadJobs]);
  
  const handleRecentSearchSelect = (term: string) => {
    setSearchTerm(term);
  };


  return (
    <div className="container mx-auto p-4 sm:p-6">
      <h2 className="text-3xl font-sans font-semibold text-neutral-dark mb-6 text-center">📢 ประกาศงานทั้งหมด</h2>

      {/* --- Filter Bar --- */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-primary-light mb-8 space-y-4">
        <SearchInputWithRecent
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            placeholder="ค้นหาชื่องาน, สถานที่, หรือรายละเอียด..."
            recentSearches={recentSearches}
            onRecentSearchSelect={handleRecentSearchSelect}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
             <label htmlFor="province-filter" className="block text-sm font-sans font-medium text-primary-dark mb-1">
                จังหวัด:
            </label>
            <select
              id="province-filter"
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value as Province | 'all')}
            >
              <option value="all">ทุกจังหวัด</option>
              {Object.values(Province).map(prov => <option key={prov} value={prov}>{prov}</option>)}
            </select>
          </div>
          <div className="md:col-span-1">
            <label htmlFor="category-filter" className="block text-sm font-sans font-medium text-primary-dark mb-1">
                หมวดหมู่:
            </label>
            <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as FilterableCategory)}
            >
                <option value="all">ทุกหมวดหมู่</option>
                {Object.values(JobCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="md:col-span-1">
            <label htmlFor="subcategory-filter" className="block text-sm font-sans font-medium text-primary-dark mb-1">
                หมวดหมู่ย่อย:
            </label>
            <select
              id="subcategory-filter"
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value as JobSubCategory | 'all')}
              disabled={availableSubCategories.length === 0}
            >
              <option value="all">ทุกหมวดหมู่ย่อย</option>
              {availableSubCategories.map(subCat => <option key={subCat} value={subCat}>{subCat}</option>)}
            </select>
          </div>
        </div>
      </div>
      
      {isLoading && jobs.length === 0 ? (
        <div className="text-center py-10 text-primary-dark font-sans">กำลังโหลด...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <p className="text-xl text-neutral-dark">ไม่พบประกาศงานที่ตรงกับเงื่อนไข</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {jobs.map(job => (
            <motion.div key={job.id} variants={itemVariants}>
              <JobCard
                job={job}
                navigateTo={navigateTo}
                currentUser={currentUser}
                requestLoginForAction={requestLoginForAction}
                onEditJobFromFindView={onEditJobFromFindView}
                getAuthorDisplayName={getAuthorDisplayName}
                onToggleInterest={userActions.toggleInterest}
                isInterested={userInterests.some(i => i.targetId === job.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <div ref={loaderRef} className="h-10 flex justify-center items-center">
        {isLoading && jobs.length > 0 && <p className="text-sm text-neutral-medium">กำลังโหลดเพิ่มเติม...</p>}
        {!hasMore && jobs.length > 0 && <p className="text-sm text-neutral-medium">คุณดูครบทุกรายการแล้ว</p>}
      </div>
    </div>
  );
};