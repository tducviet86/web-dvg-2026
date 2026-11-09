import { t, tf } from "@/i18n/server";
import type { SiteContent } from "@/lib/api/content";
import { vacantNow } from "@/lib/availability";
import { filterProperties } from "@/lib/filter";
import {
  planFloors,
  unitNumber,
  type FloorData,
  type UnitKind,
} from "@/lib/floor-3d";
import { PLAN_OUTLINES } from "@/lib/floor-plan-outlines";
import { hasRooms, roomsLabel } from "@/lib/property-groups";
import {
  BUILDING_AREAS,
  BUILDING_BLOCKS,
  BUILDING_PLACES,
} from "@/lib/rental-map";
import { modelUnit } from "@/lib/model-units";
import { money, vndFull } from "@/lib/utils";
import type { Property } from "@/types";
import type { MapBuilding } from "@/components/rental-map";

const priceText = (p: Property) =>
  p.forRent
    ? tf("{price} triệu/tháng", { price: money(p.price) })
    : p.saleVnd
      ? vndFull(p.saleVnd)
      : t("Liên hệ");
const unitHref = (p: Property) =>
  `/${p.forRent ? "cho-thue" : "mua-ban"}/${p.slug}`;
const roomsOf = (p: Property) => t(hasRooms(p) ? roomsLabel(p) : p.type);

const MONARCHY_3D = "/images/projects/monarchy-apartments/3d/";
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

/**
 * Block A of The Monarchy, typical floor (beto.vn): 01 and 08 corner 2PN of
 * 72.3 m², 02 and 07 2PN of 62, 03 and 06 corner 2PN of 76.6, 04 and 05 1PN of
 * 48.4; views as on its key plan. Pictures: each unit's plan (01–04, mirrored).
 */
function monarchyAKind(number: string): UnitKind {
  const n = Number(number);
  const twin = n > 4 ? 9 - n : n;
  const [rooms, bedrooms, area] = (
    {
      1: [t("2PN góc"), 2, 72.3],
      2: [t("2PN"), 2, 62],
      3: [t("2PN góc"), 2, 76.6],
      4: [t("1PN"), 1, 48.4],
    } as Record<number, [string, number, number]>
  )[twin];
  const view =
    n === 1
      ? t("Góc view biển")
      : n === 7 || n === 8
        ? t("View cầu Sông Hàn")
        : n === 2 || n === 3
          ? t("View Sun Wheel, cầu Trần Thị Lý")
          : t("View sông Hàn");
  return {
    rooms,
    bedrooms,
    area,
    view,
    picture: `${MONARCHY_3D}a-can-0${twin}.webp`,
    flat: true,
  };
}

const PANOMA = "/images/projects/sun-panoma/";
/**
 * Sun Panoma's units from the developer's drawings: type and the side the unit
 * looks out on, by drawing. P1's plans of each type (with sizes) and P2's 3D
 * pictures, roof off, go with the units of that size.
 */
