import React, { memo, useState, useEffect, useRef } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface FastLottieProps {
  src: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  title?: string;
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: React.CSSProperties;
  fallbackEmoji?: string;
  priority?: 'high' | 'low'; // For loading priority
}

// Global cache for preloaded animations
const animationCache = new Map<string, boolean>();
const preloadQueue = new Set<string>();

// Preload animation function
const preloadAnimation = (src: string): Promise<void> => {
  return new Promise((resolve) => {
    if (animationCache.has(src) || preloadQueue.has(src)) {
      resolve();
      return;
    }

    preloadQueue.add(src);

    // Create a hidden iframe to preload the animation
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';

    const embedSrc = src.includes('/embed/')
      ? src
      : src.replace(/https:\/\/lottie\.host\/([^/]+)\/([^/]+)\.lottie/, 'https://lottie.host/embed/$1/$2.lottie');

    iframe.onload = () => {
      animationCache.set(src, true);
      preloadQueue.delete(src);
      document.body.removeChild(iframe);
      resolve();
    };

    iframe.onerror = () => {
      preloadQueue.delete(src);
      document.body.removeChild(iframe);
      resolve();
    };

    iframe.src = embedSrc;
    document.body.appendChild(iframe);
  });
};

const FastLottieComponent: React.FC<FastLottieProps> = ({
  src,
  width = '100%',
  height = '100%',
  className = '',
  title,
  autoplay = true,
  loop = true,
  speed = 1,
  style = {},
  fallbackEmoji = '🎬',
  priority = 'low'
}) => {
  const [hasError, setHasError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [, setIsPreloaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Detect mobile devices
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
  }, []);

  useEffect(() => {
    // Preload animation for faster subsequent loads
    if (isMobile && priority === 'high') {
      preloadAnimation(src).then(() => {
        setIsPreloaded(true);
      });
    } else if (isMobile) {
      // For low priority, preload after a delay
      const timer = setTimeout(() => {
        preloadAnimation(src).then(() => {
          setIsPreloaded(true);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [src, isMobile, priority]);



  // For mobile devices, use optimized iframe with preloading
  if (isMobile) {
    const embedSrc = src.includes('/embed/')
      ? src
      : src.replace(/https:\/\/lottie\.host\/([^/]+)\/([^/]+)\.lottie/, 'https://lottie.host/embed/$1/$2.lottie');

    return (
      <div
        className={`relative ${className}`}
        style={{ width, height, ...style }}
        title={title}
      >
        <iframe
          ref={iframeRef}
          src={embedSrc}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            pointerEvents: style.pointerEvents || 'auto'
          }}
          title={title}
          loading={priority === 'high' ? 'eager' : 'lazy'}
          allow="autoplay"
          // Optimize iframe for mobile performance
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    );
  }

  // For desktop with errors, show fallback
  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height, ...style }}
        title={title}
      >
        <span style={{ fontSize: '2rem' }}>{fallbackEmoji}</span>
      </div>
    );
  }

  // Convert relative path to absolute URL for DotLottieReact
  const absoluteSrc = src.startsWith('/') ? `${window.location.origin}${src}` : src;

  return (
    <div
      className={`relative ${className}`}
      style={{ width, height, ...style }}
      title={title}
    >
      <DotLottieReact
        src={absoluteSrc}
        autoplay={autoplay}
        loop={loop}
        speed={speed}
        style={{
          width: '100%',
          height: '100%'
        }}
        onError={() => setHasError(true)}
      />
    </div>
  );
};

export const FastLottie = memo(FastLottieComponent);