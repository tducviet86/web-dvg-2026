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
