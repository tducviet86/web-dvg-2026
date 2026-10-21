"use client";

import { getImageProps } from "next/image";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowUpRight, MoveHorizontal, Pause, Play } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Link from "@/components/page-navigation";
import { banners as seedBanners, projects as seedProjects } from "@/data";
import {
  BANNER_STORE,
  canOptimizeImage,
  publicBanners,
  type ResolvedBanner,
} from "@/lib/banners";

const subscribe = (callback: () => void) => {
  window.addEventListener("dvg-storage", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("dvg-storage", callback);
    window.removeEventListener("storage", callback);
  };
};
/** Raw stored JSON (a stable string snapshot); null on the server. */
function useStored(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(`dvg:${key}`);
      } catch {
        return null;
      }
    },
    () => null,
  );
}
function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
const defaultSlides = publicBanners(seedBanners, seedProjects);

function BannerPicture({
  slide,
  first,
}: {
  slide: ResolvedBanner;
  first: boolean;
}) {
  const common = {
    alt: slide.alt,
    fill: true,
    sizes: "100vw",
    loading: first ? ("eager" as const) : ("lazy" as const),
    fetchPriority: first ? ("high" as const) : ("auto" as const),
  };
  const { props } = getImageProps({
    ...common,
    src: slide.image,
    unoptimized: !canOptimizeImage(slide.image),
  });
  const mobile = slide.mobileImage
    ? getImageProps({
        ...common,
        src: slide.mobileImage,
        unoptimized: !canOptimizeImage(slide.mobileImage),
      }).props
    : null;
  return (
    <picture>
      {mobile && (
        <source
          media="(max-width: 768px)"
          srcSet={mobile.srcSet || mobile.src}
          sizes={mobile.sizes}
        />
      )}
      {/* getImageProps supplies Next.js optimised src/srcSet; <picture> is needed for art direction. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
      <img
        {...props}
        className="hero-photo corporate-banner-photo"
        draggable={false}
      />
    </picture>
  );
}

export function CorporateBanner() {
  const storedBanners = useStored(BANNER_STORE);
  const storedProjects = useStored("projects");
  // Server and hydration render the seed banners; admin changes saved in this
  // browser apply right after hydration, so there is no hydration mismatch.
  const slides = useMemo(() => {
    if (!storedBanners) return defaultSlides;
    const visible = publicBanners(
      parse(storedBanners, seedBanners),
      parse(storedProjects, seedProjects),
    );
    return visible.length ? visible : defaultSlides;
  }, [storedBanners, storedProjects]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const reduced = useReducedMotion();
  const [viewport, api] = useEmblaCarousel({
    loop: true,
    duration: reduced ? 0 : 35,
  });
  const playing = !paused && !reduced;
  useEffect(() => {
    if (!api) return;
    const select = () => setActive(api.selectedScrollSnap());
    const down = () => setInteracting(true);
    const up = () => setInteracting(false);
    api
      .on("select", select)
      .on("reInit", select)
      .on("pointerDown", down)
      .on("pointerUp", up);
    return () => {
      api
        .off("select", select)
        .off("reInit", select)
        .off("pointerDown", down)
        .off("pointerUp", up);
    };
  }, [api]);
  useEffect(() => {
    if (!playing || interacting || !api) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") api.scrollNext();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [playing, interacting, active, api]);
  const slide = slides[Math.min(active, slides.length - 1)];
  return (
    <section
      className="corporate-banner"
      aria-roledescription="trình chiếu"
      aria-label="Hình ảnh Đất Vàng Group"
      onFocusCapture={(event) =>
        setInteracting(event.target.matches(":focus-visible"))
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteracting(false);
      }}
    >
      <div
        ref={viewport}
        className="banner-swipe-viewport"
        tabIndex={0}
        aria-label="Kéo hoặc vuốt để chuyển ảnh. Dùng phím mũi tên trái và phải khi sử dụng bàn phím."
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            // Keep focus when the focused slide link becomes inert.
            if (event.target !== event.currentTarget)
              event.currentTarget.focus();
            if (event.key === "ArrowRight") api?.scrollNext();
            else api?.scrollPrev();
          }
        }}
      >
        <div className="banner-swipe-track">
          {slides.map((item, index) => (
            <div
              className="banner-swipe-slide"
              key={item.id}
              aria-hidden={index !== active}
              inert={index !== active}
            >
              {item.href ? (
                // Real href so crawlers follow it; Embla cancels the click
                // after a drag, so swiping never triggers navigation.
                <Link
                  href={item.href}
                  className="banner-slide-link"
                  draggable={false}
                  aria-label={`Xem chi tiết dự án ${item.projectName}`}
                >
                  <BannerPicture slide={item} first={index === 0} />
                </Link>
              ) : (
                <BannerPicture slide={item} first={index === 0} />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="corporate-banner-shade" />
      <div className="signature-hero-content container">
        <div className="signature-hero-eyebrow">
          <span>ĐÀ NẴNG, VIỆT NAM</span>
          <span>BẤT ĐỘNG SẢN / KẾT NỐI / PHÁT TRIỂN</span>
        </div>
      </div>
      <div className="corporate-banner-bottom container">
        <div className="banner-caption" aria-live={paused ? "polite" : "off"}>
          {slide.label && <span>{slide.label}</span>}
          <p>{slide.title}</p>
          {slide.description && <small>{slide.description}</small>}
          {slide.href && (
            <em className="banner-caption-cue" aria-hidden="true">
              Xem chi tiết dự án <ArrowUpRight size={14} />
            </em>
          )}
        </div>
        <div className="banner-controls">
          <span className="banner-count">
            0{active + 1}
            <i />0{slides.length}
          </span>
          {!reduced && (
            <button
              aria-label={playing ? "Tạm dừng trình chiếu" : "Phát trình chiếu"}
              onClick={() => {
                setPaused((value) => !value);
                setInteracting(false);
              }}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
