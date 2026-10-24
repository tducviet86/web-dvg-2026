/** @jsxImportSource @/i18n/jsx */
import { BackButton } from "@/components/layout/back-button";
import Image from "next/image";
import Link from "@/components/page-navigation";
import {
  ArrowUpRight,
  MapPin,
  ArrowRight,
  Building2,
  KeyRound,
  Handshake,
  Facebook,
} from "lucide-react";
import type { PortfolioProject } from "@/types";
import type { SiteContent } from "@/lib/api/content";
import { HomeProjects } from "./home-projects";
import { PropertyCard } from "./cards";
import { CallContact } from "./call-contact";
import { ProjectMap } from "./project-map";
import { complexSchema, jsonLd } from "@/lib/structured-data";
import { href, t } from "@/i18n/server";

export function ProjectDirectory({
  group,
  projects,
}: {
  group?: "development" | "operation";
  projects: PortfolioProject[];
}) {
  return (
    <main
      id="main"
      className="portfolio-page portfolio-directory signature-home"
    >
      <header className="container portfolio-intro">
        <span className="signature-kicker">DANH MỤC ĐẤT VÀNG GROUP</span>
        <h1>
          Dự án &<br />
          <em>những giá trị kết nối.</em>
        </h1>
        <p>
          Tìm hiểu dự án triển khai. Khám phá căn hộ và các dịch vụ mua bán, cho
          thuê, ký gửi tại dự án đang vận hành.
        </p>
        <nav className="portfolio-tabs" aria-label="Nhóm dự án">
          {[
            ["Tất cả", "/du-an", undefined],
            ["Triển khai", "/du-an/trien-khai", "development"],
            ["Vận hành", "/du-an/van-hanh", "operation"],
          ].map(([label, href, value]) => (
            <Link
              key={href}
              href={href!}
              aria-current={value === group ? "page" : undefined}
            >
              {label}
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </nav>
      </header>
      {(!group || group === "development") && (
        <HomeProjects group="development" projects={projects} />
      )}
      {(!group || group === "operation") && (
        <HomeProjects group="operation" projects={projects} />
      )}
    </main>
  );
}
const modes = [
  { key: "mua-ban", label: "Mua bán", icon: Building2 },
  { key: "thue", label: "Cho thuê", icon: KeyRound },
  { key: "ky-gui", label: "Ký gửi", icon: Handshake },
];
export function PortfolioDetail({
  project: p,
  content,
  mode = "thue",
}: {
  project: PortfolioProject;
  content: SiteContent;
  mode?: string;
}) {
  const development = p.group === "development";
  const story = content.stories[p.id];
  const active = modes.some((m) => m.key === mode) ? mode : "thue";
  const rooms = content.properties.filter((r) => r.projectId === p.projectId);
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
      <div className="container">
        <nav className="breadcrumb" aria-label="Đường dẫn">
          <BackButton />
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <Link href={`/du-an/${development ? "trien-khai" : "van-hanh"}`}>
            {development ? "Dự án đang triển khai" : "Dự án đang vận hành"}
          </Link>
          <span>/</span>
          <span aria-current="page">{p.name}</span>
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
            <section className="operation-overview">
              <div>
                <span className="signature-kicker">
                  ĐỒNG HÀNH CÙNG KHÁCH HÀNG & CHỦ SỞ HỮU
                </span>
                <h2>
                  Bạn đang quan tâm
                  <br />
                  <em>điều gì tại {p.name}?</em>
                </h2>
              </div>
              <div>
                <p>{story.paragraphs[0]}</p>
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
              </div>
            </section>
            <nav className="operation-modes" aria-label="Nhu cầu tại dự án">
              {modes.map((m) => (
                <Link
                  key={m.key}
                  href={`/du-an/${p.slug}?nhu-cau=${m.key}#nhu-cau`}
                  aria-current={active === m.key ? "page" : undefined}
                >
                  <m.icon size={22} />
                  <span>{m.label}</span>
                  <ArrowUpRight size={20} />
                </Link>
              ))}
            </nav>
            <section id="nhu-cau" className="operation-content">
              {active === "thue" ? (
                <>
                  <div className="operation-content-heading">
                    <div>
                      <span className="signature-kicker">
                        KHÁM PHÁ KHÔNG GIAN SỐNG
                      </span>
                      <h2>Căn hộ cho thuê tại {p.name}</h2>
                    </div>
                    <Link
                      href={`/cho-thue/du-an/${p.slug}`}
                      className="text-link"
                    >
                      Tìm & lọc căn hộ <ArrowUpRight size={18} />
                    </Link>
                  </div>
                  <p className="portfolio-data-note">
                    Danh sách căn hộ, giá và ảnh nội thất là dữ liệu minh họa.
                    Liên hệ để xác nhận quỹ căn và hiện trạng thực tế.
                  </p>
                  <div className="grid grid-3">
                    {rooms.map((r) => (
                      <PropertyCard key={r.id} property={r} />
                    ))}
                  </div>
                </>
              ) : active === "mua-ban" ? (
                <div className="operation-service">
                  <div>
                    <span className="signature-kicker">MUA BÁN / {p.name}</span>
                    <h2>
                      Tìm căn hộ phù hợp.
                      <br />
                      <em>Kết nối đúng nhu cầu.</em>
                    </h2>
                    <p>
                      Trao đổi ngân sách, diện tích, số phòng ngủ và mục tiêu sử
                      dụng. Đất Vàng tiếp nhận nhu cầu mua hoặc bán, hỗ trợ kết
                      nối và sắp xếp xem căn hộ.
                    </p>
                    <div className="inventory-empty">
                      <Building2 size={25} />
                      <div>
                        <strong>
                          Chưa có căn bán được công bố trên website
                        </strong>
                        <p>
                          Gọi để trao đổi quỹ căn và thông tin của từng chủ sở
                          hữu.
                        </p>
                      </div>
                    </div>
                    <CallContact label="Gọi tư vấn mua bán" />
                  </div>
                  <ol className="service-steps">
                    {[
                      [
                        "Trao đổi nhu cầu",
                        "Ngân sách, loại căn, tầng và thời gian dự kiến.",
                      ],
                      [
                        "Đối chiếu thông tin",
                        "Xem thông tin tài sản, hiện trạng và hồ sơ do chủ sở hữu cung cấp.",
                      ],
                      [
                        "Hẹn xem căn hộ",
                        "Thống nhất lịch xem và trao đổi các điều kiện giao dịch.",
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
