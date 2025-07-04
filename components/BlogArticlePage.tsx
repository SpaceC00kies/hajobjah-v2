import React, { useEffect } from 'react';
import type { EnrichedBlogPost, BlogComment, User } from '../types.ts';
import { Button } from './Button.tsx';
import { motion } from 'framer-motion';
import { BlogCommentItem } from './BlogCommentItem.tsx';
import { BlogCommentForm } from './BlogCommentForm.tsx';

interface BlogArticlePageProps {
  post: EnrichedBlogPost;
  onBack: () => void;
  comments: BlogComment[];
  currentUser: User | null;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onUpdateComment: (commentId: string, newText: string) => void;
  onDeleteComment: (commentId: string) => void;
  canEditOrDelete: (userId: string) => boolean;
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

export const BlogArticlePage: React.FC<BlogArticlePageProps> = ({ 
    post, 
    onBack,
    comments,
    currentUser,
    onToggleLike,
    onAddComment,
    onUpdateComment,
    onDeleteComment,
    canEditOrDelete
}) => {
    
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [post.id]);

  const hasLiked = currentUser && post.likes.includes(currentUser.id);
    
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
        <Button onClick={onBack} variant="outline" colorScheme="neutral" size="sm" className="mb-8">
            &larr; กลับไปหน้ารวมบทความ
        </Button>

      <article className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-lg border border-neutral-DEFAULT/30">
        <header className="mb-8 text-center">
          <p className="text-base font-semibold text-secondary-hover uppercase tracking-wider mb-2">
            {post.category}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold font-sans text-neutral-dark leading-tight">
            {post.title}
          </h1>
          <div className="mt-6 flex justify-center items-center">
             {post.authorPhotoURL ? (
                 <img src={post.authorPhotoURL} alt={post.authorDisplayName} className="w-12 h-12 rounded-full object-cover mr-4"/>
            ) : (
                <div className="w-12 h-12 rounded-full bg-neutral-light flex items-center justify-center mr-4 text-xl font-bold text-neutral-dark">
                    {post.authorDisplayName.charAt(0)}
                </div>
            )}
            <div>
                <p className="text-md font-semibold font-sans text-neutral-dark">{post.authorDisplayName}</p>
                <p className="text-sm text-neutral-medium">{formatDate(post.publishedAt)}</p>
            </div>
          </div>
        </header>

        <div className="mb-8">
          <img 
            src={post.coverImageURL} 
            alt={post.title} 
            className="w-full h-auto max-h-96 object-cover rounded-lg shadow-md" 
          />
        </div>

        <div 
          className="prose prose-lg max-w-none font-serif text-neutral-dark leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <footer className="mt-10 pt-6 border-t border-neutral-DEFAULT/50 flex justify-between items-center">
            <Button
                onClick={() => onToggleLike(post.id)}
                variant={hasLiked ? 'secondary' : 'outline'}
                colorScheme="secondary"
                disabled={!currentUser}
            >
                👍 {hasLiked ? 'Liked' : 'Like'} ({post.likeCount})
            </Button>
        </footer>

      </article>

        <section className="max-w-3xl mx-auto mt-8">
            <h3 className="text-2xl font-bold font-sans text-neutral-dark mb-4">{comments.length} ความคิดเห็น</h3>
            <BlogCommentForm postId={post.id} currentUser={currentUser} onAddComment={onAddComment}/>
             <div className="mt-6 space-y-4">
                {comments.map(comment => (
                    <BlogCommentItem 
                        key={comment.id} 
                        comment={comment}
                        currentUser={currentUser}
                        onUpdateComment={onUpdateComment}
                        onDeleteComment={onDeleteComment}
                        canEditOrDelete={canEditOrDelete}
                    />
                ))}
            </div>
        </section>

    </motion.div>
  );
};
