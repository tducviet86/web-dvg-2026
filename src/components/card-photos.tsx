"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const STEP_MS = 1500;

/**
 * The unit's other photos, fading over the card photo while a mouse is on the
 * card. They load on the first hover, so a list stays light; touch screens
 * and visitors who asked for less motion keep the single photo.
 */
export function CardPhotos({ photos }: { photos: string[] }) {
  const box = useRef<HTMLSpanElement>(null);
  const ready = useRef(new Set<number>());
  const [wanted, setWanted] = useState(false);
  const [hovering, setHovering] = useState(false);
  /** Index in `photos`; -1 shows the card's own photo. */
  const [shown, setShown] = useState(-1);

  useEffect(() => {
    const card = box.current?.closest("article, li");
    if (
      !card ||
      !photos.length ||
      !matchMedia("(hover: hover) and (min-width: 641px)").matches ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const enter = () => {
      setWanted(true);
      setHovering(true);
    };
    const leave = () => {
      setHovering(false);
      setShown(-1);
    };
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointerleave", leave);
    return () => {
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointerleave", leave);
    };
  }, [photos.length]);

  useEffect(() => {
    if (!hovering) return;
    const timer = setInterval(
      () =>
        // The next loaded photo; after the last one, the card's own.
        setShown((now) => {
          for (let i = now + 1; i < photos.length; i++)
            if (ready.current.has(i)) return i;
          return -1;
        }),
      STEP_MS,
    );
    return () => clearInterval(timer);
  }, [hovering, photos.length]);

  return (
    <span ref={box} className="card-photos" aria-hidden="true">
      {wanted &&
        photos.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            sizes="(max-width: 1024px) 50vw, 33vw"
            loading="eager"
            data-shown={i === shown || undefined}
            onLoad={() => ready.current.add(i)}
          />
        ))}
    </span>
  );
}
