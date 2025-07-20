// services/webboardService.ts
import {
  db,
} from '@/lib/firebase/clientApp';
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
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import type { WebboardPost, WebboardComment, WebboardCategory, PaginatedDocsResponse, Cursor } from '../types/types';
import { logFirebaseError } from '../firebase/logging';
import { convertTimestamps, cleanDataForFirestore } from './serviceUtils';
import { uploadImageService, deleteImageService } from './storageService';

const WEBBOARD_POSTS_COLLECTION = 'webboardPosts';
const WEBBOARD_COMMENTS_COLLECTION = 'webboardComments';
const USERS_COLLECTION = 'users';

interface WebboardPostAuthorInfo { userId: string; authorDisplayName: string; photo?: string | null; }

export const getWebboardPostByIdService = async (postId: string): Promise<WebboardPost | null> => {
    try {
        const docRef = doc(db, WEBBOARD_POSTS_COLLECTION, postId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as WebboardPost;
        }
        return null;
    } catch (error) {
        logFirebaseError("getWebboardPostByIdService", error);
        return null;
    }
};

export const getCommentsForPostService = async (postId: string): Promise<WebboardComment[]> => {
    try {
        const q = query(collection(db, WEBBOARD_COMMENTS_COLLECTION), where("postId", "==", postId), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as WebboardComment));
    } catch (error) {
        logFirebaseError("getCommentsForPostService", error);
        return [];
    }
};

export const addWebboardPostService = async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, author: WebboardPostAuthorInfo): Promise<string> => {
  try {
    let imageUrl: string | undefined = undefined;
    if (postData.image) imageUrl = await uploadImageService(`webboardImages/${author.userId}/${Date.now()}`, postData.image);
    const newPostDoc: Omit<WebboardPost, 'id'> = {
      ...postData, image: imageUrl, userId: author.userId, authorDisplayName: author.authorDisplayName, authorPhoto: author.photo || undefined,
      likes: [], isPinned: false, createdAt: serverTimestamp() as any, updatedAt: serverTimestamp() as any,
    };
    const docRef = await addDoc(collection(db, WEBBOARD_POSTS_COLLECTION), cleanDataForFirestore(newPostDoc as any));
    return docRef.id;
  } catch (error: any) { logFirebaseError("addWebboardPostService", error); throw error; }
};

export const updateWebboardPostService = async (postId: string, postData: Partial<{ title: string; body: string; category: WebboardCategory; image?: string }>): Promise<void> => {
  try {
    let dataToUpdate: Partial<WebboardPost> = { ...postData, updatedAt: serverTimestamp() as any };
    if (postData.image && postData.image.startsWith('data:image')) {
      const existingPost = await getDoc(doc(db, WEBBOARD_POSTS_COLLECTION, postId));
      if ((existingPost.data() as Partial<WebboardPost>)?.image) await deleteImageService((existingPost.data() as Partial<WebboardPost>)?.image);
      dataToUpdate.image = await uploadImageService(`webboardImages/${postId}/${Date.now()}`, postData.image);
    } else if (postData.image === undefined) {
      dataToUpdate.image = deleteField() as any;
    }
    await updateDoc(doc(db, WEBBOARD_POSTS_COLLECTION, postId), cleanDataForFirestore(dataToUpdate as any));
  } catch (error: any) { logFirebaseError("updateWebboardPostService", error); throw error; }
};

export const deleteWebboardPostService = async (postId: string): Promise<void> => {
  try {
    const postSnap = await getDoc(doc(db, WEBBOARD_POSTS_COLLECTION, postId));
    if ((postSnap.data() as Partial<WebboardPost>)?.image) await deleteImageService((postSnap.data() as Partial<WebboardPost>)?.image);
    await deleteDoc(doc(db, WEBBOARD_POSTS_COLLECTION, postId));
  } catch (error: any) { logFirebaseError("deleteWebboardPostService", error); throw error; }
};

