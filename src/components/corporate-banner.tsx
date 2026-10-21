"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { MoveHorizontal, Pause, Play } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { photos } from "@/data";

const slides = [
  {
    image: photos.building,
    title: "Kiến trúc hòa cùng thiên nhiên",
    label: "KHÔNG GIAN & KIẾN TRÚC",
  },
  {
    image: photos.pool,
    title: "Góc nhìn về những không gian sống",
    label: "CẢM HỨNG PHÁT TRIỂN",
  },
  {
    image: photos.hero,
    title: "Chăm chút giá trị từ mỗi không gian",
    label: "TRẢI NGHIỆM & VẬN HÀNH",
  },
];

export function CorporateBanner() {
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
    api.on("select", select).on("pointerDown", down).on("pointerUp", up);
    return () => {
      api.off("select", select).off("pointerDown", down).off("pointerUp", up);
    };
  }, [api]);
  useEffect(() => {
    if (!playing || interacting || !api) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") api.scrollNext();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [playing, interacting, active, api]);
  const slide = slides[active];
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
            if (event.key === "ArrowRight") api?.scrollNext();
            else api?.scrollPrev();
          }
        }}
      >
        <div className="banner-swipe-track">
          {slides.map((item, index) => (
            <div
              className="banner-swipe-slide"
              key={item.image}
              aria-hidden={index !== active}
            >
              <Image
                className="hero-photo corporate-banner-photo"
                src={item.image}
                alt={`${item.title} — hình ảnh minh họa`}
                fill
                sizes="100vw"
                draggable={false}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
              />
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
          <span>{slide.label}</span>
          <p>{slide.title}</p>
          <small>Hình ảnh minh họa</small>
        </div>
        <div className="banner-controls">
          <span className="banner-count">
            0{active + 1}
            <i />0{slides.length}
          </span>
          <span className="banner-swipe-hint">
            <MoveHorizontal size={21} /> Kéo để khám phá
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
