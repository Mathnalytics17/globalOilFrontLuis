// @ts-check
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tu configuración aquí
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Next 15 invokes ESLint with options removed by the flat-config adapter.
  // Lint remains an explicit CI/local check; this prevents a framework
  // integration mismatch from blocking the production compiler.
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: false,
}

module.exports = nextConfig
