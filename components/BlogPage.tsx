import React from 'react';
import type { EnrichedBlogPost } from '../types.ts';
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

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-neutral-medium font-serif">ยังไม่มีบทความในขณะนี้...</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {posts.map(post => (
            <BlogCard key={post.id} post={post} onSelectPost={onSelectPost} />
          ))}
        </motion.div>
      )}
    </div>
  );
};
