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
