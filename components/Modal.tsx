
import React, { useState, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [animationState, setAnimationState] = useState<'closed' | 'open'>('closed');

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Request animation frame to ensure initial classes are applied before transition starts
      requestAnimationFrame(() => {
        setAnimationState('open');
      });
    } else if (isMounted && !isOpen) {
      // Start exit animation
      setAnimationState('closed');
      // Wait for animation to finish before unmounting
      const timer = setTimeout(() => {
        setIsMounted(false);
        // Ensure onClose (which might set parent's isOpen to false) is called after unmount state is set,
        // though parent likely already set isOpen to false to trigger this.
        // The primary role of onClose here is for any cleanup in parent if needed beyond visibility.
      }, 300); // Must match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMounted]);

  if (!isMounted) {
    return null;
  }

  const backdropBaseClasses = "fixed inset-0 bg-neutral-dark dark:bg-black backdrop-blur-sm transition-opacity duration-300 ease-out";
  const backdropOpenClasses = "bg-opacity-50 dark:bg-opacity-70 opacity-100";
  const backdropClosedClasses = "bg-opacity-0 dark:bg-opacity-0 opacity-0";

  const contentBaseClasses = "bg-white dark:bg-dark-cardBg px-6 pt-6 pb-24 rounded-lg shadow-xl w-full max-w-lg transform transition-all duration-300 ease-out max-h-[90vh] overflow-y-auto";
  const contentOpenClasses = "opacity-100 scale-100";
  const contentClosedClasses = "opacity-0 scale-95";

  return (
    <div
      className={`${backdropBaseClasses} ${animationState === 'open' ? backdropOpenClasses : backdropClosedClasses} flex justify-center items-center z-50 p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className={`${contentBaseClasses} ${animationState === 'open' ? contentOpenClasses : contentClosedClasses}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 id={`modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-2xl font-sans font-semibold text-neutral-dark dark:text-dark-text">{title}</h2>
          <button
            onClick={onClose} // This triggers parent's isOpen to false, then useEffect handles animation
            className="text-neutral-dark dark:text-dark-textMuted hover:text-neutral-medium dark:hover:text-dark-text text-2xl font-bold font-sans"
            aria-label="ปิด"
          >
            &times;
          </button>
        </div>
        <div className="font-serif font-normal text-neutral-dark dark:text-dark-textMuted">{children}</div>
      </div>
    </div>
  );
};