export const getWebboardPostsPaginated = async (pageSize: number, cursor: Cursor | null, categoryFilter: WebboardCategory | 'all' | null, searchTerm: string | null): Promise<PaginatedDocsResponse<WebboardPost>> => {
    try {
        let q = query(collection(db, WEBBOARD_POSTS_COLLECTION), orderBy("isPinned", "desc"), orderBy("createdAt", "desc"), limit(pageSize));
        if (cursor) q = query(q, startAfter(cursor.isPinned, Timestamp.fromMillis(new Date(cursor.updatedAt).getTime())));
        if (categoryFilter && categoryFilter !== 'all') q = query(q, where("category", "==", categoryFilter));
        
        const snapshot = await getDocs(q);
        let posts = snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as WebboardPost));
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            posts = posts.filter(p => p.title.toLowerCase().includes(term) || p.body.toLowerCase().includes(term) || p.authorDisplayName.toLowerCase().includes(term));
        }
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        const lastDocData = lastDoc?.data() as DocumentData | undefined;
        const nextCursor: Cursor | null = lastDocData ? { isPinned: lastDocData.isPinned, updatedAt: (lastDocData.createdAt as Timestamp).toDate().toISOString() } : null;
        return { items: posts, cursor: nextCursor };
    } catch (error: any) { logFirebaseError("getWebboardPostsPaginated", error); throw error; }
};

export const toggleWebboardPostLikeService = async (postId: string, userId: string): Promise<void> => {
  try {
    await runTransaction(db, async (t) => {
      const postRef = doc(db, WEBBOARD_POSTS_COLLECTION, postId);
      const postDoc = await t.get(postRef);
      if (!postDoc.exists()) throw "Post does not exist!";
      const likes = postDoc.data().likes || [];
      t.update(postRef, { likes: likes.includes(userId) ? arrayRemove(userId) : arrayUnion(userId) });
    });
  } catch (error: any) { logFirebaseError("toggleWebboardPostLikeService", error); throw error; }
};

export const addWebboardCommentService = async (postId: string, text: string, author: WebboardPostAuthorInfo): Promise<void> => {
  try {
    await addDoc(collection(db, WEBBOARD_COMMENTS_COLLECTION), { postId, text, userId: author.userId, authorDisplayName: author.authorDisplayName, authorPhoto: author.photo || undefined, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  } catch (error: any) { logFirebaseError("addWebboardCommentService", error); throw error; }
};

export const updateWebboardCommentService = async (commentId: string, newText: string): Promise<void> => {
  try {
    await updateDoc(doc(db, WEBBOARD_COMMENTS_COLLECTION, commentId), { text: newText, updatedAt: serverTimestamp() });
  } catch (error: any) { logFirebaseError("updateWebboardCommentService", error); throw error; }
};

export const deleteWebboardCommentService = async (commentId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, WEBBOARD_COMMENTS_COLLECTION, commentId));
  } catch (error: any) { logFirebaseError("deleteWebboardCommentService", error); throw error; }
};

export const subscribeToWebboardCommentsService = (callback: (comments: WebboardComment[]) => void): (() => void) => {
  const q = query(collection(db, WEBBOARD_COMMENTS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
    callback(querySnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as WebboardComment)));
  }, (error) => logFirebaseError("subscribeToWebboardCommentsService", error));
};

export const subscribeToAllWebboardPostsService = (callback: (posts: WebboardPost[]) => void): (() => void) => {
    const q = query(collection(db, WEBBOARD_POSTS_COLLECTION), orderBy("createdAt", "desc"));
    return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
        const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as WebboardPost));
        callback(posts);
    }, (error) => {
        logFirebaseError("subscribeToAllWebboardPostsService", error);
    });
};

export const subscribeToWebboardPostsByUserId = (userId: string, callback: (posts: WebboardPost[]) => void): (() => void) => {
  const q = query(collection(db, WEBBOARD_POSTS_COLLECTION), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as WebboardPost));
    callback(posts);
  }, (error) => {
    logFirebaseError(`subscribeToWebboardPostsByUserId for user ${userId}`, error);
  });
};
