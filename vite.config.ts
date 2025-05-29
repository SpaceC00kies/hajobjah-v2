import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        // 'process.env.VITE_USE_FIREBASE': JSON.stringify(env.VITE_USE_FIREBASE), // Removed
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY), // Keep for Gemini if still used elsewhere
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY) // Keep for Gemini
      },
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('.', import.meta.url))
        }
      }
    };
});