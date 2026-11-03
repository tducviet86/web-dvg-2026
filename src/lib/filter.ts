import type { Property } from "../types/index";
export type Filters = Record<string, string | undefined>;
const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
export function filterProperties(items: Property[], f: Filters) {
  return (
    items
      .filter(
        (p) =>
          (!f.q ||
            searchable(
              `${p.name} ${p.location} ${p.unitCode || p.id} ${p.projectName || ""}`,
            ).includes(searchable(f.q))) &&
          (!f.location || p.location === f.location) &&
          (!f.project ||
            p.projectSlug === f.project ||
            p.projectId === f.project) &&
          (!f.type || p.type === f.type) &&
          // "loai": Căn hộ / Nhà phố / Mặt bằng (lib/property-groups.ts).
          (!f.loai || (p.typeGroup ?? "apartment") === f.loai) &&
          (!f.price || p.price <= Number(f.price)) &&
          (!f["gia-tu"] || p.price >= Number(f["gia-tu"])) &&
          (!f.bedrooms || p.bedrooms === Number(f.bedrooms)) &&
          (!f.area || p.area >= Number(f.area)) &&
          (!f.furniture || p.furniture === f.furniture) &&
          (!f.status || p.status === f.status),
      )
      // Without an explicit sort the API order (publication order) is kept.
      .sort((a, b) =>
        f.sort === "price-asc"
          ? a.price - b.price
          : f.sort === "price-desc"
            ? b.price - a.price
            : f.sort === "area"
              ? b.area - a.area
              : 0,
      )
  );
}

/** "?nhu-cau=mua" (also the older "mua-ban") lists units for sale. */
export const isSaleSearch = (f: Filters) =>
  f["nhu-cau"] === "mua" || f["nhu-cau"] === "mua-ban";

/**
 * The units a search box asks for: rentals (rent filters) or units for sale
 * (same filters, the budget in tỷ via "gia-ban").
 */
export function searchUnits(items: Property[], f: Filters) {
  const sale = isSaleSearch(f);
  const listed = items.filter((p) => (sale ? p.forSale : p.forRent !== false));
  const budget = Number(f["gia-ban"]) || 0;
  const from = Number(f["gia-ban-tu"]) || 0;
  return filterProperties(
    listed,
    sale ? { ...f, price: undefined, "gia-tu": undefined } : f,
  ).filter(
    (p) =>
      !sale ||
      ((!budget || (!!p.saleVnd && p.saleVnd <= budget * 1e9)) &&
        (!from || (!!p.saleVnd && p.saleVnd >= from * 1e9))),
  );
}

/** Rent slider: 0–100 triệu a month ("100" means no upper limit). */
export const RENT_RANGE: [number, number] = [0, 100];

/** Sale slider: the cheapest to the dearest unit for sale, in whole tỷ. */
export function saleRange(items: Property[]): [number, number] {
  const prices = items
    .filter((p) => p.forSale && p.saleVnd)
    .map((p) => p.saleVnd! / 1e9);
  if (!prices.length) return [0, 20];
  const low = Math.floor(Math.min(...prices));
  const high = Math.ceil(Math.max(...prices));
  return [low, Math.max(high, low + 1)];
}
