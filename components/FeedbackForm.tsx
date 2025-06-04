
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

const FORM_ENDPOINT = "https://formspree.io/f/xvgaepzq";

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState(currentUserEmail || '');

  useEffect(() => {
    if (isOpen) {
      // Reset form fields when modal opens, especially if it was pre-filled
      setFeedbackText('');
      setEmail(currentUserEmail || '');
    }
  }, [isOpen, currentUserEmail]);

  const inputBaseStyle = "w-full p-3 bg-white dark:bg-dark-inputBg border rounded-[10px] text-neutral-dark dark:text-dark-text font-normal focus:outline-none";
  const inputFocusStyle = "border-[#CCCCCC] dark:border-dark-border focus:border-primary dark:focus:border-dark-primary-DEFAULT focus:ring-2 focus:ring-primary focus:ring-opacity-70 dark:focus:ring-dark-primary-DEFAULT dark:focus:ring-opacity-70";
  const textareaBaseStyle = `${inputBaseStyle} min-h-[100px]`;

  // Formspree handles success/error messages by redirecting or showing its own UI.
  // The modal will typically be closed by the user after submission or Formspree redirection.

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💬 ส่งความคิดเห็นถึงเรา">
      <form action={FORM_ENDPOINT} method="POST" className="space-y-4">
        <div>
          <label htmlFor="feedbackEmail" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
            อีเมลของคุณ (สำหรับติดต่อกลับ ถ้าต้องการ):
          </label>
          <input
            type="email"
            name="email"
            id="feedbackEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputBaseStyle} ${inputFocusStyle} font-serif`}
            placeholder="your.email@example.com"
          />
        </div>
        <div>
          <label htmlFor="feedbackText" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
            ความคิดเห็นของคุณ <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <textarea
            id="feedbackText"
            name="feedbackMessage" // Name attribute for Formspree
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={5}
            className={`${textareaBaseStyle} ${inputFocusStyle} font-serif`}
            placeholder="เราอยากรู้ว่าคุณคิดอย่างไร..."
            required
            aria-required="true"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          colorScheme="neutral"
          className="w-full"
        >
          ส่งความคิดเห็น
        </Button>
      </form>
    </Modal>
  );
};
