

import React, { useEffect } from 'react';
import { Button } from './Button.tsx';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: "easeIn" as const } },
};

const modalTransition = {
  type: "tween" as const,
  duration: 0.3,
  ease: [0.08, 0.82, 0.17, 1] as const // A more refined ease-out cubic bezier
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);
  
  const handleActualConfirm = () => {
    onConfirm();
    // Parent will typically close the modal by setting isOpen to false
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="confirm-modal-backdrop"
          className="fixed inset-0 bg-neutral-dark/70 backdrop-blur-sm flex justify-center items-center z-50 p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={modalTransition}
          onClick={onClose}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-message"
        >
          <motion.div
            key="confirm-modal-content"
            className="bg-white px-6 pt-6 pb-8 sm:pb-10 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={modalTransition}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-modal-title" className="text-xl font-sans font-semibold text-neutral-dark mb-4">{title}</h2>
            <p id="confirm-modal-message" className="font-serif text-base text-neutral-dark mb-6 whitespace-pre-wrap">{message}</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button onClick={onClose} variant="outline" colorScheme="neutral" size="md" className="w-full sm:w-auto">
                ยกเลิก
              </Button>
              <Button 
                onClick={handleActualConfirm} 
                size="md"
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold focus:ring-2 focus:ring-red-500/50 focus:ring-offset-1"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <span>🗑️</span>
                  <span>ยืนยัน</span>
                </span>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};