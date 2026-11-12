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

const PONTE = "/images/projects/sun-ponte-residence/";
/**
 * Sun Ponte's units from the developer's typical floor sheets: type and the
 * side the unit looks out of (west: the Hàn river). DK is a dual-key unit.
 */
// prettier-ignore
const PONTE_UNITS: Record<string, Record<string, [string, string]>> = {
  "ponte-t1-tang-3a-18.webp": { "10": ["DK", "Đông Nam"], "11": ["2BR", "Nam"], "12": ["3BR", "Tây Nam"], "01": ["1BR+", "Tây"], "02": ["STU", "Tây"], "03": ["3BR", "Tây"], "3A": ["2BR", "Tây Bắc"], "05": ["2BR", "Đông Bắc"], "06": ["1BR+", "Đông"], "07": ["STU", "Đông"], "08": ["STU", "Đông"], "09": ["1BR+", "Đông"] },
  "ponte-t2-tang-3a-18.webp": { "10": ["2BR", "Đông Nam"], "11": ["2BR", "Tây Nam"], "01": ["STU", "Tây"], "02": ["1BR+", "Tây"], "03": ["STU", "Tây"], "3A": ["3BR", "Tây Bắc"], "05": ["2BR", "Bắc"], "06": ["DK", "Đông Bắc"], "07": ["1BR+", "Đông"], "08": ["1BR+", "Đông"], "09": ["STU", "Đông"] },
  "ponte-t1-tang-19-21-23.webp": { "10": ["DK", "Đông Nam"], "11": ["2BR", "Nam"], "12": ["3BR", "Tây Nam"], "01": ["1BR+", "Tây"], "02": ["2BR", "Tây"], "03": ["1BR+", "Tây Bắc"], "3A": ["DK", "Tây Bắc"], "05": ["DK", "Đông Bắc"], "06": ["1BR+", "Đông Bắc"], "07": ["2BR", "Đông"], "08": ["STU", "Đông"], "09": ["1BR+", "Đông"] },
  "ponte-t2-tang-19-21-23.webp": { "10": ["3BR", "Đông Nam"], "11": ["1BR", "Đông Nam"], "12": ["1BR", "Tây Nam"], "12A": ["3BR", "Tây Nam"], "01": ["STU", "Tây"], "02": ["1BR+", "Tây"], "03": ["STU", "Tây"], "3A": ["3BR", "Tây Bắc"], "05": ["2BR", "Bắc"], "06": ["DK", "Đông Bắc"], "07": ["1BR+", "Đông"], "08": ["1BR+", "Đông"], "09": ["STU", "Đông"] },
  "ponte-t1-tang-20-22-24.webp": { "10": ["DK", "Đông Nam"], "11": ["2BR", "Nam"], "12": ["3BR", "Tây Nam"], "01": ["1BR+", "Tây"], "02": ["2BR", "Tây"], "03": ["1BR+", "Tây Bắc"], "3A": ["DK", "Tây Bắc"], "05": ["DK", "Đông Bắc"], "06": ["1BR+", "Đông Bắc"], "07": ["2BR", "Đông"], "08": ["STU", "Đông"], "09": ["1BR+", "Đông"] },
  "ponte-t2-tang-20-22-24.webp": { "10": ["3BR", "Đông Nam"], "11": ["1BR", "Đông Nam"], "12": ["1BR", "Tây Nam"], "12A": ["3BR", "Tây Nam"], "01": ["STU", "Tây"], "02": ["1BR+", "Tây"], "03": ["STU", "Tây"], "3A": ["3BR", "Tây Bắc"], "05": ["2BR", "Bắc"], "06": ["DK", "Đông Bắc"], "07": ["1BR+", "Đông"], "08": ["1BR+", "Đông"], "09": ["STU", "Đông"] },
};
const PONTE_TYPES: Record<string, [string, number]> = {
  STU: ["Studio", 1],
  "1BR": ["1PN", 1],
  "1BR+": ["1PN+1", 1],
  "2BR": ["2PN", 2],
  "3BR": ["3PN", 3],
  DK: ["Dual Key", 2],
};
/** The developer's plan of a unit type, with its sizes, by tower/type/area. */
const PONTE_PICTURES: Record<string, string> = {
  "t1/3BR/91.1": "can/3pn-91-t1.webp",
  "t2/3BR/91.1": "can/3pn-91-t2.webp",
  "DK/92.2": "can/dk-92.webp",
  "DK/92.3": "can/dk-92.webp",
  "DK/88.2": "can/dk-88.webp",
  "2BR/77.1": "can/2pn-77.webp",
  "2BR/70.8": "can/2pn-70.webp",
  "1BR+/52.8": "can/1pn-1-52.webp",
  "1BR/43.5": "can/1pn-43.webp",
  "3BR/103.9": "can/3pn-104.webp",
};
/** The podium's shophouses (two floors each), by the side they front on. */
// prettier-ignore
const PONTE_SHOPS: Record<string, Record<string, string>> = {
  "ponte-khoi-de-tang-1.webp": { "06": "Tây Nam", "05": "Nam", "3A": "Đông Nam", "03": "Đông Nam", "02": "Đông", "01": "Đông", "07": "Tây", "08": "Tây", "09": "Tây", "10": "Tây", "11": "Tây", "26": "Đông", "12": "Tây", "25": "Đông", "12A": "Tây", "24": "Đông", "12B": "Tây", "15": "Tây", "16": "Tây", "17": "Tây", "18": "Tây", "19": "Tây Bắc", "20": "Bắc", "21": "Đông Bắc", "22": "Đông Bắc", "23": "Đông" },
  "ponte-khoi-de-tang-2.webp": { "06": "Tây Nam", "05": "Nam", "3A": "Đông Nam", "03": "Đông Nam", "02": "Đông", "07": "Tây", "08": "Tây", "09": "Tây", "10": "Tây", "11": "Tây", "26": "Đông", "12": "Tây", "25": "Đông", "12A": "Tây", "24": "Đông", "12B": "Tây", "15": "Tây", "16": "Tây", "17": "Tây", "18": "Tây", "19": "Tây Bắc", "20": "Bắc", "21": "Đông Bắc", "22": "Đông Bắc" },
};
function ponteShops(): Record<string, UnitKind> {
  return Object.fromEntries(
    Object.entries(PONTE_SHOPS).flatMap(([file, shops]) =>
      Object.entries(shops).map(([n, dir]) => [
        `${file}/${n}`,
        {
          rooms: t("Shophouse"),
          bedrooms: 0,
          area: PLAN_OUTLINES[file]?.units[n]?.inner || "",
          view: PANOMA_DIRS[dir],
          code: `Shophouse T-01-${n}`,
        },
      ]),
    ),
  );
}
function ponteKinds(): Record<string, UnitKind> {
  return Object.fromEntries(
    Object.entries(PONTE_UNITS).flatMap(([file, units]) =>
      Object.entries(units).map(([n, [type, dir]]) => {
        const area = PLAN_OUTLINES[file]?.units[n]?.inner ?? 0;
        const [rooms, bedrooms] = PONTE_TYPES[type];
        const picture =
          PONTE_PICTURES[`${file.slice(6, 8)}/${type}/${area}`] ??
          PONTE_PICTURES[`${type}/${area}`];
        return [
          `${file}/${n}`,
          {
            rooms: t(rooms),
            bedrooms,
            area,
            // Same sides as Sun Panoma's: west looks over the Hàn river.
            view: PANOMA_DIRS[dir],
            ...(picture && { picture: PONTE + picture, flat: true }),
          },
        ];
      }),
    ),
  );
}

