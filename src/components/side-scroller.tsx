"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/i18n/client";

/**
 * A row that slides sideways: its list scrolls (trackpad, finger, keys) and
 * two arrows move it a screenful at a time. The arrows show only when the
 * row is wider than its box, each greyed out at its end.
 */
export function SideScroller({ children }: { children: ReactNode }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });
  const row = () => box.current?.querySelector<HTMLElement>(":scope > ul");

  useEffect(() => {
    const list = row();
    if (!list) return;
    const check = () =>
      setEnds({
        start: list.scrollLeft < 4,
        end: list.scrollLeft + list.clientWidth > list.scrollWidth - 4,
      });
    check();
    list.addEventListener("scroll", check, { passive: true });
    const watch = new ResizeObserver(check);
    watch.observe(list);
    return () => {
      list.removeEventListener("scroll", check);
      watch.disconnect();
    };
  }, []);

  const move = (way: 1 | -1) => {
    const list = row();
    list?.scrollBy({ left: way * list.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div ref={box} className="side-scroller">
      {children}
      {!(ends.start && ends.end) && (
        <div className="side-scroller-arrows">
          <button
            type="button"
            aria-label={t("Xem các căn trước")}
            disabled={ends.start}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t("Xem thêm căn")}
            disabled={ends.end}
            onClick={() => move(1)}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