// prettier-ignore
const PANOMA_UNITS: Record<string, Record<string, [string, string]>> = {
  "p1-tang-4-17.webp": { "02": ["3BR", "Tây Nam"], "01": ["STU", "Tây Nam"], "03": ["3BR", "Đông Bắc"], "03A": ["1BR+", "Đông Bắc"], "05": ["1BR+", "Đông Bắc"], "06": ["2BR+", "Đông"], "10": ["1BR+", "Đông Nam"], "09": ["1BR+", "Đông Nam"], "08": ["1BR+", "Đông Nam"], "07": ["1BR+", "Đông Nam"], "17": ["1BR+", "Tây Bắc"], "18": ["STU", "Tây Bắc"], "12B": ["2BR", "Tây Nam"], "12A": ["STU", "Tây Nam"], "12": ["1BR+", "Tây Nam"], "11": ["2BR", "Tây Nam"], "15": ["2BR", "Đông Bắc"], "16": ["STU", "Đông Bắc"] },
  "p1-tang-19-25.webp": { "02": ["3BR", "Tây Nam"], "01": ["STU", "Tây Nam"], "03": ["3BR", "Đông Bắc"], "03A": ["1BR+", "Đông Bắc"], "05": ["1BR+", "Đông Bắc"], "06": ["2BR+", "Đông"], "10": ["1BR+", "Đông Nam"], "09": ["1BR+", "Đông Nam"], "08": ["1BR+", "Đông Nam"], "07": ["1BR+", "Đông Nam"], "17": ["1BR+", "Tây Bắc"], "18": ["STU", "Tây Bắc"], "11": ["DL1", "Tây Nam"] },
  "p1-tang-20-26.webp": { "02": ["3BR", "Tây Nam"], "01": ["STU", "Tây Nam"], "03": ["3BR", "Đông Bắc"], "03A": ["1BR+", "Đông Bắc"], "05": ["1BR+", "Đông Bắc"], "06": ["2BR+", "Đông"], "10": ["1BR+", "Đông Nam"], "09": ["1BR+", "Đông Nam"], "08": ["1BR+", "Đông Nam"], "07": ["1BR+", "Đông Nam"], "17": ["1BR+", "Tây Bắc"], "18": ["STU", "Tây Bắc"], "11": ["DL2", "Tây Nam"] },
  "p1-tang-27.webp": { "02": ["2BR", "Tây Nam"], "01": ["STU", "Tây Nam"], "03": ["3BR", "Đông Bắc"], "03A": ["1BR+", "Đông Bắc"], "05": ["1BR+", "Đông Bắc"], "06": ["2BR+", "Đông"] },
  "p1-tang-28-32.webp": { "02": ["2BR", "Tây Nam"], "01": ["STU", "Tây Nam"], "03": ["3BR", "Đông Bắc"], "03A": ["1BR+", "Đông Bắc"], "05": ["1BR+", "Đông Bắc"], "06": ["DL1", "Đông"] },
  "p1-tang-29-33.webp": { "02": ["2BR", "Tây Nam"], "01": ["STU", "Tây Nam"], "03": ["3BR", "Đông Bắc"], "03A": ["1BR+", "Đông Bắc"], "05": ["1BR+", "Đông Bắc"], "06": ["DL2", "Đông"] },
  "p2-tang-dien-hinh.webp": { "12": ["2BR", "Đông"], "01": ["1BR+", "Đông"], "02": ["1BR+", "Đông"], "03": ["2BR", "Đông"], "03A": ["1BR+", "Nam"], "05": ["STU", "Nam"], "06": ["3BR", "Tây"], "07": ["1BR+", "Tây"], "08": ["1BR+", "Tây"], "09": ["2BR", "Tây"], "11": ["STU", "Bắc"], "10": ["STU", "Bắc"] },
};
const PANOMA_TYPES: Record<string, [string, number]> = {
  STU: ["Studio", 1],
  "1BR+": ["1PN+1", 1],
  "2BR": ["2PN", 2],
  "2BR+": ["2PN+1", 2],
  "3BR": ["3PN", 3],
  DL1: ["Duplex L1", 0],
  DL2: ["Duplex L2", 0],
};
/** Pictures by tower and area: P1's plans, P2's 3D views. */
const PANOMA_PICTURES: Record<string, [string, boolean]> = {
  "p1/28.3": ["3d/p1-studio.webp", true],
  "p1/48.6": ["3d/p1-1pn-1.webp", true],
  "p1/69": ["3d/p1-2pn.webp", true],
  "p1/89": ["3d/p1-2pn-1.webp", true],
  "p1/98.7": ["3d/p1-3pn.webp", true],
  "p2/39.8": ["3d/studio.webp", false],
  "p2/50.1": ["3d/1pn-1.webp", false],
  "p2/69.6": ["3d/2pn.webp", false],
  "p2/99.6": ["3d/3pn.webp", false],
  "p2/83.2": ["3d/p2-can-03.webp", true],
};
const PANOMA_DIRS: Record<string, string> = {
  Bắc: t("Hướng Bắc"),
  "Đông Bắc": t("Hướng Đông Bắc"),
  Đông: t("Hướng Đông"),
  "Đông Nam": t("Hướng Đông Nam"),
  Nam: t("Hướng Nam"),
  "Tây Nam": t("Hướng Tây Nam · sông Hàn"),
  Tây: t("Hướng Tây · sông Hàn"),
  "Tây Bắc": t("Hướng Tây Bắc · sông Hàn"),
};
/** Floor 1 shops: frontage in metres (two figures on a corner), from the renders. */
// prettier-ignore
const PANOMA_FRONTS: Record<string, string> = {
  "p1-tang-1.webp/06": "8,7",
  "p1-tang-1.webp/07": "9,8 + 10,8",
  "p1-tang-1.webp/05": "8,3",
  "p1-tang-1.webp/03A": "7,4",
  "p1-tang-1.webp/03": "12,5",
  "p1-tang-1.webp/02": "12,4",
  "p1-tang-1.webp/08": "7,1",
  "p1-tang-1.webp/09": "7,3",
  "p1-tang-1.webp/10": "11",
  "p1-tang-1.webp/11": "9",
  "p1-tang-1.webp/12": "8,2 + 7,6",
  "p1-tang-1.webp/12A": "2,7 + 7,1",
  "p1-tang-1.webp/12B": "7,1",
  "p1-tang-1.webp/15": "7,5",
  "p1-tang-1.webp/16": "6,2 + 2,4",
  "p2-tang-1.webp/12A": "6,5 + 9,8",
  "p2-tang-1.webp/12": "4,7",
  "p2-tang-1.webp/11": "5,3",
  "p2-tang-1.webp/10": "5,1",
  "p2-tang-1.webp/09": "4,9",
  "p2-tang-1.webp/08": "5,2 + 16,2",
  "p2-tang-1.webp/07": "7,3",
  "p2-tang-1.webp/06": "7,3",
  "p2-tang-1.webp/05": "7,3",
  "p2-tang-1.webp/3A": "11,1",
  "p2-tang-1.webp/03": "4,9",
  "p2-tang-1.webp/02": "6,9",
  "p2-tang-1.webp/01": "6,7 + 6,5",
};
function panomaShops(): Record<string, UnitKind> {
  return Object.fromEntries(
    ["p1-tang-1.webp", "p2-tang-1.webp"].flatMap((file) =>
      Object.entries(PLAN_OUTLINES[file]?.units ?? {}).map(([n, unit]) => {
        const front = PANOMA_FRONTS[`${file}/${n}`];
        return [
          `${file}/${n}`,
          {
            rooms: t("Shophouse"),
            bedrooms: 0,
            area: unit.inner || "",
            view: front ? tf("Mặt tiền {m} m", { m: front }) : "",
            code: `Shophouse ${file.slice(0, 2).toUpperCase()}01-${n}`,
          },
        ];
      }),
    ),
  );
}
function panomaKinds(): Record<string, UnitKind> {
  return Object.fromEntries(
    Object.entries(PANOMA_UNITS).flatMap(([file, units]) =>
      Object.entries(units).map(([n, [type, dir]]) => {
        const area = PLAN_OUTLINES[file]?.units[n]?.inner ?? 0;
        const [rooms, bedrooms] = PANOMA_TYPES[type];
        const [picture, flat] =
          PANOMA_PICTURES[`${file.slice(0, 2)}/${area}`] ?? [];
        return [
          `${file}/${n}`,
          {
            rooms: t(rooms),
            bedrooms,
            area,
            view: PANOMA_DIRS[dir],
            ...(picture && { picture: PANOMA + picture, flat }),
          },
        ];
      }),
    ),
  );
}

