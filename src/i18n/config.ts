/**
 * Website languages. Vietnamese is the source and keeps the unprefixed URLs;
 * the others live under /en, /ko, /zh and are translated from Vietnamese
 * (dictionary stored by BE-DVG, see i18n/dictionary.ts).
 */
export const LOCALES = ["vi", "en", "ko", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";
export const FOREIGN_LOCALES = ["en", "ko", "zh"] as const;

export const LANGUAGE_NAMES: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  ko: "한국어",
  zh: "中文",
};
/** <html lang> / hreflang values. */
export const HTML_LANG: Record<Locale, string> = {
  vi: "vi",
  en: "en",
  ko: "ko",
  zh: "zh-Hans",
};
export const OG_LOCALE: Record<Locale, string> = {
  vi: "vi_VN",
  en: "en_US",
  ko: "ko_KR",
  zh: "zh_CN",
};
/** Cookie remembering the visitor's choice (set by the language switcher). */
export const LANG_COOKIE = "dvg_lang";

export const isLocale = (value: unknown): value is Locale =>
  LOCALES.includes(value as Locale);

// "vi" appears only internally (src/proxy.ts rewrites Vietnamese URLs to /vi).
const PREFIX = /^\/(vi|en|ko|zh)(?=\/|$|\?|#)/;
/** Paths that are never localised (API, media, admin, files). */
const UNLOCALISED = /^\/(api|admin|media|images|_next)(\/|$)|^\/[^/?#]+\.\w+$/;

/** "/en/du-an?x=1" → { locale: "en", path: "/du-an?x=1" }. */
export function splitLocale(path: string): { locale: Locale; path: string } {
  const match = path.match(PREFIX);
  if (!match) return { locale: DEFAULT_LOCALE, path: path || "/" };
  return {
    locale: match[1] as Locale,
    path: path.slice(match[0].length) || "/",
  };
}

/** Prefixes an internal path with the locale ("/du-an" → "/en/du-an"). */
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//") || UNLOCALISED.test(href))
    return href;
  const { path } = splitLocale(href);
  if (locale === DEFAULT_LOCALE) return path;
  return `/${locale}${path === "/" ? "" : path.startsWith("/?") || path.startsWith("/#") ? path.slice(1) : path}`;
}

/** Text worth translating: has at least one word. */
export const HAS_WORDS = /[A-Za-zÀ-ỹ]{2,}/;
/** Dictionary key: whitespace collapsed and trimmed (same rule as the API). */
export const textKey = (text: string) => text.replace(/\s+/g, " ").trim();
