/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep mongoose out of the server bundling pipeline so its dynamic
  // requires resolve correctly inside Node.js route handlers.
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
};

export default nextConfig;
