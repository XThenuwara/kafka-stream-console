import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_EXPORT === 'true';

const nextConfig: NextConfig = {
  // Support dynamic static exports for GitHub Pages
  ...(isStaticExport ? { output: 'export' } : {}),
};

export default nextConfig;
