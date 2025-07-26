import { useCallback, useContext } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { BlogContext } from '../context/BlogContext.tsx';
import {
  addOrUpdateBlogPostService,
  deleteBlogPostService,
  toggleBlogPostLikeService,
  addBlogCommentService,
  updateBlogCommentService,
  deleteBlogCommentService,
} from '../services/blogService.ts';
import type { BlogPost, BlogComment } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging.ts';

type BlogPostFormData = Partial<Omit<BlogPost, 'id' | 'authorId' | 'authorDisplayName' | 'authorPhotoURL' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'slug' | 'tags'>> & { newCoverImageBase64?: string | null; tagsInput: string; };

export const useBlog = () => {
  const context = useContext(BlogContext);
  if (!context) {
    throw new Error('useBlog must be used within a BlogProvider');
  }
  const { allBlogPosts, allBlogPostsForAdmin, blogComments } = context;
  const { currentUser } = useAuth();

  const addOrUpdateBlogPost = useCallback(async (blogPostData: BlogPostFormData, existingPostId?: string): Promise<string> => {
    if (!currentUser || !(currentUser.role === 'Admin' || currentUser.role === 'Writer')) {
      throw new Error("Permission denied to create or update blog post.");
    }
    try {
      const { newCoverImageBase64, ...dataToSave } = blogPostData;
      const newPostId = await addOrUpdateBlogPostService(
        dataToSave,
        { id: currentUser.id, publicDisplayName: currentUser.publicDisplayName, photo: currentUser.photo },
        newCoverImageBase64
      );
      return newPostId;
    } catch (error: any) {
      logFirebaseError("useBlog.addOrUpdateBlogPost", error);
      throw error;
    }
  }, [currentUser]);

  const deleteBlogPost = useCallback(async (postId: string, coverImageUrl?: string): Promise<void> => {
    if (!currentUser || !(currentUser.role === 'Admin' || currentUser.role === 'Writer')) {
      throw new Error("Permission denied to delete blog post.");
    }
    try {
      await deleteBlogPostService(postId, coverImageUrl);
      alert('ลบบทความเรียบร้อยแล้ว');
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

  const addBlogComment = useCallback(async (postId: string, text: string) => {
    if (!currentUser) throw new Error("User not authenticated to comment.");
    try {
      await addBlogCommentService(postId, text, { userId: currentUser.id, authorDisplayName: currentUser.publicDisplayName, photoURL: currentUser.photo });
    } catch (error: any) {
      logFirebaseError("useBlog.addBlogComment", error);
      throw error;
    }
  }, [currentUser]);

  const updateBlogComment = useCallback(async (commentId: string, newText: string) => {
    if (!currentUser) throw new Error("User not authenticated to update comments.");
    // Additional permission checks can be added here if needed
    try {
      await updateBlogCommentService(commentId, newText);
    } catch (error: any) {
      logFirebaseError("useBlog.updateBlogComment", error);
      throw error;
    }
  }, [currentUser]);

  const deleteBlogComment = useCallback(async (commentId: string) => {
    if (!currentUser) throw new Error("User not authenticated to delete comments.");
    // Additional permission checks can be added here if needed
    try {
      await deleteBlogCommentService(commentId);
    } catch (error: any) {
      logFirebaseError("useBlog.deleteBlogComment", error);
      throw error;
    }
  }, [currentUser]);
  
  return {
    allBlogPosts,
    allBlogPostsForAdmin,
    blogComments,
    addOrUpdateBlogPost,
    deleteBlogPost,
    toggleBlogPostLike,
    addBlogComment,
    updateBlogComment,
    deleteBlogComment
  };
};
