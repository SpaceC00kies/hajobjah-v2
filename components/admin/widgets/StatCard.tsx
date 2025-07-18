
import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value?: number | string;
  isLoading: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, isLoading, className }) => {
  return (
    <div className={`stat-card ${className || ''}`}>
      <div className="stat-icon">
        {icon}
      </div>
      {isLoading ? (
        <>
          <div className="h-10 w-20 bg-neutral-light rounded-md animate-pulse mb-2"></div>
          <div className="h-4 w-32 bg-neutral-light rounded-md animate-pulse"></div>
        </>
      ) : (
        <>
          <div className="stat-value">{value ?? 0}</div>
          <div className="stat-label">{label}</div>
        </>
      )}
    </div>
  );
};
