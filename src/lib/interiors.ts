/**
 * Units one can walk into in 3D, built from the developer's layout of the unit
 * (sizes as printed on it). Metres: x to the right of the layout, z down it;
 * a rectangle is [x0, z0, x1, z1]. The floor is the layout itself.
 */
export type Rect = [number, number, number, number];
/** Which way a piece faces (its front, or a bed's foot): toward −x, +x, −z, +z. */
export type Facing = "-x" | "+x" | "-z" | "+z";
export type Furniture =
  | { kind: "bed"; at: Rect; head: Facing; size?: "single" }
  | {
      kind: "nightstand" | "stool" | "shoes" | "washer" | "fridge";
      at: Rect;
      face: Facing;
    }
  | {
      kind: "wardrobe" | "cabinet" | "tv" | "console" | "vanity" | "laundry";
      at: Rect;
      face: Facing;
    }
  | { kind: "sofa"; at: Rect; back: Facing }
  | { kind: "table" | "coffee" | "rug" | "island"; at: Rect }
  | { kind: "chair"; at: Rect; face: Facing }
  | {
      kind: "kitchen";
      at: Rect;
      face: Facing;
      sink: [number, number];
      hob: [number, number];
    }
  | { kind: "toilet"; at: Rect; face: Facing }
  | { kind: "shower"; at: Rect; head: [number, number] }
  | { kind: "plant" | "lamp"; at: Rect };
export type Interior = {
  /** The layout as the floor: covers the whole unit. */
  floor: string;
  width: number;
  depth: number;
  ceiling: number;
  /** The direction of north on the layout. */
  north: Facing;
  /** Solid walls, floor to ceiling. */
  walls: Rect[];
  /** Openings (doors, the entrance): wall above the door head only. */
  doors: Rect[];
  /** Full-height glass on the façade, and the balcony's sliding doors. */
  glass: Rect[];
  /** Glass railing (balcony) and shower screens: low or partial glass. */
  railings: Rect[];
  screens: [number, number, number, number][];
  /** Small windows (sill to head) set in a solid wall. */
  windows: Rect[];
  furniture: Furniture[];
  /** Where one can stand, by room: the room's name and a spot in it. */
  rooms: { name: string; at: [number, number]; look: Facing }[];
  /** Set by `placed`: the layout mirrored, for a unit drawn the other way. */
  flipX?: boolean;
  flipZ?: boolean;
};

/** A unit's 3D model and how its layout is turned to stand as the unit does. */
export type InteriorRef = { key: string; flip?: "x" | "z" | "xz" };

/**
 * The model mirrored as a unit on the other side of its tower: the same layout
 * read from the other end. North stays to the right, as on the floor plans.
 */
export function placed(ref: InteriorRef): Interior | undefined {
  const unit = INTERIORS[ref.key];
  if (!unit || !ref.flip) return unit;
  const fx = ref.flip.includes("x");
  const fz = ref.flip.includes("z");
  const W = unit.width;
  const D = unit.depth;
  const x = (v: number) => (fx ? W - v : v);
  const z = (v: number) => (fz ? D - v : v);
  const rect = ([x0, z0, x1, z1]: Rect): Rect => [
    Math.min(x(x0), x(x1)),
    Math.min(z(z0), z(z1)),
    Math.max(x(x0), x(x1)),
    Math.max(z(z0), z(z1)),
  ];
  const face = (f: Facing): Facing =>
    fx && (f === "-x" || f === "+x")
      ? f === "-x"
        ? "+x"
        : "-x"
      : fz && (f === "-z" || f === "+z")
        ? f === "-z"
          ? "+z"
          : "-z"
        : f;
  const span = (
    [a, b]: [number, number],
    along: (v: number) => number,
  ): [number, number] => {
    const [p, q] = [along(a), along(b)];
    return [Math.min(p, q), Math.max(p, q)];
  };
  const furniture = unit.furniture.map((f): Furniture => {
    const at = rect(f.at);
    switch (f.kind) {
      case "bed":
        return { ...f, at, head: face(f.head) };
      case "sofa":
        return { ...f, at, back: face(f.back) };
      case "shower":
        return { ...f, at, head: [x(f.head[0]), z(f.head[1])] };
      case "kitchen": {
        const along = f.face === "-z" || f.face === "+z" ? x : z;
        return {
          ...f,
          at,
          face: face(f.face),
          sink: span(f.sink, along),
          hob: span(f.hob, along),
        };
      }
      default:
        return "face" in f ? { ...f, at, face: face(f.face) } : { ...f, at };
    }
  });
  return {
    ...unit,
    walls: unit.walls.map(rect),
    doors: unit.doors.map(rect),
    glass: unit.glass.map(rect),
    railings: unit.railings.map(rect),
    windows: unit.windows.map(rect),
    screens: unit.screens.map(([a, b, c, d]) => [x(a), z(b), x(c), z(d)]),
    furniture,
    rooms: unit.rooms.map((r) => ({
      ...r,
      at: [x(r.at[0]), z(r.at[1])],
      look: face(r.look),
    })),
    flipX: fx,
    flipZ: fz,
  };
}

/**
 * Sun Ponte, 3PN 91.1 m² (T1, the river corner): three bedrooms, the master
 * with its own bathroom, a second bathroom, laundry, kitchen with an island,
 * dining for six, living room and balcony on the Hàn river.
 */
