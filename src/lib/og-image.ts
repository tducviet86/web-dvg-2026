/**
 * Link previews (Facebook, Zalo, WhatsApp, KakaoTalk, LINE, LinkedIn…): the
 * site's photos are WebP, which some apps do not show in a preview. Shared
 * pages point at /og-image.jpg instead, which serves the same photo as a
 * 1200×630 JPEG (app/og-image.jpg/route.ts). The page itself keeps WebP.
 */
export const OG_IMAGE = { path: "/og-image.jpg", width: 1200, height: 630 };

/** Media hosts (R2) from next.config, e.g. "https://media.datvanggroup.vn/". */
const hosts = () =>
  (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "").split(",").filter(Boolean);

/** Photos the JPEG route may read: the site's own files and its media hosts. */
export const isShareablePhoto = (src: string) =>
  (src.startsWith("/images/") && !src.includes("..")) ||
  hosts().some((host) => src.startsWith(host));

/** og:image for a page photo: the JPEG copy when possible, else the photo. */
export const shareImage = (src: string, alt: string) =>
  isShareablePhoto(src)
    ? {
        url: `${OG_IMAGE.path}?src=${encodeURIComponent(src)}`,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        type: "image/jpeg",
        alt,
      }
    : { url: src, alt };
