"use client";

import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import type { User, Interaction, WebboardPost, WebboardComment, Job, HelperProfile, VouchReport, BlogPost, Interest, Cursor, Vouch, PlatformVitals, ChartDataPoint, AdminDashboardData } from '../types/types';
import { useAuth } from './AuthContext';
import { subscribeToUsersService, subscribeToUserSavedPostsService } from '../services/userService';
import { subscribeToAllJobsService } from '../services/jobService';
import { subscribeToAllHelperProfilesService } from '../services/helperProfileService';
import { subscribeToWebboardCommentsService, subscribeToAllWebboardPostsService } from '../services/webboardService';
import { subscribeToInteractionsService, subscribeToUserInterestsService } from '../services/interactionService';
import { subscribeToVouchReportsService } from '../services/adminService';
import { getAllBlogPosts, getBlogPostsForAdmin } from '../services/blogService';

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

  // Modal State
  isConfirmModalOpen: boolean;
  confirmModalMessage: string;
  confirmModalTitle: string;
  onConfirmAction: (() => void) | null;
  isFeedbackModalOpen: boolean;
  isForgotPasswordModalOpen: boolean;
  isLocationModalOpen: boolean;
  vouchModalData: { userToVouch: User } | null;
  vouchListModalData: { userToList: User } | null;
  reportVouchModalData: { vouchToReport: Vouch } | null;

  // Modal Actions
  openConfirmModal: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirmModal: () => void;
  setIsFeedbackModalOpen: (isOpen: boolean) => void;
  setIsForgotPasswordModalOpen: (isOpen: boolean) => void;
  setIsLocationModalOpen: (isOpen: boolean) => void;
  setVouchModalData: (data: { userToVouch: User } | null) => void;
  setVouchListModalData: (data: { userToList: User } | null) => void;
  setReportVouchModalData: (data: { vouchToReport: Vouch } | null) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

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
  
  // Modal states migrated from App.tsx
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [vouchModalData, setVouchModalData] = useState<{ userToVouch: User } | null>(null);
  const [vouchListModalData, setVouchListModalData] = useState<{ userToList: User } | null>(null);
  const [reportVouchModalData, setReportVouchModalData] = useState<{ vouchToReport: Vouch } | null>(null);

  // Modal action functions
  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalTitle(title); 
    setConfirmModalMessage(message); 
    setOnConfirmAction(() => onConfirm); 
    setIsConfirmModalOpen(true);
  };
  const closeConfirmModal = () => { 
    setIsConfirmModalOpen(false); 
    setConfirmModalMessage(''); 
    setConfirmModalTitle(''); 
    setOnConfirmAction(null); 
  };


  useEffect(() => {
    setIsLoadingData(true);
    const fetchBlogData = async () => {
      const publicPosts = await getAllBlogPosts();
      setAllBlogPosts(publicPosts);
      const adminPosts = await getBlogPostsForAdmin();
      setAllBlogPostsForAdmin(adminPosts);
    };

    const initialLoad = async () => {
        await fetchBlogData();
        setIsLoadingData(false);
    };

    const unsubscribeUsers = subscribeToUsersService(setUsers);
    const unsubscribeWebboardComments = subscribeToWebboardCommentsService(setWebboardComments);
    const unsubscribeInteractions = subscribeToInteractionsService(setInteractions);
    const unsubscribeVouchReports = subscribeToVouchReportsService(setVouchReports);
    const unsubscribeJobs = subscribeToAllJobsService(setAllJobsForAdmin);
    const unsubscribeHelperProfiles = subscribeToAllHelperProfilesService(setAllHelperProfilesForAdmin);
    const unsubscribeWebboardPosts = subscribeToAllWebboardPostsService(setAllWebboardPostsForAdmin);

    initialLoad();

    return () => {
      unsubscribeUsers();
      unsubscribeWebboardComments();
      unsubscribeInteractions();
      unsubscribeVouchReports();
      unsubscribeJobs();
      unsubscribeHelperProfiles();
      unsubscribeWebboardPosts();
    };
  }, []);

  useEffect(() => {
    let unsubSavedPosts: (() => void) | undefined;
    let unsubInterests: (() => void) | undefined;

    if (currentUser?.id) {
      unsubSavedPosts = subscribeToUserSavedPostsService(currentUser.id, setUserSavedPosts);
      unsubInterests = subscribeToUserInterestsService(currentUser.id, setUserInterests);
    } else {
      setUserSavedPosts([]);
      setUserInterests([]);
    }

    return () => {
      if (unsubSavedPosts) unsubSavedPosts();
      if (unsubInterests) unsubInterests();
    };
  }, [currentUser?.id]);


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
    // Modals
    isConfirmModalOpen,
    confirmModalMessage,
    confirmModalTitle,
    onConfirmAction,
    isFeedbackModalOpen,
    isForgotPasswordModalOpen,
    isLocationModalOpen,
    vouchModalData,
    vouchListModalData,
    reportVouchModalData,
    openConfirmModal,
    closeConfirmModal,
    setIsFeedbackModalOpen,
    setIsForgotPasswordModalOpen,
    setIsLocationModalOpen,
    setVouchModalData,
    setVouchListModalData,
    setReportVouchModalData,
  }), [
    users, interactions, allBlogPosts, allBlogPostsForAdmin, allWebboardPostsForAdmin,
    webboardComments, allJobsForAdmin, allHelperProfilesForAdmin, vouchReports, userSavedPosts,
    userInterests, isLoadingData, isConfirmModalOpen, confirmModalMessage, confirmModalTitle,
    onConfirmAction, isFeedbackModalOpen, isForgotPasswordModalOpen, isLocationModalOpen,
    vouchModalData, vouchListModalData, reportVouchModalData
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