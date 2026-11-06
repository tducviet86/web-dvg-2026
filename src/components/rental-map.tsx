"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Map as MapLibre, Marker } from "maplibre-gl";
import { ArrowLeft, ArrowUpRight, Navigation, Phone, X } from "lucide-react";
import Link from "@/components/page-navigation";
import { useT } from "@/i18n/client";
import { companyHotline, telephoneHref } from "@/lib/company-contact";
import { BUILDING_BLOCKS, blockRing } from "@/lib/rental-map";
import { money } from "@/lib/utils";

export type MapUnit = {
  slug: string;
  name: string;
  rooms: string;
  bedrooms: number;
  area: number;
  /** Million đồng a month. */
  price: number;
  image: string;
  free: boolean;
};
export type MapBuilding = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  url: string;
  units: MapUnit[];
};

const STYLE = "https://tiles.openfreemap.org/styles/positron";
/** Looking north along the river, so a far building still shows up ahead. */
const VIEW = { pitch: 66, bearing: -10 };
const OVERVIEW_ZOOM = { wide: 14.15, narrow: 13.5 };
const PANEL_WIDTH = 360;
/** Neighbouring names lean apart so they do not cover each other. */
const PIN_SHIFT: Record<string, number> = {
  "sun-ponte-residence": -62,
  "hiyori-garden-tower": 62,
  "monarchy-apartments": -30,
  "sun-panoma": 30,
};
/** Tower glass and podium; the chosen tower turns gold. */
const GLASS = "#0f5f5c";
const PODIUM = "#c8a765";
const LIT = "#f2c14e";
const MUTED = "#b7c0ba";
const ROOMS = [0, 1, 2, 3];
const PRICES: [string, number, number][] = [
  ["Mọi mức giá", 0, Infinity],
  ["Dưới 15 triệu", 0, 15],
  ["15–25 triệu", 15, 25],
  ["Trên 25 triệu", 25, Infinity],
];
const call = telephoneHref(companyHotline);

function paintPin(
  pin: HTMLElement,
  title: string,
  lit: boolean,
  empty: boolean,
) {
  pin.textContent = title;
  pin.dataset.lit = String(lit);
  pin.dataset.empty = String(empty);
}

/** Softer land, greener parks and clearer water than the plain style. */
function colourBase(made: MapLibre) {
  for (const layer of made.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    if (layer.type === "background")
      made.setPaintProperty(layer.id, "background-color", "#f5f0e6");
    if (layer.type === "fill") {
      if (id.includes("water"))
        made.setPaintProperty(layer.id, "fill-color", "#9fd3d6");
      else if (/park|wood|grass|landcover|landuse/.test(id))
        made.setPaintProperty(layer.id, "fill-color", "#dbe8cd");
      else if (id.includes("building"))
        made.setLayoutProperty(layer.id, "visibility", "none");
    }
    if (layer.type === "line" && /highway|road/.test(id))
      made.setPaintProperty(layer.id, "line-color", "#ffffff");
  }
}

