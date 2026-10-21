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
};
export type Post = AdminDetails & {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  image: string;
  description: string;
  status: string;
  createdAt: string;
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
export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
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
