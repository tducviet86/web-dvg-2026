import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { projects, properties, posts, services } from "@/data";
import { staticPages } from "@/lib/pages";
import {
  ListingPage,
  DetailPage,
  EditorialPage,
  ServiceDetail,
  ArticlePage,
} from "@/components/public-pages";
import { siteUrl } from "@/lib/utils";
type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function resolve(slug: string[]) {
  const path = slug.join("/");
  if (staticPages[path])
    return {
      title: staticPages[path].title,
      description: staticPages[path].intro,
    };
  const lists: Record<string, string> = {
    "du-an": "Dự án bất động sản",
    "cho-thue": "Căn hộ cho thuê tại Đà Nẵng",
    blog: "Góc nhìn & cảm hứng",
    "dich-vu": "Giải pháp bất động sản",
  };
  if (lists[path])
    return {
      title: lists[path],
      description: `Khám phá ${lists[path].toLowerCase()} cùng Đất Vàng Group. Nội dung và dữ liệu minh họa trong bản demo.`,
    };
  if (slug[0] === "blog" && slug[1] === "danh-muc" && slug.length === 3) {
    const post = posts.find((p) => p.categorySlug === slug[2]);
    return post
      ? {
          title: post.category,
          description: `Các bài viết minh họa về ${post.category.toLowerCase()} dành cho người thuê và chủ sở hữu.`,
        }
      : null;
  }
  if (slug.length !== 2) return null;
  const item =
    slug[0] === "du-an"
      ? projects.find((x) => x.slug === slug[1])
      : slug[0] === "cho-thue"
        ? properties.find((x) => x.slug === slug[1])
        : slug[0] === "blog"
          ? posts.find((x) => x.slug === slug[1])
          : slug[0] === "dich-vu"
            ? services.find((x) => x.slug === slug[1])
            : undefined;
  return item
    ? { title: item.name, description: item.description, image: item.image }
    : null;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = resolve(slug);
  if (!item) notFound();
  const path = "/" + slug.join("/");
  return {
    title: item.title,
    description: item.description,
    alternates: { canonical: path },
    openGraph: {
      title: item.title,
      description: item.description,
      url: path,
      ...("image" in item ? { images: [String(item.image)] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.description,
    },
  };
}
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const raw = await searchParams;
  const filters = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const info = resolve(slug);
  if (!info) notFound();
  const path = slug.join("/");
  let content: React.ReactNode;
  if (staticPages[path]) content = <EditorialPage slug={path} />;
  else if (path === "du-an")
    content = <ListingPage kind="projects" filters={filters} />;
  else if (path === "cho-thue")
    content = <ListingPage kind="rentals" filters={filters} />;
  else if (path === "blog")
    content = <ListingPage kind="blog" filters={filters} />;
  else if (path === "dich-vu")
    content = <ListingPage kind="services" filters={filters} />;
  else if (slug[0] === "blog" && slug[1] === "danh-muc")
    content = <ListingPage kind="blog" filters={{ category: slug[2] }} />;
  else if (slug[0] === "du-an")
    content = (
      <DetailPage
        kind="project"
        item={projects.find((p) => p.slug === slug[1])!}
      />
    );
  else if (slug[0] === "cho-thue")
    content = (
      <DetailPage
        kind="property"
        item={properties.find((p) => p.slug === slug[1])!}
      />
    );
  else if (slug[0] === "dich-vu")
    content = (
      <ServiceDetail service={services.find((p) => p.slug === slug[1])!} />
    );
  else content = <ArticlePage post={posts.find((p) => p.slug === slug[1])!} />;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Trang chủ",
                item: siteUrl,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: info.title,
                item: `${siteUrl}/${path}`,
              },
            ],
          }),
        }}
      />
      {content}
    </>
  );
}

export const dynamicParams = false;
export function generateStaticParams() {
  return [
    "du-an",
    "cho-thue",
    "blog",
    "dich-vu",
    ...Object.keys(staticPages),
    ...projects.map((p) => `du-an/${p.slug}`),
    ...properties.map((p) => `cho-thue/${p.slug}`),
    ...posts.map((p) => `blog/${p.slug}`),
    ...services.map((p) => `dich-vu/${p.slug}`),
    ...new Set(posts.map((p) => `blog/danh-muc/${p.categorySlug}`)),
  ].map((path) => ({ slug: path.split("/") }));
}
