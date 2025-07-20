// components/WebboardPostCard.tsx
import React from 'react';
import Link from 'next/link';
import type { EnrichedWebboardPost, User } from '../types/types';
import { View, WebboardCategory, WEBBOARD_CATEGORY_STYLES } from '../types/types';
import { motion } from 'framer-motion';

interface WebboardPostCardProps {
  post: EnrichedWebboardPost;
  currentUser: User | null;
  onViewPost: (postId: string) => void;
  onToggleLike: (postId: string) => void;
  onSavePost: (postId: string) => void;
  onSharePost: (postId: string, postTitle: string) => void;
  requestLoginForAction: (view: View, payload?: any) => void;
  onNavigateToPublicProfile: (profileInfo: { userId: string }) => void;
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
}

const Icon = ({ path, className = "w-4 h-4" }: { path: string; className?: string }) => <svg className={className} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d={path} clipRule="evenodd" /></svg>;
const LikeIcon = () => <Icon path="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" className="w-4 h-4 text-neutral-500" />;
const LikedIcon = () => <Icon path="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" className="w-4 h-4 text-red-500" />;
const CommentIcon = () => <Icon path="M18 10c0 3.866-3.582 7-8 7a8.839 8.839 0 01-4.083-.98L2 17l1.338-3.121A8.005 8.005 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" className="w-4 h-4 text-neutral-500" />;
const SaveIcon = () => <Icon path="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" className="w-4 h-4 text-neutral-500" />;
const SavedIcon = () => <Icon path="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" className="w-4 h-4 text-primary"/>;
const ShareIcon = () => <Icon path="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" className="w-4 h-4 text-neutral-500" />;

export const WebboardPostCard: React.FC<WebboardPostCardProps> = ({ post, currentUser, onViewPost, onToggleLike, onSavePost, onSharePost, requestLoginForAction, onNavigateToPublicProfile, getAuthorDisplayName }) => {
  const hasLiked = currentUser && post.likes.includes(currentUser.id);
  const isSaved = currentUser?.savedWebboardPosts?.includes(post.id) || false;
  const authorActualDisplayName = getAuthorDisplayName(post.userId, post.authorDisplayName);

  const timeSince = (dateInput?: string | Date): string => {
    if (!dateInput) return "just now";
    const seconds = Math.floor((new Date().getTime() - new Date(dateInput).getTime()) / 1000);
    if (seconds < 5) return "just now";
    let interval = seconds / 31536000; if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000; if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60; if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    action();
  };

  const categoryStyle = WEBBOARD_CATEGORY_STYLES[post.category] || WEBBOARD_CATEGORY_STYLES[WebboardCategory.General];
  const actionButtonBaseClass = "flex items-center gap-1 p-1.5 rounded-md hover:bg-neutral-light focus:outline-none focus:ring-1 focus:ring-neutral-DEFAULT transition-colors duration-150";

  return (
    <Link href={`/webboard/${post.id}`} passHref>
      <motion.div
        className="font-sans bg-white shadow rounded-lg border border-neutral-DEFAULT/50 hover:border-neutral-DEFAULT transition-all duration-200 flex cursor-pointer"
        role="article"
        aria-labelledby={`post-title-${post.id}`}
        whileHover={{ y: -2, transition: { duration: 0.15 } }}
      >
        <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-neutral-light rounded-l-lg overflow-hidden m-3">
          {post.image ? <img src={post.image} alt="Post thumbnail" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-neutral-DEFAULT"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>}
        </div>
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            {post.isPinned && <span className="text-xs font-semibold text-yellow-600 mb-1 inline-block">📌 Pinned</span>}
            <h3 id={`post-title-${post.id}`} className="text-base sm:text-lg font-semibold text-gray-800 hover:underline line-clamp-2 leading-tight" title={post.title}>{post.title}</h3>
            <span className={`text-xs font-medium mt-1 px-1.5 py-0.5 rounded-full inline-block ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border ? `border ${categoryStyle.border}`: ''}`}>{post.category}</span>
            <div className="text-xs text-neutral-500 mt-1.5">
              <span className="hover:underline" onClick={(e) => handleActionClick(e, () => onNavigateToPublicProfile({ userId: post.userId }))}>@{authorActualDisplayName}</span>
              <span className="mx-1">·</span><span>{timeSince(post.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center justify-start text-xs text-neutral-medium mt-2 space-x-2 sm:space-x-3 flex-wrap">
            <motion.button onClick={(e) => handleActionClick(e, () => onToggleLike(post.id))} className={actionButtonBaseClass} aria-pressed={hasLiked} whileTap={{ scale: 0.9 }}>
                {hasLiked ? <LikedIcon /> : <LikeIcon />} <span className={`${hasLiked ? 'text-red-500' : 'text-neutral-500'}`}>{post.likes.length}</span>
            </motion.button>
            <motion.div className={`${actionButtonBaseClass} text-neutral-500`} aria-label="View comments">
                <CommentIcon /> <span>{post.commentCount}</span>
            </motion.div>
            {currentUser && <>
                <motion.button onClick={(e) => handleActionClick(e, () => onSavePost(post.id))} className={actionButtonBaseClass} aria-pressed={isSaved} whileTap={{ scale: 0.9 }}>
                    {isSaved ? <SavedIcon/> : <SaveIcon />} <span className={`hidden sm:inline ${isSaved ? 'text-primary' : 'text-neutral-500'}`}>{isSaved ? 'Saved' : 'Save'}</span>
                </motion.button>
                <motion.button onClick={(e) => handleActionClick(e, () => onSharePost(post.id, post.title))} className={`${actionButtonBaseClass} text-neutral-500`} whileTap={{ scale: 0.9 }}>
                    <ShareIcon /> <span className="hidden sm:inline">Share</span>
                </motion.button>
            </>}
          </div>
        </div>
      </motion.div>
    </Link>
  );
};