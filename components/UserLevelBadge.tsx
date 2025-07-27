import React from 'react';
import type { UserLevel } from '../types/types.ts'; // UserLevel is now generic for all badge types

interface UserLevelBadgeProps {
  level: UserLevel;
  size?: 'sm' | 'md';
}

export const UserLevelBadge: React.FC<UserLevelBadgeProps> = ({ level, size = 'sm' }) => {
  let sizeClasses = '';
  if (size === 'sm') {
    sizeClasses = 'text-xs px-2 py-0.5';
  } else { // md
    sizeClasses = 'text-sm px-2.5 py-0.5';
  }

  const colorClass = level.colorClass.trim();
  const textColorClass = level.textColorClass ? level.textColorClass.trim() : '';

  // Split name into emoji and text for responsive display
  const nameParts = level.name.split(' ');
  const emoji = nameParts[0];
  const text = nameParts.slice(1).join(' ');

  return (
    <span
      className={`${sizeClasses} font-sans font-normal rounded-full inline-flex items-center gap-1 ml-2.5 ${colorClass} ${textColorClass}`}
      aria-label={`Badge: ${level.name}`}
      title={level.name}
    >
      <span>{emoji}</span>
      <span className="hidden sm:inline">{text}</span>
    </span>
  );
};