/**
 * Floor plans kept with the site for projects that have none in Admin. The
 * Monarchy: floors 5–17 of A are typical; B's plan of floor 3 stands in for
 * its higher floors.
 */
const SITE_PLANS: Record<
  string,
  {
    towers: string[];
    plans: { tower: string; image: string; floors: string[] }[];
    pictures?: Record<string, string>;
    kinds?: Record<string, UnitKind>;
    notes?: Record<string, string>;
  }
> = {
  // Sun Panoma: P1's six typical floors and P2's, from the developer. Floors with
  // no drawing yet (P1: 2, 3, 18; P2: 2, 3, 18, 26, 27) show the tower only.
  "sun-panoma": {
    towers: ["Panoma 1", "Panoma 2"],
    plans: [
      { tower: "Panoma 1", image: "p1-tang-1.webp", floors: ["1"] },
      { tower: "Panoma 1", image: "", floors: ["2", "3"] },
      { tower: "Panoma 1", image: "p1-tang-4-17.webp", floors: range(4, 17) },
      { tower: "Panoma 1", image: "", floors: ["18"] },
      {
        tower: "Panoma 1",
        image: "p1-tang-19-25.webp",
        floors: ["19", "21", "23", "25"],
      },
      {
        tower: "Panoma 1",
        image: "p1-tang-20-26.webp",
        floors: ["20", "22", "24", "26"],
      },
      { tower: "Panoma 1", image: "p1-tang-27.webp", floors: ["27"] },
      {
        tower: "Panoma 1",
        image: "p1-tang-28-32.webp",
        floors: ["28", "30", "32"],
      },
      {
        tower: "Panoma 1",
        image: "p1-tang-29-33.webp",
        floors: ["29", "31", "33"],
      },
      // P2 counts 3A for 4 and 12A for 13, as its drawing does.
      { tower: "Panoma 2", image: "p2-tang-1.webp", floors: ["1"] },
      { tower: "Panoma 2", image: "", floors: ["2", "3"] },
      {
        tower: "Panoma 2",
        image: "p2-tang-dien-hinh.webp",
        floors: ["3A", ...range(5, 12), "12A", ...range(14, 17)],
      },
      { tower: "Panoma 2", image: "", floors: ["18"] },
      {
        tower: "Panoma 2",
        image: "p2-tang-dien-hinh.webp",
        floors: range(19, 25),
      },
      { tower: "Panoma 2", image: "", floors: ["26", "27"] },
    ].map((p) => ({ ...p, image: p.image && PANOMA + p.image })),
    kinds: { ...panomaKinds(), ...panomaShops() },
  },
  "monarchy-apartments": {
    towers: ["Monarchy A", "Monarchy B"],
    plans: [
      // Floor 1: shophouses of both blocks, on the site's ground floor plan.
      { tower: "Monarchy A", image: "mat-bang-tang-1.webp", floors: ["1"] },
      {
        tower: "Monarchy A",
        image: "mat-bang-a-tang-2-3.webp",
        floors: ["2", "3"],
      },
      { tower: "Monarchy A", image: "mat-bang-a-tang-4.webp", floors: ["4"] },
      {
        tower: "Monarchy A",
        image: "mat-bang-a-tang-dien-hinh.webp",
        floors: range(5, 17),
      },
      { tower: "Monarchy B", image: "mat-bang-tang-1.webp", floors: ["1"] },
      // Floor 2 of B is parking: no drawing.
      { tower: "Monarchy B", image: "", floors: ["2"] },
      // Floor 3 up: apartments; the shorter part of the L stops at 27.
      {
        tower: "Monarchy B",
        image: "mat-bang-b-tang-3.webp",
        floors: range(3, 33),
      },
    ].map((p) => ({
      ...p,
      image: p.image && `/images/projects/monarchy-apartments/${p.image}`,
    })),
    // The developer's 3D pictures (monarchy.com.vn), each drawn for one unit.
    pictures: {
      "mat-bang-b-tang-3.webp/16": `${MONARCHY_3D}2pn-16.webp`,
      "mat-bang-b-tang-3.webp/18": `${MONARCHY_3D}studio-18.webp`,
      "mat-bang-b-tang-3.webp/21": `${MONARCHY_3D}3pn-21.webp`,
      "mat-bang-b-tang-3.webp/23": `${MONARCHY_3D}2pn-23.webp`,
    },
    kinds: {
      ...Object.fromEntries(
        Object.keys(PLAN_OUTLINES["mat-bang-b-tang-3.webp"]?.units ?? {}).map(
          (n) => [`mat-bang-b-tang-3.webp/${n}`, monarchyKind(n)],
        ),
      ),
      ...Object.fromEntries(
        Object.keys(
          PLAN_OUTLINES["mat-bang-a-tang-dien-hinh.webp"]?.units ?? {},
        ).map((n) => [`mat-bang-a-tang-dien-hinh.webp/${n}`, monarchyAKind(n)]),
      ),
      ...Object.fromEntries(
        Object.keys(PLAN_OUTLINES["mat-bang-tang-1.webp"]?.units ?? {}).map(
          (n) => [
            `mat-bang-tang-1.webp/${n}`,
            {
              rooms: t("Shophouse"),
              bedrooms: 0,
              area: "",
              view: "",
              code: `Shophouse ${n}`,
            },
          ],
        ),
      ),
    },
    notes: { "Monarchy B/2": t("Tầng đỗ xe") },
  },
};

