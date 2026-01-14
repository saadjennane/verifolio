import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize build performance and reduce bundle size
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-table'],
  },

  // Server-only packages - exclude from client bundle
  // Puppeteer and OpenAI should only be used in API routes
  serverExternalPackages: ['puppeteer', 'puppeteer-core', 'openai'],

  // Turbopack configuration (Next.js 16+)
  turbopack: {},
};

export default nextConfig;
