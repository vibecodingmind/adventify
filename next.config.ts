import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure server external packages are bundled correctly
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken', 'qrcode'],
};

export default nextConfig;
