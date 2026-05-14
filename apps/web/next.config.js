/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/shared", "@repo/database", "@repo/ai-provider"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.instagram.com",
      },
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
    ],
  },
};

module.exports = nextConfig;
