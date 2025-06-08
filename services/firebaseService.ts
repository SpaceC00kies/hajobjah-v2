
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { View, User } from '../types'; // Import User

interface WebboardCommentFormProps {
  postId: string;
  currentUser: User | null; 
  onAddComment: (postId: string, text: string) => void;
  requestLoginForAction: (view: View, payload?: any) => void; 
  // checkWebboardCommentLimits prop is no longer used for limiting, but kept for structural consistency if App.tsx still passes it.
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

// COMMENT_COOLDOWN_SECONDS removed

export const WebboardCommentForm: React.FC<WebboardCommentFormProps> = ({ postId, currentUser, onAddComment, requestLoginForAction, checkWebboardCommentLimits }) => {
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Removed state: isCoolingDown, cooldownTimeLeft, hourlyLimitMessage, canPostHourly

  // getCooldownStorageKey removed

  useEffect(() => {
    if (!currentUser) {
      // No specific logic needed here now for cooldown/limits when logged out
      return;
    }
    // Hourly limit check from props is not actively used to block posting anymore
    // but the prop might still be passed.
    // const hourlyLimits = checkWebboardCommentLimits(currentUser);
    // setCanPostHourly(hourlyLimits.canPost);
    // setHourlyLimitMessage(hourlyLimits.message || null);

    // Per-post cooldown logic removed
  }, [postId, currentUser, checkWebboardCommentLimits]);

  // Timer useEffect for cooldownTimeLeft removed

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: 'comment', postId: postId });
      return;
    }
    // Hourly limit and cooldown checks removed
    // if (!canPostHourly) {
    //   setError(hourlyLimitMessage || "ไม่สามารถแสดงความคิดเห็นได้ในขณะนี้");
    //   return;
    // }
    // if (isCoolingDown) {
    //   setError(`โปรดรออีก ${cooldownTimeLeft} วินาทีก่อนแสดงความคิดเห็นอีกครั้งในกระทู้นี้`);
    //   return;
    // }
    if (!commentText.trim()) {
      setError("กรุณาใส่ความคิดเห็น");
      return;
    }
    onAddComment(postId, commentText);
    setCommentText('');
    setError(null);
    // localStorage.setItem for cooldown removed
    // setIsCoolingDown(true); // Cooldown state removed
    // setCooldownTimeLeft(COMMENT_COOLDOWN_SECONDS); // Cooldown state removed

    // Re-check hourly limit state (though not enforced for posting)
    // if (currentUser) {
    //     const limits = checkWebboardCommentLimits(currentUser);
    //     // setCanPostHourly(limits.canPost);
    //     // setHourlyLimitMessage(limits.message || null);
    // }
  };
  
  const isDisabled = !currentUser || !commentText.trim(); // Simplified disabled logic
  let placeholderText = "แสดงความคิดเห็นของคุณ...";
  if (!currentUser) placeholderText = "เข้าสู่ระบบเพื่อแสดงความคิดเห็น";
  // Placeholder logic for cooldown/hourly limit removed
  // else if (!canPostHourly) placeholderText = hourlyLimitMessage || "จำกัดการแสดงความคิดเห็นชั่วคราว";
  // else if (isCoolingDown) placeholderText = `รออีก ${cooldownTimeLeft} วินาที ก่อนคอมเมนต์ในกระทู้นี้อีกครั้ง...`;


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
            className={`w-full p-2 border rounded-md text-sm font-normal
                        bg-white dark:bg-dark-inputBg text-neutral-dark dark:text-dark-text 
                        focus:outline-none focus:ring-2
                        ${error 
                            ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 focus:ring-opacity-70 dark:focus:ring-red-400 dark:focus:ring-opacity-70' 
                            : 'border-gray-200 dark:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 focus:ring-gray-300 focus:ring-opacity-70 dark:focus:ring-gray-600 dark:focus:ring-opacity-70'}`}
            placeholder={placeholderText}
            disabled={!currentUser} // Only disable if not logged in; button handles empty text
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
            {/* Cooldown text removed from button */}
          </Button>
        </div>
      )}
    </form>
  );
};
