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
  /** A crown above the top floor: pointing at it means the top floor. */
  crown?: boolean;
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

/** Da Nang Downtown's planned towers: name, floors, corners from Aurora's pin. */
// prettier-ignore
const DOWNTOWN_TOWERS: [string, number, [number, number][]][] = [
    ["Ven sông 1", 32, [[-232.5, 730.2], [-222.5, 691.5], [-195.4, 698.5], [-205.4, 737.3]]],
    ["Ven sông 2", 32, [[-209.0, 632.9], [-199.0, 594.1], [-171.9, 601.2], [-181.9, 639.9]]],
    ["Ven sông 3", 32, [[-183.3, 535.5], [-173.3, 496.8], [-146.1, 503.8], [-156.2, 542.5]]],
    ["Ven sông 4", 32, [[-157.6, 438.1], [-147.5, 399.4], [-120.4, 406.4], [-130.5, 445.1]]],
    ["Ven sông 5", 32, [[-131.9, 340.7], [-121.8, 302.0], [-94.7, 309.0], [-104.8, 347.7]]],
    ["Ven sông 6", 32, [[-108.2, 249.8], [-98.1, 211.1], [-71.0, 218.1], [-81.1, 256.8]]],
    ["Trung tâm 1", 26, [[-319.4, 696.6], [-309.7, 661.9], [-284.7, 668.8], [-294.3, 703.5]]],
    ["Trung tâm 2", 26, [[-295.9, 594.9], [-286.3, 560.2], [-261.2, 567.2], [-270.9, 601.8]]],
    ["Trung tâm 3", 26, [[-268.2, 491.0], [-258.6, 456.3], [-233.5, 463.3], [-243.2, 498.0]]],
    ["Trung tâm 4", 26, [[-238.3, 387.1], [-228.7, 352.4], [-203.6, 359.4], [-213.3, 394.1]]],
    ["Trung tâm 5", 26, [[-206.1, 289.6], [-196.4, 255.0], [-171.4, 261.9], [-181.0, 296.6]]],
    ["Trung tâm 6", 30, [[-455.1, 672.5], [-429.9, 646.7], [-411.3, 664.8], [-436.4, 690.6]]],
    ["Khán đài Sun Galaxy", 4, [[370.7, 617.5], [451.2, 370.2], [489.2, 382.6], [408.7, 629.8]]],
    ["Sun Galaxy", 6, [[534.0, 500.0], [532.3, 510.7], [527.4, 520.3], [519.8, 527.9], [510.2, 532.8], [499.5, 534.5], [488.9, 532.8], [479.2, 527.9], [471.6, 520.3], [466.7, 510.7], [465.0, 500.0], [466.7, 489.4], [471.6, 479.8], [479.2, 472.1], [488.9, 467.2], [499.5, 465.5], [510.2, 467.2], [519.8, 472.1], [527.4, 479.8], [532.3, 489.4]]],
    ["Sun Galaxy 1", 45, [[527.9, 664.5], [544.9, 612.2], [578.2, 623.0], [561.1, 675.3]]],
    ["Sun Galaxy 2", 45, [[613.4, 377.0], [630.5, 324.7], [663.8, 335.6], [646.7, 387.9]]],
];
/** Its shophouse rows between the lagoons, three floors. */
// prettier-ignore
const DOWNTOWN_SHOPS: [string, number, [number, number][]][] = [
    ["Phố 1", 3, [[-497.4, 612.3], [-477.6, 555.7], [-460.6, 561.6], [-480.4, 618.2]]],
    ["Phố 2", 3, [[-477.9, 525.7], [-458.1, 469.1], [-441.1, 475.1], [-461.0, 531.7]]],
    ["Phố 3", 3, [[-447.6, 439.1], [-427.7, 382.5], [-410.8, 388.4], [-430.6, 445.1]]],
    ["Phố 4", 3, [[-417.2, 352.5], [-397.4, 295.9], [-380.4, 301.8], [-400.2, 358.4]]],
    ["Phố 5", 3, [[-386.6, 276.6], [-366.7, 220.0], [-349.8, 226.0], [-369.6, 282.6]]],
];

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
  // Sun Property's own outline of the site (sunpropertygroup.vn), turned 37°:
  // four towers of 20 floors over shops and a floor of amenities.
  // One tower on each corner of the Nguyễn Phước Lan × Minh Mạng crossing, along
  // both roads (satellite imagery), inside Sun Property's own site outline:
  // 20 floors over shops and a floor of amenities. F1 east and F5 west, from
  // the key plans on their floor plans; the other two are not named yet.
  "fours-tower": (
    [
      [
        "F1",
        [
          [67.2, 31.5],
          [78.7, 17.0],
          [73.0, 12.5],
          [79.5, 4.1],
          [85.2, 8.6],
          [96.7, -5.9],
          [66.5, -29.7],
          [55.0, -15.2],
          [65.3, -7.1],
          [58.7, 1.2],
          [48.5, -6.9],
          [37.0, 7.6],
        ],
      ],
      [
        "",
        [
          [8.8, -33.7],
          [44.4, -55.9],
          [13.9, -84.8],
          [-21.8, -62.5],
        ],
      ],
      [
        "F5",
        [
          [-81.5, -31.8],
          [-70.1, -16.7],
          [-64.0, -21.3],
          [-52.0, -5.2],
          [-65.6, 5.1],
          [-70.7, -1.8],
          [-79.5, 4.8],
          [-62.1, 27.9],
          [-21.9, -2.2],
          [-57.6, -49.7],
        ],
      ],
      [
        "",
        [
          [-5.0, 30.6],
          [-38.6, 55.8],
          [-5.7, 81.9],
          [28.0, 56.6],
        ],
      ],
    ] as [string, [number, number][]][]
  ).map(([tower, corners]) => ({
    ...outlined(tower, 0, 20 * FLOOR_METRES, corners),
    lowFloors: ["shop", "shop"],
  })),
  // SL1 west and SL2 east of 29/3, fronting Nguyễn Đình Thi, as on the
  // developer's floor plans and the two building sites on satellite imagery:
  // 22 floors, shophouses at the foot.
  "s-light-tower": (
    [
      ["SL1", -37, 0],
      ["SL2", 45.3, -1.8],
    ] as [string, number, number][]
  ).map(([tower, east, north]) => ({
    tower,
    east,
    north,
    width: 33,
    depth: 45,
    base: 0,
    height: 22 * FLOOR_METRES,
    angle: 33,
    lowFloors: ["shop", "shop"],
  })),
  // A1 north-west and A2 south-east of 29/3's park strip, their bent ends on
  // the Nguyễn Phước Lan roundabout: each the outline of its typical floor
  // plan, sized by the units' areas and laid as the developer's site plan
  // shows, on the two building sites of satellite imagery; 25 floors.
  "cora-tower": (
    [
      [
        "A1",
        [
          [-91.9, -15.3],
          [-69.3, 10.3],
          [-62.4, 5.4],
          [-44.6, 25.9],
          [-39.3, 45.5],
          [-35.7, 49.5],
          [-11.9, 43.9],
          [-22.8, 14.1],
          [-65.5, -33.8],
        ],
      ],
      [
        "A2",
        [
          [-27.5, -74.5],
          [15.2, -27.5],
          [19.9, -25.4],
          [50.5, -12.5],
          [62.0, -30.6],
          [54.6, -34.7],
          [39.9, -39.3],
          [32.1, -43.1],
          [13.5, -62.7],
          [21.0, -67.4],
          [-1.9, -93.2],
        ],
      ],
    ] as [string, [number, number][]][]
  ).map(([tower, corners]) => ({
    ...outlined(tower, 0, 25 * FLOOR_METRES, corners),
    lowFloors: ["shop", "shop"],
  })),
  // The tower on the corner of Nguyễn Đức Thuận and Trường Sa: the L of the
  // owner's typical floor plan (3A–28), its sea-side units sticking out east,
  // laid in the empty lot on satellite imagery; 30 floors.
  "sun-saphia-residence": [
    outlined("Saphia", 0, 30 * FLOOR_METRES, [
      [-7.6, 27.3],
      [11.0, -7.6],
      [18.7, -3.5],
      [28.9, -22.6],
      [19.9, -27.4],
      [15.2, -18.4],
      [8.3, -22.1],
      [13.0, -31.0],
      [0.8, -37.5],
      [-17.5, -3.1],
      [-36.6, -13.2],
      [-47.0, 6.3],
    ]),
  ].map((b) => ({ ...b, lowFloors: ["shop", "shop"] })),
  // Da Nang Downtown, from the developer's site plan laid on satellite imagery
  // (its stadium, island and Phan Đăng Lưu's river end), built as the renders
  // show: Aurora Tower (69 floors, its crown to 408 m) on the river south of
  // Phan Đăng Lưu, the opera house on the north tip, high-rises along the river,
  // shophouses between the lagoons; across the river on
  // Chương Dương, Sun Galaxy Complex: its grandstand, the 69 m round hall and
  // two towers. Floors of the planned towers are estimates from the renders.
  "da-nang-downtown": [
    outlined("Aurora Tower", 0, 69 * FLOOR_METRES, [
      [-20.6, -15.2],
      [10.3, -23.5],
      [18.9, -18.5],
      [25.6, 6.6],
      [20.6, 15.2],
      [-10.3, 23.5],
      [-18.9, 18.5],
      [-25.6, -6.6],
    ]),
    {
      ...outlined("Aurora Tower", 0, 408, [
        [-15.5, -11.4],
        [7.7, -17.6],
        [15.1, -13.4],
        [19.7, 4.0],
        [15.5, 11.4],
        [-7.7, 17.6],
        [-15.1, 13.4],
        [-19.7, -4.0],
      ]),
      base: 69 * FLOOR_METRES,
      bare: true,
      crown: true,
    },
    outlined("Nhà hát Opera", 0, 10 * FLOOR_METRES, [
      [-310.3, 865.9],
      [-322.8, 874.3],
      [-338.3, 877.8],
      [-355.2, 875.9],
      [-371.9, 868.9],
      [-386.6, 857.4],
      [-398.1, 842.7],
      [-405.1, 826.0],
      [-407.0, 809.1],
      [-403.5, 793.6],
      [-395.1, 781.1],
      [-382.6, 772.6],
      [-367.1, 769.2],
      [-350.2, 771.1],
      [-333.5, 778.1],
      [-318.8, 789.5],
      [-307.3, 804.3],
      [-300.3, 821.0],
      [-298.4, 837.9],
      [-301.9, 853.3],
    ]),
    ...DOWNTOWN_TOWERS.map(([name, floors, corners]) =>
      outlined(name, 0, floors * FLOOR_METRES, corners),
    ),
    ...DOWNTOWN_SHOPS.map(([name, floors, corners]) => ({
      ...outlined(name, 0, floors * FLOOR_METRES, corners),
      low: true,
    })),
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
  // The middle of Sun Property's site outline.
  "fours-tower": { lat: 16.0096361, lng: 108.2424993 },
  // On 29/3 between the two towers; from satellite imagery.
  "s-light-tower": { lat: 16.02458, lng: 108.23441 },
  // On 29/3 between the two towers, south-west of the roundabout.
  "cora-tower": { lat: 16.01803, lng: 108.22968 },
  // The building site on the corner, from satellite imagery.
  "sun-saphia-residence": { lat: 16.021, lng: 108.2579 },
  // Aurora Tower, on the site plan laid on satellite imagery.
  "da-nang-downtown": { lat: 16.038278, lng: 108.233431 },
};

