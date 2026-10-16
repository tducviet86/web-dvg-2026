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

const NavigationContext = createContext<
  ((href: string, replace?: boolean, scroll?: boolean) => void) | null
>(null);

export function usePageNavigation() {
  return useContext(NavigationContext);
}

export function PageNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function navigate(href: string, replace = false, scroll = true) {
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
              Đang chuyển trang…
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

export default function Link(props: ComponentProps<typeof NextLink>) {
  const navigate = useContext(NavigationContext);
  return (
    <NextLink
      {...props}
      onNavigate={(event) => {
        let prevented = false;
        props.onNavigate?.({
          preventDefault: () => {
            prevented = true;
            event.preventDefault();
          },
        });
        if (prevented || !navigate || typeof props.href !== "string") return;
        const destination = new URL(props.href, window.location.href);
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
