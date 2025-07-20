// components/BlogCard.tsx
"use client";
import React from 'react';
import Link from 'next/link';
import type { EnrichedBlogPost } from '../types/types.ts';
import { motion } from 'framer-motion';

interface BlogCardProps {
  post: EnrichedBlogPost;
  onSelectPost: (slug: string) => void;
}

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 100, damping: 12 } },
};

const formatDate = (dateInput?: string | Date): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
  return (
    <Link href={`/blog/${post.slug}`} passHref>
        <motion.div
        className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col cursor-pointer group h-full"
        variants={cardVariants}
        whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"}}
        >
        <div className="relative overflow-hidden">
            <img
            src={post.coverImageURL}
            alt={post.title}
            className="w-full h-56 object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
            />
        </div>
        <div className="p-6 flex flex-col flex-grow">
            <p className="text-sm font-semibold text-rose-700 mb-2">{post.category}</p>
            <h3 className="text-xl font-bold font-sans text-neutral-dark group-hover:text-primary transition-colors duration-200 flex-grow">
            {post.title}
            </h3>
            <div className="mt-6 pt-4 border-t border-neutral-DEFAULT/50 flex items-center">
                {post.authorPhotoURL ? (
                    <img src={post.authorPhotoURL} alt={post.authorDisplayName} className="w-10 h-10 rounded-full object-cover mr-3"/>
                ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-light flex items-center justify-center mr-3 text-lg font-bold text-neutral-dark">
                        {post.authorDisplayName.charAt(0)}
                    </div>
                )}
                <div>
                    <p className="text-sm font-semibold font-sans text-neutral-dark">{post.authorDisplayName}</p>
                    <p className="text-xs text-neutral-medium">{formatDate(post.publishedAt)}</p>
                </div>
            </div>
        </div>
        </motion.div>
    </Link>
  );
};
