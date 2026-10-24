/**
 * Badges on unit cards. Editors pick one in Admin; "Đang được quan tâm" is
 * added by the server when many visitors look at or ask about a unit.
 */
export const HIGHLIGHTS = {
  hot: "HOT",
  exclusive: "Độc quyền",
  rare: "Hiếm có",
  "good-price": "Giá tốt",
} as const;
export type Highlight = keyof typeof HIGHLIGHTS;
export const TRENDING_LABEL = "Đang được quan tâm";
/** Same rule as the server (properties.service.ts): views + 5 × enquiries. */
export const TRENDING_SCORE = 20;
export const highlightOptions = Object.entries(HIGHLIGHTS) as [
  string,
  string,
][];

export const highlightLabel = (key?: string | null) =>
  key && key in HIGHLIGHTS ? HIGHLIGHTS[key as Highlight] : undefined;

/** The badges a unit shows, most important first (at most two). */
export function unitBadges(p: { highlight?: string; trending?: boolean }) {
  const badges: { key: string; label: string }[] = [];
  const label = highlightLabel(p.highlight);
  if (label) badges.push({ key: p.highlight!, label });
  // "HOT" already says it: no second badge.
  if (p.trending && p.highlight !== "hot")
    badges.push({ key: "trending", label: TRENDING_LABEL });
  return badges;
}
