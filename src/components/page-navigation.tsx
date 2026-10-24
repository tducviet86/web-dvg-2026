"use client";

import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useLocalizeHref, useT } from "@/i18n/client";

const NavigationContext = createContext<
  ((href: string, replace?: boolean, scroll?: boolean) => void) | null
>(null);

export function usePageNavigation() {
  return useContext(NavigationContext);
}

export function PageNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const t = useT();
  const localize = useLocalizeHref();
  const [pending, startTransition] = useTransition();
  function navigate(target: string, replace = false, scroll = true) {
    const href = localize(target);
    startTransition(() => {
      if (replace) router.replace(href, { scroll });
      else router.push(href, { scroll });
    });
  }
  return (
    <NavigationContext.Provider value={navigate}>
      <div className="navigation-shell" data-navigating={pending}>
        {children}
        {pending && <div className="navigation-progress" aria-hidden="true" />}
        <div className="navigation-status" role="status" aria-live="polite">
          {pending && (
            <span>
              <i aria-hidden="true" />
              {t("Đang chuyển trang…")}
            </span>
          )}
        </div>
      </div>
    </NavigationContext.Provider>
  );
}

export function PageSurface({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-surface">
      {children}
    </div>
  );
}

/** Next.js Link that keeps the visitor's language ("/du-an" → "/en/du-an"). */
export default function Link(props: ComponentProps<typeof NextLink>) {
  const navigate = useContext(NavigationContext);
  const localize = useLocalizeHref();
  const href =
    typeof props.href === "string" ? localize(props.href) : props.href;
  return (
    <NextLink
      {...props}
      href={href}
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
        navigate(
          destination.pathname + destination.search + destination.hash,
          props.replace,
          props.scroll,
        );
      }}
    />
  );
}
