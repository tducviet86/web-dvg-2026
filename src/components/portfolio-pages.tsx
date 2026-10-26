/** @jsxImportSource @/i18n/jsx */
import { BackButton } from "@/components/layout/back-button";
import Image from "next/image";
import Link from "@/components/page-navigation";
import {
  ArrowUpRight,
  MapPin,
  ArrowRight,
  Building2,
  Facebook,
  Phone,
} from "lucide-react";
import type { PortfolioProject } from "@/types";
import type { SiteContent } from "@/lib/api/content";
import { HomeProjects } from "./home-projects";
import { PhotoHero, SearchHero } from "./search-hero";
import type { HeroMode } from "./rental-hero-search";
import { isSaleSearch, searchUnits, type Filters } from "@/lib/filter";
import { PropertyCard, SaleCard } from "./cards";
import { CallContact } from "./call-contact";
import { ProjectMap } from "./project-map";
import { complexSchema, jsonLd } from "@/lib/structured-data";
import { href, t } from "@/i18n/server";
import { money } from "@/lib/utils";
import { companyHotline, telephoneHref } from "@/lib/company-contact";

const directoryCrumbs = (current: string) => (
  <>
    <BackButton />
    <Link href="/">Trang chủ</Link>
    <span>/</span>
    {current === "Dự án" ? (
      <span aria-current="page">Dự án</span>
    ) : (
      <>
        <Link href="/du-an">Dự án</Link>
        <span>/</span>
        <span aria-current="page">{current}</span>
      </>
    )}
  </>
);
const photosOf = (projects: PortfolioProject[]) =>
  projects
    .filter((p) => p.image)
    .slice(0, 4)
    .map((p) => ({ src: p.image, alt: p.imageAlt }));

/**
 * /du-an, /du-an/trien-khai, /du-an/van-hanh: full-screen photos, then the
 * projects. Operated projects get the same search as "Cho thuê" (results
 * listed below); projects under construction get shortcuts and a call.
 */
