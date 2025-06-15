
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
      <div className={`${size} rounded-full bg-neutral-light dark:bg-dark-inputBg flex items-center justify-center text-md text-neutral-dark dark:text-dark-text ${className}`}>
        {initial}
      </div>
    );
  };

export const WebboardCommentForm: React.FC<WebboardCommentFormProps> = ({ postId, currentUser, onAddComment, requestLoginForAction, checkWebboardCommentLimits }) => {
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Removed: isCoolingDown, cooldownTimeLeft, hourlyLimitMessage, canPostHourly related states

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    // Call checkWebboardCommentLimits for consistency, though its direct enforcement is removed.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const limits = checkWebboardCommentLimits(currentUser);
    // setCanPostHourly(limits.canPost); // No longer used to block
    // setHourlyLimitMessage(limits.message || null); // No longer used to block
    
    // Per-post cooldown logic and related timer useEffect have been removed.
  }, [postId, currentUser, checkWebboardCommentLimits]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: 'comment', postId: postId });
      return;
    }
    
    // Hourly limit and cooldown checks removed from here.
    // The checkWebboardCommentLimits function in App.tsx now always returns canPost: true.

    if (!commentText.trim()) {
      setError("กรุณาใส่ความคิดเห็น");
      return;
    }
    onAddComment(postId, commentText);
    setCommentText('');
    setError(null);
    // Cooldown state updates and localStorage logic removed.
  };
  
  const isDisabled = !currentUser || !commentText.trim(); 
  let placeholderText = "แสดงความคิดเห็นของคุณ...";
  if (!currentUser) {
    placeholderText = "เข้าสู่ระบบเพื่อแสดงความคิดเห็น";
  }
  // Placeholder logic for cooldown/hourly limit removed.

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-3 bg-neutral-light/50 dark:bg-dark-inputBg/30 rounded-lg">
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
            className={`w-full p-2 border rounded-md text-sm font-normal transition-colors duration-150 ease-in-out
                        bg-white dark:bg-dark-inputBg text-neutral-dark dark:text-dark-text 
                        focus:outline-none focus:ring-2 focus:bg-gray-50 dark:focus:bg-[#383838]
                        ${error 
                            ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 focus:ring-opacity-70 dark:focus:ring-red-400 dark:focus:ring-opacity-70' 
                            : 'border-gray-200 dark:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 focus:ring-gray-300 focus:ring-opacity-70 dark:focus:ring-gray-600 dark:focus:ring-opacity-70'}`}
            placeholder={placeholderText}
            disabled={!currentUser} 
            aria-label="แสดงความคิดเห็น"
            aria-invalid={!!error}
            aria-describedby={error ? "comment-error" : undefined}
          />
          {error && <p id="comment-error" className="text-red-500 dark:text-red-400 text-xs mt-1">{error}</p>}
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
