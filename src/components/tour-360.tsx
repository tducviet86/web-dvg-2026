"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useT } from "@/i18n/client";
import { modelTour, type Tour } from "@/lib/model-tours";

type Viewer = {
  destroy: () => void;
  resize: () => void;
  loadScene: (id: string) => void;
  getScene: () => string;
  on: (event: string, handler: () => void) => void;
};
declare global {
  interface Window {
    pannellum?: { viewer: (el: HTMLElement, config: object) => Viewer };
  }
}

const BASE = "/images/projects/capital-square/tour";

/** The viewer's script and styles, once, the first time a tour opens. */
function loadPannellum() {
  if (window.pannellum) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/vendor/pannellum/pannellum.css";
    document.head.append(link);
    const script = document.createElement("script");
    script.src = "/vendor/pannellum/pannellum.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("pannellum"));
    document.head.append(script);
  });
}

function TourStrip({ type }: { type: string }) {
  return (
    <span
      className="tour-strip"
      aria-hidden="true"
      style={{ backgroundImage: `url(${BASE}/${type}/strip.webp)` }}
    />
  );
}

/**
 * Walk through a model apartment in 360°. Loads nothing until the visitor
 * starts it, so the page stays light. `children` sit on the picture.
 */
export function Tour360({
  tour,
  title,
  children,
}: {
  tour: Tour;
  title: string;
  children?: ReactNode;
}) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState(tour.scenes[0].id);
  /** The tour whose first room is on screen. */
  const [ready, setReady] = useState<string | null>(null);
  const [changingRoom, setChangingRoom] = useState(false);
  // Fills the window with CSS: phones have no fullscreen for pages, and on
  // tablets the browser's own fullscreen ends with a swipe.
  const [full, setFull] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const firstLoad = started && !failed && ready !== tour.type;

  useEffect(() => {
    if (!started) return;
    let gone = false;
    loadPannellum()
      .then(() => {
        if (gone || !box.current || !window.pannellum) return;
        const scenes = Object.fromEntries(
          tour.scenes.map((s) => [
            s.id,
            {
              type: "cubemap",
              cubeMap: [0, 1, 2, 3, 4, 5].map(
                (face) => `${BASE}/${tour.type}/${s.id}/${face}.webp`,
              ),
              yaw: s.yaw,
              pitch: s.pitch,
              // One fixed view: no zooming, by mouse or by fingers.
              hfov: 110,
              minHfov: 110,
              maxHfov: 110,
              hotSpots: s.spots.map((spot) => ({
                type: "scene",
                pitch: spot.pitch,
                yaw: spot.yaw,
                sceneId: spot.to,
                text: tour.scenes.find((x) => x.id === spot.to)?.title,
                cssClass: "tour-spot",
              })),
            },
          ]),
        );
        const made = window.pannellum.viewer(box.current, {
          default: {
            firstScene: tour.scenes[0].id,
            autoLoad: true,
            sceneFadeDuration: 800,
            showControls: false,
            autoRotate: -0.6,
            autoRotateInactivityDelay: 4000,
            showFullscreenCtrl: false,
            compass: false,
            // The mouse wheel keeps scrolling the page, never zooms the photo.
            mouseZoom: false,
            doubleClickZoom: false,
          },
          scenes,
        });
        setScene(tour.scenes[0].id);
        made.on("scenechange", () => {
          setScene(made.getScene());
          setChangingRoom(true);
        });
        made.on("load", () => {
          setReady(tour.type);
          setChangingRoom(false);
        });
        made.on("error", () => setFailed(true));
        viewer.current = made;
      })
      .catch(() => setFailed(true));
    return () => {
      gone = true;
      viewer.current?.destroy();
      viewer.current = null;
    };
  }, [started, tour]);

  useEffect(() => {
    viewer.current?.resize();
    if (!full) return;
    const page = document.documentElement;
    const before = page.style.overflow;
    page.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", key);
    return () => {
      page.style.overflow = before;
      window.removeEventListener("keydown", key);
    };
  }, [full]);

  function close() {
    setFull(false);
    setStarted(false);
    setReady(null);
    setChangingRoom(false);
    setPlanOpen(false);
  }

  return (
    <div className="tour">
      <div className={full ? "tour-stage is-full" : "tour-stage"}>
        {started ? (
          <>
            <div ref={box} className="tour-view" aria-label={title} />
            {failed && (
              <p className="tour-failed">
                {t("Chưa tải được tour 360. Vui lòng thử lại sau.")}
              </p>
            )}
            {firstLoad && <TourStrip type={tour.type} />}
            {(firstLoad || (changingRoom && !failed)) && (
              <span
                className="tour-loading"
                role="status"
                aria-label={t("Đang tải")}
              />
            )}
            <button
              type="button"
              className="tour-plan-toggle"
              aria-label={t("Mặt bằng căn hộ")}
              aria-expanded={planOpen}
              onClick={() => setPlanOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 5h14v5h4v9H3zM10 5v6M3 11h7M12 14v5" />
              </svg>
            </button>
            {planOpen && (
              <div
                className="tour-plan"
                role="group"
                aria-label={t("Mặt bằng căn hộ")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BASE}/${tour.type}/plan.webp`}
                  alt=""
                  width={tour.plan.width}
                  height={tour.plan.height}
                />
                {tour.plan.spots.map((spot) => {
                  const room = tour.scenes.find((s) => s.id === spot.to)?.title;
                  return (
                    <button
                      key={spot.to}
                      type="button"
                      className="tour-plan-dot"
                      style={{
                        left: `${spot.x * 100}%`,
                        top: `${spot.y * 100}%`,
                      }}
                      aria-label={room && t(room)}
                      aria-current={spot.to === scene || undefined}
                      data-room={room && t(room)}
                      onClick={() => viewer.current?.loadScene(spot.to)}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            className="tour-start"
            onClick={() => {
              setFailed(false);
              setStarted(true);
            }}
          >
            <TourStrip type={tour.type} />
            <span className="tour-start-text">
              <b>360°</b>
              <strong>{t("Bắt đầu tham quan")}</strong>
             
            </span>
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="tour-logo"
          src="/images/dat-vang-group-logo-transparent.png"
          alt=""
        />
        <div className="tour-dock">
          {children}
          {started && (
            <div className="tour-tools">
              <button
                type="button"
                aria-label={t(full ? "Thu nhỏ màn hình" : "Xem toàn màn hình")}
                onClick={() => setFull(!full)}
              >
                {full ? (
                  <Minimize2 size={17} aria-hidden="true" />
                ) : (
                  <Maximize2 size={17} aria-hidden="true" />
                )}
              </button>
              <button type="button" className="tour-exit" onClick={close}>
                <X size={17} aria-hidden="true" />
                {t("Thoát VR360")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SHOWCASE = [
  ["1pn", "1 phòng ngủ"],
  ["2pn", "2 phòng ngủ"],
  ["3pn", "3 phòng ngủ"],
] as const;

/** The project page's tour: pick a model apartment, then walk through it. */
export function TourShowcase({ title }: { title: string }) {
  const t = useT();
  const [type, setType] = useState<string>("2pn");
  const tour = modelTour(type);
  if (!tour) return null;
  return (
    <Tour360 tour={tour} title={`${title} 360°`}>
      <div className="tour-types" role="group" aria-label={title}>
        {SHOWCASE.map(([code, label]) => (
          <button
            key={code}
            type="button"
            aria-pressed={code === type}
            onClick={() => setType(code)}
          >
            {t(label)}
          </button>
        ))}
      </div>
    </Tour360>
  );
}
