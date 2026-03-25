const nextConfig = {
  experimental: {
    // Tell Next.js NOT to bundle these Node.js-only packages.
    // They will be required at runtime instead, avoiding __dirname / ESM errors.
    serverComponentsExternalPackages: ['pg', 'pg-pool', 'pg-protocol'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'dgalywyr863hv.cloudfront.net' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default nextConfig
