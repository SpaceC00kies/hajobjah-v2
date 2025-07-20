"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './Button.tsx';
import { Modal } from './Modal.tsx';

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

  // Formspree handles success/error messages by redirecting or showing its own UI.
  // The modal will typically be closed by the user after submission or Formspree redirection.

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💬 ส่งความคิดเห็นถึงเรา">
      <form action={FORM_ENDPOINT} method="POST" className="space-y-4">
        <div>
          <label htmlFor="feedbackEmail" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
            อีเมลของคุณ (สำหรับติดต่อกลับ ถ้าต้องการ):
          </label>
          <input
            type="email"
            name="email"
            id="feedbackEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="feedbackText" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
            ความคิดเห็นของคุณ <span className="text-red-500">*</span>
          </label>
          <textarea
            id="feedbackText"
            name="feedbackMessage" // Name attribute for Formspree
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={5}
            placeholder="เราอยากรู้ว่าคุณคิดอย่างไร..."
            required
            aria-required="true"
            className="w-full"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          colorScheme="neutral"
          size="md" // Standardized size
          className="w-full"
        >
          ส่งความคิดเห็น
        </Button>
      </form>
    </Modal>
  );
};
