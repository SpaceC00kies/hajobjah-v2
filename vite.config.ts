import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      build: {
        outDir: 'dist',  // <-- This is the corrected line
      },
      plugins: [react()],
    };
});