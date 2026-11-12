/** @jsxImportSource @/i18n/jsx */
import { BackButton } from "@/components/layout/back-button";
import Link from "@/components/page-navigation";
import {
  ArrowUpRight,
  ArrowRight,
  LayoutGrid,
  List,
  Check,
  MessageCircle,
  KeyRound,
  Facebook,
} from "lucide-react";
import type { PortfolioProject, Property } from "@/types";
import type { SiteContent } from "@/lib/api/content";
import { rentalFaqs } from "@/data/rental-content";
import { listingFaqs } from "@/lib/faq";
import { tf } from "@/i18n/server";
import {
  landingPrice,
  landingSummary,
  type landingFacts,
} from "@/lib/landings";
import { FaqSection } from "./faq-section";
import { Reviews } from "./reviews-section";
import {
  filterProperties,
  isSaleSearch,
  searchUnits,
  type Filters,
} from "@/lib/filter";
import { PropertyCard, SaleCard } from "./cards";
import { SearchHero } from "./search-hero";
import { kindLabel, kindNoun, listingKind } from "@/lib/property-groups";
import { ProjectMap } from "./project-map";
import { RentalMap } from "./rental-map";
import { mapBuildings } from "@/lib/map-buildings";
import { siteUrl } from "@/lib/utils";
import { InquiryDialog } from "./rental-inquiry";

