
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { View, User } from '../types'; // Import User

interface WebboardCommentFormProps {
  postId: string;
  currentUser: User | null; 
  onAddComment: (postId: string, text: string) => void;
  requestLoginForAction: (view: View, payload?: any) => void; 
  checkWebboardCommentLimits: (user: User) => { canPost: boolean; message?: string };
}

const FallbackAvatarCommentForm: React.FC<{ name?: string, photo?: string, size?: string, className?: string }> = ({ name, photo, size = "w-10 h-10", className = "" }) => {
    if (photo) {
      return <img src={photo} alt={name || 'avatar'} className={`${size} rounded-full object-cover ${className}`} />;
    }
    const initial = '💬'; 
    return (
      <div className={`${size} rounded-full bg-neutral-light flex items-center justify-center text-md text-neutral-dark ${className}`}>
        {initial}
      </div>
    );
  };

export const WebboardCommentForm: React.FC<WebboardCommentFormProps> = ({ postId, currentUser, onAddComment, requestLoginForAction, checkWebboardCommentLimits }) => {
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Removed cooldown state as per plan

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    // The checkWebboardCommentLimits function is called to get potential messages,
    // but the actual limiting logic based on cooldown is removed from the client-side form.
    // This function is now primarily for displaying messages from App.tsx's central logic if needed.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const limits = checkWebboardCommentLimits(currentUser);
  }, [postId, currentUser, checkWebboardCommentLimits]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: 'comment', postId: postId });
      return;
    }
    
    if (!commentText.trim()) {
      setError("กรุณาใส่ความคิดเห็น");
      return;
    }
    onAddComment(postId, commentText);
    setCommentText('');
    setError(null);
  };
  
  const isDisabled = !currentUser || !commentText.trim(); 
  let placeholderText = "แสดงความคิดเห็นของคุณ...";
  if (!currentUser) {
    placeholderText = "เข้าสู่ระบบเพื่อแสดงความคิดเห็น";
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-3 bg-neutral-light/50 rounded-lg">
      <div className="flex items-start space-x-3">
        <FallbackAvatarCommentForm name={currentUser?.publicDisplayName} photo={currentUser?.photo} className="mt-1" />
        <div className="flex-1">
          <textarea
            value={commentText}
            onChange={(e) => {
              setCommentText(e.target.value);
              if (error) setError(null);
            }}
            rows={3}
            className={`w-full p-2.5 border rounded-md text-sm font-sans font-normal transition-colors duration-150 ease-in-out
                        bg-white text-neutral-dark 
                        focus:outline-none focus:ring-1 focus:bg-gray-50
                        ${error 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' 
                            : 'border-neutral-DEFAULT focus:border-neutral-DEFAULT/70 focus:ring-neutral-DEFAULT/50'}`}
            placeholder={placeholderText}
            disabled={!currentUser} 
            aria-label="แสดงความคิดเห็น"
            aria-invalid={!!error}
            aria-describedby={error ? "comment-error" : undefined}
          />
          {error && <p id="comment-error" className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      </div>
      {currentUser && (
        <div className="text-right mt-2">
          <Button 
            type="submit" 
            variant="outline" 
            colorScheme="neutral" 
            size="sm" 
            disabled={isDisabled}
          >
            ส่งความคิดเห็น
          </Button>
        </div>
      )}
    </form>
  );
};
