import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://datvang.example";
export function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
    value,
  );
}

/** Full amount in đồng: 25000000 → "25.000.000". */
export const vndFull = (vnd: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(vnd);

/** Sale price for visitors: "5 tỷ", "850 triệu". */
export function salePrice(vnd: number) {
  return vnd >= 1e9 ? `${money(vnd / 1e9)} tỷ` : `${money(vnd / 1e6)} triệu`;
}

/** Unit code shown to visitors; falls back to a short code instead of a UUID. */
export const unitRef = (p: { unitCode?: string | null; id: string }) =>
  p.unitCode ||
  `DVG-${p.id
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase()}`;
