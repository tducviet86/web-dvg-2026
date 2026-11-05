/**
 * Model apartments of Capital Square, from the developer's 3D layouts: the
 * rooms with their photos, areas and suggested furniture sizes.
 */
export type ModelRoom = {
  name: string;
  /** m², as noted on the model's sheet. */
  area: string;
  photos: string[];
  furniture: [item: string, size: string][];
};
export type ModelUnit = { layout: string; rooms: ModelRoom[] };

const base = "/images/projects/capital-square/";
const photos = (type: string, ...files: string[]) =>
  files.map((file) => `${base}mau/${type}-${file}.webp`);

const ONE_BEDROOM: ModelUnit = {
  layout: `${base}layout-can-1pn.webp`,
  rooms: [
    {
      name: "Phòng khách",
      area: "11,6",
      photos: photos("1pn", "11", "05", "04"),
      furniture: [
        ["Sofa", "2000 x 800 mm"],
        ["Armchair", "800 x 800 mm"],
        ["Bàn trà", "D900 mm"],
        ["Tủ TV", "1500 x 350 mm"],
        ["Bàn tab", "D450 mm"],
        ["Đôn", "450 x 800 mm"],
        ["Tủ giày", "1600 x 400 mm"],
      ],
    },
    {
      name: "Phòng bếp và ăn",
      area: "11,9",
      photos: photos("1pn", "08"),
      furniture: [
        ["Tủ bếp", "2395 x 600 mm"],
        ["Bàn ăn", "1450 x 800 mm"],
        ["4 ghế ăn", "570 x 530 mm"],
      ],
    },
    {
      name: "Phòng ngủ",
      area: "10,6",
      photos: photos("1pn", "07", "13"),
      furniture: [
        ["Giường", "1600 x 2000 mm"],
        ["Tab đầu giường", "400 x 400 mm"],
        ["Tủ TV", "1400 x 300 mm"],
        ["Tủ quần áo", "2000 x 600 mm"],
      ],
    },
    {
      name: "Phòng vệ sinh",
      area: "3,9",
      photos: photos("1pn", "12"),
      furniture: [["Lavabo", "1150 x 550 mm"]],
    },
    { name: "Logia", area: "2,2", photos: photos("1pn", "10"), furniture: [] },
  ],
};

const TWO_BEDROOM: ModelUnit = {
  layout: `${base}layout-can-2pn.webp`,
  rooms: [
    {
      name: "Phòng khách",
      area: "8",
      photos: photos("2pn", "08", "06"),
      furniture: [
        ["Sofa", "2000 x 800 mm"],
        ["Bàn trà", "D900 mm"],
        ["Tủ TV", "1600 x 350 mm"],
      ],
    },
    {
      name: "Phòng bếp và ăn",
      area: "16",
      photos: photos("2pn", "03"),
      furniture: [
        ["Tủ bếp", "5000 x 600 mm"],
        ["Bàn ăn", "1500 x 800 mm"],
        ["4 ghế ăn", "570 x 610 mm"],
      ],
    },
    {
      name: "Phòng ngủ 1",
      area: "15,2",
      photos: photos("2pn", "01", "09"),
      furniture: [
        ["Giường", "1600 x 2000 mm"],
        ["Tab đầu giường", "450 x 400 mm"],
        ["Tủ TV", "1400 x 350 mm"],
        ["Tủ quần áo", "1800 x 600 mm"],
        ["Bàn trang điểm", "800 x 600 mm"],
        ["Đôn", "D400 mm"],
      ],
    },
    {
      name: "Phòng ngủ 2",
      area: "14",
      photos: photos("2pn", "07"),
      furniture: [
        ["Giường", "1600 x 2000 mm"],
        ["2 tab đầu giường", "550 x 400 mm"],
        ["Tủ TV", "1300 x 350 mm"],
        ["Tủ quần áo", "1600 x 600 mm"],
      ],
    },
    {
      name: "Phòng vệ sinh 1",
      area: "3,6",
      photos: photos("2pn", "02"),
      furniture: [["Lavabo", "970 x 600 mm"]],
    },
    {
      name: "Phòng vệ sinh 2",
      area: "3,6",
      photos: photos("2pn", "05"),
      furniture: [["Lavabo", "800 x 600 mm"]],
    },
    { name: "Logia", area: "3,3", photos: photos("2pn", "12"), furniture: [] },
  ],
};

const THREE_BEDROOM: ModelUnit = {
  layout: `${base}layout-can-3pn.webp`,
  rooms: [
    {
      name: "Phòng khách và ăn",
      area: "25",
      photos: photos("3pn", "13", "16", "11"),
      furniture: [
        ["Sofa", "2000 x 800 mm"],
        ["Bàn trà", "D900 mm"],
        ["Tủ TV", "1500 x 350 mm"],
        ["Bàn tab", "D400 mm"],
        ["Bàn ăn", "1800 x 800 mm"],
        ["6 ghế ăn", "550 x 550 mm"],
      ],
    },
    {
      name: "Phòng bếp",
      area: "5,4",
      photos: photos("3pn", "01", "03"),
      furniture: [
        ["Tủ bếp", "4450 x 600 mm"],
        ["Tủ giày", "1600 x 350 mm"],
      ],
    },
    {
      name: "Phòng ngủ 1",
      area: "19,2",
      photos: photos("3pn", "09", "04"),
      furniture: [
        ["Giường", "1800 x 2000 mm"],
        ["2 tab đầu giường", "400 x 400 mm"],
        ["Tủ TV", "1400 x 350 mm"],
        ["Tủ quần áo", "1550 x 550 mm"],
        ["2 armchair", "625 x 600 mm"],
        ["Bàn trà", "500 x 500 mm"],
        ["Bàn trang điểm", "1200 x 450 mm"],
      ],
    },
    {
      name: "Phòng ngủ 2",
      area: "10,4",
      photos: photos("3pn", "07", "08"),
      furniture: [
        ["Giường", "1600 x 2000 mm"],
        ["Tab đầu giường", "450 x 500 mm"],
        ["Tủ quần áo", "2000 x 550 mm"],
        ["Kệ TV", "1600 x 200 mm"],
      ],
    },
    {
      name: "Phòng ngủ 3",
      area: "11,3",
      photos: photos("3pn", "14", "12"),
      furniture: [
        ["Giường", "1600 x 2000 mm"],
        ["2 tab đầu giường", "450 x 500 mm"],
        ["Tủ quần áo", "2000 x 550 mm"],
        ["Kệ TV", "1600 x 200 mm"],
      ],
    },
    {
      name: "Phòng vệ sinh 1",
      area: "4,3",
      photos: photos("3pn", "15"),
      furniture: [["Lavabo", "600 x 900 mm"]],
    },
    {
      name: "Phòng vệ sinh 2",
      area: "4,9",
      photos: photos("3pn", "02"),
      furniture: [["Lavabo", "600 x 1000 mm"]],
    },
    { name: "Logia", area: "7,1", photos: photos("3pn", "05"), furniture: [] },
  ],
};

const MODELS: Record<string, ModelUnit> = {
  "1pn": ONE_BEDROOM,
  "2pn": TWO_BEDROOM,
  "2pn-plus": TWO_BEDROOM,
  "3pn": THREE_BEDROOM,
};

export const modelUnit = (unit: {
  projectSlug?: string;
  floorNote?: string;
  typeCode?: string;
}) =>
  unit.projectSlug === "capital-square" && unit.floorNote && unit.typeCode
    ? MODELS[unit.typeCode]
    : undefined;
