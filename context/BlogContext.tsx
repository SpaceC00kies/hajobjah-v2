
import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { BlogPost, BlogComment } from '../types/types.ts';
import { subscribeToAllBlogPostsService, subscribeToAllBlogPostsForAdminService, subscribeToAllBlogCommentsService } from '../services/blogService.ts';

interface BlogContextType {
  allBlogPosts: BlogPost[];
  allBlogPostsForAdmin: BlogPost[];
  blogComments: BlogComment[];
  isLoadingBlog: boolean;
}

export const BlogContext = createContext<BlogContextType | undefined>(undefined);

export const BlogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allBlogPosts, setAllBlogPosts] = useState<BlogPost[]>([]);
  const [allBlogPostsForAdmin, setAllBlogPostsForAdmin] = useState<BlogPost[]>([]);
  const [blogComments, setBlogComments] = useState<BlogComment[]>([]);
  const [isLoadingBlog, setIsLoadingBlog] = useState(true);

  useEffect(() => {
    setIsLoadingBlog(true);

    const unsubPublicPosts = subscribeToAllBlogPostsService((posts) => {
      setAllBlogPosts(posts);
      // Consider loading state resolved when both are loaded.
    });

    const unsubAdminPosts = subscribeToAllBlogPostsForAdminService((posts) => {
      setAllBlogPostsForAdmin(posts);
      setIsLoadingBlog(false); 
    });
    
    const unsubComments = subscribeToAllBlogCommentsService(setBlogComments);
    
    return () => {
      unsubPublicPosts();
      unsubAdminPosts();
      unsubComments();
    };
  }, []);

  const value = useMemo(() => ({
    allBlogPosts,
    allBlogPostsForAdmin,
    blogComments,
    isLoadingBlog,
  }), [allBlogPosts, allBlogPostsForAdmin, blogComments, isLoadingBlog]);

  return (
    <BlogContext.Provider value={value}>
      {children}
    </BlogContext.Provider>
  );
};
