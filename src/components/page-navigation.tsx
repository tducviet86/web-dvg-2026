"use client";

import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useLocalizeHref, useT } from "@/i18n/client";

const NavigationContext = createContext<
  | ((
      href: string,
      replace?: boolean,
      scroll?: boolean,
      /** Only the results (#can-ho) reload: no full-page spinner. */
      resultsOnly?: boolean,
    ) => void)
  | null
>(null);

/** Loads a page in full ahead of the click (pointer over / touch / focus). */
const PrefetchContext = createContext<((href: string) => void) | null>(null);
/** A full prefetch is reused by the router for staleTimes.static (5 min). */
const PREFETCH_REUSE_MS = 4 * 60_000;

export function usePageNavigation() {
  return useContext(NavigationContext);
}

export function PageNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const t = useT();
  const localize = useLocalizeHref();
  const [pending, startTransition] = useTransition();
  const [prefetched] = useState(() => new Map<string, number>());
  const [resultsOnly, setResultsOnly] = useState(false);
  function prefetch(href: string) {
    const last = prefetched.get(href);
    if (last && Date.now() - last < PREFETCH_REUSE_MS) return;
    prefetched.set(href, Date.now());
    router.prefetch(href, { kind: "full" as PrefetchKind });
  }
  function navigate(
    target: string,
    replace = false,
    scroll = true,
    onlyResults = false,
  ) {
    const href = localize(target);
    setResultsOnly(onlyResults);
    startTransition(() => {
      if (replace) router.replace(href, { scroll });
      else router.push(href, { scroll });
    });
  }
  return (
    <NavigationContext.Provider value={navigate}>
      <PrefetchContext.Provider value={prefetch}>
        <div
          className="navigation-shell"
          data-navigating={pending && !resultsOnly}
          data-results-loading={(pending && resultsOnly) || undefined}
        >
          {children}
          {pending && !resultsOnly && (
            <>
              <div className="navigation-progress" aria-hidden="true" />
              <PageSpinner />
            </>
          )}
          <div className="navigation-status" role="status" aria-live="polite">
            {pending && <span>{t("Đang chuyển trang…")}</span>}
          </div>
        </div>
      </PrefetchContext.Provider>
    </NavigationContext.Provider>
  );
}

/**
 * While the next page loads (only when it takes more than a moment;
 * prefetched pages swap before it shows): the current page stays where it
 * is, dimmed, with a spinning ring in the middle of the screen.
 */
function PageSpinner() {
  const t = useT();
  return (
    <div className="navigation-spinner" aria-hidden="true">
      <span className="navigation-spinner-box">
        <span className="navigation-spinner-ring" />
        <span>{t("Đang tải…")}</span>
      </span>
    </div>
  );
}

/**
 * The page area below the fixed header. It is re-mounted on every route so
 * the new page fades in; the first page of a visit renders without the
 * entrance (nothing delays the first paint).
 */
export function PageSurface({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [landing, setLanding] = useState<string | null>(pathname);
  if (landing !== null && pathname !== landing) setLanding(null);
  return (
    <div
      key={pathname}
      className={landing === null ? "page-surface page-enter" : "page-surface"}
    >
      {children}
    </div>
  );
}

/**
 * Next.js Link that keeps the visitor's language ("/du-an" → "/en/du-an").
 * Pointing at, touching or tabbing to a link loads the whole next page in
 * advance, so the click usually opens it at once.
 */
export default function Link(props: ComponentProps<typeof NextLink>) {
  const navigate = useContext(NavigationContext);
  const prefetch = useContext(PrefetchContext);
  const localize = useLocalizeHref();
  const href =
    typeof props.href === "string" ? localize(props.href) : props.href;
  function intent() {
    if (prefetch && typeof href === "string" && props.prefetch !== false) {
      const target = new URL(href, window.location.href);
      if (target.origin === window.location.origin)
        prefetch(target.pathname + target.search);
    }
  }
  return (
    <NextLink
      {...props}
      href={href}
      onMouseEnter={(event) => {
        intent();
        props.onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        intent();
        props.onTouchStart?.(event);
      }}
      onFocus={(event) => {
        intent();
        props.onFocus?.(event);
      }}
      onNavigate={(event) => {
        let prevented = false;
        props.onNavigate?.({
          preventDefault: () => {
            prevented = true;
            event.preventDefault();
          },
        });
        if (prevented || !navigate || typeof href !== "string") return;
        const destination = new URL(href, window.location.href);
        if (
          destination.pathname === window.location.pathname &&
          destination.search === window.location.search
        )
          return;
        event.preventDefault();
        // Same page, other filters ("Xem thêm", filter chips, list view):
        // the visitor stays where they are.
        const samePage =
          destination.pathname === window.location.pathname &&
          !destination.hash;
        navigate(
          destination.pathname + destination.search + destination.hash,
          props.replace,
          props.scroll ?? !samePage,
        );
      }}
    />
  );
}
