import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  addWebboardPostService,
  updateWebboardPostService,
  deleteWebboardPostService,
  addWebboardCommentService,
  updateWebboardCommentService,
  deleteWebboardCommentService,
  toggleWebboardPostLikeService
} from '../services/webboardService';
import { getUserDocument } from '../services/userService';
import { containsBlacklistedWords } from '../utils/validation';
import { logFirebaseError } from '../firebase/logging';
import type { User, WebboardCategory, WebboardPost } from '../types/types';

export const useWebboard = () => {
  const { currentUser, setCurrentUser } = useAuth();
  const { allWebboardPostsForAdmin, webboardComments, users } = useData();

  const canEditOrDelete = useCallback((itemUserId: string, itemOwnerId?: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    if (currentUser.role === 'Moderator') {
        const itemAuthor = users.find(u => u.id === itemUserId);
        return itemAuthor?.role !== 'Admin';
    }
    return currentUser.id === itemUserId || currentUser.id === itemOwnerId;
  }, [currentUser, users]);
  
  const checkWebboardPostLimits = useCallback((user: User): { canPost: boolean; message?: string | null } => {
    // This is a placeholder as per the plan to move limiting logic server-side.
    // Client-side checks are now primarily for UI feedback.
    return { canPost: true, message: null };
  }, []);
  
  const checkWebboardCommentLimits = useCallback((user: User): { canPost: boolean; message?: string } => {
    // Placeholder for UI feedback.
    return { canPost: true };
  }, []);

  const addOrUpdateWebboardPost = useCallback(async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string): Promise<string | undefined> => {
    if (!currentUser) throw new Error("User not authenticated.");
    if (!postIdToUpdate) {
      const limitCheck = checkWebboardPostLimits(currentUser);
      if (!limitCheck.canPost) throw new Error(limitCheck.message || "Cannot post");
    }
    if (containsBlacklistedWords(postData.title) || containsBlacklistedWords(postData.body)) {
      throw new Error('เนื้อหาหรือหัวข้อมีคำที่ไม่เหมาะสม');
    }
    if (postData.body.length > 5000) throw new Error('เนื้อหากระทู้ต้องไม่เกิน 5,000 ตัวอักษร');

    try {
      let finalPostId = postIdToUpdate;
      if (postIdToUpdate) {
        const postToEdit = allWebboardPostsForAdmin.find(p => p.id === postIdToUpdate);
        if (!postToEdit || !canEditOrDelete(postToEdit.userId, postToEdit.ownerId)) throw new Error('ไม่พบโพสต์ หรือไม่มีสิทธิ์แก้ไข');
        await updateWebboardPostService(postIdToUpdate, postData);
      } else {
        finalPostId = await addWebboardPostService(postData, { userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, photo: currentUser.photo });
        const updatedUser = await getUserDocument(currentUser.id);
        if (updatedUser) {
          setCurrentUser(updatedUser);
        }
      }
      return finalPostId;
    } catch (error) {
      logFirebaseError("useWebboard.addOrUpdateWebboardPost", error);
      throw error;
    }
  }, [currentUser, setCurrentUser, allWebboardPostsForAdmin, canEditOrDelete, checkWebboardPostLimits]);
  
  const deleteWebboardPost = useCallback(async (postId: string) => {
    const postToDelete = allWebboardPostsForAdmin.find(p => p.id === postId);
    if (!postToDelete || !canEditOrDelete(postToDelete.userId, postToDelete.ownerId)) throw new Error('ไม่พบโพสต์ หรือไม่มีสิทธิ์ลบ');
    try {
      await deleteWebboardPostService(postId);
    } catch (error) {
      logFirebaseError("useWebboard.deleteWebboardPost", error);
      throw error;
    }
  }, [allWebboardPostsForAdmin, canEditOrDelete]);

  const toggleWebboardPostLike = useCallback(async (postId: string) => {
    if (!currentUser) throw new Error("User not authenticated.");
    try {
      await toggleWebboardPostLikeService(postId, currentUser.id);
    } catch (error) {
      logFirebaseError("useWebboard.toggleWebboardPostLike", error);
      throw error;
    }
  }, [currentUser]);
  
  const addWebboardComment = useCallback(async (postId: string, text: string) => {
    if (!currentUser) throw new Error("User not authenticated.");
    const limitCheck = checkWebboardCommentLimits(currentUser);
    if (!limitCheck.canPost) throw new Error(limitCheck.message || "Cannot comment");
    try {
      await addWebboardCommentService(postId, text, { userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, photo: currentUser.photo });
    } catch (error) {
      logFirebaseError("useWebboard.addWebboardComment", error);
      throw error;
    }
  }, [currentUser, checkWebboardCommentLimits]);

  const updateWebboardComment = useCallback(async (commentId: string, newText: string) => {
    const commentToUpdate = webboardComments.find(c => c.id === commentId);
    if (!commentToUpdate || !canEditOrDelete(commentToUpdate.userId, commentToUpdate.ownerId)) throw new Error('ไม่พบคอมเมนต์ หรือไม่มีสิทธิ์แก้ไข');
    try {
      await updateWebboardCommentService(commentId, newText);
    } catch (error) {
      logFirebaseError("useWebboard.updateWebboardComment", error);
      throw error;
    }
  }, [webboardComments, canEditOrDelete]);

  const deleteWebboardComment = useCallback(async (commentId: string) => {
    const commentToDelete = webboardComments.find(c => c.id === commentId);
    if (!commentToDelete || !canEditOrDelete(commentToDelete.userId, commentToDelete.ownerId)) throw new Error('ไม่พบคอมเมนต์ หรือไม่มีสิทธิ์ลบ');
    try {
      await deleteWebboardCommentService(commentId);
    } catch (error) {
      logFirebaseError("useWebboard.deleteWebboardComment", error);
      throw error;
    }
  }, [webboardComments, canEditOrDelete]);

  return {
    canEditOrDelete,
    checkWebboardPostLimits,
    checkWebboardCommentLimits,
    addOrUpdateWebboardPost,
    deleteWebboardPost,
    toggleWebboardPostLike,
    addWebboardComment,
    updateWebboardComment,
    deleteWebboardComment,
  };
};