import type { Property } from "@/types";

export type RentalMedia =
  | { type: "image"; src: string; alt: string }
  | { type: "video"; src: string; embed: boolean; alt: string };

export function videoSource(
  value?: string,
): { src: string; embed: boolean } | null {
  if (!value) return null;
  if (/^\/images\/[\w./-]+\.(mp4|webm)$/i.test(value) && !value.includes(".."))
    return { src: value, embed: false };
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      const id =
        host === "youtu.be"
          ? url.pathname.slice(1)
          : url.searchParams.get("v") ||
            url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
      return id && /^[\w-]{11}$/.test(id)
        ? { src: `https://www.youtube-nocookie.com/embed/${id}`, embed: true }
        : null;
    }
    if (/\.(mp4|webm)$/i.test(url.pathname))
      return { src: url.href, embed: false };
  } catch {
    /* Invalid media is omitted rather than inserted into an iframe. */
  }
  return null;
}

export function propertyMedia(room: Property): RentalMedia[] {
  const images = [
    ...new Set(
      [
        room.image,
        ...(room.gallery || "").split("\n").map((x) => x.trim()),
      ].filter(Boolean),
    ),
  ];
  const media: RentalMedia[] = images.map((src, i) => ({
    type: "image",
    src,
    alt: `${room.name} · ${room.isDemo ? "Ảnh nội thất minh họa" : room.imageAlt || "Không gian căn hộ"} ${i + 1}`,
  }));
  const videos = [
    ...(room.videos ?? []).map((src) => ({ src, embed: false })),
    ...[videoSource(room.videoUrl)].filter((v) => v !== null),
  ];
  videos.forEach((video, i) =>
    media.push({
      type: "video",
      ...video,
      alt: `Video giới thiệu ${room.name}${videos.length > 1 ? ` ${i + 1}` : ""}`,
    }),
  );
  return media;
}

/** The photos a card can fade through on hover, besides its own. */
export const hoverPhotos = (property: Property, count = 4) =>
  propertyMedia(property)
    .flatMap((m) => (m.type === "image" ? [m.src] : []))
    .filter((src) => src !== property.image)
    .slice(0, count);

/** Album of the project (Admin › Dự án › Bộ sưu tập ảnh) for each unit type. */
const MODEL_ALBUM: Record<string, string> = {
  "1pn": "Căn 1 phòng ngủ",
  "2pn": "Căn 2 phòng ngủ",
  "2pn-plus": "Căn 2 phòng ngủ",
  "3pn": "Căn 3 phòng ngủ",
};

/**
 * The model-unit photos of a unit with no photos of its own: a cover that is
 * just a project photo (or the placeholder) does not count as its own.
 */
export function modelUnitMedia(
  room: Property,
  own: RentalMedia[],
  projectPhotos: { group: string; image: string }[],
  /** The placeholder and the project's cover. */
  shared: string[],
): RentalMedia[] {
  const notOwn = new Set([...shared, ...projectPhotos.map((p) => p.image)]);
  if (own.some((m) => m.type === "video" || !notOwn.has(m.src))) return [];
  const album = MODEL_ALBUM[room.typeCode ?? ""];
  return projectPhotos
    .filter((photo) => album && photo.group === album)
    .map((photo, i) => ({
      type: "image",
      src: photo.image,
      alt: `${room.name} · Ảnh căn hộ mẫu ${i + 1}`,
    }));
}
