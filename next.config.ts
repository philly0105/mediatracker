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
