
import React, { useState, useEffect, useRef } from 'react'; // Added useState, useEffect, useRef
import type { EnrichedWebboardPost, EnrichedWebboardComment, User } from '../types';
import { USER_LEVELS, UserRole, View, WebboardCategory, WEBBOARD_CATEGORY_STYLES }
from '../types';
import { Button } from './Button';
// UserLevelBadge is removed from direct import here as it's no longer used in this component
import { WebboardCommentItem } from './WebboardCommentItem';
import { WebboardCommentForm } from './WebboardCommentForm';
import { triggerHapticFeedback } from '@/utils/haptics'; // Import haptic utility
import { motion, AnimatePresence, type AnimationControls, useAnimation, type Transition, type Variants } from 'framer-motion';


interface WebboardPostDetailProps {
  post: EnrichedWebboardPost;
  comments: EnrichedWebboardComment[];
  currentUser: User | null;
  users: User[];
  onToggleLike: (postId: string) => void;
  onSavePost: (postId: string) => void;
  onSharePost: (postId: string, postTitle: string) => void;
  onAddComment: (postId:string, text: string) => void;
  onDeletePost: (postId: string) => void;
  onPinPost: (postId: string) => void;
  onEditPost: (post: EnrichedWebboardPost) => void;
  onDeleteComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  requestLoginForAction: (view: View, payload?: any) => void;
  onNavigateToPublicProfile: (profileInfo: { userId: string; helperProfileId?: string }) => void;
  checkWebboardCommentLimits: (user: User) => { canPost: boolean; message?: string };
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
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
const Icon = ({ path, className = "w-4 h-4" }: { path: string; className?: string }) => ( // Standardized to w-4 h-4
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d={path} clipRule="evenodd" />
  </svg>
);
const LikeIcon = () => <Icon path="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" className="w-4 h-4 text-neutral-500" />;
const LikedIcon = () => <Icon path="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" className="w-4 h-4 text-red-500" />;
const SaveIcon = () => <Icon path="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" className="w-4 h-4 text-neutral-500" />;
const SavedIcon = () => <Icon path="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" className="w-4 h-4 text-blue-500"/>;
const ShareIcon = () => <Icon path="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" className="w-4 h-4 text-neutral-500" />;

const commentListVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06, // Delay between each comment item animation
      delayChildren: 0.1,   // Initial delay before the first comment starts animating
    } as Transition,
  },
};


