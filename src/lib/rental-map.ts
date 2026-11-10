/**
 * Simple 3D blocks for the rental map. Sizes in metres; offsets from the
 * building's map pin. Illustrative massing, not the architect's model.
 */
import { PANOMA_LOT_ROWS } from "./panoma-lots";

export type MapBlock = {
  east: number;
  north: number;
  width: number;
  depth: number;
  base: number;
  height: number;
  /** Clockwise degrees. */
  angle: number;
  /** Tower of a project with several ("C4"): clicking it opens that tower. */
  tower?: string;
  /** Low-rise (shophouses, townhouses): stone walls and a tiled roof. */
  low?: boolean;
  /** A footprint that is no rectangle: corners in metres, x east, y north. */
  outline?: [number, number][];
  /**
   * Its first floors when not four of stone: "shop" (shop fronts) or
   * "parking", one floor each; glass above them.
   */
  lowFloors?: ("shop" | "parking")[];
  /** Not on sale yet: drawn faint, with a "coming soon" label. */
  soon?: boolean;
  /** No roof room on top, as for the link between two towers. */
  bare?: boolean;
};

const M_PER_DEG = 110_574;

/**
 * A block's offset is turned with the block; this gives the offset that puts its
 * middle `east` and `north` metres from the pin, whatever its angle.
 */
function placed(east: number, north: number, angle: number) {
  const turn = (angle * Math.PI) / 180;
  return {
    east: east * Math.cos(turn) - north * Math.sin(turn),
    north: east * Math.sin(turn) + north * Math.cos(turn),
    angle,
  };
}

/** The Rio's shophouses: six and a half floors under a tiled roof. */
const RIO = { tower: "Rio", low: true, base: 0, height: 24 };

/** A block from its four corners, in metres from the pin. */
function rectangle(
  [a, b, c, d]: [number, number][],
  rest: Pick<MapBlock, "base" | "height"> & Partial<MapBlock>,
): MapBlock {
  return {
    ...placed(
      (a[0] + c[0]) / 2,
      (a[1] + c[1]) / 2,
      (Math.atan2(a[1] - b[1], b[0] - a[0]) * 180) / Math.PI,
    ),
    width: Math.hypot(b[0] - a[0], b[1] - a[1]),
    depth: Math.hypot(d[0] - a[0], d[1] - a[1]),
    ...rest,
  };
}

/** A tower of any shape: `corners` from the pin, in metres. */
function outlined(
  tower: string,
  angle: number,
  height: number,
  corners: [number, number][],
): MapBlock {
  const east = corners.reduce((n, p) => n + p[0], 0) / corners.length;
  const north = corners.reduce((n, p) => n + p[1], 0) / corners.length;
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  return {
    tower,
    east,
    north,
    width: Math.max(...xs) - Math.min(...xs),
    depth: Math.max(...ys) - Math.min(...ys),
    base: 0,
    height,
    angle,
    outline: corners.map(([x, y]) => [x - east, y - north]),
  };
}

export const FLOOR_METRES = 3.4;
const CAPITAL_PIN = { lat: 16.07008, lng: 108.23038 };

/**
 * Capital Square's site plan (2000 × 1500 px) placed on the map by its two road
 * corners: Trần Hưng Đạo × Nguyễn Công Trứ and Ngô Quyền × Nguyễn Công Trứ.
 */
const fromPlan = ([x, y]: [number, number]): [number, number] => {
  const right = x - 600;
  const up = 1085 - y;
  return [
    -156 + 0.317 * (0.9993 * right - 0.0384 * up),
    -158 + 0.317 * (0.0384 * right + 0.9993 * up),
  ];
};
const onPlan = (
  tower: string,
  floors: number,
  corners: [number, number][],
): MapBlock =>
  rectangle(corners.map(fromPlan), {
    tower,
    base: 0,
    height: floors * FLOOR_METRES,
  });
/** One of `count` towers along a long block, with a gap between them. */
const part = (
  [a, b, c, d]: [number, number][],
  i: number,
  count: number,
): [number, number][] => {
  const mix = (p: [number, number], q: [number, number], t: number) =>
    [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t] as [number, number];
  const from = (i + 0.04) / count;
  const to = (i + 1 - 0.04) / count;
  return [mix(a, d, from), mix(b, c, from), mix(b, c, to), mix(a, d, to)];
};
const TOWERS_31: [number, number][] = [
  [682, 828],
  [835, 825],
  [835, 1030],
  [682, 1030],
];
const TOWERS_35: [number, number][] = [
  [1250, 880],
  [1420, 815],
  [1560, 1170],
  [1385, 1225],
];

