import type { Property } from "../types/index";
import { vacantNow } from "./availability";
import { searchUnits } from "./filter";
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

/**
 * Below this many units a landing page is too thin for search engines (and
 * close to a doorway page): it still opens for visitors, but is kept out of
 * the index, the sitemap and llms.txt until enough units match.
 */
export const MIN_LANDING_UNITS = 3;

/** The units a landing page lists (no samples, nothing taken off the site). */
export const landingUnits = (l: Landing, properties: Property[]) =>
  searchUnits(
    properties.filter((p) => !p.isDemo && !p.delisted),
    landingFilters(l),
  );

/** What the page's units add up to: shown on the page and told to AI. */
export function landingFacts(l: Landing, units: Property[]) {
  const sale = l.purpose === "sale";
  const prices = units
    .map((u) => (sale ? (u.saleVnd ?? 0) / 1e9 : (u.rentVnd ?? 0) / 1e6))
    .filter((n) => n > 0);
  return {
    total: units.length,
    free: units.filter(vacantNow).length,
    low: prices.length ? Math.min(...prices) : 0,
    high: prices.length ? Math.max(...prices) : 0,
    unit: sale ? "tỷ" : "triệu/tháng",
    projects: [
      ...new Set(units.map((u) => u.projectName).filter(Boolean)),
    ] as string[],
  };
}

type Facts = ReturnType<typeof landingFacts>;
const num = (n: number) =>
  n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

/** "10 – 25 triệu/tháng", "3,2 tỷ"; nothing without prices. */
export const landingPrice = (f: Facts) =>
  f.low
    ? `${f.low === f.high ? num(f.low) : `${num(f.low)} – ${num(f.high)}`} ${f.unit}`
    : "";

/** One sentence of facts, for the page's FAQ and llms.txt. */
export function landingSummary(f: Facts) {
  const price = landingPrice(f);
  return `Đất Vàng Group đang giới thiệu ${f.total} căn phù hợp (${f.free} căn còn trống)${
    price ? `, giá ${price}` : ""
  }${f.projects.length ? `, tại ${f.projects.join(", ")}` : ""}. Danh sách trên trang được cập nhật theo tình trạng căn.`;
}
