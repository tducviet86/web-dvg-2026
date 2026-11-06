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
    image: "/images/projects/capital-square/so-do-toan-khu.webp",
    width: 1460,
    height: 1080,
    towers: [
      {
        tower: "C1",
        points: [
          [469, 215],
          [582, 179],
          [623, 319],
          [513, 353],
        ],
      },
      {
        tower: "C4",
        points: [
          [630, 161],
          [813, 107],
          [849, 217],
          [667, 273],
        ],
      },
      {
        tower: "C6",
        points: [
          [702, 377],
          [887, 317],
          [929, 440],
          [743, 499],
        ],
      },
      {
        tower: "C7",
        points: [
          [902, 310],
          [1017, 270],
          [1080, 455],
          [965, 493],
        ],
      },
      {
        tower: "S3",
        points: [
          [687, 573],
          [881, 580],
          [879, 655],
          [687, 647],
        ],
      },
      {
        tower: "S4",
        points: [
          [678, 700],
          [905, 713],
          [902, 801],
          [677, 790],
        ],
      },
    ],
  },
};

export const projectSiteMap = (slug: string) => MAPS[slug];
