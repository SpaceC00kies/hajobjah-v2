import { useContext } from 'react';
import { ApplicationsContext } from '../context/ApplicationsContext.tsx';

export const useApplications = () => {
  const context = useContext(ApplicationsContext);
  if (context === undefined) {
    throw new Error('useApplications must be used within an ApplicationsProvider');
  }
  return context;
};
