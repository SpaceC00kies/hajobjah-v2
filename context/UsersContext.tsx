import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { User } from '../types/types.ts';
import { subscribeToUsersService } from '../services/userService.ts';

interface UsersContextType {
  users: User[];
}

export const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToUsersService(setUsers);
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    users,
  }), [users]);

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  );
};