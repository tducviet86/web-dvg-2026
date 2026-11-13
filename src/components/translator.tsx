"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Globe, X } from "lucide-react";
import { useLocale } from "@/i18n/client";
import {
  HTML_LANG,
  LANG_COOKIE,
  LANGUAGE_NAMES,
  LOCALES,
  localizeHref,
  splitLocale,
  type Locale,
} from "@/i18n/config";

const SHORT: Record<Locale, string> = {
  vi: "VI",
  en: "EN",
  ko: "KO",
  zh: "中文",
};
/** Shown on phones in place of the globe (emoji flags render there). */
const FLAG: Record<Locale, string> = {
  vi: "🇻🇳",
  en: "🇬🇧",
  ko: "🇰🇷",
  zh: "🇨🇳",
};
const NOTE: Record<Locale, string> = {
  vi: "Bản tiếng Việt là bản gốc.",
  en: "Translated from Vietnamese with AI.",
  ko: "베트남어 원문을 AI로 번역했습니다.",
  zh: "由 AI 从越南语翻译。",
};

const rememberLanguage = (locale: Locale) => {
  document.cookie = `${LANG_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
};

/**
 * Opens the same page in another language (/du-an → /en/du-an) without a
 * full reload: the current page stays on screen until the translated one is
 * ready. The choice is remembered for the next visit.
 */
function useSwitchTo() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const target = (locale: Locale) =>
    localizeHref(splitLocale(pathname).path, locale);
  return {
    /** Loads the other languages ahead, so switching is instant. */
    prefetch: () =>
      LOCALES.forEach((l) => {
        router.prefetch(target(l));
      }),
    go: (locale: Locale) => {
      document.cookie = `${LANG_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
      startTransition(() =>
        router.push(
          target(locale) + window.location.search + window.location.hash,
          {
            scroll: false,
          },
        ),
      );
    },
  };
}

const subscribeNever = () => () => {};

/**
 * First visit on a Vietnamese page from a browser that is not Vietnamese,
 * Korean or Chinese (those two are redirected by src/proxy.ts): offers English.
 * Written in English on purpose. Either answer is remembered as the choice.
 */
export function LanguageSuggestion() {
  const lang = useLocale();
  const switchTo = useSwitchTo();
  const [closed, setClosed] = useState(false);
  const undecided = useSyncExternalStore(
    subscribeNever,
    () =>
      !document.cookie.includes(`${LANG_COOKIE}=`) &&
      !/^(vi|ko|zh)\b/i.test(navigator.language),
    () => false,
  );
  if (lang !== "vi" || closed || !undecided) return null;
  return (
    <aside className="lang-suggestion" lang="en" aria-label="Language">
      <button type="button" onClick={() => switchTo.go("en")}>
        <Globe size={15} aria-hidden="true" />
        View this page in English?
      </button>
      <button
        type="button"
        className="lang-suggestion-close"
        aria-label="Close"
        onClick={() => {
          rememberLanguage("vi");
          setClosed(true);
        }}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </aside>
  );
}

/** Navbar control: current language and a menu of the four languages. */
export function LanguageSwitcher() {
  const lang = useLocale();
  const switchTo = useSwitchTo();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div
      ref={ref}
      className="lang-switcher"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          ref.current?.querySelector("button")?.focus();
        }
      }}
    >
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Ngôn ngữ / Language: ${LANGUAGE_NAMES[lang]}`}
        onPointerEnter={switchTo.prefetch}
        onFocus={switchTo.prefetch}
        onClick={() => setOpen((v) => !v)}
      >
        <Globe className="lang-globe" size={15} aria-hidden="true" />
        <span className="lang-flag" aria-hidden="true">
          {FLAG[lang]}
        </span>
        <span>{SHORT[lang]}</span>
        <ChevronDown className="lang-chevron" size={12} aria-hidden="true" />
      </button>
      {open && (
        <div className="lang-menu">
          {LOCALES.map((code) => (
            <a
              key={code}
              href={localizeHref("/", code)}
              lang={HTML_LANG[code]}
              hrefLang={HTML_LANG[code]}
              aria-current={code === lang ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                setOpen(false);
                if (code !== lang) switchTo.go(code);
              }}
            >
              <span>{LANGUAGE_NAMES[code]}</span>
              {code === lang && <Check size={15} aria-hidden="true" />}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
