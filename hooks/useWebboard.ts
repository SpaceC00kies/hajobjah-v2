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
import type { User, WebboardCategory, WebboardPost } from '../types/types.ts';

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
        if (updatedUser) setCurrentUser(updatedUser);
      }
      return finalPostId;
    } catch (error: any) {
      logFirebaseError("useWebboard.addOrUpdatePost", error);
      throw error;
    }
  }, [currentUser, allWebboardPostsForAdmin, canEditOrDelete, checkWebboardPostLimits, setCurrentUser]);
  
  const addWebboardComment = useCallback(async (postId: string, text: string) => {
    if (!currentUser) throw new Error("User not authenticated.");
    if (containsBlacklistedWords(text)) throw new Error('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม');
    try {
      await addWebboardCommentService(postId, text, { userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, photo: currentUser.photo });
      const updatedUser = await getUserDocument(currentUser.id);
      if (updatedUser) setCurrentUser(updatedUser);
    } catch (error: any) {
      logFirebaseError("useWebboard.addComment", error);
      throw error;
    }
  }, [currentUser, setCurrentUser]);

  const updateWebboardComment = useCallback(async (commentId: string, newText: string) => {
    if (!currentUser) throw new Error("User not authenticated.");
    if (containsBlacklistedWords(newText)) throw new Error('เนื้อหาคอมเมนต์มีคำที่ไม่เหมาะสม');
    const comment = webboardComments.find(c => c.id === commentId);
    if (!comment || !canEditOrDelete(comment.userId, comment.ownerId)) throw new Error("คุณไม่มีสิทธิ์แก้ไขคอมเมนต์นี้");
    try {
      await updateWebboardCommentService(commentId, newText);
    } catch (error: any) {
      logFirebaseError("useWebboard.updateComment", error);
      throw error;
    }
  }, [currentUser, webboardComments, canEditOrDelete]);
  
  const deleteWebboardPost = useCallback(async (postId: string) => {
    const post = allWebboardPostsForAdmin.find(p => p.id === postId);
    if (!post || !canEditOrDelete(post.userId, post.ownerId)) throw new Error("คุณไม่มีสิทธิ์ลบโพสต์นี้");
    try {
      await deleteWebboardPostService(postId);
    } catch (error: any) {
      logFirebaseError("useWebboard.deletePost", error);
      throw error;
    }
  }, [canEditOrDelete, allWebboardPostsForAdmin]);
  
  const deleteWebboardComment = useCallback(async (commentId: string) => {
    const comment = webboardComments.find(c => c.id === commentId);
    if (!comment || !canEditOrDelete(comment.userId, comment.ownerId)) throw new Error("คุณไม่มีสิทธิ์ลบคอมเมนต์นี้");
    try {
      await deleteWebboardCommentService(commentId);
    } catch (error: any) {
      logFirebaseError("useWebboard.deleteComment", error);
      throw error;
    }
  }, [canEditOrDelete, webboardComments]);

  const toggleWebboardPostLike = useCallback(async (postId: string) => {
    if (!currentUser) throw new Error("User not authenticated.");
    try {
      await toggleWebboardPostLikeService(postId, currentUser.id);
    } catch (error: any) {
      logFirebaseError("useWebboard.toggleLike", error);
      throw error;
    }
  }, [currentUser]);

  return {
    addOrUpdateWebboardPost,
    addWebboardComment,
    updateWebboardComment,
    deleteWebboardPost,
    deleteWebboardComment,
    toggleWebboardPostLike,
    checkWebboardPostLimits,
    checkWebboardCommentLimits,
    canEditOrDelete
  };
};