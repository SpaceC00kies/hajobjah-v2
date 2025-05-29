
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { View } from '../types'; // Import View

interface WebboardCommentFormProps {
  postId: string;
  currentUserPhoto?: string;
  currentUsername?: string;
  onAddComment: (postId: string, text: string) => void;
  isLoggedIn: boolean;
  requestLoginForAction: (view: View, payload?: any) => void; 
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

const COMMENT_COOLDOWN_SECONDS = 30;

export const WebboardCommentForm: React.FC<WebboardCommentFormProps> = ({ postId, currentUserPhoto, currentUsername, onAddComment, isLoggedIn, requestLoginForAction }) => {
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);

  const getCooldownStorageKey = () => `lastCommentTime_${postId}`;

  useEffect(() => {
    if (!isLoggedIn) {
        setIsCoolingDown(false);
        setCooldownTimeLeft(0);
        return;
    }

    const storageKey = getCooldownStorageKey();
    const lastCommentTime = localStorage.getItem(storageKey);
    if (lastCommentTime) {
      const timeSinceLastComment = (Date.now() - parseInt(lastCommentTime, 10)) / 1000;
      if (timeSinceLastComment < COMMENT_COOLDOWN_SECONDS) {
        setIsCoolingDown(true);
        setCooldownTimeLeft(Math.ceil(COMMENT_COOLDOWN_SECONDS - timeSinceLastComment));
      }
    }
  }, [postId, isLoggedIn]);

  useEffect(() => {
    let timer: number | undefined;
    if (isCoolingDown && cooldownTimeLeft > 0) {
      timer = window.setTimeout(() => {
        setCooldownTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isCoolingDown && cooldownTimeLeft <= 0) {
      setIsCoolingDown(false);
    }
    return () => clearTimeout(timer);
  }, [isCoolingDown, cooldownTimeLeft]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      requestLoginForAction(View.Webboard, { action: 'comment', postId: postId });
      return;
    }
    if (isCoolingDown) {
      setError(`โปรดรออีก ${cooldownTimeLeft} วินาทีก่อนแสดงความคิดเห็นอีกครั้ง`);
      return;
    }
    if (!commentText.trim()) {
      setError("กรุณาใส่ความคิดเห็น");
      return;
    }
    onAddComment(postId, commentText);
    setCommentText('');
    setError(null);
    localStorage.setItem(getCooldownStorageKey(), Date.now().toString());
    setIsCoolingDown(true);
    setCooldownTimeLeft(COMMENT_COOLDOWN_SECONDS);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-3 bg-neutral-light/50 dark:bg-dark-inputBg/30 rounded-lg">
      <div className="flex items-start space-x-3">
        <FallbackAvatarCommentForm name={currentUsername} photo={currentUserPhoto} className="mt-1" />
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
            placeholder={isLoggedIn ? (isCoolingDown ? `รออีก ${cooldownTimeLeft} วิ...` : "แสดงความคิดเห็นของคุณ...") : "เข้าสู่ระบบเพื่อแสดงความคิดเห็น"}
            disabled={!isLoggedIn || isCoolingDown}
            aria-label="แสดงความคิดเห็น"
            aria-invalid={!!error}
            aria-describedby={error ? "comment-error" : undefined}
          />
          {error && <p id="comment-error" className="text-red-500 dark:text-red-400 text-xs mt-1">{error}</p>}
        </div>
      </div>
      {isLoggedIn && (
        <div className="text-right mt-2">
          <Button 
            type="submit" 
            variant="outline" 
            colorScheme="neutral" 
            size="sm" 
            disabled={!commentText.trim() || isCoolingDown}
          >
            {isCoolingDown ? `รอ (${cooldownTimeLeft} วิ)` : 'ส่งความคิดเห็น'}
          </Button>
        </div>
      )}
    </form>
  );
};
