import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import type { User, Interaction, VouchReport, Interest } from '../types/types.ts';
import { useAuth } from './AuthContext.tsx';
import { subscribeToInteractionsService, subscribeToUserInterestsService } from '../services/interactionService.ts';
import { subscribeToVouchReportsService } from '../services/adminService.ts';

interface DataContextType {
  interactions: Interaction[];
  vouchReports: VouchReport[];
  userInterests: Interest[];
  userSavedPosts: string[];
  userSavedBlogPosts: string[];
  isLoading: boolean;
  optimisticallyToggleInterest: (targetId: string, targetType: 'job' | 'helperProfile') => void;
  optimisticallyToggleSavedPost: (postId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, setCurrentUser } = useAuth();
  
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(true);
  const [vouchReports, setVouchReports] = useState<VouchReport[]>([]);
  const [isLoadingVouchReports, setIsLoadingVouchReports] = useState(true);
  const [userInterests, setUserInterests] = useState<Interest[]>([]);
  const userSavedPosts = useMemo(() => currentUser?.savedWebboardPosts || [], [currentUser]);
  const userSavedBlogPosts = useMemo(() => currentUser?.savedBlogPosts || [], [currentUser]);

  const isLoading = isLoadingInteractions || isLoadingVouchReports;

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
      unsubInterests = subscribeToUserInterestsService(currentUser.id, (data) => {
        setUserInterests(data);
      });
    } else {
      setUserInterests([]);
    }

    return () => {
      if (unsubInterests) unsubInterests();
    };
  }, [currentUser?.id]);
  
  const optimisticallyToggleInterest = useCallback((targetId: string, targetType: 'job' | 'helperProfile') => {
    if (!currentUser) return;
    
    setUserInterests(prev => {
      const existingIndex = prev.findIndex(i => i.targetId === targetId && i.userId === currentUser.id);
      
      if (existingIndex >= 0) {
        // Remove the interest
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        // Add the interest
        const newInterest: Interest = {
          id: `temp-${Date.now()}`,
          userId: currentUser.id,
          targetId,
          targetType,
          targetOwnerId: '',
          createdAt: new Date().toISOString(),
        };
        return [...prev, newInterest];
      }
    });
  }, [currentUser]);

  const optimisticallyToggleSavedPost = useCallback((postId: string) => {
    if (!currentUser) return;
    
    // Update the current user's savedWebboardPosts
    setCurrentUser(prev => {
      if (!prev) return prev;
      const savedPosts = prev.savedWebboardPosts || [];
      const newSavedPosts = savedPosts.includes(postId)
        ? savedPosts.filter(id => id !== postId)
        : [...savedPosts, postId];
      
      return { ...prev, savedWebboardPosts: newSavedPosts };
    });
  }, [setCurrentUser, currentUser]);


  const value = useMemo(() => ({
    interactions,
    vouchReports,
    userInterests,
    userSavedPosts,
    userSavedBlogPosts,
    isLoading,
    optimisticallyToggleInterest,
    optimisticallyToggleSavedPost,
  }), [
    interactions,
    vouchReports,
    userInterests,
    userSavedPosts,
    userSavedBlogPosts,
    isLoading,
    optimisticallyToggleInterest,
    optimisticallyToggleSavedPost,
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