import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

/**
 * AI assistants (ChatGPT, Claude, Perplexity, Gemini, Apple, Copilot…) are
 * welcome to read and cite the public site; each is named so a rule meant
 * for everyone else never shuts them out. Private areas stay closed to all.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];
const PRIVATE = ["/admin", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
