import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken', 'qrcode', 'nodemailer'],
};

export default nextConfig;
