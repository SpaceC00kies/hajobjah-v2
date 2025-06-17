
import React, { useEffect } from 'react';
import { motion, type Transition } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
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

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  // Effect to handle body scroll lock
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

  // isOpen prop is used by AnimatePresence in the parent to control mounting/unmounting
  // No internal isMounted or animationState needed here anymore

  // Base classes without Tailwind transitions for elements animated by Framer Motion
  const backdropBaseClasses = "fixed inset-0 bg-neutral-dark dark:bg-black backdrop-blur-sm flex justify-center items-center z-50 p-4";
  const contentBaseClasses = "bg-white dark:bg-dark-cardBg px-6 pt-6 pb-8 sm:pb-12 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"; // Increased pb for buttons

  return (
    <motion.div
      className={backdropBaseClasses}
      onClick={onClose} // Click on backdrop closes modal
      variants={backdropVariants}
      initial="closed"
      animate="open"
      exit="closed"
      transition={{ duration: 0.3, ease: "easeOut" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <motion.div
        className={contentBaseClasses}
        onClick={(e) => e.stopPropagation()} // Prevent modal close when clicking content
        variants={modalVariants}
        // initial, animate, exit are inherited from AnimatePresence context or defined here
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id={`modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-2xl font-sans font-semibold text-neutral-dark dark:text-dark-text">{title}</h2>
          <button
            onClick={onClose}
            className="text-neutral-dark dark:text-dark-textMuted hover:text-neutral-medium dark:hover:text-dark-text text-2xl font-bold font-sans p-1 -mr-1 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-DEFAULT dark:focus:ring-dark-border"
            aria-label="ปิด"
          >
            &times;
          </button>
        </div>
        <div className="font-serif font-normal text-neutral-dark dark:text-dark-textMuted">{children}</div>
      </motion.div>
    </motion.div>
  );
};
