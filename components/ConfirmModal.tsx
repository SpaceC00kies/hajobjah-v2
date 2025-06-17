
import React, { useEffect } from 'react';
import { Button } from './Button';
import { motion, type Transition } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean; // Kept for clarity, though AnimatePresence handles mounting
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const backdropVariants = {
  open: { opacity: 1 },
  closed: { opacity: 0 },
};

const modalVariants = {
  open: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 } as Transition,
  },
  closed: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2, ease: "easeOut" } as Transition,
  },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const backdropBaseClasses = "fixed inset-0 bg-neutral-dark dark:bg-black backdrop-blur-md flex justify-center items-center z-50 p-4";
  const contentBaseClasses = "bg-white dark:bg-dark-cardBg px-6 pt-6 pb-8 sm:pb-12 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto";


  const handleActualConfirm = () => {
    onConfirm();
    // onClose will be called by the parent which changes isOpen, triggering AnimatePresence exit
  };
  
  return (
    <motion.div
      className={backdropBaseClasses}
      onClick={onClose}
      variants={backdropVariants}
      initial="closed"
      animate="open"
      exit="closed"
      transition={{ duration: 0.3, ease: "easeOut" }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
    >
      <motion.div 
        className={contentBaseClasses}
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
      >
        <h2 id="confirm-modal-title" className="text-xl font-semibold text-neutral-dark dark:text-dark-text mb-4">{title}</h2>
        <p id="confirm-modal-message" className="text-neutral-dark dark:text-dark-textMuted mb-6 font-normal">{message}</p>
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="outline" colorScheme="neutral" size="md">
            ยกเลิก
          </Button>
          <Button 
            onClick={handleActualConfirm} 
            size="md"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-opacity-50"
            // Removed transition classes from Button, as Framer Motion handles it on the Button component itself.
          >
            <span className="flex items-center justify-center gap-1.5">
              <span>🗑️</span>
              <span>ยืนยันการลบ</span>
            </span>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};
