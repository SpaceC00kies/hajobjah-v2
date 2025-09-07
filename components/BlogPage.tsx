

import React, { useState, useMemo, useEffect } from 'react';
import type { EnrichedBlogPost, FilterableBlogCategory } from '../types/types.ts';
import { BlogCard } from './BlogCard.tsx';
import { motion } from 'framer-motion';

interface BlogPageProps {
  posts: EnrichedBlogPost[];
  onSelectPost: (slug: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 12,
    },
  },
};




export const BlogPage: React.FC<BlogPageProps> = ({ posts, onSelectPost }) => {
  const [categoryFilter, setCategoryFilter] = useState<FilterableBlogCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  


  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const categoryMatch = categoryFilter === 'all' || post.category === categoryFilter;
      const searchTermLower = searchTerm.toLowerCase();
      const searchMatch = searchTerm.trim() === '' ||
        post.title.toLowerCase().includes(searchTermLower) ||
        post.excerpt.toLowerCase().includes(searchTermLower) ||
        (post.author?.publicDisplayName || '').toLowerCase().includes(searchTermLower);

      return categoryMatch && searchMatch;
    });
  }, [posts, categoryFilter, searchTerm]);

  // Separate featured, sub-featured, and regular posts
  const featuredPosts = filteredPosts.filter(post => post.isFeatured);
  const subFeaturedPosts = filteredPosts.filter(post => post.isSubFeatured && !post.isFeatured);
  const regularPosts = filteredPosts.filter(post => !post.isFeatured && !post.isSubFeatured);

  // Update scroll indicator
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.querySelector('.blog-grid-sub-featured');
      const counter = document.getElementById('scroll-counter');

      if (scrollContainer && counter && subFeaturedPosts.length > 2) {
        const cardWidth = 280 + 16; // card width + gap
        const scrollLeft = scrollContainer.scrollLeft;
        const currentIndex = Math.round(scrollLeft / cardWidth) + 1;
        const maxIndex = Math.min(currentIndex, subFeaturedPosts.length);

        counter.textContent = `${maxIndex}/${subFeaturedPosts.length}`;
      }
    };

    const scrollContainer = document.querySelector('.blog-grid-sub-featured');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [subFeaturedPosts.length]);

  return (
    <div className="relative">
      {/* Simple Red Hero Section */}
      <div className="blog-hero-simple">
      </div>

      {filteredPosts.length === 0 ? (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid-empty-state">
            <div className="text-6xl mb-4">📖</div>
            <h3>ไม่พบบทความ</h3>
            <p>ไม่พบบทความที่ตรงกับเงื่อนไขการค้นหาของคุณ ลองเปลี่ยนคำค้นหาหรือหมวดหมู่ดูนะ</p>
          </div>
        </div>
      ) : (
        <>
          {/* Featured Articles Section - Full Width Yellow Background */}
          {featuredPosts.length > 0 && (
            <motion.div
              className="blog-grid-featured"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {featuredPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    variants={itemVariants}
                  >
                    <BlogCard
                      post={post}
                      onSelectPost={onSelectPost}
                      featured={true}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Sub-Featured Articles Grid - 3 Column Layout */}
          {subFeaturedPosts.length > 0 && (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <motion.div
                className="blog-grid-sub-featured"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {subFeaturedPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    className="blog-grid-item"
                    variants={itemVariants}
                  >
                    <BlogCard
                      post={post}
                      onSelectPost={onSelectPost}
                      featured={false}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* Mobile scroll indicator - centered below cards */}
              {subFeaturedPosts.length > 2 && (
                <div className="sub-featured-scroll-indicator">
                  <span className="scroll-indicator-text" id="scroll-counter">1/{subFeaturedPosts.length}</span>
                </div>
              )}
            </div>
          )}

          {/* Regular Articles Grid - 5 Column Layout */}
          {regularPosts.length > 0 && (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <motion.div
                className="blog-grid-container"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {regularPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    className="blog-grid-item"
                    variants={itemVariants}
                  >
                    <BlogCard
                      post={post}
                      onSelectPost={onSelectPost}
                      featured={false}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
