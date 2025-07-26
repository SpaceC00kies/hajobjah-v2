import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import type { User, Interaction, VouchReport, Interest } from '../types/types.ts';
import { useAuth } from './AuthContext.tsx';
import { useUsers } from '../hooks/useUsers.ts';
import { subscribeToInteractionsService, subscribeToUserInterestsService } from '../services/interactionService.ts';
import { subscribeToVouchReportsService } from '../services/adminService.ts';

interface DataContextType {
  users: User[];
  interactions: Interaction[];
  vouchReports: VouchReport[];
  userInterests: Interest[];
  userSavedPosts: string[];
  isLoadingData: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { users } = useUsers();

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [vouchReports, setVouchReports] = useState<VouchReport[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [userInterests, setUserInterests] = useState<Interest[]>([]);
  const userSavedPosts = useMemo(() => currentUser?.savedWebboardPosts || [], [currentUser]);

  useEffect(() => {
    setIsLoadingData(true);

    const initialLoad = async () => {
      // Any non-subscription initial loads can go here if needed in the future
      setIsLoadingData(false);
    };

    const unsubscribeInteractions = subscribeToInteractionsService(setInteractions);
    const unsubscribeVouchReports = subscribeToVouchReportsService(setVouchReports);

    initialLoad();

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
    users,
    interactions,
    vouchReports,
    userInterests,
    userSavedPosts,
    isLoadingData,
  }), [
    users,
    interactions,
    vouchReports,
    userInterests,
    userSavedPosts,
    isLoadingData,
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