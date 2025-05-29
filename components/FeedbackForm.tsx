
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedbackText: string) => Promise<boolean>; 
  submissionStatus: 'idle' | 'submitting' | 'success' | 'error';
  submissionMessage: string | null;
}

const FEEDBACK_COOLDOWN_SECONDS = 180; // 3 minutes

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submissionStatus,
  submissionMessage,
}) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);

  const FEEDBACK_COOLDOWN_STORAGE_KEY = 'lastFeedbackTime';

  useEffect(() => {
    if (isOpen) {
      if (submissionStatus === 'idle' || submissionStatus === 'success') {
        setFeedbackText('');
        setLocalError(null);
      }
      
      const lastFeedbackTime = localStorage.getItem(FEEDBACK_COOLDOWN_STORAGE_KEY);
      if (lastFeedbackTime) {
        const timeSinceLastFeedback = (Date.now() - parseInt(lastFeedbackTime, 10)) / 1000;
        if (timeSinceLastFeedback < FEEDBACK_COOLDOWN_SECONDS) {
          setIsCoolingDown(true);
          setCooldownTimeLeft(Math.ceil(FEEDBACK_COOLDOWN_SECONDS - timeSinceLastFeedback));
        } else {
          setIsCoolingDown(false);
          setCooldownTimeLeft(0);
        }
      } else {
        setIsCoolingDown(false);
        setCooldownTimeLeft(0);
      }
    }
  }, [isOpen, submissionStatus]);

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
  
  const handleInternalClose = () => {
    setLocalError(null); 
    onClose();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCoolingDown) {
      setLocalError(`โปรดรออีก ${Math.ceil(cooldownTimeLeft / 60)} นาทีก่อนส่งความคิดเห็นอีกครั้ง`);
      return;
    }
    if (!feedbackText.trim()) {
      setLocalError('กรุณาใส่ความคิดเห็นของคุณ');
      return;
    }
    setLocalError(null); 

    const success = await onSubmit(feedbackText);
    if (success) {
      setFeedbackText(''); 
      localStorage.setItem(FEEDBACK_COOLDOWN_STORAGE_KEY, Date.now().toString());
      setIsCoolingDown(true);
      setCooldownTimeLeft(FEEDBACK_COOLDOWN_SECONDS);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleInternalClose} title="💬 ส่งความคิดเห็นถึงเรา">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="feedbackText" className="sr-only">
            ความคิดเห็นของคุณ
          </label>
          <textarea
            id="feedbackText"
            value={feedbackText}
            onChange={(e) => {
              setFeedbackText(e.target.value);
              if (localError) setLocalError(null); 
            }}
            rows={5}
            className={`w-full p-3 bg-white dark:bg-dark-inputBg border rounded-[10px] text-neutral-dark dark:text-dark-text font-normal focus:outline-none 
                        ${localError || (submissionStatus === 'error' && submissionMessage) 
                            ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-500 focus:ring-opacity-70 dark:focus:ring-red-400 dark:focus:ring-opacity-70' 
                            : 'border-[#CCCCCC] dark:border-dark-border focus:border-primary dark:focus:border-dark-primary-DEFAULT focus:ring-2 focus:ring-primary focus:ring-opacity-70 dark:focus:ring-dark-primary-DEFAULT dark:focus:ring-opacity-70'}`}
            placeholder={isCoolingDown ? `รออีก ${Math.ceil(cooldownTimeLeft/60)} นาที...` : "เราอยากรู้ว่าคุณคิดอย่างไร..."}
            aria-describedby="feedback-form-error"
            aria-invalid={!!localError || (submissionStatus === 'error' && !!submissionMessage)}
            disabled={submissionStatus === 'submitting' || isCoolingDown}
          />
          {(localError || (submissionStatus === 'error' && submissionMessage)) && (
            <p id="feedback-form-error" className="text-red-500 dark:text-red-400 text-xs mt-1 font-normal">
              {localError || submissionMessage}
            </p>
          )}
        </div>
        <Button
          type="submit"
          variant="outline"
          colorScheme="neutral"
          className="w-full"
          disabled={submissionStatus === 'submitting' || isCoolingDown}
        >
          {submissionStatus === 'submitting' ? 'กำลังส่ง...' : (isCoolingDown ? `รอ (${Math.ceil(cooldownTimeLeft/60)} นาที)` : 'ส่งความคิดเห็น')}
        </Button>
      </form>
    </Modal>
  );
};
