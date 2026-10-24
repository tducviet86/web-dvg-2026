/** Response contracts of BE-DVG (`/api/v1`). Mirrors docs/API-CONTRACT.md. */
export type ApiImage = {
  id: string;
  url: string;
  /** Absent on older API versions. */
  mimeType?: string;
  alt: string;
  width: number | null;
  height: number | null;
};
export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};
export type PublishStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ProjectStage =
  "UPCOMING" | "UNDER_DEVELOPMENT" | "OPERATING" | "PAUSED";

export type ApiProject = {
  id: string;
  slug: string;
  legacyKey: string | null;
  name: string;
  stage: ProjectStage;
  categories: string[];
  propertyKind: string | null;
  location: string;
  address: string | null;
  intro: string;
  overview: string[];
  products: string[];
  developer: string | null;
  companyRole: string | null;
  legalStatus: string | null;
  totalAreaM2: number | null;
  totalUnits: number | null;
  startDate: string | null;
  handoverDate: string | null;
  map: {
    url: string | null;
    label: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  coverImage: ApiImage | null;
  imageCredit: string | null;
  sourceUrl: string | null;
  /** Fan page of the building (operated projects). */
  facebookUrl?: string | null;
  gallery: ApiImage[];
  amenities: string[];
  highlights: { title: string; text: string }[];
  rentalGuide: { intro: string; focus: string | null; checks: string[] } | null;
  seo: { title: string | null; description: string | null };
  publishedAt: string | null;
  updatedAt: string;
};

export type Availability =
  "AVAILABLE" | "RESERVED" | "RENTED" | "SOLD" | "MAINTENANCE";
export type Furnishing = "FULL" | "BASIC" | "NONE";
export type ApiProperty = {
  id: string;
  slug: string;
  name: string;
  project: { id: string; slug: string; name: string };
  propertyType: { code: string; name: string };
  unitCode: string | null;
  forRent: boolean;
  forSale: boolean;
  isConsignment: boolean;
  availability: Availability;
  isDemo: boolean;
  location: string;
  address: string | null;
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  floor: number | null;
  direction: string | null;
  furnishing: Furnishing;
  rentPriceVnd: string | null;
  salePriceVnd: string | null;
  depositVnd: string | null;
  managementFeeVnd: string | null;
  minimumLeaseMonths: number | null;
  availableFrom: string | null;
  contactName: string | null;
  contactPhone: string | null;
  rentalPolicy: string | null;
  description: string;
  coverImage: ApiImage | null;
  gallery: ApiImage[];
  amenities: string[];
  videoUrl: string | null;
  seo: { title: string | null; description: string | null };
  /** Editor badge: hot | exclusive | rare | good-price. */
  highlight?: string | null;
  /** Many recent views/enquiries (computed by the server). */
  trending?: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export type ApiPostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: { slug: string; name: string };
  tags: { slug: string; name: string }[];
  authorName: string;
  readingMinutes: number;
  isDemo: boolean;
  coverImage: ApiImage | null;
  publishedAt: string | null;
  updatedAt: string;
};
export type ApiPost = ApiPostSummary & {
  content: string;
  seo: { title: string | null; description: string | null };
};
export type ApiBlogCategory = {
  slug: string;
  name: string;
  description: string | null;
  postCount: number;
};

export type ApiBanner = {
  id: string;
  type: "NORMAL" | "PROJECT";
  label: string | null;
  title: string;
  description: string | null;
  image: ApiImage | null;
  mobileImage: ApiImage | null;
  href: string | null;
  projectName: string | null;
};

export type ApiPage = {
  id: string;
  path: string;
  title: string;
  eyebrow: string | null;
  intro: string;
  sections: { heading: string; body: string }[];
  seo: { title: string | null; description: string | null };
  updatedAt: string;
};

export type ApiSitemap = {
  projects: { slug: string; updatedAt: string; categories: string[] }[];
  properties: { slug: string; updatedAt: string }[];
  posts: { slug: string; updatedAt: string }[];
  blogCategories: string[];
  pages: { path: string; updatedAt: string }[];
};
