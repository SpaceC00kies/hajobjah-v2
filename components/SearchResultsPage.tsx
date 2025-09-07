import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { SearchResultItem, FilterableCategory, JobSubCategory, Province, User, Interest, Job, HelperProfile, EnrichedHelperProfile } from '../types/types.ts';
import { JobCategory, JOB_SUBCATEGORIES_MAP } from '../types/types.ts';
import { FilterSidebar } from './FilterSidebar.tsx';
import { JobCard } from './JobCard.tsx';
import { HelperCard } from './HelperCard.tsx';
import { CardSkeleton } from './CardSkeleton.tsx';
import { Button } from './Button.tsx';
import { motion } from 'framer-motion';
import { useInterests } from '../hooks/useInterests.ts';
import { useNavigate } from 'react-router-dom';

interface SearchResultsPageProps {
  searchQuery: string;
  searchResults: SearchResultItem[];
  isLoading: boolean;
  searchError: string | null;
  currentUser: User | null;
  users: User[];
  userInterests: Interest[];
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
  onGoBack: () => void;
  initialProvince?: string;
}

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

type EnrichedSearchResultItem = ((Job & { resultType: 'job' }) | (EnrichedHelperProfile & { resultType: 'helper' })) & { isInterested: boolean };

export const SearchResultsPage: React.FC<SearchResultsPageProps> = (props) => {
  const {
    searchQuery, searchResults: searchResultsProp, isLoading, searchError, currentUser, users, userInterests,
    getAuthorDisplayName, onGoBack, initialProvince
  } = props;
  
  const navigate = useNavigate();

  const [results, setResults] = useState<EnrichedSearchResultItem[]>([]);
  const { toggleInterest } = useInterests(results, setResults);
  const dataHydrated = useRef(false);

  useEffect(() => {
    if (!dataHydrated.current && searchResultsProp.length > 0) {
        const enriched = searchResultsProp.map((item): EnrichedSearchResultItem => {
          const isInterested = userInterests.some(i => i.targetId === item.id);
          if (item.resultType === 'helper') {
            const profile = item as HelperProfile;
            const user = users.find(u => u.id === profile.userId);
            return {
              ...profile,
              resultType: 'helper',
              userPhoto: user?.photo,
              userAddress: user?.address,
              profileCompleteBadge: !!user?.profileComplete,
              warningBadge: !!profile.isSuspicious,
              verifiedExperienceBadge: !!profile.adminVerifiedExperience,
              interestedCount: profile.interestedCount || 0,
              isInterested
            };
          }
          return { ...item, isInterested } as Job & { resultType: 'job', isInterested: boolean };
        });
        setResults(enriched);
        dataHydrated.current = true;
    }
  }, [searchResultsProp, userInterests, users]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<FilterableCategory>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<JobSubCategory | 'all'>('all');
  const [selectedProvince, setSelectedProvince] = useState<Province | 'all'>(initialProvince as Province || 'all');
  const [availableSubCategories, setAvailableSubCategories] = useState<JobSubCategory[]>([]);

  useEffect(() => {
    if (selectedCategory !== 'all' && JOB_SUBCATEGORIES_MAP[selectedCategory]) {
      setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[selectedCategory]);
    } else {
      setAvailableSubCategories([]);
    }
    setSelectedSubCategory('all');
  }, [selectedCategory]);

  const displayedResults = useMemo(() => {
    return results.filter(item => {
      const tabMatch = activeTab === 'all' || (activeTab === 'jobs' && item.resultType === 'job') || (activeTab === 'helpers' && item.resultType === 'helper');
      const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
      const subCategoryMatch = selectedSubCategory === 'all' || item.subCategory === selectedSubCategory;
      const provinceMatch = selectedProvince === 'all' || item.province === selectedProvince;
      return tabMatch && categoryMatch && subCategoryMatch && provinceMatch;
    });
  }, [results, activeTab, selectedCategory, selectedSubCategory, selectedProvince]);
  
  const getTabClass = (tab: ActiveTab) => {
      return activeTab === tab 
        ? 'border-primary text-primary-dark font-semibold' 
        : 'border-transparent text-neutral-medium hover:text-primary-dark hover:border-neutral-dark/30';
  }

  const jobCount = useMemo(() => results.filter(r => r.resultType === 'job').length, [results]);
  const helperCount = useMemo(() => results.filter(r => r.resultType === 'helper').length, [results]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
      <div className="mb-4">
        <Button onClick={onGoBack} variant="outline" size="sm">&larr; กลับไปหน้าค้นหา</Button>
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
                <nav className="-mb-px flex space-x-6" role="tablist" aria-label="ประเภทผลการค้นหา">
                    <button 
                      onClick={() => setActiveTab('all')} 
                      className={`py-3 px-4 border-b-2 text-sm font-medium transition-colors min-h-[44px] flex items-center ${getTabClass('all')}`}
                      role="tab"
                      aria-selected={activeTab === 'all'}
                      aria-controls="search-results-panel"
                      id="tab-all"
                      tabIndex={activeTab === 'all' ? 0 : -1}
                    >
                        ทั้งหมด ({results.length})
                    </button>
                    <button 
                      onClick={() => setActiveTab('jobs')} 
                      className={`py-3 px-4 border-b-2 text-sm font-medium transition-colors min-h-[44px] flex items-center ${getTabClass('jobs')}`}
                      role="tab"
                      aria-selected={activeTab === 'jobs'}
                      aria-controls="search-results-panel"
                      id="tab-jobs"
                      tabIndex={activeTab === 'jobs' ? 0 : -1}
                    >
                        <span className="mr-1" aria-hidden="true">📢</span>
                        งาน ({jobCount})
                    </button>
                    <button 
                      onClick={() => setActiveTab('helpers')} 
                      className={`py-3 px-4 border-b-2 text-sm font-medium transition-colors min-h-[44px] flex items-center ${getTabClass('helpers')}`}
                      role="tab"
                      aria-selected={activeTab === 'helpers'}
                      aria-controls="search-results-panel"
                      id="tab-helpers"
                      tabIndex={activeTab === 'helpers' ? 0 : -1}
                    >
                        <span className="mr-1" aria-hidden="true">👥</span>
                        ผู้ช่วย ({helperCount})
                    </button>
                </nav>
            </div>
            <div 
              id="search-results-panel"
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              tabIndex={0}
            >
              {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" aria-label="กำลังโหลดผลการค้นหา">
                      {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
                  </div>
              ) : searchError ? (
                   <div className="text-center py-10 bg-red-50 rounded-lg shadow h-full flex flex-col items-center justify-center" role="alert">
                      <p className="text-xl text-red-700">พบข้อผิดพลาด</p>
                      <p className="text-sm text-red-600 mt-2">{searchError}</p>
                  </div>
              ) : displayedResults.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-lg shadow flex flex-col items-center justify-center min-h-[300px]" role="status">
                      <p className="text-xl text-neutral-dark mb-2">ไม่พบรายการที่ตรงกับการค้นหา</p>
                      <p className="text-sm text-neutral-medium">ลองเปลี่ยนคำหรือตัวกรอง หากเห็นตัวเลข แสดงว่ารายการคล้ายมีในพื้นที่อื่น</p>
                  </div>
              ) : (
                  <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  role="region"
                  aria-label={`ผลการค้นหา ${displayedResults.length} รายการ`}
                  >
                  {displayedResults.map(item => {
                      if (item.resultType === 'job') {
                          const author = users.find(u => u.id === item.userId);
                          return (
                              <motion.div key={item.id} variants={itemVariants}>
                                  <JobCard
                                      job={item as Job}
                                      currentUser={currentUser}
                                      getAuthorDisplayName={getAuthorDisplayName}
                                      onToggleInterest={() => toggleInterest(item, 'job')}
                                      isInterested={item.isInterested}
                                      authorPhotoUrl={author?.photo}
                                  />
                              </motion.div>
                          );
                      }
                      if (item.resultType === 'helper') {
                          return (
                               <motion.div key={item.id} variants={itemVariants}>
                                  <HelperCard
                                      profile={item as EnrichedHelperProfile}
                                      currentUser={currentUser}
                                      getAuthorDisplayName={getAuthorDisplayName}
                                      onToggleInterest={() => toggleInterest(item, 'helperProfile')}
                                      isInterested={item.isInterested}
                                  />
                               </motion.div>
                          );
                      }
                      return null;
                  })}
                  </motion.div>
              )}
            </div>
        </section>
      </div>
    </div>
  );
};