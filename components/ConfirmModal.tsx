
import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void; // Called on cancel or close
  onConfirm: () => void; // Called on confirm
  title: string;
  message: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [animationState, setAnimationState] = useState<'closed' | 'open'>('closed');

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      requestAnimationFrame(() => {
        setAnimationState('open');
      });
    } else if (isMounted && !isOpen) {
      setAnimationState('closed');
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMounted]);

  if (!isMounted) {
    return null;
  }

  const backdropBaseClasses = "fixed inset-0 bg-neutral-dark dark:bg-black backdrop-blur-md transition-opacity duration-300 ease-out";
  const backdropOpenClasses = "bg-opacity-60 dark:bg-opacity-80 opacity-100";
  const backdropClosedClasses = "bg-opacity-0 dark:bg-opacity-0 opacity-0";

  const contentBaseClasses = "bg-white dark:bg-dark-cardBg px-6 pt-6 pb-12 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-out max-h-[90vh] overflow-y-auto";
  const contentOpenClasses = "opacity-100 scale-100";
  const contentClosedClasses = "opacity-0 scale-95";

  const handleActualConfirm = () => {
    onConfirm();
    // onClose(); // No need to call onClose here, parent's state change will handle it.
                 // Confirming should also close the modal, handled by parent logic that onConfirm triggers.
  };
  
  const handleActualClose = () => {
    onClose(); // This will trigger the parent's isOpen state to false, initiating animation.
  };


  return (
    <div
      className={`${backdropBaseClasses} ${animationState === 'open' ? backdropOpenClasses : backdropClosedClasses} flex justify-center items-center z-50 p-4`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
    >
      <div className={`${contentBaseClasses} ${animationState === 'open' ? contentOpenClasses : contentClosedClasses}`}>
        <h2 id="confirm-modal-title" className="text-xl font-semibold text-neutral-dark dark:text-dark-text mb-4">{title}</h2>
        <p id="confirm-modal-message" className="text-neutral-dark dark:text-dark-textMuted mb-6 font-normal">{message}</p>
        <div className="flex justify-end gap-3">
          <Button onClick={handleActualClose} variant="outline" colorScheme="neutral" size="md">
            ยกเลิก
          </Button>
          <Button 
            onClick={handleActualConfirm} 
            size="md"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-opacity-50 transition-colors duration-150 ease-in-out"
          >
            <span className="flex items-center justify-center gap-1.5">
              <span>🗑️</span>
              <span>ยืนยันการลบ</span>
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};
