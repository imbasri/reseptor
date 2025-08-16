/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' }
    ]
  },
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  // Suppress browser extension related warnings in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  }
}
export default nextConfig
