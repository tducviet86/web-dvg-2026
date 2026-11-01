"use client";
import { useRef, type ReactNode } from "react";

/**
 * A picture that tilts slightly toward the mouse (not on touch screens, not
 * with "reduce motion"). The surface eases toward the pointer every frame
 * and stops animating once it has settled.
 */
export function DepthScene({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const state = useRef({ x: 0, y: 0, tx: 0, ty: 0, frame: 0 });

  const step = () => {
    const s = state.current;
    s.x += (s.tx - s.x) * 0.14;
    s.y += (s.ty - s.y) * 0.14;
    const settled = Math.abs(s.tx - s.x) < 0.01 && Math.abs(s.ty - s.y) < 0.01;
    if (settled) {
      s.x = s.tx;
      s.y = s.ty;
    }
    // Back at rest: no transform at all (crisp text, no extra layer).
    if (surface.current)
      surface.current.style.transform =
        settled && !s.x && !s.y
          ? ""
          : `rotateX(${s.x.toFixed(2)}deg) rotateY(${s.y.toFixed(2)}deg)`;
    s.frame = settled ? 0 : requestAnimationFrame(step);
  };
  const aim = (x: number, y: number) => {
    const s = state.current;
    s.tx = x;
    s.ty = y;
    s.frame ||= requestAnimationFrame(step);
  };
  const reset = () => aim(0, 0);

  return (
    <div
      className={`depth-scene ${className}`}
      onPointerMove={(event) => {
        if (
          event.pointerType !== "mouse" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        const rect = event.currentTarget.getBoundingClientRect();
        aim(
          (-(event.clientY - rect.top - rect.height / 2) / rect.height) * 5,
          ((event.clientX - rect.left - rect.width / 2) / rect.width) * 6,
        );
      }}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      <div ref={surface} className="depth-surface">
        {children}
      </div>
    </div>
  );
}
