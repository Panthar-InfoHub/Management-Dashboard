import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // geolocation stays allowed for the upcoming attendance geofence check.
    value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Static app shell prerenders at build time; per-user data streams in behind
  // <Suspense>. Links prefetch one reusable shell per route.
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns", "radix-ui"],
  },
  allowedDevOrigins: [
    "*.trycloudflare.com", // dynamic Cloudflare tunnels
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
