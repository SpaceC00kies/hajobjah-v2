import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { toggleWebboardPostLikeService } from '../services/webboardService.ts';
import type { EnrichedWebboardPost } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging.ts';

/**
 * Custom hook to manage liking/unliking webboard posts with optimistic UI updates.
 * @param currentPosts The current array of posts held in the component's state.
 * @param setCurrentPosts The state setter function for the posts array.
 * @returns An object containing the `toggleLike` function.
 */
export const useLikes = (
  currentPosts: EnrichedWebboardPost[],
  setCurrentPosts: React.Dispatch<React.SetStateAction<EnrichedWebboardPost[]>>
) => {
  const { currentUser } = useAuth();

  const toggleLike = useCallback(async (postId: string) => {
    if (!currentUser) {
      // The calling component is expected to handle login requests.
      console.error("User not authenticated to like posts.");
      return;
    }

    const originalPosts = [...currentPosts];
    const postIndex = originalPosts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;

    const originalPost = originalPosts[postIndex];
    const hasLiked = originalPost.likes.includes(currentUser.id);

    // Create the updated post object for the optimistic update.
    const updatedPost = {
      ...originalPost,
      likes: hasLiked
        ? originalPost.likes.filter(uid => uid !== currentUser.id)
        : [...originalPost.likes, currentUser.id],
    };
    
    // Optimistically update the UI.
    const newPosts = [...originalPosts];
    newPosts[postIndex] = updatedPost;
    setCurrentPosts(newPosts);

    try {
      // Send the update to the backend.
      await toggleWebboardPostLikeService(postId, currentUser.id);
    } catch (error) {
      logFirebaseError("useLikes.toggleLike", error);
      // If the backend update fails, revert the UI to its original state.
      setCurrentPosts(originalPosts);
      alert('เกิดข้อผิดพลาดในการกดไลค์');
    }
  }, [currentUser, currentPosts, setCurrentPosts]);

  return { toggleLike };
};
