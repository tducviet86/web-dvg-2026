/** A homepage slide as resolved by the banner API. */
export type ResolvedBanner = {
  id: string;
  type: "NORMAL" | "PROJECT";
  label: string;
  title: string;
  description?: string;
  image: string;
  mobileImage?: string;
  alt: string;
  /** Only set for PROJECT banners whose project is public. */
  href?: string;
  projectName?: string;
};

/** Media hosts allowed in next.config (MEDIA_REMOTE_PATTERNS), e.g. R2. */
const IMAGE_HOSTS = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "")
  .split(",")
  .filter(Boolean);
/**
 * next/image can only optimise local files and allow-listed hosts; those are
 * resized for each screen (a phone gets a ~60 KB banner, not the 600 KB
 * upload). Anything else is shown as is.
 */
export const canOptimizeImage = (src: string) =>
  (src.startsWith("/") && !src.startsWith("//")) ||
  src.startsWith("https://images.unsplash.com/") ||
  IMAGE_HOSTS.some((host) => src.startsWith(host));