const PONTE_3PN_91: Interior = {
  floor: "/images/projects/sun-ponte-residence/can/3pn-91-t1-san.webp",
  width: 13.1,
  depth: 7.82,
  ceiling: 2.7,
  north: "+x",
  walls: [
    // outside walls (the façade is glass, z = 0)
    [0, 0, 0.15, 6.25],
    [0, 7.0, 0.15, 7.82],
    [12.95, 0, 13.1, 7.82],
    [0, 7.65, 10.95, 7.82],
    [11.95, 7.65, 13.1, 7.82],
    // columns on the façade, the shear wall of bedroom 3
    [2.95, 0, 3.33, 0.2],
    [6.1, 0, 6.45, 1.55],
    [9.68, 0, 10.0, 2.95],
    [12.9, 0, 12.95, 0.3],
    // bedroom 1 | bedroom 2, and bedroom 1 reaching under bedroom 2
    [3.24, 0.2, 3.33, 3.03],
    [3.24, 2.95, 4.2, 3.03],
    [4.13, 3.03, 4.2, 4.5],
    // bedroom 1's lower wall, its doors to the bathroom and the hall
    [0.15, 4.4, 2.0, 4.5],
    [2.8, 4.4, 3.3, 4.5],
    [4.05, 4.4, 4.13, 4.5],
    // bedroom 2's lower wall and its door; its wall to the living room
    [4.2, 4.4, 5.3, 4.5],
    [6.05, 4.4, 6.1, 4.5],
    [6.1, 1.55, 6.3, 4.5],
    // bedroom 3
    [9.68, 2.95, 9.78, 4.5],
    [9.68, 4.4, 9.95, 4.5],
    [10.75, 4.4, 12.95, 4.5],
    // master bathroom | laundry, and their wall to the kitchen
    [0.15, 6.05, 2.95, 6.2],
    [2.92, 4.5, 3.0, 6.2],
    [2.92, 7.0, 3.0, 7.65],
    // second bathroom
    [10.85, 4.5, 10.95, 5.1],
    [10.85, 5.85, 10.95, 6.1],
    [10.85, 6.0, 12.95, 6.1],
  ],
  doors: [
    [3.3, 4.4, 4.05, 4.5],
    [2.0, 4.4, 2.8, 4.5],
    [5.3, 4.4, 6.05, 4.5],
    [2.92, 6.2, 3.0, 7.0],
    [9.95, 4.4, 10.75, 4.5],
    [10.85, 5.1, 10.95, 5.85],
    [10.95, 7.65, 11.95, 7.82],
  ],
  glass: [
    [0.15, 0.04, 2.95, 0.1],
    [3.33, 0.04, 6.1, 0.1],
    [10.0, 0.04, 12.9, 0.1],
    [6.45, 1.47, 9.68, 1.53],
  ],
  railings: [[6.45, 0.04, 9.68, 0.1]],
  screens: [
    [0.92, 4.5, 0.92, 5.45],
    [11.75, 4.5, 12.15, 4.98],
    [12.15, 4.98, 12.95, 4.98],
  ],
  windows: [[0, 6.25, 0.15, 7.0]],
  furniture: [
    // bedroom 1 (master)
    { kind: "bed", at: [0.2, 0.8, 2.45, 2.55], head: "-x" },
    { kind: "nightstand", at: [0.18, 0.38, 0.6, 0.78], face: "+x" },
    { kind: "nightstand", at: [0.18, 2.6, 0.6, 3.0], face: "+x" },
    { kind: "stool", at: [1.2, 3.1, 1.5, 3.5], face: "-z" },
    { kind: "wardrobe", at: [0.15, 3.75, 1.95, 4.38], face: "-z" },
    { kind: "tv", at: [2.85, 0.8, 3.24, 2.55], face: "-x" },
    // bedroom 2
    { kind: "bed", at: [3.4, 0.8, 5.65, 2.55], head: "-x" },
    { kind: "nightstand", at: [3.36, 0.4, 3.8, 0.78], face: "+x" },
    { kind: "nightstand", at: [3.36, 2.58, 3.8, 2.92], face: "+x" },
    { kind: "tv", at: [5.85, 0.75, 6.1, 2.5], face: "-x" },
    { kind: "wardrobe", at: [4.3, 3.05, 4.95, 4.38], face: "+x" },
    // bedroom 3
    { kind: "bed", at: [10.85, 0.85, 12.9, 2.45], head: "+x" },
    { kind: "nightstand", at: [12.52, 0.42, 12.94, 0.82], face: "-x" },
    { kind: "nightstand", at: [12.52, 2.48, 12.94, 2.88], face: "-x" },
    { kind: "stool", at: [11.95, 2.75, 12.25, 3.1], face: "-z" },
    { kind: "wardrobe", at: [10.85, 3.45, 12.95, 4.05], face: "-z" },
    { kind: "tv", at: [10.0, 1.05, 10.2, 2.25], face: "+x" },
    // living room
    { kind: "rug", at: [6.9, 2.5, 9.0, 4.3] },
    { kind: "sofa", at: [7.9, 1.95, 9.6, 2.6], back: "-z" },
    { kind: "sofa", at: [8.95, 2.6, 9.6, 4.15], back: "+x" },
    { kind: "coffee", at: [7.4, 3.05, 8.2, 3.85] },
    { kind: "console", at: [6.3, 2.6, 6.72, 3.9], face: "+x" },
    { kind: "plant", at: [6.45, 1.65, 6.85, 2.05] },
    { kind: "lamp", at: [9.25, 1.7, 9.55, 2.0] },
    // balcony
    { kind: "plant", at: [6.6, 0.25, 7.0, 0.65] },
    { kind: "chair", at: [8.6, 0.45, 9.1, 0.95], face: "-x" },
    { kind: "chair", at: [7.5, 0.45, 8.0, 0.95], face: "+x" },
    // dining for six
    { kind: "table", at: [7.95, 5.8, 8.85, 7.6] },
    { kind: "chair", at: [7.55, 5.95, 7.95, 6.35], face: "+x" },
    { kind: "chair", at: [7.55, 6.5, 7.95, 6.9], face: "+x" },
    { kind: "chair", at: [7.55, 7.05, 7.95, 7.45], face: "+x" },
    { kind: "chair", at: [8.85, 5.95, 9.25, 6.35], face: "-x" },
    { kind: "chair", at: [8.85, 6.5, 9.25, 6.9], face: "-x" },
    { kind: "chair", at: [8.85, 7.05, 9.25, 7.45], face: "-x" },
    // kitchen
    {
      kind: "kitchen",
      at: [3.0, 7.0, 6.05, 7.65],
      face: "-z",
      sink: [4.1, 4.75],
      hob: [5.4, 6.0],
    },
    { kind: "fridge", at: [6.05, 6.95, 6.75, 7.65], face: "-z" },
    { kind: "island", at: [4.4, 5.55, 6.75, 6.12] },
    { kind: "stool", at: [4.7, 5.12, 5.05, 5.47], face: "+z" },
    { kind: "stool", at: [5.4, 5.12, 5.75, 5.47], face: "+z" },
    { kind: "stool", at: [6.1, 5.12, 6.45, 5.47], face: "+z" },
    // master bathroom
    { kind: "shower", at: [0.15, 4.5, 0.92, 5.45], head: [0.15, 4.95] },
    { kind: "cabinet", at: [0.15, 5.45, 0.95, 6.05], face: "+x" },
    { kind: "toilet", at: [1.25, 5.3, 1.65, 6.02], face: "-z" },
    { kind: "vanity", at: [2.0, 5.55, 2.88, 6.05], face: "-z" },
    // laundry
    { kind: "laundry", at: [0.15, 6.25, 0.55, 6.95], face: "+x" },
    { kind: "washer", at: [0.15, 7.0, 0.78, 7.62], face: "+x" },
    // second bathroom
    { kind: "toilet", at: [11.2, 4.52, 11.6, 5.1], face: "+z" },
    { kind: "shower", at: [11.75, 4.5, 12.95, 4.98], head: [12.3, 4.5] },
    { kind: "vanity", at: [12.45, 5.05, 12.95, 5.95], face: "-x" },
    // entrance
    { kind: "shoes", at: [12.1, 6.12, 12.45, 7.6], face: "-x" },
    { kind: "cabinet", at: [12.55, 6.12, 12.95, 7.6], face: "-x" },
  ],
  rooms: [
    { name: "Phòng khách", at: [7.4, 4.3], look: "-z" },
    { name: "Ban công", at: [8.1, 1.0], look: "-z" },
    { name: "Bếp và bàn ăn", at: [7.0, 5.0], look: "+z" },
    { name: "Phòng ngủ 1", at: [2.0, 3.4], look: "-z" },
    { name: "Phòng ngủ 2", at: [5.2, 3.5], look: "-z" },
    { name: "Phòng ngủ 3", at: [10.5, 3.2], look: "-z" },
    { name: "WC phòng ngủ 1", at: [1.8, 4.9], look: "+z" },
    { name: "WC chung", at: [11.4, 5.5], look: "+x" },
    { name: "Lối vào", at: [11.4, 7.1], look: "-x" },
  ],
};

/**
 * Sun Ponte, Dual Key 92.2 m² (T1's south-east corner; T2's mirrored): a two
 * bedroom unit and a studio with its own kitchenette and bathroom, both off
 * one entrance hall.
 */
