import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  productionBrowserSourceMaps: false,
  webpack: (config) => {
    config.devtool = 'source-map';
    return config;
  },
};

export default nextConfig;
