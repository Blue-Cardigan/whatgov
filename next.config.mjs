/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'www.theyworkforyou.com',
      },
      {
        protocol: 'https',
        hostname: 'members-api.parliament.uk',
      },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    // Disable webpack caching in production
    config.cache = false;
    return config;
  },
};

export default nextConfig;
