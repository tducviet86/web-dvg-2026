"use client";

import { useT } from "@/i18n/client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import {
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Play,
  X,
  Images,
} from "lucide-react";
import type { RentalMedia } from "@/lib/property-media";

function Video({ media }: { media: Extract<RentalMedia, { type: "video" }> }) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <p className="media-error">
        {t("Video chưa tải được.")}{" "}
        <a href={media.src} target="_blank" rel="noopener noreferrer">
          {t("Mở video gốc")}
        </a>
      </p>
    );
  return media.embed ? (
    <iframe
      title={media.alt}
      src={media.src}
      allow="fullscreen; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  ) : (
    <video
      src={media.src}
      controls
      playsInline
      preload="metadata"
      aria-label={media.alt}
      onError={() => setFailed(true)}
    />
  );
}

export function RentalGallery({
  media,
  title,
  demo = false,
}: {
  media: RentalMedia[];
  title: string;
  demo?: boolean;
}) {
  const t = useT();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(0);
  const swipe = useRef<number | null>(null);
  const reduced = useReducedMotion();
  const [viewport, api] = useEmblaCarousel({
    loop: media.length > 1,
    duration: reduced ? 0 : 30,
  });
  useEffect(() => {
    if (!api) return;
    const select = () => setActive(api.selectedScrollSnap());
    api.on("select", select);
    return () => {
      api.off("select", select);
    };
  }, [api]);
  // Beside the main photo: the next four (never the one showing), a video
  // always among them.
  const beside = new Set(
    Array.from(
      { length: Math.min(4, media.length - 1) },
      (_, i) => (active + i + 1) % media.length,
    ),
  );
  const video = media.findIndex((x) => x.type === "video");
  if (video >= 0 && video !== active && !beside.has(video)) {
    beside.delete([...beside].pop()!);
    beside.add(video);
  }
  const hasVideo = video >= 0;
  function next(delta: number) {
    setExpanded((value) => (value + delta + media.length) % media.length);
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div
        className="rental-gallery"
        data-thumbs={beside.size}
        aria-label={t("Ảnh và video căn hộ")}
      >
        <div className="rental-gallery-main">
          <div className="rental-gallery-viewport" ref={viewport}>
            <div className="rental-gallery-track">
              {media.map((item, index) => (
                <div
                  className="rental-gallery-slide"
                  key={item.src}
                  aria-hidden={index !== active}
                  inert={index !== active}
                >
                  {item.type === "image" ? (
                    <Dialog.Trigger asChild>
                      <button
                        className="gallery-image"
                        aria-label={t("Xem ảnh {n} của {title}", {
                          n: index + 1,
                          title,
                        })}
                        onClick={() => setExpanded(index)}
                      >
                        <Image
                          src={item.src}
                          alt={item.alt}
                          fill
                          // Phones: the 270px-high frame crops the sides of
                          // a 16:9 photo, so it is drawn ~1.3× the screen.
                          sizes="(max-width: 560px) 130vw, (max-width: 800px) 100vw, 62vw"
                          loading={index === 0 ? "eager" : "lazy"}
                          // The first photo is the page's main picture.
                          fetchPriority={index === 0 ? "high" : "auto"}
                          draggable={false}
                        />
                        <span className="gallery-enlarge">
                          <Maximize2 size={16} /> {t("Phóng to ảnh")}
                        </span>
                      </button>
                    </Dialog.Trigger>
                  ) : active === index && !open ? (
                    <Video media={item} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          {media.length > 1 && (
            <div className="rental-gallery-arrows">
              <button
                aria-label={t("Ảnh trước trong thư viện")}
                onClick={() => api?.scrollPrev()}
              >
                <ArrowLeft size={20} />
              </button>
              <button
                aria-label={t("Ảnh tiếp trong thư viện")}
                onClick={() => api?.scrollNext()}
              >
                <ArrowRight size={20} />
              </button>
            </div>
          )}
          <span className="rental-gallery-counter">
            {active + 1} / {media.length}
          </span>
          {media.length > 1 && (
            <Dialog.Trigger asChild>
              <button
                className="rental-gallery-all"
                onClick={() => setExpanded(active)}
              >
                <Images size={16} aria-hidden="true" />
                {t(
                  hasVideo
                    ? "Xem tất cả {n} ảnh và video"
                    : "Xem tất cả {n} ảnh",
                  { n: media.length },
                )}
              </button>
            </Dialog.Trigger>
          )}
        </div>
        <div
          className="rental-gallery-thumbs"
          aria-label={t("Chọn ảnh hoặc video")}
        >
          {media.map((item, index) => (
            <button
              key={item.src}
              className={`${index === active ? "selected" : ""} ${beside.has(index) ? "" : "thumb-more"}`}
              aria-pressed={index === active}
              aria-label={
                item.type === "video"
                  ? t("Xem video căn hộ")
                  : t("Chọn ảnh {n}", { n: index + 1 })
              }
              onClick={() => api?.scrollTo(index)}
            >
              {item.type === "image" ? (
                <Image
                  src={item.src}
                  alt=""
                  fill
                  sizes="(max-width: 800px) 120px, 20vw"
                  // The thumbnails shown beside the photo load with it.
                  loading={index < 4 ? "eager" : "lazy"}
                />
              ) : (
                <span>
                  <Play size={26} /> Video
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay rental-lightbox-overlay" />
        <Dialog.Content
          className="rental-lightbox"
          onKeyDown={(e) => {
            if ((e.target as HTMLElement).closest("video, iframe")) return;
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              next(e.key === "ArrowRight" ? 1 : -1);
            }
          }}
        >
          <div className="rental-lightbox-top">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description className="rental-lightbox-hint">
                {demo ? `${t("Ảnh nội thất minh họa.")} ` : ""}
                {t("Dùng phím mũi tên để chuyển ảnh, Escape để đóng.")}
              </Dialog.Description>
            </div>
            <span className="rental-lightbox-count" aria-live="polite">
              {expanded + 1} / {media.length}
            </span>
            <Dialog.Close
              className="rental-lightbox-close"
              aria-label={t("Đóng bộ ảnh")}
            >
              <X size={22} />
            </Dialog.Close>
          </div>
          <div
            className="rental-lightbox-stage"
            onPointerDown={(e) => {
              swipe.current = e.clientX;
            }}
            onPointerUp={(e) => {
              const start = swipe.current;
              swipe.current = null;
              if (start === null) return;
              const dx = e.clientX - start;
              if (Math.abs(dx) > 50) next(dx < 0 ? 1 : -1);
            }}
          >
            {media[expanded].type === "image" ? (
              <Image
                key={media[expanded].src}
                src={media[expanded].src}
                alt={media[expanded].alt}
                fill
                sizes="100vw"
                draggable={false}
                style={{ objectFit: "contain" }}
              />
            ) : (
              <Video
                key={media[expanded].src}
                media={
                  media[expanded] as Extract<RentalMedia, { type: "video" }>
                }
              />
            )}
          </div>
          {media.length > 1 && (
            <>
              <button
                className="rental-lightbox-arrow prev"
                aria-label={t("Ảnh trước")}
                onClick={() => next(-1)}
              >
                <ArrowLeft size={22} />
              </button>
              <button
                className="rental-lightbox-arrow next"
                aria-label={t("Ảnh sau")}
                onClick={() => next(1)}
              >
                <ArrowRight size={22} />
              </button>
              <div
                className="rental-lightbox-thumbs"
                aria-label={t("Chọn ảnh hoặc video")}
              >
                {media.map((item, index) => (
                  <button
                    key={item.src}
                    ref={
                      index === expanded
                        ? (el) =>
                            el?.scrollIntoView({
                              inline: "center",
                              block: "nearest",
                            })
                        : undefined
                    }
                    className={index === expanded ? "selected" : ""}
                    aria-pressed={index === expanded}
                    aria-label={
                      item.type === "video"
                        ? t("Xem video căn hộ")
                        : t("Chọn ảnh {n}", { n: index + 1 })
                    }
                    onClick={() => setExpanded(index)}
                  >
                    {item.type === "image" ? (
                      <Image src={item.src} alt="" fill sizes="96px" />
                    ) : (
                      <Play size={20} />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
