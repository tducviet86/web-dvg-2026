import type { MetadataRoute } from "next";
import { projects, properties, posts, services } from "@/data";
import { staticPages } from "@/lib/pages";
import { siteUrl } from "@/lib/utils";
import { homeProjects } from "@/data/home-projects";
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
    ...homeProjects
      .filter((p) => p.group === "operation")
      .map((p) => `cho-thue/du-an/${p.slug}`),
    ...properties.filter((p) => !p.isDemo).map((p) => `cho-thue/${p.slug}`),
    ...posts.map((p) => `blog/${p.slug}`),
    ...services.map((p) => `dich-vu/${p.slug}`),
    ...new Set(posts.map((p) => `blog/danh-muc/${p.categorySlug}`)),
  ].map((path) => ({
    url: `${siteUrl}/${path}`,
    lastModified: "2026-10-20",
    changeFrequency: "monthly",
    priority: path ? 0.7 : 1,
  }));
}
