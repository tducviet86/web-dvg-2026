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

/**
 * An amount typed in Admin ("19.000.000"), in words no reader can misread:
 * "19 triệu đồng/tháng (19.000.000 đ/tháng)". The AI writer once read the dots as
 * decimals and wrote "19 đ/tháng".
 */
export function moneyWords(typed: unknown, per = "") {
  const vnd = Number(String(typed ?? "").replace(/\D/g, ""));
  if (!vnd) return "";
  const words =
    vnd >= 1e9
      ? `${money(vnd / 1e9)} tỷ đồng`
      : vnd >= 1e6
        ? `${money(vnd / 1e6)} triệu đồng`
        : `${vndFull(vnd)} đồng`;
  return vnd >= 1e6
    ? `${words}${per} (${vndFull(vnd)} đ${per})`
    : `${words}${per}`;
}

/** Unit code shown to visitors; falls back to a short code instead of a UUID. */
export const unitRef = (p: { unitCode?: string | null; id: string }) =>
  p.unitCode ||
  `DVG-${p.id
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase()}`;
