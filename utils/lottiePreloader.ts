// Lottie Animation Preloader for Mobile Performance Optimization
// This utility preloads critical animations on app startup for faster mobile experience

interface PreloadConfig {
  src: string;
  priority: 'critical' | 'high' | 'low';
  delay?: number;
}

// Critical animations that should load immediately
const CRITICAL_ANIMATIONS: PreloadConfig[] = [
  {
    src: 'https://lottie.host/dea64b7c-31e7-4c7a-8b2d-c34914e1ed05/dozIYy35G2.lottie',
    priority: 'critical'
  }
];

// High priority animations that should load after critical ones
const HIGH_PRIORITY_ANIMATIONS: PreloadConfig[] = [
  {
    src: 'https://lottie.host/66d7b594-e55f-4009-95c6-973c443ca44f/H5nAQT6qnO.lottie',
    priority: 'high',
    delay: 200
  },
  {
    src: 'https://lottie.host/a8f69183-d5b6-42b9-a728-d647b294b2f6/RbAE7JTZfY.lottie',
    priority: 'high',
    delay: 400
  }
];

class LottiePreloader {
  private preloadedUrls = new Set<string>();
  private preloadQueue = new Map<string, Promise<void>>();
  private isMobile = false;

  constructor() {
    this.detectMobile();
    this.startPreloading();
  }

  private detectMobile(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    this.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
  }

  private async preloadAnimation(config: PreloadConfig): Promise<void> {
    if (this.preloadedUrls.has(config.src) || this.preloadQueue.has(config.src)) {
      return this.preloadQueue.get(config.src) || Promise.resolve();
    }

    const preloadPromise = new Promise<void>((resolve) => {
      if (!this.isMobile) {
        // On desktop, just mark as preloaded since DotLottieReact handles it
        this.preloadedUrls.add(config.src);
        resolve();
        return;
      }

      // On mobile, preload the iframe version
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `
        position: absolute;
        left: -9999px;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      `;

      const embedSrc = config.src.includes('/embed/')
        ? config.src
        : config.src.replace(/https:\/\/lottie\.host\/([^/]+)\/([^/]+)\.lottie/, 'https://lottie.host/embed/$1/$2.lottie');

      const cleanup = () => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        this.preloadedUrls.add(config.src);
        resolve();
      };

      iframe.onload = cleanup;
      iframe.onerror = cleanup;

      // Timeout fallback
      setTimeout(cleanup, 5000);

      iframe.src = embedSrc;
      document.body.appendChild(iframe);
    });

    this.preloadQueue.set(config.src, preloadPromise);
    return preloadPromise;
  }

  private async startPreloading(): void {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      });
    }

    // Preload critical animations immediately
    const criticalPromises = CRITICAL_ANIMATIONS.map(config =>
      this.preloadAnimation(config)
    );

    // Wait for critical animations, then start high priority ones
    await Promise.allSettled(criticalPromises);

    // Preload high priority animations with delays
    HIGH_PRIORITY_ANIMATIONS.forEach(config => {
      const delay = config.delay || 0;
      setTimeout(() => {
        this.preloadAnimation(config);
      }, delay);
    });
  }

  public isPreloaded(src: string): boolean {
    return this.preloadedUrls.has(src);
  }

  public async ensurePreloaded(src: string): Promise<void> {
    if (this.preloadedUrls.has(src)) {
      return Promise.resolve();
    }

    if (this.preloadQueue.has(src)) {
      return this.preloadQueue.get(src)!;
    }

    return this.preloadAnimation({ src, priority: 'high' });
  }
}

// Global instance
export const lottiePreloader = new LottiePreloader();

// Export for use in components
export const isAnimationPreloaded = (src: string): boolean => {
  return lottiePreloader.isPreloaded(src);
};

export const ensureAnimationPreloaded = (src: string): Promise<void> => {
  return lottiePreloader.ensurePreloaded(src);
};