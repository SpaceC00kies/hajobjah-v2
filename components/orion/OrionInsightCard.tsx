"use client";
import React from 'react';
import type { OrionInsightData } from '../../types/types';
import { TrustScoreGauge } from './TrustScoreGauge';
import { ThreatLevelBadge } from './ThreatLevelBadge';
import { IntelItem } from './IntelItem';
import { motion } from 'framer-motion';

interface OrionInsightCardProps {
  payload: OrionInsightData;
}

const containerVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
      when: "beforeChildren" as const,
      staggerChildren: 0.1,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export const OrionInsightCard: React.FC<OrionInsightCardProps> = ({ payload }) => {
  return (
    <motion.div
      className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-neutral-DEFAULT/50"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div 
        className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pb-4 border-b border-neutral-DEFAULT/50"
        variants={sectionVariants}
      >
        <TrustScoreGauge score={payload.trust_score} emoji={payload.emoji} />
        <div className="flex-1 text-center sm:text-left">
          <ThreatLevelBadge threatLevel={payload.threat_level} />
          <p className="font-sans text-neutral-dark mt-2 text-sm sm:text-base">{payload.executive_summary}</p>
        </div>
      </motion.div>

      {/* Key Intel Section */}
      <motion.div className="mt-4" variants={sectionVariants}>
        <h4 className="font-sans font-semibold text-neutral-dark text-sm mb-2">KEY INTEL</h4>
        <ul className="space-y-1.5 pl-1">
          {payload.key_intel.map((intel, index) => (
            <IntelItem key={index} intel={intel} />
          ))}
        </ul>
      </motion.div>
      
      {/* Recommended Action Section */}
      <motion.div className="mt-4 pt-4 border-t border-neutral-DEFAULT/50" variants={sectionVariants}>
        <h4 className="font-sans font-semibold text-neutral-dark text-sm mb-2">RECOMMENDED ACTION</h4>
        <div className="bg-primary-light p-3 rounded-md">
            <p className="font-sans text-primary-dark font-medium text-sm">{payload.recommended_action}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};