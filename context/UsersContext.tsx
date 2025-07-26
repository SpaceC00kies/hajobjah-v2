
import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { User } from '../types/types.ts';
import { subscribeToUsersService } from '../services/userService.ts';

interface UsersContextType {
  users: User[];
  isLoadingUsers: boolean;
}

export const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToUsersService((users) => {
        setUsers(users);
        setIsLoadingUsers(false);
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    users,
    isLoadingUsers,
  }), [users, isLoadingUsers]);

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  );
};
