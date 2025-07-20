

import React from 'react';
import type { PlatformVitals as PlatformVitalsType } from '@/types/types';
import { StatCard } from './StatCard';

interface PlatformVitalsProps {
  vitals?: PlatformVitalsType;
  isLoading: boolean;
}

export const PlatformVitals: React.FC<PlatformVitalsProps> = ({ vitals, isLoading }) => {
  return (
    <div className="stats-grid">
      <StatCard 
        className="users"
        icon="👤" 
        label="New Users (24h)" 
        value={vitals?.newUsers24h} 
        isLoading={isLoading} 
      />
      <StatCard 
        className="jobs"
        icon="💼" 
        label="Active Jobs" 
        value={vitals?.activeJobs} 
        isLoading={isLoading} 
      />
      <StatCard 
        className="helpers"
        icon="🤝" 
        label="Active Helpers" 
        value={vitals?.activeHelpers} 
        isLoading={isLoading} 
      />
      <StatCard 
        className="reports"
        icon="📋" 
        label="Pending Reports" 
        value={vitals?.pendingReports} 
        isLoading={isLoading} 
      />
    </div>
  );
};