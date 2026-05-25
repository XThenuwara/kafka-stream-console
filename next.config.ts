import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_EXPORT === 'true' || process.env.BUILD_TARGET === 'desktop';
const isGitHubPages = process.env.NEXT_EXPORT === 'true';

const nextConfig: NextConfig = {
  // Support dynamic static exports for GitHub Pages & ElectroBun
  ...(isStaticExport ? { output: 'export', images: { unoptimized: true } } : {}),
  ...(isGitHubPages ? { basePath: '/kafka-stream-console', trailingSlash: true } : {}),
};

export default nextConfig;
