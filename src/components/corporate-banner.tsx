"use client";

import { useT } from "@/i18n/client";
import { getImageProps } from "next/image";
import { useEffect, useState } from "react";
import { preload } from "react-dom";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Link from "@/components/page-navigation";
import { canOptimizeImage, type ResolvedBanner } from "@/lib/banners";

const PHONE = "(max-width: 768px)";

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
    // Full-screen photos: a little less compression than other heroes.
    quality: 70,
    loading: first ? ("eager" as const) : ("lazy" as const),
    fetchPriority: first ? ("high" as const) : ("auto" as const),
  };
  const { props } = getImageProps({
    ...common,
    src: slide.image,
    unoptimized: !canOptimizeImage(slide.image),
  });
  // Phones get their own copy (the phone photo, else the same one) a little
  // more compressed: on a slow connection it is the page's main picture.
  const phoneSrc = slide.mobileImage || slide.image;
  const mobile = getImageProps({
    ...common,
    quality: 60,
    src: phoneSrc,
    unoptimized: !canOptimizeImage(phoneSrc),
  }).props;
  if (first) {
    // Requested from the <head>, before the page's styles and scripts.
    for (const [copy, media] of [
      [mobile, PHONE],
      [props, `not all and ${PHONE}`],
    ] as const)
      preload(copy.src, {
        as: "image",
        imageSrcSet: copy.srcSet,
        imageSizes: copy.sizes,
        fetchPriority: "high",
        media,
      });
  }
  return (
    <picture>
      <source
        media={PHONE}
        srcSet={mobile.srcSet || mobile.src}
        sizes={mobile.sizes}
      />
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

/** Slides are resolved on the server from the banner API (SEO-visible links). */
export function CorporateBanner({ slides }: { slides: ResolvedBanner[] }) {
  const t = useT();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const reduced = useReducedMotion();
  const [viewport, api] = useEmblaCarousel({
    loop: true,
    duration: reduced ? 0 : 35,
  });
  const playing = !paused && !reduced;
  // The other slides' photos wait until the page has loaded, so the first
  // one (the page's main picture) has the connection to itself.
  const [later, setLater] = useState(false);
  useEffect(() => {
    const go = () => setLater(true);
    if (document.readyState === "complete") {
      go();
      return;
    }
    window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, []);
  useEffect(() => {
    if (!api) return;
    const select = () => setActive(api.selectedScrollSnap());
    const down = () => {
      setInteracting(true);
      setLater(true);
    };
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
  const caption = (item: ResolvedBanner) => (
    <>
      {item.label && <span>{item.label}</span>}
      <p>{item.title}</p>
      {item.description && <small>{item.description}</small>}
      {item.href && (
        <em className="banner-caption-cue" aria-hidden="true">
          {t("Xem chi tiết dự án")} <ArrowUpRight size={14} />
        </em>
      )}
    </>
  );
  return (
    <section
      className="corporate-banner"
      aria-roledescription={t("trình chiếu")}
      aria-label={t("Hình ảnh Đất Vàng Group")}
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
        aria-label={t(
          "Kéo hoặc vuốt để chuyển ảnh. Dùng phím mũi tên trái và phải khi sử dụng bàn phím.",
        )}
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
                  aria-label={`${t("Xem chi tiết dự án")} ${item.projectName}`}
                >
                  {(index === 0 || later) && (
                    <BannerPicture slide={item} first={index === 0} />
                  )}
                </Link>
              ) : (
                (index === 0 || later) && (
                  <BannerPicture slide={item} first={index === 0} />
                )
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="corporate-banner-shade" />
      <div className="signature-hero-content container">
        <div className="signature-hero-eyebrow">
          <span>{t("ĐÀ NẴNG, VIỆT NAM")}</span>
          <span>{t("BẤT ĐỘNG SẢN / KẾT NỐI / PHÁT TRIỂN")}</span>
        </div>
      </div>
      <div className="corporate-banner-bottom container">
        {/* Hidden copies keep the height of the longest caption, so changing
            slide moves nothing on the page. */}
        <div className="banner-captions" aria-live={paused ? "polite" : "off"}>
          {slides.map((item) => (
            <div
              key={item.id}
              className="banner-caption-spacer"
              aria-hidden="true"
            >
              {caption(item)}
            </div>
          ))}
          <div key={slide.id} className="banner-caption">
            {caption(slide)}
          </div>
        </div>
        <div className="banner-controls">
          <span className="banner-count">
            0{active + 1}
            <i />0{slides.length}
          </span>
          {!reduced && (
            <button
              aria-label={t(
                playing ? "Tạm dừng trình chiếu" : "Phát trình chiếu",
              )}
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
