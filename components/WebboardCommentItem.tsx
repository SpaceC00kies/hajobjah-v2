
import React, { useState } from 'react';
import type { EnrichedWebboardComment, User, View } from '../types'; // Added View
import { UserRole } from '../types';
// UserLevelBadge removed as it's no longer displayed here
import { Button } from './Button';
import { containsBlacklistedWords } from '../App';

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
    <div className={`${size} rounded-full bg-neutral-light dark:bg-dark-inputBg flex items-center justify-center text-md text-neutral-dark dark:text-dark-text ${className}`}>
      {initial}
    </div>
  );
};

export const WebboardCommentItem: React.FC<WebboardCommentItemProps> = ({ comment, currentUser, onDeleteComment, onUpdateComment, onNavigateToPublicProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.text);
  const [editError, setEditError] = useState<string | null>(null);

  const isAuthor = currentUser?.id === comment.userId;
  const isAdmin = currentUser?.role === UserRole.Admin;
  const isModerator = currentUser?.role === UserRole.Moderator;
  
  // Moderator can delete any comment not by an admin
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
    <div className="flex items-start space-x-3 py-3 border-b border-neutral-DEFAULT/50 dark:border-dark-border/50 last:border-b-0">
      <FallbackAvatarComment name={comment.authorDisplayName} photo={comment.authorPhoto} className="mt-1" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
            <div className="flex items-baseline"> {/* Use baseline for better alignment if font sizes differ */}
                <span 
                    className="text-sm font-semibold text-neutral-dark dark:text-dark-text cursor-pointer hover:underline"
                    onClick={() => onNavigateToPublicProfile(comment.userId)}
                    role="link"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && onNavigateToPublicProfile(comment.userId)}
                >
                    @{comment.authorDisplayName}
                </span>
                {/* UserLevelBadge removed */}
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
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
                        className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-700/30"
                        aria-label="แก้ไขคอมเมนต์"
                    >
                        ✏️
                    </button>
                )}
                {showDeleteButton && !isEditing && (
                    <button
                        onClick={handleDelete}
                        className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-700/30"
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
              className={`w-full p-2 border rounded-md text-sm font-normal bg-white dark:bg-dark-inputBg text-neutral-dark dark:text-dark-text focus:outline-none focus:ring-1
                          ${editError ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500/50' 
                                      : 'border-neutral-DEFAULT/70 dark:border-dark-border/70 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-blue-400/50 dark:focus:ring-blue-500/50'}`}
              aria-label="แก้ไขเนื้อหาคอมเมนต์"
              aria-invalid={!!editError}
              aria-describedby={editError ? "edit-comment-error" : undefined}
            />
            {editError && <p id="edit-comment-error" className="text-red-500 dark:text-red-400 text-xs mt-1">{editError}</p>}
            <div className="flex justify-end space-x-2 mt-2">
              <Button onClick={handleCancelEdit} variant="outline" colorScheme="neutral" size="sm" className="text-xs">ยกเลิก</Button>
              <Button onClick={handleSaveEdit} variant="primary" size="sm" className="text-xs">บันทึก</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-dark dark:text-dark-textMuted whitespace-pre-wrap font-normal py-1">{comment.text}</p>
        )}
      </div>
    </div>
  );
};
