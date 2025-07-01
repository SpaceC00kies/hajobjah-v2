import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // <--- THIS LINE IS ESSENTIAL FOR REACT PROJECTS

export default defineConfig({
  // Explicitly set the project root to the current directory
  root: '.',

  plugins: [react()], // <--- THIS LINE IS ESSENTIAL FOR REACT PROJECTS

  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.tsx'
      }
    }
  },

  resolve: {
    alias: {
      '@': './'
    }
  }
});