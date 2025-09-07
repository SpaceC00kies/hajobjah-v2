import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      plugins: [react()],
      build: {
        // CSS optimization
        cssCodeSplit: true,
        cssMinify: true,
        // Chunk optimization for better caching
        rollupOptions: {
          output: {
            // Optimize chunk splitting for better caching
            manualChunks: {
              vendor: ['react', 'react-dom'],
              router: ['react-router-dom'],
              ui: ['framer-motion'],
              markdown: ['react-markdown', 'remark-gfm']
            }
          }
        },
        // Performance optimizations
        target: 'es2020',
        minify: 'esbuild',
        sourcemap: false,
        // Optimize asset handling
        assetsInlineLimit: 4096,
        chunkSizeWarningLimit: 1000
      },
      // CSS preprocessing optimizations
      css: {
        devSourcemap: false,
        preprocessorOptions: {
          // Optimize CSS processing
        }
      },
      // Development optimizations
      server: {
        hmr: {
          overlay: false
        }
      },
      // Optimize dependency pre-bundling
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react-router-dom',
          'framer-motion'
        ],
        exclude: [
          'firebase'
        ]
      }
    };
});