/**
 * Sun Symphony's lot plan (2000 × 1125 px) on the map: up is east and right is
 * south. Fixed by Trần Hưng Đạo and the two site roads that cross it.
 */
const symphonyAt = ([x, y]: [number, number]): [number, number] => [
  57 - (y - 330) * 0.475,
  103 - (x - 937) * 0.477,
];
const symphonyTower = (
  tower: string,
  floors: number,
  corners: [number, number][],
) => outlined(tower, 0, floors * FLOOR_METRES, corners.map(symphonyAt));

export const BUILDING_BLOCKS: Record<string, MapBlock[]> = {
  // The towers on sale first; floors as the plan and the floor plans say.
  "capital-square": [
    onPlan("C4", 27, [
      [960, 432],
      [1143, 378],
      [1178, 490],
      [995, 545],
    ]),
    onPlan("C6", 27, [
      [1032, 647],
      [1222, 587],
      [1257, 713],
      [1072, 768],
    ]),
    onPlan("C7", 27, [
      [1232, 578],
      [1350, 540],
      [1410, 722],
      [1290, 762],
    ]),
    onPlan("S4", 24, [
      [1005, 972],
      [1237, 982],
      [1235, 1070],
      [1005, 1060],
    ]),
    onPlan("S3", 24, [
      [1015, 845],
      [1210, 850],
      [1210, 925],
      [1015, 917],
    ]),
    onPlan("C3", 23, [
      [655, 648],
      [830, 650],
      [827, 738],
      [655, 730],
    ]),
    onPlan("C1", 25, [
      [803, 478],
      [917, 447],
      [950, 590],
      [845, 620],
    ]),
    {
      ...onPlan("2.2", 26, [
        [672, 450],
        [785, 445],
        [785, 618],
        [672, 615],
      ]),
      soon: true,
    },
    {
      ...onPlan("2.5", 28, [
        [1162, 365],
        [1270, 335],
        [1322, 500],
        [1210, 535],
      ]),
      soon: true,
    },
    { ...onPlan("3.1", 26, part(TOWERS_31, 0, 2)), soon: true },
    { ...onPlan("3.2", 26, part(TOWERS_31, 1, 2)), soon: true },
    { ...onPlan("3.5", 29, part(TOWERS_35, 0, 3)), soon: true },
    { ...onPlan("3.6", 29, part(TOWERS_35, 1, 3)), soon: true },
    { ...onPlan("3.7", 29, part(TOWERS_35, 2, 3)), soon: true },
    // The seven-floor commercial block.
    {
      soon: true,
      ...rectangle(
        [
          [845, 640],
          [990, 615],
          [1005, 740],
          [850, 760],
        ].map((p) => fromPlan(p as [number, number])),
        { base: 0, height: 7 * FLOOR_METRES },
      ),
      low: true,
    },
  ],
  // Inside Trần Hưng Đạo (front, west), An Trung 2 (back, east), An Trung 3 and
  // Trần Quang Diệu. B from OpenStreetMap; A from the developer's plan, fitted to B.
  // A: a base of four floors, then its typical floor up to 17.
  // B is one L: along An Trung 2 up to 33 floors (B1,2), along Trần Quang Diệu
  // up to 27 (B3), as on the floor plan of block B.
  "monarchy-apartments": [
    // A: one floor of shops on a wide podium with a garden roof; the octagon
    // tower (floors 2–17) rises from it, turned as the ground floor plan shows.
    {
      ...outlined("Monarchy A", 0, FLOOR_METRES, [
        [15.63, 70.09],
        [16.02, 63.0],
        [10.33, 43.36],
        [6.19, 37.57],
        [-20.29, 44.92],
        [-22.35, 48.65],
        [-14.41, 76.01],
        [-10.67, 78.08],
      ]),
      bare: true,
      lowFloors: ["shop"],
    },
    {
      ...outlined("Monarchy A", 0, 17 * FLOOR_METRES, [
        [11.46, 67.23],
        [11.76, 61.78],
        [7.38, 46.67],
        [4.2, 42.22],
        [-16.17, 47.87],
        [-17.76, 50.74],
        [-11.65, 71.79],
        [-8.77, 73.38],
      ]),
      base: FLOOR_METRES,
    },
    {
      lowFloors: ["shop", "parking"],
      ...outlined("Monarchy B", 0, 33 * FLOOR_METRES, [
        [23.6, -2.5],
        [20.9, 18.9],
        [19, 18.7],
        [18, 26.7],
        [22.9, 27.3],
        [19, 57.9],
        [38.8, 60.4],
        [45.8, 5.2],
        [46.3, 0.3],
      ]),
    },
    {
      lowFloors: ["shop", "parking"],
      ...outlined("Monarchy B", 0, 27 * FLOOR_METRES, [
        [-6.8, -27.7],
        [-9.4, -6.6],
        [23.6, -2.5],
        [46.3, 0.3],
        [48.9, -21.1],
        [9.3, -26.1],
      ]),
    },
  ],
  // Sun Cosmo: P1 by Ngũ Hành Sơn from its floor plans (a U, fitted to its
  // outline on OpenStreetMap): the right wing rises to 33, the south bar to 26
  // (a roof garden on 27), the left wing to 18. P2 by the bridge, 27 floors, as
  // its floor plan draws it. Shops on floor 1 of both. Houses: BUILDING_ROWS.
  "sun-panoma": [
    {
      ...outlined("Panoma 1", 0, 33 * FLOOR_METRES, [
        [-7.79, 10.0],
        [8.75, 17.07],
        [25.51, -21.31],
        [9.81, -30.28],
      ]),
      lowFloors: ["shop"],
    },
    {
      ...outlined("Panoma 1", 0, 26 * FLOOR_METRES, [
        [-19.76, -36.58],
        [2.39, -15.95],
        [9.12, -23.18],
        [13.31, -19.27],
        [18.83, -25.2],
        [-7.52, -49.73],
      ]),
      lowFloors: ["shop"],
    },
    {
      ...outlined("Panoma 1", 0, 18 * FLOOR_METRES, [
        [-33.81, -32.3],
        [-29.21, -25.55],
        [-28.2, -24.03],
        [-23.67, -17.4],
        [-9.74, -26.92],
        [-7.17, -24.77],
        [-0.4, -32.04],
        [-8.04, -39.16],
        [-4.06, -42.71],
        [-8.66, -49.46],
      ]),
      lowFloors: ["shop"],
    },
    {
      ...outlined("Panoma 2", 0, 27 * FLOOR_METRES, [
        [-316.98, -225.14],
        [-307.0, -264.22],
        [-333.02, -270.86],
        [-343.0, -231.78],
      ]),
      lowFloors: ["shop"],
    },
  ],
  // East of Trần Hưng Đạo the podium (102 × 31 m, two floors of shops) with T1
  // and T2: floors 1–24 and 3A between 3 and 4, joined on floors 19–24. West
  // of the road the three Rio blocks. Outlines from OpenStreetMap.
  "sun-ponte-residence": [
    rectangle(
      [
        [7, 52],
        [14, -49],
        [45, -47],
        [38, 54],
      ],
      { base: 0, height: 2 * FLOOR_METRES },
    ),
    {
      tower: "T1",
      ...placed(27.8, -23.5, 86),
      width: 38,
      depth: 26,
      base: 2 * FLOOR_METRES,
      height: 25 * FLOOR_METRES,
    },
    {
      tower: "T2",
      ...placed(24.2, 28.5, 86),
      width: 38,
      depth: 26,
      base: 2 * FLOOR_METRES,
      height: 25 * FLOOR_METRES,
    },
    {
      bare: true,
      ...placed(26, 2.5, 86),
      width: 14,
      depth: 22,
      base: 19 * FLOOR_METRES,
      height: 25 * FLOOR_METRES,
    },
    rectangle(
      [
        [-65, -15],
        [-60, -66],
        [-37, -64],
        [-43, -13],
      ],
      RIO,
    ),
    rectangle(
      [
        [-71, 52],
        [-66, 1],
        [-43, 3],
        [-49, 55],
      ],
      RIO,
    ),
    rectangle(
      [
        [-107, -25],
        [-103, -77],
        [-80, -75],
        [-85, -23],
      ],
      RIO,
    ),
  ],
  // Footprints from the project's lot plan; floors from its board.
  "sun-symphony-residence": [
    symphonyTower("S1", 30, [
      [360, 500],
      [470, 403],
      [485, 420],
      [430, 490],
      [525, 510],
      [525, 535],
      [400, 553],
    ]),
    symphonyTower("S2A", 24, [
      [605, 370],
      [690, 365],
      [725, 410],
      [725, 450],
      [680, 450],
      [640, 405],
      [605, 400],
    ]),
    symphonyTower("S2B", 16, [
      [680, 450],
      [725, 450],
      [725, 550],
      [690, 550],
    ]),
    symphonyTower("S3A", 30, [
      [1565, 420],
      [1625, 365],
      [1700, 367],
      [1700, 405],
      [1635, 410],
      [1615, 450],
      [1565, 450],
    ]),
    symphonyTower("S3B", 22, [
      [1565, 450],
      [1615, 450],
      [1615, 540],
      [1565, 540],
    ]),
  ],
  // The tower's outline in OpenStreetMap: 28 floors.
  "hiyori-garden-tower": [
    {
      east: 0,
      north: 0,
      width: 66,
      depth: 40,
      base: 0,
      height: 14,
      angle: -16,
    },
    {
      east: 0,
      north: 0,
      width: 60,
      depth: 34,
      base: 14,
      height: 95,
      angle: -16,
    },
  ],
  "sam-tower": [
    {
      east: 0,
      north: 0,
      width: 74,
      depth: 46,
      base: 0,
      height: 18,
      angle: -30,
    },
    {
      east: -19,
      north: 0,
      width: 26,
      depth: 30,
      base: 18,
      height: 115,
      angle: -30,
    },
    {
      east: 19,
      north: 0,
      width: 26,
      depth: 30,
      base: 18,
      height: 115,
      angle: -30,
    },
  ],
};

