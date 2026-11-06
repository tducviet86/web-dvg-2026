import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  isLocale,
  LANG_COOKIE,
  splitLocale,
} from "@/i18n/config";

/**
 * Language routing. Vietnamese pages keep their URLs (internally served from
 * /vi/...); /en, /ko and /zh are the translated versions. Vietnamese is the
 * default: only a language the visitor chose (remembered in a cookie) or a
 * Korean / Chinese browser redirects; others get a suggestion bar instead
 * (LanguageSuggestion). Search engines are never redirected, so every language
 * version stays indexable.
 */
const BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|lighthouse/i;

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);

  if (pathname === "/vi" || pathname.startsWith("/vi/")) {
    // Our own rewrite below can come back here as /vi/... (marked): serve it.
    if (request.headers.get("x-dvg-locale") === "vi")
      return NextResponse.next();
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

  // Unprefixed (Vietnamese) URL: back to the language the visitor chose, or
  // on a first visit to the browser's language if it is Korean or Chinese.
  const chosen = request.cookies.get(LANG_COOKIE)?.value;
  const browser = /^(ko|zh)\b/i
    .exec(request.headers.get("accept-language") || "")?.[1]
    .toLowerCase();
  const wanted = isLocale(chosen) ? chosen : browser;
  const isBot = BOT.test(request.headers.get("user-agent") || "");
  if (
    request.method === "GET" &&
    isLocale(wanted) &&
    wanted !== DEFAULT_LOCALE &&
    !isBot
  ) {
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
