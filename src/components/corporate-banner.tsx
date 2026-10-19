"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
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
  const playing = !paused && !reduced;
  useEffect(() => {
    if (!playing || interacting) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        setActive((value) => (value + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [playing, interacting, active]);
  function show(index: number) {
    setActive((index + slides.length) % slides.length);
  }
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
      <Image
        key={slide.image}
        className="hero-photo corporate-banner-photo"
        src={slide.image}
        alt={`${slide.title} — hình ảnh minh họa`}
        fill
        sizes="100vw"
        loading="eager"
        fetchPriority={active === 0 ? "high" : "auto"}
      />
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
          <div className="banner-dots" aria-label="Chọn hình ảnh">
            {slides.map((item, index) => (
              <button
                key={item.image}
                aria-label={`Hiển thị ảnh ${index + 1}`}
                aria-pressed={index === active}
                onClick={() => show(index)}
              >
                <span />
              </button>
            ))}
          </div>
          <button
            aria-label="Ảnh banner trước"
            onClick={() => show(active - 1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            aria-label="Ảnh banner tiếp theo"
            onClick={() => show(active + 1)}
          >
            <ArrowRight size={18} />
          </button>
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
