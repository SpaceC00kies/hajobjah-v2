import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { HelperProfile } from '../types/types.ts';
import { subscribeToAllHelperProfilesService } from '../services/helperProfileService.ts';

interface HelpersContextType {
  allHelperProfilesForAdmin: HelperProfile[];
  isLoadingHelpers: boolean;
}

export const HelpersContext = createContext<HelpersContextType | undefined>(undefined);

export const HelpersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allHelperProfilesForAdmin, setAllHelperProfilesForAdmin] = useState<HelperProfile[]>([]);
  const [isLoadingHelpers, setIsLoadingHelpers] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAllHelperProfilesService((profiles) => {
        setAllHelperProfilesForAdmin(profiles);
        setIsLoadingHelpers(false);
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    allHelperProfilesForAdmin,
    isLoadingHelpers,
  }), [allHelperProfilesForAdmin, isLoadingHelpers]);

  return (
    <HelpersContext.Provider value={value}>
      {children}
    </HelpersContext.Provider>
  );
};
