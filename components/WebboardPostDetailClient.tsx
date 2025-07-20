"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { EnrichedWebboardPost, EnrichedWebboardComment, User } from '../types/types';
import { UserRole, View, WebboardCategory, WEBBOARD_CATEGORY_STYLES } from '../types/types';
import { Button } from './Button.tsx';
import { WebboardCommentItem } from './WebboardCommentItem.tsx';
import { WebboardCommentForm } from './WebboardCommentForm.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useWebboard } from '@/hooks/useWebboard';
import { useUser } from '@/hooks/useUser';
import { useAdmin } from '@/hooks/useAdmin';


interface WebboardPostDetailClientProps {
  post: EnrichedWebboardPost;
  comments: EnrichedWebboardComment[];
  users: User[];
}

const FallbackAvatarLarge: React.FC<{ name?: string, photo?: string, size?: string, className?: string }> = ({ name, photo, size = "w-12 h-12", className = "" }) => {
  if (photo) {
    return <img src={photo} alt={name || 'avatar'} className={`${size} rounded-full object-cover ${className}`} />;
  }
  const initial = name ? name.charAt(0).toUpperCase() : '👤';
  return (
    <div className={`${size} rounded-full bg-neutral/60 flex items-center justify-center text-xl text-white ${className}`}>
      {initial}
    </div>
  );
};

// Helper function to define SVG icons
const Icon = ({ path, className = "w-4 h-4" }: { path: string; className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d={path} clipRule="evenodd" />
  </svg>
);
const LikeIcon = () => <Icon path="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" className="w-4 h-4 text-neutral-500" />;
const LikedIcon = () => <Icon path="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" className="w-4 h-4 text-red-500" />;
const SaveIcon = () => <Icon path="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" className="w-4 h-4 text-neutral-500" />;
const SavedIcon = () => <Icon path="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" className="w-4 h-4 text-primary"/>;
const ShareIcon = () => <Icon path="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" className="w-4 h-4 text-neutral-500" />;

const commentListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};


