
import React from 'react';
import type { UserLevel } from '../types'; // UserLevel is now generic for all badge types

interface UserLevelBadgeProps {
  level: UserLevel; // Changed prop name to 'level' but it accepts the generic UserLevel structure
  size?: 'sm' | 'md';
}

export const UserLevelBadge: React.FC<UserLevelBadgeProps> = ({ level, size = 'sm' }) => {
  let sizeClasses = '';
  if (size === 'sm') {
    sizeClasses = 'text-xs px-2 py-0.5';
  } else { // md
    sizeClasses = 'text-sm px-2.5 py-0.5'; // Reduced vertical padding for md
  }

  return (
    <span
      className={`${sizeClasses} font-sans font-normal rounded-full inline-block ml-2.5 ${level.colorClass} ${level.textColorClass || ''}`}
      aria-label={`Badge: ${level.name}`} // More generic aria-label
    >
      {level.name}
    </span>
  );
};