/**
 * Townhouses, house by house: each row between its street side and its back,
 * from OpenStreetMap, cut into lots about 6 m wide.
 */
type Row = {
  front: [number, number][];
  back: [number, number][];
  /** Width of a lot, and floors, when not a usual townhouse. */
  lot?: number;
  floors?: number;
  /** Lots named on the plan: their number and area, in order along the row. */
  lots?: [string, number][];
  road?: string;
  kind?: string;
  /** Each lot's outline as drawn on a plan, in place of equal cuts. */
  rings?: [number, number][][];
};

/** Plan numbers: `from` to `to` by two, leaving out `skip`; areas by exception. */
const named = (
  from: number,
  to: number,
  skip: number[],
  usual: number,
  areas: Record<number, number> = {},
): [string, number][] => {
  const list: [string, number][] = [];
  for (let n = from; n <= to; n += 2)
    if (!skip.includes(n))
      list.push([String(n).padStart(2, "0"), areas[n] ?? usual]);
  return list;
};
const symphonyRow = (
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  rest: Partial<Row> & Pick<Row, "lots">,
): Row => ({
  front: [symphonyAt([x0, y0]), symphonyAt([x1, y0])],
  back: [symphonyAt([x0, y1]), symphonyAt([x1, y1])],
  ...rest,
});
/** Green on the plan. */
const SINGLE_VILLAS = [
  "Đường 03 02",
  "Đường 03 08",
  "Đường 03 10",
  "Đường 03 42",
];
const SHOP5 = { floors: 5, kind: "Shophouse 5 tầng" };
const SHOP3 = { floors: 3, kind: "Shophouse 3 tầng" };
const VILLA = { floors: 3, kind: "Biệt thự song lập", road: "Đường 03" };

