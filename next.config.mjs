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
      {
        protocol: 'https',
        hostname: 'members-api.parliament.uk',
        pathname: '/api/Members/**',
      },
      {
        protocol: 'https',
        hostname: 'data.parliament.uk',
      },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    // Disable webpack caching in production
    config.cache = false;
    return config;
  },
  async headers() {
    return [
      {
        source: '/site.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
