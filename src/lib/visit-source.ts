/**
 * Where a visit came from, for the unit view counts in Admin › Tổng quan:
 * read once on the visit's first page (the link's utm_source, else the page
 * that sent the visitor) and kept for the tab, so a unit opened three pages
 * later still counts for Google, ChatGPT, Zalo…
 */
export type VisitSource =
  "google" | "search" | "ai" | "zalo" | "facebook" | "direct" | "other";

const KEY = "dvg:source";
// Checked in this order: Gemini lives on google.com, Messenger on facebook.
const RULES: [VisitSource, RegExp][] = [
  [
    "ai",
    /chatgpt|openai|perplexity|claude\.ai|anthropic|gemini|bard\.google|copilot|deepseek|grok|meta\.ai|you\.com|phind/,
  ],
  ["google", /(^|\.)google\.|^google$/],
  [
    "search",
    /bing|yahoo|duckduckgo|naver|yandex|coccoc|baidu|ecosia|daum|seznam|brave/,
  ],
  ["zalo", /zalo/],
  ["facebook", /facebook|(^|\.)fb\.|instagram|messenger|threads/],
];

/** The source of a visit from its utm_source and referrer. */
export function sourceOf(
  utm: string,
  referrer: string,
  ownHost: string,
): VisitSource {
  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname.toLowerCase() : "";
  } catch {
    host = "";
  }
  const from = utm.trim().toLowerCase() || (host === ownHost ? "" : host);
  if (!from) return "direct";
  return RULES.find(([, test]) => test.test(from))?.[0] ?? "other";
}

/** This tab's visit source, worked out on its first page. */
export function visitSource(): VisitSource {
  try {
    const kept = sessionStorage.getItem(KEY) as VisitSource | null;
    if (kept) return kept;
  } catch {
    /* storage blocked: worked out again on each page */
  }
  const source = sourceOf(
    new URLSearchParams(location.search).get("utm_source") ?? "",
    document.referrer,
    location.hostname.toLowerCase(),
  );
  try {
    sessionStorage.setItem(KEY, source);
  } catch {
    /* storage blocked */
  }
  return source;
}
