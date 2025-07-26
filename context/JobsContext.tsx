import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { Job } from '../types/types.ts';
import { subscribeToAllJobsService } from '../services/jobService.ts';

interface JobsContextType {
  allJobsForAdmin: Job[];
}

export const JobsContext = createContext<JobsContextType | undefined>(undefined);

export const JobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allJobsForAdmin, setAllJobsForAdmin] = useState<Job[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToAllJobsService(setAllJobsForAdmin);
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    allJobsForAdmin,
  }), [allJobsForAdmin]);

  return (
    <JobsContext.Provider value={value}>
      {children}
    </JobsContext.Provider>
  );
};