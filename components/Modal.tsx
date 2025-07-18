import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
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


export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
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

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          className="fixed inset-0 bg-neutral-dark/70 backdrop-blur-sm flex justify-center items-center z-50 p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={modalTransition}
          onClick={onClose} // Close on backdrop click
          role="dialog"
          aria-modal="true"
          aria-labelledby={`modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
        >
          <motion.div
            key="modal-content"
            className="bg-white px-6 pt-6 pb-8 sm:pb-12 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit" 
            transition={modalTransition}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside content
          >
            <div className="flex justify-between items-center mb-4">
              <h2 id={`modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-2xl font-sans font-semibold text-primary-dark mb-4">{title}</h2>
              <button
                onClick={onClose}
                className="text-neutral-dark hover:text-neutral-medium text-2xl font-bold font-sans p-1 rounded-full hover:bg-neutral-light/50 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-DEFAULT/50 focus:ring-offset-1"
                aria-label="ปิด"
              >
                &times;
              </button>
            </div>
            <div className="font-serif font-normal text-neutral-dark">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};