const SAPHIA = "/images/projects/sun-saphia-residence/";
/**
 * Sun Saphia's typical floor, from the owner's drawing: type and the side each
 * unit looks out of. The drawing's top faces the sea (east-north-east).
 */
// prettier-ignore
const SAPHIA_UNITS: Record<string, [string, string]> = {
  "11": ["2BR", "sea"], "12": ["STU", "sea"], "12A": ["STU", "sea"], "12B": ["1BR+", "sea"], "15": ["STU", "sea"], "16": ["STU", "sea"], "17": ["1BR+", "sea"], "18": ["2BR", "sea"], "19": ["2BR", "sea"],
  "20": ["STU", "se"], "01": ["STU", "se"], "02": ["STU", "se"],
  "21": ["STU", "sw"], "22": ["STU", "sw"], "23": ["STU", "sw"], "24": ["STU", "sw"], "25": ["STU", "sw"], "26": ["STU", "sw"], "27": ["STU", "sw"], "28": ["1BR+", "sw"], "03": ["2BR", "sw"], "03A": ["2BR", "sw"],
  "10": ["1BR+", "nw"], "09": ["STU", "nw"], "08": ["STU", "nw"], "07": ["STU", "nw"], "06": ["STU", "nw"], "05": ["STU", "nw"],
};
function saphiaKinds(): Record<string, UnitKind> {
  const file = "saphia-tang-3a-28.webp";
  const types: Record<string, [string, number, string]> = {
    STU: ["Studio", 1, "can/studio.webp"],
    "1BR+": ["1PN+1", 1, "can/1pn-1.webp"],
    "2BR": ["2PN", 2, "can/2pn.webp"],
  };
  const sides: Record<string, string> = {
    sea: t("Hướng Đông Bắc · biển"),
    se: t("Hướng Đông Nam"),
    sw: t("Hướng Tây Nam"),
    nw: t("Hướng Tây Bắc"),
  };
  return Object.fromEntries(
    Object.entries(SAPHIA_UNITS).map(([n, [type, side]]) => {
      const [rooms, bedrooms, picture] = types[type];
      return [
        `${file}/${n}`,
        {
          rooms: t(rooms),
          bedrooms,
          area: PLAN_OUTLINES[file]?.units[n]?.inner ?? 0,
          view: sides[side],
          // The developer's model unit of the type, furnished, seen from above.
          picture: SAPHIA + picture,
          flat: true,
        },
      ];
    }),
  );
}

