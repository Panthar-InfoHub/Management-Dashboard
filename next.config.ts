import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Other experimental features can go here
  },
  allowedDevOrigins: [
    '*.trycloudflare.com', // allow all trycloudflare subdomains for dynamic Cloudflare tunnels
  ],
};

export default nextConfig;
