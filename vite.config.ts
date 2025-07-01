import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Ensure this line is present if you use React

export default defineConfig({
  // Explicitly set the project root to the current directory
  // This helps Vite correctly resolve all paths from your project's base (the root folder).
  root: '.',

  plugins: [react()], // Ensure your React plugin is still here

  build: {
    // Specify the output directory for the built files (e.g., 'dist')
    outDir: 'dist',
    // Configure Rollup (Vite's underlying bundler) to explicitly know your main entry file
    rollupOptions: {
      input: {
        // Explicitly define your main entry point. This is crucial for non-standard structures.
        main: './index.tsx'
      }
    }
  },

  // Adjust aliases if you use them, ensuring they point to the root
  resolve: {
    alias: {
      '@': './' // This means `@/` will resolve to your project root
      // We use a simple string './' here which is resolved relative to the 'root' option.
    }
  }
});