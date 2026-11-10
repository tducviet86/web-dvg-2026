"use client";
import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibre, Marker } from "maplibre-gl";
import { ArrowUpRight, LocateFixed, MapPin, Navigation } from "lucide-react";
import { useT } from "@/i18n/client";

/** Where a page's map leads the visitor: the project. */
export type RouteTarget = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};
type Spot = { lat: number; lng: number };
type Found = { km: number; minutes: number };

/** Public OSRM: the road route by car, as a line. */
const ROUTER = "https://router.project-osrm.org/route/v1/driving/";

/**
 * Under a page's map: the project's address, the visitor's own position (the
 * browser asks first) and the way there drawn on the map, with Google Maps for
 * turn-by-turn directions.
 */
export function MapRoute({
  map,
  target,
}: {
  map: MapLibre | null;
  target: RouteTarget;
}) {
  const t = useT();
  const [state, setState] = useState<
    "" | "locating" | "routing" | "denied" | "failed"
  >("");
  const [me, setMe] = useState<Spot | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const meMarker = useRef<Marker | null>(null);

  // The project's pin.
  useEffect(() => {
    if (!map) return;
    let pin: Marker | undefined;
    let gone = false;
    void import("maplibre-gl").then(({ Marker }) => {
      if (gone) return;
      const el = document.createElement("span");
      el.className = "mroute-goal";
      pin = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([target.lng, target.lat])
        .addTo(map);
    });
    return () => {
      gone = true;
      pin?.remove();
      meMarker.current?.remove();
    };
  }, [map, target.lat, target.lng]);

  const draw = async (from: Spot) => {
    if (!map) return;
    setState("routing");
    try {
      const res = await fetch(
        `${ROUTER}${from.lng},${from.lat};${target.lng},${target.lat}?overview=full&geometries=geojson`,
      );
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!res.ok || !route) throw new Error("no route");
      const line = {
        type: "Feature" as const,
        properties: {},
        geometry: route.geometry,
      };
      const source = map.getSource("dvg-route") as GeoJSONSource | undefined;
      if (source) source.setData(line);
      else {
        map.addSource("dvg-route", { type: "geojson", data: line });
        map.addLayer({
          id: "dvg-route-edge",
          type: "line",
          source: "dvg-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#ffffff", "line-width": 9 },
        });
        map.addLayer({
          id: "dvg-route",
          type: "line",
          source: "dvg-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#1f6feb", "line-width": 5 },
        });
      }
      const points = route.geometry.coordinates as [number, number][];
      const lngs = points.map((p) => p[0]);
      const lats = points.map((p) => p[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 60, pitch: 45, duration: 1400, maxZoom: 16 },
      );
      setFound({
        km: route.distance / 1000,
        minutes: Math.max(1, Math.round(route.duration / 60)),
      });
      setState("");
    } catch {
      setState("failed");
    }
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setState("denied");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const spot = { lat: coords.latitude, lng: coords.longitude };
        setMe(spot);
        if (map) {
          const { Marker } = await import("maplibre-gl");
          meMarker.current?.remove();
          const el = document.createElement("span");
          el.className = "mroute-me";
          meMarker.current = new Marker({ element: el })
            .setLngLat([spot.lng, spot.lat])
            .addTo(map);
        }
        await draw(spot);
      },
      () => setState("denied"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const google = `https://www.google.com/maps/dir/?api=1${
    me ? `&origin=${me.lat},${me.lng}` : ""
  }&destination=${target.lat},${target.lng}`;
  const busy = state === "locating" || state === "routing";

  return (
    <div className="mroute">
      <p className="mroute-place">
        <MapPin size={18} aria-hidden="true" />
        <span>
          <strong>{target.name}</strong>
          {target.address && <small>{target.address}</small>}
        </span>
      </p>
      <div className="mroute-actions">
        <button
          type="button"
          className="mroute-go"
          onClick={locate}
          disabled={busy || !map}
        >
          <LocateFixed size={17} aria-hidden="true" />
          {state === "locating"
            ? t("Đang lấy vị trí của bạn…")
            : state === "routing"
              ? t("Đang tìm đường…")
              : found
                ? t("Tìm lại đường đi")
                : t("Chỉ đường từ vị trí của tôi")}
        </button>
        <a href={google} target="_blank" rel="noopener noreferrer">
          <Navigation size={16} aria-hidden="true" />
          {t("Mở Google Maps")}
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
      <p className="mroute-result" aria-live="polite">
        {state === "denied"
          ? t(
              "Chưa lấy được vị trí. Hãy cho phép trình duyệt dùng vị trí, hoặc mở Google Maps.",
            )
          : state === "failed"
            ? t("Chưa tìm được đường đi lúc này. Hãy thử mở Google Maps.")
            : found
              ? t("{km} km · khoảng {min} phút đi xe", {
                  km: found.km.toLocaleString("vi-VN", {
                    maximumFractionDigits: 1,
                  }),
                  min: found.minutes,
                })
              : ""}
      </p>
    </div>
  );
}
