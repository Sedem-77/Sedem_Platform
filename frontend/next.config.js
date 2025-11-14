/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_GITHUB_CLIENT_ID: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'test_github_client_id',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:8000/:path*`,
      },
    ]
  },
}

module.exports = nextConfig