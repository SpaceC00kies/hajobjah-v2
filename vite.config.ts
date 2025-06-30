
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
    // const env = loadEnv(mode, '.', ''); // This line is not currently used.
    return {
      // The define block for process.env is removed as it's no longer needed for client-side API keys.
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('.', import.meta.url))
        }
      }
    };
});