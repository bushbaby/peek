import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@peek/db', '@peek/checker'],
}

export default nextConfig
