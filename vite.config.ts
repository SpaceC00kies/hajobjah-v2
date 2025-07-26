import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      plugins: [react()],
      build: {
        rollupOptions: {
          external: [
            'recharts',
            'react',
            'react-dom',
            '@google/genai',
            'react-router-dom',
            'framer-motion',
            'react-markdown',
            'remark-gfm'
          ]
        }
      }
    };
});
