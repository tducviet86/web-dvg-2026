/**
 * 360° tours of the model apartments: rooms, starting view and the arrows
 * between rooms. Photos: public/images/projects/capital-square/tour/.
 */
export type TourSpot = { yaw: number; pitch: number; to: string };
export type TourScene = {
  id: string;
  title: string;
  yaw: number;
  pitch: number;
  spots: TourSpot[];
};
/** A room's dot on the floor plan, as a share of the image's width and height. */
export type TourPlanSpot = { x: number; y: number; to: string };
export type TourPlan = { width: number; height: number; spots: TourPlanSpot[] };
export type Tour = { type: string; scenes: TourScene[]; plan: TourPlan };

const SCENES: Record<string, TourScene[]> = {
  "1pn": [
    {
      id: "pano60",
      title: "Phòng khách",
      yaw: 117,
      pitch: -2.25,
      spots: [
        {
          yaw: -144.23,
          pitch: -23.67,
          to: "pano59",
        },
        {
          yaw: -172.43,
          pitch: -25.66,
          to: "pano61",
        },
        {
          yaw: 14.69,
          pitch: -32.05,
          to: "pano58",
        },
      ],
    },
    {
      id: "pano58",
      title: "Cửa chính",
      yaw: -1.35,
      pitch: -0.45,
      spots: [
        {
          yaw: -104.21,
          pitch: -41.1,
          to: "pano62",
        },
        {
          yaw: -0.63,
          pitch: -30.14,
          to: "pano60",
        },
      ],
    },
    {
      id: "pano59",
      title: "Khu bếp",
      yaw: -122.4,
      pitch: 1.04,
      spots: [
        {
          yaw: -28.0,
          pitch: -31.83,
          to: "pano60",
        },
        {
          yaw: 139.08,
          pitch: -33.78,
          to: "pano677",
        },
      ],
    },
    {
      id: "pano61",
      title: "Phòng ngủ",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: -122.39,
          pitch: -28.88,
          to: "pano60",
        },
      ],
    },
    {
      id: "pano62",
      title: "WC",
      yaw: 161.1,
      pitch: 4,
      spots: [
        {
          yaw: 10.41,
          pitch: -44.54,
          to: "pano58",
        },
      ],
    },
    {
      id: "pano677",
      title: "Ban công",
      yaw: 175.5,
      pitch: 0,
      spots: [
        {
          yaw: 3.02,
          pitch: -13.78,
          to: "pano59",
        },
      ],
    },
  ],
  "2pn": [
    {
      id: "pano25",
      title: "Phòng khách",
      yaw: 54,
      pitch: 1.35,
      spots: [
        {
          yaw: 95.98,
          pitch: -25.89,
          to: "pano22",
        },
        {
          yaw: -44.0,
          pitch: -34.36,
          to: "pano23",
        },
        {
          yaw: -172.0,
          pitch: -35.62,
          to: "pano24",
        },
      ],
    },
    {
      id: "pano22",
      title: "Bàn trà",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: -132.84,
          pitch: -37.73,
          to: "pano25",
        },
        {
          yaw: 44.6,
          pitch: -23.59,
          to: "pano813",
        },
      ],
    },
    {
      id: "pano23",
      title: "Khu bếp",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: 134.53,
          pitch: -34.78,
          to: "pano25",
        },
      ],
    },
    {
      id: "pano24",
      title: "Lối đi",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: 132.42,
          pitch: -26.35,
          to: "pano26",
        },
        {
          yaw: -134.11,
          pitch: -26.77,
          to: "pano27",
        },
        {
          yaw: -87.79,
          pitch: -47.0,
          to: "pano28",
        },
        {
          yaw: 46.53,
          pitch: -32.67,
          to: "pano25",
        },
      ],
    },
    {
      id: "pano26",
      title: "Phòng ngủ 2",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: 145.47,
          pitch: -19.18,
          to: "pano24",
        },
        {
          yaw: 149.26,
          pitch: -31.41,
          to: "pano29",
        },
      ],
    },
    {
      id: "pano27",
      title: "Phòng ngủ 1",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: 1.05,
          pitch: -20.44,
          to: "pano24",
        },
      ],
    },
    {
      id: "pano28",
      title: "WC chung",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: -174.53,
          pitch: -47.0,
          to: "pano24",
        },
      ],
    },
    {
      id: "pano29",
      title: "WC riêng",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: -79.79,
          pitch: -49.53,
          to: "pano26",
        },
      ],
    },
    {
      id: "pano813",
      title: "Ban công",
      yaw: -103.83,
      pitch: -0.13,
      spots: [
        {
          yaw: 0.63,
          pitch: -10.49,
          to: "pano22",
        },
      ],
    },
  ],
  "3pn": [
    {
      id: "pano22",
      title: "Cửa chính",
      yaw: 64.35,
      pitch: 0.45,
      spots: [
        {
          yaw: -7.79,
          pitch: -34.36,
          to: "pano27",
        },
        {
          yaw: -172.61,
          pitch: -26.76,
          to: "pano25",
        },
        {
          yaw: -130.31,
          pitch: -27.6,
          to: "pano28",
        },
        {
          yaw: 90.06,
          pitch: -20.11,
          to: "pano24",
        },
        {
          yaw: 51.35,
          pitch: -31.76,
          to: "pano23",
        },
      ],
    },
    {
      id: "pano24",
      title: "Phòng khách",
      yaw: -138.6,
      pitch: -1.35,
      spots: [
        {
          yaw: 11.89,
          pitch: -19.83,
          to: "pano22",
        },
        {
          yaw: 60.0,
          pitch: -33.51,
          to: "pano23",
        },
        {
          yaw: 133.68,
          pitch: -38.99,
          to: "pano26",
        },
        {
          yaw: -155.87,
          pitch: -20.93,
          to: "pano907",
        },
      ],
    },
    {
      id: "pano23",
      title: "Khu bếp",
      yaw: 47.93,
      pitch: -4.41,
      spots: [
        {
          yaw: -2.32,
          pitch: -34.36,
          to: "pano24",
        },
      ],
    },
    {
      id: "pano25",
      title: "Phòng master",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: 38.16,
          pitch: -34.53,
          to: "pano29",
        },
        {
          yaw: 96.5,
          pitch: -44.24,
          to: "pano24",
        },
      ],
    },
    {
      id: "pano26",
      title: "Phòng ngủ 1",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: -143.66,
          pitch: -26.14,
          to: "pano24",
        },
      ],
    },
    {
      id: "pano27",
      title: "Phòng ngủ 2",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: 16.63,
          pitch: -26.61,
          to: "pano22",
        },
      ],
    },
    {
      id: "pano28",
      title: "WC chung",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: 129.71,
          pitch: -33.83,
          to: "pano22",
        },
      ],
    },
    {
      id: "pano29",
      title: "WC master",
      yaw: 0,
      pitch: 0,
      spots: [
        {
          yaw: -158.51,
          pitch: -46.98,
          to: "pano25",
        },
      ],
    },
    {
      id: "pano907",
      title: "Ban công",
      yaw: 75.43,
      pitch: 0,
      spots: [
        {
          yaw: 0.94,
          pitch: -12.53,
          to: "pano24",
        },
      ],
    },
  ],
};

