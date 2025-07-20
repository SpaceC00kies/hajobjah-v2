import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  addOrUpdateBlogPostService,
  deleteBlogPostService,
  toggleBlogPostLikeService,
  addBlogCommentService,
  updateBlogCommentService,
  deleteBlogCommentService,
} from '../services/blogService';
import type { BlogPost, BlogComment } from '../types/types';
import { logFirebaseError } from '../firebase/logging';

type BlogPostFormData = Partial<Omit<BlogPost, 'id' | 'authorDisplayName' | 'authorPhotoURL' | 'createdAt' | 'updatedAt' | 'publishedAt'>> & { newCoverImageBase64?: string | null };

export const useBlog = () => {
  const { currentUser } = useAuth();

  const addOrUpdateBlogPost = useCallback(async (blogPostData: BlogPostFormData, existingPostId?: string): Promise<string> => {
    if (!currentUser || !(currentUser.role === 'Admin' || currentUser.role === 'Writer')) {
      throw new Error("Permission denied to create or update blog post.");
    }
    try {
      const { newCoverImageBase64, ...dataToSave } = blogPostData;
      const newPostId = await addOrUpdateBlogPostService(
        { ...blogPostData, id: existingPostId },
        { id: currentUser.id, publicDisplayName: currentUser.publicDisplayName, photo: currentUser.photo }
      );
      alert(`บทความ "${dataToSave.title}" ถูก${existingPostId ? 'อัปเดต' : 'สร้าง'}เรียบร้อยแล้ว`);
      return newPostId;
    } catch (error: any) {
      logFirebaseError("useBlog.addOrUpdateBlogPost", error);
      throw error;
    }
  }, [currentUser]);

  const deleteBlogPost = useCallback(async (postId: string, coverImageURL?: string): Promise<void> => {
    if (!currentUser || !(currentUser.role === 'Admin' || currentUser.role === 'Writer')) {
      throw new Error("Permission denied to delete blog post.");
    }
    try {
      await deleteBlogPostService(postId, coverImageURL);
      alert("ลบบทความเรียบร้อยแล้ว");
    } catch (error: any) {
      logFirebaseError("useBlog.deleteBlogPost", error);
      throw error;
    }
  }, [currentUser]);

  const toggleBlogPostLike = useCallback(async (postId: string) => {
    if (!currentUser) throw new Error("User not authenticated to like posts.");
    try {
      await toggleBlogPostLikeService(postId, currentUser.id);
    } catch (error: any) {
      logFirebaseError("useBlog.toggleBlogPostLike", error);
      throw error;
    }
  }, [currentUser]);
  
  const addBlogComment = useCallback(async (postId: string, text: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated to comment.");
    try {
      await addBlogCommentService(postId, text, { userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, photoURL: currentUser.photo });
    } catch (error: any) {
      logFirebaseError("useBlog.addBlogComment", error);
      throw error;
    }
  }, [currentUser]);
  
  const updateBlogComment = useCallback(async (commentId: string, newText: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated to update comments.");
    try {
      await updateBlogCommentService(commentId, newText);
    } catch (error: any) {
      logFirebaseError("useBlog.updateBlogComment", error);
      throw error;
    }
  }, [currentUser]);
  
  const deleteBlogComment = useCallback(async (commentId: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated to delete comments.");
    try {
      await deleteBlogCommentService(commentId);
    } catch (error: any) {
      logFirebaseError("useBlog.deleteBlogComment", error);
      throw error;
    }
  }, [currentUser]);

  return {
    addOrUpdateBlogPost,
    deleteBlogPost,
    toggleBlogPostLike,
    addBlogComment,
    updateBlogComment,
    deleteBlogComment,
  };
};