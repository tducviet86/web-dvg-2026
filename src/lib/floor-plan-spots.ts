import { PLAN_OUTLINES, type UnitOutline } from "./floor-plan-outlines";

/**
 * Where each unit sits on a floor plan image, so a visitor can click it. In
 * image pixels: a row of units is [top, bottom, [[unit, left, right], …]].
 * A plan that is not listed (a new upload) simply shows without clickable units.
 */
type Row = [top: number, bottom: number, units: [string, number, number][]];
type Plan = {
  width: number;
  height: number;
  /** Height of the name label above / below each row of units. */
  label: number;
  rows: Row[];
};

const C4_TOP_TYPICAL: Row[2] = [
  ["06", 14, 334],
  ["05", 334, 565],
  ["03", 565, 825],
  ["02", 825, 1084],
  ["01", 1084, 1322],
];
const C4_TOP_LOW: Row[2] = [
  ["06", 14, 219],
  ["05", 219, 424],
  ["03A", 424, 565],
  ["03", 565, 825],
  ["02", 825, 1084],
  ["01", 1084, 1322],
];
const C4_BOTTOM: Row[2] = [
  ["06A", 14, 206],
  ["08", 283, 424],
  ["09", 424, 565],
  ["10", 565, 825],
  ["11", 825, 1084],
  ["12", 1084, 1324],
];
const S4_BOTTOM: Row[2] = [
  ["01", 63, 210],
  ["02", 210, 373],
  ["03", 373, 488],
  ["03A", 488, 605],
  ["05", 605, 721],
  ["06", 721, 838],
  ["06A", 838, 1000],
  ["08", 1000, 1146],
];
const S4_TOP_RIGHT: Row[2] = [
  ["12A", 547, 622],
  ["12", 622, 702],
  ["11", 702, 817],
  ["10", 817, 935],
  ["09", 982, 1146],
];

