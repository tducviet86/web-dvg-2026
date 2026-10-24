import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  isLocale,
  LANG_COOKIE,
  splitLocale,
  type Locale,
} from "@/i18n/config";

/**
 * Language routing. Vietnamese pages keep their URLs (internally served from
 * /vi/...); /en, /ko and /zh are the translated versions. A visitor's first
 * request is sent to their browser language; search engines are never
 * redirected so every language version stays indexable.
 */
const BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|lighthouse/i;

function preferred(request: NextRequest): Locale {
  const header = request.headers.get("accept-language");
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((x) => x.tag && x.tag !== "*")
    .sort((a, b) => b.q - a.q);
  const first = tags[0]?.tag.slice(0, 2);
  if (!first || first === "vi") return DEFAULT_LOCALE;
  if (first === "ko") return "ko";
  if (first === "zh") return "zh";
  return "en";
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);

  if (pathname === "/vi" || pathname.startsWith("/vi/")) {
    // Our own rewrite below can come back here as /vi/... (marked): serve it.
    if (request.headers.get("x-dvg-locale") === "vi") return NextResponse.next();
    // A direct /vi/... link goes to the unprefixed URL.
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const { locale, path } = splitLocale(pathname);
  if (locale !== DEFAULT_LOCALE) {
    headers.set("x-dvg-locale", locale);
    return NextResponse.next({ request: { headers } });
  }

  // Unprefixed (Vietnamese) URL: send first-time foreign visitors to their language.
  const cookie = request.cookies.get(LANG_COOKIE)?.value;
  const isBot = BOT.test(request.headers.get("user-agent") || "");
  const wanted = isLocale(cookie)
    ? cookie
    : isBot
      ? DEFAULT_LOCALE
      : preferred(request);
  if (request.method === "GET" && wanted !== DEFAULT_LOCALE && !isBot) {
    const url = request.nextUrl.clone();
    url.pathname = `/${wanted}${path === "/" ? "" : path}`;
    url.search = search;
    const res = NextResponse.redirect(url, 307);
    res.headers.set("vary", "accept-language, cookie");
    return res;
  }
  headers.set("x-dvg-locale", DEFAULT_LOCALE);
  const url = request.nextUrl.clone();
  url.pathname = `/vi${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Pages only: no API, media, admin, Next internals or files with an extension.
  matcher: [
    "/((?!api/|admin|media/|images/|_next/|sitemap.xml|robots.txt|opengraph-image|icon|favicon|.*\\.[\\w]+$).*)",
  ],
};
