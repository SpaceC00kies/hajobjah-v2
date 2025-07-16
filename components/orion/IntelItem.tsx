
import React from 'react';
import { motion } from 'framer-motion';

interface IntelItemProps {
  intel: string;
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

export const IntelItem: React.FC<IntelItemProps> = ({ intel }) => {
  return (
    <motion.li 
      className="flex items-start text-sm font-sans text-neutral-dark"
      variants={itemVariants}
    >
      <span className="mr-2.5 mt-1 text-secondary-hover">●</span>
      <span>{intel}</span>
    </motion.li>
  );
};
