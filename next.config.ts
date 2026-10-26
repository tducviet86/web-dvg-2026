import type { NextConfig } from "next";

const api = (process.env.API_INTERNAL_URL || "http://127.0.0.1:4000").replace(
  /\/$/,
  "",
);
/** Extra image hosts (CDN / bucket), comma separated absolute URLs. */
const mediaHosts = (process.env.MEDIA_REMOTE_PATTERNS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => new URL(value));

const config: NextConfig = {
  // Docker images use the standalone server (see Dockerfile).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  experimental: {
    // Admin uploads (videos up to 100 MB) pass through the /api/v1 rewrite.
    proxyClientMaxBodySize: "110mb",
    proxyTimeout: 120_000,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // 70: full-screen hero photos (lighter, no visible difference).
    qualities: [70, 75],
    // Optimised copies are kept 30 days (default 4 h) so returning visitors
    // and the CDN reuse them instead of asking the server again.
    minimumCacheTTL: 2_592_000,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...mediaHosts.map((url) => ({
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port,
        pathname: `${url.pathname.replace(/\/$/, "")}/**`,
      })),
    ],
  },
  // The browser talks to the API through the site origin: auth cookies stay
  // first-party (SameSite=Strict) and no CORS is needed.
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${api}/api/v1/:path*` },
      { source: "/media/:path*", destination: `${api}/media/:path*` },
    ];
  },
};
export default config;
