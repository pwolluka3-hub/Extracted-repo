import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' https: 'unsafe-inline' 'unsafe-eval' blob: data:; script-src 'self' https: 'unsafe-inline' 'unsafe-eval' blob: https://js.puter.com; connect-src 'self' https: ws: wss: blob:; style-src 'self' https: 'unsafe-inline'; worker-src 'self' blob:;"
          }
        ]
      }
    ];
  },
}

export default nextConfig
