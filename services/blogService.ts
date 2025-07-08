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
} from 'firebase/firestore';
import { db } from '../firebase';
import type { BlogPost, BlogComment } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps } from './serviceUtils';
import { uploadImageService, deleteImageService } from './storageService';

const BLOG_POSTS_COLLECTION = 'blogPosts';
const BLOG_COMMENTS_COLLECTION = 'blogComments';

export const getAllBlogPosts = async (): Promise<BlogPost[]> => {
  const q = query(collection(db, BLOG_POSTS_COLLECTION), where("status", "==", "published"), orderBy("publishedAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as BlogPost));
};

export const getBlogPostsForAdmin = async (): Promise<BlogPost[]> => {
  const q = query(collection(db, BLOG_POSTS_COLLECTION), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as BlogPost));
};

export const addOrUpdateBlogPostService = async (
    blogPostData: Partial<BlogPost> & { newCoverImageBase64?: string | null },
    author: { id: string, publicDisplayName: string, photo?: string | null },
    newCoverImageBase64?: string | null
): Promise<string> => {
    const { id: postId, newCoverImageBase64: _, ...dataToSave } = blogPostData;
    let coverImageURL = dataToSave.coverImageURL;

    if (newCoverImageBase64) { // New image uploaded
        if (coverImageURL) await deleteImageService(coverImageURL);
        coverImageURL = await uploadImageService(`blogCovers/${author.id}/${Date.now()}`, newCoverImageBase64);
    } else if (newCoverImageBase64 === null && coverImageURL) { // Image explicitly removed
        await deleteImageService(coverImageURL);
        coverImageURL = undefined;
    }

    const docData: Partial<BlogPost> = {
        ...dataToSave,
        coverImageURL,
        updatedAt: serverTimestamp() as any,
    };

    if (postId) { // Updating existing post
        await updateDoc(doc(db, BLOG_POSTS_COLLECTION, postId), docData);
        return postId;
    } else { // Creating new post
        const finalDocData: Omit<BlogPost, 'id'> = {
            ...docData,
            authorId: author.id,
            authorDisplayName: author.publicDisplayName,
            authorPhotoURL: author.photo || undefined,
            createdAt: serverTimestamp() as any,
            publishedAt: dataToSave.status === 'published' ? serverTimestamp() as any : undefined,
            likes: [],
            likeCount: 0,
            tags: [],
        } as Omit<BlogPost, 'id'>;
        const newDocRef = await addDoc(collection(db, BLOG_POSTS_COLLECTION), finalDocData);
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
    const postRef = doc(db, BLOG_POSTS_COLLECTION, postId);
    await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw "Post does not exist!";
        const postData = postDoc.data() as BlogPost;
        const hasLiked = postData.likes.includes(userId);
        transaction.update(postRef, {
            likes: hasLiked ? arrayRemove(userId) : arrayUnion(userId),
            likeCount: increment(hasLiked ? -1 : 1),
        });
    });
};