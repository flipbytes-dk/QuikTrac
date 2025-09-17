import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      // keep empty for now; will add shadcn/ui later
    ],
  },
}

export default nextConfig