export const BUILDING_ROWS: Record<string, Row[]> = {
  // Numbers and areas as printed on the plan.
  "sun-symphony-residence": [
    symphonyRow(763, 903, 360, 405, {
      ...SHOP5,
      road: "Đường 01",
      lots: named(1, 21, [13], 108, {
        1: 170.02,
        3: 108.1,
        5: 108.07,
        7: 108.05,
        9: 108.02,
        15: 107.99,
        17: 107.99,
        19: 107.99,
        21: 172.78,
      }),
    }),
    symphonyRow(763, 903, 405, 433, {
      ...SHOP3,
      road: "Đường 02",
      lots: named(2, 22, [14], 108.53, { 2: 170.68, 22: 173.67 }),
    }),
    symphonyRow(973, 1525, 360, 405, {
      ...SHOP5,
      road: "Đường 01",
      lots: named(23, 111, [49, 53], 108, { 23: 172.69, 111: 177.35 }),
    }),
    symphonyRow(973, 1525, 405, 433, {
      ...SHOP3,
      road: "Đường 02",
      lots: named(24, 108, [], 108, { 24: 174.63, 108: 178.03 }),
    }),
    symphonyRow(1730, 1945, 362, 405, {
      ...SHOP5,
      road: "Đường 01",
      lots: named(115, 139, [], 168.6, {
        115: 218.46,
        117: 168.73,
        119: 168.7,
        121: 168.67,
        123: 168.64,
        125: 168.61,
        127: 168.58,
        129: 168.55,
        131: 168.52,
        133: 168.49,
        135: 168.46,
        137: 168.43,
        139: 209.53,
      }),
    }),
    symphonyRow(763, 903, 468, 505, {
      ...SHOP3,
      road: "Đường 02",
      lots: named(1, 21, [13], 108, { 1: 170.23, 21: 172.38 }),
    }),
    symphonyRow(973, 1268, 468, 505, {
      ...SHOP3,
      road: "Đường 02",
      lots: named(23, 71, [49, 53], 107.99, { 23: 201.11 }),
    }),
    symphonyRow(1295, 1525, 468, 505, {
      ...SHOP3,
      road: "Đường 02",
      lots: named(73, 107, [], 108, { 73: 107.99, 107: 153.4 }),
    }),
    symphonyRow(763, 903, 505, 553, {
      ...VILLA,
      lots: named(2, 8, [], 374.29, { 2: 473.59, 4: 378.5, 8: 463.06 }),
    }),
    symphonyRow(973, 1268, 505, 553, {
      ...VILLA,
      lots: named(10, 28, [14], 344.93, {
        10: 488.37,
        12: 344.94,
        16: 344.94,
        18: 344.94,
        20: 344.94,
      }),
    }),
    symphonyRow(1295, 1525, 505, 553, {
      ...VILLA,
      lots: named(30, 42, [], 344.92, { 30: 390.91, 42: 431.66 }),
    }),
    {
      front: [symphonyAt([15, 530]), symphonyAt([220, 325])],
      back: [symphonyAt([60, 570]), symphonyAt([275, 375])],
      ...SHOP5,
      road: "Đường 05",
      lots: named(1, 21, [13], 170, {
        1: 258.83,
        3: 133.21,
        5: 139.46,
        7: 146.98,
        9: 154.49,
        11: 162.01,
        15: 169.52,
        17: 177.04,
        19: 184.55,
        21: 328.87,
      }),
    },
  ],
  // Sun Cosmo's low-rise lots from its master plan, by block; floors as on
  // the model houses' plans: townhouses 7, villas 3.
  "sun-panoma": PANOMA_LOT_ROWS.map(
    ({ block, kind, lots, rings, front, back }) => ({
      front,
      back,
      road: block,
      kind,
      floors: kind === "Nhà phố" ? 7 : 3,
      lots,
      rings,
    }),
  ),
};
const LOT_METRES = 6;

