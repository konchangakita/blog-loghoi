/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  webpack: (config, context) => {
    config.watchOptions = {
      poll: 1200,
      aggregateTimeout: 500,
      ignored: ['**/node_modules', '**/.next'],
    }
    return config
  },
}

module.exports = nextConfig
