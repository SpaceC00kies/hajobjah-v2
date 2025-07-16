
import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig.ts';
import type { User } from '../types/types.ts';
import { onAuthChangeService } from '../services/authService.ts';
import { convertTimestamps } from '../services/serviceUtils';

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
    let userSnapshotUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthChangeService((user) => {
      // If the user logs out, clear everything and stop listening.
      if (!user) {
        if (userSnapshotUnsubscribe) {
          userSnapshotUnsubscribe();
          userSnapshotUnsubscribe = null;
        }
        setCurrentUser(null);
        setIsLoadingAuth(false);
        return;
      }

      // If we are already listening to this user's doc, do nothing.
      if (currentUser?.id === user.uid && userSnapshotUnsubscribe) {
        setIsLoadingAuth(false);
        return;
      }
      
      // If there's a listener for a different user, unsubscribe first.
      if (userSnapshotUnsubscribe) {
        userSnapshotUnsubscribe();
      }
      
      // Set up a new real-time listener for the logged-in user's document.
      const userDocRef = doc(db, 'users', user.uid);
      userSnapshotUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          // Update the currentUser state with the latest data from Firestore.
          const freshUserData = {
            id: docSnap.id,
            ...convertTimestamps(docSnap.data()),
          } as User;
          setCurrentUser(freshUserData);
        } else {
          // This case is unlikely if auth succeeded, but good to handle.
          setCurrentUser(null);
        }
        setIsLoadingAuth(false);
      }, (error) => {
        console.error("Error listening to user document:", error);
        setCurrentUser(null);
        setIsLoadingAuth(false);
      });
    });

    // Cleanup both listeners on component unmount.
    return () => {
      authUnsubscribe();
      if (userSnapshotUnsubscribe) {
        userSnapshotUnsubscribe();
      }
    };
  }, [currentUser?.id]); // Dependency on currentUser.id to re-evaluate if the user identity changes programmatically.


  // Memoize the context value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    currentUser,
    isLoadingAuth,
    setCurrentUser,
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
