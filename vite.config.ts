
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        // process.env.API_KEY is no longer needed for Gemini
        // If you were using VITE_FIREBASE_... vars from .env for config, they would be defined here.
        // However, the Firebase config is currently hardcoded in firebase.ts as per the prompt.
        // 'process.env.FIREBASE_CONFIG': JSON.stringify(env.FIREBASE_CONFIG_JSON_STRING) // Example if config was from env
      },
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('.', import.meta.url))
        }
      }
    };
});
