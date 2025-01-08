/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['heuomdhmiebffhedmoyz.supabase.co'],
    formats: ['image/webp'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle sharp on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        sharp: false,
        'detect-libc': false,
        'node:fs': false,
        'node:path': false,
        'node:process': false,
        'node:buffer': false,
        fs: false,
        path: false,
        child_process: false,
      }
    }
    return config
  },
}

module.exports = nextConfig 