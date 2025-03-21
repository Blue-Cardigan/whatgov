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
      {
        protocol: 'https',
        hostname: 'parliament.assetbank-server.com',
      },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    // Disable webpack caching in production
    config.module.rules.push({
      test: /\.(ttf)$/,
      use: [
        {
          loader: 'url-loader',
          options: {
            limit: Infinity,
            encoding: 'base64',
          },
        },
      ],
    });
    config.cache = false;
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        stream: false,
        zlib: false
      };
    }
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
