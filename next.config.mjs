/** @type {import('next').NextConfig} */
const isAndroid = process.platform === 'android';

const nextConfig = {
  outputFileTracingRoot: '/data/data/com.termux/files/home/extracted_project',
  turbopack: {
    root: '/data/data/com.termux/files/home/extracted_project',
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    if (isAndroid) {
      config.cache = false;
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
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
