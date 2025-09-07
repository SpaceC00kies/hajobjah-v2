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
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    deleteField,
  } from '@firebase/firestore';
  import { db } from '../firebaseConfig.ts';
  import type { BlogPost, BlogComment } from '../types/types.ts';
  import { logFirebaseError } from '../firebase/logging.ts';
  import { convertTimestamps, cleanDataForFirestore } from './serviceUtils';
  import { uploadImageService, deleteFileService } from './storageService';
  
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
      existingPost?: BlogPost | null,
      newCardImageBase64?: string | null | undefined
  ): Promise<string> => {
      try {
          console.log('Starting addOrUpdateBlogPostService', { 
              hasNewCoverImage: !!newCoverImageBase64,
              hasNewCardImage: !!newCardImageBase64,
              isUpdate: !!existingPost 
          });
  
          const { tagsInput, ...dataToSave } = blogPostData;
          let coverImageURL = existingPost?.coverImageURL;
          let cardImageURL = existingPost?.cardImageURL;
  
          const imagePathId = existingPost?.id || `${author.id}-${Date.now()}`;
  
          // Handle cover image
          if (newCoverImageBase64) {
              console.log('Uploading cover image...');
              if (existingPost?.coverImageURL) {
                  console.log('Deleting existing cover image...');
                  await deleteFileService(existingPost.coverImageURL);
              }
              coverImageURL = await uploadImageService(`blogCovers/${imagePathId}`, newCoverImageBase64);
              console.log('Cover image uploaded successfully:', coverImageURL);
          } else if (newCoverImageBase64 === null) {
              console.log('Removing cover image...');
              if (existingPost?.coverImageURL) {
                  await deleteFileService(existingPost.coverImageURL);
              }
              coverImageURL = undefined;
          }
  
          // Handle card image
          if (newCardImageBase64) {
              console.log('Uploading card image...');
              if (existingPost?.cardImageURL) {
                  console.log('Deleting existing card image...');
                  await deleteFileService(existingPost.cardImageURL);
              }
              cardImageURL = await uploadImageService(`blogCards/${imagePathId}`, newCardImageBase64);
              console.log('Card image uploaded successfully:', cardImageURL);
          } else if (newCardImageBase64 === null) {
              console.log('Removing card image...');
              if (existingPost?.cardImageURL) {
                  await deleteFileService(existingPost.cardImageURL);
              }
              cardImageURL = undefined;
          }
  
          console.log('Processing document data...');
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
              metaTitle: dataToSave.metaTitle || '',
              coverImageAltText: dataToSave.coverImageAltText || '',
              cardImageAltText: dataToSave.cardImageAltText || '',
              updatedAt: serverTimestamp() as any,
          };
          
          if (docData.status === 'published' && (!existingPost || existingPost.status !== 'published')) {
              docData.publishedAt = serverTimestamp() as any;
          }
          
          delete (docData as any).coverImageURL;
          delete (docData as any).cardImageURL;
  
          if (existingPost) {
              console.log('Updating existing post...');
              const postId = existingPost.id;
              const updatePayload: Record<string, any> = {
                  ...docData,
                  coverImageURL: coverImageURL === undefined ? deleteField() : coverImageURL,
                  cardImageURL: cardImageURL === undefined ? deleteField() : cardImageURL
              };
              await updateDoc(doc(db, BLOG_POSTS_COLLECTION, postId), cleanDataForFirestore(updatePayload));
              console.log('Post updated successfully:', postId);
              return postId;
          } else {
              console.log('Creating new post...');
              const finalDocData = {
                  title: docData.title,
                  content: docData.content,
                  excerpt: docData.excerpt,
                  category: docData.category,
                  status: docData.status,
                  tags: docData.tags,
                  slug: docData.slug,
                  metaTitle: docData.metaTitle,
                  coverImageAltText: docData.coverImageAltText,
                  cardImageAltText: docData.cardImageAltText,
                  updatedAt: docData.updatedAt,
                  publishedAt: docData.publishedAt,
                  coverImageURL: coverImageURL,
                  cardImageURL: cardImageURL,
                  authorId: author.id,
                  authorDisplayName: author.publicDisplayName,
                  authorPhotoURL: author.photo,
                  createdAt: serverTimestamp(),
              };
              
              // Remove undefined values manually
              const cleanedData: any = {};
              for (const [key, value] of Object.entries(finalDocData)) {
                  if (value !== undefined) {
                      cleanedData[key] = value;
                  }
              }
              
              console.log('Final document data:', cleanedData);
              const newDocRef = await addDoc(collection(db, BLOG_POSTS_COLLECTION), cleanedData);
              console.log('New post created successfully:', newDocRef.id);
              return newDocRef.id;
          }
      } catch (error: any) {
          console.error('Error in addOrUpdateBlogPostService:', error);
          logFirebaseError("addOrUpdateBlogPostService", error);
          throw error;
      }
  };
  
  
  export const deleteBlogPostService = async (postId: string, coverImageUrl?: string, cardImageUrl?: string): Promise<void> => {
    try {
      if (coverImageUrl) {
        await deleteFileService(coverImageUrl);
      }
      if (cardImageUrl) {
        await deleteFileService(cardImageUrl);
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