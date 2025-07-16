
import React from 'react';
import type { PlatformVitals as PlatformVitalsType } from '../../../types/types';
import { StatCard } from './StatCard';

interface PlatformVitalsProps {
  vitals?: PlatformVitalsType;
  isLoading: boolean;
}

const Icons = {
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197" /></svg>,
  Jobs: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Helpers: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Reports: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>,
};


export const PlatformVitals: React.FC<PlatformVitalsProps> = ({ vitals, isLoading }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard icon={<Icons.Users />} title="New Users (24h)" value={vitals?.newUsers24h ?? 0} isLoading={isLoading} />
      <StatCard icon={<Icons.Jobs />} title="Active Jobs" value={vitals?.activeJobs ?? 0} isLoading={isLoading} />
      <StatCard icon={<Icons.Helpers />} title="Active Helpers" value={vitals?.activeHelpers ?? 0} isLoading={isLoading} />
      <StatCard icon={<Icons.Reports />} title="Pending Reports" value={vitals?.pendingReports ?? 0} isLoading={isLoading} />
    </div>
  );
};
