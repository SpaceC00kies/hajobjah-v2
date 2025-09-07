import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { JobApplication } from '../types/types.ts';
import { useAuth } from './AuthContext.tsx';
import { useJobs } from '../hooks/useJobs.ts';
import { subscribeToApplicationsForUserJobsService } from '../services/applicationService.ts';

interface ApplicationsContextType {
  applicationsForUserJobs: JobApplication[];
  isLoadingApplications: boolean;
}

export const ApplicationsContext = createContext<ApplicationsContextType | undefined>(undefined);

export const ApplicationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { allJobsForAdmin } = useJobs();
    const [applicationsForUserJobs, setApplicationsForUserJobs] = useState<JobApplication[]>([]);
    const [isLoadingApplications, setIsLoadingApplications] = useState(true);

    const userJobIds = useMemo(() => {
        if (!currentUser) return [];
        return allJobsForAdmin.filter(job => job.userId === currentUser.id).map(job => job.id);
    }, [currentUser, allJobsForAdmin]);

    useEffect(() => {
        if (!currentUser) {
            setApplicationsForUserJobs([]);
            setIsLoadingApplications(false);
            return;
        }
        
        setIsLoadingApplications(true);
        const unsubscribe = subscribeToApplicationsForUserJobsService(
            [currentUser.id], // The service queries by jobOwnerId, which is the currentUser.id
            (apps) => {
                setApplicationsForUserJobs(apps);
                setIsLoadingApplications(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    const value = useMemo(() => ({
        applicationsForUserJobs,
        isLoadingApplications,
    }), [applicationsForUserJobs, isLoadingApplications]);

    return (
        <ApplicationsContext.Provider value={value}>
            {children}
        </ApplicationsContext.Provider>
    );
};
