import type { MetadataRoute } from "next";
import { projects, properties, posts, services } from "@/data";
import { staticPages } from "@/lib/pages";
import { siteUrl } from "@/lib/utils";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "du-an",
    "du-an/trien-khai",
    "du-an/van-hanh",
    "cho-thue",
    "blog",
    "dich-vu",
    ...Object.keys(staticPages),
    ...projects.map((p) => `du-an/${p.slug}`),
    ...properties.map((p) => `cho-thue/${p.slug}`),
    ...posts.map((p) => `blog/${p.slug}`),
    ...services.map((p) => `dich-vu/${p.slug}`),
    ...new Set(posts.map((p) => `blog/danh-muc/${p.categorySlug}`)),
  ].map((path) => ({
    url: `${siteUrl}/${path}`,
    lastModified: "2026-10-14",
    changeFrequency: "monthly",
    priority: path ? 0.7 : 1,
  }));
}
