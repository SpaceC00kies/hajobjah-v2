
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-dark bg-opacity-50 dark:bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-dark-cardBg p-6 rounded-lg shadow-xl w-full max-w-lg transform transition-all">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-sans font-semibold text-neutral-dark dark:text-dark-text">{title}</h2>
          <button
            onClick={onClose}
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