const PONTE_DK_92: Interior = {
  floor: "/images/projects/sun-ponte-residence/can/dk-92-san.webp",
  width: 11.98,
  depth: 9.9,
  ceiling: 2.7,
  north: "+x",
  walls: [
    // outside: the core side (top), the entrance hall, the studio's side
    [0, 0, 2.95, 0.3],
    [2.95, 0.05, 8.45, 0.2],
    [8.55, 0.05, 11.98, 0.25],
    [8.45, 0.2, 8.55, 0.55],
    [8.45, 1.55, 8.55, 1.75],
    [11.85, 0.25, 11.98, 0.55],
    [11.85, 1.55, 11.98, 2.3],
    [9.75, 2.15, 11.98, 2.3],
    [9.75, 2.15, 9.95, 9.9],
    // the south side: living room glass, then wall by the laundry
    [0, 3.3, 0.15, 3.5],
    [0, 6.4, 0.3, 9.9],
    // the east side, between the bedrooms' windows
    [2.75, 9.8, 3.3, 9.9],
    [5.85, 9.8, 6.3, 9.9],
    [9.4, 9.8, 9.95, 9.9],
    // laundry
    [0.15, 3.35, 1.65, 3.5],
    [1.5, 4.85, 1.65, 6.45],
    // bedrooms
    [0.15, 6.4, 2.15, 6.5],
    [2.95, 6.4, 3.1, 6.5],
    [3.85, 6.4, 4.25, 6.5],
    [2.95, 6.5, 3.05, 9.8],
    // bathroom 1 (off the dining room)
    [4.15, 4.05, 5.95, 4.15],
    [4.15, 4.15, 4.25, 5.05],
    [4.15, 5.95, 4.25, 6.5],
    [4.25, 6.15, 5.95, 6.25],
    // the wall between the two keys
    [5.95, 1.75, 6.05, 9.8],
    // bathroom 2, the store, the studio's bathroom
    [6.0, 1.75, 6.95, 1.85],
    [7.55, 1.75, 8.65, 1.85],
    [7.9, 1.85, 8.0, 5.05],
    [6.05, 4.15, 7.9, 4.25],
    [6.05, 5.95, 8.0, 6.05],
  ],
  doors: [
    [11.85, 0.55, 11.98, 1.55],
    [8.45, 0.55, 8.55, 1.55],
    [8.65, 1.75, 9.75, 1.85],
    [6.95, 1.75, 7.55, 1.85],
    [4.15, 5.05, 4.25, 5.95],
    [7.9, 5.05, 8.0, 5.95],
    [2.15, 6.4, 2.95, 6.5],
    [3.1, 6.4, 3.85, 6.5],
  ],
  glass: [
    [0.02, 0.3, 0.1, 3.3],
    [0.3, 9.82, 2.75, 9.88],
    [3.3, 9.82, 5.85, 9.88],
    [6.3, 9.82, 9.4, 9.88],
    [1.55, 3.55, 1.6, 4.85],
  ],
  railings: [],
  screens: [
    [5.1, 4.15, 5.1, 5.0],
    [6.95, 2.8, 6.95, 3.85],
    [6.95, 4.25, 6.95, 5.0],
  ],
  windows: [[0, 3.5, 0.15, 6.4]],
  furniture: [
    // living room
    { kind: "rug", at: [0.9, 1.0, 3.0, 2.7] },
    { kind: "console", at: [0.4, 0.32, 3.0, 0.65], face: "+z" },
    { kind: "sofa", at: [0.4, 2.65, 3.0, 3.3], back: "+z" },
    { kind: "sofa", at: [0.4, 1.95, 1.0, 2.65], back: "-x" },
    { kind: "coffee", at: [1.55, 1.2, 2.35, 1.95] },
    { kind: "plant", at: [3.3, 0.4, 3.7, 0.8] },
    // dining for four
    { kind: "table", at: [2.85, 4.45, 4.0, 5.15] },
    { kind: "chair", at: [2.95, 4.0, 3.4, 4.45], face: "+z" },
    { kind: "chair", at: [3.5, 4.0, 3.95, 4.45], face: "+z" },
    { kind: "chair", at: [2.95, 5.15, 3.4, 5.6], face: "-z" },
    { kind: "chair", at: [3.5, 5.15, 3.95, 5.6], face: "-z" },
    // kitchen
    {
      kind: "kitchen",
      at: [5.25, 1.75, 5.9, 4.05],
      face: "-x",
      sink: [2.1, 2.6],
      hob: [3.05, 3.55],
    },
    { kind: "fridge", at: [4.05, 3.45, 4.65, 4.05], face: "-z" },
    // laundry
    { kind: "laundry", at: [0.15, 5.25, 0.55, 6.0], face: "+x" },
    { kind: "washer", at: [0.65, 5.1, 1.25, 5.7], face: "+z" },
    // bathroom 1
    { kind: "vanity", at: [4.25, 4.15, 5.1, 4.5], face: "+z" },
    { kind: "toilet", at: [5.35, 5.25, 5.95, 5.85], face: "-x" },
    { kind: "shower", at: [5.1, 4.15, 5.95, 5.0], head: [5.95, 4.55] },
    // bedroom 1
    { kind: "wardrobe", at: [0.3, 6.5, 2.0, 7.05], face: "+z" },
    { kind: "bed", at: [0.3, 7.6, 2.3, 9.25], head: "-x" },
    { kind: "nightstand", at: [0.3, 7.12, 0.72, 7.52], face: "+x" },
    { kind: "nightstand", at: [0.3, 9.3, 0.72, 9.7], face: "+x" },
    { kind: "tv", at: [2.72, 7.55, 2.95, 9.5], face: "-x" },
    // bedroom 2
    { kind: "bed", at: [4.1, 7.95, 5.85, 9.6], head: "+x" },
    { kind: "wardrobe", at: [5.4, 6.5, 5.95, 7.65], face: "-x" },
    { kind: "tv", at: [3.05, 7.95, 3.3, 9.6], face: "+x" },
    { kind: "stool", at: [3.6, 7.0, 3.9, 7.3], face: "-z" },
    // bathroom 2
    { kind: "toilet", at: [6.05, 1.9, 6.65, 2.4], face: "+x" },
    { kind: "shower", at: [6.05, 2.8, 6.95, 3.85], head: [6.05, 3.3] },
    { kind: "vanity", at: [7.0, 3.2, 7.9, 3.8], face: "-z" },
    { kind: "cabinet", at: [6.05, 3.85, 7.9, 4.15], face: "-z" },
    // the studio: kitchenette, bathroom, bedroom
    {
      kind: "kitchen",
      at: [8.0, 1.9, 8.55, 4.25],
      face: "+x",
      sink: [3.3, 3.8],
      hob: [2.6, 2.95],
    },
    { kind: "fridge", at: [8.0, 4.25, 8.55, 5.05], face: "+x" },
    { kind: "vanity", at: [7.0, 4.25, 7.9, 4.6], face: "+z" },
    { kind: "toilet", at: [6.05, 5.35, 6.55, 5.92], face: "+x" },
    { kind: "shower", at: [6.05, 4.25, 6.95, 5.0], head: [6.05, 4.65] },
    { kind: "wardrobe", at: [6.05, 6.05, 7.6, 6.6], face: "+z" },
    { kind: "bed", at: [6.1, 8.0, 8.05, 9.6], head: "-x" },
    { kind: "stool", at: [6.55, 7.4, 6.85, 7.7], face: "-z" },
    { kind: "tv", at: [9.4, 8.0, 9.75, 9.6], face: "-x" },
    { kind: "chair", at: [8.95, 6.0, 9.6, 6.5], face: "-x" },
    { kind: "chair", at: [8.95, 6.65, 9.6, 7.15], face: "-x" },
    // entrance hall
    { kind: "shoes", at: [9.95, 1.75, 11.8, 2.15], face: "-z" },
  ],
  rooms: [
    { name: "Phòng khách", at: [2.4, 2.2], look: "-x" },
    { name: "Bếp và bàn ăn", at: [4.6, 3.0], look: "+x" },
    { name: "Lô gia giặt phơi", at: [0.9, 4.5], look: "-x" },
    { name: "Phòng ngủ 1", at: [2.45, 7.35], look: "+z" },
    { name: "Phòng ngủ 2", at: [3.6, 7.6], look: "+z" },
    { name: "WC 1", at: [4.7, 5.5], look: "+x" },
    { name: "WC 2", at: [7.4, 2.4], look: "-x" },
    { name: "Sảnh vào", at: [10.2, 1.0], look: "-x" },
    { name: "Căn studio", at: [8.6, 7.4], look: "+z" },
    { name: "Bếp căn studio", at: [9.1, 3.4], look: "-x" },
    { name: "WC căn studio", at: [7.45, 5.4], look: "-x" },
  ],
};

/**
 * Sun Ponte, 2PN 70.8 m² (T2's north side; T1's south side mirrored): living
 * room and kitchen, two bedrooms on the glass side, a laundry loggia and two
 * bathrooms, one of them bedroom 2's own.
 */
const PONTE_2PN_70: Interior = {
  floor: "/images/projects/sun-ponte-residence/can/2pn-70-san.webp",
  width: 10.5,
  depth: 7.8,
  ceiling: 2.7,
  north: "+x",
  walls: [
    [0, 0, 10.4, 0.2],
    [0, 0.2, 0.2, 0.7],
    [0, 1.75, 0.2, 2.0],
    [0, 2.0, 0.85, 2.25],
    [0.45, 2.25, 0.85, 7.8],
    [0.85, 7.62, 7.4, 7.8],
    [7.4, 7.62, 10.4, 7.8],
    [7.4, 2.0, 10.4, 2.3],
    [10.15, 4.75, 10.4, 5.0],
    // loggia
    [7.35, 0.2, 7.45, 1.0],
    [7.35, 1.75, 7.45, 2.0],
    // bedrooms
    [6.25, 2.0, 6.35, 3.95],
    [6.25, 4.7, 6.35, 4.9],
    [6.25, 5.95, 6.35, 7.62],
    [6.35, 4.78, 10.15, 4.9],
    // bathrooms
    [0.85, 6.05, 2.65, 6.15],
    [3.4, 6.05, 6.25, 6.15],
    [3.45, 6.15, 3.55, 7.62],
  ],
  doors: [
    [0, 0.7, 0.2, 1.75],
    [7.35, 1.0, 7.45, 1.75],
    [6.25, 3.95, 6.35, 4.7],
    [6.25, 4.9, 6.35, 5.95],
    [2.65, 6.05, 3.4, 6.15],
    [6.25, 6.25, 6.35, 6.95],
  ],
  glass: [
    [10.22, 2.3, 10.3, 4.75],
    [10.22, 5.0, 10.3, 7.62],
  ],
  railings: [[10.22, 0.2, 10.3, 2.0]],
  screens: [
    [1.75, 6.15, 1.75, 7.1],
    [4.5, 6.15, 4.5, 7.1],
  ],
  windows: [],
  furniture: [
    // entrance, living room
    { kind: "shoes", at: [0.25, 0.22, 1.4, 0.55], face: "+z" },
    { kind: "console", at: [3.4, 0.22, 5.65, 0.55], face: "+z" },
    { kind: "rug", at: [3.3, 0.8, 5.7, 2.1] },
    { kind: "coffee", at: [4.0, 0.95, 4.85, 1.7] },
    { kind: "sofa", at: [3.4, 2.15, 5.6, 2.95], back: "+z" },
    { kind: "plant", at: [5.8, 0.35, 6.2, 0.75] },
    // kitchen and dining
    {
      kind: "kitchen",
      at: [0.85, 2.0, 1.4, 5.05],
      face: "+x",
      sink: [3.8, 4.5],
      hob: [2.45, 3.15],
    },
    { kind: "fridge", at: [0.85, 5.05, 1.55, 6.0], face: "+x" },
    { kind: "table", at: [4.0, 5.0, 4.8, 6.05] },
    { kind: "chair", at: [3.6, 5.05, 4.0, 5.45], face: "+x" },
    { kind: "chair", at: [3.6, 5.6, 4.0, 6.0], face: "+x" },
    { kind: "chair", at: [4.8, 5.05, 5.2, 5.45], face: "-x" },
    { kind: "chair", at: [4.8, 5.6, 5.2, 6.0], face: "-x" },
    // loggia
    { kind: "washer", at: [9.55, 0.25, 10.15, 0.85], face: "+z" },
    { kind: "cabinet", at: [7.45, 1.75, 8.1, 2.0], face: "-z" },
    { kind: "plant", at: [8.0, 0.3, 8.4, 0.7] },
    // bedroom 1
    { kind: "wardrobe", at: [6.35, 2.3, 7.0, 3.9], face: "+x" },
    { kind: "bed", at: [7.95, 2.3, 9.5, 4.05], head: "-z" },
    { kind: "nightstand", at: [7.45, 2.32, 7.9, 2.72], face: "+z" },
    { kind: "nightstand", at: [9.55, 2.32, 10.0, 2.72], face: "+z" },
    { kind: "tv", at: [8.15, 4.58, 9.3, 4.78], face: "-z" },
    // bedroom 2
    { kind: "bed", at: [7.95, 5.8, 9.5, 7.6], head: "+z" },
    { kind: "nightstand", at: [9.55, 7.2, 10.0, 7.6], face: "-z" },
    { kind: "wardrobe", at: [6.35, 7.05, 7.9, 7.62], face: "-z" },
    { kind: "tv", at: [8.15, 4.9, 9.3, 5.1], face: "+z" },
    // bathrooms
    { kind: "shower", at: [0.85, 6.15, 1.75, 7.1], head: [0.85, 6.6] },
    { kind: "cabinet", at: [0.85, 7.25, 1.65, 7.62], face: "-z" },
    { kind: "toilet", at: [2.0, 7.05, 2.4, 7.62], face: "-z" },
    { kind: "vanity", at: [2.6, 7.2, 3.45, 7.62], face: "-z" },
    { kind: "shower", at: [3.55, 6.15, 4.5, 7.1], head: [3.55, 6.6] },
    { kind: "cabinet", at: [3.6, 7.25, 4.4, 7.62], face: "-z" },
    { kind: "toilet", at: [4.75, 7.05, 5.15, 7.62], face: "-z" },
    { kind: "vanity", at: [5.35, 7.2, 6.2, 7.62], face: "-z" },
  ],
  rooms: [
    { name: "Phòng khách", at: [4.5, 3.7], look: "-z" },
    { name: "Bếp và bàn ăn", at: [2.6, 4.2], look: "-x" },
    { name: "Phòng ngủ 1", at: [7.3, 4.25], look: "+x" },
    { name: "Phòng ngủ 2", at: [7.3, 5.5], look: "+x" },
    { name: "Lô gia giặt phơi", at: [8.6, 1.2], look: "+x" },
    { name: "WC 1", at: [3.0, 6.6], look: "+z" },
    { name: "WC phòng ngủ 2", at: [5.0, 6.6], look: "+z" },
    { name: "Lối vào", at: [0.7, 1.25], look: "+x" },
  ],
};

