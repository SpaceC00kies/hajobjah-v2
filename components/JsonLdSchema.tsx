import React from 'react';
import type { EnrichedBlogPost } from '../types/types';

interface JsonLdSchemaProps {
  post: EnrichedBlogPost;
}

export const JsonLdSchema: React.FC<JsonLdSchemaProps> = ({ post }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": window.location.href
    },
    "headline": post.title,
    "description": post.excerpt,
    "image": post.coverImageURL || undefined,
    "author": {
      "@type": "Person",
      "name": post.authorDisplayName
    },
    "publisher": {
      "@type": "Organization",
      "name": "HAJOBJA.COM",
      "logo": {
        "@type": "ImageObject",
        // Assuming a logo exists at this path. Update if necessary.
        "url": "https://www.hajobja.com/logo.png" 
      }
    },
    "datePublished": post.publishedAt ? new Date(post.publishedAt as string).toISOString() : new Date(post.createdAt as string).toISOString(),
    "dateModified": new Date(post.updatedAt as string).toISOString()
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};
