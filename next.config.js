// @ts-check
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tu configuración aquí
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
