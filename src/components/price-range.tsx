"use client";
import { useId, useRef, useState } from "react";
import { useT } from "@/i18n/client";

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, low: number, high: number) =>
  Math.min(high, Math.max(low, n));
type Handle = "low" | "high";

/**
 * Two-handle price slider for the hero search: drag either handle, or tap
 * the track to move the nearer one; arrows, Page Up/Down, Home and End work
 * on a focused handle. The form sends `minName` / `maxName` only when a
 * handle is moved off its end, so "Mọi mức giá" leaves the URL clean.
 */
export function PriceRange({
  label,
  unit,
  bounds: [min, max],
  step,
  names: [minName, maxName],
  values,
  openEnded = false,
}: {
  label: string;
  /** "triệu" or "tỷ". */
  unit: string;
  bounds: [number, number];
  step: number;
  names: [min: string, max: string];
  values: Record<string, string | undefined>;
  /** The top of the scale means "and above" (rent: 100 triệu+). */
  openEnded?: boolean;
}) {
  const t = useT();
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef<Handle | null>(null);
  const start = (name: string, fallback: number) => {
    const n = Number(values[name]);
    return values[name] && Number.isFinite(n) ? clamp(n, min, max) : fallback;
  };
  const [low, setLow] = useState(() => start(minName, min));
  const [high, setHigh] = useState(() => start(maxName, max));

  const amount = (n: number) =>
    t(`{n} ${unit}`, { n: n.toLocaleString("vi-VN") }) +
    (openEnded && n === max ? "+" : "");
  const text =
    low === min && high === max
      ? t("Mọi mức giá")
      : low === min
        ? t("Đến {price}", { price: amount(high) })
        : high === max && openEnded
          ? t("Từ {price}", { price: amount(low) })
          : `${low.toLocaleString("vi-VN")} – ${amount(high)}`;
  const share = (n: number) => (n - min) / (max - min);

  /** Moves one handle, keeping a step between the two. */
  function move(handle: Handle, value: number) {
    const n = round(Math.round((value - min) / step) * step + min);
    if (handle === "low") setLow(clamp(n, min, round(high - step)));
    else setHigh(clamp(n, round(low + step), max));
  }
  /** The price under the pointer (handles are 24px wide). */
  function valueAt(clientX: number) {
    const box = track.current!.getBoundingClientRect();
    const x = clamp((clientX - box.left - 12) / (box.width - 24), 0, 1);
    return min + x * (max - min);
  }
  function key(handle: Handle, e: React.KeyboardEvent) {
    const value = handle === "low" ? low : high;
    const big = Math.max(step, round((max - min) / 10));
    const next = {
      ArrowRight: value + step,
      ArrowUp: value + step,
      ArrowLeft: value - step,
      ArrowDown: value - step,
      PageUp: value + big,
      PageDown: value - big,
      Home: min,
      End: max,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    move(handle, next);
  }
  const thumb = (handle: Handle, value: number, name: string) => (
    <span
      id={`${id}-${handle}`}
      role="slider"
      tabIndex={0}
      className="price-range-thumb"
      style={{ "--at": share(value) } as React.CSSProperties}
      aria-label={t(name, { label: t(label) })}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={amount(value)}
      onKeyDown={(e) => key(handle, e)}
    />
  );

  return (
    <div
      className="hero-field price-range"
      role="group"
      aria-labelledby={`${id}-label`}
    >
      <span id={`${id}-label`}>{t(label)}</span>
      <div className="price-range-box">
        <output htmlFor={`${id}-low ${id}-high`} aria-live="polite">
          {text}
        </output>
        <div
          ref={track}
          className="price-range-track"
          style={
            { "--from": share(low), "--to": share(high) } as React.CSSProperties
          }
          onPointerDown={(e) => {
            const value = valueAt(e.clientX);
            // The nearer handle; when they meet, the one that can move.
            const handle =
              Math.abs(value - low) < Math.abs(value - high) ||
              (low === high - step && value < low)
                ? "low"
                : "high";
            dragging.current = handle;
            e.currentTarget.setPointerCapture(e.pointerId);
            document.getElementById(`${id}-${handle}`)?.focus();
            move(handle, value);
          }}
          onPointerMove={(e) => {
            if (dragging.current) move(dragging.current, valueAt(e.clientX));
          }}
          onPointerUp={() => (dragging.current = null)}
          onPointerCancel={() => (dragging.current = null)}
        >
          {thumb("low", low, "{label} thấp nhất")}
          {thumb("high", high, "{label} cao nhất")}
        </div>
      </div>
      <input type="hidden" name={minName} value={low > min ? low : ""} />
      <input type="hidden" name={maxName} value={high < max ? high : ""} />
    </div>
  );
}
