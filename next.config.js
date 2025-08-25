/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse']
  },
  output: 'standalone'
}

module.exports = nextConfig
