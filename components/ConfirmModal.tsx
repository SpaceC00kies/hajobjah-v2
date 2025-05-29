
import React from 'react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void; // Called on cancel or close
  onConfirm: () => void; // Called on confirm
  title: string;
  message: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-dark bg-opacity-60 dark:bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-modal-title" aria-describedby="confirm-modal-message">
      <div className="bg-white dark:bg-dark-cardBg p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all">
        <h2 id="confirm-modal-title" className="text-xl font-semibold text-neutral-dark dark:text-dark-text mb-4">{title}</h2>
        <p id="confirm-modal-message" className="text-neutral-dark dark:text-dark-textMuted mb-6 font-normal">{message}</p>
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="outline" colorScheme="neutral" size="md">
            ยกเลิก
          </Button>
          <Button 
            onClick={onConfirm} 
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