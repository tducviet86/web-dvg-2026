/** Data of the 3D floor plans: which plan a floor uses, what is on sale on it. */
export type FloorPlanEntry = { tower: string; image: string; floors: string[] };
export type FloorUnit = {
  tower: string;
  /** Empty for a model unit, which stands for its column on many floors. */
  floor: string;
  number: string;
  rooms: string;
  bedrooms: number;
  priceText: string;
  href: string;
  state: "available" | "reserved" | "sold";
  /** A 3D picture of the model unit, roof off. */
  picture?: string;
};
export type FloorData = {
  towers: { name: string; note: string }[];
  plans: FloorPlanEntry[];
  units: FloorUnit[];
  /** A unit's own 3D picture, roof off, by "drawing file/number". */
  pictures?: Record<string, string>;
  /** What a unit is when no listing says: by "drawing file/number". */
  kinds?: Record<string, UnitKind>;
  /** A word about a floor with no units to show ("tower/floor"): parking. */
  notes?: Record<string, string>;
  /** How the developer names a unit, when not "T1-1012": "{tower}{floor}-{unit}". */
  naming?: string;
  /** Its model apartments can be walked through in 360° (lib/model-tours.ts). */
  tour360?: boolean;
};

/** A unit's name: "Panoma 2-1003", or as the project's `naming` writes it. */
export function unitName(
  naming: string | undefined,
  tower: string,
  floor: string,
  unit: string,
) {
  return (naming ?? "{tower}-{floor}{unit}")
    .replace("{tower}", tower)
    .replace("{floor}", floor.padStart(2, "0"))
    .replace("{unit}", unit);
}
export type UnitKind = {
  rooms: string;
  bedrooms: number;
  /** About, m²: one figure or a range ("105–110"). */
  area: number | string;
  view: string;
  /** A picture of a unit of this kind: 3D, roof off, or its plan if `flat`. */
  picture?: string;
  flat?: boolean;
  /** Its name when not "tower-floor+number", as for a shophouse. */
  code?: string;
};

/** "Tòa C4 · Tầng 11-12, 14-27" → 11, 12, 14, 15 … 27; "Tầng 12A" → 12A. */
export function planFloors(name: string) {
  const list = name.split("Tầng ").pop() ?? "";
  return list.split(",").flatMap((part) => {
    const range = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(part);
    if (!range) return [part.trim()];
    const floors: string[] = [];
    for (let n = Number(range[1]); n <= Number(range[2]); n++)
      floors.push(String(n));
    return floors;
  });
}

/** "C1-2103" on floor 21 → unit "03"; a model unit's "C1-03" → "03". */
export function unitNumber(code: string, floor: number) {
  const rest = code.split("-")[1] ?? "";
  const prefix = String(floor).padStart(2, "0");
  return floor && rest.startsWith(prefix) ? rest.slice(2) : rest;
}

/** A tower's floors from low to high ("12A" right after 12). */
export function towerFloors(plans: FloorPlanEntry[], tower: string) {
  const floors = plans
    .filter((p) => p.tower === tower)
    .flatMap((p) => p.floors);
  return [...new Set(floors)].sort((a, b) => parseFloat(a) - parseFloat(b));
}
