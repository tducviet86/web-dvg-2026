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

/** next/image can only optimise local files and allow-listed hosts. */
export const canOptimizeImage = (src: string) =>
  (src.startsWith("/") && !src.startsWith("//")) ||
  src.startsWith("https://images.unsplash.com/");
