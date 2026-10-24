import { cache } from "react";
import type {
  PortfolioProject,
  Post,
  Project,
  ProjectLocation,
  ProjectStory,
  Property,
  RentalGuide,
} from "@/types";
import type { ResolvedBanner } from "@/lib/banners";
import { apiGet, apiGetAll, apiLookup, type Lookup } from "./server";
import type {
  ApiBanner,
  ApiBlogCategory,
  ApiPage,
  ApiPost,
  ApiPostSummary,
  ApiProject,
  ApiProperty,
  ApiSitemap,
  Availability,
  Furnishing,
  ProjectStage,
} from "./types";

// ───────────── adapters: API DTO → shapes the components render ─────────────

export const stageLabels: Record<ProjectStage, string> = {
  UPCOMING: "Sắp ra mắt",
  UNDER_DEVELOPMENT: "Đang triển khai",
  OPERATING: "Đang khai thác",
  PAUSED: "Tạm ngưng",
};
export const availabilityLabels: Record<Availability, string> = {
  AVAILABLE: "Còn trống",
  RESERVED: "Đã giữ chỗ",
  RENTED: "Đã cho thuê",
  SOLD: "Đã bán",
  MAINTENANCE: "Đang bảo trì",
};
export const furnishingLabels: Record<Furnishing, string> = {
  FULL: "Đầy đủ nội thất",
  BASIC: "Nội thất cơ bản",
  NONE: "Không nội thất",
};
const FALLBACK_IMAGE = "/images/img1.png";
/** "20000000" → "20.000.000 đ". */
const vndText = (vnd: string) =>
  `${vnd.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} đ`;
/** Deposit as months of rent when it matches ("1 tháng tiền nhà · 20.000.000 đ"). */
function depositText(deposit: string | null, rent: string | null) {
  if (!deposit) return undefined;
  const months = rent ? Number(deposit) / Number(rent) : 0;
  const label =
    months === 0.5
      ? "Nửa tháng tiền nhà"
      : [1, 2, 3].includes(months)
        ? `${months} tháng tiền nhà`
        : "";
  return label ? `${label} · ${vndText(deposit)}` : vndText(deposit);
}
const millions = (vnd: string | null) =>
  vnd === null ? 0 : Number(vnd) / 1_000_000;
const date = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export function toProject(p: ApiProject): Project {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    location: p.location,
    type: p.propertyKind || "Bất động sản",
    status: stageLabels[p.stage],
    image: p.coverImage?.url || FALLBACK_IMAGE,
    imageAlt: p.coverImage?.alt,
    description: p.intro,
    createdAt: date(p.publishedAt),
    address: p.address ?? undefined,
    developer: p.developer ?? undefined,
    seoTitle: p.seo.title ?? undefined,
    seoDescription: p.seo.description ?? undefined,
  };
}

export function toPortfolio(p: ApiProject): PortfolioProject {
  return {
    id: p.legacyKey || p.slug,
    slug: p.slug,
    projectId: p.id,
    name: p.name,
    group: p.categories.includes("development") ? "development" : "operation",
    categories: p.categories,
    location: p.location,
    imageType: p.imageCredit || "Hình ảnh dự án",
    source: p.sourceUrl,
    facebook: p.facebookUrl ?? null,
    image: p.coverImage?.url || FALLBACK_IMAGE,
    imageAlt: p.coverImage?.alt || `${p.imageCredit || "Hình ảnh"} ${p.name}`,
  };
}

/**
 * Older API versions omit `mimeType`; fall back to the file extension so a
 * missing field never breaks rendering.
 */
const isVideoMedia = (m: { url: string; mimeType?: string | null }) =>
  m.mimeType
    ? m.mimeType.startsWith("video/")
    : /\.(mp4|webm|mov)(\?|$)/i.test(m.url);

export function toProperty(p: ApiProperty): Property {
  return {
    isDemo: p.isDemo,
    id: p.id,
    slug: p.slug,
    name: p.name,
    projectId: p.project.id,
    projectName: p.project.name,
    projectSlug: p.project.slug,
    location: p.location,
    type: p.propertyType.name,
    price: millions(p.rentPriceVnd),
    rentVnd: p.rentPriceVnd ? Number(p.rentPriceVnd) : undefined,
    saleVnd: p.salePriceVnd ? Number(p.salePriceVnd) : undefined,
    forRent: p.forRent,
    forSale: p.forSale,
    address: p.address ?? undefined,
    area: p.areaM2,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    floor: p.floor ?? 0,
    furniture: furnishingLabels[p.furnishing],
    status: availabilityLabels[p.availability],
    image: p.coverImage?.url || FALLBACK_IMAGE,
    imageAlt: p.coverImage?.alt,
    gallery: p.gallery
      .filter((g) => !isVideoMedia(g))
      .map((g) => g.url)
      .join("\n"),
    videos: p.gallery.filter(isVideoMedia).map((g) => g.url),
    videoUrl: p.videoUrl ?? undefined,
    description: p.description,
    updatedAt: date(p.updatedAt),
    publishedAt: p.publishedAt ?? undefined,
    highlight: p.highlight ?? undefined,
    trending: !!p.trending,
    unitCode: p.unitCode ?? undefined,
    direction: p.direction ?? undefined,
    deposit: depositText(p.depositVnd, p.rentPriceVnd),
    managementFee: p.managementFeeVnd
      ? `${vndText(p.managementFeeVnd)} / tháng`
      : undefined,
    minimumLease: p.minimumLeaseMonths
      ? `${p.minimumLeaseMonths} tháng`
      : undefined,
    availableFrom: p.availableFrom ?? undefined,
    contactName: p.contactName ?? undefined,
    contactPhone: p.contactPhone ?? undefined,
    rentalPolicy: p.rentalPolicy ?? undefined,
    amenities: p.amenities.join("\n") || undefined,
    amenityKeys: p.amenities,
    seoTitle: p.seo.title ?? undefined,
    seoDescription: p.seo.description ?? undefined,
  };
}

