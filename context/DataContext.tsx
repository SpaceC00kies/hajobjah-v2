import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import type { User, Interaction, WebboardPost, WebboardComment, Job, HelperProfile, VouchReport, BlogPost, Interest, Cursor } from '../types/types.ts';
import { useAuth } from './AuthContext.tsx';
import { subscribeToUsersService, subscribeToUserSavedPostsService } from '../services/userService.ts';
import { getJobsPaginated } from '../services/jobService.ts';
import { getHelperProfilesPaginated } from '../services/helperProfileService.ts';
import { getWebboardPostsPaginated as getWebboardPostsPaginatedService, subscribeToWebboardCommentsService } from '../services/webboardService.ts';
import { subscribeToInteractionsService, subscribeToUserInterestsService } from '../services/interactionService.ts';
import { subscribeToVouchReportsService } from '../services/adminService.ts';
import { getAllBlogPosts, getBlogPostsForAdmin } from '../services/blogService.ts';

interface DataContextType {
  users: User[];
  interactions: Interaction[];
  allBlogPosts: BlogPost[];
  allBlogPostsForAdmin: BlogPost[];
  allWebboardPostsForAdmin: WebboardPost[];
  webboardComments: WebboardComment[];
  allJobsForAdmin: Job[];
  allHelperProfilesForAdmin: HelperProfile[];
  vouchReports: VouchReport[];
  userSavedPosts: string[];
  userInterests: Interest[];
  isLoadingData: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth(); // Get currentUser to fetch user-specific data

  // Global Data States
  const [users, setUsers] = useState<User[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [allBlogPosts, setAllBlogPosts] = useState<BlogPost[]>([]);
  const [allBlogPostsForAdmin, setAllBlogPostsForAdmin] = useState<BlogPost[]>([]);
  const [allWebboardPostsForAdmin, setAllWebboardPostsForAdmin] = useState<WebboardPost[]>([]);
  const [webboardComments, setWebboardComments] = useState<WebboardComment[]>([]);
  const [allJobsForAdmin, setAllJobsForAdmin] = useState<Job[]>([]);
  const [allHelperProfilesForAdmin, setAllHelperProfilesForAdmin] = useState<HelperProfile[]>([]);
  const [vouchReports, setVouchReports] = useState<VouchReport[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // User-Specific Data States
  const [userSavedPosts, setUserSavedPosts] = useState<string[]>([]);
  const [userInterests, setUserInterests] = useState<Interest[]>([]);

  // Effect for Global (non-user-specific) Data
  useEffect(() => {
    // These functions fetch all documents without pagination, suitable for admin use.
    const fetchAllPaginatedData = async () => {
      const fetchJobs = async () => {
        let allItems: Job[] = [];
        let lastDoc: Cursor | null = null;
        let hasMore = true;
        while (hasMore) {
          const batch = await getJobsPaginated(50, lastDoc);
          allItems = [...allItems, ...batch.items];
          lastDoc = batch.cursor;
          hasMore = !!batch.cursor;
        }
        setAllJobsForAdmin(allItems);
      };

      const fetchHelperProfiles = async () => {
        let allItems: HelperProfile[] = [];
        let lastDoc: Cursor | null = null;
        let hasMore = true;
        while (hasMore) {
          const batch = await getHelperProfilesPaginated(50, lastDoc);
          allItems = [...allItems, ...batch.items];
          lastDoc = batch.cursor;
          hasMore = !!batch.cursor;
        }
        setAllHelperProfilesForAdmin(allItems);
      };

      const fetchWebboardPosts = async () => {
        let allItems: WebboardPost[] = [];
        let lastDoc: Cursor | null = null;
        let hasMore = true;
        while (hasMore) {
          const batch = await getWebboardPostsPaginatedService(50, lastDoc);
          allItems = [...allItems, ...batch.items];
          lastDoc = batch.cursor;
          hasMore = !!batch.cursor;
        }
        setAllWebboardPostsForAdmin(allItems);
      };

      const fetchBlogData = async () => {
        const publicPosts = await getAllBlogPosts();
        setAllBlogPosts(publicPosts);
        const adminPosts = await getBlogPostsForAdmin();
        setAllBlogPostsForAdmin(adminPosts);
      };

      // Execute all fetches in parallel
      await Promise.all([
        fetchJobs(),
        fetchHelperProfiles(),
        fetchWebboardPosts(),
        fetchBlogData(),
      ]);
    };

    // Real-time subscriptions
    const unsubscribeUsers = subscribeToUsersService(setUsers);
    const unsubscribeWebboardComments = subscribeToWebboardCommentsService(setWebboardComments);
    const unsubscribeInteractions = subscribeToInteractionsService(setInteractions);
    const unsubscribeVouchReports = subscribeToVouchReportsService(setVouchReports);

    // Initial load of all paginated data, then set loading to false.
    fetchAllPaginatedData().finally(() => setIsLoadingData(false));

    // Cleanup subscriptions on component unmount
    return () => {
      unsubscribeUsers();
      unsubscribeWebboardComments();
      unsubscribeInteractions();
      unsubscribeVouchReports();
    };
  }, []);

  // Effect for User-Specific Data Subscriptions
  useEffect(() => {
    let unsubSavedPosts: (() => void) | undefined;
    let unsubInterests: (() => void) | undefined;

    if (currentUser?.id) {
      unsubSavedPosts = subscribeToUserSavedPostsService(currentUser.id, setUserSavedPosts);
      unsubInterests = subscribeToUserInterestsService(currentUser.id, setUserInterests);
    } else {
      // Clear user-specific data on logout
      setUserSavedPosts([]);
      setUserInterests([]);
    }

    // Cleanup user-specific subscriptions
    return () => {
      if (unsubSavedPosts) unsubSavedPosts();
      if (unsubInterests) unsubInterests();
    };
  }, [currentUser?.id]); // Re-run only when the user ID changes (login/logout)


  const value = useMemo(() => ({
    users,
    interactions,
    allBlogPosts,
    allBlogPostsForAdmin,
    allWebboardPostsForAdmin,
    webboardComments,
    allJobsForAdmin,
    allHelperProfilesForAdmin,
    vouchReports,
    userSavedPosts,
    userInterests,
    isLoadingData,
  }), [
    users,
    interactions,
    allBlogPosts,
    allBlogPostsForAdmin,
    allWebboardPostsForAdmin,
    webboardComments,
    allJobsForAdmin,
    allHelperProfilesForAdmin,
vouchReports,
    userSavedPosts,
    userInterests,
    isLoadingData,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};