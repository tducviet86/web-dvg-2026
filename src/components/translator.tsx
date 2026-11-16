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
/**
 * Each language's flag, drawn (emoji flags show as letters on Windows), so
 * the switcher looks the same on every screen.
 */
const FLAG_ART: Record<Locale, React.ReactNode> = {
  vi: (
    <>
      <rect width="30" height="20" fill="#da251d" />
      <path
        fill="#ffde00"
        d="M15 4.2l1.35 4.15h4.36l-3.53 2.56 1.35 4.15L15 12.5l-3.53 2.56 1.35-4.15-3.53-2.56h4.36z"
      />
    </>
  ),
  en: (
    <>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.4" />
    </>
  ),
  ko: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <circle cx="15" cy="10" r="4.6" fill="#0047a0" />
      <path
        d="M10.4 10a4.6 4.6 0 0 1 9.2 0 2.3 2.3 0 0 1-4.6 0 2.3 2.3 0 0 0-4.6 0z"
        fill="#cd2e3a"
      />
      <g stroke="#000" strokeWidth="0.9">
        <path d="M4.6 4.4l2.4-3.2M5.6 5.1l2.4-3.2M6.6 5.8l2.4-3.2" />
        <path d="M21 14.2l2.4 3.2M22 13.5l2.4 3.2M23 12.8l2.4 3.2" />
        <path d="M4.6 15.6l2.4 3.2M5.6 14.9l2.4 3.2M6.6 14.2l2.4 3.2" />
        <path d="M21 5.8l2.4-3.2M22 5.1l2.4-3.2M23 4.4l2.4-3.2" />
      </g>
    </>
  ),
  zh: (
    <>
      <rect width="30" height="20" fill="#de2910" />
      <path
        fill="#ffde00"
        d="M6 2.6l.9 2.8h2.9l-2.35 1.7.9 2.8L6 8.2 3.65 9.9l.9-2.8L2.2 5.4h2.9z"
      />
      <g fill="#ffde00">
        <circle cx="11.5" cy="2.6" r="0.8" />
        <circle cx="13.2" cy="4.6" r="0.8" />
        <circle cx="13.2" cy="7.4" r="0.8" />
        <circle cx="11.5" cy="9.3" r="0.8" />
      </g>
    </>
  ),
};
const Flag = ({ lang }: { lang: Locale }) => (
  <svg
    className="lang-flag"
    viewBox="0 0 30 20"
    width="21"
    height="14"
    aria-hidden="true"
  >
    {FLAG_ART[lang]}
  </svg>
);
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
        <Flag lang={lang} />
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
              <Flag lang={code} />
              <span>{LANGUAGE_NAMES[code]}</span>
              {code === lang && <Check size={15} aria-hidden="true" />}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
