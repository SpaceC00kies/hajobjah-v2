
import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { WebboardPost, WebboardComment } from '../types/types.ts';
import { subscribeToAllWebboardPostsService, subscribeToWebboardCommentsService } from '../services/webboardService.ts';

interface WebboardContextType {
  allWebboardPostsForAdmin: WebboardPost[];
  webboardComments: WebboardComment[];
  isLoadingPosts: boolean;
  isLoadingComments: boolean;
}

export const WebboardContext = createContext<WebboardContextType | undefined>(undefined);

export const WebboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allWebboardPostsForAdmin, setAllWebboardPostsForAdmin] = useState<WebboardPost[]>([]);
  const [webboardComments, setWebboardComments] = useState<WebboardComment[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  useEffect(() => {
    const unsubPosts = subscribeToAllWebboardPostsService((posts) => {
      setAllWebboardPostsForAdmin(posts);
      setIsLoadingPosts(false);
    });
    const unsubComments = subscribeToWebboardCommentsService((comments) => {
      setWebboardComments(comments);
      setIsLoadingComments(false);
    });
    return () => {
      unsubPosts();
      unsubComments();
    };
  }, []);

  const value = useMemo(() => ({
    allWebboardPostsForAdmin,
    webboardComments,
    isLoadingPosts,
    isLoadingComments,
  }), [allWebboardPostsForAdmin, webboardComments, isLoadingPosts, isLoadingComments]);

  return (
    <WebboardContext.Provider value={value}>
      {children}
    </WebboardContext.Provider>
  );
};
