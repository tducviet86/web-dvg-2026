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
/**
 * Search and map pages with filters (?price=15&view=grid…, in any language):
 * served with noindex, and countless combinations. Google's advice for
 * faceted navigation: keep crawlers out of them, so crawling goes to the
 * real pages (units, projects, landing pages) instead.
 */
const FILTERED = [
  "/cho-thue?",
  "/cho-thue/*?",
  "/ban-do?",
  "/*/cho-thue?",
  "/*/cho-thue/*?",
  "/*/ban-do?",
];
/**
 * Links shared on Zalo / Facebook / ads carry tracking only (?utm_source=zalo,
 * ?fbclid=…, ?zarsrc=…, ?gclid=…): those stay open, so link previews keep
 * their photo and title. The longer rule wins, so these beat FILTERED.
 */
const TRACKING = ["utm_", "fbclid=", "zarsrc=", "gclid="];
const SHARED = FILTERED.filter((rule) => rule.includes("cho-thue")).flatMap(
  (rule) => TRACKING.map((param) => rule + param),
);

export default function robots(): MetadataRoute.Robots {
  const disallow = [...PRIVATE, ...FILTERED];
  const allow = ["/", ...SHARED];
  return {
    rules: [
      { userAgent: "*", allow, disallow },
      { userAgent: AI_CRAWLERS, allow, disallow },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
