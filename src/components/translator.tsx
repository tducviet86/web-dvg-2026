"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
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
const NOTE: Record<Locale, string> = {
  vi: "Bản tiếng Việt là bản gốc.",
  en: "Translated from Vietnamese with AI.",
  ko: "베트남어 원문을 AI로 번역했습니다.",
  zh: "由 AI 从越南语翻译。",
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

/** Navbar control: current language and a menu of the four languages. */
export function LanguageSwitcher({
  variant = "menu",
}: {
  variant?: "menu" | "row";
}) {
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
  // The phone menu lists every language: load them as soon as it opens.
  useEffect(() => {
    if (variant === "row") switchTo.prefetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);
  if (variant === "row")
    return (
      <div className="lang-row" role="group" aria-label="Ngôn ngữ / Language">
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            lang={HTML_LANG[code]}
            aria-pressed={code === lang}
            onClick={() => code !== lang && switchTo.go(code)}
          >
            {LANGUAGE_NAMES[code]}
          </button>
        ))}
      </div>
    );
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
        <Globe size={15} aria-hidden="true" />
        <span>{SHORT[lang]}</span>
        <ChevronDown size={12} aria-hidden="true" />
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
          <p lang={HTML_LANG[lang]}>{NOTE[lang]}</p>
        </div>
      )}
    </div>
  );
}
