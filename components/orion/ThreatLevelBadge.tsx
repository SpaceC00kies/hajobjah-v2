
import React from 'react';

type ThreatLevel = 'LOW' | 'GUARDED' | 'ELEVATED' | 'SEVERE' | 'CRITICAL' | string;

interface ThreatLevelBadgeProps {
  threatLevel: ThreatLevel;
}

const levelStyles: Record<ThreatLevel, { bg: string; text: string }> = {
  LOW: { bg: 'bg-green-100', text: 'text-green-800' },
  GUARDED: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  ELEVATED: { bg: 'bg-orange-100', text: 'text-orange-800' },
  SEVERE: { bg: 'bg-red-100', text: 'text-red-800' },
  CRITICAL: { bg: 'bg-red-200', text: 'text-red-900 font-bold' },
};

const defaultStyle = { bg: 'bg-gray-100', text: 'text-gray-800' };

export const ThreatLevelBadge: React.FC<ThreatLevelBadgeProps> = ({ threatLevel }) => {
  const styles = levelStyles[threatLevel] || defaultStyle;

  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-sans font-bold uppercase rounded-full tracking-wider ${styles.bg} ${styles.text}`}
    >
      THREAT LEVEL: {threatLevel}
    </span>
  );
};
