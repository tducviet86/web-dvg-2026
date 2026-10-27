"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useT } from "@/i18n/client";

/**
 * Shows the first `height` pixels of its content with a fade and a
 * "Xem thêm" button that unfolds the rest. Short content has no button.
 * The whole content stays in the page (search engines read all of it).
 */
export function ShowMore({
  children,
  height,
}: {
  children: ReactNode;
  /** Visible height while folded, in px. */
  height: number;
}) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Folded until measured, so the page does not jump after loading.
  const [needed, setNeeded] = useState(true);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setNeeded(el.scrollHeight > height + 48);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el.firstElementChild ?? el);
    return () => observer.disconnect();
  }, [height]);
  const folded = needed && !open;
  return (
    <div className="show-more" data-folded={folded}>
      <div
        ref={box}
        className="show-more-body"
        style={folded ? { maxHeight: height } : undefined}
      >
        {children}
      </div>
      {needed && (
        <button
          type="button"
          className="show-more-toggle"
          aria-expanded={open}
          onClick={() => {
            if (open)
              box.current?.parentElement?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
              });
            setOpen(!open);
          }}
        >
          {open ? t("Thu gọn") : t("Xem thêm")}
          <ChevronDown size={17} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
