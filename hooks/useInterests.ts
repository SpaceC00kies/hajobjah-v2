import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { toggleInterestService } from '../services/interactionService.ts';
import type { Job, EnrichedHelperProfile } from '../types/types.ts';
import { logFirebaseError } from '../firebase/logging.ts';

type InterestableItem = (Job | EnrichedHelperProfile) & { 
  id: string; 
  userId: string; 
  interestedCount?: number;
  isInterested?: boolean;
};

/**
 * Custom hook to manage showing interest in jobs or helper profiles.
 * It provides an optimistic update for both `interestedCount` and the `isInterested` flag.
 * 
 * @param currentItems The current array of items (jobs or profiles) held in the component's state.
 * @param setCurrentItems The state setter function for the items array.
 * @returns An object containing the `toggleInterest` function.
 */
export const useInterests = <T extends InterestableItem>(
    currentItems: T[],
    setCurrentItems: React.Dispatch<React.SetStateAction<T[]>>
) => {
  const { currentUser } = useAuth();

  const toggleInterest = useCallback(async (
    item: T,
    targetType: 'job' | 'helperProfile'
  ) => {
    if (!currentUser) {
      console.error("User not authenticated to show interest.");
      // The calling component should handle login redirection.
      return;
    }
    
    const isCurrentlyInterested = !!item.isInterested;

    const originalItems = [...currentItems];
    const itemIndex = originalItems.findIndex(i => i.id === item.id);
    if (itemIndex === -1) return;

    const updatedItem = {
      ...item,
      interestedCount: (item.interestedCount || 0) + (isCurrentlyInterested ? -1 : 1),
      isInterested: !isCurrentlyInterested,
    };
    
    const newItems = [...originalItems];
    newItems[itemIndex] = updatedItem;
    setCurrentItems(newItems);
    
    try {
        await toggleInterestService(item.id, targetType, item.userId, currentUser.id);
    } catch (error) {
        logFirebaseError("useInterests.toggleInterest", error);
        setCurrentItems(originalItems);
        alert('เกิดข้อผิดพลาดในการบันทึกความสนใจ');
    }
  }, [currentUser, currentItems, setCurrentItems]);

  return { toggleInterest };
};
