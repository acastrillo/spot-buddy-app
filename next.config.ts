import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    domains: ['localhost', 'kinexfit.com', 'www.kinexfit.com', 'spotter-alb-56827129.us-east-1.elb.amazonaws.com'],
  },

  // Performance optimizations
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      '@radix-ui/react-icons',
      '@aws-sdk/client-bedrock-runtime',
      '@aws-sdk/client-dynamodb',
      '@aws-sdk/lib-dynamodb',
    ],
  },

  // Enable React compiler optimizations (Next.js 15)
  reactStrictMode: true,

  // Cache headers for better deployment handling
  async headers() {
    return [
      {
        // HTML pages - don't cache to ensure fresh deployments are picked up
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
        // Only apply to HTML requests (not static assets)
        has: [
          {
            type: 'header',
            key: 'accept',
            value: '(.*text/html.*)',
          },
        ],
      },
      {
        // Static assets with hash in filename - cache immutably
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Note: swcMinify is now default in Next.js 15+ and the option has been removed
};

export default nextConfig;
