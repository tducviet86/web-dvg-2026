import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { OG_IMAGE, isShareablePhoto } from "@/lib/og-image";

/**
 * /og-image.jpg?src=<photo>: a site photo as a 1200×630 JPEG for link
 * previews (lib/og-image.ts). Only the site's own photos are read; the
 * result is cached for a year (photo addresses change with every upload).
 */
const MAX_BYTES = 20_000_000;

async function load(src: string): Promise<Buffer | null> {
  if (!isShareablePhoto(src)) return null;
  if (src.startsWith("/"))
    return readFile(join(process.cwd(), "public", src)).catch(() => null);
  const res = await fetch(src, { signal: AbortSignal.timeout(10_000) }).catch(
    () => null,
  );
  if (!res?.ok || Number(res.headers.get("content-length") ?? 0) > MAX_BYTES)
    return null;
  return Buffer.from(await res.arrayBuffer());
}

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src") ?? "";
  const photo = await load(src);
  const jpeg =
    photo &&
    (await sharp(photo)
      .rotate()
      .resize(OG_IMAGE.width, OG_IMAGE.height, { fit: "cover" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer()
      .catch(() => null));
  if (!jpeg) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
