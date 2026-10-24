/**
 * schema.org structured data (JSON-LD) telling search engines what a page is:
 * the company as a local real-estate agent, a building (ApartmentComplex) and
 * a unit for rent or sale (Apartment + Offer). Only facts stored in the CMS
 * are used; anything missing is left out rather than guessed.
 */
import type { ApiProject } from "@/lib/api/types";
import type { Property } from "@/types";
import { amenityOf } from "@/lib/amenities";
import {
  companyFacebook,
  companyHotline,
  zaloHref,
} from "@/lib/company-contact";
import { siteUrl } from "@/lib/utils";

export const ORGANIZATION_ID = `${siteUrl}/#organization`;
const absolute = (src: string) =>
  /^https?:\/\//.test(src)
    ? src
    : `${siteUrl}${src.startsWith("/") ? "" : "/"}${src}`;
/** Drops undefined/empty values so the JSON stays clean. */
function clean<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, v]) =>
        v !== undefined &&
        v !== null &&
        v !== "" &&
        !(Array.isArray(v) && v.length === 0),
    ),
  ) as T;
}
/** The same object without "@context", for use inside an "@graph". */
export const graphNode = (value: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(value).filter(([k]) => k !== "@context"));
/** Safe inside <script>: "</script>" in content cannot close the tag. */
export const jsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

/* ── Opening hours: "T2–T7 8:00–18:00" → "Mo-Sa 08:00-18:00" ─────────── */
const DAY: Record<string, string> = {
  "2": "Mo",
  "3": "Tu",
  "4": "We",
  "5": "Th",
  "6": "Fr",
  "7": "Sa",
  cn: "Su",
};
function dayCode(raw: string) {
  const v = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "");
  if (/^(cn|chunhat)$/.test(v)) return "Su";
  const n = v.match(/^(?:t|thu)([2-7])$/);
  return n ? DAY[n[1]] : undefined;
}
const time = (h: string, m = "00") =>
  `${h.padStart(2, "0")}:${m.padEnd(2, "0")}`;
/**
 * Reads the "Giờ làm việc" setting. Understands e.g. "T2–T7 8:00–18:00",
 * "Thứ 2 - Chủ nhật: 8h - 20h", "8:00-20:00" (every day) and several groups
 * separated by ";" or ",". Returns undefined when it cannot be sure.
 */
export function openingHours(text?: string): string[] | undefined {
  if (!text?.trim()) return undefined;
  const out: string[] = [];
  const day = String.raw`(?:cn|ch[uủ]\s*nh[aậ]t|t(?:h[uứ])?\s*[2-7])`;
  const pattern = new RegExp(
    String.raw`^(?:(${day})(?:\s*[–—-]\s*(${day}))?\s*:?\s*)?(\d{1,2})(?:[:h.](\d{2}))?\s*h?\s*[–—-]\s*(\d{1,2})(?:[:h.](\d{2}))?\s*h?$`,
    "i",
  );
  for (const part of text.split(/[;,\n]/)) {
    const m = part.trim().match(pattern);
    if (!m) continue;
    const [, from, to, h1, m1, h2, m2] = m;
    const days = from
      ? to
        ? `${dayCode(from)}-${dayCode(to)}`
        : `${dayCode(from)}`
      : "Mo-Su";
    if (days.includes("undefined")) continue;
    out.push(`${days} ${time(h1, m1)}-${time(h2, m2)}`);
  }
  return out.length ? out : undefined;
}

/* ── The company ──────────────────────────────────────────────────────── */
export function agentSchema(settings: Record<string, string>) {
  const address = settings["company.address"]?.trim();
  return clean({
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": ORGANIZATION_ID,
    name: settings["company.brand"] || "Đất Vàng Group",
    legalName: settings["company.legalName"],
    url: siteUrl,
    logo: `${siteUrl}/images/dat-vang-group-logo-transparent.png`,
    image: `${siteUrl}/images/dat-vang-group-logo-transparent.png`,
    telephone: settings["company.hotline"] || companyHotline,
    email: settings["company.email"],
    taxID: settings["company.taxCode"],
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address,
          addressLocality: "Đà Nẵng",
          addressRegion: "Đà Nẵng",
          addressCountry: "VN",
        }
      : undefined,
    areaServed: { "@type": "City", name: "Đà Nẵng" },
    openingHours: openingHours(settings["company.workingHours"]),
    sameAs: [
      settings["social.facebook"] || companyFacebook,
      settings["social.zalo"] || zaloHref(),
      settings["social.youtube"],
    ].filter(Boolean),
  });
}

