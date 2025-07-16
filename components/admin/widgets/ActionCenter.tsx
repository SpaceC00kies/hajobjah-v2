
import React from 'react';
import { motion } from 'framer-motion';
import type { VouchReport, User } from '../../../types/types';
import { Button } from '../../Button';

interface ActionCenterProps {
  pendingReports: VouchReport[];
  newUsers: User[];
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

export const ActionCenter: React.FC<ActionCenterProps> = ({ pendingReports, newUsers, onSelectReport, getAuthorDisplayName }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-neutral-DEFAULT/30">
      <h3 className="font-sans font-semibold text-lg text-neutral-dark mb-3">Action Center</h3>
      <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="visible">
        {pendingReports.length === 0 && (
          <p className="text-sm text-neutral-medium p-4 text-center">No high-priority actions needed.</p>
        )}
        {pendingReports.map(report => (
          <motion.div key={report.id} variants={itemVariants} className="p-3 bg-red-50 border border-red-200 rounded-md flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm text-red-800">🚩 Pending Vouch Report</p>
              <p className="text-xs text-red-600">
                Reporter: @{getAuthorDisplayName(report.reporterId)}
              </p>
            </div>
            <Button onClick={() => onSelectReport(report)} size="sm" colorScheme="accent">
              Review
            </Button>
          </motion.div>
        ))}
         {/* Future items can be added here */}
      </motion.div>
    </div>
  );
};
