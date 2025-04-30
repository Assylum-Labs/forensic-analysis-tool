/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    swcMinify: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreDuringBuilds: true,
    },
  };
  
  module.exports = nextConfig;