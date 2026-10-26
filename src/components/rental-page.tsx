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
import type { PortfolioProject } from "@/types";
import type { SiteContent } from "@/lib/api/content";
import { rentalFaqs } from "@/data/rental-content";
import {
  filterProperties,
  isSaleSearch,
  searchUnits,
  type Filters,
} from "@/lib/filter";
import { PropertyCard, SaleCard } from "./cards";
import { SearchHero } from "./search-hero";
import { ProjectMap } from "./project-map";
import { CallContact } from "./call-contact";
import { money, siteUrl } from "@/lib/utils";
import { InquiryDialog } from "./rental-inquiry";
import { Counter } from "./counter";

export function RentalPage({
  filters,
  project,
  content,
}: {
  filters: Filters;
  project?: PortfolioProject;
  content: SiteContent;
}) {
  const locations = content.portfolio.filter((p) =>
    p.categories.includes("rent"),
  );
  const base = project ? `/cho-thue/du-an/${project.slug}` : "/cho-thue";
  const effective: Filters = {
    ...filters,
    ...(project ? { project: project.slug } : {}),
  };
  // Hero search: "Thuê" lists rentals, "Mua" lists units for sale.
  const sale = isSaleSearch(filters);
  const result = searchUnits(content.properties, effective);
  const visible = Math.min(100, Math.max(9, Number(filters.limit) || 9));
  const guide = project ? content.rentalGuides[project.slug] : null;
  const scope = filterProperties(
    content.properties,
    project ? { project: project.slug } : {},
  );
  const stats = {
    available: scope.filter((p) => p.status === "Còn trống").length,
    projects: project ? 1 : new Set(scope.map((p) => p.projectId)).size,
    from: scope.length ? Math.min(...scope.map((p) => p.price)) : 0,
  };
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
  const nextUrl = (changes: Record<string, string | undefined>) => {
    const q = new URLSearchParams(
      Object.entries({ ...filters, ...changes }).filter(
        (e): e is [string, string] =>
          !!e[1] && !(project && e[0] === "project"),
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
            name: project
              ? `Cho thuê căn hộ ${project.name} Đà Nẵng`
              : "Cho thuê căn hộ Đà Nẵng",
            url: `${siteUrl}${base}`,
            inLanguage: "vi-VN",
            description:
              guide?.intro ||
              "Tìm hiểu căn hộ cho thuê tại Monarchy, Sun Panoma, Sun Ponte Residence, Sam Tower và Hiyori Garden Tower.",
            ...(!project
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
        action={base}
        mode={sale ? "mua" : "thue"}
        values={effective}
        projects={heroProjects}
        locations={[...new Set(content.properties.map((p) => p.location))]}
        project={project && { slug: project.slug, name: project.name }}
        title={
          project
            ? `Căn hộ tại ${project.name}`
            : "Bất động sản cho thuê & mua bán tại Đà Nẵng"
        }
        count={result.length}
        crumbs={
          <>
            <BackButton />
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            {project ? (
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
        stats={
          <>
            <div>
              <dt>Căn đang trống</dt>
              <dd>
                <Counter value={stats.available} />
              </dd>
            </div>
            <div>
              <dt>{project ? "Dự án" : "Dự án cho thuê"}</dt>
              <dd>
                <Counter value={stats.projects} />
              </dd>
            </div>
            {stats.from > 0 && (
              <div>
                <dt>Giá thuê từ</dt>
                <dd>
                  {money(stats.from)}
                  <small> triệu/tháng</small>
                </dd>
              </div>
            )}
            {project?.facebook && (
              <div>
                <dt>Fanpage</dt>
                <dd>
                  <a
                    className="rental-hero-fanpage"
                    href={project.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Facebook size={15} aria-hidden="true" />
                    {project.name}
                  </a>
                </dd>
              </div>
            )}
          </>
        }
      />
      <div className="container">
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
                    ? `Căn hộ đang bán tại ${project.name}`
                    : "Căn hộ đang bán"
                  : project
                    ? `Căn hộ tại ${project.name}`
                    : "Khám phá căn hộ cho thuê"}
              </h2>
            </div>
            <span className="rental-result-count">
              {result.length} căn phù hợp
            </span>
          </div>
          <div className="rental-results-meta">
            <div className="view-toggle">
              <Link
                aria-label="Xem dạng lưới"
                aria-current={filters.view !== "list" ? "page" : undefined}
                href={nextUrl({ view: "grid" })}
              >
                <LayoutGrid size={19} />
              </Link>
              <Link
                aria-label="Xem dạng danh sách"
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
                  ].includes(k),
              )
              .map(([k, v]) => (
                <Link
                  key={k}
                  href={nextUrl({ [k]: undefined, limit: undefined })}
                  aria-label={`Bỏ lọc ${k === "project" ? locations.find((p) => p.slug === v)?.name : v}`}
                >
                  {k === "project"
                    ? locations.find((p) => p.slug === v)?.name
                    : k === "nhu-cau"
                      ? "Đang bán"
                      : k === "gia-ban"
                        ? `Đến ${v} tỷ`
                        : k === "price"
                          ? `Đến ${v} triệu`
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
                  <button type="button" className="button button-outline">
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
              <Link
                href={nextUrl({ limit: String(visible + 9) })}
                className="button button-outline"
              >
                Xem thêm căn hộ
                <ArrowRight size={18} />
              </Link>
            </div>
          )}
        </section>
        <section className="rental-guide">
          <div>
            <span className="signature-kicker">TRƯỚC KHI CHỌN CĂN</span>
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
        {project && <ProjectMap place={content.locations[project.projectId]} />}
        <section className="rental-faq">
          <div>
            <span className="signature-kicker">GIẢI ĐÁP CÙNG ĐẤT VÀNG</span>
            <h2>
              Những điều bạn
              <br />
              <em>muốn biết thêm.</em>
            </h2>
            <CallContact label="Trao đổi trực tiếp" />
          </div>
          <div>
            {rentalFaqs.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
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
                <button type="button" className="button button-primary">
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
