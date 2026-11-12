/**
 * A project's site plan with its towers clickable. Corners are in image
 * pixels; each `tower` matches a tower name in Admin.
 */
export type SiteMapTower = { tower: string; points: [number, number][] };
export type SiteMap = {
  image: string;
  width: number;
  height: number;
  towers: SiteMapTower[];
};

const MAPS: Record<string, SiteMap> = {
  // Cora: the developer's site plan, A1 and A2 either side of 29/3.
  "cora-tower": {
    image: "/images/projects/cora-tower/mat-bang-tong-the.webp",
    width: 2400,
    height: 1533,
    towers: [
      {
        tower: "A1",
        points: [
          [780, 271],
          [1083, 300],
          [1083, 377],
          [1277, 394],
          [1560, 334],
          [1611, 429],
          [1603, 523],
          [1363, 586],
          [789, 549],
        ],
      },
      {
        tower: "A2",
        points: [
          [797, 1037],
          [1294, 1025],
          [1594, 1106],
          [1629, 1260],
          [1551, 1303],
          [1286, 1217],
          [1106, 1226],
          [1106, 1311],
          [797, 1311],
        ],
      },
    ],
  },
  // S-Light: the floor plan sheet that shows both towers across 29/3.
  "s-light-tower": {
    image: "/images/projects/s-light-tower/so-do-hai-toa.webp",
    width: 2400,
    height: 1698,
    towers: [
      {
        tower: "SL1",
        points: [
          [426, 642],
          [979, 642],
          [979, 1381],
          [426, 1381],
        ],
      },
      {
        tower: "SL2",
        points: [
          [1411, 642],
          [1964, 642],
          [1964, 1381],
          [1411, 1381],
        ],
      },
    ],
  },
  "capital-square": {
    image: "/images/projects/capital-square/so-do-toan-khu-c3-gan.webp",
    width: 1190,
    height: 1130,
    towers: [
      {
        tower: "C1",
        points: [
          [273, 193],
          [385, 167],
          [420, 310],
          [317, 342],
        ],
      },
      {
        tower: "C3",
        points: [
          [125, 368],
          [300, 370],
          [298, 458],
          [125, 450],
        ],
      },
      {
        tower: "C4",
        points: [
          [430, 153],
          [610, 97],
          [648, 210],
          [465, 265],
        ],
      },
      {
        tower: "C6",
        points: [
          [502, 367],
          [692, 305],
          [728, 428],
          [540, 490],
        ],
      },
      {
        tower: "C7",
        points: [
          [702, 298],
          [820, 260],
          [880, 442],
          [760, 485],
        ],
      },
      {
        tower: "S3",
        points: [
          [487, 563],
          [682, 570],
          [679, 645],
          [487, 638],
        ],
      },
      {
        tower: "S4",
        points: [
          [475, 690],
          [707, 700],
          [705, 792],
          [475, 780],
        ],
      },
    ],
  },
};

export const projectSiteMap = (slug: string) => MAPS[slug];
