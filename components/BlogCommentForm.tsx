"use client";
import React, { useState } from 'react';
import type { User } from '../types/types.ts';
import { Button } from './Button.tsx';

interface BlogCommentFormProps {
  postId: string;
  currentUser: User | null;
  onAddComment: (postId: string, text: string) => void;
}

export const BlogCommentForm: React.FC<BlogCommentFormProps> = ({ postId, currentUser, onAddComment }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !currentUser) return;
    onAddComment(postId, text);
    setText('');
  };

  if (!currentUser) {
    return (
      <div className="bg-neutral-light p-4 rounded-lg text-center">
        <p className="text-sm text-neutral-medium">กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start space-x-4">
      {currentUser.photo ? (
        <img src={currentUser.photo} alt={currentUser.publicDisplayName} className="w-10 h-10 rounded-full object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-neutral-light flex items-center justify-center font-bold text-neutral-dark">
          {currentUser.publicDisplayName.charAt(0)}
        </div>
      )}
      <div className="flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="แสดงความคิดเห็นของคุณ..."
          className="w-full border rounded-lg p-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
          rows={3}
          required
        />
        <div className="text-right mt-2">
          <Button type="submit" size="sm" disabled={!text.trim()}>
            ส่งความคิดเห็น
          </Button>
        </div>
      </div>
    </form>
  );
};