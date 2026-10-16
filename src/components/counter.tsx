"use client";
import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
export function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const count = useMotionValue(value);
  const rounded = useTransform(count, (n) =>
    Math.round(n).toString().padStart(2, "0"),
  );
  useEffect(() => {
    if (!visible || reduced) return;
    count.set(0);
    const control = animate(count, value, { duration: 1.1, ease: "easeOut" });
    return () => control.stop();
  }, [count, visible, reduced, value]);
  return (
    <span ref={ref} className="counter-value">
      <span className="sr-only">{value}</span>
      <motion.span aria-hidden="true">{rounded}</motion.span>
    </span>
  );
}