export const WebboardPostDetailClient: React.FC<WebboardPostDetailClientProps> = ({
  post,
  comments,
  users,
}) => {
    const router = useRouter();
    const { currentUser } = useAuth();
    const { openConfirmModal } = useData();
    const webboardActions = useWebboard();
    const userActions = useUser();
    const adminActions = useAdmin();

    const hasLiked = currentUser && post.likes.includes(currentUser.id);
    const isSaved = currentUser?.savedWebboardPosts?.includes(post.id) || false;
    const authorActualDisplayName = users.find(u => u.id === post.userId)?.publicDisplayName || post.authorDisplayName;

    const canEdit = webboardActions.canEditOrDelete(post.userId);
    const canPin = currentUser?.role === UserRole.Admin;

    const timeSince = (dateInput: string | Date | null | undefined): string => {
        if (dateInput === null || dateInput === undefined) return "just now";
        let dateObject: Date = new Date(dateInput as string);
        if (isNaN(dateObject.getTime())) return "Processing...";
        const seconds = Math.floor((new Date().getTime() - dateObject.getTime()) / 1000);
        if (seconds < 0) return "just now";
        if (seconds < 5) return "just now";
        let interval = seconds / 31536000; if (interval > 1) return Math.floor(interval) + "y";
        interval = seconds / 2592000; if (interval > 1) return Math.floor(interval) + "mo";
        interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + "d";
        interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 60; if (interval > 1) return Math.floor(interval) + "m";
        return Math.floor(seconds) + "s";
    };
  
  const wasEdited = post.updatedAt && post.createdAt && new Date(post.updatedAt as string).getTime() !== new Date(post.createdAt as string).getTime();
  const categoryStyle = WEBBOARD_CATEGORY_STYLES[post.category] || WEBBOARD_CATEGORY_STYLES[WebboardCategory.General];

  const handleLikeClick = () => {
    if (!currentUser) router.push('/login');
    else webboardActions.toggleWebboardPostLike(post.id);
  };
  
  const handleSaveClick = () => {
    if (!currentUser) router.push('/login');
    else userActions.saveWebboardPost(post.id);
  };

  const handleShareClick = () => {
      // Implement share logic
  }

  const handleEdit = () => {
    router.push(`/webboard?edit=${post.id}`);
  };

  const handleDelete = () => {
    openConfirmModal("ยืนยันการลบ", "คุณแน่ใจหรือไม่ว่าต้องการลบกระทู้นี้?", () => {
        webboardActions.deleteWebboardPost(post.id).then(() => router.push('/webboard'));
    });
  };
  
  const handlePin = () => {
      adminActions.pinWebboardPost(post.id);
  }
  
  const onNavigateToPublicProfile = (userId: string) => {
      router.push(`/profile/${userId}`);
  }

  const actionButtonBaseClass = "flex items-center gap-1.5 p-2 rounded-md hover:bg-neutral-light focus:outline-none focus:ring-1 focus:ring-neutral-DEFAULT transition-colors duration-150 text-sm sm:text-base";

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-lg border border-neutral-DEFAULT/30">
      <article>
        <header className="mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border ? `border ${categoryStyle.border}`: ''}`}>{post.category}</span>
            {post.isPinned && <span className="text-xs font-semibold text-yellow-600">📌 Pinned by Admin</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-sans text-neutral-800 mb-3">{post.title}</h1>
          <div className="flex items-center space-x-3 text-sm text-neutral-500">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onNavigateToPublicProfile(post.userId)}>
              <FallbackAvatarLarge name={authorActualDisplayName} photo={post.authorPhoto} size="w-10 h-10" />
              <div className="flex flex-col">
                  <span className="font-semibold text-neutral-dark hover:underline">@{authorActualDisplayName}</span>
                  <span className="text-xs">{timeSince(post.createdAt)}{wasEdited && <span className="italic"> (แก้ไข {timeSince(post.updatedAt as Date)})</span>}</span>
              </div>
            </div>
          </div>
        </header>

        {post.image && <img src={post.image} alt={post.title} className="w-full max-h-[500px] object-contain rounded-lg my-4 bg-neutral-light" />}
        <div className="prose prose-sm sm:prose-base max-w-none font-serif text-neutral-dark whitespace-pre-wrap leading-relaxed">{post.body}</div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-DEFAULT/50">
           <div className="flex items-center space-x-2 sm:space-x-4">
                <motion.button onClick={handleLikeClick} className={`${actionButtonBaseClass} ${hasLiked ? 'text-red-500' : 'text-neutral-500'}`} whileTap={{ scale: 0.9 }}>
                    {hasLiked ? <LikedIcon /> : <LikeIcon />}
                    <span className="font-semibold">{post.likes.length}</span>
                </motion.button>
                {currentUser && <button onClick={handleSaveClick} className={`${actionButtonBaseClass} ${isSaved ? 'text-primary' : 'text-neutral-500'}`}>{isSaved ? <SavedIcon /> : <SaveIcon />}</button>}
                 <button onClick={handleShareClick} className={`${actionButtonBaseClass} text-neutral-500`}><ShareIcon /></button>
            </div>
            <div className="flex items-center space-x-2">
                {canEdit && <Button onClick={handleEdit} variant="outline" size="sm" colorScheme="neutral">แก้ไข</Button>}
                {canPin && <Button onClick={handlePin} variant="outline" size="sm" colorScheme="neutral">{post.isPinned ? 'ยกเลิกปักหมุด' : 'ปักหมุด'}</Button>}
                {canEdit && <Button onClick={handleDelete} variant="outline" colorScheme="accent" size="sm">ลบ</Button>}
            </div>
        </div>
      </article>

      <section className="mt-8 pt-6 border-t border-neutral-DEFAULT/50">
        <h2 className="text-xl font-semibold font-sans text-neutral-700 mb-4">{comments.length} ความคิดเห็น</h2>
        <WebboardCommentForm postId={post.id} currentUser={currentUser} onAddComment={webboardActions.addWebboardComment} requestLoginForAction={() => router.push('/login')} checkWebboardCommentLimits={webboardActions.checkWebboardCommentLimits} />
         {comments.length > 0 && (
          <motion.div className="mt-4 space-y-2" variants={commentListVariants} initial="hidden" animate="visible">
            <AnimatePresence initial={false}>
              {comments.map(comment => <WebboardCommentItem key={comment.id} comment={comment} currentUser={currentUser} onDeleteComment={webboardActions.deleteWebboardComment} onUpdateComment={webboardActions.updateWebboardComment} onNavigateToPublicProfile={onNavigateToPublicProfile} />)}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </div>
  );
};
