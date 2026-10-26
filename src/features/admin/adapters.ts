import type { FormValues, Kind, ListItem, MediaRef } from "./model";
import { isVideo, statusLabel } from "./model";
import { highlightLabel, TRENDING_LABEL } from "@/lib/highlights";

/** Admin DTOs as returned by BE-DVG (only the fields the screens use). */
type Image = { id: string; url: string } | null;
export type AdminDto = Record<string, unknown> & {
  id: string;
  updatedAt: string;
};
export type MediaState = {
  cover: MediaRef | null;
  gallery: MediaRef[];
  /** Units only: video path stored before uploads existed; null = removed. */
  videoUrl?: string | null;
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
/** 2.500.000.000 → "2,5 tỷ"; 950.000.000 → "950 triệu". */
function saleText(vnd: string) {
  const n = Number(vnd);
  const fmt = (v: number) =>
    v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  return n >= 1e9 ? `${fmt(n / 1e9)} tỷ` : `${fmt(n / 1e6)} triệu`;
}
/** "32 lượt xem · 2 yêu cầu / 14 ngày" for the unit list. */
function interestText(value: unknown) {
  const i = value as { days: number; views: number; leads: number } | undefined;
  if (!i || (!i.views && !i.leads)) return undefined;
  return `${i.views} lượt xem · ${i.leads} yêu cầu / ${i.days} ngày`;
}
const lines = (v: unknown) => (Array.isArray(v) ? v.join("\n") : "");
const splitLines = (v: unknown) =>
  str(v)
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
const orNull = (v: unknown) => {
  const value = str(v).trim();
  return value === "" ? null : value;
};
const numOrNull = (v: unknown) => {
  const value = str(v).trim();
  return value === "" ? null : Number(value);
};
/** "7.5" (million VND) → "7500000"; empty → null. */
const millionsToVnd = (v: unknown) => {
  const value = str(v).trim();
  return value === "" ? null : String(Math.round(Number(value) * 1_000_000));
};
/** "20.000.000" → "20000000"; empty → null. */
const vnd = (v: unknown) =>
  str(v)
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "") || null;
/** Deposit stored in VND → the "N months of rent" choice (0.5, 1, 2, 3). */
const depositMonths = (deposit: unknown, rent: unknown) => {
  const months = Number(deposit) / Number(rent);
  return deposit && rent && [0.5, 1, 2, 3].includes(months)
    ? String(months)
    : "";
};
const vndToMillions = (v: unknown) =>
  v === null || v === undefined ? "" : String(Number(v) / 1_000_000);
const dateTimeLocal = (iso: unknown) => {
  if (!iso) return "";
  const date = new Date(String(iso));
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};
const fromLocal = (v: unknown) => {
  const value = str(v);
  return value ? new Date(value).toISOString() : null;
};
const image = (v: unknown): MediaRef | null => {
  const media = v as { id?: string; url?: string; mimeType?: string } | null;
  return media?.id && media.url
    ? { id: media.id, url: media.url, mimeType: media.mimeType }
    : null;
};

export const stageOptions: [string, string][] = [
  ["UPCOMING", "Sắp ra mắt"],
  ["UNDER_DEVELOPMENT", "Đang triển khai"],
  ["OPERATING", "Đang khai thác"],
  ["PAUSED", "Tạm ngưng"],
];
export const categoryOptions: [string, string][] = [
  ["development", "Dự án đang triển khai"],
  ["operation", "Dự án đang vận hành"],
  ["sale", "Mua bán"],
  ["rent", "Cho thuê"],
];
export const availabilityOptions: [string, string][] = [
  ["AVAILABLE", "Còn trống"],
  ["RESERVED", "Đã giữ chỗ"],
  ["RENTED", "Đã cho thuê"],
  ["SOLD", "Đã bán"],
  ["MAINTENANCE", "Đang bảo trì"],
];
export const furnishingOptions: [string, string][] = [
  ["FULL", "Đầy đủ nội thất"],
  ["BASIC", "Nội thất cơ bản"],
  ["NONE", "Không nội thất"],
];
export const priorityOptions: [string, string][] = [
  ["NORMAL", "Bình thường"],
  ["HIGH", "Cao"],
  ["LOW", "Thấp"],
];

// ─────────────────────────────── list rows ───────────────────────────────

