

import React, { useState } from 'react';
import type { EnrichedWebboardComment, User, View } from '../types.ts'; // Added View
import { UserRole } from '../types.ts';
// UserLevelBadge is removed as it's no longer displayed here
import { Button } from './Button.tsx';
import { containsBlacklistedWords } from '../utils/validation.ts';
import { motion, Variants, Transition } from 'framer-motion'; // Import motion

interface WebboardCommentItemProps {
  comment: EnrichedWebboardComment;
  currentUser: User | null;
  onDeleteComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  onNavigateToPublicProfile: (userId: string) => void; 
}

const FallbackAvatarComment: React.FC<{ name?: string, photo?: string, size?: string, className?: string }> = ({ name, photo, size = "w-10 h-10", className = "" }) => {
  if (photo) {
    return <img src={photo} alt={name || 'avatar'} className={`${size} rounded-full object-cover ${className}`} />;
  }
  const initial = name ? name.charAt(0).toUpperCase() : '💬';
  return (
    <div className={`${size} rounded-full bg-neutral-light flex items-center justify-center text-md text-neutral-dark ${className}`}>
      {initial}
    </div>
  );
};

const commentItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 20,
    },
  },
  exit: { 
    opacity: 0,
    y: -15, 
    transition: { duration: 0.2 },
  }
};

export const WebboardCommentItem: React.FC<WebboardCommentItemProps> = ({ comment, currentUser, onDeleteComment, onUpdateComment, onNavigateToPublicProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.text);
  const [editError, setEditError] = useState<string | null>(null);

  const isAuthor = currentUser?.id === comment.userId;
  const isAdmin = currentUser?.role === UserRole.Admin;
  const isModerator = currentUser?.role === UserRole.Moderator;
  
  const canModeratorDelete = isModerator && !comment.isAuthorAdmin;
  const showDeleteButton = onDeleteComment && (isAuthor || isAdmin || canModeratorDelete);
  const showEditButton = onUpdateComment && isAuthor;


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

  const handleEdit = () => {
    setEditedText(comment.text);
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText(comment.text);
    setEditError(null);
  };

  const handleSaveEdit = () => {
    if (containsBlacklistedWords(editedText)) {
        setEditError('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม โปรดแก้ไข');
        return;
    }
    if (!editedText.trim()) {
        setEditError('เนื้อหาคอมเมนต์ห้ามว่าง');
        return;
    }
    if (onUpdateComment && editedText.trim() !== comment.text) {
      onUpdateComment(comment.id, editedText.trim());
    }
    setIsEditing(false);
    setEditError(null);
  };
  
  const handleDelete = () => {
    if (showDeleteButton && onDeleteComment) {
        onDeleteComment(comment.id);
    }
  };

  const wasEdited = comment.updatedAt && comment.createdAt && new Date(comment.updatedAt).getTime() !== new Date(comment.createdAt).getTime();

  return (
    <motion.div 
      className="flex items-start space-x-3 py-3 border-b border-neutral-DEFAULT/50 last:border-b-0"
      variants={commentItemVariants}
      initial="hidden" // Animate in when first appearing
      animate="visible"
      exit="exit" // Animate out when removed by AnimatePresence
      layout // Smoothly animate layout changes (e.g., when edit form appears/disappears)
    >
      <FallbackAvatarComment name={comment.authorDisplayName} photo={comment.authorPhoto} className="mt-1" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
            <div className="flex items-baseline"> 
                <span 
                    className="text-sm font-semibold text-neutral-dark cursor-pointer hover:underline"
                    onClick={() => onNavigateToPublicProfile(comment.userId)}
                    role="link"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && onNavigateToPublicProfile(comment.userId)}
                >
                    @{comment.authorDisplayName}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                    · {timeSince(comment.createdAt)}
                    {wasEdited && !isEditing && (
                        <span className="italic"> (แก้ไข {timeSince(comment.updatedAt as Date)})</span>
                    )}
                </span>
            </div>
            <div className="flex items-center space-x-1">
                {showEditButton && !isEditing && (
                    <button
                        onClick={handleEdit}
                        className="text-xs text-blue-500 hover:text-blue-700 p-0.5 rounded hover:bg-blue-100"
                        aria-label="แก้ไขคอมเมนต์"
                    >
                        ✏️
                    </button>
                )}
                {showDeleteButton && !isEditing && (
                    <button
                        onClick={handleDelete}
                        className="text-xs text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-100"
                        aria-label="ลบคอมเมนต์"
                    >
                        🗑️
                    </button>
                )}
            </div>
        </div>
        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editedText}
              onChange={(e) => {
                setEditedText(e.target.value);
                if(editError) setEditError(null);
              }}
              rows={3}
              className={`w-full p-2.5 border rounded-md text-sm font-sans bg-white text-neutral-dark focus:outline-none focus:ring-1
                          ${editError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' 
                                      : 'border-neutral-DEFAULT focus:border-blue-400 focus:ring-blue-400/50'}`}
              aria-label="แก้ไขเนื้อหาคอมเมนต์"
              aria-invalid={!!editError}
              aria-describedby={editError ? "comment-edit-error" : undefined}
            />
            {editError && <p id="comment-edit-error" className="text-red-500 text-xs mt-1">{editError}</p>}
            <div className="flex items-center gap-2 mt-2">
              <Button onClick={handleSaveEdit} size="sm" colorScheme="primary">
                บันทึก
              </Button>
              <Button onClick={handleCancelEdit} size="sm" variant="outline" colorScheme="neutral">
                ยกเลิก
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm font-serif text-neutral-dark whitespace-pre-wrap leading-relaxed">
            {comment.text}
          </p>
        )}
      </div>
    </motion.div>
  );
};
