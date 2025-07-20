import { useCallback } from 'react';
import {
  signUpWithEmailPasswordService,
  signInWithEmailPasswordService,
  signOutUserService,
  sendPasswordResetEmailService,
} from '../services/authService';
import type { RegistrationDataType } from '../types/types';
import { logFirebaseError } from '../firebase/logging';

export const useAuthActions = () => {
  const register = useCallback(async (formData: RegistrationDataType) => {
    try {
      await signUpWithEmailPasswordService(formData);
      return true;
    } catch (error: any) {
      logFirebaseError('useAuthActions.register', error);
      return false;
    }
  }, []);

  const login = useCallback(async (loginIdentifier: string, passwordAttempt: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await signInWithEmailPasswordService(loginIdentifier, passwordAttempt);
      return { success: true };
    } catch (error: any) {
      logFirebaseError('useAuthActions.login', error);
      return { success: false, error: error.message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOutUserService();
    } catch (error: any) {
      logFirebaseError('useAuthActions.logout', error);
    }
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string): Promise<string | void> => {
    try {
      await sendPasswordResetEmailService(email);
    } catch (error: any) {
      logFirebaseError('useAuthActions.sendPasswordResetEmail', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred.');
    }
  }, []);

  return { register, login, logout, sendPasswordResetEmail };
};