export function RentalPage({
  filters,
  project,
  content,
  landing,
}: {
  filters: Filters;
  project?: PortfolioProject;
  content: SiteContent;
  /**
   * A search landing page (lib/landings): its address, heading and text,
   * and the filters it fixes (already in `filters`, never offered for removal).
   */
  landing?: {
    path: string;
    h1: string;
    intro: string;
    fixed: Filters;
    /** The units it stands for, and what they add up to. */
    units: Property[];
    facts: ReturnType<typeof landingFacts>;
  };
}) {
  const locations = content.portfolio.filter((p) =>
    p.categories.includes("rent"),
  );
  const base =
    landing?.path ??
    (project ? `/cho-thue/du-an/${project.slug}` : "/cho-thue");
  /** A filter the landing page itself stands for. */
  const isFixed = (key: string, value?: string) =>
    !!landing && landing.fixed[key] === value;
  const effective: Filters = {
    ...filters,
    ...(project ? { project: project.slug } : {}),
  };
  // Hero search: "Thuê" lists rentals, "Mua" lists units for sale.
  const sale = isSaleSearch(filters);
  const result = searchUnits(content.properties, effective);
  // Heading: "Mặt bằng cho thuê", "Nhà phố…"; "Bất động sản" when mixed.
  const kind = listingKind(filters.loai, result);
  const noun = kindNoun(kind);
  const visible = Math.min(100, Math.max(9, Number(filters.limit) || 9));
  const guide = project ? content.rentalGuides[project.slug] : null;
  const scope = filterProperties(
    content.properties,
    project ? { project: project.slug } : {},
  );
  // The map on the main rental page: rental buildings with a place and a block.
  const buildings = project ? [] : mapBuildings(content, { rentalsOnly: true });
  const showsDemo = result.some((p) => p.isDemo);
  // Full-screen photos: the project (and its units) or every rental project.
  const slides = (
    project
      ? [
          { src: project.image, alt: project.imageAlt, caption: project.name },
          ...scope
            .filter((p) => !p.isDemo && p.image)
            .map((p) => ({
              src: p.image,
              alt: p.imageAlt || p.name,
              caption: p.name,
            })),
        ]
      : locations.map((p) => ({
          src: p.image,
          alt: p.imageAlt,
          caption: p.name,
        }))
  )
    .filter((x, i, all) => x.src && all.findIndex((y) => y.src === x.src) === i)
    .slice(0, 4);
  const heroProjects = locations
    .filter((p) => content.properties.some((r) => r.projectId === p.projectId))
    .map((p) => [p.slug, p.name] as [string, string]);
  /** This page with other filters, opened at the results (#can-ho). */
  const nextUrl = (changes: Record<string, string | undefined>) => {
    const q = new URLSearchParams(
      Object.entries({ ...filters, ...changes }).filter(
        (e): e is [string, string] =>
          !!e[1] && !(project && e[0] === "project") && !isFixed(e[0], e[1]),
      ),
    );
    return `${base}${q.size ? `?${q}` : ""}#can-ho`;
  };
  return (
    <main id="main" className="rental-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: landing
              ? landing.h1
              : project
                ? `Cho thuê căn hộ ${project.name} Đà Nẵng`
                : "Cho thuê căn hộ Đà Nẵng",
            url: `${siteUrl}${base}`,
            inLanguage: "vi-VN",
            description:
              landing?.intro ||
              guide?.intro ||
              "Tìm hiểu căn hộ cho thuê tại Monarchy, Sun Panoma, Sun Ponte Residence, Sam Tower và Hiyori Garden Tower.",
            // A landing page lists its own units; the rentals page its projects.
            ...(landing
              ? {
                  mainEntity: {
                    "@type": "ItemList",
                    numberOfItems: result.length,
                    itemListElement: result.slice(0, 20).map((p, index) => ({
                      "@type": "ListItem",
                      position: index + 1,
                      name: p.name,
                      url: `${siteUrl}/${sale ? "mua-ban" : "cho-thue"}/${p.slug}`,
                    })),
                  },
                }
              : !project
                ? {
                    mainEntity: {
                      "@type": "ItemList",
                      itemListElement: locations.map((p, index) => ({
                        "@type": "ListItem",
                        position: index + 1,
                        name: `Cho thuê ${p.name}`,
                        url: `${siteUrl}/cho-thue/du-an/${p.slug}`,
                      })),
                    },
                  }
                : {}),
          }).replace(/</g, "\\u003c"),
        }}
      />
      <SearchHero
        slides={slides}
        // A landing page's search box searches everything, from its filters.
        action={landing ? (sale ? "/mua-ban" : "/cho-thue") : base}
        mode={sale ? "mua" : "thue"}
        values={effective}
        projects={heroProjects}
        locations={[...new Set(content.properties.map((p) => p.location))]}
        project={project && { slug: project.slug, name: project.name }}
        title={
          // The page's subject, as its title says: apartments (or the kind
          // the visitor chose) for rent, or for sale.
          landing
            ? landing.h1
            : project
              ? `Căn hộ tại ${project.name}`
              : `${sale ? "Mua bán" : "Cho thuê"} ${filters.loai ? noun.toLowerCase() : "căn hộ"} tại Đà Nẵng`
        }
        units={scope}
        crumbs={
          <>
            <BackButton />
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            {landing ? (
              <>
                <Link href={sale ? "/mua-ban" : "/cho-thue"}>
                  {sale ? "Mua bán" : "Cho thuê"}
                </Link>
                <span>/</span>
                <span aria-current="page">{landing.h1}</span>
              </>
            ) : project ? (
              <>
                <Link href="/cho-thue">Cho thuê</Link>
                <span>/</span>
                <span aria-current="page">{project.name}</span>
              </>
            ) : (
              <span aria-current="page">Cho thuê căn hộ</span>
            )}
          </>
        }
      />
      <div className="container">
        {landing && (
          <div className="rental-landing-intro">
            {landing.intro
              .split(/\n{2,}/)
              .map((text) => text.trim())
              .filter(Boolean)
              .map((text) => (
                <p key={text}>{text}</p>
              ))}
            {landing.facts.total > 0 && (
              <dl className="rental-landing-facts">
                <div>
                  <dt>Căn phù hợp</dt>
                  <dd>{landing.facts.total}</dd>
                </div>
                <div>
                  <dt>Còn trống</dt>
                  <dd>{landing.facts.free}</dd>
                </div>
                {landing.facts.low > 0 && (
                  <div>
                    <dt>{sale ? "Giá bán" : "Giá thuê"}</dt>
                    <dd>{landingPrice(landing.facts)}</dd>
                  </div>
                )}
                {landing.facts.projects.length > 0 && (
                  <div>
                    <dt>Dự án</dt>
                    <dd>{landing.facts.projects.join(", ")}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        )}
        <section
          id="can-ho"
          className="rental-results"
          aria-label="Kết quả tìm kiếm"
        >
          <div className="rental-results-heading">
            <div>
              <span className="signature-kicker">KHÔNG GIAN DÀNH CHO BẠN</span>
              <h2>
                {sale
                  ? project
                    ? `${noun} đang bán tại ${project.name}`
                    : `${noun} đang bán`
                  : project
                    ? `${noun} tại ${project.name}`
                    : `Khám phá ${noun.toLowerCase()} cho thuê`}
              </h2>
            </div>
          </div>
          <div className="rental-results-meta">
            <div className="view-toggle">
              <Link
                aria-label="Xem dạng lưới"
                rel="nofollow"
                aria-current={filters.view !== "list" ? "page" : undefined}
                href={nextUrl({ view: "grid" })}
              >
                <LayoutGrid size={19} />
              </Link>
              <Link
                aria-label="Xem dạng danh sách"
                rel="nofollow"
                aria-current={filters.view === "list" ? "page" : undefined}
                href={nextUrl({ view: "list" })}
              >
                <List size={19} />
              </Link>
            </div>
          </div>
          <div className="filter-chips">
            {Object.entries(effective)
              .filter(
                ([k, v]) =>
                  v &&
                  ![
                    "sort",
                    "limit",
                    "view",
                    ...(project ? ["project"] : []),
                  ].includes(k) &&
                  !isFixed(k, v),
              )
              .map(([k, v]) => (
                <Link
                  key={k}
                  href={nextUrl({ [k]: undefined, limit: undefined })}
                  aria-label={`Bỏ lọc ${k === "project" ? content.portfolio.find((p) => p.slug === v)?.name : v}`}
                >
                  {k === "project"
                    ? content.portfolio.find((p) => p.slug === v)?.name
                    : k === "nhu-cau"
                      ? "Đang bán"
                      : k === "loai"
                        ? kindLabel(v)
                        : k === "gia-ban"
                          ? `Đến ${v} tỷ`
                          : k === "gia-ban-tu"
                            ? `Từ ${v} tỷ`
                            : k === "price"
                              ? `Đến ${v} triệu`
                              : k === "gia-tu"
                                ? `Từ ${v} triệu`
                                : k === "area"
                                  ? `Từ ${v} m²`
                                  : k === "bedrooms"
                                    ? v === "0"
                                      ? "Studio"
                                      : `${v} phòng ngủ`
                                    : v}{" "}
                  <span aria-hidden>×</span>
                </Link>
              ))}
          </div>
          {result.length ? (
            <div
              className={`rental-card-grid ${filters.view === "list" ? "list-view" : ""}`}
            >
              {result
                .slice(0, visible)
                .map((p, i) =>
                  sale ? (
                    <SaleCard property={p} key={p.id} />
                  ) : (
                    <PropertyCard property={p} key={p.id} index={i} />
                  ),
                )}
            </div>
          ) : (
            <div className="empty-state rental-empty">
              <h2>Chưa tìm thấy không gian phù hợp.</h2>
              <p>
                Thử nới ngân sách, chọn dự án khác hoặc gọi để trao đổi nhu cầu.
              </p>
              <Link href={`${base}#can-ho`} className="button button-primary">
                Xóa bộ lọc
              </Link>
              <InquiryDialog
                mode="advice"
                target={
                  project
                    ? { projectSlug: project.slug, label: project.name }
                    : {}
                }
                trigger={
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    className="button button-outline"
                  >
                    <MessageCircle size={18} /> Gửi nhu cầu để được tìm căn
                  </button>
                }
              />
            </div>
          )}
          {showsDemo && (
            <p className="rental-demo-note">
              Một số căn đang hiển thị là <strong>căn mẫu</strong> (ảnh và giá
              minh họa). Gửi yêu cầu hoặc gọi để nhận thông tin căn thực tế.
            </p>
          )}
          {result.length > visible && (
            <div className="load-more">
              {/* More cards below the ones already read: no jump. */}
              <Link
                href={nextUrl({ limit: String(visible + 9) }).replace(
                  /#can-ho$/,
                  "",
                )}
                scroll={false}
                rel="nofollow"
                className="button button-outline"
              >
                Xem thêm căn hộ
                <ArrowRight size={18} />
              </Link>
            </div>
          )}
        </section>
        {buildings.length > 0 && (
          <section id="ban-do-can-thue" className="rental-map-section">
            <span className="signature-kicker">BẢN ĐỒ CĂN CHO THUÊ</span>
            <h2>Chọn tòa trên bản đồ, xem căn phù hợp với bạn.</h2>
            <RentalMap buildings={buildings} />
          </section>
        )}
        <section className="rental-guide">
          <div>
            <span className="signature-kicker">
              {buildings.length ? "LƯU Ý KHI CHỌN CĂN" : "TRƯỚC KHI CHỌN CĂN"}
            </span>
            <h2>
              {guide?.focus ||
                "Thuê căn hộ tại Đà Nẵng, bắt đầu từ điều bạn cần."}
            </h2>
            <p>
              {guide
                ? guide.intro
                : "Monarchy, Sun Panoma, Sun Ponte Residence, Sam Tower và Hiyori Garden Tower mang đến những lựa chọn không gian khác nhau. Bắt đầu từ khu vực bạn muốn sống, số người ở và tổng ngân sách mỗi tháng để rút gọn danh sách cần xem."}
            </p>
            <Link
              href={project ? `/du-an/${project.slug}` : "/du-an/van-hanh"}
              className="text-link"
            >
              {project ? "Tìm hiểu tổng quan dự án" : "Khám phá các dự án"}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="rental-checklist">
            {(
              guide?.checks || [
                "Chọn dự án gần nhịp sinh hoạt, nơi làm việc và các điểm đến quen thuộc.",
                "So sánh diện tích sử dụng, số phòng ngủ và nội thất cần bàn giao.",
                "Xác nhận giá, tổng chi phí hàng tháng và hiện trạng trước khi hẹn xem.",
              ]
            ).map((text, i) => (
              <div key={text}>
                <span>0{i + 1}</span>
                <p>{text}</p>
                <Check size={18} />
              </div>
            ))}
          </div>
        </section>
        {project && (
          <ProjectMap
            place={content.locations[project.projectId]}
            slug={project.slug}
            name={project.name}
            address={project.location}
            buildings={mapBuildings(content, { rentalsOnly: false })}
          />
        )}
        <Reviews project={project?.slug} limit={3} />
        <FaqSection
          faqs={[
            // A landing page answers for its own units, not the whole list.
            ...(landing
              ? [
                  ...(landing.facts.total
                    ? [
                        [
                          // The heading is already translated: translate the
                          // question around it, not the two glued together.
                          tf("{name}: hiện có bao nhiêu căn, giá thế nào?", {
                            name: landing.h1,
                          }),
                          landingSummary(landing.facts),
                        ] as [string, string],
                      ]
                    : []),
                  ...(sale ? [] : listingFaqs(landing.units)),
                ]
              : listingFaqs(content.properties, project, locations)),
            ...rentalFaqs,
          ]}
        />
        <section className="rental-owner">
          <div>
            <span className="signature-kicker">DÀNH CHO CHỦ SỞ HỮU</span>
            <h2>
              Căn hộ của bạn.
              <br />
              Kết nối cùng Đất Vàng.
            </h2>
            <p>
              Trao đổi nhu cầu cho thuê, giới thiệu hiện trạng và cùng xây dựng
              thông tin căn hộ rõ ràng.
            </p>
          </div>
          <div className="rental-owner-actions">
            <InquiryDialog
              mode="consign"
              target={
                project
                  ? { projectSlug: project.slug, label: project.name }
                  : {}
              }
              trigger={
                <button
                  type="button"
                  aria-haspopup="dialog"
                  className="button button-primary"
                >
                  <KeyRound size={18} /> Gửi thông tin ký gửi
                </button>
              }
            />
            <Link className="text-link" href="/hop-tac-chu-so-huu">
              Quy trình hợp tác
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
