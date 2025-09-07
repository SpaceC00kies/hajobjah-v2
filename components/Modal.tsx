import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  description?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
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


export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  description,
  initialFocusRef 
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  // Use focus trap hook for proper focus management
  const modalRef = useFocusTrap({ 
    isActive: isOpen, 
    initialFocusRef: initialFocusRef || closeButtonRef,
    restoreFocus: true 
  }) as React.RefObject<HTMLDivElement>;

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scroll on mobile when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Generate unique IDs for ARIA attributes
  const titleId = `modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const descriptionId = description ? `modal-description-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined;

  const modalContent = (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          className="fixed inset-0 bg-neutral-dark/70 backdrop-blur-sm flex justify-center items-center p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9998,
            isolation: 'isolate'
          }}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={modalTransition}
          onClick={onClose} // Close on backdrop click
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <motion.div
            key="modal-content"
            ref={modalRef}
            className="bg-white px-6 pt-6 pb-8 sm:pb-12 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={modalTransition}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside content
          >
            <div className="flex justify-between items-center mb-2">
              <h2 id={titleId} className="text-2xl font-sans font-semibold text-primary-dark">{title}</h2>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="text-neutral-dark hover:text-neutral-medium text-2xl font-bold font-sans p-1 rounded-full hover:bg-neutral-light/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-medium focus-visible:ring-offset-1"
                aria-label="ปิดหน้าต่าง"
                type="button"
              >
                &times;
              </button>
            </div>
            {description && (
              <p id={descriptionId} className="text-sm font-serif text-neutral-dark mb-4 sr-only">
                {description}
              </p>
            )}
            <div className="font-serif font-normal text-neutral-dark">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render modal in a portal to ensure it's outside the normal document flow
  return createPortal(modalContent, document.body);
};