const COSMO = "/images/projects/sun-panoma/thap-tang/";
/** Sun Cosmo's model houses, floor by floor: [floors, picture]. */
const COSMO_HOUSES: Record<string, [number[], string][]> = {
  "5 × 20 m": [
    [[1, 2], "nha-pho-20-tang-1-2"],
    [[3], "nha-pho-20-tang-3"],
    [[4, 5], "nha-pho-20-tang-4-5"],
    [[6], "nha-pho-20-tang-6"],
    [[7], "nha-pho-20-tang-7"],
  ],
  "5 × 28 m": [
    [[1, 2], "nha-pho-28-tang-1-2"],
    [[3], "nha-pho-28-tang-3"],
    [[4, 5], "nha-pho-28-tang-4-5"],
    [[6], "nha-pho-28-tang-6"],
    [[7], "nha-pho-28-tang-7"],
  ],
  "Biệt thự song lập": [1, 2, 3].map((n) => [[n], `song-lap-tang-${n}`]),
  "Biệt thự song lập đặc biệt": [1, 2, 3].map((n) => [
    [n],
    `song-lap-dac-biet-tang-${n}`,
  ]),
  "Biệt thự đơn lập": [1, 2, 3].map((n) => [[n], `don-lap-tang-${n}`]),
};

/**
 * The model house's plan of a lot's floor, where there is one. Townhouses
 * up to 125 m² follow the 5 × 20 m model, larger ones the 5 × 28 m.
 */