/** 2 PN +1 uses the 2 PN apartment. */
const PLANS: Record<string, TourPlan> = {
  "1pn": {
    width: 569,
    height: 885,
    spots: [
      { x: 0.747, y: 0.971, to: "pano58" },
      { x: 0.649, y: 0.654, to: "pano60" },
      { x: 0.728, y: 0.235, to: "pano59" },
      { x: 0.317, y: 0.189, to: "pano61" },
      { x: 0.709, y: 0.034, to: "pano677" },
      { x: 0.46, y: 0.89, to: "pano62" },
    ],
  },
  "2pn": {
    width: 711,
    height: 771,
    spots: [
      { x: 0.163, y: 0.838, to: "pano23" },
      { x: 0.308, y: 0.542, to: "pano25" },
      { x: 0.474, y: 0.663, to: "pano24" },
      { x: 0.347, y: 0.271, to: "pano22" },
      { x: 0.568, y: 0.266, to: "pano26" },
      { x: 0.816, y: 0.731, to: "pano27" },
      { x: 0.289, y: 0.063, to: "pano813" },
      { x: 0.52, y: 0.79, to: "pano28" },
      { x: 0.72, y: 0.5, to: "pano29" },
    ],
  },
  "3pn": {
    width: 733,
    height: 732,
    spots: [
      { x: 0.109, y: 0.22, to: "pano29" },
      { x: 0.329, y: 0.09, to: "pano28" },
      { x: 0.85, y: 0.845, to: "pano26" },
      { x: 0.85, y: 0.186, to: "pano27" },
      { x: 0.801, y: 0.477, to: "pano23" },
      { x: 0.55, y: 0.53, to: "pano24" },
      { x: 0.535, y: 0.162, to: "pano22" },
      { x: 0.254, y: 0.395, to: "pano25" },
      { x: 0.51, y: 0.949, to: "pano907" },
    ],
  },
};

export function modelTour(type: string): Tour | undefined {
  return SCENES[type]
    ? { type, scenes: SCENES[type], plan: PLANS[type] }
    : undefined;
}
