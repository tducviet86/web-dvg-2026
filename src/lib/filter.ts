import type { Property } from "../types/index";
import { unitKind } from "./property-groups";
import { availabilityRank, liveStatus } from "./availability";
export type Filters = Record<string, string | undefined>;
export const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
const unitWords = (p: Property) =>
  searchable(
    `${p.name} ${p.location} ${p.unitCode || p.id} ${p.projectName || ""}`,
  );
export function filterProperties(items: Property[], f: Filters) {
  return (
    items
      .filter(
        (p) =>
          (!f.q || unitWords(p).includes(searchable(f.q))) &&
          (!f.location || p.location === f.location) &&
          (!f.project ||
            p.projectSlug === f.project ||
            p.projectId === f.project) &&
          (!f.type || p.type === f.type) &&
          // "loai": Căn hộ / Shophouse / Nhà phố / Mặt bằng.
          (!f.loai || unitKind(p) === f.loai) &&
          (!f.price || p.price <= Number(f.price)) &&
          (!f["gia-tu"] || p.price >= Number(f["gia-tu"])) &&
          (!f.bedrooms || p.bedrooms === Number(f.bedrooms)) &&
          (!f.area || p.area >= Number(f.area)) &&
          (!f.furniture || p.furniture === f.furniture) &&
          (!f.status || liveStatus(p) === f.status),
      )
      // Without an explicit sort: free units first, soon free next, each in
      // API (publication) order.
      .sort((a, b) =>
        f.sort === "price-asc"
          ? a.price - b.price
          : f.sort === "price-desc"
            ? b.price - a.price
            : f.sort === "area"
              ? b.area - a.area
              : availabilityRank(a) - availabilityRank(b),
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
  // Model units (a floor note, no real floor) show on their project's page only.
  const listed = items.filter((p) =>
    sale ? p.forSale && !p.floorNote : p.forRent !== false,
  );
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

/** What the search box needs from each unit to offer only real choices. */
export type SearchFacet = {
  typeCode?: string;
  typeGroup?: string;
  bedrooms: number;
  project?: string;
  rent: boolean;
  sale: boolean;
  /** The text a keyword search looks in. */
  words: string;
};
export const searchFacets = (items: Property[]): SearchFacet[] =>
  items.map((p) => ({
    typeCode: p.typeCode,
    typeGroup: p.typeGroup,
    bedrooms: p.bedrooms,
    project: p.projectSlug,
    rent: p.forRent !== false,
    sale: !!p.forSale && !p.floorNote,
    words: unitWords(p),
  }));

/** Rent slider: 0–100 triệu a month ("100" means no upper limit). */
export const RENT_RANGE: [number, number] = [0, 100];

/** Sale slider: the cheapest to the dearest unit for sale, in whole tỷ. */
export function saleRange(items: Property[]): [number, number] {
  const prices = items
    .filter((p) => p.forSale && !p.floorNote && p.saleVnd)
    .map((p) => p.saleVnd! / 1e9);
  if (!prices.length) return [0, 20];
  const low = Math.floor(Math.min(...prices));
  const high = Math.ceil(Math.max(...prices));
  return [low, Math.max(high, low + 1)];
}
