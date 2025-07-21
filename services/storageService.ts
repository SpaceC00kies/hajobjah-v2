/**
 * @fileoverview
 * This service module centralizes all interactions with Firebase Storage.
 * It provides reusable functions for uploading and deleting images, ensuring
 * consistent error handling and logic for storage operations across the app.
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadString,
} from '@firebase/storage';
import { storage } from '../firebaseConfig.ts';
import { logFirebaseError } from '../firebase/logging';

export const uploadImageService = async (path: string, fileOrBase64: File | string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    if (typeof fileOrBase64 === 'string') {
      await uploadString(storageRef, fileOrBase64, 'data_url');
    } else {
      await uploadBytes(storageRef, fileOrBase64);
    }
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    logFirebaseError("uploadImageService", error);
    throw error;
  }
};

export const deleteImageService = async (imageUrl?: string | null): Promise<void> => {
  if (!imageUrl) return;
  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error: any) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code !== 'storage/object-not-found') {
      logFirebaseError("deleteImageService", error);
      throw error;
    } else if (typeof error === 'object' && error !== null && !('code' in error)) {
      logFirebaseError("deleteImageService", error);
      throw error;
    }
  }
};