/**
 * Sun Ponte, 3PN 91.1 m² (T2, the river corner): three bedrooms on the glass
 * side, the master with its own bathroom, a shared bathroom by the entrance,
 * a balcony off the living room, kitchen with an island, and a laundry room.
 */
const PONTE_3PN_91_T2: Interior = {
  floor: "/images/projects/sun-ponte-residence/can/3pn-91-t2-san.webp",
  width: 13.1,
  depth: 7.8,
  ceiling: 2.7,
  north: "+x",
  walls: [
    // façade and outer walls
    [0, 0, 0.4, 0.22],
    [2.97, 0, 3.11, 0.22],
    [6.62, 0, 7.0, 0.22],
    [9.47, 0, 10.05, 0.22],
    [12.69, 0, 12.82, 0.22],
    [0, 0.22, 0.21, 7.62],
    [0, 7.62, 1.1, 7.8],
    [2.15, 7.62, 13.1, 7.8],
    [12.82, 0, 13.1, 2.95],
    [12.92, 2.95, 13.1, 6.2],
    [13.04, 6.2, 13.1, 7.62],
    // balcony
    [3.11, 0, 3.42, 3.05],
    [3.42, 1.4, 3.93, 1.6],
    [6.1, 1.4, 6.62, 1.6],
    [6.62, 0.22, 6.82, 1.6],
    [6.72, 1.6, 6.82, 4.5],
    // bedroom 3 and the shared bathroom
    [3.3, 3.05, 3.42, 4.4],
    [3.15, 4.4, 3.42, 4.5],
    [0.21, 4.1, 2.23, 4.2],
    [2.12, 4.2, 2.23, 5.08],
    [2.12, 5.95, 2.23, 6.0],
    [0.21, 6.0, 2.23, 6.11],
    [0.21, 6.11, 0.61, 7.62],
    // bedrooms 2 and 1
    [7.8, 4.4, 8.86, 4.5],
    [8.76, 2.95, 8.86, 4.4],
    [8.76, 2.95, 9.82, 3.05],
    [9.71, 0.22, 9.82, 2.95],
    [9.85, 4.4, 10.17, 4.5],
    [11.03, 4.4, 12.92, 4.55],
    // master bathroom, laundry
    [10.06, 4.5, 10.17, 6.2],
    [10.06, 6.04, 12.92, 6.19],
    [12.0, 5.4, 12.92, 6.04],
    [10.06, 7.0, 10.17, 7.62],
  ],
  doors: [
    [1.1, 7.62, 2.15, 7.8],
    [2.3, 4.4, 3.15, 4.5],
    [2.12, 5.08, 2.23, 5.95],
    [6.82, 4.4, 7.8, 4.5],
    [8.86, 4.4, 9.85, 4.5],
    [10.17, 4.4, 11.03, 4.55],
    [10.06, 6.2, 10.17, 7.0],
  ],
  glass: [
    [0.4, 0.05, 2.97, 0.18],
    [7.0, 0.05, 9.47, 0.18],
    [10.05, 0.05, 12.69, 0.18],
    [3.93, 1.42, 6.1, 1.5],
    [12.96, 6.2, 13.04, 7.62],
  ],
  railings: [[3.42, 0.03, 6.62, 0.1]],
  screens: [[1.3, 4.2, 0.75, 5.08]],
  windows: [],
  furniture: [
    // living room
    { kind: "sofa", at: [3.45, 2.05, 4.2, 4.2], back: "-x" },
    { kind: "sofa", at: [4.2, 2.05, 4.82, 2.66], back: "-z" },
    { kind: "coffee", at: [4.86, 3.05, 5.67, 3.86] },
    { kind: "rug", at: [4.3, 2.75, 6.2, 4.15] },
    { kind: "tv", at: [6.6, 2.6, 6.72, 3.7], face: "-x" },
    { kind: "plant", at: [3.5, 1.65, 3.9, 2.0] },
    // balcony
    { kind: "chair", at: [4.3, 0.5, 4.8, 1.0], face: "+x" },
    { kind: "chair", at: [5.3, 0.5, 5.8, 1.0], face: "-x" },
    { kind: "plant", at: [6.1, 0.2, 6.5, 0.6] },
    // dining and kitchen
    { kind: "table", at: [4.45, 5.85, 4.97, 7.6] },
    { kind: "chair", at: [4.02, 5.93, 4.46, 6.39], face: "+x" },
    { kind: "chair", at: [4.02, 6.49, 4.46, 6.97], face: "+x" },
    { kind: "chair", at: [4.02, 7.09, 4.46, 7.57], face: "+x" },
    { kind: "chair", at: [4.96, 5.93, 5.42, 6.39], face: "-x" },
    { kind: "chair", at: [4.96, 6.49, 5.42, 6.97], face: "-x" },
    { kind: "chair", at: [4.96, 7.09, 5.42, 7.57], face: "-x" },
    { kind: "island", at: [6.22, 5.56, 8.96, 6.16] },
    { kind: "fridge", at: [6.22, 6.95, 7.15, 7.62], face: "-z" },
    {
      kind: "kitchen",
      at: [7.15, 7.02, 10.06, 7.62],
      face: "-z",
      sink: [8.86, 9.56],
      hob: [7.66, 8.36],
    },
    // entrance
    { kind: "shoes", at: [0.62, 6.12, 0.96, 7.6], face: "+x" },
    // bedroom 3
    { kind: "bed", at: [0.22, 0.9, 2.22, 2.51], head: "-x" },
    { kind: "wardrobe", at: [0.21, 0.45, 0.65, 1.0], face: "+x" },
    { kind: "wardrobe", at: [0.21, 2.5, 0.65, 3.5], face: "+x" },
    { kind: "stool", at: [0.76, 2.75, 1.07, 3.15], face: "-x" },
    { kind: "wardrobe", at: [0.21, 3.5, 2.22, 4.1], face: "-z" },
    { kind: "tv", at: [3.0, 1.0, 3.11, 2.4], face: "-x" },
    // bedroom 2
    { kind: "bed", at: [7.7, 0.9, 9.7, 2.51], head: "+x" },
    { kind: "nightstand", at: [9.27, 0.45, 9.7, 0.88], face: "-x" },
    { kind: "nightstand", at: [9.27, 2.52, 9.7, 2.94], face: "-x" },
    { kind: "wardrobe", at: [6.82, 0.45, 7.11, 2.06], face: "+x" },
    { kind: "wardrobe", at: [8.16, 2.98, 8.76, 4.4], face: "-x" },
    // bedroom 1
    { kind: "bed", at: [10.82, 0.9, 12.75, 2.5], head: "+x" },
    { kind: "nightstand", at: [12.36, 0.45, 12.82, 0.88], face: "-x" },
    { kind: "cabinet", at: [12.36, 2.55, 12.85, 3.8], face: "-x" },
    { kind: "stool", at: [11.96, 2.97, 12.26, 3.37], face: "+x" },
    { kind: "wardrobe", at: [9.82, 0.9, 10.12, 2.51], face: "+x" },
    { kind: "wardrobe", at: [11.13, 3.81, 12.9, 4.4], face: "-z" },
    // shared bathroom
    { kind: "shower", at: [0.21, 4.2, 1.3, 5.08], head: [0.68, 4.2] },
    { kind: "toilet", at: [1.49, 4.22, 1.91, 4.95], face: "+z" },
    { kind: "vanity", at: [0.23, 5.08, 0.65, 5.98], face: "+x" },
    // master bathroom
    { kind: "vanity", at: [10.17, 5.62, 11.09, 6.04], face: "-z" },
    { kind: "toilet", at: [11.33, 5.3, 11.8, 6.04], face: "-z" },
    { kind: "shower", at: [12.0, 4.55, 12.92, 5.4], head: [12.45, 5.4] },
    // laundry
    { kind: "washer", at: [12.29, 6.99, 12.9, 7.6], face: "-x" },
    { kind: "laundry", at: [11.25, 7.3, 11.9, 7.62], face: "-z" },
  ],
  rooms: [
    { name: "Phòng khách", at: [5.4, 4.6], look: "-z" },
    { name: "Ban công", at: [5.0, 1.8], look: "-z" },
    { name: "Bếp và bàn ăn", at: [7.6, 6.6], look: "+z" },
    { name: "Phòng ngủ 1", at: [10.5, 3.6], look: "-z" },
    { name: "Phòng ngủ 2", at: [7.4, 3.5], look: "-z" },
    { name: "Phòng ngủ 3", at: [2.7, 3.4], look: "-z" },
    { name: "WC phòng ngủ 1", at: [11.0, 5.0], look: "+x" },
    { name: "WC chung", at: [1.6, 5.5], look: "-z" },
    { name: "Lô gia giặt phơi", at: [10.8, 6.8], look: "+x" },
    { name: "Lối vào", at: [1.6, 7.0], look: "-z" },
  ],
};

