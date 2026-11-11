/**
 * Search landing pages ("Cho thuê căn hộ 2 phòng ngủ Đà Nẵng"): a fixed
 * search with its own address, heading and text, so Google can rank it for
 * what people type. Kept in the setting "seo.landings" (Admin › Từ khoá &
 * SEO); the API checks them before saving.
 */
export type Landing = {
  slug: string;
  purpose: "rent" | "sale";
  h1: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  /** Search filters, as the public search URL names them. */
  filters: Record<string, string>;
  published: boolean;
};

/** Filters a landing page may fix (the API refuses others). */
export const LANDING_FILTERS = [
  "project",
  "loai",
  "bedrooms",
  "price",
  "gia-tu",
  "gia-ban",
  "gia-ban-tu",
  "area",
  "furniture",
  "location",
] as const;

/** The stored list; nothing when it is missing or unreadable. */
export function readLandings(text: string | undefined): Landing[] {
  if (!text) return [];
  try {
    const list = JSON.parse(text);
    return Array.isArray(list)
      ? list.filter(
          (l): l is Landing =>
            !!l &&
            typeof l.slug === "string" &&
            typeof l.h1 === "string" &&
            (l.purpose === "rent" || l.purpose === "sale") &&
            !!l.filters &&
            typeof l.filters === "object",
        )
      : [];
  } catch {
    return [];
  }
}

/** "/cho-thue/nhu-cau/<slug>" or "/mua-ban/nhu-cau/<slug>". */
export const landingPath = (l: Pick<Landing, "purpose" | "slug">) =>
  `/${l.purpose === "sale" ? "mua-ban" : "cho-thue"}/nhu-cau/${l.slug}`;

/** The search a landing page shows, with "Mua" for units on sale. */
export const landingFilters = (l: Landing): Record<string, string> => ({
  ...l.filters,
  ...(l.purpose === "sale" ? { "nhu-cau": "mua" } : {}),
});
