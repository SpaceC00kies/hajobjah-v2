import { useCallback } from 'react';
import {
  signUpWithEmailPasswordService,
  signInWithEmailPasswordService,
  signOutUserService,
  sendPasswordResetEmailService,
} from '../services/authService';
import type { RegistrationDataType, User } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging';

export const useAuthActions = () => {
  const register = useCallback(async (userData: RegistrationDataType): Promise<boolean> => {
    try {
      const user = await signUpWithEmailPasswordService(userData);
      return !!user;
    } catch (error) {
      logFirebaseError('useAuthActions.register', error);
      return false;
    }
  }, []);

  const login = useCallback(async (loginIdentifier: string, passwordAttempt: string): Promise<{ success: boolean, user: User | null, error?: string }> => {
    try {
      const user = await signInWithEmailPasswordService(loginIdentifier, passwordAttempt);
      return { success: true, user };
    } catch (error: any) {
      logFirebaseError('useAuthActions.login', error);
      return { success: false, user: null, error: error.message };
    }
  }, []);

  const logout = useCallback(async (): Promise<boolean> => {
    try {
      await signOutUserService();
      return true;
    } catch (error) {
      logFirebaseError('useAuthActions.logout', error);
      return false;
    }
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmailService(email);
    } catch (error: any) {
      logFirebaseError('useAuthActions.sendPasswordResetEmail', error);
      throw error;
    }
  }, []);

  return { register, login, logout, sendPasswordResetEmail };
};