/**
 * Sun Ponte, 2PN 77.1 m² (T2's south end): living room with a balcony on the
 * river, bedroom 1 and its bathroom beside it, a shared bathroom, a galley
 * kitchen, a laundry room and bedroom 2 at the back on the south glass.
 */
const PONTE_2PN_77: Interior = {
  floor: "/images/projects/sun-ponte-residence/can/2pn-77-san.webp",
  width: 7.5,
  depth: 12.7,
  ceiling: 2.7,
  north: "+x",
  walls: [
    // façade and outer walls
    [0, 0, 0.28, 3.04],
    [0.28, 0, 0.48, 0.22],
    [3.38, 0, 3.8, 0.22],
    [3.57, 0.22, 3.8, 1.6],
    [7.17, 0, 7.47, 3.04],
    [7.17, 3.04, 7.37, 8.2],
    [7.17, 9.2, 7.37, 9.95],
    [0, 3.04, 0.18, 5.47],
    [0, 6.36, 0.18, 7.85],
    [0, 9.62, 1.79, 9.97],
    [0, 9.97, 0.12, 10.05],
    [0, 12.5, 5.08, 12.7],
    [4.68, 9.65, 7.37, 9.95],
    [4.68, 9.95, 5.08, 12.5],
    // balcony
    [3.7, 1.38, 4.35, 1.6],
    [6.55, 1.38, 7.17, 1.6],
    // bedroom 1, bathrooms
    [3.58, 1.6, 3.7, 4.4],
    [0.15, 4.36, 2.14, 4.49],
    [2.14, 4.36, 2.24, 4.5],
    [1.66, 5.38, 3.7, 5.5],
    [3.58, 5.38, 3.7, 6.45],
    [1.66, 5.5, 1.79, 7.35],
    [0.18, 7.35, 3.75, 7.45],
    // laundry, kitchen, bedroom 2
    [1.66, 7.45, 1.79, 7.95],
    [1.66, 8.85, 1.79, 9.62],
    [1.79, 9.67, 3.7, 9.8],
  ],
  doors: [
    [7.17, 8.2, 7.37, 9.2],
    [3.58, 4.4, 3.7, 5.3],
    [2.1, 4.5, 2.2, 5.38],
    [3.58, 6.45, 3.7, 7.3],
    [1.66, 7.95, 1.79, 8.85],
    [3.7, 9.67, 4.68, 9.8],
  ],
  glass: [
    [0.48, 0.05, 3.38, 0.18],
    [4.35, 1.4, 6.55, 1.48],
    [0, 7.85, 0.12, 9.62],
    [0, 10.05, 0.12, 12.5],
  ],
  railings: [[3.8, 0.03, 7.17, 0.1]],
  screens: [
    [0.18, 6.33, 1.66, 6.33],
    [2.67, 5.5, 2.24, 6.44],
  ],
  windows: [[0, 5.47, 0.18, 6.36]],
  furniture: [
    // living room
    { kind: "sofa", at: [6.34, 1.81, 7.17, 4.21], back: "+x" },
    { kind: "sofa", at: [5.13, 1.81, 6.34, 2.54], back: "-z" },
    { kind: "coffee", at: [4.73, 2.97, 5.74, 4.0] },
    { kind: "rug", at: [4.3, 2.7, 6.3, 4.25] },
    { kind: "coffee", at: [4.6, 4.3, 5.3, 5.0] },
    { kind: "tv", at: [3.7, 1.9, 3.85, 4.1], face: "+x" },
    // balcony
    { kind: "chair", at: [4.6, 0.5, 5.1, 1.0], face: "+x" },
    { kind: "chair", at: [5.6, 0.5, 6.1, 1.0], face: "-x" },
    { kind: "plant", at: [6.6, 0.2, 7.0, 0.6] },
    // dining
    { kind: "table", at: [5.99, 5.53, 7.17, 6.33] },
    { kind: "chair", at: [6.04, 5.1, 6.52, 5.53], face: "+z" },
    { kind: "chair", at: [6.62, 5.1, 7.1, 5.53], face: "+z" },
    { kind: "chair", at: [6.04, 6.33, 6.52, 6.76], face: "-z" },
    { kind: "chair", at: [6.62, 6.33, 7.1, 6.76], face: "-z" },
    // kitchen
    {
      kind: "kitchen",
      at: [1.79, 7.45, 3.73, 8.03],
      face: "+z",
      sink: [2.4, 3.1],
      hob: [1.79, 1.79],
    },
    { kind: "fridge", at: [3.75, 7.4, 4.83, 8.2], face: "+z" },
    {
      kind: "kitchen",
      at: [1.79, 9.04, 3.68, 9.62],
      face: "-z",
      sink: [1.79, 1.79],
      hob: [2.45, 3.15],
    },
    // entrance
    { kind: "shoes", at: [5.99, 9.33, 7.17, 9.65], face: "-z" },
    // bedroom 1
    { kind: "bed", at: [0.28, 1.23, 2.3, 3.04], head: "-x" },
    { kind: "nightstand", at: [0.28, 0.75, 0.73, 1.2], face: "+x" },
    { kind: "nightstand", at: [0.2, 3.07, 0.73, 3.5], face: "+x" },
    { kind: "wardrobe", at: [3.19, 0.43, 3.58, 3.04], face: "-x" },
    { kind: "wardrobe", at: [0.15, 3.8, 2.14, 4.36], face: "-z" },
    // bedroom 1's bathroom
    { kind: "vanity", at: [0.18, 4.52, 0.6, 5.43], face: "+x" },
    { kind: "toilet", at: [0.2, 5.65, 0.93, 6.08], face: "+x" },
    { kind: "shower", at: [0.18, 6.33, 1.66, 7.35], head: [0.18, 6.8] },
    // shared bathroom
    { kind: "toilet", at: [2.87, 5.53, 3.33, 6.23], face: "+z" },
    { kind: "vanity", at: [1.79, 6.44, 2.22, 7.35], face: "+x" },
    { kind: "shower", at: [1.79, 5.5, 2.67, 6.44], head: [1.79, 5.95] },
    // laundry
    { kind: "cabinet", at: [0.18, 7.45, 1.66, 7.75], face: "+z" },
    { kind: "washer", at: [1.03, 9.0, 1.64, 9.6], face: "-z" },
    { kind: "laundry", at: [0.18, 8.6, 0.6, 9.5], face: "+x" },
    // bedroom 2
    { kind: "bed", at: [1.54, 10.66, 3.13, 12.5], head: "+z" },
    { kind: "nightstand", at: [1.05, 12.08, 1.5, 12.5], face: "-z" },
    { kind: "nightstand", at: [3.17, 12.08, 3.62, 12.5], face: "-z" },
    { kind: "wardrobe", at: [4.08, 10.8, 4.68, 12.5], face: "-x" },
    { kind: "tv", at: [1.85, 9.8, 3.0, 9.9], face: "+z" },
  ],
  rooms: [
    { name: "Phòng khách", at: [5.2, 6.8], look: "-z" },
    { name: "Ban công", at: [5.5, 1.75], look: "-z" },
    { name: "Bếp và bàn ăn", at: [3.0, 8.55], look: "-z" },
    { name: "Phòng ngủ 1", at: [2.9, 3.9], look: "-z" },
    { name: "Phòng ngủ 2", at: [3.9, 10.4], look: "+z" },
    { name: "WC phòng ngủ 1", at: [1.3, 5.2], look: "+z" },
    { name: "WC chung", at: [2.9, 6.9], look: "-z" },
    { name: "Lô gia giặt phơi", at: [1.0, 8.2], look: "+z" },
    { name: "Lối vào", at: [6.6, 8.7], look: "-x" },
  ],
};

/**
 * Sun Ponte, 1PN+ 52.8 m² (T2's east side): kitchen and dining by the door,
 * living room and balcony, a flexible room open to the living room, the
 * bedroom on the glass, a bathroom and a laundry loggia.
 */
