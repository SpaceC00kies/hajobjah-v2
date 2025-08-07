import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from './useUser.ts';
import type { EnrichedWebboardPost } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging.ts';

type SaveablePost = EnrichedWebboardPost & { isSaved?: boolean };

/**
 * Custom hook to manage saving/unsaving webboard posts with optimistic UI updates.
 * @param currentPosts The current array of posts held in the component's state.
 * @param setCurrentPosts The state setter function for the posts array.
 * @returns An object containing the `toggleSave` function.
 */
export const useSaves = (
  currentPosts: SaveablePost[],
  setCurrentPosts: React.Dispatch<React.SetStateAction<SaveablePost[]>>
) => {
  const { currentUser } = useAuth();
  const { saveWebboardPost } = useUser();

  const toggleSave = useCallback(async (postToToggle: SaveablePost) => {
    if (!currentUser) {
      console.error("User not authenticated to save posts.");
      return;
    }

    const originalPosts = [...currentPosts];
    const postIndex = originalPosts.findIndex(p => p.id === postToToggle.id);
    if (postIndex === -1) return;

    const originalPost = originalPosts[postIndex];
    
    // Create the updated post object for the optimistic update.
    const updatedPost = {
      ...originalPost,
      isSaved: !originalPost.isSaved,
    };
    
    const newPosts = [...originalPosts];
    newPosts[postIndex] = updatedPost;
    setCurrentPosts(newPosts);

    try {
      await saveWebboardPost(postToToggle.id);
    } catch (error) {
      logFirebaseError("useSaves.toggleSave", error);
      // If the backend update fails, revert the UI to its original state.
      setCurrentPosts(originalPosts);
      alert('เกิดข้อผิดพลาดในการบันทึกโพสต์');
    }
  }, [currentUser, currentPosts, setCurrentPosts, saveWebboardPost]);

  return { toggleSave };
};
