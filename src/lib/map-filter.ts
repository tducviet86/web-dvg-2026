/**
 * The map's unit filter: bedrooms ("1" studio or 1PN, "2", "3" and more) and
 * monthly rent in million VND as "low-high" (no high: open above).
 */
export type MapFilter = { rooms: string; price: string };

export const NO_FILTER: MapFilter = { rooms: "", price: "" };

export const isFiltering = (f: MapFilter) => !!(f.rooms || f.price);

/**
 * Whether a unit fits. `bedrooms` is -1 for a unit without rooms (a shop),
 * `rent` 0 for one not for rent: neither fits a choice on that side.
 */
export function unitFits(
  unit: { bedrooms: number; rent: number },
  { rooms, price }: MapFilter,
) {
  if (rooms) {
    const want = Number(rooms);
    if (unit.bedrooms < 0) return false;
    if (
      want === 1
        ? unit.bedrooms > 1
        : want === 3
          ? unit.bedrooms < 3
          : unit.bedrooms !== want
    )
      return false;
  }
  if (price) {
    const [low, high] = price.split("-").map((x) => (x ? Number(x) : NaN));
    if (!unit.rent) return false;
    if (unit.rent < low) return false;
    if (!Number.isNaN(high) && unit.rent >= high) return false;
  }
  return true;
}
