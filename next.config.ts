import type { NextConfig } from "next";
import { LEGACY_REDIRECTS } from "./legacy-redirects";

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
    // Pages already opened (or loaded on hover) are reused for a while, so
    // going back and forth does not wait for the server again.
    staleTimes: { dynamic: 60, static: 300 },
  },
  images: {
    // WebP only: Cloudflare (free plan) caches one copy per URL and ignores
    // "Vary: Accept", so every browser must be able to read that copy.
    formats: ["image/webp"],
    // 65: full-screen hero photos and banners; 70: every other photo (the
    // default 75 is served as 70). Lighter files, no visible difference.
    qualities: [65, 70],
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
  // Old website URLs still in Google: 301 to the matching page.
  async redirects() {
    return LEGACY_REDIRECTS.map(([source, destination]) => ({
      source,
      destination,
      statusCode: 301 as const,
    }));
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