export function lotPlan(
  slug: string,
  kind: string,
  area: number,
  floor: number,
) {
  if (slug !== "sun-panoma") return null;
  const model =
    kind === "Nhà phố" ? (area <= 125 ? "5 × 20 m" : "5 × 28 m") : kind;
  const plan = COSMO_HOUSES[model]?.find(([floors]) => floors.includes(floor));
  return plan ? { model, image: `${COSMO}${plan[1]}.webp` } : null;
}
const LOT_FLOORS = 7;

/** The map's own houses here are raised to their real height: the villas. */
const RAISED_AREAS: Record<string, [number, number][]> = {
  "sun-panoma": [
    [-33, -58],
    [-2, -73],
    [27, -179],
    [-290, -272],
    [-294, -245],
    [-169, -208],
    [-152, -182],
  ],
};
export const VILLA_METRES = 14;

const pointAlong = (line: [number, number][], part: number) => {
  const lengths = line
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - line[i][0], p[1] - line[i][1]));
  let left = part * lengths.reduce((n, l) => n + l, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const u = left / lengths[i];
      return [
        line[i][0] + (line[i + 1][0] - line[i][0]) * u,
        line[i][1] + (line[i + 1][1] - line[i][1]) * u,
      ] as [number, number];
    }
    left -= lengths[i];
  }
  return line[line.length - 1];
};

/** A row's lots as corners in metres from the pin. */
export function rowLots({ front, back, lot = LOT_METRES, lots, rings }: Row) {
  if (rings) return rings;
  const length = front
    .slice(1)
    .reduce(
      (n, p, i) => n + Math.hypot(p[0] - front[i][0], p[1] - front[i][1]),
      0,
    );
  const count = lots?.length ?? Math.max(1, Math.round(length / lot));
  // A thin gap between neighbours shows each house.
  const gap = 0.04;
  return Array.from({ length: count }, (_, i) => {
    const from = (i + gap) / count;
    const to = (i + 1 - gap) / count;
    return [
      pointAlong(front, from),
      pointAlong(front, to),
      pointAlong(back, to),
      pointAlong(back, from),
    ];
  });
}

/** Every lot of a building as GeoJSON; about half have their lights on at night. */
export function lotFeatures(slug: string, lat: number, lng: number) {
  const cos = Math.cos((lat * Math.PI) / 180);
  let seed = 7;
  return (BUILDING_ROWS[slug] ?? []).flatMap((row) =>
    rowLots(row).map((corners, i) => {
      seed = (seed * 16807) % 2147483647;
      const ring = corners.map(([east, north]) => [
        lng + east / (M_PER_DEG * cos),
        lat + north / M_PER_DEG,
      ]);
      return {
        type: "Feature" as const,
        properties: {
          slug,
          lit: seed % 100 < 55,
          height: (row.floors ?? LOT_FLOORS) * FLOOR_METRES,
          // Only lots named on a plan can be opened.
          code: row.lots ? `${row.road} · ${row.lots[i][0]}` : "",
          kind: SINGLE_VILLAS.includes(`${row.road} ${row.lots?.[i][0]}`)
            ? "Biệt thự đơn lập"
            : (row.kind ?? ""),
          area: row.lots?.[i][1] ?? 0,
          floors: row.floors ?? LOT_FLOORS,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[...ring, ring[0]]],
        },
      };
    }),
  );
}

