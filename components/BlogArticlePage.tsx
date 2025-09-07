
import React, { useEffect, useMemo } from 'react';
import { Button } from './Button.tsx';
import { motion } from 'framer-motion';
import { useBlog } from '../hooks/useBlog.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useParams } from 'react-router-dom';
import { useUser } from '../hooks/useUser.ts';
import { useData } from '../context/DataContext.tsx';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata.ts';
import { JsonLdSchema } from './JsonLdSchema.tsx';


const formatDate = (dateInput?: string | Date): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  return date.toLocaleDateString('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const BlogArticlePage: React.FC = () => {
  const { articleSlug } = useParams<{ articleSlug: string }>();
  const { currentUser } = useAuth();
  const { allBlogPosts } = useBlog();
  const { saveBlogPost } = useUser();
  const { userSavedBlogPosts } = useData();

  const post = useMemo(() => allBlogPosts.find(p => p.slug === articleSlug), [allBlogPosts, articleSlug]);

  useDocumentMetadata({
    title: `${post?.metaTitle || post?.title || 'บทความ'} | HAJOBJA.COM`,
    description: post?.excerpt || 'อ่านบทความดีๆ จาก HAJOBJA.COM',
    imageUrl: post?.coverImageURL,
    url: window.location.href,
  });

  const isSaved = useMemo(() => !!post && userSavedBlogPosts.includes(post.id), [userSavedBlogPosts, post]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [post?.id]);

  if (!post) {
    return (
      <div className="text-center p-8" role="alert" aria-live="polite">
        <h1 className="text-2xl font-bold text-neutral-dark mb-4">ไม่พบบทความ</h1>
        <p className="text-neutral-medium">ขออภัย ไม่พบบทความที่คุณกำลังมองหา</p>
      </div>
    );
  }

  return (
    <>
      <JsonLdSchema post={post} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen overflow-x-hidden relative mt-20 sm:mt-24"
      >
        {/* Skip to content link for accessibility */}
        <a
          href="#article-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-blue text-white px-4 py-2 rounded-md z-50"
        >
          ข้ามไปยังเนื้อหาบทความ
        </a>



        {/* Full Width Cover Image - Both Mobile and Desktop */}
        {post.coverImageURL && (
          <div className="relative">
            <figure className="mb-0 mobile-cover-container">
              <img
                src={post.coverImageURL}
                alt={post.coverImageAltText || `ภาพประกอบบทความ: ${post.title}`}
                className="mobile-cover-image"
                loading="lazy"
                decoding="async"
                itemProp="image"
              />
            </figure>
          </div>
        )}

        {/* Main Article */}
        <main>
          <article
            className="sm:max-w-4xl sm:mx-auto"
            itemScope
            itemType="https://schema.org/Article"
          >

            <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12 sm:mt-0">
              {/* Category Badge */}
              <div className="mb-1">
                <div className="article-category blog-font-header" itemProp="articleSection">
                  {post.category}
                </div>
              </div>

              {/* Author & Date Line with Bookmark Icon - DIRECTLY below category */}
              <div className="flex items-center gap-3 mb-8" itemProp="author" itemScope itemType="https://schema.org/Person">
                <div className="flex items-center gap-2 text-sm text-neutral-600 blog-font-header">
                  <span className="article-author-name font-medium" itemProp="name">
                    {post.authorDisplayName}
                  </span>
                  <span>|</span>
                  <time
                    className="article-publish-date"
                    dateTime={typeof post.publishedAt === 'string' ? post.publishedAt : post.publishedAt?.toISOString()}
                    itemProp="datePublished"
                  >
                    {formatDate(post.publishedAt)}
                  </time>
                </div>

                {/* Bookmark Icon */}
                {currentUser && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.blur();
                      setTimeout(() => {
                        if (document.activeElement) {
                          (document.activeElement as HTMLElement).blur();
                        }
                      }, 0);
                      saveBlogPost(post.id);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                    }}
                    aria-label={isSaved ? 'บทความนี้ถูกบันทึกแล้ว คลิกเพื่อยกเลิกการบันทึก' : 'บันทึกบทความนี้'}
                    aria-pressed={isSaved}
                    className="p-1 rounded-full transition-colors focus:outline-none bookmark-button-fixed"
                  >
                    <svg
                      className={`w-4 h-4 transition-colors ${isSaved ? 'fill-current' : 'text-neutral-400 hover:text-primary-blue'}`}
                      style={isSaved ? { color: '#2c03e5' } : {}}
                      fill={isSaved ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Article Header - Magazine Style */}
              <header className="article-header-magazine">
                <h1 className="article-title-magazine" itemProp="headline">
                  {post.title}
                </h1>
              </header>

              {/* Article Content */}
              <div
                id="article-content"
                className="article-content article-content-formatted blog-font-body"
                itemProp="articleBody"
                dangerouslySetInnerHTML={{ __html: post.content }}
                role="main"
                aria-label="เนื้อหาบทความ"
              />

              {/* Scroll to Top Button */}
              <div className="flex justify-center pt-8 pb-6">
                <Button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  variant="outline"
                  colorScheme="neutral"
                  size="sm"
                  aria-label="กลับไปด้านบน"
                  className="bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-sm"
                  style={{
                    borderColor: '#2c03e5',
                    color: '#2c03e5',
                    fontFamily: 'Athiti, ui-sans-serif, system-ui, sans-serif'
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="text-sm font-medium">กลับไปด้านบน</span>
                </Button>
              </div>

            </div>
          </article>
        </main>
      </motion.div>
    </>
  );
};