const PLANS: Record<string, Plan> = {
  "mat-bang-c4-tang-11-27.webp": {
    width: 1646,
    height: 805,
    label: 160,
    rows: [
      [162, 384, C4_TOP_TYPICAL],
      [444, 669, C4_BOTTOM],
    ],
  },
  "mat-bang-c4-tang-5-10.webp": {
    width: 1646,
    height: 825,
    label: 128,
    rows: [
      [130, 351, C4_TOP_LOW],
      [412, 637, C4_BOTTOM],
    ],
  },
  "mat-bang-c6-tang-11-27.webp": {
    width: 1673,
    height: 805,
    label: 158,
    rows: [
      [
        160,
        382,
        [
          ["06A", 41, 232],
          ["08", 308, 448],
          ["09", 448, 588],
          ["10", 588, 845],
          ["11", 845, 1104],
          ["12", 1104, 1343],
        ],
      ],
      [
        444,
        667,
        [
          ["06", 41, 360],
          ["05", 360, 588],
          ["03", 588, 846],
          ["02", 846, 1104],
          ["01", 1104, 1341],
        ],
      ],
    ],
  },
  "mat-bang-c6-tang-5-10.webp": {
    width: 1673,
    height: 825,
    label: 136,
    rows: [
      [
        138,
        355,
        [
          ["06A", 53, 242],
          ["08", 318, 457],
          ["09", 457, 596],
          ["10", 596, 850],
          ["11", 850, 1108],
          ["12", 1108, 1345],
        ],
      ],
      [
        416,
        634,
        [
          ["06", 53, 255],
          ["05", 255, 457],
          ["03A", 457, 596],
          ["03", 596, 850],
          ["02", 850, 1108],
          ["01", 1108, 1343],
        ],
      ],
    ],
  },
  "mat-bang-c7-tang-11-27.webp": {
    width: 1125,
    height: 552,
    label: 60,
    rows: [
      [
        60,
        225,
        [
          ["06", 87, 317],
          ["05", 317, 483],
          ["03", 483, 670],
          ["02", 670, 857],
          ["01", 857, 1027],
        ],
      ],
      [
        265,
        428,
        [
          ["06A", 87, 230],
          ["08", 277, 382],
          ["09", 382, 483],
          ["10", 483, 670],
          ["11", 670, 857],
          ["12", 857, 1027],
        ],
      ],
    ],
  },
  "mat-bang-c7-tang-5-10.webp": {
    width: 1125,
    height: 557,
    label: 60,
    rows: [
      [
        62,
        225,
        [
          ["06", 77, 225],
          ["05", 225, 370],
          ["03A", 370, 475],
          ["03", 475, 660],
          ["02", 660, 850],
          ["01", 850, 1020],
        ],
      ],
      [
        265,
        430,
        [
          ["06A", 77, 217],
          ["08", 270, 370],
          ["09", 370, 475],
          ["10", 475, 660],
          ["11", 660, 850],
          ["12", 850, 1020],
        ],
      ],
    ],
  },
  "mat-bang-s3-tang-5-24.webp": {
    width: 1160,
    height: 790,
    label: 88,
    rows: [
      [
        88,
        265,
        [
          ["01", 12, 208],
          ["02", 208, 348],
          ["03", 348, 487],
          ["03A", 487, 625],
          ["05", 625, 765],
          ["06", 765, 955],
          ["06A", 955, 1150],
        ],
      ],
      [
        303,
        477,
        [
          ["12A", 12, 208],
          ["12", 208, 348],
          ["11", 577, 670],
          ["10", 670, 812],
          ["09", 812, 955],
          ["08", 955, 1150],
        ],
      ],
    ],
  },
  "mat-bang-s4-tang-5-24.webp": {
    width: 1200,
    height: 848,
    label: 80,
    rows: [
      [180, 325, [["15", 63, 228], ["12B", 228, 348], ...S4_TOP_RIGHT]],
      [360, 505, S4_BOTTOM],
    ],
  },
  "mat-bang-s4-tang-12a.webp": {
    width: 1200,
    height: 848,
    label: 80,
    rows: [
      [180, 325, [["15", 63, 228], ...S4_TOP_RIGHT]],
      [360, 505, S4_BOTTOM],
    ],
  },
};

export type PlanSpot = {
  unit: string;
  /** The unit's real outline, when the plan has been traced. */
  outline?: UnitOutline;
  /** Percent of the image. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Part of the image to enlarge: the unit with its name label, in percent. */
  crop: { left: number; top: number; width: number; height: number };
  /** Width / height of that part. */
  cropRatio: number;
};

export function planSpots(image: string) {
  const file = image.split("/").pop() ?? "";
  const plan = PLANS[file];
  if (!plan) return null;
  const traced = PLAN_OUTLINES[file];
  const spots: PlanSpot[] = plan.rows.flatMap(([top, bottom, units], row) =>
    units.map(([unit, left, right]) => {
      // The label sits above the first row and below the second.
      const cropTop = row === 0 ? Math.max(0, top - plan.label) : top;
      const cropBottom =
        row === 0 ? bottom : Math.min(plan.height, bottom + plan.label);
      return {
        unit,
        outline: traced?.units[unit],
        left: (left / plan.width) * 100,
        top: (top / plan.height) * 100,
        width: ((right - left) / plan.width) * 100,
        height: ((bottom - top) / plan.height) * 100,
        crop: {
          left: (left / plan.width) * 100,
          top: (cropTop / plan.height) * 100,
          width: ((right - left) / plan.width) * 100,
          height: ((cropBottom - cropTop) / plan.height) * 100,
        },
        cropRatio: (right - left) / (cropBottom - cropTop),
      };
    }),
  );
  return {
    spots,
    ratio: plan.width / plan.height,
    width: traced?.width ?? plan.width,
    height: traced?.height ?? plan.height,
  };
}