const PONTE_1PN_1_52: Interior = {
  floor: "/images/projects/sun-ponte-residence/can/1pn-1-52-san.webp",
  width: 7.73,
  depth: 7.8,
  ceiling: 2.7,
  north: "+x",
  walls: [
    // outer walls
    [0, 0, 3.03, 0.25],
    [4.05, 0, 7.63, 0.25],
    [0, 0.25, 0.18, 4.82],
    [0, 4.82, 0.28, 7.8],
    [7.44, 0.25, 7.63, 4.82],
    [7.43, 4.82, 7.73, 7.8],
    [4.25, 7.72, 4.46, 7.8],
    [7.29, 7.72, 7.43, 7.8],
    // balcony and laundry
    [0.28, 6.26, 0.38, 6.46],
    [2.56, 6.26, 4.25, 6.46],
    [2.79, 7.12, 2.88, 7.8],
    [4.05, 6.46, 4.25, 7.8],
    // bathroom
    [4.6, 0.25, 4.71, 1.89],
    [4.71, 1.78, 4.8, 1.89],
    [5.59, 1.78, 7.43, 1.89],
    [6.53, 0.25, 7.44, 0.83],
    // bedroom
    [4.14, 3.87, 4.35, 3.98],
    [5.26, 3.87, 7.43, 3.98],
    [4.14, 3.98, 4.25, 6.26],
  ],
  doors: [
    [3.03, 0, 4.05, 0.25],
    [4.8, 1.78, 5.59, 1.89],
    [4.35, 3.87, 5.26, 3.98],
    [2.79, 6.46, 2.88, 7.12],
  ],
  glass: [
    [0.38, 6.35, 2.56, 6.44],
    [2.88, 7.7, 4.05, 7.78],
    [4.46, 7.72, 7.29, 7.8],
  ],
  railings: [[0.28, 7.7, 2.79, 7.78]],
  screens: [[6.53, 0.83, 6.53, 1.78]],
  windows: [],
  furniture: [
    // kitchen and dining
    {
      kind: "kitchen",
      at: [0.18, 0.25, 2.92, 0.85],
      face: "+z",
      sink: [1.12, 1.61],
      hob: [1.92, 2.62],
    },
    { kind: "fridge", at: [0.18, 0.94, 0.78, 1.54], face: "+x" },
    { kind: "table", at: [0.18, 2.31, 1.37, 3.11] },
    { kind: "chair", at: [0.23, 2.06, 0.72, 2.5], face: "+z" },
    { kind: "chair", at: [0.82, 2.06, 1.31, 2.5], face: "+z" },
    { kind: "chair", at: [0.23, 2.92, 0.72, 3.36], face: "-z" },
    { kind: "chair", at: [0.82, 2.92, 1.31, 3.36], face: "-z" },
    { kind: "shoes", at: [4.25, 0.25, 4.6, 1.89], face: "-x" },
    // living room
    { kind: "console", at: [0.28, 3.88, 0.55, 6.07], face: "+x" },
    { kind: "tv", at: [0.28, 4.4, 0.36, 5.6], face: "+x" },
    { kind: "rug", at: [1.3, 3.8, 3.3, 5.6] },
    { kind: "coffee", at: [1.67, 4.03, 2.72, 5.0] },
    { kind: "sofa", at: [3.31, 3.88, 4.13, 6.0], back: "+x" },
    { kind: "sofa", at: [2.6, 5.3, 3.31, 6.0], back: "+z" },
    // balcony, laundry
    { kind: "chair", at: [0.7, 6.9, 1.2, 7.4], face: "+x" },
    { kind: "chair", at: [1.7, 6.9, 2.2, 7.4], face: "-x" },
    { kind: "washer", at: [3.26, 6.59, 3.86, 7.19], face: "-x" },
    { kind: "cabinet", at: [3.86, 6.59, 4.05, 7.05], face: "-x" },
    { kind: "laundry", at: [3.1, 7.3, 3.98, 7.64], face: "-z" },
    // flexible room
    { kind: "bed", at: [6.2, 2.09, 7.43, 3.87], head: "+z", size: "single" },
    { kind: "nightstand", at: [5.51, 3.43, 6.2, 3.87], face: "-z" },
    // bedroom
    { kind: "wardrobe", at: [5.49, 3.98, 7.43, 4.58], face: "+z" },
    { kind: "console", at: [4.25, 5.36, 4.55, 7.4], face: "+x" },
    { kind: "tv", at: [4.25, 5.8, 4.33, 7.0], face: "+x" },
    { kind: "bed", at: [5.44, 5.36, 7.43, 7.44], head: "+x" },
    { kind: "nightstand", at: [6.99, 4.65, 7.43, 5.1], face: "-x" },
    // bathroom
    { kind: "vanity", at: [4.72, 0.27, 5.61, 0.68], face: "+z" },
    { kind: "toilet", at: [5.84, 0.27, 6.3, 0.97], face: "+z" },
    { kind: "shower", at: [6.53, 0.83, 7.43, 1.78], head: [7.0, 0.83] },
  ],
  rooms: [
    { name: "Phòng khách", at: [2.2, 3.5], look: "+z" },
    { name: "Bếp và bàn ăn", at: [2.0, 1.6], look: "-z" },
    { name: "Phòng đa năng", at: [5.2, 2.9], look: "+x" },
    { name: "Phòng ngủ", at: [4.9, 4.7], look: "+z" },
    { name: "Ban công", at: [1.5, 6.0], look: "+z" },
    { name: "Lô gia giặt phơi", at: [3.05, 6.8], look: "+x" },
    { name: "WC", at: [5.2, 1.3], look: "+x" },
    { name: "Lối vào", at: [3.5, 0.8], look: "+z" },
  ],
};

/**
 * Sun Ponte, Dual Key 88.2 m² (T1, 20th floor and up): a shared lobby opens
 * on a one-bedroom unit (bedroom, living room, a spare bed, kitchen, bathroom
 * and laundry) and a studio with its own kitchen and bathroom; both give onto
 * the balcony.
 */
