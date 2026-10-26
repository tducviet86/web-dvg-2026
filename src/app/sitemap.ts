import type { MetadataRoute } from "next";
import { getSitemap, getSiteContent } from "@/lib/api/content";
import { siteUrl } from "@/lib/utils";
import { HTML_LANG, LOCALES, localizeHref } from "@/i18n/config";

// Built per request from cached API data, so new or unpublished content is
// reflected as soon as the CMS revalidates (no rebuild needed).
export const revalidate = 0;

type Entry = { path: string; lastModified?: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [data, { properties }] = await Promise.all([
    getSitemap(),
    getSiteContent(),
  ]);
  const units = new Map(properties.map((p) => [p.slug, p]));
  const latest = (dates: string[]) => dates.sort().at(-1);
  const entries: Entry[] = [
    { path: "", lastModified: latest(data.projects.map((p) => p.updatedAt)) },
    { path: "du-an" },
    { path: "du-an/trien-khai" },
    { path: "du-an/van-hanh" },
    { path: "cho-thue" },
    { path: "blog", lastModified: latest(data.posts.map((p) => p.updatedAt)) },
    { path: "dich-vu" },
    { path: "tuyen-dung" },
    ...data.pages.map((p) => ({ path: p.path, lastModified: p.updatedAt })),
    ...data.projects.map((p) => ({
      path: `du-an/${p.slug}`,
      lastModified: p.updatedAt,
    })),
    ...data.projects
      .filter((p) => p.categories.includes("rent"))
      .map((p) => ({
        path: `cho-thue/du-an/${p.slug}`,
        lastModified: p.updatedAt,
      })),
    // Units under the listing they are offered in (rent, sale or both).
    ...data.properties
      .filter((p) => units.get(p.slug)?.forRent !== false)
      .map((p) => ({ path: `cho-thue/${p.slug}`, lastModified: p.updatedAt })),
    ...data.properties
      .filter((p) => units.get(p.slug)?.forSale)
      .map((p) => ({ path: `mua-ban/${p.slug}`, lastModified: p.updatedAt })),
    ...data.posts.map((p) => ({
      path: `blog/${p.slug}`,
      lastModified: p.updatedAt,
    })),
    ...data.blogCategories.map((slug) => ({ path: `blog/danh-muc/${slug}` })),
    ...(data.jobs ?? []).map((j) => ({
      path: `tuyen-dung/${j.slug}`,
      lastModified: j.updatedAt,
    })),
  ];
  // "tuyen-dung" is also a CMS page: list each URL once.
  const seen = new Set<string>();
  const unique = entries.filter((e) => !seen.has(e.path) && !!seen.add(e.path));
  // Every page in each language, each listing its translations (hreflang).
  return unique.flatMap(({ path, lastModified }) => {
    const languages = Object.fromEntries(
      LOCALES.map((l) => [
        HTML_LANG[l],
        `${siteUrl}${localizeHref(`/${path}`, l)}`,
      ]),
    );
    return LOCALES.map((locale) => ({
      url:
        `${siteUrl}${localizeHref(`/${path}`, locale)}`.replace(/\/$/, "") ||
        siteUrl,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly" as const,
      priority: path ? 0.7 : locale === "vi" ? 1 : 0.9,
      alternates: {
        languages: { ...languages, "x-default": `${siteUrl}/${path}` },
      },
    }));
  });
}
