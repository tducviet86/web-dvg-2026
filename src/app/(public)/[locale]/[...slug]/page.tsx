/** @jsxImportSource @/i18n/jsx */
import { cache } from "react";
import NextLink from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { services } from "@/data";
import {
  ListingPage,
  EditorialPage,
  ServiceDetail,
  ArticlePage,
} from "@/components/public-pages";
import {
  ProjectDirectory,
  PortfolioDetail,
} from "@/components/portfolio-pages";
import { RoomDetail } from "@/components/room-detail";
import { RentalPage } from "@/components/rental-page";
import {
  getBlogCategories,
  getPage,
  getPost,
  getPosts,
  getProjectLookup,
  getPublicSettings,
  getPropertyLookup,
  getSiteContent,
  toPost,
  toProperty,
  withProject,
} from "@/lib/api/content";
import { isPreview, previewPost, previewProject } from "@/lib/api/preview";
import type { Lookup } from "@/lib/api/server";
import type { EditorialContent } from "@/lib/pages";
import { siteUrl } from "@/lib/utils";
import { agentSchema, jsonLd } from "@/lib/structured-data";
import { isLocale, localizeHref, type Locale } from "@/i18n/config";
import { localeAlternates, ogLocale } from "@/i18n/metadata";
import { href, setRequestLocale, t } from "@/i18n/server";
import type { PortfolioProject, Post, Property } from "@/types";