/** Buildings on a real map as 3D blocks, with their units to rent beside it. */
export function RentalMap({ buildings }: { buildings: MapBuilding[] }) {
  const t = useT();
  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const markers = useRef<Record<string, { el: HTMLElement; marker: Marker }>>(
    {},
  );
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [rooms, setRooms] = useState(0);
  const [price, setPrice] = useState(0);
  const [freeOnly, setFreeOnly] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const shown = useMemo(
    () =>
      buildings.map((b) => ({
        ...b,
        units: b.units.filter(
          (u) =>
            (!rooms || u.bedrooms === rooms) &&
            u.price >= PRICES[price][1] &&
            u.price < PRICES[price][2] &&
            (!freeOnly || u.free),
        ),
      })),
    [buildings, rooms, price, freeOnly],
  );
  const current = shown.find((b) => b.slug === chosen);
  const overview = useMemo(() => {
    const lats = buildings.map((b) => b.lat);
    const south = Math.min(...lats);
    return {
      center: [
        buildings.reduce((n, b) => n + b.lng, 0) / buildings.length,
        south + (Math.max(...lats) - south) * 0.3,
      ] as [number, number],
      ...VIEW,
    };
  }, [buildings]);
  const choose = useRef<(slug: string | null) => void>(() => {});
  useEffect(() => {
    choose.current = (slug) => {
      setChosen(slug);
      const place = buildings.find((b) => b.slug === slug);
      const wide = window.innerWidth > 900;
      if (place)
        map.current?.flyTo({
          center: [place.lng, place.lat],
          zoom: 15.9,
          pitch: 60,
          bearing: -30,
          duration: 1500,
          padding: {
            top: 0,
            bottom: 0,
            left: 0,
            right: wide ? PANEL_WIDTH : 0,
          },
        });
      else
        map.current?.flyTo({
          ...overview,
          zoom: wide ? OVERVIEW_ZOOM.wide : OVERVIEW_ZOOM.narrow,
          duration: 1200,
          padding: { top: 0, bottom: 0, left: 0, right: 0 },
        });
    };
  }, [buildings, overview]);

  // The library and the tiles load only when the map comes near the screen.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let gone = false;
    const start = async () => {
      try {
        const [maplibre] = await Promise.all([
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl.css"),
        ]);
        if (gone || !box.current) return;
        maplibre.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
        const made = new maplibre.Map({
          container: box.current,
          style: STYLE,
          ...overview,
          zoom:
            window.innerWidth > 900 ? OVERVIEW_ZOOM.wide : OVERVIEW_ZOOM.narrow,
          attributionControl: { compact: true },
          // One finger and the wheel keep scrolling the page.
          cooperativeGestures: true,
          locale: {
            "CooperativeGesturesHandler.WindowsHelpText": t(
              "Giữ Ctrl và cuộn để phóng to bản đồ",
            ),
            "CooperativeGesturesHandler.MacHelpText": t(
              "Giữ ⌘ và cuộn để phóng to bản đồ",
            ),
            "CooperativeGesturesHandler.MobileHelpText": t(
              "Dùng hai ngón tay để di chuyển bản đồ",
            ),
          },
        });
        made.addControl(
          new maplibre.NavigationControl({ visualizePitch: true }),
          "top-right",
        );
        map.current = made;
        made.on("error", (e) => {
          if (!made.loaded() && !made.isStyleLoaded()) console.warn(e.error);
        });
        made.on("load", () => {
          colourBase(made);
          made.setLight({
            anchor: "map",
            position: [1.4, 200, 40],
            color: "#fff4e0",
            intensity: 0.45,
          });
          if (made.getSource("openmaptiles"))
            made.addLayer({
              id: "dvg-city",
              type: "fill-extrusion",
              source: "openmaptiles",
              "source-layer": "building",
              minzoom: 13,
              paint: {
                "fill-extrusion-color": "#f3ecdd",
                "fill-extrusion-height": [
                  "coalesce",
                  ["get", "render_height"],
                  8,
                ],
                "fill-extrusion-opacity": 0.85,
              },
            });
          made.addSource("dvg-blocks", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: buildings.flatMap((b) =>
                (BUILDING_BLOCKS[b.slug] ?? []).map((block) => ({
                  type: "Feature" as const,
                  properties: {
                    slug: b.slug,
                    podium: block.base === 0,
                    base: block.base,
                    height: block.height,
                  },
                  geometry: {
                    type: "Polygon" as const,
                    coordinates: [blockRing(b.lat, b.lng, block)],
                  },
                })),
              ),
            },
          });
          made.addLayer({
            id: "dvg-blocks",
            type: "fill-extrusion",
            source: "dvg-blocks",
            paint: {
              "fill-extrusion-color": GLASS,
              "fill-extrusion-base": ["get", "base"],
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-opacity": 1,
            },
          });
          made.on("mousemove", "dvg-blocks", (e) => {
            made.getCanvas().style.cursor = "pointer";
            setHovered(String(e.features?.[0]?.properties?.slug ?? ""));
          });
          made.on("mouseleave", "dvg-blocks", () => {
            made.getCanvas().style.cursor = "";
            setHovered(null);
          });
          made.on("click", "dvg-blocks", (e) => {
            const slug = e.features?.[0]?.properties?.slug;
            if (slug) choose.current(String(slug));
          });
          for (const b of buildings) {
            const label = document.createElement("button");
            label.type = "button";
            label.className = "rmap-pin";
            label.addEventListener("click", () => choose.current(b.slug));
            label.addEventListener("mouseenter", () => setHovered(b.slug));
            label.addEventListener("mouseleave", () => setHovered(null));
            markers.current[b.slug] = {
              el: label,
              marker: new maplibre.Marker({
                element: label,
                anchor: "bottom",
                offset: [
                  (PIN_SHIFT[b.slug] ?? 0) *
                    (window.innerWidth > 900 ? 1 : 0.4),
                  -40,
                ],
              })
                .setLngLat([b.lng, b.lat])
                .addTo(made),
            };
          }
          setReady(true);
        });
      } catch {
        setFailed(true);
      }
    };
    const watch = new IntersectionObserver(
      (seen) => {
        if (!seen.some((x) => x.isIntersecting)) return;
        watch.disconnect();
        void start();
      },
      { rootMargin: "300px" },
    );
    watch.observe(el);
    const pins = markers;
    return () => {
      gone = true;
      watch.disconnect();
      map.current?.remove();
      map.current = null;
      pins.current = {};
    };
    // Built once; the labels and colours below follow the state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pin text and block colours follow the filters, the hover and the choice.
  useEffect(() => {
    if (!ready || !map.current) return;
    const lit = hovered ?? chosen;
    // Only a filter greys a building out: it means "nothing matches".
    const filtering = rooms > 0 || price > 0 || freeOnly;
    for (const b of shown) {
      const pin = markers.current[b.slug]?.el;
      if (!pin) continue;
      paintPin(pin, b.name, b.slug === lit, filtering && !b.units.length);
    }
    const empty = filtering
      ? shown.filter((b) => !b.units.length).map((b) => b.slug)
      : [];
    map.current.setPaintProperty("dvg-blocks", "fill-extrusion-color", [
      "case",
      ["==", ["get", "slug"], lit ?? ""],
      LIT,
      ["in", ["get", "slug"], ["literal", empty]],
      MUTED,
      ["get", "podium"],
      PODIUM,
      GLASS,
    ]);
  }, [ready, shown, hovered, chosen, rooms, price, freeOnly]);

  return (
    <div className="rmap">
      <div className="rmap-filters" role="group" aria-label={t("Lọc căn")}>
        <div className="rmap-pills">
          {ROOMS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={rooms === n}
              onClick={() => setRooms(n)}
            >
              {n ? t("{n} PN", { n }) : t("Tất cả")}
            </button>
          ))}
        </div>
        <div className="rmap-pills">
          {PRICES.map(([label], i) => (
            <button
              key={label}
              type="button"
              aria-pressed={price === i}
              onClick={() => setPrice(i)}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <label className="rmap-free">
          <input
            type="checkbox"
            checked={freeOnly}
            onChange={(e) => setFreeOnly(e.target.checked)}
          />
          {t("Chỉ căn đang trống")}
        </label>
      </div>
      <div className="rmap-body" data-open={Boolean(current)}>
        <div ref={stage} className="rmap-stage">
          <div ref={box} className="rmap-canvas" />
          {failed && (
            <p className="rmap-failed">
              {t("Chưa tải được bản đồ. Bạn vẫn chọn được tòa ở bên dưới.")}
            </p>
          )}
          {chosen && (
            <button
              type="button"
              className="rmap-reset"
              onClick={() => choose.current(null)}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {t("Toàn cảnh")}
            </button>
          )}
        </div>
        <div className="rmap-towers" role="group" aria-label={t("Chọn tòa")}>
          {shown.map((b) => (
            <button
              key={b.slug}
              type="button"
              aria-pressed={b.slug === chosen}
              onMouseEnter={() => setHovered(b.slug)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => choose.current(b.slug)}
            >
              {b.name}
            </button>
          ))}
        </div>
        {current && (
          <aside key={current.slug} className="rmap-panel">
            <header className="rmap-head">
              <h3>{current.name}</h3>
              <button
                type="button"
                className="rmap-close"
                aria-label={t("Đóng")}
                onClick={() => choose.current(null)}
              >
                <X size={16} aria-hidden="true" />
              </button>
              <nav>
                {call && (
                  <a href={call}>
                    <Phone size={15} aria-hidden="true" />
                    {t("Gọi")}
                  </a>
                )}
                <a href={current.url} target="_blank" rel="noopener noreferrer">
                  <Navigation size={15} aria-hidden="true" />
                  {t("Chỉ đường")}
                </a>
              </nav>
            </header>
            <ul className="rmap-units">
              {current.units.map((u) => (
                <li key={u.slug}>
                  <Link href={`/cho-thue/${u.slug}`}>
                    <span className="rmap-photo">
                      {u.image && (
                        <Image src={u.image} alt="" fill sizes="96px" />
                      )}
                    </span>
                    <span className="rmap-unit">
                      <b>{u.name}</b>
                      <small>
                        {u.rooms} · {u.area} m²
                      </small>
                      <strong>
                        {t("{price} triệu/tháng", { price: money(u.price) })}
                      </strong>
                      <span className="rmap-more">
                        {t("Xem chi tiết")}
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {!current.units.length && (
                <li className="rmap-none">
                  {t(
                    "Tòa này chưa có căn phù hợp. Bạn thử đổi bộ lọc hoặc gọi để được tư vấn.",
                  )}
                </li>
              )}
            </ul>
          </aside>
        )}
      </div>
      <p className="rmap-note">
        {t("Khối tòa nhà chỉ minh hoạ vị trí và độ cao tương đối.")}
      </p>
    </div>
  );
}