export function listItem(kind: Kind, d: AdminDto): ListItem {
  const status = str(d.status);
  if (kind === "projects") {
    const banner = d.banner as { isActive: boolean } | null;
    return {
      id: d.id,
      name: str(d.name),
      subtitle: str(d.slug),
      info: str(d.location),
      infoDetail: banner?.isActive ? "● Banner trang chủ" : undefined,
      status,
      statusLabel: statusLabel(kind, status),
    };
  }
  if (kind === "properties") {
    const project = d.project as { name: string };
    const rent = d.forRent ? (d.rentPriceVnd as string | null) : null;
    const sale = d.forSale ? (d.salePriceVnd as string | null) : null;
    return {
      id: d.id,
      name: str(d.name),
      subtitle: str(d.slug),
      info:
        [
          rent && `${Number(rent) / 1_000_000} triệu / tháng`,
          sale && saleText(sale),
        ]
          .filter(Boolean)
          .join(" · ") || "Chưa có giá",
      listing: { rent: !!d.forRent, sale: !!d.forSale },
      infoDetail: [project?.name, interestText(d.interest)]
        .filter(Boolean)
        .join(" · "),
      status,
      statusLabel: statusLabel(kind, status),
      badge:
        [
          d.isDemo && "Căn mẫu",
          highlightLabel(d.highlight as string),
          d.trending && TRENDING_LABEL,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
    };
  }
  if (kind === "pages") {
    const service = d.kind === "SERVICE";
    return {
      id: d.id,
      name: str(d.title),
      subtitle: `/${str(d.path)}`,
      info: service ? "Lĩnh vực hoạt động" : "Trang nội dung",
      infoDetail: service
        ? [d.inMenu ? "● Hiện trên menu" : "", `Thứ tự ${str(d.sortOrder)}`]
            .filter(Boolean)
            .join(" · ")
        : undefined,
      status,
      statusLabel: statusLabel(kind, status),
    };
  }
  if (kind === "jobs") {
    const count = Number(d.applicationCount ?? 0);
    return {
      id: d.id,
      name: str(d.title),
      subtitle: str(d.slug),
      info: `${str(d.department)} · ${str(d.location)}`,
      infoDetail: [
        `${count} hồ sơ`,
        d.deadline
          ? `Hạn ${str(d.deadline).split("-").reverse().join("/")}`
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
      status,
      statusLabel: statusLabel(kind, status),
      badge: status === "PUBLISHED" && !d.isOpen ? "Hết hạn" : undefined,
    };
  }
  if (kind === "posts") {
    const category = d.category as { name: string };
    return {
      id: d.id,
      name: str(d.title),
      subtitle: str(d.slug),
      info: category?.name,
      infoDetail: d.publishedAt
        ? new Date(str(d.publishedAt)).toLocaleDateString("vi-VN")
        : undefined,
      status,
      statusLabel: statusLabel(kind, status),
      badge: d.isDemo ? "Minh họa" : undefined,
    };
  }
  const assignee = d.assignee as { name: string } | null;
  return {
    id: d.id,
    name: str(d.name),
    subtitle: `${str(d.email)} ${str(d.phone)}`.trim(),
    info: str(d.source),
    infoDetail: assignee?.name ?? "Chưa phân công",
    status,
    statusLabel: statusLabel(kind, status),
  };
}

// ────────────────────────────── form values ──────────────────────────────

export function formValues(kind: Kind, d: AdminDto | null): FormValues {
  if (!d) return {};
  if (kind === "projects")
    return {
      name: str(d.name),
      status: str(d.status),
      slug: str(d.slug),
      stage: str(d.stage),
      categories: (d.categories as string[]) ?? [],
      type: str(d.propertyKind),
      sortOrder: str(d.sortOrder),
      location: str(d.location),
      address: str(d.address),
      developer: str(d.developer),
      companyRole: str(d.companyRole),
      legalStatus: str(d.legalStatus),
      totalArea: str(d.totalAreaM2),
      totalUnits: str(d.totalUnits),
      startDate: str(d.startDate),
      handoverDate: str(d.handoverDate),
      mapUrl: str(d.mapUrl),
      facebookUrl: str(d.facebookUrl),
      mapLabel: str(d.mapLabel),
      latitude: str(d.latitude),
      longitude: str(d.longitude),
      amenities: lines(d.amenities),
      description: str(d.intro),
      overview: ((d.overview as string[]) ?? []).join("\n\n"),
      products: lines(d.products),
      highlights: ((d.highlights as { title: string; text: string }[]) ?? [])
        .map((h) => `${h.title} | ${h.text}`)
        .join("\n"),
      rentalIntro: str(d.rentalIntro),
      rentalFocus: str(d.rentalFocus),
      rentalChecks: lines(d.rentalChecks),
      imageCredit: str(d.imageCredit),
      sourceUrl: str(d.sourceUrl),
      seoTitle: str(d.seoTitle),
      seoDescription: str(d.seoDescription),
      imageAlt: str(d.coverImageAlt),
    };
  if (kind === "properties") {
    const type = d.propertyType as { code: string };
    return {
      name: str(d.name),
      status: str(d.status),
      slug: str(d.slug),
      projectId: str(d.projectId),
      unitCode: str(d.unitCode),
      location: str(d.location),
      address: str(d.address),
      type: type?.code,
      area: str(d.areaM2),
      bedrooms: str(d.bedrooms),
      bathrooms: str(d.bathrooms),
      floor: str(d.floor),
      direction: str(d.direction),
      furniture: str(d.furnishing),
      amenities: (d.amenities as string[] | undefined) ?? [],
      availability: str(d.availability),
      forRent: !!d.forRent,
      forSale: !!d.forSale,
      isConsignment: !!d.isConsignment,
      isDemo: !!d.isDemo,
      highlight: str(d.highlight),
      price: str(d.rentPriceVnd),
      salePrice: str(d.salePriceVnd),
      depositMonths: depositMonths(d.depositVnd, d.rentPriceVnd),
      minimumLease: str(d.minimumLeaseMonths),
      availableFrom: str(d.availableFrom),
      contactName: str(d.contactName),
      contactPhone: str(d.contactPhone),
      description: str(d.description),
      seoTitle: str(d.seoTitle),
      seoDescription: str(d.seoDescription),
      imageAlt: str(d.coverImageAlt),
      videoUrl: str(d.videoUrl),
    };
  }
  if (kind === "posts") {
    const category = d.category as { slug: string };
    const tags = (d.tags as { name: string }[]) ?? [];
    return {
      name: str(d.title),
      status: str(d.status),
      slug: str(d.slug),
      category: category?.slug,
      author: str(d.authorName),
      readingTime: str(d.readingMinutes),
      publishDate: dateTimeLocal(d.publishedAt),
      tags: tags.map((t) => t.name).join(", "),
      content: str(d.content),
      description: str(d.excerpt),
      seoTitle: str(d.seoTitle),
      seoDescription: str(d.seoDescription),
      imageAlt: str(d.coverImageAlt),
    };
  }
  if (kind === "pages") {
    const service = d.kind === "SERVICE";
    return {
      name: str(d.title),
      status: str(d.status),
      isService: service,
      // Services: only the part after /dich-vu/ is typed.
      path: service ? str(d.path).replace(/^dich-vu\//, "") : str(d.path),
      eyebrow: str(d.eyebrow),
      description: str(d.intro),
      summary: str(d.summary),
      sections: JSON.stringify(
        (d.sections as { heading: string; body: string }[] | undefined) ?? [],
      ),
      sortOrder: str(d.sortOrder),
      inMenu: !!d.inMenu,
      linkHref: str(d.linkHref),
      seoTitle: str(d.seoTitle),
      seoDescription: str(d.seoDescription),
    };
  }
  if (kind === "jobs")
    return {
      name: str(d.title),
      status: str(d.status),
      slug: str(d.slug),
      department: str(d.department),
      location: str(d.location),
      employmentType: str(d.employmentType),
      salaryMin: str(d.salaryMinVnd),
      salaryMax: str(d.salaryMaxVnd),
      salaryNote: str(d.salaryNote),
      openings: str(d.openings),
      deadline: str(d.deadline),
      summary: str(d.summary),
      description: str(d.description),
      requirements: str(d.requirements),
      benefits: str(d.benefits),
      seoTitle: str(d.seoTitle),
      seoDescription: str(d.seoDescription),
    };
  const assignee = d.assignee as { id: string } | null;
  return {
    name: str(d.name),
    status: str(d.status),
    priority: str(d.priority),
    email: str(d.email),
    phone: str(d.phone),
    company: str(d.company),
    position: str(d.position),
    source: str(d.source),
    interest: str(d.intent),
    budgetMin: vndToMillions(d.budgetMinVnd),
    budgetMax: vndToMillions(d.budgetMaxVnd),
    preferredLocation: str(d.preferredLocation),
    preferredContact: str(d.preferredContact),
    assignment: assignee?.id ?? "",
    followUpAt: dateTimeLocal(d.followUpAt),
    notes: str(d.notes),
    message: str(d.message),
  };
}

export function mediaState(kind: Kind, d: AdminDto | null): MediaState {
  if (!d || kind === "leads") return { cover: null, gallery: [] };
  if (kind === "properties") {
    // One ordered list of images and videos; the cover leads it.
    const cover = image(d.coverImage);
    const gallery = ((d.gallery as Image[]) ?? [])
      .map(image)
      .filter((x): x is MediaRef => !!x);
    const items =
      cover && !gallery.some((g) => g.id === cover.id)
        ? [cover, ...gallery]
        : gallery;
    if (cover)
      items.sort((a, b) =>
        a.id === cover.id ? -1 : b.id === cover.id ? 1 : 0,
      );
    return {
      cover,
      gallery: items,
      videoUrl: (d.videoUrl as string | null) ?? null,
    };
  }
  return {
    cover: image(d.coverImage),
    gallery: ((d.gallery as Image[]) ?? [])
      .map(image)
      .filter((x): x is MediaRef => !!x),
  };
}

// ─────────────────────────────── payloads ────────────────────────────────

/** Builds the API request body from submitted form values. */
export function payload(
  kind: Kind,
  v: FormValues,
  media: MediaState,
  isNew: boolean,
): Record<string, unknown> {
  if (kind === "projects")
    return {
      name: str(v.name).trim(),
      status: v.status || "DRAFT",
      slug: str(v.slug).trim(),
      stage: v.stage || undefined,
      categories: (v.categories as string[]) ?? [],
      propertyKind: orNull(v.type),
      sortOrder: numOrNull(v.sortOrder) ?? 0,
      location: str(v.location).trim(),
      address: orNull(v.address),
      developer: orNull(v.developer),
      companyRole: orNull(v.companyRole),
      legalStatus: orNull(v.legalStatus),
      totalAreaM2: numOrNull(v.totalArea),
      totalUnits: numOrNull(v.totalUnits),
      startDate: orNull(v.startDate),
      handoverDate: orNull(v.handoverDate),
      mapUrl: orNull(v.mapUrl),
      facebookUrl: orNull(v.facebookUrl),
      mapLabel: orNull(v.mapLabel),
      latitude: numOrNull(v.latitude),
      longitude: numOrNull(v.longitude),
      amenities: splitLines(v.amenities),
      intro: str(v.description).trim(),
      overview: str(v.overview)
        .split(/\n\s*\n/)
        .map((x) => x.trim())
        .filter(Boolean),
      products: splitLines(v.products),
      highlights: splitLines(v.highlights).map((line) => {
        const [title, ...text] = line.split("|");
        return { title: title.trim(), text: text.join("|").trim() };
      }),
      rentalIntro: orNull(v.rentalIntro),
      rentalFocus: orNull(v.rentalFocus),
      rentalChecks: splitLines(v.rentalChecks),
      imageCredit: orNull(v.imageCredit),
      sourceUrl: orNull(v.sourceUrl),
      seoTitle: orNull(v.seoTitle),
      seoDescription: orNull(v.seoDescription),
      coverImageId: media.cover?.id ?? null,
      coverImageAlt: orNull(v.imageAlt),
      galleryImageIds: media.gallery.map((m) => m.id),
    };
  if (kind === "properties")
    return {
      name: str(v.name).trim(),
      status: v.status || "DRAFT",
      slug: str(v.slug).trim(),
      projectId: v.projectId,
      propertyType: v.type,
      unitCode: orNull(v.unitCode),
      location: str(v.location).trim(),
      address: orNull(v.address),
      areaM2: Number(v.area),
      bedrooms: Number(v.bedrooms),
      bathrooms: Number(v.bathrooms),
      floor: numOrNull(v.floor),
      direction: orNull(v.direction),
      furnishing: v.furniture || "FULL",
      amenities: (v.amenities as string[] | undefined) ?? [],
      availability: v.availability || "AVAILABLE",
      forRent: !!v.forRent,
      forSale: !!v.forSale,
      isConsignment: !!v.isConsignment,
      isDemo: !!v.isDemo,
      highlight: orNull(v.highlight),
      // Each price only applies to its mode; the deposit is N months of rent.
      rentPriceVnd: v.forRent ? vnd(v.price) : null,
      salePriceVnd: v.forSale ? vnd(v.salePrice) : null,
      depositVnd:
        v.forRent && vnd(v.price) && str(v.depositMonths)
          ? String(Math.round(Number(vnd(v.price)) * Number(v.depositMonths)))
          : null,
      // Each building manages its own fee: not entered per unit.
      managementFeeVnd: null,
      minimumLeaseMonths: v.forRent ? numOrNull(v.minimumLease) : null,
      availableFrom: orNull(v.availableFrom),
      contactName: orNull(v.contactName),
      contactPhone: orNull(v.contactPhone),
      description: str(v.description).trim(),
      seoTitle: orNull(v.seoTitle),
      seoDescription: orNull(v.seoDescription),
      // The first image of the list is the cover; videos stay in the gallery.
      coverImageId: media.gallery.find((m) => !isVideo(m))?.id ?? null,
      coverImageAlt: orNull(v.imageAlt),
      galleryImageIds: media.gallery.map((m) => m.id),
      videoUrl: media.videoUrl ?? null,
    };
  if (kind === "posts")
    return {
      title: str(v.name).trim(),
      status: v.status || "DRAFT",
      slug: str(v.slug).trim(),
      category: v.category,
      authorName: orNull(v.author) ?? undefined,
      readingMinutes: numOrNull(v.readingTime) ?? 5,
      publishedAt: fromLocal(v.publishDate),
      tags: str(v.tags)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      content: str(v.content),
      excerpt: str(v.description).trim(),
      seoTitle: orNull(v.seoTitle),
      seoDescription: orNull(v.seoDescription),
      coverImageId: media.cover?.id ?? null,
      coverImageAlt: orNull(v.imageAlt),
    };
  if (kind === "pages") {
    const service = !!v.isService;
    const path = str(v.path)
      .trim()
      .replace(/^\/+|\/+$/g, "");
    let sections: { heading: string; body: string }[] = [];
    try {
      sections = (
        JSON.parse(str(v.sections) || "[]") as {
          heading: string;
          body: string;
        }[]
      ).filter((s) => s.heading.trim() && s.body.trim());
    } catch {
      /* keep empty */
    }
    return {
      kind: service ? "SERVICE" : "PAGE",
      path: service ? `dich-vu/${path.replace(/^dich-vu\//, "")}` : path,
      title: str(v.name).trim(),
      eyebrow: orNull(v.eyebrow),
      intro: str(v.description).trim(),
      summary: service ? orNull(v.summary) : null,
      sections: sections.map((s) => ({
        heading: s.heading.trim(),
        body: s.body.trim(),
      })),
      coverImageId: media.cover?.id ?? null,
      sortOrder: numOrNull(v.sortOrder) ?? 0,
      inMenu: service && !!v.inMenu,
      linkHref: service ? orNull(v.linkHref) : null,
      status: v.status || "DRAFT",
      seoTitle: orNull(v.seoTitle),
      seoDescription: orNull(v.seoDescription),
    };
  }
  if (kind === "jobs")
    return {
      title: str(v.name).trim(),
      slug: str(v.slug).trim(),
      status: v.status || "DRAFT",
      department: str(v.department).trim(),
      location: str(v.location).trim(),
      employmentType: v.employmentType || "FULL_TIME",
      salaryMinVnd: vnd(v.salaryMin),
      salaryMaxVnd: vnd(v.salaryMax),
      salaryNote: orNull(v.salaryNote),
      openings: numOrNull(v.openings),
      deadline: orNull(v.deadline),
      summary: str(v.summary).trim(),
      description: str(v.description).trim(),
      requirements: str(v.requirements).trim(),
      benefits: str(v.benefits).trim(),
      seoTitle: orNull(v.seoTitle),
      seoDescription: orNull(v.seoDescription),
    };
  // Leads: customer-submitted fields are read-only once stored.
  const tracking = {
    status: v.status || "NEW",
    priority: v.priority || "NORMAL",
    company: orNull(v.company),
    position: orNull(v.position),
    budgetMinVnd: millionsToVnd(v.budgetMin),
    budgetMaxVnd: millionsToVnd(v.budgetMax),
    preferredLocation: orNull(v.preferredLocation),
    preferredContact: orNull(v.preferredContact),
    assigneeId: orNull(v.assignment),
    followUpAt: fromLocal(v.followUpAt),
    notes: orNull(v.notes),
  };
  if (!isNew) return tracking;
  return {
    kind: v.kind === "CONTACT" ? "CONTACT" : "INQUIRY",
    name: str(v.name).trim(),
    email: str(v.email).trim(),
    phone: orNull(v.phone),
    message: str(v.message).trim(),
    source: str(v.source).trim(),
    intent: orNull(v.interest),
  };
}