/* ── A building ───────────────────────────────────────────────────────── */
function postalAddress(project: Pick<ApiProject, "address" | "location">) {
  return clean({
    "@type": "PostalAddress",
    streetAddress: project.address || project.location,
    addressLocality: "Đà Nẵng",
    addressCountry: "VN",
  });
}
export function complexSchema(
  project: ApiProject,
  path: string,
  units: number,
  describe: (text: string) => string = (t) => t,
) {
  const url = `${siteUrl}${path}`;
  return clean({
    "@context": "https://schema.org",
    "@type": "ApartmentComplex",
    "@id": `${url}#complex`,
    name: project.name,
    description: describe(project.intro),
    url,
    image: [project.coverImage?.url, ...project.gallery.map((g) => g.url)]
      .filter((src): src is string => !!src)
      .slice(0, 6)
      .map(absolute),
    address: postalAddress(project),
    geo:
      project.map?.lat != null && project.map.lng != null
        ? {
            "@type": "GeoCoordinates",
            latitude: project.map.lat,
            longitude: project.map.lng,
          }
        : undefined,
    hasMap: project.map?.url ?? undefined,
    amenityFeature: project.amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name: describe(name),
      value: true,
    })),
    numberOfAvailableAccommodationUnits: units || undefined,
    sameAs: project.facebookUrl ? [project.facebookUrl] : undefined,
  });
}

/* ── A unit ───────────────────────────────────────────────────────────── */
export function apartmentSchema(
  room: Property,
  project: ApiProject | undefined,
  path: string,
  images: string[],
  describe: (text: string) => string = (t) => t,
) {
  const url = `${siteUrl}${path}`;
  const available = room.status === "Còn trống";
  const offers = [
    room.forRent && room.rentVnd
      ? clean({
          "@type": "Offer",
          businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
          price: room.rentVnd,
          priceCurrency: "VND",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: room.rentVnd,
            priceCurrency: "VND",
            unitCode: "MON",
            referenceQuantity: {
              "@type": "QuantitativeValue",
              value: 1,
              unitCode: "MON",
            },
          },
          availability: available
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          availabilityStarts: room.availableFrom,
          url,
          seller: { "@id": ORGANIZATION_ID },
        })
      : undefined,
    room.forSale && room.saleVnd
      ? clean({
          "@type": "Offer",
          businessFunction: "http://purl.org/goodrelations/v1#Sell",
          price: room.saleVnd,
          priceCurrency: "VND",
          availability: available
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url,
          seller: { "@id": ORGANIZATION_ID },
        })
      : undefined,
  ].filter(Boolean);
  return clean({
    "@context": "https://schema.org",
    "@type": "Apartment",
    "@id": `${url}#apartment`,
    name: describe(room.name),
    description: describe(room.description).slice(0, 1000),
    url,
    identifier: room.unitCode,
    image: images.slice(0, 8).map(absolute),
    numberOfRooms: Math.max(1, room.bedrooms),
    numberOfBedrooms: room.bedrooms,
    numberOfBathroomsTotal: room.bathrooms,
    floorSize: {
      "@type": "QuantitativeValue",
      value: room.area,
      unitCode: "MTK",
    },
    floorLevel: room.floor ? String(room.floor) : undefined,
    amenityFeature: (room.amenityKeys ?? [])
      .map((key) => amenityOf(key)?.label ?? key)
      .map((name) => ({
        "@type": "LocationFeatureSpecification",
        name: describe(name),
        value: true,
      })),
    address: project ? postalAddress(project) : undefined,
    containedInPlace: project
      ? {
          "@type": "ApartmentComplex",
          "@id": `${siteUrl}/du-an/${project.slug}#complex`,
          name: project.name,
        }
      : undefined,
    offers: offers.length === 1 ? offers[0] : offers,
  });
}
