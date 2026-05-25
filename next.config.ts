import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_EXPORT === 'true' || process.env.BUILD_TARGET === 'desktop';

const nextConfig: NextConfig = {
  // Support dynamic static exports for GitHub Pages & ElectroBun
  ...(isStaticExport ? { output: 'export', images: { unoptimized: true } } : {}),
};

export default nextConfig;
