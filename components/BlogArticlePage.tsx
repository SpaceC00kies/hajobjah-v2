import React, { useEffect, useMemo } from 'react';
import type { EnrichedBlogPost, BlogComment, User } from '../types/types.ts';
import { Button } from './Button.tsx';
import { motion } from 'framer-motion';
import { BlogCommentItem } from './BlogCommentItem.tsx';
import { BlogCommentForm } from './BlogCommentForm.tsx';
import { useBlog } from '../hooks/useBlog.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useNavigate, useParams } from 'react-router-dom';

interface BlogArticlePageProps {
  onVouchForUser: (userToVouch: User) => void;
}

const formatDate = (dateInput?: string | Date): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const BlogArticlePage: React.FC<BlogArticlePageProps> = ({ onVouchForUser }) => {
  const { articleSlug } = useParams<{ articleSlug: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { allBlogPosts, blogComments, toggleBlogPostLike, addBlogComment, updateBlogComment, deleteBlogComment } = useBlog();

  const post = useMemo(() => allBlogPosts.find(p => p.slug === articleSlug), [allBlogPosts, articleSlug]);
  const commentsForPost = useMemo(() => blogComments.filter(c => c.postId === post?.id), [blogComments, post?.id]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [post?.id]);

  const canEditOrDelete = (userId: string) => {
    if (!currentUser) return false;
    return currentUser.id === userId || currentUser.role === 'Admin';
  }

  if (!post) {
    return <div className="text-center p-8">Article not found.</div>;
  }

  const hasLiked = currentUser && post.likes.includes(currentUser.id);
    
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
        <Button onClick={() => navigate('/blog')} variant="outline" colorScheme="neutral" size="sm" className="mb-4">
            &larr; กลับไปหน้ารวมบทความ
        </Button>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {post.coverImageURL && (
                <img src={post.coverImageURL} alt={post.title} className="w-full h-64 md:h-80 object-cover" loading="lazy" decoding="async" />
            )}
            <div className="p-6 sm:p-10">
                <p className="text-base font-semibold text-rose-700 mb-2">{post.category}</p>
                <h1 className="text-3xl md:text-4xl font-bold font-sans text-neutral-dark mb-4">{post.title}</h1>
                
                <div className="flex justify-between items-center text-sm text-neutral-medium font-sans border-t border-b border-neutral-DEFAULT py-3 my-4">
                    <div className="flex items-center">
                        {post.authorPhotoURL ? (
                            <img src={post.authorPhotoURL} alt={post.authorDisplayName} className="w-10 h-10 rounded-full object-cover mr-3" loading="lazy" decoding="async"/>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-neutral-light flex items-center justify-center mr-3 text-lg font-bold text-neutral-dark">
                                {post.authorDisplayName.charAt(0)}
                            </div>
                        )}
                        <div>
                            <p className="font-semibold text-neutral-dark">{post.authorDisplayName}</p>
                            <p className="text-xs">{formatDate(post.publishedAt)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {currentUser && (
                            <Button onClick={() => toggleBlogPostLike(post.id)} size="sm" variant="outline" colorScheme={hasLiked ? 'primary' : 'neutral'}>
                                ❤️ {post.likeCount || 0}
                            </Button>
                        )}
                    </div>
                </div>

                <div
                    className="prose prose-lg max-w-none font-serif mt-6 text-neutral-dark"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                <div className="mt-8 pt-6 border-t border-neutral-DEFAULT">
                    <h2 className="text-2xl font-bold font-sans text-neutral-dark mb-4">ความคิดเห็น ({commentsForPost.length})</h2>
                    <div className="space-y-6">
                        {commentsForPost.map(comment => (
                            <BlogCommentItem
                                key={comment.id}
                                comment={comment}
                                currentUser={currentUser}
                                onUpdateComment={updateBlogComment}
                                onDeleteComment={deleteBlogComment}
                                canEditOrDelete={canEditOrDelete}
                            />
                        ))}
                    </div>
                    <div className="mt-8">
                        <BlogCommentForm
                            postId={post.id}
                            currentUser={currentUser}
                            onAddComment={addBlogComment}
                        />
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
  );
};
