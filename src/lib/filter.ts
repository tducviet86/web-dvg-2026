import type { Property } from "../types/index";
import { homeProjects } from "../data/home-projects";
export type Filters = Record<string, string | undefined>;
const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
export function filterProperties(items: Property[], f: Filters) {
  return items
    .filter(
      (p) =>
        (!f.q ||
          searchable(
            `${p.name} ${p.location} ${p.unitCode || p.id} ${homeProjects.find((x) => x.projectId === p.projectId)?.name || ""}`,
          ).includes(searchable(f.q))) &&
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