export function ProjectDirectory({
  group,
  content,
  filters = {},
}: {
  group?: "development" | "operation";
  content: SiteContent;
  filters?: Filters;
}) {
  const projects = content.portfolio;
  const development = projects.filter((p) => p.group === "development");
  const operation = projects.filter((p) => p.group === "operation");

  if (group === "operation") {
    const ids = new Set(operation.map((p) => p.projectId));
    const units = content.properties.filter((r) => ids.has(r.projectId));
    const sale = isSaleSearch(filters);
    const found = searchUnits(units, filters);
    const rentals = units.filter((r) => r.forRent !== false && r.price > 0);
    return (
      <main
        id="main"
        className="portfolio-page portfolio-directory directory-operation signature-home"
      >
        <SearchHero
          slides={photosOf(operation)}
          crumbs={directoryCrumbs("Dự án đang vận hành")}
          title="Dự án đang vận hành"
          subtitle={`${operation.length} dự án · thuê, mua và ký gửi căn hộ`}
          action="/du-an/van-hanh"
          mode={
            sale ? "mua" : filters["nhu-cau"] === "ky-gui" ? "ky-gui" : "thue"
          }
          values={filters}
          projects={operation
            .filter((p) => units.some((r) => r.projectId === p.projectId))
            .map((p) => [p.slug, p.name] as [string, string])}
          locations={[...new Set(units.map((r) => r.location))]}
          count={found.length}
          stats={
            <>
              <div>
                <dt>Căn đang trống</dt>
                <dd>{units.filter((r) => r.status === "Còn trống").length}</dd>
              </div>
              <div>
                <dt>Dự án vận hành</dt>
                <dd>{String(operation.length).padStart(2, "0")}</dd>
              </div>
              {rentals.length > 0 && (
                <div>
                  <dt>Giá thuê từ</dt>
                  <dd>
                    {money(Math.min(...rentals.map((r) => r.price)))}
                    <small> triệu/tháng</small>
                  </dd>
                </div>
              )}
            </>
          }
        />
        <div className="container">
          <section id="can-ho" className="operation-content">
            <div className="operation-content-heading">
              <div>
                <span className="signature-kicker">
                  {sale ? "MUA BÁN" : "KHÁM PHÁ KHÔNG GIAN SỐNG"}
                </span>
                <h2>{sale ? "Căn hộ đang bán" : "Căn hộ cho thuê"}</h2>
              </div>
              <span className="rental-result-count">
                {found.length} căn phù hợp
              </span>
            </div>
            {found.length ? (
              <div className={sale ? "sale-grid" : "grid grid-3"}>
                {found
                  .slice(0, 12)
                  .map((r) =>
                    sale ? (
                      <SaleCard key={r.id} property={r} />
                    ) : (
                      <PropertyCard key={r.id} property={r} />
                    ),
                  )}
              </div>
            ) : (
              <div className="inventory-empty sale-empty">
                <Building2 size={25} />
                <div>
                  <strong>Chưa có căn phù hợp với bộ lọc</strong>
                  <p>Thử bỏ bớt bộ lọc hoặc gọi để được tìm căn.</p>
                </div>
                <CallContact label="Gọi tư vấn" />
              </div>
            )}
            {found.length > 12 && (
              <Link
                className="button button-outline directory-more"
                href={`/cho-thue${sale ? "?nhu-cau=mua" : ""}#can-ho`}
              >
                Xem tất cả {found.length} căn <ArrowRight size={18} />
              </Link>
            )}
          </section>
          <div className="operation-content-heading directory-projects-title">
            <h2>Các dự án đang vận hành</h2>
            <span className="rental-result-count">
              {operation.length} dự án
            </span>
          </div>
        </div>
        <HomeProjects group="operation" projects={projects} />
      </main>
    );
  }

  if (group === "development")
    return (
      <main
        id="main"
        className="portfolio-page portfolio-directory directory-development signature-home"
      >
        <PhotoHero
          slides={photosOf(development)}
          crumbs={directoryCrumbs("Dự án đang triển khai")}
          title="Dự án đang triển khai"
          subtitle={`${development.length} dự án tại Đà Nẵng`}
          scroll={{ label: "Xem các dự án", target: "#du-an-trien-khai" }}
        >
          <div className="hero-shortcuts">
            <nav aria-label="Chọn dự án">
              {development.map((p) => (
                <Link key={p.id} href={`/du-an/${p.slug}`}>
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.location}</small>
                  </span>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <div className="hero-contact">
              <Link href="/lien-he?intent=mua-ban">
                <Building2 size={16} aria-hidden="true" />
                Tư vấn dự án
              </Link>
              <a href={telephoneHref() || href("/lien-he")}>
                <Phone size={16} aria-hidden="true" />
                Gọi <strong>{companyHotline}</strong>
              </a>
            </div>
          </div>
        </PhotoHero>
        <HomeProjects group="development" projects={projects} />
      </main>
    );

  return (
    <main
      id="main"
      className="portfolio-page portfolio-directory directory-all signature-home"
    >
      <PhotoHero
        slides={photosOf(projects)}
        crumbs={directoryCrumbs("Dự án")}
        title="Dự án của Đất Vàng Group"
        subtitle="Dự án đang triển khai và dự án đang vận hành tại Đà Nẵng"
        scroll={{ label: "Xem tất cả dự án", target: "#du-an-trien-khai" }}
      >
        <nav className="hero-groups" aria-label="Nhóm dự án">
          {[
            {
              href: "/du-an/trien-khai",
              label: "Đang triển khai",
              note: "Dự án mới, tư vấn mua",
              items: development,
            },
            {
              href: "/du-an/van-hanh",
              label: "Đang vận hành",
              note: "Thuê, mua và ký gửi căn hộ",
              items: operation,
            },
          ].map((g) => (
            <Link key={g.href} href={g.href}>
              <span className="hero-group-count">
                {String(g.items.length).padStart(2, "0")}
              </span>
              <span>
                <strong>{g.label}</strong>
                <small>{g.note}</small>
              </span>
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </PhotoHero>
      <HomeProjects group="development" projects={projects} />
      <HomeProjects group="operation" projects={projects} />
    </main>
  );
}
export function PortfolioDetail({
  project: p,
  content,
  filters = {},
}: {
  project: PortfolioProject;
  content: SiteContent;
  filters?: Filters;
}) {
  const development = p.group === "development";
  const story = content.stories[p.id];
  // The hero search drives the page: rent (default), buy or consign.
  const active: HeroMode = isSaleSearch(filters)
    ? "mua"
    : filters["nhu-cau"] === "ky-gui"
      ? "ky-gui"
      : "thue";
  const rooms = content.properties.filter((r) => r.projectId === p.projectId);
  // A unit can be offered for rent, for sale, or both (Admin › Căn hộ).
  const found = searchUnits(rooms, filters);
  const slides = [
    { src: p.image, alt: p.imageAlt },
    ...rooms
      .filter((r) => !r.isDemo && r.image)
      .map((r) => ({ src: r.image, alt: r.imageAlt || r.name })),
  ]
    .filter((x, i, all) => x.src && all.findIndex((y) => y.src === x.src) === i)
    .slice(0, 4);
  const crumbs = (
    <>
      <BackButton />
      <Link href="/">Trang chủ</Link>
      <span>/</span>
      <Link href={`/du-an/${development ? "trien-khai" : "van-hanh"}`}>
        {development ? "Dự án đang triển khai" : "Dự án đang vận hành"}
      </Link>
      <span>/</span>
      <span aria-current="page">{p.name}</span>
    </>
  );
  return (
    <main
      id="main"
      className={`portfolio-page portfolio-detail ${development ? "portfolio-development" : "portfolio-operation"}`}
    >
      {(() => {
        const api = content.apiProjects.find((x) => x.id === p.projectId);
        return api ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: jsonLd(
                complexSchema(
                  api,
                  href(`/du-an/${p.slug}`),
                  rooms.filter((r) => !r.isDemo && r.status === "Còn trống")
                    .length,
                  t,
                ),
              ),
            }}
          />
        ) : null;
      })()}
      {!development && (
        <SearchHero
          slides={slides}
          crumbs={crumbs}
          title={p.name}
          subtitle={
            <>
              <MapPin size={16} aria-hidden="true" />
              {p.location}
            </>
          }
          action={`/du-an/${p.slug}`}
          mode={active}
          values={filters}
          project={{ slug: p.slug, name: p.name }}
          count={found.length}
          stats={
            <>
              <div>
                <dt>Căn đang trống</dt>
                <dd>{rooms.filter((r) => r.status === "Còn trống").length}</dd>
              </div>
              {rooms.some((r) => r.forRent !== false && r.price > 0) && (
                <div>
                  <dt>Giá thuê từ</dt>
                  <dd>
                    {money(
                      Math.min(
                        ...rooms
                          .filter((r) => r.forRent !== false && r.price > 0)
                          .map((r) => r.price),
                      ),
                    )}
                    <small> triệu/tháng</small>
                  </dd>
                </div>
              )}
              {rooms.some((r) => r.forSale) && (
                <div>
                  <dt>Căn đang bán</dt>
                  <dd>{rooms.filter((r) => r.forSale).length}</dd>
                </div>
              )}
            </>
          }
        />
      )}
      <div className="container">
        {development && (
          <>
            <nav className="breadcrumb" aria-label="Đường dẫn">
              {crumbs}
            </nav>
            <header className="portfolio-detail-heading">
              <div>
                <h1>{p.name}</h1>
                <p className="location">
                  <MapPin size={16} />
                  {p.location}
                </p>
              </div>
              <p>{story.intro}</p>
            </header>
            <figure className="portfolio-cover">
              <Image
                src={p.image}
                alt={p.imageAlt}
                fill
                sizes="100vw"
                loading="eager"
              />
              <figcaption>
                {p.imageType}
                {p.source && (
                  <a href={p.source} target="_blank" rel="noreferrer">
                    Nguồn thông tin & hình ảnh <ArrowUpRight size={13} />
                  </a>
                )}
              </figcaption>
            </figure>
          </>
        )}
        {development ? (
          <>
            <nav className="portfolio-anchor-nav" aria-label="Nội dung dự án">
              <a href="#tong-quan">01 Tổng quan</a>
              <a href="#san-pham">02 Loại sản phẩm</a>
              <a href="#vi-tri">03 Vị trí & kết nối</a>
              <a href="#trao-doi">04 Trao đổi dự án</a>
            </nav>
            <section id="tong-quan" className="portfolio-overview">
              <div>
                <span className="signature-kicker">01 / GIỚI THIỆU DỰ ÁN</span>
                <h2>
                  Một góc nhìn
                  <br />
                  <em>về {p.name}.</em>
                </h2>
              </div>
              <div>
                {story.paragraphs.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
            </section>
            <div className="portfolio-highlights">
              {story.highlights.map((h, i) => (
                <article key={h.title}>
                  <span>0{i + 1}</span>
                  <h3>{h.title}</h3>
                  <p>{h.text}</p>
                </article>
              ))}
            </div>
            <section id="san-pham" className="portfolio-products">
              <div>
                <span className="signature-kicker">
                  02 / LOẠI HÌNH SẢN PHẨM
                </span>
                <h2>
                  Không gian cho
                  <br />
                  <em>những nhu cầu khác nhau.</em>
                </h2>
              </div>
              <ul>
                {story.products.map((t, i) => (
                  <li key={t}>
                    <span>0{i + 1}</span>
                    {t}
                    <ArrowUpRight size={20} />
                  </li>
                ))}
              </ul>
            </section>
            <section id="vi-tri" className="portfolio-location">
              <MapPin size={32} />
              <div>
                <span className="signature-kicker">03 / VỊ TRÍ & KẾT NỐI</span>
                <h2>{p.location}</h2>
                <p>
                  Khám phá khu vực xung quanh dự án để cân nhắc kết nối hằng
                  ngày, môi trường sống và nhu cầu sử dụng.
                </p>
              </div>
              <a
                className="text-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + " Đà Nẵng")}`}
                target="_blank"
                rel="noreferrer"
              >
                Mở bản đồ <ArrowUpRight size={18} />
              </a>
            </section>
            <section id="trao-doi" className="portfolio-direct">
              <div>
                <span className="signature-kicker">
                  04 / TRAO ĐỔI CÙNG ĐẤT VÀNG
                </span>
                <h2>
                  Tìm hiểu kỹ hơn
                  <br />
                  trước khi lựa chọn.
                </h2>
                <p>
                  Trao đổi về loại căn, thông tin mặt bằng và lịch tham quan dự
                  án.
                </p>
              </div>
              <CallContact label="Gọi tư vấn dự án" />
            </section>
          </>
        ) : (
          <>
            <section className="operation-intro">
              <p>{story.paragraphs[0] || story.intro}</p>
              {p.facebook && (
                <a
                  href={p.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-facebook project-facebook-lg"
                >
                  <Facebook size={18} aria-hidden="true" />
                  Theo dõi fanpage {p.name}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              )}
            </section>
            <section id="can-ho" className="operation-content">
              {active === "ky-gui" ? (
                <div className="operation-service">
                  <div>
                    <span className="signature-kicker">
                      DÀNH CHO CHỦ SỞ HỮU / {p.name}
                    </span>
                    <h2>
                      Ký gửi tài sản.
                      <br />
                      <em>Kết nối cơ hội phù hợp.</em>
                    </h2>
                    <p>
                      Gửi bán hoặc cho thuê căn hộ với một đầu mối trao đổi. Chủ
                      sở hữu chủ động thống nhất giá đề xuất, lịch xem và phạm
                      vi hỗ trợ trước khi giới thiệu tài sản.
                    </p>
                    <div className="consign-checklist">
                      <strong>Thông tin cần chuẩn bị</strong>
                      <ul>
                        <li>Mã căn, tầng, diện tích và số phòng ngủ</li>
                        <li>
                          Ảnh hiện trạng, nội thất và thời gian có thể xem
                        </li>
                        <li>Nhu cầu bán hoặc cho thuê, mức giá mong muốn</li>
                      </ul>
                    </div>
                    <CallContact label="Gọi trao đổi ký gửi" />
                  </div>
                  <ol className="service-steps">
                    {[
                      [
                        "Tiếp nhận thông tin",
                        "Trao đổi nhu cầu và thông tin căn hộ với chủ sở hữu.",
                      ],
                      [
                        "Thống nhất phương án",
                        "Xác nhận cách giới thiệu, điều kiện xem và phạm vi dịch vụ.",
                      ],
                      [
                        "Kết nối khách phù hợp",
                        "Cập nhật phản hồi và hỗ trợ sắp xếp lịch xem căn hộ.",
                      ],
                    ].map(([title, text], i) => (
                      <li key={title}>
                        <span>0{i + 1}</span>
                        <div>
                          <h3>{title}</h3>
                          <p>{text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <>
                  <div className="operation-content-heading">
                    <div>
                      <span className="signature-kicker">
                        {active === "mua"
                          ? `MUA BÁN · ${p.name}`
                          : "KHÁM PHÁ KHÔNG GIAN SỐNG"}
                      </span>
                      <h2>
                        {active === "mua"
                          ? `Căn hộ đang bán tại ${p.name}`
                          : `Căn hộ cho thuê tại ${p.name}`}
                      </h2>
                    </div>
                    <span className="rental-result-count">
                      {found.length} căn phù hợp
                    </span>
                  </div>
                  {found.some((r) => r.isDemo) && (
                    <p className="portfolio-data-note">
                      Một số căn là dữ liệu minh họa. Liên hệ để xác nhận quỹ
                      căn và hiện trạng thực tế.
                    </p>
                  )}
                  {found.length ? (
                    <div
                      className={active === "mua" ? "sale-grid" : "grid grid-3"}
                    >
                      {found.map((r) =>
                        active === "mua" ? (
                          <SaleCard key={r.id} property={r} />
                        ) : (
                          <PropertyCard key={r.id} property={r} />
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="inventory-empty sale-empty">
                      <Building2 size={25} />
                      <div>
                        <strong>
                          {active === "mua"
                            ? "Chưa có căn bán được công bố trên website"
                            : "Chưa có căn phù hợp với bộ lọc"}
                        </strong>
                        <p>
                          {active === "mua"
                            ? "Gọi để trao đổi quỹ căn đang bán tại dự án."
                            : "Thử bỏ bớt bộ lọc hoặc gọi để được tìm căn."}
                        </p>
                      </div>
                      <CallContact
                        label={
                          active === "mua"
                            ? "Gọi tư vấn mua bán"
                            : "Gọi tư vấn thuê"
                        }
                      />
                    </div>
                  )}
                </>
              )}
            </section>
            <ProjectMap place={content.locations[p.projectId]} />
          </>
        )}
        <section className="portfolio-related">
          <div className="operation-content-heading">
            <h2>Tiếp tục khám phá</h2>
            <Link
              href={`/du-an/${development ? "trien-khai" : "van-hanh"}`}
              className="text-link"
            >
              Xem danh mục <ArrowRight size={17} />
            </Link>
          </div>
          <div>
            {content.portfolio
              .filter((x) => x.group === p.group && x.id !== p.id)
              .slice(0, 3)
              .map((x) => (
                <Link key={x.id} href={`/du-an/${x.slug}`}>
                  <Image src={x.image} alt={x.name} width={160} height={110} />
                  <span>{x.name}</span>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}
