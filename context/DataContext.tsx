import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import type { User, Interaction, VouchReport, Interest } from '../types/types.ts';
import { useAuth } from './AuthContext.tsx';
import { subscribeToInteractionsService, subscribeToUserInterestsService } from '../services/interactionService.ts';
import { subscribeToVouchReportsService } from '../services/adminService.ts';

interface DataContextType {
  interactions: Interaction[];
  vouchReports: VouchReport[];
  userInterests: Interest[];
  userSavedPosts: string[];
  isLoadingInteractions: boolean;
  isLoadingVouchReports: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(true);
  const [vouchReports, setVouchReports] = useState<VouchReport[]>([]);
  const [isLoadingVouchReports, setIsLoadingVouchReports] = useState(true);
  const [userInterests, setUserInterests] = useState<Interest[]>([]);
  const userSavedPosts = useMemo(() => currentUser?.savedWebboardPosts || [], [currentUser]);

  useEffect(() => {
    const unsubscribeInteractions = subscribeToInteractionsService((data) => {
      setInteractions(data);
      setIsLoadingInteractions(false);
    });
    const unsubscribeVouchReports = subscribeToVouchReportsService((data) => {
      setVouchReports(data);
      setIsLoadingVouchReports(false);
    });
    
    return () => {
      unsubscribeInteractions();
      unsubscribeVouchReports();
    };
  }, []);

  useEffect(() => {
    let unsubInterests: (() => void) | undefined;

    if (currentUser?.id) {
      unsubInterests = subscribeToUserInterestsService(currentUser.id, setUserInterests);
    } else {
      setUserInterests([]);
    }

    return () => {
      if (unsubInterests) unsubInterests();
    };
  }, [currentUser?.id]);

  const value = useMemo(() => ({
    interactions,
    vouchReports,
    userInterests,
    userSavedPosts,
    isLoadingInteractions,
    isLoadingVouchReports,
  }), [
    interactions,
    vouchReports,
    userInterests,
    userSavedPosts,
    isLoadingInteractions,
    isLoadingVouchReports,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