/** Unit types as the developers' drawings name them: rooms, bedrooms. */
const DRAWN_TYPES: Record<string, [string, number]> = {
  STU: ["Studio", 1],
  "1BR": ["1PN", 1],
  "1BR+": ["1PN+1", 1],
  "2BR": ["2PN", 2],
  "2BR+": ["2PN+1", 2],
  "3BR": ["3PN", 3],
};
/**
 * The units of a traced drawing, by type (and the picture of the type, or of
 * the unit itself), with the areas the drawing prints.
 */
function drawnKinds(
  file: string,
  types: Record<string, string>,
  picture: (unit: string, type: string) => string | undefined,
): Record<string, UnitKind> {
  return Object.fromEntries(
    Object.entries(types).map(([n, type]) => {
      const [rooms, bedrooms] = DRAWN_TYPES[type];
      const shown = picture(n, type);
      return [
        `${file}/${n}`,
        {
          rooms: t(rooms),
          bedrooms,
          area: PLAN_OUTLINES[file]?.units[n]?.inner ?? 0,
          view: "",
          ...(shown && { picture: shown, flat: true }),
        },
      ];
    }),
  );
}
/** "STU 15 16 …" → each unit's type. */
const typed = (spec: string) =>
  Object.fromEntries(
    spec.split(";").flatMap((part) => {
      const [type, ...units] = part.trim().split(/\s+/);
      return units.map((n) => [n, type]);
    }),
  );