type Props = {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
type Filters = Record<string, string | undefined>;
type Resolved = {
  title: string;
  description: string;
  image?: string;
  /** Unpublishable or demo content: keep it out of search results. */
  noindex?: boolean;
  /** Draft Mode: publication status of the previewed record. */
  preview?: string;
  /** Extra BreadcrumbList items between "Trang chủ" and the page. */
  parents?: { name: string; path: string }[];
  render: (filters: Filters) => Promise<React.ReactNode> | React.ReactNode;
};

const lists: Record<string, string> = {
  blog: "Tin tức & cẩm nang",
  "dich-vu": "Lĩnh vực hoạt động",
};

/** Follows an old slug to its new URL with a 308, otherwise 404. */
function settle<T>(lookup: Lookup<T>, pathFor: (slug: string) => string): T {
  if (lookup.kind === "ok") return lookup.data;
  if (lookup.kind === "moved") permanentRedirect(href(pathFor(lookup.slug)));
  notFound();
}

const toEditorial = (
  page: NonNullable<Awaited<ReturnType<typeof getPage>>>,
): EditorialContent => ({
  title: page.title,
  eyebrow: page.eyebrow || "",
  intro: page.intro,
  sections: page.sections.map((s) => [s.heading, s.body]),
  seoTitle: page.seo.title,
  seoDescription: page.seo.description,
});

/**
 * Resolves a URL to its data once per request (shared by generateMetadata
 * and the page). Returns null for unknown URLs.
 */
const resolve = cache(async (path: string): Promise<Resolved | null> => {
  const slug = path.split("/");
  if (
    path === "du-an" ||
    path === "du-an/trien-khai" ||
    path === "du-an/van-hanh"
  ) {
    const group = path.endsWith("trien-khai")
      ? "development"
      : path.endsWith("van-hanh")
        ? "operation"
        : undefined;
    return {
      title: group
        ? group === "development"
          ? "Dự án đang triển khai"
          : "Dự án đang vận hành"
        : "Dự án bất động sản",
      description: "Danh mục dự án và dịch vụ bất động sản của Đất Vàng Group.",
      render: async () => (
        <ProjectDirectory
          group={group}
          projects={(await getSiteContent()).portfolio}
        />
      ),
    };
  }
  if (path === "cho-thue") {
    const content = await getSiteContent();
    const rentNames = content.portfolio
      .filter((p) => p.categories.includes("rent"))
      .map((p) => p.name);
    return {
      title: "Cho thuê căn hộ Đà Nẵng",
      description: `Tìm hiểu căn hộ cho thuê Đà Nẵng${rentNames.length ? ` tại ${rentNames.join(", ")}` : ""}. Xem thông tin, vị trí, gọi Đất Vàng Group hẹn xem căn.`,
      image: content.portfolio.find((p) => p.categories.includes("rent"))
        ?.image,
      render: (filters) => <RentalPage filters={filters} content={content} />,
    };
  }
  if (slug[0] === "cho-thue" && slug[1] === "du-an" && slug.length === 3) {
    const lookup = await getProjectLookup(slug[2]);
    const project = settle(lookup, (s) => `/cho-thue/du-an/${s}`);
    const content = await getSiteContent();
    const portfolio = content.portfolio.find((p) => p.projectId === project.id);
    if (!portfolio || !portfolio.categories.includes("rent")) notFound();
    return {
      title: `Cho thuê căn hộ ${project.name} Đà Nẵng`,
      description:
        project.rentalGuide?.intro ||
        `Căn hộ cho thuê tại ${project.name}. Xem thông tin căn và liên hệ Đất Vàng Group.`,
      image: portfolio.image,
      parents: [{ name: "Cho thuê căn hộ Đà Nẵng", path: "/cho-thue" }],
      render: (filters) => (
        <RentalPage filters={filters} project={portfolio} content={content} />
      ),
    };
  }
  if (slug[0] === "cho-thue" && slug.length === 2) {
    const lookup = await getPropertyLookup(slug[1]);
    const apiRoom = settle(lookup, (s) => `/cho-thue/${s}`);
    const room: Property = toProperty(apiRoom);
    const content = await getSiteContent();
    return {
      title:
        room.seoTitle ||
        `${room.type} ${room.area}m² tại ${apiRoom.project.name}${room.isDemo ? " · Căn mẫu" : " cho thuê"}`,
      description:
        room.seoDescription ||
        `${room.name} tại ${apiRoom.project.name}, ${room.area}m², ${room.furniture.toLowerCase()}. Xem ảnh, thông số, vị trí và liên hệ hẹn xem.${room.isDemo ? " Nội dung minh họa." : ""}`,
      image: room.image,
      noindex: room.isDemo,
      parents: [
        { name: "Cho thuê căn hộ Đà Nẵng", path: "/cho-thue" },
        {
          name: `Cho thuê ${apiRoom.project.name}`,
          path: `/cho-thue/du-an/${apiRoom.project.slug}`,
        },
      ],
      render: () => <RoomDetail room={room} content={content} />,
    };
  }
  if (slug[0] === "du-an" && slug.length === 2) {
    // Draft Mode: signed-in editors see the project even when unpublished.
    const draft = (await isPreview()) ? await previewProject(slug[1]) : null;
    const project =
      draft ?? settle(await getProjectLookup(slug[1]), (s) => `/du-an/${s}`);
    const content = draft
      ? withProject(await getSiteContent(), draft)
      : await getSiteContent();
    const portfolio: PortfolioProject | undefined = content.portfolio.find(
      (p) => p.projectId === project.id,
    );
    if (!portfolio) notFound();
    return {
      title: project.seo.title || project.name,
      description: project.seo.description || project.intro,
      noindex: !!draft,
      preview: draft?.status,
      image: portfolio.image,
      parents: [
        {
          name:
            portfolio.group === "development"
              ? "Dự án đang triển khai"
              : "Dự án đang vận hành",
          path:
            portfolio.group === "development"
              ? "/du-an/trien-khai"
              : "/du-an/van-hanh",
        },
      ],
      render: (filters) => (
        <PortfolioDetail
          project={portfolio}
          content={content}
          mode={filters["nhu-cau"]}
        />
      ),
    };
  }
  if (lists[path])
    return {
      title: lists[path],
      description: `Khám phá ${lists[path].toLowerCase()} cùng Đất Vàng Group.`,
      render: async (filters) =>
        path === "blog" ? (
          <ListingPage
            kind="blog"
            filters={filters}
            posts={await getPosts()}
            categories={(await getBlogCategories()).filter((c) => c.postCount)}
          />
        ) : (
          <ListingPage kind="services" filters={filters} />
        ),
    };
  if (slug[0] === "blog" && slug[1] === "danh-muc" && slug.length === 3) {
    const categories = await getBlogCategories();
    const category = categories.find((c) => c.slug === slug[2] && c.postCount);
    if (!category) return null;
    return {
      title: category.name,
      description:
        category.description ||
        `Các bài viết về ${category.name.toLowerCase()} từ Đất Vàng Group.`,
      parents: [{ name: "Tin tức & cẩm nang", path: "/blog" }],
      render: async () => (
        <ListingPage
          kind="blog"
          filters={{ category: category.slug }}
          posts={await getPosts()}
          categories={categories.filter((c) => c.postCount)}
        />
      ),
    };
  }
  if (slug[0] === "blog" && slug.length === 2) {
    const draft = (await isPreview()) ? await previewPost(slug[1]) : null;
    const post: Post = draft
      ? toPost(draft)
      : settle(await getPost(slug[1]), (s) => `/blog/${s}`);
    return {
      preview: draft?.status,
      title: post.seoTitle || post.name,
      description: post.seoDescription || post.description,
      image: post.image,
      noindex: post.isDemo || !!draft,
      parents: [{ name: "Tin tức & cẩm nang", path: "/blog" }],
      render: async () => <ArticlePage post={post} posts={await getPosts()} />,
    };
  }
  if (slug[0] === "dich-vu" && slug.length === 2) {
    const service = services.find((x) => x.slug === slug[1]);
    if (!service) return null;
    return {
      title: service.name,
      description: service.description,
      image: service.image,
      parents: [{ name: "Lĩnh vực hoạt động", path: "/dich-vu" }],
      render: () => <ServiceDetail service={service} />,
    };
  }
  const page = await getPage(path);
  if (!page) return null;
  const editorial = toEditorial(page);
  return {
    title: editorial.seoTitle || editorial.title,
    description: editorial.seoDescription || editorial.intro,
    render: () => <EditorialPage slug={path} page={editorial} />,
  };
});

/** Validates the locale and makes it current for this request. */
async function readParams(params: Props["params"]) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  await setRequestLocale(locale);
  return { locale: locale as Locale, slug };
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale, slug } = await readParams(params);
  const item = await resolve(slug.join("/"));
  if (!item) notFound();
  const path = "/" + slug.join("/");
  const query = await searchParams;
  const filteredRental =
    slug[0] === "cho-thue" && Object.keys(query).length > 0;
  const title = t(item.title);
  const description = t(item.description);
  return {
    title,
    description,
    alternates: localeAlternates(locale, path),
    ...(item.noindex || filteredRental
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      title,
      description,
      url: localizeHref(path, locale),
      ...ogLocale(locale),
      ...(item.image ? { images: [item.image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(item.image ? { images: [item.image] } : {}),
    },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale, slug } = await readParams(params);
  const raw = await searchParams;
  const filters = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const path = slug.join("/");
  const info = await resolve(path);
  if (!info) notFound();
  const parents = info.parents ?? [];
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
                name: t("Trang chủ"),
                item: `${siteUrl}${localizeHref("/", locale)}`,
              },
              ...parents.map((parent, i) => ({
                "@type": "ListItem",
                position: i + 2,
                name: t(parent.name),
                item: `${siteUrl}${localizeHref(parent.path, locale)}`,
              })),
              {
                "@type": "ListItem",
                position: 2 + parents.length,
                name: t(info.title),
                item: `${siteUrl}${localizeHref(`/${path}`, locale)}`,
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
      {/* The contact page describes the company as a local agent. */}
      {path === "lien-he" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              agentSchema(
                await getPublicSettings().catch(
                  () => ({}) as Record<string, string>,
                ),
              ),
            ),
          }}
        />
      )}
      {info.preview && (
        <div className="preview-bar" role="status">
          Đang xem trước nội dung (
          {info.preview === "PUBLISHED" ? "đã xuất bản" : "chưa xuất bản"}).{" "}
          <NextLink href="/api/preview/exit" prefetch={false}>
            Thoát xem trước
          </NextLink>
        </div>
      )}
      {await info.render(filters)}
    </>
  );
}
