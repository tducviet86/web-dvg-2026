import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { projects, properties, posts, services } from "@/data";
import { staticPages } from "@/lib/pages";
import {
  ListingPage,
  EditorialPage,
  ServiceDetail,
  ArticlePage,
} from "@/components/public-pages";
import { homeProjects, projectStories } from "@/data/home-projects";
import {
  ProjectDirectory,
  PortfolioDetail,
} from "@/components/portfolio-pages";
import { RoomDetail } from "@/components/room-detail";
import { RentalPage } from "@/components/rental-page";
import { rentalGuides } from "@/data/rental-content";
import { siteUrl } from "@/lib/utils";
type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function resolve(slug: string[]) {
  const path = slug.join("/");
  if (slug[0] === "cho-thue" && slug[1] === "du-an" && slug.length === 3) {
    const project = homeProjects.find(
      (p) => p.slug === slug[2] && p.group === "operation",
    );
    return project
      ? {
          title: `Cho thuê căn hộ ${project.name} Đà Nẵng`,
          description: rentalGuides[project.slug].intro,
          image: `/images/projects/${project.id}.jpg`,
        }
      : null;
  }
  if (path === "cho-thue")
    return {
      title: "Cho thuê căn hộ Đà Nẵng",
      description:
        "Tìm hiểu căn hộ cho thuê Đà Nẵng tại Monarchy, Sun Panoma, Sun Ponte Residence, Sam Tower và Hiyori. Xem thông tin, vị trí, gọi Đất Vàng Group hẹn xem căn.",
      image: "/images/projects/monarchy.jpg",
    };
  if (path === "du-an/trien-khai" || path === "du-an/van-hanh")
    return {
      title: path.endsWith("trien-khai")
        ? "Dự án đang triển khai"
        : "Dự án đang vận hành",
      description: "Danh mục dự án và dịch vụ bất động sản của Đất Vàng Group.",
    };
  const portfolio =
    slug.length === 2 && slug[0] === "du-an"
      ? homeProjects.find((p) => p.slug === slug[1])
      : undefined;
  if (portfolio)
    return {
      title: portfolio.name,
      description: projectStories[portfolio.id].intro,
      image: `/images/projects/${portfolio.id}.jpg`,
    };
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
  if (slug[0] === "cho-thue") {
    const room = properties.find((p) => p.slug === slug[1]);
    const project = projects.find((p) => p.id === room?.projectId);
    return room && project
      ? {
          title:
            room.seoTitle ||
            `${room.type} ${room.area}m² tại ${project.name}${room.isDemo ? " · Căn mẫu" : " cho thuê"}`,
          description:
            room.seoDescription ||
            `${room.name} tại ${project.name}, ${room.area}m², ${room.furniture.toLowerCase()}. Xem ảnh, thông số, vị trí và liên hệ hẹn xem.${room.isDemo ? " Nội dung minh họa." : ""}`,
          image: room.image,
        }
      : null;
  }
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
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = resolve(slug);
  if (!item) notFound();
  const path = "/" + slug.join("/");
  const query = await searchParams;
  const demoRoom =
    slug[0] === "cho-thue" &&
    slug.length === 2 &&
    properties.find((p) => p.slug === slug[1])?.isDemo;
  const filteredRental =
    slug[0] === "cho-thue" && Object.keys(query).length > 0;
  return {
    title: item.title,
    description: item.description,
    alternates: { canonical: path },
    ...(demoRoom || filteredRental
      ? { robots: { index: false, follow: true } }
      : {}),
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
      ...("image" in item ? { images: [String(item.image)] } : {}),
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
  const breadcrumbParents =
    slug[0] === "cho-thue" && slug.length > 1
      ? [
          {
            "@type": "ListItem",
            position: 2,
            name: "Cho thuê căn hộ Đà Nẵng",
            item: `${siteUrl}/cho-thue`,
          },
          ...(slug.length === 2
            ? (() => {
                const room = properties.find((p) => p.slug === slug[1]);
                const project = projects.find((p) => p.id === room?.projectId);
                return project
                  ? [
                      {
                        "@type": "ListItem",
                        position: 3,
                        name: `Cho thuê ${project.name}`,
                        item: `${siteUrl}/cho-thue/du-an/${project.slug}`,
                      },
                    ]
                  : [];
              })()
            : []),
        ]
      : [];
  let content: React.ReactNode;
  if (path === "du-an/trien-khai" || path === "du-an/van-hanh")
    content = (
      <ProjectDirectory
        group={path.endsWith("trien-khai") ? "development" : "operation"}
      />
    );
  else if (staticPages[path]) content = <EditorialPage slug={path} />;
  else if (path === "du-an") content = <ProjectDirectory />;
  else if (path === "cho-thue") content = <RentalPage filters={filters} />;
  else if (slug[0] === "cho-thue" && slug[1] === "du-an")
    content = (
      <RentalPage
        filters={filters}
        project={homeProjects.find((p) => p.slug === slug[2])!}
      />
    );
  else if (path === "blog")
    content = <ListingPage kind="blog" filters={filters} />;
  else if (path === "dich-vu")
    content = <ListingPage kind="services" filters={filters} />;
  else if (slug[0] === "blog" && slug[1] === "danh-muc")
    content = <ListingPage kind="blog" filters={{ category: slug[2] }} />;
  else if (slug[0] === "du-an")
    content = (
      <PortfolioDetail
        project={homeProjects.find((p) => p.slug === slug[1])!}
        mode={filters["nhu-cau"]}
      />
    );
  else if (slug[0] === "cho-thue")
    content = <RoomDetail room={properties.find((p) => p.slug === slug[1])!} />;
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
              ...breadcrumbParents,
              {
                "@type": "ListItem",
                position: 2 + breadcrumbParents.length,
                name: info.title,
                item: `${siteUrl}/${path}`,
              },
            ],
          }).replace(/</g, "\\u003c"),
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
    ...properties.map((p) => `cho-thue/${p.slug}`),
    ...posts.map((p) => `blog/${p.slug}`),
    ...services.map((p) => `dich-vu/${p.slug}`),
    ...new Set(posts.map((p) => `blog/danh-muc/${p.categorySlug}`)),
  ].map((path) => ({ slug: path.split("/") }));
}
