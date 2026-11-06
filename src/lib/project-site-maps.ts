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
