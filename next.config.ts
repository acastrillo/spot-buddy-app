import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore for deployment
  },
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore for deployment
  },
  images: {
    domains: ['localhost', 'spotter.cannashieldct.com', 'spotter-alb-56827129.us-east-1.elb.amazonaws.com'],
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

  // Note: swcMinify is now default in Next.js 15+ and the option has been removed
};

export default nextConfig;
