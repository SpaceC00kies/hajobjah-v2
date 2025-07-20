"use client";
import React from 'react';
import { motion } from 'framer-motion';
import type { VouchReport, User } from '../../../types/types';
import { Button } from '../../Button';

interface ActionCenterProps {
  pendingReports: VouchReport[];
  onSelectReport: (report: VouchReport) => void;
  getAuthorDisplayName: (userId: string) => string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export const ActionCenter: React.FC<ActionCenterProps> = ({ pendingReports, onSelectReport, getAuthorDisplayName }) => {
  return (
    <div className="action-center">
      <h3 className="action-center-header">Action Center</h3>
      <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="visible">
        {pendingReports.length === 0 ? (
          <div className="action-empty">
            <div className="text-5xl mb-4" role="img" aria-label="Checkmark">✅</div>
            <p className="font-sans text-sm text-neutral-medium">No high-priority actions needed.</p>
          </div>
        ) : (
          pendingReports.map(report => (
            <motion.div 
              key={report.id} 
              variants={itemVariants} 
              className="p-3 bg-red-50 border-l-4 border-red-400 rounded-r-md flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-sm text-red-800">🚩 Pending Vouch Report</p>
                <p className="text-xs text-red-600">
                  By: @{getAuthorDisplayName(report.reporterId)}
                </p>
              </div>
              <Button onClick={() => onSelectReport(report)} size="sm" colorScheme="accent">
                Review
              </Button>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
};