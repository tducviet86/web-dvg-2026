export type AdminDetails = {
  address?: string;
  developer?: string;
  companyRole?: string;
  legalStatus?: string;
  totalArea?: string;
  totalUnits?: string;
  startDate?: string;
  handoverDate?: string;
  mapUrl?: string;
  amenities?: string;
  /** Prices in VND and listing modes (structured data). */
  rentVnd?: number;
  saleVnd?: number;
  forRent?: boolean;
  forSale?: boolean;
  /** Unit amenities as catalogue keys (lib/amenities.ts). */
  amenityKeys?: string[];
  unitCode?: string;
  direction?: string;
  deposit?: string;
  managementFee?: string;
  minimumLease?: string;
  availableFrom?: string;
  contactName?: string;
  contactPhone?: string;
  rentalPolicy?: string;
  author?: string;
  publishDate?: string;
  tags?: string;
  content?: string;
  priority?: string;
  company?: string;
  position?: string;
  interest?: string;
  budgetMin?: string;
  budgetMax?: string;
  preferredLocation?: string;
  preferredContact?: string;
  followUpAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  imageAlt?: string;
  gallery?: string;
  videoUrl?: string;
};
export type Project = AdminDetails & {
  id: string;
  slug: string;
  name: string;
  location: string;
  type: string;
  status: string;
  image: string;
  description: string;
  createdAt: string;
};
export type Property = AdminDetails & {
  isDemo?: boolean;
  projectName?: string;
  projectSlug?: string;
  /** Uploaded MP4/WebM videos (in display order). */
  videos?: string[];
  id: string;
  slug: string;
  name: string;
  projectId: string;
  location: string;
  type: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floor: number;
  furniture: string;
  status: string;
  image: string;
  description: string;
  updatedAt: string;
  /** ISO date the unit was published (newest are listed first). */
  publishedAt?: string;
  /** Badge chosen in Admin (lib/highlights.ts). */
  highlight?: string;
  /** Many visitors looked at or asked about it lately. */
  trending?: boolean;
  /** Views + 5 × enquiries over the last 14 days (server). */
  interestScore?: number;
};
export type Post = AdminDetails & {
  isDemo?: boolean;
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  image: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  readingTime: number;
};
export type Lead = AdminDetails & {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  status: string;
  assignment: string;
  notes: string;
  createdAt: string;
};
/** "Lĩnh vực hoạt động", edited in Admin › Trang nội dung. */
export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Short line under the name in the header menu. */
  summary: string;
  image: string;
  /** Where the card and menu link go (usually /dich-vu/<slug>). */
  href: string;
  inMenu: boolean;
  sections: [heading: string, body: string][];
  seoTitle?: string | null;
  seoDescription?: string | null;
};
export type BannerType = "NORMAL" | "PROJECT";
/**
 * Homepage banner. PROJECT banners are linked by `projectId` only; the
 * detail URL, fallback title and image are resolved from the project at
 * render time so renames and slug changes stay in sync.
 */
export type Banner = {
  id: string;
  type: BannerType;
  label?: string;
  title?: string;
  description?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  imageAlt?: string;
  projectId?: string | null;
  /** PROJECT only: use the project's cover image instead of `imageUrl`. */
  useProjectImage?: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
/** A project as shown in the portfolio pages (homepage, /du-an/*). */
export type PortfolioProject = {
  /** Stable key used for anchors and legacy lookups (e.g. "capital"). */
  id: string;
  slug: string;
  /** Backend project ID. */
  projectId: string;
  name: string;
  group: "development" | "operation";
  categories: string[];
  location: string;
  imageType: string;
  source: string | null;
  /** Fan page of the building, if any. */
  facebook: string | null;
  image: string;
  imageAlt: string;
};
export type ProjectStory = {
  intro: string;
  paragraphs: string[];
  products: string[];
  highlights: { title: string; text: string }[];
};
export type RentalGuide = { intro: string; focus: string; checks: string[] };
export type ProjectLocation = {
  url: string;
  lat: number;
  lng: number;
  label: string;
};
