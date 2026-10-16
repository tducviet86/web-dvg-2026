import type { Property } from "../types/index";
export type Filters = Record<string, string | undefined>;
export function filterProperties(items: Property[], f: Filters) {
  return items
    .filter(
      (p) =>
        (!f.q ||
          `${p.name} ${p.location}`
            .toLocaleLowerCase("vi")
            .includes(f.q.toLocaleLowerCase("vi"))) &&
        (!f.location || p.location === f.location) &&
        (!f.project || p.projectId === f.project) &&
        (!f.type || p.type === f.type) &&
        (!f.price || p.price <= Number(f.price)) &&
        (!f.bedrooms || p.bedrooms === Number(f.bedrooms)) &&
        (!f.area || p.area >= Number(f.area)) &&
        (!f.furniture || p.furniture === f.furniture) &&
        (!f.status || p.status === f.status),
    )
    .sort((a, b) =>
      f.sort === "price-asc"
        ? a.price - b.price
        : f.sort === "price-desc"
          ? b.price - a.price
          : f.sort === "area"
            ? b.area - a.area
            : a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
}
