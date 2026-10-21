// @ts-check
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tu configuración aquí
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // A verification build may use its own output directory while `next dev` is
  // running locally.  Keep its generated route types out of the developer
  // tsconfig so both outputs cannot declare the same Next route identifiers.
  typescript: process.env.NEXT_DIST_DIR
    ? { tsconfigPath: 'tsconfig.build.json' }
    : undefined,
  // Next 15 invokes ESLint with options removed by the flat-config adapter.
  // Lint remains an explicit CI/local check; this prevents a framework
  // integration mismatch from blocking the production compiler.
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: false,
}

module.exports = nextConfig
