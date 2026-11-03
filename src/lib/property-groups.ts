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

/** Types without bedrooms or bathrooms: only the area is shown. */
export const NO_ROOM_TYPES = ["shophouse", "mat-bang"];
export const hasRooms = (p: { typeCode?: string; typeGroup?: string }) =>
  !NO_ROOM_TYPES.includes(p.typeCode ?? "") && p.typeGroup !== "premises";

/**
 * Tag on a card photo for what is not a plain apartment ("Shophouse",
 * "Nhà phố", "Mặt bằng"); none for studio / 1–3PN.
 */
export const typeTag = (p: {
  type?: string;
  typeCode?: string;
  typeGroup?: string;
}) =>
  p.typeCode === "shophouse" || (p.typeGroup && p.typeGroup !== "apartment")
    ? p.type
    : undefined;

/** "Tầng 12"; nothing when the floor is not filled in, or for a shophouse. */
export const floorLabel = (p: { floor?: number | null; typeCode?: string }) =>
  p.floor && p.typeCode !== "shophouse" ? `Tầng ${p.floor}` : undefined;

/** "2 PN", or the type ("Studio", "Shophouse", "Mặt bằng") without bedrooms. */
export const roomsLabel = (p: { bedrooms: number; type?: string }) =>
  p.bedrooms > 0 ? `${p.bedrooms} PN` : p.type || "Studio";

/**
 * What a list holds, for its heading: the group searched for ("loai"), else
 * the one group all units share; undefined when they are mixed.
 */
export function listingKind(
  loai: string | undefined,
  items: { typeGroup?: string }[],
): PropertyGroup | undefined {
  if (loai && loai in PROPERTY_GROUPS) return loai as PropertyGroup;
  const groups = new Set(items.map((p) => p.typeGroup ?? "apartment"));
  if (groups.size > 1) return undefined;
  return ([...groups][0] as PropertyGroup | undefined) ?? "apartment";
}
/** "Căn hộ", "Nhà phố", "Mặt bằng"; "Bất động sản" for a mixed list. */
export const kindNoun = (kind?: PropertyGroup) =>
  kind ? PROPERTY_GROUPS[kind] : "Bất động sản";
/** "12 căn phù hợp", "5 nhà phố phù hợp", "3 mặt bằng phù hợp". */
export const kindCount = (n: number, kind?: PropertyGroup) =>
  `${n} ${kind === "townhouse" ? "nhà phố" : kind === "premises" ? "mặt bằng" : "căn"} phù hợp`;
