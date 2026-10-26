import type { ApiJob, EmploymentType } from "@/lib/api/types";

/** Labels and URL values (?hinh-thuc=…) of each kind of contract. */
export const EMPLOYMENT: Record<
  EmploymentType,
  { label: string; slug: string }
> = {
  FULL_TIME: { label: "Toàn thời gian", slug: "toan-thoi-gian" },
  PART_TIME: { label: "Bán thời gian", slug: "ban-thoi-gian" },
  INTERNSHIP: { label: "Thực tập", slug: "thuc-tap" },
  CONTRACT: { label: "Hợp đồng / cộng tác", slug: "cong-tac" },
};
export const employmentOptions = Object.entries(EMPLOYMENT) as [
  EmploymentType,
  { label: string; slug: string },
][];
/** "toan-thoi-gian" → "FULL_TIME"; anything else → "" (no filter). */
export const typeFromSlug = (slug = "") =>
  employmentOptions.find(([, v]) => v.slug === slug)?.[0] ?? "";

const millions = (vnd: string) =>
  (Number(vnd) / 1_000_000).toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  });
/** "10 – 20 triệu + hoa hồng", "Từ 8 triệu", "Thỏa thuận". */
export function salaryText(
  job: Pick<ApiJob, "salaryMinVnd" | "salaryMaxVnd" | "salaryNote">,
) {
  const { salaryMinVnd: min, salaryMaxVnd: max, salaryNote: note } = job;
  const range =
    min && max
      ? min === max
        ? `${millions(min)} triệu`
        : `${millions(min)} – ${millions(max)} triệu`
      : min
        ? `Từ ${millions(min)} triệu`
        : max
          ? `Đến ${millions(max)} triệu`
          : "";
  return [range, note].filter(Boolean).join(" ") || "Thỏa thuận";
}
/** "2026-11-30" → "30/11/2026". */
export const dateText = (iso: string) => iso.split("-").reverse().join("/");

/** CV files the API accepts. */
export const CV_TYPES = ".pdf,.doc,.docx";
export const MAX_CV_MB = 5;
/** 2 048 000 → "2,0 MB"; 48 000 → "47 KB". */
export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
