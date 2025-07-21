import React, { useState } from 'react';
import type { BlogComment, User } from '../types/types';
import { Button } from './Button.tsx';

interface BlogCommentItemProps {
  comment: BlogComment;
  currentUser: User | null;
  onUpdateComment: (commentId: string, newText: string) => void;
  onDeleteComment: (commentId: string) => void;
  canEditOrDelete: (userId: string) => boolean;
}

export const BlogCommentItem: React.FC<BlogCommentItemProps> = ({ comment, currentUser, onUpdateComment, onDeleteComment, canEditOrDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.text);

  const handleSave = () => {
    if (editedText.trim() && editedText !== comment.text) {
      onUpdateComment(comment.id, editedText);
    }
    setIsEditing(false);
  };

  const wasEdited = new Date(comment.updatedAt as string).getTime() > new Date(comment.createdAt as string).getTime() + 1000;

  return (
    <div className="flex items-start space-x-4">
      {comment.authorPhotoURL ? (
        <img src={comment.authorPhotoURL} alt={comment.authorDisplayName} className="w-10 h-10 rounded-full object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-neutral-light flex items-center justify-center font-bold text-neutral-dark">
          {comment.authorDisplayName.charAt(0)}
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold text-sm text-neutral-dark">{comment.authorDisplayName}</span>
            <span className="text-xs text-neutral-medium ml-2">
              {new Date(comment.createdAt as string).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
              {wasEdited && <span className="italic"> (edited)</span>}
            </span>
          </div>
          {canEditOrDelete(comment.userId) && !isEditing && (
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
              <button onClick={() => onDeleteComment(comment.id)} className="text-xs text-red-600 hover:underline">Delete</button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full border rounded p-2 text-sm"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <Button onClick={handleSave} size="sm">Save</Button>
              <Button onClick={() => setIsEditing(false)} size="sm" variant="outline">Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-dark mt-1 whitespace-pre-wrap">{comment.text}</p>
        )}
      </div>
    </div>
  );
};