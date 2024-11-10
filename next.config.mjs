import path from 'node:path';

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  cacheMaxMemorySize: 0,
  experimental: {
    dynamicIO: true,
    cacheHandlers: {
      default: path.join(import.meta.dirname, 'lib/debug.mjs'),
      remote: path.join(import.meta.dirname, 'lib/debug.mjs'),
      static: path.join(import.meta.dirname, 'lib/debug.mjs'),
    },
  },
};

export default nextConfig;