export const WebboardPostDetail: React.FC<WebboardPostDetailProps> = ({
  post,
  comments,
  currentUser,
  users,
  onToggleLike,
  onSavePost,
  onSharePost,
  onAddComment,
  onDeletePost,
  onPinPost,
  onEditPost,
  onDeleteComment,
  onUpdateComment,
  requestLoginForAction,
  onNavigateToPublicProfile,
  checkWebboardCommentLimits,
  getAuthorDisplayName,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const isAuthor = currentUser?.id === post.userId;
  const isAdmin = currentUser?.role === UserRole.Admin;
  const isModerator = currentUser?.role === UserRole.Moderator;
  const hasLiked = currentUser && post.likes.includes(currentUser.id);
  const isSaved = currentUser?.savedWebboardPosts?.includes(post.id) || false;
  const authorActualDisplayName = getAuthorDisplayName(post.userId, post.authorDisplayName);


  const canModeratorDeletePost = isModerator && !post.isAuthorAdmin;
  const canEditPost = isAuthor || isAdmin || (isModerator && !post.isAuthorAdmin);
  const canDeletePost = isAuthor || isAdmin || canModeratorDeletePost;

  const shareIconControls: AnimationControls = useAnimation();


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
    let interval = seconds / 31536000; if (interval > 1) return Math.floor(interval) + " ปีก่อน";
    interval = seconds / 2592000; if (interval > 1) return Math.floor(interval) + " เดือนก่อน";
    interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + " วันก่อน";
    interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + " ชม.ก่อน";
    interval = seconds / 60; if (interval > 1) return Math.floor(interval) + " นาทีที่แล้ว";
    return Math.floor(seconds) + " วินาทีที่แล้ว";
  };

  const postAuthor = users.find(u => u.id === post.userId);

  const handleLikeClick = () => {
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: 'like', postId: post.id });
    } else {
      onToggleLike(post.id);
      triggerHapticFeedback(15);
    }
  };

  const handleSaveClick = () => {
    if (!currentUser) requestLoginForAction(View.Webboard, { action: 'save', postId: post.id });
    else onSavePost(post.id);
  };

  const handleShareClick = () => {
    onSharePost(post.id, post.title);
    setCopiedLink(true);
    shareIconControls.start({ scale: [1, 1.2, 1], transition: { duration: 0.3 } });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const categoryStyle = WEBBOARD_CATEGORY_STYLES[post.category] || WEBBOARD_CATEGORY_STYLES[WebboardCategory.General];
  const actionButtonBaseClass = "flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-neutral-light focus:outline-none focus:ring-1 focus:ring-neutral-DEFAULT text-xs sm:text-sm transition-colors duration-150";


  return (
    <div className="bg-white shadow-xl rounded-xl p-4 sm:p-6 md:p-8 my-6 border border-neutral-DEFAULT/70">
      {post.isPinned && (
        <div className="mb-4 px-3 py-1 bg-yellow-100 rounded-full text-center">
          <p className="text-sm font-normal text-yellow-800">📌 ปักหมุดโดยแอดมิน</p>
        </div>
      )}

      <div className="mb-3">
        <span
          className={`text-xs font-medium mr-2 px-2.5 py-1 rounded-full inline-block ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border ? `border ${categoryStyle.border}`: ''}`}
        >
          {post.category}
        </span>
      </div>

      <h1 className="text-xl sm:text-2xl md:text-3xl font-sans font-semibold text-neutral-800 mb-4">{post.title}</h1>

      <div className="flex items-center mb-4 pb-3 border-b border-neutral-DEFAULT/30">
        <FallbackAvatarLarge name={authorActualDisplayName} photo={postAuthor?.photo || post.authorPhoto} className="mr-3 flex-shrink-0" />
        <div className="font-sans">
          <div className="flex items-baseline">
            <span
              className="text-sm font-semibold text-neutral-dark hover:underline cursor-pointer"
              onClick={() => onNavigateToPublicProfile({userId: post.userId})}
              role="link" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && onNavigateToPublicProfile({userId: post.userId})}
            >
              @{authorActualDisplayName}
            </span>
            <span className="ml-2 text-xs text-gray-500">
              · {timeSince(post.createdAt)}
              {post.updatedAt && new Date(post.updatedAt).getTime() !== new Date(post.createdAt).getTime() &&
                <span className="italic"> (แก้ไข {timeSince(post.updatedAt)})</span>
              }
            </span>
          </div>
        </div>
      </div>

      {post.image && (
        <div className="my-4 flex justify-center items-center bg-neutral-light rounded-lg overflow-hidden">
          <img src={post.image} alt={post.title} className="max-w-full max-h-[70vh] object-contain" />
        </div>
      )}

      <div className="prose prose-base font-serif max-w-none text-neutral-dark font-normal leading-relaxed whitespace-pre-wrap mb-6">
        {post.body}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-6 pt-4 border-t border-neutral-DEFAULT/30">
        <div className="flex items-center gap-2 sm:gap-3">
           <motion.button
            onClick={handleLikeClick}
            className={`${actionButtonBaseClass}`}
            aria-pressed={hasLiked}
            aria-label={hasLiked ? "Unlike post" : "Like post"}
            whileTap={{ scale: 0.9 }}
          >
            <motion.span
              key={hasLiked ? "liked-detail" : "unliked-detail"}
              initial={{ scale: 1 }}
              animate={hasLiked ? { scale: [1, 1.3, 1], transition: { type: "spring", stiffness: 400, damping: 10 } } : { scale: [1, 0.8, 1], transition: { type: "spring", stiffness: 300, damping: 15 } }}
              className="inline-block"
            >
              {hasLiked ? <LikedIcon /> : <LikeIcon />}
            </motion.span>
             <AnimatePresence mode="popLayout">
                <motion.span
                    key={`likes-${post.likes.length}`}
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.15 } }}
                    exit={{ opacity: 0, y: 3, transition: { duration: 0.15 } }}
                    className={`font-medium ${hasLiked ? 'text-red-500' : 'text-neutral-500'}`}
                >
                    {post.likes.length}
                </motion.span>
            </AnimatePresence>
          </motion.button>
          {currentUser && (
            <>
            <motion.button
                onClick={handleSaveClick}
                className={`${actionButtonBaseClass}`}
                aria-pressed={isSaved}
                aria-label={isSaved ? "Unsave post" : "Save post"}
                whileTap={{ scale: 0.9 }}
            >
              <motion.span
                key={isSaved ? "saved-detail" : "unsaved-detail"}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 0.8, 1.1, 1], transition: { type: "spring", stiffness: 350, damping: 12 } }}
                className="inline-block"
              >
                {isSaved ? <SavedIcon/> : <SaveIcon />}
              </motion.span>
              <span className={`hidden sm:inline ${isSaved ? 'text-blue-500' : 'text-neutral-500'}`}>{isSaved ? 'Saved' : 'Save'}</span>
            </motion.button>
            <div className="relative">
                <motion.button
                    onClick={handleShareClick}
                    className={`${actionButtonBaseClass} text-neutral-500`}
                    aria-label="Share post"
                    whileTap={{ scale: 0.9 }}
                    animate={shareIconControls}
                >
                  <ShareIcon /> <span className="hidden sm:inline">Share</span>
                </motion.button>
                {copiedLink && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-neutral-dark text-white text-xs rounded-md shadow-lg whitespace-nowrap">
                    Link Copied!
                </span>
                )}
            </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEditPost && (
             <Button onClick={() => onEditPost(post)} variant="outline" colorScheme="neutral" size="sm" className="text-xs px-2">✏️ แก้ไข</Button>
          )}
          {isAdmin && (
            <Button
              onClick={() => onPinPost(post.id)}
              variant={post.isPinned ? "secondary" : "outline"}
              colorScheme="secondary"
              size="sm"
              className="text-xs px-2"
            >
              {post.isPinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
            </Button>
          )}
          {canDeletePost && (
            <Button onClick={() => onDeletePost(post.id)} variant="outline" colorScheme="accent" size="sm" className="text-xs border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-2">
              🗑️ ลบโพสต์
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h4 className="text-lg font-semibold text-neutral-dark mb-3 font-sans">
            {comments.length} ความคิดเห็น
        </h4>
        {comments.length > 0 ? (
          <AnimatePresence>
            <motion.div
              className="space-y-1"
              variants={commentListVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {comments
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map(comment => {
                      const commenter = users.find(u => u.id === comment.userId);
                      const commenterActualDisplayName = getAuthorDisplayName(comment.userId, comment.authorDisplayName);
                      const enrichedComment: EnrichedWebboardComment = {
                          ...comment,
                          authorDisplayName: commenterActualDisplayName, // Use the live display name
                          authorPhoto: commenter?.photo || comment.authorPhoto,
                          isAuthorAdmin: commenter?.role === UserRole.Admin,
                      };
                      return (
                          <WebboardCommentItem
                              key={comment.id}
                              comment={enrichedComment}
                              currentUser={currentUser}
                              onDeleteComment={onDeleteComment}
                              onUpdateComment={onUpdateComment}
                              onNavigateToPublicProfile={(userId) => onNavigateToPublicProfile({ userId })}
                          />
                      );
              })}
            </motion.div>
          </AnimatePresence>
        ) : (
          <p className="text-sm text-neutral-medium">ยังไม่มีความคิดเห็น...</p>
        )}
        <WebboardCommentForm
            postId={post.id}
            currentUser={currentUser}
            onAddComment={onAddComment}
            requestLoginForAction={requestLoginForAction}
            checkWebboardCommentLimits={checkWebboardCommentLimits}
        />
      </div>
    </div>
  );
};
