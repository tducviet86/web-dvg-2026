"use client";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";
import type { ReactNode } from "react";

export function DepthScene({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 110, damping: 22 });
  const rotateY = useSpring(y, { stiffness: 110, damping: 22 });
  const reset = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <div
      className={`depth-scene ${className}`}
      onPointerMove={(event) => {
        if (reduced || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(
          (-(event.clientY - rect.top - rect.height / 2) / rect.height) * 5,
        );
        y.set(((event.clientX - rect.left - rect.width / 2) / rect.width) * 6);
      }}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      <motion.div
        className="depth-surface"
        style={{
          rotateX: reduced ? 0 : rotateX,
          rotateY: reduced ? 0 : rotateY,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