/**
 * Fireworks over the Hàn at night, before Sun Galaxy's grandstand: metres east
 * and north of a project's pin.
 */
export const FIREWORKS = {
  slug: "da-nang-downtown",
  east: 115,
  north: 412,
};

/**
 * How the camera opens on a project, where not from -30° at zoom 15.9 on its
 * pin: `bearing`, `zoom`, and `centre` metres east and north of the pin.
 */
export const PLACE_VIEWS: Record<
  string,
  { bearing: number; zoom?: number; centre?: [number, number] }
> = {
  // Up 29/3 to the roundabout, a tower on each side of the road.
  "cora-tower": { bearing: 53 },
  // From afar, across Downtown and the Hàn to Sun Galaxy and the sea.
  "da-nang-downtown": { bearing: 75, zoom: 14.9, centre: [-300, 380] },
};

/**
 * The plan of a tower's floor `level` among a project's plans, by their names:
 * "Tòa F1 · Tầng 8-19" is for F1 only, a name with no tower of the project is
 * for all of them; "3A-28" starts at 3 (a plan listed first wins).
 */
export function planAt<T extends { name: string }>(
  slug: string,
  plans: T[] | undefined,
  tower: string,
  level: number,
) {
  const named = (BUILDING_BLOCKS[slug] ?? []).flatMap((b) =>
    b.tower ? [b.tower] : [],
  );
  return plans?.find((plan) => {
    const [head, floors = ""] = plan.name.split("Tầng ");
    const towers = named.filter((x) =>
      new RegExp(`(^|[^\\w])${x}([^\\w]|$)`).test(head),
    );
    if (towers.length && !towers.includes(tower)) return false;
    return floors.split(",").some((part) => {
      const [from, to = from] = part.split("-").map((n) => parseInt(n, 10));
      return level >= from && level <= to;
    });
  });
}

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
  "s-light-tower": "Cẩm Lệ",
  "cora-tower": "Cẩm Lệ",
  "fours-tower": "Ngũ Hành Sơn",
  "sun-saphia-residence": "Ngũ Hành Sơn",
  "da-nang-downtown": "Hải Châu",
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
