// src/components/FeedbackTest.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';

export const FeedbackTest: React.FC = () => {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedback) return;
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const id = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [feedback]);

  return (
    <div className="p-6 space-y-4">
      <Button variant="secondary" onClick={() => setFeedback({ type: 'success', message: '✅ Success!' })}>
        Show Success
      </Button>
      <Button variant="outline" onClick={() => setFeedback({ type: 'error', message: '❌ Error!' })}>
        Show Error
      </Button>

      <AnimatePresence>
        {feedback && (
          <motion.div
            ref={feedbackRef}
            key={feedback.message}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className={`p-4 rounded text-center text-sm font-medium ${
              feedback.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};