import { useCallback } from 'react';
import { cleanupExpiredPosts, markExpiredPosts } from '../services/cleanupService.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const useCleanup = () => {
  const { currentUser } = useAuth();

  const runCleanup = useCallback(async () => {
    // Only admins can run cleanup
    if (!currentUser || currentUser.role !== 'Admin') {
      throw new Error('Permission denied. Only administrators can run cleanup.');
    }

    try {
      // First mark posts as expired
      const markResults = await markExpiredPosts();
      
      // Then delete posts that have been expired for 30+ days
      const cleanupResults = await cleanupExpiredPosts();
      
      return {
        marked: markResults,
        deleted: cleanupResults,
        message: `Cleanup completed: Marked ${markResults.markedJobs} jobs and ${markResults.markedProfiles} profiles as expired. Deleted ${cleanupResults.deletedJobs} jobs and ${cleanupResults.deletedProfiles} profiles that were expired for 30+ days.`
      };
    } catch (error: any) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }, [currentUser]);

  const canRunCleanup = currentUser?.role === 'Admin';

  return {
    runCleanup,
    canRunCleanup
  };
};