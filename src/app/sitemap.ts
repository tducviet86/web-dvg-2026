import type { MetadataRoute } from "next";
import { services } from "@/data";
import { getSitemap } from "@/lib/api/content";
import { siteUrl } from "@/lib/utils";
import { HTML_LANG, LOCALES, localizeHref } from "@/i18n/config";

// Built per request from cached API data, so new or unpublished content is
// reflected as soon as the CMS revalidates (no rebuild needed).
export const revalidate = 0;

type Entry = { path: string; lastModified?: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemap();
  const latest = (dates: string[]) => dates.sort().at(-1);
  const entries: Entry[] = [
    { path: "", lastModified: latest(data.projects.map((p) => p.updatedAt)) },
    { path: "du-an" },
    { path: "du-an/trien-khai" },
    { path: "du-an/van-hanh" },
    { path: "cho-thue" },
    { path: "blog", lastModified: latest(data.posts.map((p) => p.updatedAt)) },
    { path: "dich-vu" },
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
    ...data.properties.map((p) => ({
      path: `cho-thue/${p.slug}`,
      lastModified: p.updatedAt,
    })),
    ...data.posts.map((p) => ({
      path: `blog/${p.slug}`,
      lastModified: p.updatedAt,
    })),
    ...data.blogCategories.map((slug) => ({ path: `blog/danh-muc/${slug}` })),
    ...services.map((s) => ({ path: `dich-vu/${s.slug}` })),
  ];
  // Every page in each language, each listing its translations (hreflang).
  return entries.flatMap(({ path, lastModified }) => {
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