const PONTE_DK_88: Interior = {
  floor: "/images/projects/sun-ponte-residence/can/dk-88-san.webp",
  width: 9.9,
  depth: 9.9,
  ceiling: 2.7,
  north: "+x",
  walls: [
    // outer walls
    [0, 0, 0.25, 1.22],
    [0.25, 0, 0.4, 0.23],
    [3.1, 0, 3.46, 0.23],
    [0.05, 1.22, 0.25, 9.9],
    [9.66, 0, 9.86, 9.9],
    [0.05, 9.82, 5.0, 9.9],
    [6.03, 9.82, 9.86, 9.9],
    // laundry and balcony
    [4.66, 0, 4.76, 0.78],
    [3.36, 1.37, 4.76, 1.57],
    [6.34, 1.38, 6.66, 1.57],
    [9.47, 1.38, 9.66, 1.57],
    // bedroom
    [3.26, 0.23, 3.46, 1.37],
    [3.26, 1.37, 3.36, 3.9],
    [0.25, 3.87, 2.27, 3.97],
    [3.15, 3.9, 3.36, 4.0],
    // spare bed, kitchen, bathroom
    [0.25, 5.98, 2.5, 6.07],
    [0.25, 8.08, 2.47, 8.18],
    [3.22, 8.08, 3.6, 8.18],
    [3.26, 8.18, 3.47, 9.82],
    [4.62, 8.08, 6.44, 8.16],
    [0.25, 9.09, 1.16, 9.82],
    // between the units
    [6.44, 1.57, 6.56, 8.3],
    [6.44, 9.25, 6.56, 9.82],
    // studio bathroom
    [7.65, 7.94, 9.66, 8.05],
    [7.65, 8.85, 7.77, 9.82],
  ],
  doors: [
    [5.0, 9.82, 6.03, 9.9],
    [3.6, 8.08, 4.62, 8.18],
    [6.44, 8.3, 6.56, 9.25],
    [2.27, 3.87, 3.15, 4.0],
    [2.47, 8.08, 3.22, 8.18],
    [4.66, 0.78, 4.76, 1.36],
    [7.65, 8.05, 7.77, 8.85],
  ],
  glass: [
    [0.4, 0.03, 3.1, 0.2],
    [3.46, 0.03, 4.66, 0.18],
    [4.76, 1.39, 6.34, 1.47],
    [6.66, 1.39, 9.47, 1.47],
  ],
  railings: [[4.76, 0.03, 9.66, 0.18]],
  screens: [
    [8.56, 9.4, 8.8, 9.2],
    [8.8, 9.2, 9.23, 9.2],
  ],
  windows: [],
  furniture: [
    // bedroom
    { kind: "bed", at: [0.25, 0.88, 2.25, 2.48], head: "-x" },
    { kind: "nightstand", at: [0.25, 0.44, 0.7, 0.88], face: "+x" },
    { kind: "nightstand", at: [0.25, 2.48, 0.7, 2.94], face: "+x" },
    { kind: "tv", at: [3.12, 0.95, 3.26, 2.4], face: "-x" },
    { kind: "wardrobe", at: [0.25, 3.29, 2.05, 3.87], face: "-z" },
    // living room
    { kind: "sofa", at: [3.36, 1.79, 4.11, 4.19], back: "-x" },
    { kind: "sofa", at: [4.11, 1.79, 4.76, 2.45], back: "-z" },
    { kind: "rug", at: [4.3, 2.6, 6.1, 4.0] },
    { kind: "coffee", at: [4.72, 2.78, 5.66, 3.75] },
    { kind: "console", at: [6.17, 1.79, 6.44, 3.87], face: "-x" },
    { kind: "tv", at: [6.36, 2.2, 6.44, 3.4], face: "-x" },
    { kind: "table", at: [5.26, 5.3, 6.44, 6.09] },
    { kind: "chair", at: [5.32, 5.04, 5.81, 5.5], face: "+z" },
    { kind: "chair", at: [5.93, 5.04, 6.4, 5.5], face: "+z" },
    { kind: "chair", at: [5.32, 5.9, 5.81, 6.35], face: "-z" },
    { kind: "chair", at: [5.93, 5.9, 6.4, 6.35], face: "-z" },
    { kind: "console", at: [5.08, 7.76, 6.44, 8.08], face: "-z" },
    // spare bed and kitchen
    { kind: "bed", at: [0.25, 3.99, 1.35, 5.98], head: "-z", size: "single" },
    { kind: "nightstand", at: [1.35, 3.99, 2.05, 4.45], face: "+z" },
    { kind: "fridge", at: [0.25, 6.1, 0.84, 6.71], face: "+z" },
    { kind: "cabinet", at: [0.84, 6.1, 2.5, 6.71], face: "+z" },
    {
      kind: "kitchen",
      at: [0.25, 7.46, 2.44, 8.08],
      face: "-z",
      sink: [0.34, 0.84],
      hob: [1.49, 2.23],
    },
    // laundry, balcony
    { kind: "laundry", at: [3.47, 0.23, 4.37, 0.62], face: "+z" },
    { kind: "washer", at: [3.65, 0.74, 4.27, 1.34], face: "-z" },
    { kind: "chair", at: [5.3, 0.5, 5.8, 1.0], face: "+x" },
    { kind: "chair", at: [6.3, 0.5, 6.8, 1.0], face: "-x" },
    { kind: "plant", at: [9.1, 0.3, 9.5, 0.7] },
    // lobby
    { kind: "shoes", at: [3.47, 9.4, 4.84, 9.76], face: "-z" },
    // bathroom
    { kind: "shower", at: [0.25, 8.18, 1.16, 9.09], head: [0.71, 9.09] },
    { kind: "toilet", at: [1.53, 8.95, 1.99, 9.8], face: "-z" },
    { kind: "vanity", at: [2.31, 9.28, 3.26, 9.8], face: "-z" },
    // studio
    { kind: "console", at: [6.56, 1.79, 6.87, 3.87], face: "+x" },
    { kind: "tv", at: [6.56, 2.2, 6.64, 3.4], face: "+x" },
    { kind: "bed", at: [7.66, 2.25, 9.66, 3.83], head: "+x" },
    { kind: "nightstand", at: [9.21, 1.79, 9.66, 2.25], face: "-x" },
    { kind: "nightstand", at: [9.21, 3.83, 9.66, 4.29], face: "-x" },
    { kind: "wardrobe", at: [9.07, 4.29, 9.66, 5.88], face: "-x" },
    { kind: "fridge", at: [9.07, 5.88, 9.66, 6.51], face: "-x" },
    {
      kind: "kitchen",
      at: [9.07, 6.51, 9.66, 7.24],
      face: "-x",
      sink: [6.55, 7.15],
      hob: [6.51, 6.51],
    },
    {
      kind: "kitchen",
      at: [7.66, 7.24, 9.66, 7.84],
      face: "-z",
      sink: [7.66, 7.66],
      hob: [8.0, 8.73],
    },
    { kind: "table", at: [6.57, 5.5, 7.47, 6.1] },
    { kind: "chair", at: [6.77, 5.04, 7.26, 5.5], face: "+z" },
    { kind: "chair", at: [6.77, 6.1, 7.26, 6.55], face: "-z" },
    { kind: "shoes", at: [6.56, 9.4, 7.65, 9.76], face: "-z" },
    // studio bathroom
    { kind: "vanity", at: [9.23, 8.07, 9.64, 9.25], face: "-x" },
    { kind: "toilet", at: [7.92, 9.0, 8.36, 9.8], face: "-z" },
    { kind: "shower", at: [8.56, 9.2, 9.64, 9.82], head: [9.3, 9.82] },
  ],
  rooms: [
    { name: "Sảnh vào", at: [5.2, 9.0], look: "-z" },
    { name: "Phòng khách", at: [5.0, 4.8], look: "-z" },
    { name: "Bếp và bàn ăn", at: [2.0, 7.0], look: "+z" },
    { name: "Phòng ngủ", at: [2.7, 3.3], look: "-z" },
    { name: "Ban công", at: [5.6, 1.85], look: "-z" },
    { name: "WC", at: [2.6, 8.6], look: "+z" },
    { name: "Căn studio", at: [7.3, 4.6], look: "+x" },
    { name: "Bếp căn studio", at: [8.3, 6.6], look: "+z" },
    { name: "WC căn studio", at: [8.2, 8.5], look: "+x" },
  ],
};

/**
 * Sun Ponte, 1PN 43.5 m² (T2, 20th floor and up): one long room from the
 * door to the balcony, with the kitchen and dining at the door, the living
 * room, and the bed behind a wardrobe; a bathroom and a laundry loggia.
 */
const PONTE_1PN_43: Interior = {
  floor: "/images/projects/sun-ponte-residence/can/1pn-43-san.webp",
  width: 5.04,
  depth: 9.9,
  ceiling: 2.7,
  north: "+x",
  walls: [
    [0, 0, 0.19, 9.9],
    [4.86, 0, 5.04, 9.9],
    [0.19, 9.85, 3.1, 9.9],
    [4.1, 9.85, 4.86, 9.9],
    // laundry
    [1.39, 0, 1.49, 0.76],
    [0.19, 1.35, 1.74, 1.56],
    [4.74, 1.35, 4.86, 1.56],
    // bed alcove
    [0.19, 4.78, 2.2, 4.88],
    // bathroom
    [0.19, 8.09, 2.96, 8.2],
    [2.84, 9.1, 2.96, 9.85],
    [0.19, 9.26, 1.0, 9.85],
  ],
  doors: [
    [3.1, 9.85, 4.1, 9.9],
    [1.39, 0.76, 1.49, 1.35],
    [2.84, 8.2, 2.96, 9.1],
  ],
  glass: [
    [0.19, 0.03, 1.39, 0.15],
    [1.74, 1.36, 4.74, 1.45],
  ],
  railings: [[1.49, 0.03, 4.86, 0.12]],
  screens: [[1.12, 8.2, 1.12, 9.26]],
  windows: [],
  furniture: [
    // laundry, balcony
    { kind: "laundry", at: [0.34, 0.23, 1.26, 0.6], face: "+z" },
    { kind: "washer", at: [0.38, 0.72, 1.0, 1.34], face: "+x" },
    { kind: "chair", at: [2.5, 0.5, 3.0, 1.0], face: "+x" },
    { kind: "chair", at: [3.5, 0.5, 4.0, 1.0], face: "-x" },
    // bed
    { kind: "bed", at: [0.19, 1.78, 2.2, 3.59], head: "-x" },
    { kind: "nightstand", at: [0.19, 3.59, 0.64, 4.05], face: "+x" },
    { kind: "console", at: [4.56, 1.78, 4.86, 3.59], face: "-x" },
    { kind: "tv", at: [4.78, 2.1, 4.86, 3.3], face: "-x" },
    { kind: "wardrobe", at: [0.19, 4.19, 2.2, 4.78], face: "-z" },
    // living room
    { kind: "sofa", at: [0.19, 5.4, 0.94, 7.6], back: "-x" },
    { kind: "rug", at: [1.1, 5.6, 2.8, 7.4] },
    { kind: "coffee", at: [1.43, 6.1, 2.25, 6.9] },
    // dining and kitchen
    { kind: "table", at: [3.65, 4.89, 4.86, 5.69] },
    { kind: "chair", at: [3.71, 4.64, 4.19, 5.1], face: "+z" },
    { kind: "chair", at: [4.31, 4.64, 4.78, 5.1], face: "+z" },
    { kind: "chair", at: [3.71, 5.48, 4.19, 5.95], face: "-z" },
    { kind: "chair", at: [4.31, 5.48, 4.78, 5.95], face: "-z" },
    { kind: "fridge", at: [4.27, 6.6, 4.85, 7.22], face: "-x" },
    {
      kind: "kitchen",
      at: [4.27, 7.26, 4.86, 9.71],
      face: "-x",
      sink: [7.67, 8.49],
      hob: [8.66, 9.52],
    },
    // bathroom
    { kind: "shower", at: [0.19, 8.2, 1.12, 9.26], head: [0.6, 9.26] },
    { kind: "toilet", at: [1.22, 8.98, 1.67, 9.83], face: "-z" },
    { kind: "vanity", at: [1.91, 9.36, 2.84, 9.83], face: "-z" },
  ],
  rooms: [
    { name: "Phòng ngủ", at: [3.0, 3.6], look: "-x" },
    { name: "Phòng khách", at: [2.8, 6.4], look: "-x" },
    { name: "Bếp và bàn ăn", at: [3.4, 7.8], look: "+x" },
    { name: "Ban công", at: [3.0, 1.75], look: "-z" },
    { name: "WC", at: [2.3, 8.7], look: "-x" },
    { name: "Lối vào", at: [3.6, 9.3], look: "-z" },
  ],
};