export function toPost(p: ApiPostSummary & Partial<ApiPost>): Post {
  return {
    id: p.id,
    slug: p.slug,
    name: p.title,
    category: p.category.name,
    categorySlug: p.category.slug,
    image: p.coverImage?.url || FALLBACK_IMAGE,
    imageAlt: p.coverImage?.alt,
    description: p.excerpt,
    status: "Đã xuất bản",
    createdAt: date(p.publishedAt),
    updatedAt: date(p.updatedAt),
    readingTime: p.readingMinutes,
    content: p.content,
    author: p.authorName,
    tags: p.tags.map((t) => t.name).join(", "),
    isDemo: p.isDemo,
    seoTitle: p.seo?.title ?? undefined,
    seoDescription: p.seo?.description ?? undefined,
  };
}

export function toSlide(b: ApiBanner): ResolvedBanner | null {
  if (!b.image) return null;
  return {
    id: b.id,
    type: b.type,
    label: b.label || "",
    title: b.title,
    description: b.description || undefined,
    image: b.image.url,
    mobileImage: b.mobileImage?.url,
    alt: b.image.alt || b.title,
    href: b.href || undefined,
    projectName: b.projectName || undefined,
  };
}

// ───────────── loaders (deduplicated per request, cached by tag) ─────────────

/** Stories, rental guides and map pins keyed the way components look them up. */
function indexProjects(apiProjects: ApiProject[]) {
  const stories: Record<string, ProjectStory> = {};
  const rentalGuides: Record<string, RentalGuide> = {};
  const locations: Record<string, ProjectLocation> = {};
  for (const p of apiProjects) {
    stories[p.legacyKey || p.slug] = {
      intro: p.intro,
      paragraphs: p.overview,
      products: p.products,
      highlights: p.highlights,
    };
    if (p.rentalGuide)
      rentalGuides[p.slug] = {
        intro: p.rentalGuide.intro,
        focus: p.rentalGuide.focus || `Thuê căn hộ ${p.name}`,
        checks: p.rentalGuide.checks,
      };
    if (p.map?.url && p.map.lat !== null && p.map.lng !== null)
      locations[p.id] = {
        url: p.map.url,
        lat: p.map.lat,
        lng: p.map.lng,
        label: p.map.label || p.name,
      };
  }
  return { stories, rentalGuides, locations };
}

/** Every public project and unit, adapted for the portfolio components. */
export const getSiteContent = cache(async () => {
  const [apiProjects, apiProperties] = await Promise.all([
    apiGetAll<ApiProject>("/projects", ["projects"]),
    apiGetAll<ApiProperty>("/properties", ["properties", "projects"]),
  ]);
  return {
    apiProjects,
    projects: apiProjects.map(toProject),
    portfolio: apiProjects.map(toPortfolio),
    ...indexProjects(apiProjects),
    properties: apiProperties.map(toProperty),
  };
});
export type SiteContent = Awaited<ReturnType<typeof getSiteContent>>;

export const getPosts = cache(async () =>
  (await apiGetAll<ApiPostSummary>("/blog", ["blog"])).map(toPost),
);
export const getBlogCategories = cache(
  async () =>
    (await apiGet<{ data: ApiBlogCategory[] }>("/blog/categories", ["blog"]))
      .data,
);
export const getPost = cache(async (slug: string): Promise<Lookup<Post>> => {
  const res = await apiLookup<ApiPost>(`/blog/${encodeURIComponent(slug)}`, [
    "blog",
  ]);
  return res.kind === "ok" ? { kind: "ok", data: toPost(res.data) } : res;
});
export const getProjectLookup = cache((slug: string) =>
  apiLookup<ApiProject>(`/projects/${encodeURIComponent(slug)}`, ["projects"]),
);
export const getPropertyLookup = cache((slug: string) =>
  apiLookup<ApiProperty>(`/properties/${encodeURIComponent(slug)}`, [
    "properties",
    "projects",
  ]),
);
export const getPage = cache(async (path: string) => {
  const res = await apiLookup<ApiPage>(`/pages/${path}`, ["pages"]);
  return res.kind === "ok" ? res.data : null;
});
export const getBanners = cache(async () =>
  (
    await apiGet<{ data: ApiBanner[] }>("/banners", ["banners", "projects"])
  ).data
    .map(toSlide)
    .filter((b): b is ResolvedBanner => !!b),
);
export const getPublicSettings = cache(
  async () =>
    (
      await apiGet<{ data: Record<string, string> }>("/settings/public", [
        "settings",
      ])
    ).data,
);
export const getSitemap = cache(
  async () =>
    (
      await apiGet<{ data: ApiSitemap }>("/sitemap", [
        "projects",
        "properties",
        "blog",
        "pages",
      ])
    ).data,
);

/** Adds a (possibly unpublished) project to the content, for previews. */
export function withProject(
  content: SiteContent,
  project: ApiProject,
): SiteContent {
  const others = content.apiProjects.filter((p) => p.id !== project.id);
  const apiProjects = [...others, project];
  return {
    ...content,
    apiProjects,
    projects: apiProjects.map(toProject),
    portfolio: apiProjects.map(toPortfolio),
    ...indexProjects(apiProjects),
  };
}
