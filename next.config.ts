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
};

export default nextConfig;
