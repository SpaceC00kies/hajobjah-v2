
import React from 'react';
import type { EnrichedWebboardPost, EnrichedWebboardComment, User } from '../types';
import { USER_LEVELS, UserRole, View, WebboardCategory, WEBBOARD_CATEGORY_STYLES } // Import UserRole, View, WebboardCategory, and WEBBOARD_CATEGORY_STYLES
from '../types';
import { Button } from './Button';
import { UserLevelBadge } from './UserLevelBadge';
import { WebboardCommentItem } from './WebboardCommentItem';
import { WebboardCommentForm } from './WebboardCommentForm';

interface WebboardPostDetailProps {
  post: EnrichedWebboardPost;
  comments: EnrichedWebboardComment[];
  currentUser: User | null;
  users: User[]; 
  onToggleLike: (postId: string) => void;
  onAddComment: (postId:string, text: string) => void;
  onDeletePost: (postId: string) => void;
  onPinPost: (postId: string) => void;
  onEditPost: (post: EnrichedWebboardPost) => void;
  onDeleteComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  requestLoginForAction: (view: View, payload?: any) => void; 
  onNavigateToPublicProfile: (userId: string) => void;
  checkWebboardCommentLimits: (user: User) => { canPost: boolean; message?: string };
}

const FallbackAvatarLarge: React.FC<{ name?: string, photo?: string, size?: string, className?: string }> = ({ name, photo, size = "w-12 h-12", className = "" }) => {
  if (photo) {
    return <img src={photo} alt={name || 'avatar'} className={`${size} rounded-full object-cover ${className}`} />;
  }
  const initial = name ? name.charAt(0).toUpperCase() : '👤';
  return (
    <div className={`${size} rounded-full bg-neutral/60 dark:bg-dark-inputBg flex items-center justify-center text-xl text-white dark:text-dark-text ${className}`}>
      {initial}
    </div>
  );
};

