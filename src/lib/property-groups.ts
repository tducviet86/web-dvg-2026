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
/**
 * Kinds a visitor searches by: the groups, with shophouse on its own (in
 * Admin it stays among the Căn hộ types).
 */
export const SEARCH_KINDS = {
  apartment: "Căn hộ",
  shophouse: "Shophouse",
  townhouse: "Nhà phố",
  premises: "Mặt bằng",
} as const;
export type SearchKind = keyof typeof SEARCH_KINDS;
export const unitKind = (p: { typeCode?: string; typeGroup?: string }) =>
  p.typeCode === "shophouse" ? "shophouse" : (p.typeGroup ?? "apartment");
export const kindLabel = (kind?: string) =>
  SEARCH_KINDS[kind as SearchKind] ?? kind;
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
 * What a list holds, for its heading: the kind searched for ("loai"), else
 * the one kind all units share; undefined when they are mixed.
 */
export function listingKind(
  loai: string | undefined,
  items: { typeCode?: string; typeGroup?: string }[],
): SearchKind | undefined {
  if (loai && loai in SEARCH_KINDS) return loai as SearchKind;
  const kinds = new Set(items.map(unitKind));
  if (kinds.size > 1) return undefined;
  return ([...kinds][0] as SearchKind | undefined) ?? "apartment";
}
/** "Căn hộ", "Shophouse", "Nhà phố", "Mặt bằng"; "Bất động sản" when mixed. */
export const kindNoun = (kind?: SearchKind) =>
  kind ? SEARCH_KINDS[kind] : "Bất động sản";