/**
 * Sun Ponte, 3PN 103.9 m² (T2's corner, 20th floor and up): an L-shaped unit
 * with a long balcony wrapping the living room, two bedrooms on the glass,
 * the master with a dressing area and its own bathroom, a third bedroom by
 * the door, kitchen with an island, a shared bathroom and a laundry loggia.
 */
const PONTE_3PN_104: Interior = {
  floor: "/images/projects/sun-ponte-residence/can/3pn-104-san.webp",
  width: 12.25,
  depth: 11.73,
  ceiling: 2.7,
  north: "+x",
  walls: [
    // outer walls
    [4.74, 0, 5.03, 3.02],
    [4.74, 3.02, 4.96, 4.08],
    [5.03, 0, 5.24, 0.2],
    [8.05, 0, 8.81, 0.2],
    [11.81, 0, 11.98, 0.2],
    [11.98, 0, 12.25, 3.02],
    [11.98, 3.02, 12.17, 7.85],
    [7.4, 7.66, 12.17, 7.85],
    [7.44, 7.85, 7.67, 11.73],
    [0, 11.54, 3.56, 11.73],
    [4.58, 11.54, 7.67, 11.73],
    [0, 3.19, 0.18, 3.78],
    [0, 7.7, 0.18, 11.54],
    // balcony, laundry
    [1.42, 3.19, 1.65, 3.4],
    [1.42, 3.4, 1.54, 6.78],
    [1.42, 7.55, 1.54, 7.63],
    [3.42, 1.84, 3.52, 2.6],
    [3.42, 3.19, 4.74, 3.4],
    // bedroom 2
    [4.96, 3.97, 7.46, 4.08],
    [8.31, 3.97, 8.45, 4.08],
    [8.45, 0.2, 8.57, 5.0],
    // master bedroom, dressing, bathroom
    [9.97, 3.99, 11.98, 4.08],
    [8.45, 5.95, 8.57, 7.66],
    [8.57, 5.98, 8.64, 6.1],
    [9.47, 5.98, 11.98, 6.1],
    [11.67, 6.1, 11.98, 7.66],
    // bedroom 3
    [1.42, 7.63, 3.4, 7.85],
    [3.28, 8.75, 3.4, 11.54],
    // shared bathroom
    [4.74, 9.67, 7.44, 9.88],
    [4.74, 10.95, 4.86, 11.54],
    [6.56, 11.04, 7.44, 11.54],
  ],
  doors: [
    [3.56, 11.54, 4.58, 11.73],
    [1.42, 6.78, 1.54, 7.55],
    [3.42, 2.6, 3.52, 3.19],
    [7.46, 3.97, 8.31, 4.08],
    [8.45, 5.0, 8.57, 5.95],
    [8.64, 5.98, 9.47, 6.1],
    [3.28, 7.85, 3.4, 8.75],
    [4.74, 9.95, 4.86, 10.95],
  ],
  glass: [
    [1.65, 3.2, 3.42, 3.3],
    [5.24, 0.03, 8.05, 0.18],
    [8.81, 0.03, 11.81, 0.18],
    [3.52, 1.86, 4.74, 1.98],
    [0.18, 7.68, 1.42, 7.76],
  ],
  railings: [
    [0, 1.84, 3.42, 1.95],
    [0, 2.03, 0.12, 3.19],
    [0, 3.78, 0.12, 7.7],
  ],
  screens: [
    [10.67, 6.1, 10.67, 7.63],
    [6.53, 9.93, 6.53, 11.04],
  ],
  windows: [],
  furniture: [
    // living room
    { kind: "sofa", at: [1.54, 3.61, 2.29, 5.81], back: "-x" },
    { kind: "sofa", at: [2.29, 3.61, 2.95, 4.25], back: "-z" },
    { kind: "rug", at: [2.6, 4.4, 4.5, 5.9] },
    { kind: "coffee", at: [3.29, 4.6, 4.24, 5.56] },
    { kind: "console", at: [4.74, 4.09, 5.05, 5.81], face: "-x" },
    { kind: "tv", at: [4.66, 4.4, 4.74, 5.5], face: "-x" },
    // balcony, laundry
    { kind: "chair", at: [0.4, 4.0, 0.9, 4.5], face: "+z" },
    { kind: "chair", at: [0.4, 5.0, 0.9, 5.5], face: "-z" },
    { kind: "plant", at: [0.4, 2.2, 0.8, 2.6] },
    { kind: "plant", at: [2.9, 2.2, 3.3, 2.6] },
    { kind: "laundry", at: [3.68, 2.05, 4.58, 2.45], face: "+z" },
    { kind: "washer", at: [3.94, 2.6, 4.53, 3.19], face: "-z" },
    // dining and kitchen
    { kind: "table", at: [5.46, 4.75, 7.05, 5.57] },
    { kind: "chair", at: [5.53, 4.51, 5.98, 4.96], face: "+z" },
    { kind: "chair", at: [6.0, 4.51, 6.49, 4.96], face: "+z" },
    { kind: "chair", at: [6.51, 4.51, 6.96, 4.96], face: "+z" },
    { kind: "chair", at: [5.53, 5.36, 5.98, 5.81], face: "-z" },
    { kind: "chair", at: [6.0, 5.36, 6.49, 5.81], face: "-z" },
    { kind: "chair", at: [6.51, 5.36, 6.96, 5.81], face: "-z" },
    { kind: "fridge", at: [7.5, 6.92, 8.45, 7.63], face: "-z" },
    { kind: "island", at: [4.74, 7.66, 5.55, 9.67] },
    {
      kind: "kitchen",
      at: [6.86, 7.66, 7.44, 9.67],
      face: "-x",
      sink: [7.7, 7.7],
      hob: [8.37, 9.05],
    },
    // bedroom 2
    { kind: "bed", at: [5.03, 0.88, 7.05, 2.7], head: "-x" },
    { kind: "nightstand", at: [5.03, 0.44, 5.5, 0.88], face: "+x" },
    { kind: "nightstand", at: [5.03, 2.7, 5.5, 3.15], face: "+x" },
    { kind: "wardrobe", at: [4.96, 3.42, 7.05, 3.97], face: "-z" },
    { kind: "tv", at: [8.3, 0.95, 8.45, 2.6], face: "-x" },
    // master bedroom and dressing
    { kind: "bed", at: [9.97, 0.89, 11.95, 2.71], head: "+x" },
    { kind: "nightstand", at: [11.53, 0.44, 11.95, 0.89], face: "-x" },
    { kind: "cabinet", at: [11.53, 2.71, 11.95, 3.99], face: "-x" },
    { kind: "stool", at: [11.36, 3.11, 11.67, 3.56], face: "+x" },
    { kind: "tv", at: [8.57, 0.95, 8.72, 2.6], face: "+x" },
    { kind: "wardrobe", at: [9.97, 4.08, 11.95, 4.7], face: "+z" },
    { kind: "wardrobe", at: [11.43, 4.7, 11.95, 5.98], face: "-x" },
    // master bathroom
    { kind: "vanity", at: [8.57, 7.23, 9.75, 7.63], face: "-z" },
    { kind: "toilet", at: [9.99, 6.92, 10.43, 7.63], face: "-z" },
    { kind: "shower", at: [10.67, 6.1, 11.67, 7.63], head: [11.1, 7.63] },
    // bedroom 3
    { kind: "console", at: [0.18, 7.85, 1.69, 8.2], face: "+z" },
    { kind: "stool", at: [0.7, 8.06, 1.17, 8.4], face: "-z" },
    { kind: "bed", at: [0.18, 8.72, 2.19, 11.04], head: "-x" },
    { kind: "wardrobe", at: [0.18, 11.04, 3.28, 11.54], face: "-z" },
    { kind: "tv", at: [3.14, 9.0, 3.28, 10.24], face: "-x" },
    // shared bathroom
    { kind: "vanity", at: [4.87, 11.14, 5.76, 11.54], face: "-z" },
    { kind: "toilet", at: [5.93, 10.85, 6.38, 11.54], face: "-z" },
    { kind: "shower", at: [6.56, 9.93, 7.44, 11.04], head: [6.95, 11.04] },
  ],
  rooms: [
    { name: "Phòng khách", at: [3.0, 6.4], look: "-z" },
    { name: "Ban công", at: [0.8, 6.0], look: "-z" },
    { name: "Bếp và bàn ăn", at: [6.15, 8.6], look: "+x" },
    { name: "Phòng ngủ 1", at: [9.3, 3.4], look: "+x" },
    { name: "Phòng ngủ 2", at: [7.7, 3.3], look: "-x" },
    { name: "Phòng ngủ 3", at: [2.8, 9.6], look: "-x" },
    { name: "WC phòng ngủ 1", at: [9.2, 6.7], look: "+x" },
    { name: "WC chung", at: [5.4, 10.4], look: "+z" },
    { name: "Lối vào", at: [4.1, 11.0], look: "-z" },
  ],
};

export const INTERIORS: Record<string, Interior> = {
  "ponte-3pn-104": PONTE_3PN_104,
  "ponte-1pn-43": PONTE_1PN_43,
  "ponte-dk-88": PONTE_DK_88,
  "ponte-1pn-1-52": PONTE_1PN_1_52,
  "ponte-2pn-77": PONTE_2PN_77,
  "ponte-3pn-91-t2": PONTE_3PN_91_T2,
  "ponte-3pn-91-t1": PONTE_3PN_91,
  "ponte-dk-92": PONTE_DK_92,
  "ponte-2pn-70": PONTE_2PN_70,
};
