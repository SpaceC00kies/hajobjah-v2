
import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { Job } from '../types/types.ts';
import { subscribeToAllJobsService } from '../services/jobService.ts';

interface JobsContextType {
  allJobsForAdmin: Job[];
  isLoadingJobs: boolean;
}

export const JobsContext = createContext<JobsContextType | undefined>(undefined);

export const JobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allJobsForAdmin, setAllJobsForAdmin] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAllJobsService((jobs) => {
        setAllJobsForAdmin(jobs);
        setIsLoadingJobs(false);
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    allJobsForAdmin,
    isLoadingJobs
  }), [allJobsForAdmin, isLoadingJobs]);

  return (
    <JobsContext.Provider value={value}>
      {children}
    </JobsContext.Provider>
  );
};
