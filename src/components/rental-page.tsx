/** @jsxImportSource @/i18n/jsx */
import { BackButton } from "@/components/layout/back-button";
import { href } from "@/i18n/server";
import Image from "next/image";
import Link from "@/components/page-navigation";
import {
  ArrowUpRight,
  ArrowRight,
  LayoutGrid,
  List,
  MapPin,
  Check,
  Phone,
  MessageCircle,
  KeyRound,
  Facebook,
} from "lucide-react";
import type { PortfolioProject } from "@/types";
import type { SiteContent } from "@/lib/api/content";
import { rentalFaqs } from "@/data/rental-content";
import { filterProperties, type Filters } from "@/lib/filter";
import { RentalSearch } from "./rental-search";
import { PropertyCard } from "./cards";
import { ProjectMap } from "./project-map";
import { CallContact } from "./call-contact";
import { companyHotline, telephoneHref } from "@/lib/company-contact";
import { money, siteUrl } from "@/lib/utils";
import { InquiryDialog } from "./rental-inquiry";
import { Counter } from "./counter";

const quickFilters: { label: string; set: Record<string, string> }[] = [
  { label: "Studio", set: { bedrooms: "0" } },
  { label: "1 phòng ngủ", set: { bedrooms: "1" } },
  { label: "2 phòng ngủ", set: { bedrooms: "2" } },
  { label: "Dưới 15 triệu", set: { price: "15" } },
  { label: "Còn trống", set: { status: "Còn trống" } },
];

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
  const result = filterProperties(content.properties, effective);
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
  const cover = project || locations[0] || content.portfolio[0];
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
      <section className="rental-intro container">
        <div className="rental-intro-copy">
          <nav className="breadcrumb" aria-label="Đường dẫn">
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
          </nav>
          <span className="signature-kicker">ĐẤT VÀNG LIVING / ĐÀ NẴNG</span>
          <h1>
            {project ? (
              <>
                Cho thuê căn hộ
                <br />
                <em>{project.name}.</em>
              </>
            ) : (
              <>
                Một nơi ở.
                <br />
                <em>Đúng nhịp sống bạn.</em>
              </>
            )}
          </h1>
          <p>
            {guide?.intro ||
              "Tìm căn hộ cho thuê tại Đà Nẵng theo dự án, ngân sách và không gian bạn cần. Xem thông tin căn, lưu lựa chọn yêu thích và gọi trực tiếp để hẹn xem."}
          </p>
          <div className="rental-intro-actions">
            <InquiryDialog
              mode="advice"
              target={
                project
                  ? { projectSlug: project.slug, label: project.name }
                  : {}
              }
              trigger={
                <button type="button" className="button button-primary">
                  <MessageCircle size={18} /> Nhờ tư vấn chọn căn
                </button>
              }
            />
            <a
              className="rental-intro-call"
              href={telephoneHref() || href("/lien-he")}
            >
              <Phone size={17} />
              <span>
                Gọi <strong>{companyHotline}</strong>
              </span>
              <ArrowUpRight size={19} />
            </a>
          </div>
          {project?.facebook && (
            <a
              className="project-facebook rental-fanpage"
              href={project.facebook}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook size={15} aria-hidden="true" />
              Fanpage {project.name}
            </a>
          )}
          <dl className="rental-stats">
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
          </dl>
        </div>
        <figure className="rental-intro-visual">
          <Image
            src={cover.image}
            alt={cover.imageAlt}
            fill
            sizes="(max-width: 800px) 100vw, 42vw"
            loading="eager"
          />
          <figcaption>
            <MapPin size={18} />
            <div>
              <strong>{cover.name}</strong>
              <span>
                {cover.location} · {cover.imageType}
              </span>
            </div>
          </figcaption>
          <span className="rental-visual-label">THE PLACES WE CALL HOME</span>
        </figure>
      </section>
      <div className="container">
        <RentalSearch
          values={effective}
          action={base}
          projectId={project?.projectId}
          content={content}
        />
        <nav className="rental-project-nav" aria-label="Thuê theo dự án">
          <Link
            href="/cho-thue#can-ho"
            aria-current={!project ? "page" : undefined}
          >
            Tất cả dự án
          </Link>
          {locations.map((p) => (
            <Link
              key={p.id}
              href={`/cho-thue/du-an/${p.slug}#can-ho`}
              aria-current={p.id === project?.id ? "page" : undefined}
            >
              {p.name}
            </Link>
          ))}
        </nav>
        <section
          id="can-ho"
          className="rental-results"
          aria-label="Kết quả tìm kiếm"
        >
          <div className="rental-results-heading">
            <div>
              <span className="signature-kicker">KHÔNG GIAN DÀNH CHO BẠN</span>
              <h2>
                {project
                  ? `Căn hộ tại ${project.name}`
                  : "Khám phá căn hộ cho thuê"}
              </h2>
            </div>
            <span className="rental-result-count">
              {result.length} căn phù hợp
            </span>
          </div>
          <div className="rental-results-meta">
            <nav className="rental-quick-filters" aria-label="Lọc nhanh">
              {quickFilters.map((q) => {
                const [key, value] = Object.entries(q.set)[0];
                const active = effective[key] === value;
                return (
                  <Link
                    key={q.label}
                    href={nextUrl({
                      [key]: active ? undefined : value,
                      limit: undefined,
                    })}
                    aria-current={active ? "true" : undefined}
                  >
                    {active && <Check size={14} aria-hidden="true" />}
                    {q.label}
                  </Link>
                );
              })}
            </nav>
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
              {result.slice(0, visible).map((p, i) => (
                <PropertyCard property={p} key={p.id} index={i} />
              ))}
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
