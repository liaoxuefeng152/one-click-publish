import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Docker 容器化部署: 输出 standalone
  output: 'standalone',
  // allowed origins for development
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
