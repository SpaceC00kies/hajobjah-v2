
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { UniversalSearchBar } from './UniversalSearchBar.tsx';
import type { View, Job, HelperProfile, User, SearchResultItem, JobCategory, EnrichedWebboardPost, EnrichedBlogPost } from '../types/types.ts';
import { UserRole } from '../types/types.ts';
import type { NavigateFunction } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useJobs } from '../hooks/useJobs.ts';
import { useHelpers } from '../hooks/useHelpers.ts';
import { useUsers } from '../hooks/useUsers.ts';
import { useWebboard } from '../hooks/useWebboard.ts';
import { useBlog } from '../hooks/useBlog.ts';
import { JobCard } from './JobCard.tsx';
import { HelperCard } from './HelperCard.tsx';
import { WebboardPostCard } from './WebboardPostCard.tsx';
import { BlogCard } from './BlogCard.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { useUser } from '../hooks/useUser.ts';
import { FastLottie } from './FastLottie.tsx';
import '../utils/lottiePreloader.ts';

// Feature flags for early launch - set to true when ready to show these sections
const SHOW_COMMUNITY_SECTION = false;
const SHOW_FEATURED_SECTION = false;

interface HomePageProps {
  onSearch: (searchParams: { query: string; province: string; }) => void;
  isSearching: boolean;
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
  onOpenLocationModal: () => void;
  navigate: NavigateFunction;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const
    }
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const
    }
  },
};

interface ScrollableFeaturedGridProps {
  items: any[];
  renderCard: (item: any) => React.ReactNode;
  gridKey: string;
}

const ScrollableFeaturedGrid: React.FC<ScrollableFeaturedGridProps> = ({ items, renderCard, gridKey }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidthPlusGap = 320 + 24; // 320px card width + 1.5rem (24px) gap

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollLeft = scrollContainer.scrollLeft;
      const newIndex = Math.round(scrollLeft / cardWidthPlusGap);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [activeIndex, cardWidthPlusGap]);

  if (items.length === 0) return null;

  return (
    <>
      <motion.div ref={scrollRef} className="featured-grid" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
        {items.map(item => (
          <motion.div key={item.id} variants={itemVariants}>
            {renderCard(item)}
          </motion.div>
        ))}
      </motion.div>
      <div className="scroll-dots">
        {items.map((_, index) => (
          <div key={`${gridKey}-dot-${index}`} className={`scroll-dot ${index === activeIndex ? 'active' : ''}`} />
        ))}
      </div>
    </>
  );
};


