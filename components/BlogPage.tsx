import React, { useState, useMemo } from 'react';
import type { EnrichedBlogPost } from '../types.ts';
import { BlogCategory } from '../types.ts';
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

export const BlogPage: React.FC<BlogPageProps> = ({ posts, onSelectPost }) => {
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const categoryMatch = selectedCategory === 'all' || post.category === selectedCategory;
      const searchMatch = !searchTerm || post.title.toLowerCase().includes(searchTerm.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [posts, selectedCategory, searchTerm]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold font-sans text-neutral-dark tracking-tight">
          HAJOBJA Journal
        </h1>
        <p className="mt-4 text-lg text-neutral-medium font-serif">
          เรื่องราว, เคล็ดลับ, และแรงบันดาลใจสำหรับคนทำงาน
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-8 p-4 bg-white/70 backdrop-blur-sm sticky top-20 z-10 rounded-xl shadow-md border border-primary-light flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="blog-category-filter" className="sr-only">Filter by category</label>
          <select
            id="blog-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as BlogCategory | 'all')}
            className="w-full p-2 border border-neutral-DEFAULT rounded-md focus:ring-primary focus:border-primary font-sans"
          >
            <option value="all">ทุกหมวดหมู่</option>
            {Object.values(BlogCategory).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="blog-search" className="sr-only">Search articles</label>
          <input
            id="blog-search"
            type="search"
            placeholder="ค้นหาบทความ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-neutral-DEFAULT rounded-md focus:ring-primary focus:border-primary font-sans"
          />
        </div>
      </div>


      {filteredPosts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-neutral-medium font-serif">ไม่พบบทความที่ตรงกับเกณฑ์ของคุณ</p>
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