/** A building's rows of townhouses as [lng, lat] rings. */
export function rowRings(slug: string, lat: number, lng: number) {
  const cos = Math.cos((lat * Math.PI) / 180);
  return (BUILDING_ROWS[slug] ?? []).map(({ front, back }) => {
    const ring = [...front, ...[...back].reverse()].map(([east, north]) => [
      lng + east / (M_PER_DEG * cos),
      lat + north / M_PER_DEG,
    ]);
    return [...ring, ring[0]];
  });
}

/** Areas where the map's own houses are raised, as [lng, lat] rings. */
export function raisedRings(slug: string, lat: number, lng: number) {
  const cos = Math.cos((lat * Math.PI) / 180);
  const points = RAISED_AREAS[slug];
  if (!points) return [];
  const ring = points.map(([east, north]) => [
    lng + east / (M_PER_DEG * cos),
    lat + north / M_PER_DEG,
  ]);
  return [[...ring, ring[0]]];
}

/** Buildings with no map pin in Admin yet (an Admin pin takes over). */
export const BUILDING_PLACES: Record<string, { lat: number; lng: number }> = {
  "capital-square": CAPITAL_PIN,
  // Beside Trần Hưng Đạo near Nguyễn Trung Trực; estimated, not surveyed.
  "sun-symphony-residence": { lat: 16.0855, lng: 108.2283 },
  "hiyori-garden-tower": { lat: 16.06126, lng: 108.23562 },
  "sam-tower": { lat: 16.0912, lng: 108.22 },
};

/** A block's corners as [lng, lat], closed for GeoJSON. */
export function blockRing(lat: number, lng: number, b: MapBlock) {
  const cos = Math.cos((lat * Math.PI) / 180);
  const turn = (b.angle * Math.PI) / 180;
  const hw = b.width / 2;
  const hd = b.depth / 2;
  const corners: [number, number][] = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
    [-hw, -hd],
  ];
  return corners.map(([x, y]) => {
    const ex = b.east + x;
    const ny = b.north + y;
    const east = ex * Math.cos(turn) + ny * Math.sin(turn);
    const north = -ex * Math.sin(turn) + ny * Math.cos(turn);
    return [lng + east / (M_PER_DEG * cos), lat + north / M_PER_DEG];
  });
}

/** A block's middle as [lng, lat]. */
export function blockCentre(lat: number, lng: number, b: MapBlock) {
  const ring = blockRing(lat, lng, b).slice(0, 4);
  return [
    ring.reduce((n, p) => n + p[0], 0) / 4,
    ring.reduce((n, p) => n + p[1], 0) / 4,
  ] as [number, number];
}

/** Where the models stand, a little wider: the map's own blocks there are hidden. */
export function siteRings(slug: string, lat: number, lng: number) {
  return (BUILDING_BLOCKS[slug] ?? []).map((b) => {
    const [x, y] = blockCentre(lat, lng, b);
    return blockRing(lat, lng, b).map(([p, q]) => [
      x + (p - x) * 1.15,
      y + (q - y) * 1.15,
    ]);
  });
}

/** District of each building, for the map's area filter. */
export const BUILDING_AREAS: Record<string, string> = {
  "capital-square": "Sơn Trà",
  "monarchy-apartments": "Sơn Trà",
  "sun-panoma": "Sơn Trà",
  "sun-ponte-residence": "Sơn Trà",
  "hiyori-garden-tower": "Sơn Trà",
  "sun-symphony-residence": "Sơn Trà",
  "sam-tower": "Hải Châu",
};

/** Landmarks; coordinates from OpenStreetMap. */
export const NEARBY_PLACES = [
  { name: "Cầu Rồng", lat: 16.0611, lng: 108.2279 },
  { name: "Cầu Sông Hàn", lat: 16.07199, lng: 108.22555 },
  { name: "Cầu Trần Thị Lý", lat: 16.0504, lng: 108.22999 },
  { name: "Chợ Hàn", lat: 16.06826, lng: 108.22439 },
  { name: "Vincom Plaza", lat: 16.0714, lng: 108.2303 },
  { name: "Bãi biển Mỹ Khê", lat: 16.07561, lng: 108.25474 },
  { name: "Sân bay Đà Nẵng", lat: 16.0429, lng: 108.19839 },
];

/** Straight-line distance in metres. */
export function distance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const north = (a.lat - b.lat) * M_PER_DEG;
  const east = (a.lng - b.lng) * M_PER_DEG * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(north, east);
}
