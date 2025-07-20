"use client";
import React, { useState, useMemo } from 'react';
import type { EnrichedBlogPost, FilterableBlogCategory } from '../types/types';
import { BlogCategory } from '../types/types';
import { BlogCard } from './BlogCard';
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

export const BlogPage: React.FC<BlogPageProps> = ({ posts, onSelectPost }) => {
  const [categoryFilter, setCategoryFilter] = useState<FilterableBlogCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const categoryMatch = categoryFilter === 'all' || post.category === categoryFilter;
      const searchTermLower = searchTerm.toLowerCase();
      const searchMatch = searchTerm.trim() === '' ||
        post.title.toLowerCase().includes(searchTermLower) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(searchTermLower)) ||
        (post.author?.publicDisplayName || post.authorDisplayName || '').toLowerCase().includes(searchTermLower);
      
      return categoryMatch && searchMatch;
    });
  }, [posts, categoryFilter, searchTerm]);

  const filterInputBaseStyle = "w-full p-3 bg-white border border-neutral-DEFAULT rounded-md text-neutral-dark font-sans focus:outline-none focus:ring-1 focus:ring-neutral-DEFAULT text-sm sm:text-base";
  const filterSelectBaseStyle = `${filterInputBaseStyle} appearance-none`;
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold font-sans text-primary-dark tracking-tight">
          📖 บทความ
        </h1>
        <p className="mt-4 text-lg text-neutral-medium font-serif">
          เรื่องราว, เคล็ดลับ, และแรงบันดาลใจสำหรับคนทำงาน
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mb-8 p-3 sm:p-4 bg-white rounded-lg shadow-sm border border-neutral-DEFAULT/30 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
        <div className="w-full sm:w-auto sm:flex-1">
          <label htmlFor="blogCategoryFilter" className="sr-only">กรองตามหมวดหมู่</label>
          <select
            id="blogCategoryFilter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as FilterableBlogCategory)}
            className={`${filterSelectBaseStyle} w-full`}
          >
            <option value="all">ทุกหมวดหมู่</option>
            {Object.values(BlogCategory).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto sm:flex-1">
          <label htmlFor="blogSearch" className="sr-only">ค้นหาบทความ</label>
          <input
            type="search"
            id="blogSearch"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อเรื่อง, เนื้อหา..."
            className={`${filterInputBaseStyle} w-full`}
          />
        </div>
      </div>


      {filteredPosts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-neutral-medium font-serif">ไม่พบบทความที่ตรงกับเงื่อนไขของคุณ...</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredPosts.map(post => (
            <BlogCard key={post.id} post={post} onSelectPost={onSelectPost} />
          ))}
        </motion.div>
      )}
    </div>
  );
};