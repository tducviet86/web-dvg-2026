/** The periods "Tổng quan" offers, in days; the unit list counts the same one. */
export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const RANGE_KEY = "dvg:admin-dashboard-days";

/** The period last chosen on "Tổng quan" (30 days until one is chosen). */
export function savedRange(): Range {
  try {
    const saved = Number(localStorage.getItem(RANGE_KEY));
    return RANGES.includes(saved as Range) ? (saved as Range) : 30;
  } catch {
    return 30;
  }
}
