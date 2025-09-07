
import React, { useState } from 'react';
import type { EnrichedWebboardPost, User } from '../types/types.ts';
import { View, WEBBOARD_CATEGORY_STYLES, WebboardCategory } from '../types/types.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface WebboardPostCardProps {
  post: EnrichedWebboardPost & { isSaved?: boolean };
  currentUser: User | null;
  onViewPost: (postId: string) => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onSharePost: (postId: string, postTitle: string) => void;
  requestLoginForAction: (view: View, payload?: any) => void;
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
  isSaved?: boolean;
}

const Icon = ({ path, className = "w-4 h-4" }: { path: string; className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d={path} clipRule="evenodd" />
  </svg>
);

const LikeIcon = () => <Icon path="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" className="w-4 h-4 text-neutral-500" />;
const LikedIcon = () => <Icon path="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" className="w-4 h-4 text-red-500" />;
const CommentIcon = () => <Icon path="M18 10c0 3.866-3.582 7-8 7a8.839 8.839 0 01-4.083-.98L2 17l1.338-3.121A8.005 8.005 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" className="w-4 h-4 text-neutral-500" />;
const SaveIcon = () => <Icon path="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" className="w-4 h-4 text-neutral-500" />;
const SavedIcon = () => <Icon path="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" className="w-4 h-4 text-primary"/>;
const ShareIcon = () => <Icon path="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" className="w-4 h-4 text-neutral-500" />;


export const WebboardPostCard: React.FC<WebboardPostCardProps> = React.memo(({
  post,
  currentUser,
  onViewPost,
  onToggleLike,
  onToggleSave,
  onSharePost,
  requestLoginForAction,
  getAuthorDisplayName,
  isSaved,
}) => {
  const navigate = useNavigate();
  
  const [localLikeCount, setLocalLikeCount] = useState(post.likes.length);
  const [localIsLiked, setLocalIsLiked] = useState(currentUser ? post.likes.includes(currentUser.id) : false);
  const [localIsSaved, setLocalIsSaved] = useState(isSaved || false);

  const authorActualDisplayName = getAuthorDisplayName(post.userId, post.authorDisplayName);

  const timeSince = (dateInput: string | Date | null | undefined): string => {
    if (dateInput === null || dateInput === undefined) return "just now";
    let dateObject: Date;
    if (dateInput instanceof Date) dateObject = dateInput;
    else if (typeof dateInput === 'string') dateObject = new Date(dateInput);
    else if (typeof dateInput === 'object' && 'toDate' in dateInput && typeof (dateInput as any).toDate === 'function') dateObject = (dateInput as any).toDate();
    else { console.warn("timeSince unexpected:", dateInput); return "Invalid date"; }
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

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: 'like', postId: post.id });
      return;
    }
    setLocalIsLiked(!localIsLiked);
    setLocalLikeCount(prev => localIsLiked ? prev - 1 : prev + 1);
    onToggleLike();
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
        requestLoginForAction(View.Webboard, { action: 'save', postId: post.id });
        return;
    }
    setLocalIsSaved(!localIsSaved);
    onToggleSave();
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSharePost(post.id, post.title);
  };
  
  const handleNavigateToPublicProfile = (e: React.SyntheticEvent) => {
      e.stopPropagation();
      navigate(`/profile/${post.userId}`);
  }

  const categoryStyle = WEBBOARD_CATEGORY_STYLES[post.category] || WEBBOARD_CATEGORY_STYLES[WebboardCategory.General];
  const actionButtonBaseClass = "flex items-center gap-1 p-1.5 rounded-md hover:bg-neutral-light focus:outline-none transition-colors";
  const actionButtonStyle = { transitionDuration: 'var(--transition-fast)' };


  return (
    <motion.div
      className="app-card font-sans flex cursor-pointer"
      onClick={() => onViewPost(post.id)}
      role="article"
      aria-labelledby={`post-title-${post.id}`}
      style={{ 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexDirection: 'row'
      }}
    >
      <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-neutral-light rounded-l-lg overflow-hidden" style={{ margin: 'var(--space-3)' }}>
        {post.image ? (
          <img src={post.image} alt="Post thumbnail" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-DEFAULT">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between min-w-0" style={{ padding: 'var(--space-3)' }}>
        <div>
          {post.isPinned && (
            <span 
              className="font-semibold inline-block"
              style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--warning)', 
                marginBottom: 'var(--space-1)',
                fontWeight: 'var(--font-semibold)'
              }}
            >
              📌 Pinned
            </span>
          )}
          <h3
            id={`post-title-${post.id}`}
            className="hover:underline line-clamp-2"
            title={post.title}
            style={{ 
              fontSize: 'var(--font-size-base)', 
              fontWeight: 'var(--font-semibold)', 
              color: 'var(--text-primary)', 
              lineHeight: 'var(--leading-tight)',
              marginBottom: 'var(--space-1)'
            }}
          >
            {post.title}
          </h3>
          <span
            className={`font-medium rounded-full inline-block ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border ? `border ${categoryStyle.border}`: ''}`}
            style={{ 
              fontSize: 'var(--font-size-xs)', 
              marginTop: 'var(--space-1)', 
              padding: 'var(--space-1) var(--space-2)',
              fontWeight: 'var(--font-medium)'
            }}
          >
            {post.category}
          </span>

          <div className="text-neutral-500" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)', color: 'var(--text-tertiary)' }}>
            <span
              className="hover:underline cursor-pointer"
              onClick={handleNavigateToPublicProfile}
              role="link" tabIndex={0} onKeyPress={(e) => { if (e.key === 'Enter') { handleNavigateToPublicProfile(e); }}}
            >
              @{authorActualDisplayName}
            </span>
            <span className="mx-1">·</span>
            <span>{timeSince(post.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center justify-start text-neutral-medium flex-wrap" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-2)', gap: 'var(--space-2)', color: 'var(--text-secondary)' }}>
          <motion.button
            onClick={handleLikeClick}
            className={`${actionButtonBaseClass}`}
            style={actionButtonStyle}
            aria-pressed={localIsLiked}
            aria-label={localIsLiked ? "Unlike" : "Like"}
            whileTap={{ scale: 0.9 }}
          >
            <motion.span
              key={localIsLiked ? "liked" : "unliked"}
              initial={{ scale: 1 }}
              animate={localIsLiked ? { scale: [1, 1.3, 1], transition: { type: "spring" as const, stiffness: 400, damping: 10 } } : { scale: [1, 0.8, 1], transition: { type: "spring" as const, stiffness: 300, damping: 15 } }}
              className="inline-block"
            >
              {localIsLiked ? <LikedIcon /> : <LikeIcon />}
            </motion.span>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={localLikeCount}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, y: 3, transition: { duration: 0.15 } }}
                className={`${localIsLiked ? 'text-red-500' : 'text-neutral-500'}`}
              >
                {localLikeCount}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <motion.button
            onClick={() => onViewPost(post.id)}
            className={`${actionButtonBaseClass} text-neutral-500`}
            style={actionButtonStyle}
            aria-label="View comments"
            whileTap={{ scale: 0.9 }}
          >
            <CommentIcon /> <span>{post.commentCount}</span>
          </motion.button>

          {currentUser && (
            <>
              <motion.button
                onClick={handleSaveClick}
                className={`${actionButtonBaseClass}`}
                style={actionButtonStyle}
                aria-pressed={localIsSaved}
                aria-label={localIsSaved ? "Unsave" : "Save"}
                whileTap={{ scale: 0.9 }}
              >
                <motion.span
                  key={localIsSaved ? "saved" : "unsaved"}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 0.8, 1.1, 1], transition: { type: "spring" as const, stiffness: 350, damping: 12 } }}
                  className="inline-block"
                >
                  {localIsSaved ? <SavedIcon/> : <SaveIcon />}
                </motion.span>
                <span className={`hidden sm:inline ${localIsSaved ? 'text-primary' : 'text-neutral-500'}`}>{localIsSaved ? 'Saved' : 'Save'}</span>
              </motion.button>

              <motion.button
                onClick={handleShareClick}
                className={`${actionButtonBaseClass} text-neutral-500`}
                style={actionButtonStyle}
                aria-label="Share"
                whileTap={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                <ShareIcon /> <span className="hidden sm:inline">Share</span>
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});
