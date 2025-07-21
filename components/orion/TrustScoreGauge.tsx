
import React from 'react';
import { motion } from 'framer-motion';

interface TrustScoreGaugeProps {
  score: number;
  emoji: string;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const TrustScoreGauge: React.FC<TrustScoreGaugeProps> = ({ score, emoji }) => {
  const scorePercentage = Math.max(0, Math.min(score, 100)) / 100;
  const strokeDashoffset = CIRCUMFERENCE * (1 - scorePercentage);

  const getScoreColor = (s: number) => {
    if (s < 40) return 'var(--error-red)';
    if (s < 70) return 'var(--accent-peach)';
    return 'var(--success-green)';
  };

  const color = getScoreColor(score);

  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="transparent"
          stroke="var(--neutral-light)"
          strokeWidth="10"
        />
        {/* Foreground progress arc */}
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="transparent"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" as const }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-sans text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="font-sans text-xs text-neutral-medium -mt-1">/ 100</span>
        <span className="text-2xl mt-1">{emoji}</span>
      </div>
    </div>
  );
};
