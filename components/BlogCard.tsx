
import React from 'react';
import type { EnrichedBlogPost } from '../types/types.ts';

interface BlogCardProps {
  post: EnrichedBlogPost;
  onSelectPost: (slug: string) => void;
  featured?: boolean;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post, onSelectPost, featured = false }) => {

  return (
    <article
      className={`${featured ? 'blog-card-featured' : 'blog-card-clean'} cursor-pointer group`}
      onClick={() => onSelectPost(post.slug)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectPost(post.slug);
        }
      }}
      aria-label={`อ่านบทความ: ${post.title}`}
    >
      {/* Image Container */}
      <div className={featured ? "blog-card-featured-image-wrapper" : "blog-card-clean-image-wrapper"}>
        {(post.cardImageURL || post.coverImageURL) ? (
          <div
            className={featured ? "blog-card-featured-image" : "blog-card-clean-image"}
            style={{
              backgroundImage: `url(${post.cardImageURL || post.coverImageURL})`,
            }}
          />
        ) : (
          <div className={`${featured ? "blog-card-featured-image" : "blog-card-clean-image"} ${featured ? "blog-card-featured-placeholder" : "blog-card-clean-placeholder"}`}>
            <div className={featured ? "blog-card-featured-placeholder-content" : "blog-card-clean-placeholder-content"}>
              <span className="text-6xl opacity-30">📖</span>
            </div>
          </div>
        )}
      </div>

      {/* Content Below Image */}
      <div className={featured ? "blog-card-featured-content" : "blog-card-clean-content"}>
        {featured ? (
          <>
            {/* Featured: Title first, then Excerpt, then Category */}
            <h3 className="blog-card-featured-title blog-font-header">
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="blog-card-featured-excerpt blog-font-body">
                {post.excerpt}
              </p>
            )}
            <div className="blog-card-featured-category blog-font-header">
              {post.category}
            </div>
          </>
        ) : (
          <>
            {/* Regular: Category first, then Title */}
            <div className="blog-card-clean-category blog-font-header">
              {post.category}
            </div>
            <h3 className="blog-card-clean-title blog-font-header">
              {post.title}
            </h3>
          </>
        )}
      </div>
    </article>
  );
};
