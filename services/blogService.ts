/**
 * @fileoverview
 * This service module contains all Firebase interactions related to the Blog feature.
 * It handles creating, reading, updating, and deleting blog posts and their
 * associated comments, as well as managing likes.
 */

import {
  db,
} from '@/lib/firebase/clientApp';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  increment,
  arrayRemove,
  arrayUnion,
  limit
} from 'firebase/firestore';
import type { BlogPost, BlogComment } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps } from './serviceUtils';
import { uploadImageService, deleteImageService } from './storageService';

const BLOG_POSTS_COLLECTION = 'blogPosts';
const BLOG_COMMENTS_COLLECTION = 'blogComments';

const createSlug = (title: string): string => {
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')
  
    return title.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(p, c => b.charAt(a.indexOf(c)))
      .replace(/&/g, '-and-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
      .concat(`-${Math.random().toString(36).substring(2, 7)}`);
};

export const getAllBlogPosts = async (): Promise<BlogPost[]> => {
  const q = query(collection(db, BLOG_POSTS_COLLECTION), where("status", "==", "published"), orderBy("publishedAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as BlogPost));
};

export const getBlogPostBySlugService = async (slug: string): Promise<BlogPost | null> => {
    const q = query(collection(db, BLOG_POSTS_COLLECTION), where("slug", "==", slug), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as BlogPost;
};

export const subscribeToAllBlogPosts = (callback: (posts: BlogPost[]) => void): (() => void) => {
    const q = query(collection(db, BLOG_POSTS_COLLECTION), orderBy("createdAt", "desc"));
    return onSnapshot(q, (querySnapshot) => {
        const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as BlogPost));
        callback(posts);
    }, (error) => {
        logFirebaseError("subscribeToAllBlogPosts", error);
    });
};

export const getBlogPostsForAdmin = async (): Promise<BlogPost[]> => {
  const q = query(collection(db, BLOG_POSTS_COLLECTION), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as BlogPost));
};

export const addOrUpdateBlogPostService = async (
    blogPostData: Partial<BlogPost> & { newCoverImageBase64?: string | null },
    author: { id: string, publicDisplayName: string, photo?: string | null },
): Promise<string> => {
    const { id: postId, newCoverImageBase64, ...dataToSave } = blogPostData;
    let coverImageURL = dataToSave.coverImageURL;

    if (newCoverImageBase64) {
        const oldImageUrl = postId ? (await getDoc(doc(db, BLOG_POSTS_COLLECTION, postId))).data()?.coverImageURL : undefined;
        if (oldImageUrl) await deleteImageService(oldImageUrl);
        coverImageURL = await uploadImageService(`blogCovers/${author.id}/${Date.now()}`, newCoverImageBase64);
    } else if (newCoverImageBase64 === null) {
        const oldImageUrl = postId ? (await getDoc(doc(db, BLOG_POSTS_COLLECTION, postId))).data()?.coverImageURL : undefined;
        if (oldImageUrl) await deleteImageService(oldImageUrl);
        coverImageURL = undefined;
    }

    const docData: Partial<BlogPost> = { ...dataToSave, coverImageURL, updatedAt: serverTimestamp() as any };

    if (postId) {
        await updateDoc(doc(db, BLOG_POSTS_COLLECTION, postId), docData);
        return postId;
    } else {
        const finalDocData: Omit<BlogPost, 'id'> = {
            ...docData,
            title: docData.title || 'Untitled Post',
            slug: createSlug(docData.title || 'untitled'),
            authorId: author.id,
            authorDisplayName: author.publicDisplayName,
            authorPhotoURL: author.photo || undefined,
            createdAt: serverTimestamp() as any,
            publishedAt: dataToSave.status === 'published' ? serverTimestamp() as any : undefined,
            likes: [],
            likeCount: 0,
        } as Omit<BlogPost, 'id'>;
        const newDocRef = await addDoc(collection(db, BLOG_POSTS_COLLECTION), finalDocData);
        return newDocRef.id;
    }
};

export const deleteBlogPostService = async (postId: string, coverImageUrl?: string): Promise<void> => {
  try {
    if (coverImageUrl) await deleteImageService(coverImageUrl);
    await deleteDoc(doc(db, BLOG_POSTS_COLLECTION, postId));
  } catch (error: any) {
    logFirebaseError("deleteBlogPostService", error);
    throw error;
  }
};

export const subscribeToBlogCommentsService = (postId: string, callback: (comments: BlogComment[]) => void): (() => void) => {
    const q = query(collection(db, BLOG_COMMENTS_COLLECTION), where("postId", "==", postId), orderBy("createdAt", "asc"));
    return onSnapshot(q, (querySnapshot) => {
        const items = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()), } as BlogComment));
        callback(items);
    }, (error) => logFirebaseError(`subscribeToBlogCommentsService (${postId})`, error));
};

export const addBlogCommentService = async (postId: string, text: string, author: { userId: string; authorDisplayName: string; photoURL?: string | null }): Promise<void> => {
    const newComment: Omit<BlogComment, 'id'> = {
        postId, text, userId: author.userId, authorDisplayName: author.authorDisplayName, authorPhotoURL: author.photoURL || undefined,
        createdAt: serverTimestamp() as any, updatedAt: serverTimestamp() as any,
    };
    await addDoc(collection(db, BLOG_COMMENTS_COLLECTION), newComment);
};

export const updateBlogCommentService = async (commentId: string, newText: string): Promise<void> => {
    await updateDoc(doc(db, BLOG_COMMENTS_COLLECTION, commentId), { text: newText, updatedAt: serverTimestamp() as any });
};

export const deleteBlogCommentService = async (commentId: string): Promise<void> => {
    await deleteDoc(doc(db, BLOG_COMMENTS_COLLECTION, commentId));
};

export const toggleBlogPostLikeService = async (postId: string, userId: string): Promise<void> => {
    const postRef = doc(db, BLOG_POSTS_COLLECTION, postId);
    await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw "Post does not exist!";
        const hasLiked = (postDoc.data() as BlogPost).likes.includes(userId);
        transaction.update(postRef, {
            likes: hasLiked ? arrayRemove(userId) : arrayUnion(userId),
            likeCount: increment(hasLiked ? -1 : 1),
        });
    });
};
