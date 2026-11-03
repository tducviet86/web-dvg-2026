/**
 * Unit types fall in three groups (BE property_types.group): Căn hộ
 * (studio, 1–3PN, shophouse…), Nhà phố (Euro Village 1, 2, Phúc Lộc Viên…)
 * and Mặt bằng.
 */
export const PROPERTY_GROUPS = {
  apartment: "Căn hộ",
  townhouse: "Nhà phố",
  premises: "Mặt bằng",
} as const;
export type PropertyGroup = keyof typeof PROPERTY_GROUPS;
export const groupOptions = Object.entries(PROPERTY_GROUPS) as [
  PropertyGroup,
  string,
][];
export const groupLabel = (group?: string) =>
  PROPERTY_GROUPS[group as PropertyGroup] ?? PROPERTY_GROUPS.apartment;

/** "2 PN", or the type ("Studio", "Shophouse", "Mặt bằng") without bedrooms. */
export const roomsLabel = (p: { bedrooms: number; type?: string }) =>
  p.bedrooms > 0 ? `${p.bedrooms} PN` : p.type || "Studio";
