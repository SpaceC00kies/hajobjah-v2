
import React, { useState } from 'react';
import type { EnrichedWebboardComment, User } from '../types';
import { UserRole } from '../types';
import { UserLevelBadge } from './UserLevelBadge';
import { Button } from './Button';
import { containsBlacklistedWords } from '../App';

interface WebboardCommentItemProps {
  comment: EnrichedWebboardComment;
  currentUser: User | null;
  onDeleteComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
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

export const WebboardCommentItem: React.FC<WebboardCommentItemProps> = ({ comment, currentUser, onDeleteComment, onUpdateComment }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.text);
  const [editError, setEditError] = useState<string | null>(null);

  const isAuthor = currentUser?.id === comment.userId;
  const isAdmin = currentUser?.role === UserRole.Admin;
  const isModerator = currentUser?.role === UserRole.Moderator;
  
  // Delete button visibility based on props and roles
  // Fine-grained permission (Mod cannot delete Admin comment) handled in App.tsx
  const showDeleteButton = onDeleteComment && (isAuthor || isAdmin || isModerator);

  // Edit button visibility
  const showEditButton = onUpdateComment && isAuthor;


  const timeSince = (dateInput: string | Date): string => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
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
      <FallbackAvatarComment name={comment.username} photo={comment.authorPhoto} className="mt-1" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <span className="text-sm font-semibold text-neutral-dark dark:text-dark-text">@{comment.username}</span>
                <UserLevelBadge level={comment.authorLevel} size="sm" />
            </div>
            <div className="flex items-center space-x-2">
                {showEditButton && !isEditing && (
                    <button
                        onClick={handleEdit}
                        className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                        aria-label="แก้ไขคอมเมนต์"
                    >
                        ✏️
                    </button>
                )}
                {showDeleteButton && !isEditing && (
                    <button
                        onClick={handleDelete}
                        className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
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
        <div className="flex items-center mt-0.5">
            <p className="text-xs font-mono text-neutral-medium dark:text-dark-textMuted">{timeSince(comment.createdAt)}</p>
            {wasEdited && !isEditing && (
                <p className="ml-2 text-xs font-mono text-neutral-medium dark:text-dark-textMuted italic">(แก้ไขล่าสุด {timeSince(comment.updatedAt as Date)})</p>
            )}
        </div>
      </div>
    </div>
  );
};
