"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibre,
  Marker,
} from "maplibre-gl";
import {
  ArrowLeft,
  ArrowUpRight,
  Box,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Eye,
  Layers,
  Maximize2,
  MapPin,
  Minimize2,
  Moon,
  Navigation,
  Phone,
  Play,
  RotateCw,
  Ruler,
  Search,
  Share2,
  Square,
  X,
} from "lucide-react";
import Link from "@/components/page-navigation";
import { useT } from "@/i18n/client";
import type { Towers, TowerHit } from "./map-towers";
import { planArea } from "./plan-cutout";
import { companyHotline, telephoneHref } from "@/lib/company-contact";
import { towerFloors, type FloorData } from "@/lib/floor-3d";
import {
  BUILDING_BLOCKS,
  FLOOR_METRES,
  NEARBY_PLACES,
  blockCentre,
  distance,
  VILLA_METRES,
  lotFeatures,
  lotPlan,
  raisedRings,
  rowRings,
  siteRings,
} from "@/lib/rental-map";

// Three.js loads only when a visitor opens a floor plan.
const FloorPlan3D = dynamic(() => import("./floor-plan-3d"), { ssr: false });

export type MapUnit = {
  slug: string;
  name: string;
  rooms: string;
  area: number;
  priceText: string;
  href: string;
  image: string;
  tower: string;
};
export type MapBuilding = {
  slug: string;
  name: string;
  location: string;
  area: string;
  image: string;
  /** The project's own page. */
  page: string;
  facts: { label: string; value: string }[];
  lat: number;
  lng: number;
  url: string;
  units: MapUnit[];
  /** Plans for the 3D floor view, when the project has them. */
  floors?: FloorData;
};
/** What a shared link opens: /ban-do?du-an=…&toa=…&tang=…&can=… */
export type MapSelection = {
  slug?: string;
  tower?: string;
  floor?: string;
  unit?: string;
};

const STYLE = "https://tiles.openfreemap.org/styles/positron";
/** Looking north along the river, so a far building still shows up ahead. */
const VIEW = { pitch: 66, bearing: -10 };
const OVERVIEW_ZOOM = { wide: 14.15, narrow: 13.5 };
const PANEL_WIDTH = 360;
/**
 * Neighbouring names open to opposite sides so they do not cover each other or
 * the towers; the name's tail always points at its own tower.
 */
const PIN_SIDE: Record<string, "left" | "right"> = {
  "sun-ponte-residence": "left",
  "monarchy-apartments": "right",
};
/** Tail's distance from the end of a name that opens to one side. */
const TAIL = 22;
/** Floors under the first apartments of a tower with plans. */
const BASE_LEVELS = 4;
const LOOKS = [
  ["Bắc", 0],
  ["Đông", 90],
  ["Nam", 180],
  ["Tây", 270],
] as const;
const call = telephoneHref(companyHotline);
// Marks along the horizon while looking out from a floor.
const COMPASS = [
  "Bắc",
  "Đông Bắc",
  "Đông",
  "Đông Nam",
  "Nam",
  "Tây Nam",
  "Tây",
  "Tây Bắc",
];

/** Compass bearing in degrees from one place to another. */
function bearingTo(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const cos = Math.cos((from.lat * Math.PI) / 180);
  const angle = Math.atan2((to.lng - from.lng) * cos, to.lat - from.lat);
  return ((angle * 180) / Math.PI + 360) % 360;
}

function paintPin(pin: HTMLElement, title: string, lit: boolean) {
  pin.textContent = title;
  pin.dataset.lit = String(lit);
}

function showPin(pin: HTMLElement, shown: boolean) {
  pin.hidden = !shown;
}

/** Pixels from a building's foot to its roof at the map's zoom and tilt. */
function roofLift(made: MapLibre, b: MapBuilding) {
  return liftOf(
    made,
    b,
    Math.max(0, ...(BUILDING_BLOCKS[b.slug] ?? []).map((x) => x.height)),
  );
}
function liftOf(made: MapLibre, b: MapBuilding, metres: number) {
  const perMetre =
    (512 * 2 ** made.getZoom()) /
    (40_075_016 * Math.cos((b.lat * Math.PI) / 180));
  return metres * perMetre * Math.sin((made.getPitch() * Math.PI) / 180);
}

type OpenLot = {
  slug: string;
  code: string;
  kind: string;
  area: number;
  floors: number;
  ring: number[][];
};

/** One house cut at a floor, with its roof `lift` metres above: "lifting the roof". */
function drawOpenLot(
  made: MapLibre,
  lot: OpenLot | null,
  floor: number,
  lift: number,
) {
  const source = made.getSource("dvg-lot-open") as GeoJSONSource | undefined;
  if (!source) return;
  const top = floor * FLOOR_METRES;
  const part = (base: number, height: number, colour: string) => ({
    type: "Feature" as const,
    properties: { base, height, colour },
    geometry: { type: "Polygon" as const, coordinates: [lot?.ring ?? []] },
  });
  source.setData({
    type: "FeatureCollection",
    features: lot
      ? [part(0, top, "#f2c14e"), part(top + lift, top + lift + 1.2, "#b4613f")]
      : [],
  });
}

/** Lots by kind, in the master plans' colours, softened. */
const LOT_COLOURS: ExpressionSpecification = [
  "match",
  ["get", "kind"],
  "Biệt thự song lập",
  "#e8a66f",
  "Biệt thự đơn lập",
  "#e3c461",
  "Biệt thự song lập đặc biệt",
  "#cfa0d6",
  "#dcc095",
];

/**
 * A tower's floors: as on its floor plans, or, for a tower without plans,
 * simply counted from the ground. `level` is the floor's height in the model.
 */
function towerLevels(building: MapBuilding | undefined, tower: string) {
  const planned = towerFloors(building?.floors?.plans ?? [], tower);
  // Plans may start at floor 1 (shops) or above a base (Capital Square: 5).
  const first = parseInt(planned[0] ?? "", 10) || BASE_LEVELS + 1;
  if (planned.length)
    return {
      floors: planned,
      first,
      level: (floor: string) => planned.indexOf(floor) + first,
      planned: true,
    };
  const block = BUILDING_BLOCKS[building?.slug ?? ""]?.find(
    (b) => b.tower === tower && !b.soon && !b.low,
  );
  const count = block ? Math.round(block.height / FLOOR_METRES) : 0;
  return {
    floors: Array.from({ length: count }, (_, i) => String(i + 1)),
    first: 1,
    level: (floor: string) => Number(floor),
    planned: false,
  };
}

type Peek = NonNullable<ReturnType<Towers["pickUnit"]>>;

/** The card about a unit follows the pointer, kept inside the map. */
function movePeek(el: HTMLElement | null, x: number, y: number) {
  if (!el) return;
  const box = el.parentElement?.getBoundingClientRect();
  const left = box && x + 300 > box.width ? x - 296 : x + 18;
  const top = box ? Math.min(Math.max(8, y - 120), box.height - 290) : y;
  el.style.transform = `translate(${left}px, ${top}px)`;
}

/** Whether a point lies inside a closed ring. */
// The map's own blocks, and those beside a model (see "dvg-near").
function showCity(made: MapLibre | null, on: boolean) {
  for (const id of ["dvg-city", "dvg-near"])
    if (made?.getLayer(id))
      made.setLayoutProperty(id, "visibility", on ? "visible" : "none");
}

