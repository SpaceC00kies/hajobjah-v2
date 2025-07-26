import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { HelperProfile } from '../types/types.ts';
import { subscribeToAllHelperProfilesService } from '../services/helperProfileService.ts';

interface HelpersContextType {
  allHelperProfilesForAdmin: HelperProfile[];
}

export const HelpersContext = createContext<HelpersContextType | undefined>(undefined);

export const HelpersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allHelperProfilesForAdmin, setAllHelperProfilesForAdmin] = useState<HelperProfile[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToAllHelperProfilesService(setAllHelperProfilesForAdmin);
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    allHelperProfilesForAdmin,
  }), [allHelperProfilesForAdmin]);

  return (
    <HelpersContext.Provider value={value}>
      {children}
    </HelpersContext.Provider>
  );
};