"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import {
  HAS_WORDS,
  HTML_LANG,
  localizeHref,
  textKey,
  type Locale,
} from "./config";

/**
 * Language for Client Components. The server passes the translations of the
 * strings those components use (see i18n/client-strings.json); Server
 * Components are translated while rendering and need no hook.
 */
type Messages = Record<string, string>;
const I18nContext = createContext<{ locale: Locale; messages: Messages }>({
  locale: "vi",
  messages: {},
});

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  // The root layout is not re-rendered when switching language in place.
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useLocale = () => useContext(I18nContext).locale;

/** Translate function: t("Vietnamese text") or t("Xem {n} căn", { n }). */
export function useT() {
  const { locale, messages } = useContext(I18nContext);
  return useCallback(
    (text: string, values?: Record<string, string | number>) => {
      let out = text;
      if (locale !== "vi" && HAS_WORDS.test(text)) {
        const found = messages[textKey(text)];
        if (found) {
          const lead = text.match(/^\s*/)![0];
          const trail = text.match(/\s*$/)![0];
          out = lead + found + trail;
        }
      }
      return values
        ? out.replace(/\{(\w+)\}/g, (_, k: string) =>
            String(values[k] ?? `{${k}}`),
          )
        : out;
    },
    [locale, messages],
  );
}

/** Internal link in the current language ("/du-an" → "/en/du-an"). */
export function useLocalizeHref() {
  const locale = useLocale();
  return useCallback((href: string) => localizeHref(href, locale), [locale]);
}
