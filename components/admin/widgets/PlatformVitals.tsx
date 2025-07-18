import React from 'react';
import type { PlatformVitals as PlatformVitalsType } from '../../../types/types';
import { StatCard } from './StatCard';

interface PlatformVitalsProps {
  vitals?: PlatformVitalsType;
  isLoading: boolean;
}

const Icons = {
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>,
  Jobs: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.84 5.25a.75.75 0 01-1.08.02L6.02 2.25H4.5a.75.75 0 00-.75.75v10.5a.75.75 0 00.75.75h1.52l3.74 3.02a.75.75 0 01-.02 1.08l-.89.89a.75.75 0 01-1.06 0l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0l.89.89zm3.515 1.818a.75.75 0 01.375 1.035l-1.5 2.25a.75.75 0 01-1.25-.833l1.5-2.25a.75.75 0 01.875-.192zM19.5 12c0 .77-.28 1.47-.75 2.025V9.975c.47.555.75 1.255.75 2.025zM17.25 12c0 .385-.098.75-.25 1.062V10.938c.152.312.25.677.25 1.062z" /></svg>,
  Helpers: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-1.063c.24-.162.24-.511 0-.673-1.68-1.147-3.66-1.762-5.736-1.762-2.077 0-4.057.615-5.736 1.762-.24.162-.24.511 0 .673A9.337 9.337 0 0012 19.5a9.38 9.38 0 00-2.625-.372M15 12a3 3 0 11-6 0 3 3 0 016 0zM12 15a6 6 0 100-12 6 6 0 000 12z" /></svg>,
  Reports: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>,
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