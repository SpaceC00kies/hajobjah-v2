
import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  isLoading: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, title, value, isLoading }) => {
  return (
    <motion.div
      className="bg-white p-4 rounded-lg shadow-md border border-neutral-DEFAULT/30 flex items-center space-x-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-3 bg-primary-light rounded-full text-primary-dark">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-medium">{title}</p>
        {isLoading ? (
          <div className="w-12 h-6 bg-neutral-light rounded-md animate-pulse mt-1"></div>
        ) : (
          <p className="text-2xl font-bold text-neutral-dark">{value}</p>
        )}
      </div>
    </motion.div>
  );
};
