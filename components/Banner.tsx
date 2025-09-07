import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BannerProps {
  message: string;
  onClose: () => void;
  type?: 'success' | 'error';
}

const bannerVariants = {
  hidden: { opacity: 0, y: -100, scale: 0.9 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
    },
  },
  exit: { 
    opacity: 0, 
    y: -100, 
    scale: 0.9,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
};

const SuccessIcon = () => (
  <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);


export const Banner: React.FC<BannerProps> = ({ message, onClose, type = 'success' }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); 
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300';
  const textColor = isSuccess ? 'text-green-800' : 'text-red-800';
  const icon = isSuccess ? <SuccessIcon /> : <ErrorIcon />;

  return (
    <AnimatePresence>
      {message && (
        <div className="fixed top-0 left-0 right-0 flex justify-center z-50 p-4 pointer-events-none">
          <motion.div
            key="banner"
            variants={bannerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`pointer-events-auto w-auto max-w-[90%] px-4 py-3 rounded-lg shadow-lg border ${bgColor} backdrop-blur-sm`}
            role="alert"
          >
            <div className="flex items-center">
              {icon}
              <p className={`font-sans font-semibold text-sm ${textColor} flex-1`}>{message}</p>
              <button
                onClick={onClose}
                className={`ml-3 w-5 h-5 flex items-center justify-center rounded-full text-sm leading-none hover:bg-black/10 transition-colors ${textColor} flex-shrink-0`}
                aria-label="ปิดการแจ้งเตือน"
                type="button"
              >
                ×
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};