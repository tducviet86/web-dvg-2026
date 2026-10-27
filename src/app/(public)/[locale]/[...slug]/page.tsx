/** @jsxImportSource @/i18n/jsx */
import { cache } from "react";
import NextLink from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ListingPage,
  EditorialPage,
  ServiceDetail,
  ArticlePage,
} from "@/components/public-pages";
import { JobDetail, JobsPage } from "@/components/jobs";
import { typeFromSlug } from "@/lib/jobs";
import {
  ProjectDirectory,
  PortfolioDetail,
} from "@/components/portfolio-pages";
import { RoomDetail } from "@/components/room-detail";
import { RentalPage } from "@/components/rental-page";
import { AboutPage } from "@/components/about-page";
import { ContactPage } from "@/components/contact-page";
import { ABOUT_SUBPAGES, AboutSubPage } from "@/components/about-subpage";
import {
  getBlogCategories,
  getJob,
  getJobs,
  getPage,
  getPost,
  getPosts,
  getProjectLookup,
  getPublicSettings,
  getPropertyLookup,
  getServices,
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
import {
  defaultOgImage,
  localeAlternates,
  ogLocale,
  pageTitle,
} from "@/i18n/metadata";
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
/** Search descriptions of the list pages (their headings stay short). */
const listDescriptions: Record<string, string> = {
  blog: "Cẩm nang thuê, mua căn hộ và tin thị trường bất động sản Đà Nẵng từ Đất Vàng Group: kinh nghiệm, chi phí, khu vực đáng sống.",
  "dich-vu":
    "Lĩnh vực hoạt động của Đất Vàng Group: quản lý vận hành, khai thác cho thuê, tư vấn đầu tư, tối ưu không gian và bảo trì căn hộ tại Đà Nẵng.",
};
/**
 * Search titles for pages whose heading is a slogan ("Cùng nhau tạo nên
 * giá trị."): what the page is about, with the words people search for.
 * An SEO title typed in Admin still wins.
 */
const SEO_TITLES: Record<string, string> = {
  "gioi-thieu": "Giới thiệu Đất Vàng Group – quản lý, cho thuê căn hộ Đà Nẵng",
  "gioi-thieu/tam-nhin-su-menh": "Tầm nhìn & sứ mệnh Đất Vàng Group",
  "gioi-thieu/doi-ngu": "Đội ngũ tư vấn và vận hành căn hộ – Đất Vàng Group",
  "gioi-thieu/doi-tac":
    "Đối tác & hợp tác bất động sản Đà Nẵng – Đất Vàng Group",
  "lien-he": "Liên hệ Đất Vàng Group – hotline tư vấn căn hộ Đà Nẵng",
  "hop-tac-chu-so-huu": "Ký gửi căn hộ Đà Nẵng cho thuê và bán",
  "tuyen-dung": "Tuyển dụng Đất Vàng Group – việc làm bất động sản Đà Nẵng",
};
/** Short descriptions (under ~110 characters) get one line of context. */
const withContext = (text: string, more: string) =>
  text && text.length >= 110
    ? text
    : `${text ? `${text.replace(/[.\s]*$/, ".")} ` : ""}${more}`;

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
          ? "Dự án căn hộ đang triển khai tại Đà Nẵng"
          : "Dự án căn hộ đang vận hành tại Đà Nẵng"
        : "Dự án căn hộ Đà Nẵng",
      description: group
        ? group === "development"
          ? "Các dự án căn hộ mới đang triển khai tại Đà Nẵng: vị trí, tiến độ, mặt bằng và sản phẩm, cập nhật bởi Đất Vàng Group."
          : "Các tòa căn hộ Đất Vàng Group đang vận hành tại Đà Nẵng: xem căn đang cho thuê, mua bán, tiện ích và vị trí từng dự án."
        : "Danh mục dự án căn hộ tại Đà Nẵng mà Đất Vàng Group triển khai và vận hành: The Monarchy, Sun Panoma, Sun Ponte, Capital Square…",
      render: async (filters) => (
        <ProjectDirectory
          group={group}
          content={await getSiteContent()}
          filters={filters}
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
  if ((slug[0] === "cho-thue" || slug[0] === "mua-ban") && slug.length === 2) {
    const sale = slug[0] === "mua-ban";
    const lookup = await getPropertyLookup(slug[1]);
    const apiRoom = settle(lookup, (s) => `/${slug[0]}/${s}`);
    const room: Property = toProperty(apiRoom);
    // Each unit lives under the listing it is offered in: rentals under
    // /cho-thue, sales under /mua-ban (a unit can be in both).
    if (sale && !room.forSale) {
      if (room.forRent === false) notFound();
      permanentRedirect(href(`/cho-thue/${room.slug}`));
    }
    if (!sale && room.forRent === false && room.forSale)
      permanentRedirect(href(`/mua-ban/${room.slug}`));
    const content = await getSiteContent();
    const project = apiRoom.project;
    const projectPath = `/du-an/${content.portfolio.find((p) => p.projectId === project.id)?.slug || project.slug}`;
    return {
      title:
        room.seoTitle ||
        `${room.type} ${room.area}m² tại ${project.name}${room.isDemo ? " · Căn mẫu" : sale ? " đang bán" : " cho thuê"}`,
      description:
        room.seoDescription ||
        `${room.name} tại ${project.name}, ${room.area}m², ${room.furniture.toLowerCase()}. Xem ảnh, thông số, vị trí và liên hệ ${sale ? "tư vấn mua bán" : "hẹn xem"}.${room.isDemo ? " Nội dung minh họa." : ""}`,
      image: room.image,
      noindex: room.isDemo,
      parents: sale
        ? [{ name: project.name, path: projectPath }]
        : [
            { name: "Cho thuê căn hộ Đà Nẵng", path: "/cho-thue" },
            {
              name: `Cho thuê ${project.name}`,
              path: `/cho-thue/du-an/${project.slug}`,
            },
          ],
      render: () => <RoomDetail room={room} content={content} sale={sale} />,
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
      title:
        project.seo.title ||
        `${project.name} Đà Nẵng: căn hộ & tiện ích`,
      description:
        project.seo.description ||
        withContext(
          project.intro,
          `Xem vị trí, tiện ích và căn hộ cho thuê, mua bán tại ${project.name} cùng Đất Vàng Group.`,
        ),
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
          filters={filters}
        />
      ),
    };
  }
  if (lists[path])
    return {
      title: lists[path],
      description: listDescriptions[path],
      render: async (filters) =>
        path === "blog" ? (
          <ListingPage
            kind="blog"
            filters={filters}
            posts={await getPosts()}
            categories={(await getBlogCategories()).filter((c) => c.postCount)}
          />
        ) : (
          <ListingPage
            kind="services"
            filters={filters}
            services={await getServices()}
          />
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
    const services = await getServices();
    const service = services.find((x) => x.slug === slug[1]);
    if (!service) return null;
    // A service presented on another page (e.g. /hop-tac-chu-so-huu).
    if (service.href !== `/dich-vu/${service.slug}`)
      permanentRedirect(href(service.href));
    return {
      title: service.seoTitle || service.name,
      description: service.seoDescription || service.description,
      image: service.image,
      parents: [{ name: "Lĩnh vực hoạt động", path: "/dich-vu" }],
      render: () => <ServiceDetail service={service} services={services} />,
    };
  }
  if (path === "tuyen-dung") {
    const page = await getPage("tuyen-dung");
    return {
      title: page?.seo.title || SEO_TITLES["tuyen-dung"],
      description:
        page?.seo.description ||
        page?.intro ||
        "Cơ hội nghề nghiệp tại Đất Vàng Group: kinh doanh, marketing, phiên dịch, vận hành căn hộ tại Đà Nẵng.",
      render: async (filters) => (
        <JobsPage
          page={page}
          filters={filters}
          data={await getJobs(
            filters.q?.trim().slice(0, 100) ?? "",
            filters["bo-phan"]?.slice(0, 80) ?? "",
            typeFromSlug(filters["hinh-thuc"]),
          )}
        />
      ),
    };
  }
  if (slug[0] === "tuyen-dung" && slug.length === 2) {
    const found = await getJob(slug[1]);
    if (found.kind !== "ok") return null;
    const job = found.data;
    return {
      title: job.seo.title || `${job.title} — Tuyển dụng`,
      description: job.seo.description || job.summary,
      noindex: !job.isOpen,
      parents: [{ name: "Tuyển dụng", path: "/tuyen-dung" }],
      render: () => <JobDetail job={job} />,
    };
  }
  const page = await getPage(path);
  if (!page) return null;
  const editorial = toEditorial(page);
  if (path === "lien-he")
    return {
      title: editorial.seoTitle || SEO_TITLES[path] || editorial.title,
      description: editorial.seoDescription || editorial.intro,
      render: async () => {
        const [{ portfolio }, settings] = await Promise.all([
          getSiteContent(),
          getPublicSettings().catch(() => ({}) as Record<string, string>),
        ]);
        return (
          <ContactPage
            page={editorial}
            settings={settings}
            portfolio={portfolio}
          />
        );
      },
    };
  const sub = ABOUT_SUBPAGES[path];
  if (sub)
    return {
      title: editorial.seoTitle || SEO_TITLES[path] || editorial.title,
      description: editorial.seoDescription || editorial.intro,
      render: async () => (
        <AboutSubPage
          slug={path}
          kind={sub}
          page={editorial}
          portfolio={(await getSiteContent()).portfolio}
        />
      ),
    };
  if (path === "gioi-thieu")
    return {
      title: editorial.seoTitle || SEO_TITLES[path] || editorial.title,
      description: editorial.seoDescription || editorial.intro,
      render: async () => {
        const [{ portfolio, properties }, services] = await Promise.all([
          getSiteContent(),
          getServices().catch(() => []),
        ]);
        return (
          <AboutPage
            page={editorial}
            portfolio={portfolio}
            properties={properties}
            services={services}
          />
        );
      },
    };
  return {
    title: editorial.seoTitle || SEO_TITLES[path] || editorial.title,
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
    title: pageTitle(title),
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
      images: [item.image ?? defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [item.image ?? defaultOgImage],
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
  // Earlier links opened the sale view as /cho-thue/<unit>?nhu-cau=mua-ban.
  if (
    slug[0] === "cho-thue" &&
    slug.length === 2 &&
    filters["nhu-cau"] === "mua-ban"
  )
    permanentRedirect(href(`/mua-ban/${slug[1]}`));
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
