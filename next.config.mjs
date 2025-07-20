import path from 'path';
import { fileURLToPath } from 'url';

// These lines are the modern way to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The webpack config is used to customize the underlying build process.
  webpack(config) {
    // This correctly sets up the '@' alias to point to the project root.
    // This must match the `paths` configuration in your `tsconfig.json`.
    config.resolve.alias['@'] = path.resolve(__dirname);
    
    return config;
  },
};

export default nextConfig;