export const WebboardPostDetail: React.FC<WebboardPostDetailProps> = ({
  post,
  comments,
  currentUser,
  users,
  onToggleLike,
  onAddComment,
  onDeletePost,
  onPinPost,
  onEditPost,
  onDeleteComment,
  onUpdateComment,
  requestLoginForAction, 
  onNavigateToPublicProfile,
  checkWebboardCommentLimits,
}) => {
  const isAuthor = currentUser?.id === post.userId;
  const isAdmin = currentUser?.role === UserRole.Admin;
  const isModerator = currentUser?.role === UserRole.Moderator;
  const hasLiked = currentUser && post.likes.includes(currentUser.id);

  const canModeratorDeletePost = isModerator && !post.isAuthorAdmin;
  const canEditPost = isAuthor || isAdmin || (isModerator && !post.isAuthorAdmin);
  const canDeletePost = isAuthor || isAdmin || canModeratorDeletePost;


  const timeSince = (dateInput: string | Date | null | undefined): string => {
    if (dateInput === null || dateInput === undefined) {
      return "just now";
    }

    let dateObject: Date;
    if (dateInput instanceof Date) {
      dateObject = dateInput;
    } else if (typeof dateInput === 'string') {
      dateObject = new Date(dateInput);
    } else {
      if (typeof dateInput === 'object' && dateInput && 'toDate' in dateInput && typeof (dateInput as any).toDate === 'function') {
        dateObject = (dateInput as any).toDate();
      } else {
        console.warn("timeSince received unexpected dateInput type:", dateInput);
        return "Invalid date input";
      }
    }

    if (isNaN(dateObject.getTime())) {
      return "Processing date...";
    }

    const seconds = Math.floor((new Date().getTime() - dateObject.getTime()) / 1000);

    if (seconds < 0) {
      return "just now";
    }
    if (seconds < 5) return "just now";
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " ปีก่อน";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " เดือนก่อน";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " วันก่อน";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " ชม.ก่อน";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " นาทีที่แล้ว";
    return Math.floor(seconds) + " วินาทีที่แล้ว";
  };

  const postAuthor = users.find(u => u.id === post.userId);

  const handleLikeClick = () => {
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: 'like', postId: post.id });
    } else {
      onToggleLike(post.id);
    }
  };

  const categoryStyle = WEBBOARD_CATEGORY_STYLES[post.category] || WEBBOARD_CATEGORY_STYLES[WebboardCategory.General];

  return (
    <div className="bg-white dark:bg-dark-cardBg shadow-xl rounded-xl p-6 md:p-8 my-6 border border-neutral-DEFAULT/70 dark:border-dark-border/70">
      {post.isPinned && (
        <div className="mb-4 px-3 py-1 bg-yellow-100 dark:bg-yellow-500/20 rounded-full text-center">
          <p className="text-sm font-normal text-yellow-800 dark:text-yellow-300">📌 ปักหมุดโดยแอดมิน</p>
        </div>
      )}

      <div className="mb-3">
        <span 
          className={`text-xs font-medium mr-2 px-2.5 py-1 rounded-full inline-block ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border ? `border ${categoryStyle.border}`: ''}`}
        >
          {post.category}
        </span>
      </div>

      <h1 className="text-2xl md:text-3xl font-sans font-semibold text-neutral-800 dark:text-dark-text mb-4">{post.title}</h1>

      <div className="flex items-center mb-4 pb-3 border-b border-neutral-DEFAULT/30 dark:border-dark-border/30">
        <FallbackAvatarLarge name={post.authorDisplayName} photo={postAuthor?.photo || post.authorPhoto} className="mr-3 flex-shrink-0" />
        <div className="font-sans">
          {/* Line 1: Username and Badge */}
          <div className="flex items-center">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">@{post.authorDisplayName}</span>
            <UserLevelBadge level={post.authorLevel} size="sm" /> {/* Use sm for text-xs */}
          </div>
          {/* Line 2: Timestamp */}
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            🕒 โพสต์เมื่อ: {timeSince(post.createdAt)}
            {post.updatedAt && post.updatedAt !== post.createdAt && ` (แก้ไขเมื่อ: ${timeSince(post.updatedAt)})`}
          </p>
        </div>
      </div>

      {post.image && (
        <div className="my-4 max-h-96 overflow-hidden rounded-lg flex justify-center items-center bg-neutral-light dark:bg-dark-inputBg">
          <img src={post.image} alt="Post image" className="max-h-96 w-auto object-contain" />
        </div>
      )}

      <div className="prose prose-sm sm:prose dark:prose-invert max-w-none text-neutral-dark dark:text-dark-textMuted font-normal leading-relaxed whitespace-pre-wrap mb-6 font-serif">
        {post.body}
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-DEFAULT/30 dark:border-dark-border/30">
        <button
          onClick={handleLikeClick}
          className={`px-2 py-1 text-xs rounded-lg border hover:scale-110 transform transition-transform duration-150 ease-in-out focus:outline-none focus:ring-1 focus:ring-opacity-50
            ${hasLiked 
              ? 'text-red-500 dark:text-red-400 border-red-500 dark:border-red-400 focus:ring-red-300' 
              : 'text-neutral-500 dark:text-neutral-400 border-neutral-400 dark:border-neutral-500 hover:border-neutral-500 dark:hover:border-neutral-400 focus:ring-neutral-300'
            }`}
          aria-pressed={hasLiked}
          aria-label={hasLiked ? "Unlike post" : "Like post"}
        >
          {hasLiked ? '❤️' : '🤍'} {post.likes.length}
        </button>
        <div>
          {canEditPost && (
             <Button onClick={() => onEditPost(post)} variant="outline" colorScheme="neutral" size="sm" className="mr-2 text-xs">✏️ แก้ไข</Button>
          )}
          {isAdmin && (
            <Button 
              onClick={() => onPinPost(post.id)} 
              variant={post.isPinned ? "secondary" : "outline"}
              colorScheme="secondary"
              size="sm" 
              className="mr-2 text-xs"
            >
              {post.isPinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
            </Button>
          )}
          {canDeletePost && (
            <Button onClick={() => onDeletePost(post.id)} variant="outline" colorScheme="accent" size="sm" className="text-xs border-red-500 text-red-500 hover:bg-red-500 hover:text-white dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400 dark:hover:text-neutral-dark">
              🗑️ ลบโพสต์
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h4 className="text-lg font-semibold text-neutral-dark dark:text-dark-text mb-3 font-sans">
            {comments.length} ความคิดเห็น
        </h4>
        {comments.length > 0 ? (
          <div className="space-y-1">
            {comments
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) 
                .map(comment => {
                    const commenter = users.find(u => u.id === comment.userId);
                    const enrichedComment: EnrichedWebboardComment = {
                        ...comment,
                        authorLevel: comment.authorLevel,
                        authorPhoto: commenter?.photo || comment.authorPhoto,
                    };
                    return (
                        <WebboardCommentItem 
                            key={comment.id} 
                            comment={enrichedComment} 
                            currentUser={currentUser} 
                            onDeleteComment={onDeleteComment}
                            onUpdateComment={onUpdateComment}
                            onNavigateToPublicProfile={onNavigateToPublicProfile}
                        />
                    );
            })}
          </div>
        ) : (
          <p className="text-sm text-neutral-medium dark:text-dark-textMuted">ยังไม่มีความคิดเห็น...</p>
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