/**
 * Block B of The Monarchy, from the owner: 01 is the 2-bedroom corner, 02,
 * 21, 24 and 35 have 3 bedrooms, 18 is a studio, the rest 2 bedrooms; odd
 * numbers look to the sea, even ones to the river. Areas, also from the owner:
 * 01 about 90 m², other 2-bedroom units 80, 3-bedroom ones 105–110.
 * Keys are "drawing file/number".
 */
function monarchyKind(number: string): UnitKind {
  const n = Number(number);
  const view = n % 2 ? t("View biển Mỹ Khê") : t("View sông Hàn");
  const two = `${MONARCHY_3D}2pn-23.webp`;
  if (n === 1)
    return { rooms: t("2PN góc"), bedrooms: 2, area: 90, view, picture: two };
  if ([2, 21, 24, 35].includes(n))
    return {
      rooms: t("3PN"),
      bedrooms: 3,
      area: "105–110",
      view,
      picture: `${MONARCHY_3D}3pn-21.webp`,
    };
  if (n === 18)
    return {
      rooms: t("Studio"),
      bedrooms: 1,
      area: 52,
      view,
      picture: `${MONARCHY_3D}studio-18.webp`,
    };
  return { rooms: t("2PN"), bedrooms: 2, area: 80, view, picture: two };
}

