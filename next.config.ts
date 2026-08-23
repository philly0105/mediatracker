import type { NextConfig } from "next";

// Security response headers applied to every route. CSP is deliberately omitted:
// the app relies heavily on inline styles (framer-motion, style props), and a
// strict policy would break the shell. Permissions are locked down to the ones the
// app never uses; HSTS is left out so local HTTP dev is unaffected.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  experimental: {
    // Every route under app/(app) is dynamic — the shell awaits the session, so
    // cookies() is read before any page renders. Next gives dynamic routes a
    // client-cache TTL of 0, which means each click is a fresh server round
    // trip even when it is the Back button onto a page you left two seconds
    // ago. 30s was the framework default until Next 15 changed it to 0; it is
    // short enough that a stale library or watchlist is not a real risk, and it
    // is what makes back/forward feel instant.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    // Only allow TMDB's image CDN for next/image optimization.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        port: "",
        pathname: "/t/p/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