function inRing([x, y]: [number, number], ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
      inside = !inside;
  }
  return inside;
}

/** The map's own label colours, to go back to after dark. */
const labelColours = new Map<string, unknown>();

/** Softer land, greener parks and clearer water; deep blues after dark. */
function colourBase(made: MapLibre, night: boolean) {
  for (const layer of made.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    if (layer.type === "background")
      made.setPaintProperty(
        layer.id,
        "background-color",
        night ? "#101e24" : "#f5f0e6",
      );
    if (layer.type === "fill") {
      if (id.includes("water"))
        made.setPaintProperty(
          layer.id,
          "fill-color",
          night ? "#0b2c3d" : "#9fd3d6",
        );
      else if (/park|wood|grass|landcover|landuse/.test(id))
        made.setPaintProperty(
          layer.id,
          "fill-color",
          night ? "#16302a" : "#dbe8cd",
        );
      else if (id.includes("building"))
        made.setLayoutProperty(layer.id, "visibility", "none");
    }
    if (layer.type === "line" && /highway|road/.test(id))
      made.setPaintProperty(
        layer.id,
        "line-color",
        night ? "#2e4650" : "#ffffff",
      );
    if (layer.type === "symbol") {
      if (!labelColours.has(layer.id))
        labelColours.set(
          layer.id,
          made.getPaintProperty(layer.id, "text-color"),
        );
      made.setPaintProperty(
        layer.id,
        "text-color",
        night ? "#c9d6d2" : (labelColours.get(layer.id) as never),
      );
      made.setPaintProperty(
        layer.id,
        "text-halo-color",
        night ? "#0c1d19" : "#ffffff",
      );
    }
    if (layer.id === "dvg-lots")
      made.setPaintProperty(
        layer.id,
        "fill-extrusion-color",
        night ? ["case", ["get", "lit"], "#f2c878", "#3b4548"] : LOT_COLOURS,
      );
    if (layer.id === "dvg-villas")
      made.setPaintProperty(
        layer.id,
        "fill-extrusion-color",
        night ? ["case", ["get", "lit"], "#f2c878", "#3b4548"] : "#dcc095",
      );
    if (layer.id === "dvg-city" || layer.id === "dvg-near")
      made.setPaintProperty(
        layer.id,
        "fill-extrusion-color",
        night ? "#22333a" : "#f3ecdd",
      );
  }
  made.setSky({
    "sky-color": night ? "#07131f" : "#a9d8ea",
    "horizon-color": night ? "#2a3550" : "#f8ecd4",
    "fog-color": night ? "#101e24" : "#f5f0e6",
    "sky-horizon-blend": 0.7,
    "horizon-fog-blend": 0.6,
    "fog-ground-blend": 0.75,
    "atmosphere-blend": 0,
  });
}

/** The label that follows the pointer over a floor. */
function placeTip(
  el: HTMLElement | null,
  x: number,
  y: number,
  title: string,
  hint = "",
) {
  if (!el) return;
  el.hidden = !title;
  if (!title) return;
  const heading = el.firstElementChild;
  if (heading) heading.textContent = title;
  const note = el.lastElementChild;
  if (note) note.textContent = hint;
  // Kept inside the map at its right edge (long names on a phone).
  const room = (el.parentElement?.clientWidth ?? Infinity) - el.offsetWidth - 8;
  el.style.transform = `translate(${Math.max(0, Math.min(x + 16, room))}px, ${y - 12}px)`;
}

/** Lower-case and without accents, so "son tra" finds "Sơn Trà". */
const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

const metres = (m: number) =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;

/**
 * Buildings on a real map as 3D blocks, with their units beside it. `full` is
 * the whole-screen page: search, tools, landmarks and the 3D floor plans.
 */
