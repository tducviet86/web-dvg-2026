"use client";
import { useEffect, useRef, useState } from "react";

const pad = (n: number) => Math.round(n).toString().padStart(2, "0");

/** A number that counts up once it scrolls into view (still with "reduce motion"). */
export function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / 1100, 1);
        setShown(value * (1 - (1 - t) ** 3));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return (
    <span ref={ref} className="counter-value">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{pad(shown)}</span>
    </span>
  );
}
