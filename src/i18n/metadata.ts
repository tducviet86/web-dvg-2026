import {
  HTML_LANG,
  LOCALES,
  localizeHref,
  OG_LOCALE,
  type Locale,
} from "./config";

/** canonical + hreflang links for a page (path without locale, e.g. "/du-an"). */
export function localeAlternates(locale: Locale, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return {
    canonical: localizeHref(clean, locale),
    languages: {
      ...Object.fromEntries(
        LOCALES.map((l) => [HTML_LANG[l], localizeHref(clean, l)]),
      ),
      "x-default": clean,
    },
  };
}

export const ogLocale = (locale: Locale) => ({
  locale: OG_LOCALE[locale],
  alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
});

/** The site's share card (app/opengraph-image.tsx), for pages without a photo. */
export const defaultOgImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Đất Vàng Group",
};
