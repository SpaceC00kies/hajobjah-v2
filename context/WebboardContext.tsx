import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { WebboardPost, WebboardComment } from '../types/types.ts';
import { subscribeToAllWebboardPostsService, subscribeToWebboardCommentsService } from '../services/webboardService.ts';

interface WebboardContextType {
  allWebboardPostsForAdmin: WebboardPost[];
  webboardComments: WebboardComment[];
}

export const WebboardContext = createContext<WebboardContextType | undefined>(undefined);

export const WebboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allWebboardPostsForAdmin, setAllWebboardPostsForAdmin] = useState<WebboardPost[]>([]);
  const [webboardComments, setWebboardComments] = useState<WebboardComment[]>([]);

  useEffect(() => {
    const unsubPosts = subscribeToAllWebboardPostsService(setAllWebboardPostsForAdmin);
    const unsubComments = subscribeToWebboardCommentsService(setWebboardComments);
    return () => {
      unsubPosts();
      unsubComments();
    };
  }, []);

  const value = useMemo(() => ({
    allWebboardPostsForAdmin,
    webboardComments,
  }), [allWebboardPostsForAdmin, webboardComments]);

  return (
    <WebboardContext.Provider value={value}>
      {children}
    </WebboardContext.Provider>
  );
};