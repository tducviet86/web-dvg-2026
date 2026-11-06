/**
 * Simple 3D blocks for the rental map. Sizes in metres; offsets from the
 * building's map pin. Illustrative massing, not the architect's model.
 */
export type MapBlock = {
  east: number;
  north: number;
  width: number;
  depth: number;
  base: number;
  height: number;
  /** Clockwise degrees. */
  angle: number;
};

const TWO_TOWERS = (height: number, angle: number): MapBlock[] => [
  { east: 0, north: 0, width: 74, depth: 46, base: 0, height: 18, angle },
  { east: -19, north: 0, width: 26, depth: 30, base: 18, height, angle },
  { east: 19, north: 0, width: 26, depth: 30, base: 18, height, angle },
];

const ONE_TOWER = (height: number, angle: number): MapBlock[] => [
  { east: 0, north: 0, width: 62, depth: 44, base: 0, height: 16, angle },
  { east: 0, north: 0, width: 40, depth: 26, base: 16, height, angle },
];

export const BUILDING_BLOCKS: Record<string, MapBlock[]> = {
  "monarchy-apartments": TWO_TOWERS(130, 12),
  "sun-panoma": TWO_TOWERS(120, -14),
  "sun-ponte-residence": TWO_TOWERS(130, 8),
  "hiyori-garden-tower": ONE_TOWER(105, 20),
  "sam-tower": TWO_TOWERS(115, -30),
};

/** Buildings with no map pin in Admin yet (an Admin pin takes over). */
export const BUILDING_PLACES: Record<string, { lat: number; lng: number }> = {
  "hiyori-garden-tower": { lat: 16.06126, lng: 108.23562 },
  "sam-tower": { lat: 16.0912, lng: 108.22 },
};

const M_PER_DEG = 110_574;

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