export const HomePage: React.FC<HomePageProps> = ({
  onSearch,
  isSearching,
  selectedProvince,
  onProvinceChange,
  onOpenLocationModal,
  navigate,
}) => {
  const { currentUser } = useAuth();
  const { allJobsForAdmin } = useJobs();
  const { allHelperProfilesForAdmin } = useHelpers();
  const { allWebboardPostsForAdmin, webboardComments } = useWebboard();
  const { allBlogPosts } = useBlog();
  const { users } = useUsers();
  const { userInterests, userSavedPosts } = useData();
  const userActions = useUser();
  const webboardActions = useWebboard();



  const getAuthorDisplayName = (userId: string, fallbackName?: string): string => {
    const author = users.find(u => u && u.id === userId);
    return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ";
  };

  const totalJobs = allJobsForAdmin?.length || 0;
  const totalHelpers = allHelperProfilesForAdmin?.length || 0;
  const totalUsers = users?.length || 0;

  const popularCategories = useMemo(() => {
    if (!allJobsForAdmin) return [];
    const categoryCounts: Record<string, number> = {};
    allJobsForAdmin.forEach(job => {
      if (job.category) {
        categoryCounts[job.category] = (categoryCounts[job.category] || 0) + 1;
      }
    });
    return Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name as JobCategory);
  }, [allJobsForAdmin]);

  const featuredJobs = useMemo(() => allJobsForAdmin ? allJobsForAdmin.filter(j => j.isPinned).slice(0, 4) : [], [allJobsForAdmin]);
  const featuredHelpers = useMemo(() => allHelperProfilesForAdmin ? allHelperProfilesForAdmin.filter(p => p.isPinned).slice(0, 4) : [], [allHelperProfilesForAdmin]);
  const popularPosts: EnrichedWebboardPost[] = useMemo(() => {
    if (!allWebboardPostsForAdmin) return [];
    return [...allWebboardPostsForAdmin]
      .map(post => {
        const author = users.find(u => u.id === post.userId);
        return {
          ...post,
          commentCount: webboardComments.filter(c => c.postId === post.id).length,
          authorPhoto: author?.photo || post.authorPhoto,
          isAuthorAdmin: !!author && author.role === UserRole.Admin,
        };
      })
      .sort((a, b) => (b.likes.length + b.commentCount) - (a.likes.length + a.commentCount))
      .slice(0, 3);
  }, [allWebboardPostsForAdmin, webboardComments, users]);
  const latestArticles = useMemo(() => allBlogPosts ? [...allBlogPosts].filter(p => p.status === 'published').sort((a, b) => new Date(b.publishedAt as string).getTime() - new Date(a.publishedAt as string).getTime()).slice(0, 3) : [], [allBlogPosts]);


  return (
    <div className="w-full h-full flex flex-col overflow-x-hidden">
      <div className="relative w-full">
        <div className="container mx-auto flex justify-center px-4 sm:px-6 py-12 sm:py-20">
          <div className="flex flex-col items-center text-center max-w-2xl w-full">
            <motion.div
              className="mb-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto">
                <FastLottie
                  src="https://lottie.host/dea64b7c-31e7-4c7a-8b2d-c34914e1ed05/dozIYy35G2.lottie"
                  className="w-full h-full"
                  title="Animated blue cat - your job search companion"
                  priority="high"
                  fallbackEmoji="🐱"
                  style={{
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </motion.div>

            <UniversalSearchBar
              onSearch={onSearch}
              isLoading={isSearching}
              selectedProvince={selectedProvince}
              onProvinceChange={onProvinceChange}
              onOpenLocationModal={onOpenLocationModal}
            />

            <motion.div
              className="hidden sm:flex items-center justify-center space-x-4 mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <motion.button
                onClick={() => navigate('/find-jobs')}
                className="secondary-browse-link"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ประกาศรับสมัครทั้งหมด
              </motion.button>
              <span className="text-neutral-gray">|</span>
              <motion.button
                onClick={() => navigate('/find-helpers')}
                className="secondary-browse-link"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                โปรไฟล์ทั้งหมด
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>

      {SHOW_COMMUNITY_SECTION && (
        <section className="community-section">
          <div className="container mx-auto">
            <div>
              <div className="text-center">
                <h2 className="section-title">
                  ชุมชนของเรา
                </h2>
              </div>

              {/* Stats in a clean row */}
              <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-10">
                <div className="text-center">
                  <p className="community-stat-number">{totalJobs.toLocaleString()}</p>
                  <p className="community-stat-label">ประกาศรับสมัคร</p>
                </div>
                <div className="text-center">
                  <p className="community-stat-number">{totalHelpers.toLocaleString()}</p>
                  <p className="community-stat-label">โปรไฟล์</p>
                </div>
                <div className="text-center">
                  <p className="community-stat-number">{totalUsers.toLocaleString()}</p>
                  <p className="community-stat-label">ผู้ใช้งาน</p>
                </div>
              </div>

              {/* Popular categories with smaller heading */}
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-gray mb-3">หมวดหมู่ยอดนิยม</p>
                {/* Mobile view: Simple flex wrap */}
                <div className="flex md:hidden flex-wrap gap-2 justify-center">
                  {popularCategories.map(cat => (
                    <span key={cat} className="community-category-pill">{cat}</span>
                  ))}
                </div>
                {/* Desktop view: 3 on top, 2 on bottom, centered */}
                <div className="hidden md:flex flex-col items-center gap-2">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {popularCategories.slice(0, 3).map(cat => (
                      <span key={cat} className="community-category-pill">{cat}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {popularCategories.slice(3, 5).map(cat => (
                      <span key={cat} className="community-category-pill">{cat}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {SHOW_FEATURED_SECTION && (
        <section className="featured-listings-section">
          <div className="container mx-auto">
            <div className="text-center mb-8">
              <h2 className="section-title">
                รายการแนะนำ
              </h2>
            </div>

            {featuredJobs.length > 0 && (
              <>
                <h3 className="featured-subheader">📢 ประกาศรับสมัคร</h3>
                <ScrollableFeaturedGrid
                  items={featuredJobs}
                  gridKey="jobs"
                  renderCard={(item: Job) => (
                    <JobCard job={item} currentUser={currentUser} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={() => userActions.toggleInterest(item.id, 'job', item.userId)} isInterested={userInterests.some(i => i.targetId === item.id)} authorPhotoUrl={users.find(u => u.id === item.userId)?.photo} isAuthorVerified={users.find(u => u.id === item.userId)?.adminVerified} />
                  )}
                />
              </>
            )}

            {featuredHelpers.length > 0 && (
              <>
                <h3 className="featured-subheader">👥 โปรไฟล์/บริการ</h3>
                <ScrollableFeaturedGrid
                  items={featuredHelpers}
                  gridKey="helpers"
                  renderCard={(item: HelperProfile) => (
                    <HelperCard profile={item as any} currentUser={currentUser} getAuthorDisplayName={getAuthorDisplayName} onToggleInterest={() => userActions.toggleInterest(item.id, 'helperProfile', item.userId)} isInterested={userInterests.some(i => i.targetId === item.id)} isAuthorVerified={users.find(u => u.id === item.userId)?.adminVerified} />
                  )}
                />
              </>
            )}

            {false && popularPosts.length > 0 && (
              <>
                <h3 className="featured-subheader">💬 กระทู้ยอดนิยม</h3>
                <motion.div className="vertical-grid-mobile" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
                  {popularPosts.map(item => <motion.div key={item.id} variants={itemVariants}><WebboardPostCard post={item} currentUser={currentUser} onViewPost={(id) => navigate(`/webboard/post/${id}`)} onToggleLike={() => webboardActions.toggleWebboardPostLike(item.id)} onToggleSave={() => userActions.saveWebboardPost(item.id)} isSaved={userSavedPosts.includes(item.id)} requestLoginForAction={() => navigate('/login')} getAuthorDisplayName={getAuthorDisplayName} onSharePost={() => { }} /></motion.div>)}
                </motion.div>
              </>
            )}

            {latestArticles.length > 0 && (
              <>
                <h3 className="featured-subheader">📖 บทความล่าสุด</h3>
                <motion.div className="vertical-grid-mobile" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
                  {latestArticles.map(item => <motion.div key={item.id} variants={itemVariants} className="h-72"><BlogCard post={item as EnrichedBlogPost} onSelectPost={(slug) => navigate(`/blog/${slug}`)} /></motion.div>)}
                </motion.div>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
