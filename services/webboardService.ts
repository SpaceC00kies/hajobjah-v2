/**
 * @fileoverview
 * This service module manages all Firebase interactions for the Webboard feature.
 * It includes functions for creating, reading, updating, and deleting both webboard
 * posts and comments, handling pagination, and managing likes.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  startAfter,
  serverTimestamp,
  deleteField,
  runTransaction,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  type DocumentSnapshot,
  type DocumentData,
  type QueryConstraint,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig.ts';
import type { WebboardPost, WebboardComment, WebboardCategory, PaginatedDocsResponse, Cursor } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps, cleanDataForFirestore } from './serviceUtils';
import { uploadImageService, deleteImageService } from './storageService';

const WEBBOARD_POSTS_COLLECTION = 'webboardPosts';
const WEBBOARD_COMMENTS_COLLECTION = 'webboardComments';
const USERS_COLLECTION = 'users';

interface WebboardPostAuthorInfo { userId: string; authorDisplayName: string; photo?: string | null; }

export const addWebboardPostService = async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, author: WebboardPostAuthorInfo): Promise<string> => {
  try {
    if (postData.body.length > 5000) {
      throw new Error("Post body exceeds 5000 characters.");
    }
    let imageUrl: string | undefined = undefined;
    if (postData.image && postData.image.startsWith('data:image')) {
      imageUrl = await uploadImageService(`webboardImages/${author.userId}/${Date.now()}`, postData.image);
    }

    const now = serverTimestamp();
    const newPostDoc: Omit<WebboardPost, 'id'> = {
      title: postData.title,
      body: postData.body,
      category: postData.category,
      image: imageUrl,
      userId: author.userId,
      authorDisplayName: author.authorDisplayName,
      authorPhoto: author.photo || undefined,
      ownerId: author.userId,
      likes: [],
      isPinned: false,
      createdAt: now as any,
      updatedAt: now as any,
    };

    const docRef = await addDoc(collection(db, WEBBOARD_POSTS_COLLECTION), cleanDataForFirestore(newPostDoc as Record<string, any>));

    const userDocRef = doc(db, USERS_COLLECTION, author.userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const dailyPosts = userData.postingLimits?.dailyWebboardPosts || { count: 0, resetDate: new Date(0) };
        const today = new Date().toISOString().split('T')[0];
        const resetDate = new Date(dailyPosts.resetDate).toISOString().split('T')[0];

        const newCount = today === resetDate ? dailyPosts.count + 1 : 1;
        await updateDoc(userDocRef, {
            'postingLimits.dailyWebboardPosts.count': newCount,
            'postingLimits.dailyWebboardPosts.resetDate': today,
        });
    }

    return docRef.id;
  } catch (error: any) {
    logFirebaseError("addWebboardPostService", error);
    throw error;
  }
};

export const updateWebboardPostService = async (postId: string, postData: Partial<{ title: string; body: string; category: WebboardCategory; image?: string }>, authorPhoto?: string | null): Promise<void> => {
  try {
    let dataToUpdate: Partial<WebboardPost> = {
      title: postData.title,
      body: postData.body,
      category: postData.category,
      updatedAt: serverTimestamp() as any,
    };

    if (postData.image && postData.image.startsWith('data:image')) {
      const existingPost = await getDoc(doc(db, WEBBOARD_POSTS_COLLECTION, postId));
      if (existingPost.exists() && existingPost.data().image) {
        await deleteImageService(existingPost.data().image);
      }
      dataToUpdate.image = await uploadImageService(`webboardImages/${doc(db, WEBBOARD_POSTS_COLLECTION, postId).id}/${Date.now()}`, postData.image);
    } else if (postData.image === undefined) {
      const existingPost = await getDoc(doc(db, WEBBOARD_POSTS_COLLECTION, postId));
      if (existingPost.exists() && existingPost.data().image) {
        await deleteImageService(existingPost.data().image);
      }
      dataToUpdate.image = deleteField() as any;
    }
    
    if (authorPhoto !== undefined) {
      dataToUpdate.authorPhoto = authorPhoto || undefined;
    }

    await updateDoc(doc(db, WEBBOARD_POSTS_COLLECTION, postId), cleanDataForFirestore(dataToUpdate as Record<string, any>));
  } catch (error: any) {
    logFirebaseError("updateWebboardPostService", error);
    throw error;
  }
};

export const deleteWebboardPostService = async (postId: string): Promise<void> => {
  try {
    const postRef = doc(db, WEBBOARD_POSTS_COLLECTION, postId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists() && postSnap.data().image) {
      await deleteImageService(postSnap.data().image);
    }
    await deleteDoc(postRef);
  } catch (error: any) {
    logFirebaseError("deleteWebboardPostService", error);
    throw error;
  }
};

export const subscribeToAllWebboardPostsService = (callback: (posts: WebboardPost[]) => void): (() => void) => {
  const q = query(collection(db, WEBBOARD_POSTS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const items = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as WebboardPost));
    callback(items);
  }, (error) => {
    logFirebaseError(`subscribeToAllWebboardPostsService`, error);
  });
};

export const getWebboardPostsPaginated = async (
  pageSize: number,
  cursor: Cursor | null = null,
  categoryFilter: WebboardCategory | 'all' | null = null,
  searchTerm: string | null = null
): Promise<PaginatedDocsResponse<WebboardPost>> => {
  try {
    let constraints: QueryConstraint[] = [orderBy("isPinned", "desc"), orderBy("createdAt", "desc"), limit(pageSize)];
    
    if (cursor) {
      constraints.push(startAfter(cursor.isPinned, new Date(cursor.updatedAt)));
    }

    const q = query(collection(db, WEBBOARD_POSTS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    let postsData = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as WebboardPost));

    // Apply all filtering on the client side for robustness
    if (categoryFilter && categoryFilter !== 'all') {
      postsData = postsData.filter(post => post.category === categoryFilter);
    }

    if (searchTerm && searchTerm.trim()) {
      const termLower = searchTerm.toLowerCase();
      postsData = postsData.filter(post =>
        post.title.toLowerCase().includes(termLower) ||
        post.body.toLowerCase().includes(termLower) ||
        post.authorDisplayName.toLowerCase().includes(termLower)
      );
    }

    const lastVisibleDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
    const lastItemData = lastVisibleDoc?.data();

    const nextCursor: Cursor | null = lastItemData ? {
        updatedAt: (lastItemData.createdAt as Timestamp).toDate().toISOString(),
        isPinned: lastItemData.isPinned || false,
    } : null;

    return { items: postsData, cursor: querySnapshot.docs.length < pageSize ? null : nextCursor };
  } catch (error: any) {
    logFirebaseError("getWebboardPostsPaginated", error);
    throw error;
  }
};

export const toggleWebboardPostLikeService = async (postId: string, userId: string): Promise<void> => {
  try {
    const postRef = doc(db, WEBBOARD_POSTS_COLLECTION, postId);
    await runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) { throw "Post does not exist!"; }
      const postData = postDoc.data() as WebboardPost;
      if (postData.likes.includes(userId)) {
        transaction.update(postRef, { likes: arrayRemove(userId) });
      } else {
        transaction.update(postRef, { likes: arrayUnion(userId) });
      }
    });
  } catch (error: any) {
    logFirebaseError("toggleWebboardPostLikeService", error);
    throw error;
  }
};

interface WebboardCommentAuthorInfo { userId: string; authorDisplayName: string; photo?: string | null; }

export const addWebboardCommentService = async (postId: string, text: string, author: WebboardCommentAuthorInfo): Promise<void> => {
  try {
    const newCommentDoc: Omit<WebboardComment, 'id'> = {
      postId,
      userId: author.userId,
      authorDisplayName: author.authorDisplayName,
      authorPhoto: author.photo || undefined,
      ownerId: author.userId,
      text,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    await addDoc(collection(db, WEBBOARD_COMMENTS_COLLECTION), newCommentDoc);
    const userDocRef = doc(db, USERS_COLLECTION, author.userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const hourlyComments = userData.postingLimits?.hourlyComments || { count: 0, resetTime: new Date(0) };
        const now = new Date();
        const resetTime = new Date(hourlyComments.resetTime);
        const newCount = now.getTime() - resetTime.getTime() > 3600 * 1000 ? 1 : hourlyComments.count + 1;
        await updateDoc(userDocRef, {
            'postingLimits.hourlyComments.count': newCount,
            'postingLimits.hourlyComments.resetTime': now.toISOString(),
        });
    }
  } catch (error: any) {
    logFirebaseError("addWebboardCommentService", error);
    throw error;
  }
};

export const updateWebboardCommentService = async (commentId: string, newText: string): Promise<void> => {
  try {
    await updateDoc(doc(db, WEBBOARD_COMMENTS_COLLECTION, commentId), {
      text: newText,
      updatedAt: serverTimestamp() as any,
    });
  } catch (error: any) {
    logFirebaseError("updateWebboardCommentService", error);
    throw error;
  }
};

export const deleteWebboardCommentService = async (commentId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, WEBBOARD_COMMENTS_COLLECTION, commentId));
  } catch (error: any) {
    logFirebaseError("deleteWebboardCommentService", error);
    throw error;
  }
};

export const subscribeToWebboardCommentsService = (callback: (comments: WebboardComment[]) => void): (() => void) => {
  const q = query(collection(db, WEBBOARD_COMMENTS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const items = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()),
    } as WebboardComment));
    callback(items);
  }, (error) => {
    logFirebaseError("subscribeToWebboardCommentsService", error);
  });
};