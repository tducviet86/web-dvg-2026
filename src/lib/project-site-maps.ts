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
    image: "/images/projects/capital-square/so-do-toan-khu-c3.webp",
    width: 2000,
    height: 1500,
    towers: [
      {
        tower: "C1",
        points: [
          [803, 473],
          [915, 447],
          [950, 590],
          [847, 622],
        ],
      },
      {
        tower: "C3",
        points: [
          [655, 648],
          [830, 650],
          [828, 738],
          [655, 730],
        ],
      },
      {
        tower: "C4",
        points: [
          [960, 433],
          [1140, 377],
          [1178, 490],
          [995, 545],
        ],
      },
      {
        tower: "C6",
        points: [
          [1032, 647],
          [1222, 585],
          [1258, 708],
          [1070, 770],
        ],
      },
      {
        tower: "C7",
        points: [
          [1232, 578],
          [1350, 540],
          [1410, 722],
          [1290, 765],
        ],
      },
      {
        tower: "S3",
        points: [
          [1017, 843],
          [1212, 850],
          [1209, 925],
          [1017, 918],
        ],
      },
      {
        tower: "S4",
        points: [
          [1005, 970],
          [1237, 980],
          [1235, 1072],
          [1005, 1060],
        ],
      },
    ],
  },
};

export const projectSiteMap = (slug: string) => MAPS[slug];