/** A project's towers, plans and units for the 3D floor plans. */
function floorData(
  content: SiteContent,
  slug: string,
  units: Property[],
): FloorData | undefined {
  const api = content.apiProjects.find((p) => p.slug === slug);
  const plans = (api?.floorPlans ?? []).filter((p) => p.tower);
  const kept = SITE_PLANS[slug];
  if (!plans.length && kept)
    return {
      towers: kept.towers.map((name) => ({ name, note: "" })),
      plans: kept.plans,
      units: [],
      pictures: kept.pictures,
      kinds: kept.kinds,
      notes: kept.notes,
    };
  if (!plans.length) return undefined;
  return {
    towers: (api?.towers ?? [])
      .filter((x) => plans.some((p) => p.tower === x.name))
      .map((x) => ({ name: x.name, note: x.note ? t(x.note) : "" })),
    plans: plans.map((p) => ({
      tower: p.tower ?? "",
      image: p.image,
      floors: planFloors(p.name),
    })),
    units: units
      .filter((p) => p.tower && p.unitCode)
      .map((p) => ({
        tower: p.tower ?? "",
        floor: p.floorNote ? "" : String(p.floor),
        number: unitNumber(p.unitCode ?? "", p.floorNote ? 0 : p.floor),
        rooms: roomsOf(p),
        bedrooms: p.bedrooms,
        priceText: priceText(p),
        href: unitHref(p),
        picture: modelUnit(p)?.layout,
        state: vacantNow(p)
          ? "available"
          : p.status === "Đã bán"
            ? "sold"
            : "reserved",
      })),
  };
}

/** What the map's project card says, from Admin › Dự án. */
function facts(content: SiteContent, slug: string) {
  const api = content.apiProjects.find((p) => p.slug === slug);
  return [
    { label: t("Quy mô"), value: api?.scale },
    { label: t("Chủ đầu tư"), value: api?.developer },
    { label: t("Pháp lý"), value: api?.legalStatus },
  ].flatMap((f) => (f.value ? [{ label: f.label, value: t(f.value) }] : []));
}

/** Buildings for the map: rentals only, or also the projects on sale. */
export function mapBuildings(
  content: SiteContent,
  { rentalsOnly }: { rentalsOnly: boolean },
): MapBuilding[] {
  return content.portfolio.flatMap((b) => {
    const rental = b.categories.includes("rent");
    if (rentalsOnly && !rental) return [];
    const known = content.locations[b.projectId];
    const spot = known ?? BUILDING_PLACES[b.slug];
    if (!spot || !BUILDING_BLOCKS[b.slug]) return [];
    const all = filterProperties(content.properties, {
      project: b.slug,
    }).filter((p) => !p.isDemo);
    return [
      {
        slug: b.slug,
        name: t(b.name),
        location: t(b.location),
        area: t(BUILDING_AREAS[b.slug] ?? ""),
        image: b.image,
        page: rental ? `/cho-thue/du-an/${b.slug}` : `/du-an/${b.slug}`,
        facts: facts(content, b.slug),
        lat: spot.lat,
        lng: spot.lng,
        url:
          known?.url ?? `https://www.google.com/maps?q=${spot.lat},${spot.lng}`,
        units: all
          // A project on sale shows its model units until units are listed.
          .filter((p) => (rental ? !p.floorNote : vacantNow(p)))
          .map((p) => ({
            slug: p.slug,
            name: t(p.name),
            rooms: roomsOf(p),
            area: p.area,
            priceText: priceText(p),
            href: unitHref(p),
            image: p.image,
            tower: p.tower ?? "",
            // For the map's filter: -1 without rooms, 0 when not for rent.
            bedrooms: hasRooms(p) ? p.bedrooms : -1,
            rent: p.forRent ? p.price : 0,
          })),
        floors: rentalsOnly ? undefined : floorData(content, b.slug, all),
      },
    ];
  });
}
