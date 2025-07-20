





import React, { useState } from 'react';
import type { EnrichedWebboardComment, User, View } from '../types/types'; // Added View
import { UserRole } from '../types/types';
// UserLevelBadge is removed as it's no longer displayed here
import { Button } from './Button';
import { containsBlacklistedWords } from '../utils/validation';
import { motion, AnimatePresence } from 'framer-motion';

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

const commentItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
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

  const wasEdited = comment.updatedAt && comment.createdAt && new Date(comment.updatedAt as string).getTime() !== new Date(comment.createdAt as string).getTime();

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
