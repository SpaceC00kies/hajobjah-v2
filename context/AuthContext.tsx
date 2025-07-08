
import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import type { User } from '../types.ts';
import { onAuthChangeService } from '../services/authService.ts';

interface AuthContextType {
  currentUser: User | null;
  isLoadingAuth: boolean;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>; // Expose setter for internal updates
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // onAuthChangeService from our services now handles the logic.
    // It returns an unsubscribe function that will be called on cleanup.
    const unsubscribe = onAuthChangeService((user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  // This adheres to Principle 1 of our refactoring plan.
  const value = useMemo(() => ({
    currentUser,
    isLoadingAuth,
    setCurrentUser, // Pass setter down so App.tsx can update the context
  }), [currentUser, isLoadingAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