const CORA = "/images/projects/cora-tower/";
// prettier-ignore
const CORA_UNITS = {
  A1: typed("2BR 01 05 11 17 27; 1BR+ 02 03 03A 06 07 08 09 10 12A 12B 19 20 21 24 25 28; 3BR 12; STU 15 16 18 22 23 26"),
  A2: typed("2BR 01 17 23 27; STU 02 05 06 10 12 12A; 1BR+ 03 03A 07 08 09 12B 15 18 19 20 21 22 24 25 26 28; 2BR+ 11; 3BR 16"),
};
/** Cora's unit layouts: some units' own, else one of the type. */
const CORA_LAYOUTS: Record<string, string> = {
  "A1/01": "layout-a10801-2pn.webp",
  "A1/05": "layout-a10805-2pn.webp",
  "A1/17": "layout-a10817-2pn.webp",
  "A1/28": "layout-a10828-1pn1.webp",
  "A2/27": "layout-a20827-2pn.webp",
  STU: "layout-a10823-stu.webp",
  "1BR+": "layout-a10803-1pn1.webp",
  "2BR": "layout-a10801-2pn.webp",
  "3BR": "layout-a10812-3pn.webp",
};
const SLIGHT = "/images/projects/s-light-tower/";
// prettier-ignore
const SLIGHT_UNITS = typed("3BR 05; STU 06 07 09 16 19; 1BR+ 08 17 18 01 02 03 03A 11 12 12A 12B; 2BR 10 15 20");
/** S-Light's layouts by net area. */
const SLIGHT_LAYOUTS: Record<number, string> = {
  33.3: "can/stu.webp",
  49.3: "can/1br-b.webp",
  57.6: "can/1br-a.webp",
  59: "can/1br-a.webp",
  76: "can/2br-2wc-1.webp",
  95.1: "can/3br.webp",
};
const FOURS = "/images/projects/fours-tower/mat-bang/";
// prettier-ignore
const FOURS_UNITS = {
  F1: typed("2BR 22 24 01 03 17 15 10 08; STU 23 26 02 12B 11 16 09; 1BR+ 25 27 21 20 19 18 03A 05 06 07; 1BR 12A 12"),
  F5: typed("3BR 09 12; 1BR+ 10 12B 15 16 17 21 22 23 24 25 26 27 30 31 08 07 05 01; STU 11 12A 18 19 29 34 03 03A 02; 2BR 20 28 32 33; 1BR 06"),
};

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
    naming?: string;
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
  // Sun Ponte: the podium's two floors of shophouses under both towers; T1 and
  // T2 on the developer's typical floors from 4, joined by their middle units
  // on 19–24. 3 and 3A, between 3 and 4 (amenities, events, play): no drawing.
  // Sun Saphia: one drawing for floors 3A–28; the shops below and the top two
  // floors have none yet.
  "sun-saphia-residence": {
    towers: ["Saphia"],
    plans: [
      { tower: "Saphia", image: "", floors: ["1", "2", "3"] },
      {
        tower: "Saphia",
        image: `${SAPHIA}saphia-tang-3a-28.webp`,
        floors: ["3A", ...range(5, 28)],
      },
      { tower: "Saphia", image: "", floors: ["29", "30"] },
    ],
    kinds: saphiaKinds(),
    // As on the drawings: SP0812 is floor 8, unit 12.
    naming: "SP{floor}{unit}",
  },
  // Cora: each tower's drawings from the owner; floors 3A–24 have their units
  // traced, the others show their drawing.
  "cora-tower": {
    towers: ["A1", "A2"],
    plans: (["A1", "A2"] as const).flatMap((tower) => {
      const own = `${CORA}mat-bang/cora-${tower.toLowerCase()}-tang-`;
      return [
        { tower, image: `${own}1.webp`, floors: ["1"] },
        { tower, image: `${own}2.webp`, floors: ["2"] },
        {
          tower,
          image: `${own}${tower === "A2" ? "3-chsv" : "3"}.webp`,
          floors: ["3"],
        },
        { tower, image: `${own}3a-24.webp`, floors: ["3A", ...range(5, 24)] },
        { tower, image: `${own}25-ph.webp`, floors: ["25"] },
      ];
    }),
    kinds: Object.assign(
      {},
      ...(["A1", "A2"] as const).map((tower) =>
        drawnKinds(
          `cora-${tower.toLowerCase()}-tang-3a-24.webp`,
          CORA_UNITS[tower],
          (n, type) => {
            const own = CORA_LAYOUTS[`${tower}/${n}`] ?? CORA_LAYOUTS[type];
            return own && `${CORA}can/${own}`;
          },
        ),
      ),
    ),
    // As on the drawings: A10801 is A1, floor 8, unit 01.
    naming: "{tower}{floor}{unit}",
  },
  // S-Light: one sheet per floor group for both towers, split per tower.
  "s-light-tower": {
    towers: ["SL1", "SL2"],
    plans: ["SL1", "SL2"].flatMap((tower) => {
      const own = `${SLIGHT}mat-bang/slight-${tower.toLowerCase()}-tang-`;
      return [
        { tower, image: `${own}1.webp`, floors: ["1"] },
        { tower, image: `${own}2.webp`, floors: ["2"] },
        { tower, image: `${own}3.webp`, floors: ["3"] },
        { tower, image: `${own}3a-6.webp`, floors: ["3A", "5", "6"] },
        { tower, image: `${own}7-21.webp`, floors: range(7, 21) },
        { tower, image: `${own}22.webp`, floors: ["22"] },
      ];
    }),
    kinds: Object.assign(
      {},
      ...["sl1", "sl2"].flatMap((tower) =>
        ["3a-6", "7-21"].map((floors) => {
          const file = `slight-${tower}-tang-${floors}.webp`;
          return drawnKinds(file, SLIGHT_UNITS, (n) => {
            const area = PLAN_OUTLINES[file]?.units[n]?.inner ?? 0;
            return SLIGHT_LAYOUTS[area] && SLIGHT + SLIGHT_LAYOUTS[area];
          });
        }),
      ),
    ),
    // As on the drawings: SL1-18-06 is SL1, floor 18, unit 06.
    naming: "{tower}-{floor}-{unit}",
  },
  // FourS: F1's and F5's drawings; the other two towers have none yet.
  "fours-tower": {
    towers: ["F1", "F5"],
    plans: [
      { tower: "F1", image: "", floors: ["1"] },
      { tower: "F1", image: `${FOURS}fours-f1-tang-2.webp`, floors: ["2"] },
      { tower: "F1", image: `${FOURS}fours-f1-tang-3.webp`, floors: ["3"] },
      {
        tower: "F1",
        image: `${FOURS}fours-f1-tang-4-7.webp`,
        floors: range(4, 7),
      },
      {
        tower: "F1",
        image: `${FOURS}fours-f1-tang-8-19.webp`,
        floors: range(8, 19),
      },
      { tower: "F1", image: "", floors: ["20"] },
      { tower: "F5", image: "", floors: ["1"] },
      { tower: "F5", image: `${FOURS}fours-f5-tang-2.webp`, floors: ["2"] },
      { tower: "F5", image: `${FOURS}fours-f5-tang-3.webp`, floors: ["3"] },
      { tower: "F5", image: "", floors: range(4, 7) },
      {
        tower: "F5",
        image: `${FOURS}fours-f5-tang-8-15.webp`,
        floors: range(8, 15),
      },
      { tower: "F5", image: `${FOURS}fours-f5-tang-16.webp`, floors: ["16"] },
      {
        tower: "F5",
        image: `${FOURS}fours-f5-tang-17-19.webp`,
        floors: range(17, 19),
      },
      { tower: "F5", image: "", floors: ["20"] },
    ],
    kinds: {
      ...drawnKinds("fours-f1-tang-8-19.webp", FOURS_UNITS.F1, () => undefined),
      ...drawnKinds("fours-f5-tang-8-15.webp", FOURS_UNITS.F5, () => undefined),
    },
    // As on the drawings: F1-08-22 is F1, floor 8, unit 22.
    naming: "{tower}-{floor}-{unit}",
  },
  "sun-ponte-residence": {
    towers: ["T1", "T2"],
    plans: ["T1", "T2"].flatMap((tower) => {
      const own = `ponte-${tower.toLowerCase()}-tang-`;
      return [
        { tower, image: "ponte-khoi-de-tang-1.webp", floors: ["1"] },
        { tower, image: "ponte-khoi-de-tang-2.webp", floors: ["2"] },
        { tower, image: "", floors: ["3", "3A"] },
        { tower, image: `${own}3a-18.webp`, floors: range(4, 18) },
        { tower, image: `${own}19-21-23.webp`, floors: ["19", "21", "23"] },
        { tower, image: `${own}20-22-24.webp`, floors: ["20", "22", "24"] },
      ].map((p) => ({ ...p, image: p.image && PONTE + p.image }));
    }),
    kinds: { ...ponteKinds(), ...ponteShops() },
    notes: Object.fromEntries(
      ["T1", "T2"].map((tower) => [
        `${tower}/3A`,
        t("Tầng tiện ích: giải trí, hội nghị và khu vui chơi."),
      ]),
    ),
    // As on the drawings: T108-12 is T1, floor 8, unit 12.
    naming: "{tower}{floor}-{unit}",
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

/** Projects whose model apartments have 360° tours: Capital Square's. */
const TOUR_360 = new Set(["capital-square"]);

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
      naming: kept.naming,
      tour360: TOUR_360.has(slug),
    };
  if (!plans.length) return undefined;
  return {
    towers: (api?.towers ?? [])
      .filter((x) => plans.some((p) => p.tower === x.name))
      .map((x) => ({ name: x.name, note: x.note ? t(x.note) : "" })),
    tour360: TOUR_360.has(slug),
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
    const floors = rentalsOnly ? undefined : floorData(content, b.slug, all);
    const plans = content.apiProjects.find(
      (p) => p.slug === b.slug,
    )?.floorPlans;
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
            // A model unit is neither: it only shows how the units look.
            forRent: !p.floorNote && (!!p.forRent || !p.forSale),
            forSale: !p.floorNote && !!p.forSale,
            hot: p.interestScore ?? 0,
            trending: !!p.trending,
          })),
        floors,
        // Being built and without the 3D floors: its plans, floor by floor.
        ...(!floors &&
          b.categories.includes("development") && {
            development: true,
            plans: (plans ?? []).map((x) => ({ name: x.name, image: x.image })),
          }),
      },
    ];
  });
}
