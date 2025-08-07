import { useEffect, useRef } from 'react';

interface Metadata {
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
}

// A simple map to keep track of meta tags we've created by this hook
const managedMetaTags = new Set<HTMLElement>();

export const useDocumentMetadata = (metadata: Metadata) => {
  const previousMetadataRef = useRef<Metadata | null>(null);

  useEffect(() => {
    // Only update if metadata has actually changed to avoid unnecessary DOM manipulation
    if (JSON.stringify(previousMetadataRef.current) === JSON.stringify(metadata)) {
      return;
    }

    const { title, description, imageUrl, url } = metadata;

    // 1. Update Title
    document.title = title;

    // 2. Clean up old meta tags created by this hook
    managedMetaTags.forEach(tag => {
      tag.remove();
    });
    managedMetaTags.clear();

    // 3. Helper to create and add a meta tag
    const addMetaTag = (name: string, content: string) => {
      if (!content) return;
      const meta = document.createElement('meta');
      meta.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
      managedMetaTags.add(meta);
    };

    // 4. Set new meta tags
    addMetaTag('description', description);
    
    // Open Graph (for Facebook, LinkedIn, etc.)
    addMetaTag('og:title', title);
    addMetaTag('og:description', description);
    addMetaTag('og:url', url);
    addMetaTag('og:type', 'article');
    if (imageUrl) {
      addMetaTag('og:image', imageUrl);
    }
    addMetaTag('og:site_name', 'HAJOBJA.COM');

    // Twitter Card
    addMetaTag('twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    addMetaTag('twitter:title', title);
    addMetaTag('twitter:description', description);
    if (imageUrl) {
      addMetaTag('twitter:image', imageUrl);
    }
    
    // 5. Update ref for next render
    previousMetadataRef.current = metadata;

    // 6. Cleanup on unmount
    return () => {
      managedMetaTags.forEach(tag => {
        tag.remove();
      });
      managedMetaTags.clear();
      document.title = 'HAJOBJA.COM';
    };
  }, [metadata]);
};
