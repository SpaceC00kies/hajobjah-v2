
/**
 * @fileoverview
 * This service module contains all Firebase interactions related to the Blog feature.
 * It handles creating, reading, updating, and deleting blog posts and their
 * associated comments, as well as managing likes.
 */

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    runTransaction,
    increment,
    arrayRemove,
    arrayUnion,
    deleteField,
  } from '@firebase/firestore';
  import { db } from '../firebaseConfig.ts';
  import type { BlogPost, BlogComment } from '../types/types.ts';
  import { logFirebaseError } from '../firebase/logging.ts';
  import { convertTimestamps, cleanDataForFirestore } from './serviceUtils';
  import { uploadImageService, deleteImageService } from './storageService';
  
  const BLOG_POSTS_COLLECTION = 'blogPosts';
  const BLOG_COMMENTS_COLLECTION = 'blogComments';
  
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove non-URL-friendly chars (keeps a-z, A-Z, 0-9, _)
      .replace(/--+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, ''); // Trim - from end of text
  };
  
  export const subscribeToAllBlogPostsService = (callback: (posts: BlogPost[]) => void): (() => void) => {
    const q = query(collection(db, BLOG_POSTS_COLLECTION), where("status", "==", "published"), orderBy("publishedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as BlogPost));
      callback(posts);
    }, (error) => {
      logFirebaseError("subscribeToAllBlogPostsService", error);
    });
  };
  
  export const subscribeToAllBlogPostsForAdminService = (callback: (posts: BlogPost[]) => void): (() => void) => {
    const q = query(collection(db, BLOG_POSTS_COLLECTION), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as BlogPost));
      callback(posts);
    }, (error) => {
      logFirebaseError("subscribeToAllBlogPostsForAdminService", error);
    });
  };
  
  export const addOrUpdateBlogPostService = async (
      blogPostData: Partial<BlogPost> & { tagsInput?: string },
      author: { id: string, publicDisplayName: string, photo?: string | null },
      newCoverImageBase64: string | null | undefined,
      existingPost?: BlogPost | null
  ): Promise<string> => {
      const { tagsInput, ...dataToSave } = blogPostData;
      let coverImageURL = existingPost?.coverImageURL;
  
      const imagePathId = existingPost?.id || `${author.id}-${Date.now()}`;
  
      if (newCoverImageBase64) {
          if (existingPost?.coverImageURL) {
              await deleteImageService(existingPost.coverImageURL);
          }
          coverImageURL = await uploadImageService(`blogCovers/${imagePathId}`, newCoverImageBase64);
      } else if (newCoverImageBase64 === null) {
          if (existingPost?.coverImageURL) {
              await deleteImageService(existingPost.coverImageURL);
          }
          coverImageURL = undefined;
      }
  
      let finalSlug = dataToSave.slug?.trim();
      if (!finalSlug) {
        finalSlug = slugify(dataToSave.title || 'untitled') + '-' + Date.now().toString(36).slice(-6);
      }
  
      const docData: Partial<BlogPost> = {
          ...dataToSave,
          title: dataToSave.title || '',
          content: dataToSave.content || '',
          excerpt: dataToSave.excerpt || '',
          category: dataToSave.category || '',
          status: dataToSave.status || 'draft',
          tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : (existingPost?.tags || []),
          slug: finalSlug,
          updatedAt: serverTimestamp() as any,
      };
      
      if (docData.status === 'published' && (!existingPost || existingPost.status !== 'published')) {
          docData.publishedAt = serverTimestamp() as any;
      }
      
      delete (docData as any).coverImageURL;
  
      if (existingPost) {
          const postId = existingPost.id;
          const updatePayload: Record<string, any> = {
              ...docData,
              coverImageURL: coverImageURL === undefined ? deleteField() : coverImageURL
          };
          await updateDoc(doc(db, BLOG_POSTS_COLLECTION, postId), cleanDataForFirestore(updatePayload));
          return postId;
      } else {
          const finalDocData: Omit<BlogPost, 'id'> = {
              ...docData,
              coverImageURL: coverImageURL || undefined,
              authorId: author.id,
              authorDisplayName: author.publicDisplayName,
              authorPhotoURL: author.photo || undefined,
              createdAt: serverTimestamp() as any,
          } as Omit<BlogPost, 'id'>;
          
          const newDocRef = await addDoc(collection(db, BLOG_POSTS_COLLECTION), cleanDataForFirestore(finalDocData as Record<string, any>));
          return newDocRef.id;
      }
  };
  
  
  export const deleteBlogPostService = async (postId: string, coverImageUrl?: string): Promise<void> => {
    try {
      if (coverImageUrl) {
        await deleteImageService(coverImageUrl);
      }
      await deleteDoc(doc(db, BLOG_POSTS_COLLECTION, postId));
    } catch (error: any) {
      logFirebaseError("deleteBlogPostService", error);
      throw error;
    }
  };
  
  export const subscribeToBlogCommentsService = (postId: string, callback: (comments: BlogComment[]) => void): (() => void) => {
      const q = query(collection(db, BLOG_COMMENTS_COLLECTION), where("postId", "==", postId), orderBy("createdAt", "asc"));
      return onSnapshot(q, (querySnapshot) => {
          const items = querySnapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...convertTimestamps(docSnap.data()),
          } as BlogComment));
          callback(items);
      }, (error) => {
          logFirebaseError(`subscribeToBlogCommentsService (${postId})`, error);
      });
  };
  
  export const subscribeToAllBlogCommentsService = (callback: (comments: BlogComment[]) => void): (() => void) => {
      const q = query(collection(db, BLOG_COMMENTS_COLLECTION), orderBy("createdAt", "asc"));
      return onSnapshot(q, (querySnapshot) => {
          const items = querySnapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...convertTimestamps(docSnap.data()),
          } as BlogComment));
          callback(items);
      }, (error) => {
          logFirebaseError(`subscribeToAllBlogCommentsService`, error);
      });
  };
  
  export const addBlogCommentService = async (postId: string, text: string, author: { userId: string; authorDisplayName: string; photoURL?: string | null }): Promise<void> => {
      const newComment: Omit<BlogComment, 'id'> = {
          postId,
          text,
          userId: author.userId,
          authorDisplayName: author.authorDisplayName,
          authorPhotoURL: author.photoURL || undefined,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
      };
      await addDoc(collection(db, BLOG_COMMENTS_COLLECTION), newComment);
  };
  
  export const updateBlogCommentService = async (commentId: string, newText: string): Promise<void> => {
      await updateDoc(doc(db, BLOG_COMMENTS_COLLECTION, commentId), {
          text: newText,
          updatedAt: serverTimestamp() as any,
      });
  };
  
  export const deleteBlogCommentService = async (commentId: string): Promise<void> => {
      await deleteDoc(doc(db, BLOG_COMMENTS_COLLECTION, commentId));
  };
  
  export const toggleBlogPostLikeService = async (postId: string, userId: string): Promise<void> => {
    try {
      const postRef = doc(db, BLOG_POSTS_COLLECTION, postId);
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) {
          throw new Error("Blog post does not exist!");
        }
        const postData = postDoc.data() as BlogPost;
        const hasLiked = postData.likes.includes(userId);
  
        transaction.update(postRef, {
          likes: hasLiked ? arrayRemove(userId) : arrayUnion(userId),
          likeCount: increment(hasLiked ? -1 : 1),
        });
      });
    } catch (error: any) {
      logFirebaseError("toggleBlogPostLikeService", error);
      throw error;
    }
  };
  