export function RentalMap({
  buildings,
  full = false,
  places = [],
  initial = {},
}: {
  buildings: MapBuilding[];
  full?: boolean;
  /** Translated names of NEARBY_PLACES. */
  places?: string[];
  initial?: MapSelection;
}) {
  const t = useT();
  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const markers = useRef<Record<string, { el: HTMLElement; marker: Marker }>>(
    {},
  );
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [chosen, setChosen] = useState<string | null>(
    buildings.some((b) => b.slug === initial.slug)
      ? (initial.slug as string)
      : null,
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [tower, setTower] = useState(initial.tower ?? "");
  const [plan, setPlan] = useState<{ floor: string; unit: string } | null>(
    initial.floor ? { floor: initial.floor, unit: initial.unit ?? "" } : null,
  );
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [sheet, setSheet] = useState(false);
  const [flat, setFlat] = useState(false);
  const [landmarks, setLandmarks] = useState(true);
  const [tab, setTab] = useState<"" | "info" | "units" | "around">("");
  const [hour, setHour] = useState(10);
  const [night, setNight] = useState(false);
  const [sunOpen, setSunOpen] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [measured, setMeasured] = useState<number | null>(null);
  const [touring, setTouring] = useState(false);
  const [view, setView] = useState<{
    floor: string;
    bearing: number;
    /** Half the camera's width, in degrees. */
    half: number;
  } | null>(null);
  // Where the camera looks while in a view, as the visitor turns it.
  const [heading, setHeading] = useState(0);
  const [copied, setCopied] = useState(false);
  const [lot, setLot] = useState<OpenLot | null>(null);
  const [lotFloor, setLotFloor] = useState(1);
  const lotPlanNow = lot
    ? lotPlan(lot.slug, lot.kind, lot.area, lotFloor)
    : null;
  const openLot = useRef<(next: OpenLot) => void>(() => {});
  const [focus, setFocus] = useState<{
    slug: string;
    tower: string;
    floor: string;
  } | null>(null);
  const openTowerFloor = useRef<
    (slug: string, tower: string, floor: string) => void
  >(() => {});
  const tip = useRef<HTMLDivElement>(null);
  const towers = useRef<Towers | null>(null);
  const measureOn = useRef(false);
  const focusOn = useRef(false);
  const [peek, setPeek] = useState<Peek | null>(null);
  const peekBox = useRef<HTMLDivElement>(null);
  const peekAt = useRef<(unit: Peek | null, x: number, y: number) => void>(
    () => {},
  );
  const openUnit = useRef<(tower: string, unit: string) => void>(() => {});
  const tourRun = useRef(0);
  const stopTour = useRef(() => {});
  const towerPins = useRef<{ slug: string; el: HTMLElement }[]>([]);
  const placePins = useRef<HTMLElement[]>([]);

  const current = buildings.find((b) => b.slug === chosen);
  const units =
    current?.units.filter((u) => !tower || !u.tower || u.tower === tower) ?? [];
  const areas = [...new Set(buildings.map((b) => b.area).filter(Boolean))];
  const found = buildings.filter(
    (b) =>
      (!area || b.area === area) &&
      plain(
        [
          b.name,
          b.location,
          b.area,
          ...(b.floors?.towers ?? []).map((x) => x.name),
        ].join(" "),
      ).includes(plain(query.trim())),
  );
  const around = current
    ? NEARBY_PLACES.map((p, i) => ({
        name: places[i] ?? p.name,
        away: distance(current, p),
      }))
        .sort((a, b) => a.away - b.away)
        .slice(0, 4)
    : [];
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
  const choose = useRef<
    (slug: string | null, tower?: string, keepPlan?: boolean) => void
  >(() => {});
  useEffect(() => {
    choose.current = (slug, towerName = "", keepPlan = false) => {
      setChosen(slug);
      setTower(towerName);
      setTab("");
      if (!keepPlan) {
        setPlan(null);
        setFocus(null);
        towers.current?.closeFloor();
        showCity(map.current, true);
      }
      setSheet(false);
      const place = buildings.find((b) => b.slug === slug);
      const wide = window.innerWidth > 900;
      const block = BUILDING_BLOCKS[slug ?? ""]?.find(
        (x) => towerName && x.tower === towerName,
      );
      if (place)
        map.current?.flyTo({
          center: block
            ? blockCentre(place.lat, place.lng, block)
            : [place.lng, place.lat],
          zoom: block ? 16.8 : 15.9,
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
        const [maplibre, , kit] = await Promise.all([
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl.css"),
          import("./map-towers"),
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
          cooperativeGestures: !full,
          maxPitch: 85,
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
          made.setLight({
            anchor: "map",
            position: [1.4, 200, 40],
            color: "#fff4e0",
            intensity: 0.45,
          });
          const villas = buildings.flatMap((b) =>
            raisedRings(b.slug, b.lat, b.lng),
          );
          const rows = buildings.flatMap((b) => rowRings(b.slug, b.lat, b.lng));
          // The map's own villas, copied as they load and raised a little wider
          // than the originals, which stay hidden inside them.
          let raisedCount = -1;
          made.on("idle", () => {
            const features = made
              .querySourceFeatures("openmaptiles", { sourceLayer: "building" })
              .flatMap((f) =>
                // Blocks often arrive joined into one feature for each tile.
                f.geometry.type === "Polygon"
                  ? [f.geometry.coordinates[0]]
                  : f.geometry.type === "MultiPolygon"
                    ? f.geometry.coordinates.map((part) => part[0])
                    : [],
              )
              .flatMap((part) => {
                const outer = part as [number, number][];
                const lng = outer.reduce((n, p) => n + p[0], 0) / outer.length;
                const lat = outer.reduce((n, p) => n + p[1], 0) / outer.length;
                const here: [number, number] = [lng, lat];
                if (
                  !villas.some((ring) => inRing(here, ring)) ||
                  rows.some((ring) => inRing(here, ring))
                )
                  return [];
                return [
                  {
                    type: "Feature" as const,
                    // By place, so a house loaded twice has one colour.
                    properties: {
                      lit: Math.floor((lng + lat) * 40_000) % 5 < 2,
                    },
                    geometry: {
                      type: "Polygon" as const,
                      coordinates: [
                        outer.map(([x, y]) => [
                          lng + (x - lng) * 1.04,
                          lat + (y - lat) * 1.04,
                        ]),
                      ],
                    },
                  },
                ];
              });
            if (features.length === raisedCount) return;
            raisedCount = features.length;
            (
              made.getSource("dvg-villas") as GeoJSONSource | undefined
            )?.setData({
              type: "FeatureCollection",
              features,
            });
          });
          // The map's blocks arrive joined, so a block touching a model or a
          // row of lots is hidden whole; its other parts are drawn again as
          // "dvg-near".
          const sites = [
            ...buildings.flatMap((b) => siteRings(b.slug, b.lat, b.lng)),
            ...rows,
          ];
          const touches = (part: number[][]) =>
            sites.some(
              (site) =>
                part.some((p) => inRing(p as [number, number], site)) ||
                site.some((p) => inRing(p as [number, number], part)),
            );
          let nearCount = -1;
          made.on("idle", () => {
            const features = made
              .querySourceFeatures("openmaptiles", { sourceLayer: "building" })
              .flatMap((f) => {
                const parts =
                  f.geometry.type === "Polygon"
                    ? [f.geometry.coordinates[0]]
                    : f.geometry.type === "MultiPolygon"
                      ? f.geometry.coordinates.map((part) => part[0])
                      : [];
                if (!parts.some(touches)) return [];
                return parts
                  .filter((part) => !touches(part))
                  .map((part) => ({
                    type: "Feature" as const,
                    properties: { height: f.properties.render_height ?? 8 },
                    geometry: { type: "Polygon" as const, coordinates: [part] },
                  }));
              });
            if (features.length === nearCount) return;
            nearCount = features.length;
            (made.getSource("dvg-near") as GeoJSONSource | undefined)?.setData({
              type: "FeatureCollection",
              features,
            });
          });
          if (made.getSource("openmaptiles")) {
            made.addSource("dvg-near", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
            made.addLayer({
              id: "dvg-near",
              type: "fill-extrusion",
              source: "dvg-near",
              paint: {
                "fill-extrusion-color": "#f3ecdd",
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-opacity": 0.85,
              },
            });
            made.addLayer({
              id: "dvg-city",
              type: "fill-extrusion",
              source: "openmaptiles",
              "source-layer": "building",
              minzoom: 13,
              filter: [
                "!=",
                [
                  "distance",
                  {
                    type: "MultiPolygon",
                    coordinates: sites.map((ring) => [ring]),
                  },
                ],
                0,
              ],
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
          }
          made.addSource("dvg-villas", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          made.addLayer({
            id: "dvg-villas",
            type: "fill-extrusion",
            source: "dvg-villas",
            paint: {
              "fill-extrusion-color": "#dcc095",
              "fill-extrusion-height": VILLA_METRES,
            },
          });
          made.addSource("dvg-lots", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: buildings.flatMap((b) =>
                lotFeatures(b.slug, b.lat, b.lng),
              ),
            },
          });
          made.addLayer({
            id: "dvg-lots",
            type: "fill-extrusion",
            source: "dvg-lots",
            paint: {
              "fill-extrusion-color": LOT_COLOURS,
              "fill-extrusion-height": ["get", "height"],
            },
          });
          made.addLayer({
            id: "dvg-lot-lit",
            type: "fill-extrusion",
            source: "dvg-lots",
            filter: ["==", ["get", "code"], "-"],
            paint: {
              "fill-extrusion-color": "#f2c14e",
              "fill-extrusion-height": ["+", ["get", "height"], 0.4],
            },
          });
          made.addSource("dvg-lot-open", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          made.addLayer({
            id: "dvg-lot-open",
            type: "fill-extrusion",
            source: "dvg-lot-open",
            paint: {
              "fill-extrusion-color": ["get", "colour"],
              "fill-extrusion-base": ["get", "base"],
              "fill-extrusion-height": ["get", "height"],
            },
          });
          made.on("click", "dvg-lots", (e) => {
            if (measureOn.current) return;
            const lot = e.features?.[0];
            if (!lot?.properties?.slug) return;
            if (!lot.properties.code) {
              choose.current(String(lot.properties.slug));
              return;
            }
            openLot.current({
              slug: String(lot.properties.slug),
              code: String(lot.properties.code),
              kind: String(lot.properties.kind),
              area: Number(lot.properties.area),
              floors: Number(lot.properties.floors),
              ring: (lot.geometry as { coordinates: number[][][] })
                .coordinates[0],
            });
          });
          colourBase(made, false);
          const models = kit.createTowers(made, buildings);
          towers.current = models;
          made.addLayer(models.layer);
          models.setSun(10, false);
          // The first look comes down from above onto the city.
          if (full && !initial.slug) {
            const zoom = made.getZoom();
            made.jumpTo({ zoom: zoom - 1.4, pitch: 20, bearing: 40 });
            made.easeTo({
              zoom,
              pitch: VIEW.pitch,
              bearing: VIEW.bearing,
              duration: 2600,
            });
          }
          made.addSource("dvg-measure", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          made.addLayer({
            id: "dvg-measure-line",
            type: "line",
            source: "dvg-measure",
            paint: {
              "line-color": "#d9412f",
              "line-width": 3,
              "line-dasharray": [2, 1],
            },
          });
          made.addLayer({
            id: "dvg-measure-dots",
            type: "circle",
            source: "dvg-measure",
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
              "circle-radius": 6,
              "circle-color": "#d9412f",
              "circle-stroke-color": "#fff",
              "circle-stroke-width": 2,
            },
          });
          /** The floor a pointer is on, when the tower has plans for it. */
          const floorOf = (hit: TowerHit | null) => {
            if (!full || !hit?.tower || hit.soon) return "";
            const { floors, planned, first } = towerLevels(
              buildings.find((b) => b.slug === hit.slug),
              hit.tower,
            );
            if (!floors.length) return "";
            if (!planned) return floors[Math.min(hit.level, floors.length) - 1];
            if (hit.level < first) return "";
            return floors[Math.min(hit.level - first, floors.length - 1)];
          };
          made.on("mousemove", (e) => {
            if (focusOn.current) {
              const unit = models.pickUnit(e.point.x, e.point.y);
              models.hoverUnit(unit ? `${unit.tower}/${unit.unit}` : "");
              made.getCanvas().style.cursor = unit ? "pointer" : "";
              peekAt.current(unit, e.point.x, e.point.y);
              return;
            }
            if (measureOn.current) return;
            const hit = models.pick(e.point.x, e.point.y);
            const floor = floorOf(hit);
            const lotHit = hit
              ? undefined
              : made.queryRenderedFeatures(e.point, {
                  layers: ["dvg-lots"],
                })[0]?.properties;
            const lotCode = lotHit?.code ? String(lotHit.code) : "";
            const hoverLot = lotCode
              ? `${lotCode} · ${t(String(lotHit?.kind ?? ""))} · ${planArea(Number(lotHit?.area))}`
              : "";
            made.setFilter("dvg-lot-lit", [
              "==",
              ["get", "code"],
              lotCode || "-",
            ]);
            made.getCanvas().style.cursor =
              (hit && !hit.soon) || lotCode ? "pointer" : "";
            setHovered(hit?.slug ?? null);
            models.markFloor(
              hit?.slug ?? "",
              hit?.tower ?? "",
              floor ? (hit?.level ?? 0) : 0,
            );
            placeTip(
              tip.current,
              e.point.x,
              e.point.y,
              hit?.soon
                ? t("Sắp ra mắt")
                : floor
                  ? `${t("Tầng")} ${floor}`
                  : hoverLot,
            );
          });
          made.getCanvas().addEventListener("mouseleave", () => {
            setHovered(null);
            models.markFloor("", "", 0);
            placeTip(tip.current, 0, 0, "");
          });
          const picks: [number, number][] = [];
          made.on("click", (e) => {
            if (measureOn.current) {
              if (picks.length === 2) picks.length = 0;
              picks.push([e.lngLat.lng, e.lngLat.lat]);
              (made.getSource("dvg-measure") as GeoJSONSource).setData({
                type: "FeatureCollection",
                features: [
                  ...picks.map((coordinates) => ({
                    type: "Feature" as const,
                    properties: {},
                    geometry: { type: "Point" as const, coordinates },
                  })),
                  ...(picks.length === 2
                    ? [
                        {
                          type: "Feature" as const,
                          properties: {},
                          geometry: {
                            type: "LineString" as const,
                            coordinates: picks,
                          },
                        },
                      ]
                    : []),
                ],
              });
              setMeasured(
                picks.length === 2
                  ? distance(
                      { lat: picks[0][1], lng: picks[0][0] },
                      { lat: picks[1][1], lng: picks[1][0] },
                    )
                  : null,
              );
              return;
            }
            if (focusOn.current) {
              const unit = models.pickUnit(e.point.x, e.point.y);
              if (unit) openUnit.current(unit.tower, unit.unit);
              return;
            }
            const hit = models.pick(e.point.x, e.point.y);
            if (!hit || hit.soon) return;
            const floor = floorOf(hit);
            // A mouse opens the floor it points at; a finger chooses the tower first.
            const opens =
              floor &&
              (window.matchMedia("(hover: hover)").matches ||
                towerPins.current.some(
                  (p) =>
                    p.el.dataset.lit === "true" &&
                    p.el.textContent === hit.tower,
                ));
            choose.current(hit.slug, hit.tower, !!opens);
            if (opens) openTowerFloor.current(hit.slug, hit.tower, floor);
          });
          stopTour.current = () => {
            tourRun.current++;
            setTouring(false);
          };
          for (const name of ["mousedown", "touchstart", "wheel"] as const)
            made.on(name, () => stopTour.current());
          for (const b of buildings) {
            const label = document.createElement("button");
            label.type = "button";
            label.className = "rmap-pin";
            label.addEventListener("click", () => choose.current(b.slug));
            label.addEventListener("mouseenter", () => setHovered(b.slug));
            label.addEventListener("mouseleave", () => setHovered(null));
            const side = PIN_SIDE[b.slug];
            if (side) label.dataset.side = side;
            markers.current[b.slug] = {
              el: label,
              marker: new maplibre.Marker({
                element: label,
                // The name opens away from the tower, its tail over the roof.
                anchor:
                  side === "left"
                    ? "bottom-right"
                    : side === "right"
                      ? "bottom-left"
                      : "bottom",
              })
                .setLngLat([b.lng, b.lat])
                .addTo(made),
            };
          }
          const towerMarks: {
            pin: Marker;
            building: MapBuilding;
            metres: number;
          }[] = [];
          // A project's towers get their names, on their roofs, once it is chosen.
          for (const b of buildings)
            for (const block of BUILDING_BLOCKS[b.slug] ?? []) {
              // Blocks of one name ("Rio") share one label.
              if (
                !block.tower ||
                towerPins.current.some(
                  (p) => p.slug === b.slug && p.el.textContent === block.tower,
                )
              )
                continue;
              const label = document.createElement("button");
              label.type = "button";
              label.className = "rmap-tower-pin";
              if (block.soon) {
                label.dataset.soon = t("Sắp ra mắt");
                label.disabled = true;
              }
              label.textContent = block.tower;
              label.addEventListener("click", () =>
                choose.current(b.slug, block.tower),
              );
              towerPins.current.push({ slug: b.slug, el: label });
              const pin = new maplibre.Marker({
                element: label,
                anchor: "bottom",
              })
                .setLngLat(blockCentre(b.lat, b.lng, block))
                .addTo(made);
              towerMarks.push({ pin, building: b, metres: block.height });
            }
          if (full)
            NEARBY_PLACES.forEach((p, i) => {
              const label = document.createElement("span");
              label.className = "rmap-place";
              label.textContent = places[i] ?? p.name;
              placePins.current.push(label);
              new maplibre.Marker({ element: label })
                .setLngLat([p.lng, p.lat])
                .addTo(made);
            });
          const movePins = () => {
            for (const m of towerMarks)
              m.pin.setOffset([0, -(liftOf(made, m.building, m.metres) + 4)]);
            for (const b of buildings) {
              const side = PIN_SIDE[b.slug];
              markers.current[b.slug]?.marker.setOffset([
                side === "left" ? TAIL : side === "right" ? -TAIL : 0,
                -(roofLift(made, b) + 8),
              ]);
            }
          };
          movePins();
          made.on("move", movePins);
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

  // Pin text and block colours follow the hover and the choice.
  useEffect(() => {
    if (!ready || !map.current) return;
    const lit = hovered ?? chosen;
    for (const b of buildings) {
      const pin = markers.current[b.slug]?.el;
      if (!pin) continue;
      paintPin(pin, b.name, b.slug === lit);
      // Names stay hidden until a building is pointed at or chosen.
      showPin(pin, found.includes(b) && b.slug === lit && b.slug !== chosen);
    }
    for (const pin of towerPins.current) {
      // Names would cover the towers; only "coming soon" stays marked.
      showPin(pin.el, pin.slug === chosen && !!pin.el.dataset.soon);
      paintPin(pin.el, pin.el.textContent ?? "", pin.el.textContent === tower);
    }
    for (const place of placePins.current) showPin(place, landmarks);
    towers.current?.highlight(lit, hovered ? "" : tower);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, buildings, hovered, chosen, tower, landmarks, query, area]);

  // Time of day: light, windows, shadows and the colours of the map.
  useEffect(() => {
    if (!ready || !map.current) return;
    towers.current?.setSun(hour, night);
  }, [ready, hour, night]);
  useEffect(() => {
    if (ready && map.current) colourBase(map.current, night);
  }, [ready, night]);
  useEffect(() => {
    measureOn.current = measuring;
  }, [measuring]);
  useEffect(() => {
    focusOn.current = !!focus;
  }, [focus]);

  // A shared link opens where the visitor was: fly there once the map is up.
  const opened = useRef(false);
  useEffect(() => {
    if (!ready || opened.current) return;
    opened.current = true;
    // What is open now, not the link's: the visitor may have moved on already.
    if (chosen) choose.current(chosen, tower, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // The address follows the choice, so it can be shared.
  useEffect(() => {
    if (!full) return;
    const next = new URLSearchParams();
    if (chosen) next.set("du-an", chosen);
    if (chosen && tower) next.set("toa", tower);
    if (chosen && plan) {
      next.set("tang", plan.floor);
      if (plan.unit) next.set("can", plan.unit);
    }
    const q = next.toString();
    window.history.replaceState(
      null,
      "",
      q ? `${location.pathname}?${q}` : location.pathname,
    );
  }, [full, chosen, tower, plan]);

  useEffect(() => {
    /** From outside to above the house, then the roof lifts off. */
    openLot.current = (next) => {
      const made = map.current;
      if (!made) return;
      setLot(next);
      setLotFloor(1);
      setSheet(false);
      made.setFilter("dvg-lots", ["!=", ["get", "code"], next.code]);
      drawOpenLot(made, next, next.floors, 0);
      const middle = next.ring
        .slice(0, 4)
        .reduce((n, p) => [n[0] + p[0] / 4, n[1] + p[1] / 4], [0, 0]) as [
        number,
        number,
      ];
      made.flyTo({ center: middle, zoom: 18.4, pitch: 38, duration: 1800 });
      made.once("moveend", () => {
        const started = performance.now();
        const step = (now: number) => {
          const u = Math.min(1, (now - started) / 900);
          drawOpenLot(made, next, 1, 30 * (1 - (1 - u) ** 3));
          if (u < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    };
    /** The same for a tower's floor: its drawing shows on the map itself. */
    openTowerFloor.current = (slug, towerName, floor) => {
      const made = map.current;
      const place = buildings.find((b) => b.slug === slug);
      const block = BUILDING_BLOCKS[slug]?.find((x) => x.tower === towerName);
      if (!made || !place || !block) return;
      const level = towerLevels(place, towerName).level(floor);
      const image =
        place.floors?.plans.find(
          (p) => p.tower === towerName && p.floors.includes(floor),
        )?.image ?? "";
      setFocus({ slug, tower: towerName, floor });
      setPeek(null);
      placeTip(tip.current, 0, 0, "");
      // The map's own blocks would cover low floors: hidden while one is open.
      showCity(made, false);
      setPlan(null);
      towers.current?.markFloor("", "", 0);
      made.flyTo({
        center: blockCentre(place.lat, place.lng, block),
        zoom: 18.4,
        pitch: 12,
        duration: 1800,
      });
      // After the new flight starts: stopping the last one also ends a move.
      made.once("moveend", () => {
        towers.current?.openFloor(slug, towerName, level, image, () => {});
        // A drawing of the whole site's floor opens the other towers with it.
        if (!image) return;
        for (const other of place.floors?.towers ?? []) {
          if (other.name === towerName) continue;
          const same = place.floors?.plans.find(
            (p) =>
              p.tower === other.name &&
              p.image === image &&
              p.floors.includes(floor),
          );
          if (!same) continue;
          towers.current?.openFloor(
            slug,
            other.name,
            towerLevels(place, other.name).level(floor),
            image,
            () => {},
            true,
          );
        }
      });
    };
  }, [buildings]);
  useEffect(() => {
    peekAt.current = (unit, x, y) => {
      setPeek((was) =>
        was?.unit === unit?.unit && was?.tower === unit?.tower ? was : unit,
      );
      movePeek(peekBox.current, x, y);
    };
    openUnit.current = (towerName, unit) => {
      if (!focus) return;
      setTower(towerName);
      setPlan({ floor: focus.floor, unit });
    };
  }, [focus]);
  const peekModel =
    focus && peek
      ? buildings
          .find((b) => b.slug === focus.slug)
          ?.floors?.units.find(
            (u) =>
              u.tower === peek.tower &&
              u.number === peek.unit &&
              (!u.floor || u.floor === focus.floor),
          )
      : undefined;
  const peekKey = peek ? `${peek.image.split("/").pop()}/${peek.unit}` : "";
  const peekKind = peek
    ? buildings.find((b) => b.slug === focus?.slug)?.floors?.kinds?.[peekKey]
    : undefined;
  // The unit's own 3D picture, else one of a unit of the same kind.
  const ownPictureUrl = peek
    ? buildings.find((b) => b.slug === focus?.slug)?.floors?.pictures?.[peekKey]
    : undefined;
  const peekPicture = ownPictureUrl ?? peekKind?.picture ?? peekModel?.picture;
  const ownPicture = !!ownPictureUrl;
  const leaveFocus = () => {
    setPeek(null);
    towers.current?.closeFloor();
    showCity(map.current, true);
    setFocus(null);
    map.current?.easeTo({ pitch: VIEW.pitch, zoom: 16.8, duration: 1200 });
  };
  const focusLevels = focus
    ? towerLevels(
        buildings.find((b) => b.slug === focus.slug),
        focus.tower,
      )
    : null;
  const focusFloors = focusLevels?.floors ?? [];
  const focusNote = focus
    ? buildings.find((b) => b.slug === focus.slug)?.floors?.notes?.[
        `${focus.tower}/${focus.floor}`
      ]
    : undefined;
  const focusAt = focus ? focusFloors.indexOf(focus.floor) : -1;

  const closeLot = () => {
    const made = map.current;
    setLot(null);
    if (!made) return;
    made.setFilter("dvg-lots", null);
    drawOpenLot(made, null, 1, 0);
    made.easeTo({ pitch: VIEW.pitch, zoom: 16.4, duration: 1200 });
  };

  // Only some towers have floor plans; the others open the first that does.
  const planTower = current?.floors?.towers.some((x) => x.name === tower)
    ? tower
    : (current?.floors?.towers[0]?.name ?? tower);
  const towerNames = [
    ...new Set(
      (BUILDING_BLOCKS[current?.slug ?? ""] ?? []).flatMap((b) =>
        b.tower && !b.soon ? [b.tower] : [],
      ),
    ),
  ];
  const shownTab = tab || (current?.facts.length ? "info" : "units");

  /** Flies from building to building, turning around each, until stopped. */
  const startTour = () => {
    const made = map.current;
    if (!made || !found.length) return;
    choose.current(null);
    const run = ++tourRun.current;
    setTouring(true);
    const visit = (i: number) => {
      if (run !== tourRun.current) return;
      const b = found[i % found.length];
      setHovered(b.slug);
      made.once("moveend", () => {
        if (run !== tourRun.current) return;
        made.once("moveend", () => visit(i + 1));
        made.easeTo({
          bearing: made.getBearing() + 80,
          duration: 6000,
          easing: (x) => x,
        });
      });
      made.flyTo({
        center: [b.lng, b.lat],
        zoom: 16.2,
        pitch: 68,
        bearing: (i * 70) % 360,
        duration: 3500,
      });
    };
    visit(0);
  };

  /** The camera at a floor's height, looking one way from the tower. */
  const lookFrom = (floor: string, bearing: number) => {
    const made = map.current;
    const block = BUILDING_BLOCKS[current?.slug ?? ""]?.find(
      (x) => x.tower === planTower,
    );
    if (!made || !current || !block) return;
    const level = towerLevels(current, planTower).level(floor);
    const [lng, lat] = blockCentre(current.lat, current.lng, block);
    const zoom = 17.4;
    const pitch = 80;
    const perPixel =
      (40_075_016 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
    const back = 1.5 * made.getCanvas().clientHeight * perPixel;
    const ahead = back * Math.sin((pitch * Math.PI) / 180);
    const turn = (bearing * Math.PI) / 180;
    // The whole city around, with this tower out of the way.
    towers.current?.closeFloor();
    showCity(made, true);
    setFocus(null);
    towers.current?.hide(current.slug, planTower);
    towers.current?.markFloor("", "", 0);
    made.setCenterClampedToGround(false);
    made.jumpTo({
      center: [
        lng +
          (Math.sin(turn) * ahead) /
            (111_320 * Math.cos((lat * Math.PI) / 180)),
        lat + (Math.cos(turn) * ahead) / 110_574,
      ],
      zoom,
      pitch,
      bearing,
      elevation:
        level * FLOOR_METRES - back * Math.cos((pitch * Math.PI) / 180),
    });
    setPlan(null);
    setHeading(bearing);
    const aspect = made.getCanvas().clientWidth / made.getCanvas().clientHeight;
    // MapLibre's camera sees about 37° from top to bottom.
    const half =
      (Math.atan(Math.tan((18.43 * Math.PI) / 180) * aspect) * 180) / Math.PI;
    setView({ floor, bearing, half });
  };
  const leaveView = () => {
    if (!view) return;
    towers.current?.hide("", "");
    map.current?.setCenterClampedToGround(true);
    map.current?.jumpTo({ elevation: 0, pitch: VIEW.pitch });
    setPlan({ floor: view.floor, unit: "" });
    setView(null);
  };
  // The horizon marks follow the camera as the visitor drags it round.
  useEffect(() => {
    const made = map.current;
    if (!view || !made) return;
    const turn = () => setHeading((made.getBearing() + 360) % 360);
    made.on("rotate", turn);
    return () => {
      made.off("rotate", turn);
    };
  }, [view]);
  const horizon = (() => {
    if (!view || !current) return { marks: [], left: "", right: "" };
    const half = view.half;
    const offOf = (at: number) => ((at - heading + 540) % 360) - 180;
    const seen = [
      // Đà Nẵng's coast runs north–south: the sea lies east.
      { name: t("Biển"), at: 90, away: 0 },
      ...NEARBY_PLACES.map((p, i) => ({
        name: places[i] ?? p.name,
        at: bearingTo(current, p),
        away: distance(current, p),
      })),
      ...buildings
        .filter((b) => b.slug !== current.slug)
        .map((b) => ({
          name: b.name,
          at: bearingTo(current, b),
          away: distance(current, b),
        })),
    ]
      .map((p) => ({
        ...p,
        off: offOf(p.at),
        label: p.away ? `${p.name} · ${metres(p.away)}` : p.name,
      }))
      .sort((a, b) => a.off - b.off);
    // Places in one direction share a mark: the nearest, and how many more.
    const groups: (typeof seen)[] = [];
    for (const p of seen.filter((p) => Math.abs(p.off) <= half)) {
      const last = groups.at(-1);
      if (last && p.off - last[0].off < half * 0.3) last.push(p);
      else groups.push([p]);
    }
    const marks = [
      ...COMPASS.map((name, i) => ({
        name: t(name),
        off: offOf(i * 45),
        main: true,
      })).filter((m) => Math.abs(m.off) <= half),
      ...groups.map((group) => {
        const [near] = [...group].sort((a, b) => a.away - b.away);
        return {
          name:
            group.length > 1
              ? `${near.label} +${group.length - 1}`
              : near.label,
          off: group[0].off,
          main: false,
        };
      }),
    ].map((m) => ({ ...m, left: 50 + (m.off / half) * 50 }));
    // Places just out of sight are named at the edge they lie beyond.
    const beyond = (side: number) =>
      seen
        .filter((p) => p.off * side > half && p.off * side <= 100)
        .sort((a, b) => a.off * side - b.off * side)
        .map((p) => p.name);
    return {
      marks,
      left: beyond(-1)
        .map((n) => `‹ ${n}`)
        .join("   "),
      right: beyond(1)
        .map((n) => `${n} ›`)
        .join("   "),
    };
  })();
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rmap" data-full={full || undefined}>
      {full && (
        <aside className="rmap-side" data-open={sheet}>
          <button
            type="button"
            className="rmap-side-handle"
            aria-expanded={sheet}
            onClick={() => setSheet((v) => !v)}
          >
            {t("{n} dự án và tòa nhà", { n: found.length })}
          </button>
          <div className="rmap-side-title">
            <h1>{t("Bản đồ dự án Đà Nẵng")}</h1>
            <Link href="/cho-thue" className="rmap-exit">
              <Minimize2 size={16} aria-hidden="true" />
              {t("Thu nhỏ")}
            </Link>
          </div>
          <label className="rmap-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder={t("Tìm dự án, tòa, khu vực…")}
              aria-label={t("Tìm dự án, tòa, khu vực")}
              onFocus={() => setSheet(true)}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {areas.length > 1 && (
            <div className="rmap-areas" role="group" aria-label={t("Khu vực")}>
              {["", ...areas].map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={area === name}
                  onClick={() => setArea(name)}
                >
                  {name || t("Tất cả")}
                </button>
              ))}
            </div>
          )}
          <ul className="rmap-list">
            {found.map((b) => (
              <li key={b.slug}>
                <button
                  type="button"
                  aria-pressed={b.slug === chosen}
                  onClick={() => choose.current(b.slug)}
                >
                  <span className="rmap-photo">
                    <Image src={b.image} alt="" fill sizes="72px" />
                  </span>
                  <b>{b.name}</b>
                  <small>{b.location}</small>
                  <small>
                    {b.floors
                      ? t("Có mặt bằng 3D")
                      : b.units.length
                        ? t("{n} căn đang có", { n: b.units.length })
                        : t("Liên hệ để biết căn trống")}
                  </small>
                </button>
              </li>
            ))}
            {!found.length && (
              <li className="rmap-none">
                {t("Không tìm thấy dự án phù hợp.")}
              </li>
            )}
          </ul>
        </aside>
      )}
      <div
        className="rmap-body"
        data-open={Boolean(current && !view && !lot && !focus)}
      >
        <div ref={stage} className="rmap-stage">
          <div ref={box} className="rmap-canvas" />
          {failed && (
            <p className="rmap-failed">
              {t("Chưa tải được bản đồ. Bạn vẫn chọn được tòa ở bên dưới.")}
            </p>
          )}
          <div className="rmap-tools">
            {!full && (
              <Link
                href={chosen ? `/ban-do?du-an=${chosen}` : "/ban-do"}
                className="rmap-reset"
              >
                <Maximize2 size={16} aria-hidden="true" />
                {t("Phóng to")}
              </Link>
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
          {focus && (
            <div
              ref={peekBox}
              className="rmap-peek"
              hidden={!peek}
              aria-hidden="true"
            >
              {peek && (
                <>
                  {peekPicture ? (
                    <Image
                      src={peekPicture}
                      alt=""
                      width={280}
                      height={196}
                      className="rmap-peek-3d"
                    />
                  ) : (
                    <span
                      className="rmap-peek-plan"
                      style={{
                        backgroundImage: `url("${peek.image}")`,
                        backgroundSize: `${(peek.size[0] / peek.box[2]) * 100}% ${(peek.size[1] / peek.box[3]) * 100}%`,
                        backgroundPosition: `${(peek.box[0] / Math.max(1, peek.size[0] - peek.box[2])) * 100}% ${(peek.box[1] / Math.max(1, peek.size[1] - peek.box[3])) * 100}%`,
                        aspectRatio: `${peek.box[2]} / ${peek.box[3]}`,
                      }}
                    />
                  )}
                  <b>
                    {peekKind?.code ??
                      `${peek.tower}-${focus.floor.padStart(2, "0")}${peek.unit}`}
                    {(peekModel?.rooms ?? peekKind?.rooms)
                      ? ` · ${peekModel?.rooms ?? peekKind?.rooms}`
                      : ""}
                  </b>
                  {peekKind?.view && (
                    <span className="rmap-peek-kind">
                      {t("khoảng {n} m²", { n: peekKind.area })} ·{" "}
                      {peekKind.view}
                    </span>
                  )}
                  <small>
                    {ownPicture
                      ? t("Ảnh 3D căn này · bấm để xem chi tiết")
                      : peekKind?.flat && peekPicture
                        ? t("Mặt bằng căn này · bấm để xem chi tiết")
                        : peekPicture
                          ? t("Ảnh 3D căn mẫu cùng loại · bấm để xem chi tiết")
                          : t("Mặt bằng căn · bấm để xem chi tiết")}
                  </small>
                </>
              )}
            </div>
          )}
          <div ref={tip} className="rmap-floor-tip" hidden>
            <b />
            <small />
          </div>
          {full && !view && (
            <div
              className="rmap-rail"
              role="toolbar"
              aria-label={t("Công cụ bản đồ")}
            >
              <button
                type="button"
                title={flat ? t("Xem 3D") : t("Xem 2D")}
                onClick={() => {
                  map.current?.easeTo({
                    pitch: flat ? VIEW.pitch : 0,
                    duration: 700,
                  });
                  setFlat(!flat);
                }}
              >
                <Box size={18} aria-hidden="true" />
                <span>{flat ? "3D" : "2D"}</span>
              </button>
              <button
                type="button"
                title={t("Xoay bản đồ 60 độ")}
                onClick={() =>
                  map.current?.easeTo({
                    bearing: (map.current.getBearing() ?? 0) + 60,
                    duration: 800,
                  })
                }
              >
                <RotateCw size={18} aria-hidden="true" />
                <span>{t("Xoay")}</span>
              </button>
              <button
                type="button"
                title={t("Tham quan tự động")}
                aria-pressed={touring}
                onClick={() => (touring ? stopTour.current() : startTour())}
              >
                {touring ? (
                  <Square size={18} aria-hidden="true" />
                ) : (
                  <Play size={18} aria-hidden="true" />
                )}
                <span>{t("Tham quan")}</span>
              </button>
              <button
                type="button"
                title={t("Nắng và bóng đổ theo giờ")}
                aria-pressed={sunOpen}
                onClick={() => setSunOpen(!sunOpen)}
              >
                <CloudSun size={18} aria-hidden="true" />
                <span>{t("Nắng")}</span>
              </button>
              <button
                type="button"
                title={t("Xem ban đêm")}
                aria-pressed={night}
                onClick={() => setNight(!night)}
              >
                <Moon size={18} aria-hidden="true" />
                <span>{t("Đêm")}</span>
              </button>
              <button
                type="button"
                title={t("Hiện địa điểm lân cận")}
                aria-pressed={landmarks}
                onClick={() => setLandmarks(!landmarks)}
              >
                <MapPin size={18} aria-hidden="true" />
                <span>{t("Địa điểm")}</span>
              </button>
              <button
                type="button"
                title={t("Đo khoảng cách")}
                aria-pressed={measuring}
                onClick={() => {
                  setMeasuring(!measuring);
                  setMeasured(null);
                  (
                    map.current?.getSource("dvg-measure") as
                      GeoJSONSource | undefined
                  )?.setData({ type: "FeatureCollection", features: [] });
                }}
              >
                <Ruler size={18} aria-hidden="true" />
                <span>{t("Đo")}</span>
              </button>
              <button
                type="button"
                title={t("Chia sẻ góc nhìn này")}
                onClick={() => void share()}
              >
                <Share2 size={18} aria-hidden="true" />
                <span>{copied ? t("Đã chép") : t("Chia sẻ")}</span>
              </button>
            </div>
          )}
          {sunOpen && (
            <label className="rmap-sun">
              <span>
                {t("Nắng lúc")}{" "}
                <b>{`${Math.floor(hour)}:${hour % 1 ? "30" : "00"}`}</b>
              </span>
              <input
                type="range"
                min={6}
                max={18}
                step={0.5}
                value={hour}
                onChange={(e) => {
                  setHour(Number(e.target.value));
                  setNight(false);
                }}
              />
            </label>
          )}
          {measuring && (
            <p className="rmap-hint">
              {measured === null
                ? t("Bấm hai điểm trên bản đồ để đo khoảng cách.")
                : `${t("Khoảng cách đường chim bay")}: ${metres(measured)}`}
            </p>
          )}
          {view && (
            <div className="rmap-horizon" aria-hidden="true">
              {horizon.marks.map((m) => (
                <span
                  key={m.name}
                  className={m.main ? "is-main" : undefined}
                  style={{ left: `${m.left}%` }}
                >
                  {m.name}
                </span>
              ))}
              <em>{horizon.left}</em>
              <em className="is-right">{horizon.right}</em>
              <b>
                {t("Đang nhìn hướng {dir}", {
                  dir: t(COMPASS[Math.round(heading / 45) % 8]),
                })}{" "}
                · {Math.round(heading)}°
              </b>
            </div>
          )}
          {view && (
            <div className="rmap-view">
              <p>
                {t("Tầm nhìn từ tầng {floor}, tòa {tower}", {
                  floor: view.floor,
                  tower: planTower,
                })}
                <small>
                  {t("Mô phỏng theo dữ liệu bản đồ, không phải ảnh chụp thật.")}
                </small>
              </p>
              <div role="group" aria-label={t("Hướng nhìn")}>
                {LOOKS.map(([name, bearing]) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={view.bearing === bearing}
                    onClick={() => lookFrom(view.floor, bearing)}
                  >
                    {t(name)}
                  </button>
                ))}
              </div>
              <button type="button" onClick={leaveView}>
                {t("Quay lại mặt bằng")}
              </button>
            </div>
          )}
        </div>
        <div className="rmap-towers" role="group" aria-label={t("Chọn tòa")}>
          {found.map((b) => (
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
        {current && !view && !lot && !focus && (
          <aside key={current.slug} className="rmap-panel">
            <header className="rmap-head">
              <Image
                className="rmap-head-photo"
                src={current.image}
                alt=""
                fill
                sizes="360px"
              />
              <h3>{current.name}</h3>
              <p>{current.location}</p>
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
                <Link href={current.page}>
                  <ArrowUpRight size={15} aria-hidden="true" />
                  {t("Trang dự án")}
                </Link>
              </nav>
            </header>
            {towerNames.length > 0 && (
              <div className="rmap-plan-entry">
                <div
                  className="rmap-plan-towers"
                  role="group"
                  aria-label={t("Chọn tòa")}
                >
                  {towerNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={name === tower}
                      onClick={() => choose.current(current.slug, name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {current.floors && (
                  <button
                    type="button"
                    className="rmap-plan-open"
                    onClick={() => {
                      setTower(planTower);
                      setPlan({ floor: "", unit: "" });
                    }}
                  >
                    <Layers size={16} aria-hidden="true" />
                    {t("Mở mặt bằng 3D")}
                  </button>
                )}
              </div>
            )}
            <div className="rmap-tabs" role="tablist">
              {(
                [
                  ...(current.facts.length
                    ? ([["info", t("Tổng quan")]] as const)
                    : []),
                  ["units", t("Căn ({n})", { n: units.length })],
                  ...(full ? ([["around", t("Quanh đây")]] as const) : []),
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={shownTab === key}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {shownTab === "info" && (
              <dl className="rmap-facts">
                {current.facts.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {shownTab === "around" && (
              <ul className="rmap-around" aria-label={t("Quanh dự án")}>
                {around.map((p) => (
                  <li key={p.name}>
                    {p.name} <b>{metres(p.away)}</b>
                  </li>
                ))}
              </ul>
            )}
            {shownTab === "units" && (
              <ul className="rmap-units">
                {units.map((u) => (
                  <li key={u.slug}>
                    <Link href={u.href}>
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
                        <strong>{u.priceText}</strong>
                        <span className="rmap-more">
                          {t("Xem chi tiết")}
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {!units.length && (
                  <li className="rmap-none">
                    {t("Tòa này hiện chưa có căn. Bạn gọi để được tư vấn.")}
                  </li>
                )}
              </ul>
            )}
          </aside>
        )}
        {plan && current?.floors && (
          <FloorPlan3D
            data={current.floors}
            tower={planTower}
            floor={plan.floor}
            unit={plan.unit}
            onChange={(next) => {
              setTower(next.tower);
              setPlan({ floor: next.floor, unit: next.unit });
            }}
            onClose={() => {
              // Back to the floor on the map, when the detail came from there.
              if (!focus) towers.current?.closeFloor();
              setPlan(null);
            }}
            onLook={(floor) => lookFrom(floor, 90)}
          />
        )}
      </div>
      {focus && !plan && !view && (
        <div
          className="rmap-focus"
          role="group"
          aria-label={t("Tầng đang xem")}
        >
          <button
            type="button"
            aria-label={t("Tầng dưới")}
            disabled={focusAt <= 0}
            onClick={() =>
              openTowerFloor.current(
                focus.slug,
                focus.tower,
                focusFloors[focusAt - 1],
              )
            }
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <b>
            {focus.tower} · {t("Tầng")} {focus.floor}
          </b>
          <button
            type="button"
            aria-label={t("Tầng trên")}
            disabled={focusAt >= focusFloors.length - 1}
            onClick={() =>
              openTowerFloor.current(
                focus.slug,
                focus.tower,
                focusFloors[focusAt + 1],
              )
            }
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          {focusNote ? (
            <small>{focusNote}</small>
          ) : focusLevels?.planned ? (
            <button
              type="button"
              className="rmap-focus-eye"
              onClick={() => {
                setTower(focus.tower);
                setPlan({ floor: focus.floor, unit: "" });
              }}
            >
              <Eye size={18} aria-hidden="true" />
              {t("Xem chi tiết")}
            </button>
          ) : (
            <small>{t("Chưa có sơ đồ tầng này")}</small>
          )}
          <button
            type="button"
            aria-label={t("Đóng sơ đồ tầng")}
            onClick={leaveFocus}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      {lot && (
        <aside className="rmap-lot" aria-label={t("Thông tin căn")}>
          <button
            type="button"
            className="rmap-close"
            aria-label={t("Đóng thông tin căn")}
            onClick={closeLot}
          >
            <X size={16} aria-hidden="true" />
          </button>
          <h3>{lot.code}</h3>
          <p>{t(lot.kind)}</p>
          <dl>
            <div>
              <dt>{t("Diện tích đất")}</dt>
              <dd>{planArea(lot.area)}</dd>
            </div>
            <div>
              <dt>{t("Số tầng")}</dt>
              <dd>{lot.floors}</dd>
            </div>
          </dl>
          <div
            className="rmap-lot-floors"
            role="group"
            aria-label={t("Chọn tầng")}
          >
            {Array.from({ length: lot.floors }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={n === lotFloor}
                onClick={() => {
                  setLotFloor(n);
                  if (map.current) drawOpenLot(map.current, lot, n, 30);
                }}
              >
                {t("Tầng {n}", { n })}
              </button>
            ))}
          </div>
          {lotPlanNow ? (
            <a
              className="rmap-lot-plan"
              href={lotPlanNow.image}
              target="_blank"
              rel="noreferrer"
            >
              <Image
                src={lotPlanNow.image}
                alt={t("Mặt bằng mẫu {model} · Tầng {n}", {
                  model: t(lotPlanNow.model),
                  n: lotFloor,
                })}
                width={600}
                height={600}
                sizes="280px"
              />
              <small>
                {t("Mặt bằng mẫu {model} · Tầng {n}", {
                  model: t(lotPlanNow.model),
                  n: lotFloor,
                })}
              </small>
            </a>
          ) : (
            <small>
              {t("Chưa có bản vẽ nội thất của căn này. Gọi để nhận bản vẽ.")}
            </small>
          )}
          {call && (
            <a href={call} className="rmap-plan-open">
              <Phone size={16} aria-hidden="true" />
              {t("Gọi tư vấn")}
            </a>
          )}
        </aside>
      )}
      <p className="rmap-note">
        {full &&
          ` ${t("Bản đồ © OpenStreetMap.")}`}
      </p>
    </div>
  );
}
