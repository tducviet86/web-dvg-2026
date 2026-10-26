/** @jsxImportSource @/i18n/jsx */
import { BackButton } from "@/components/layout/back-button";
import Link from "@/components/page-navigation";
import {
  MapPin,
  Expand,
  BedDouble,
  Bath,
  Layers,
  Check,
  ArrowUpRight,
  Sofa,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import type { Property } from "@/types";
import type { SiteContent } from "@/lib/api/content";
import { Favorite } from "./interactive";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RentalGallery } from "./rental-gallery";
import { RichText } from "./rich-text";
import { propertyMedia } from "@/lib/property-media";
import { ProjectMap } from "./project-map";
import { LuxuryBadges, PropertyCard, SaleCard } from "./cards";
import { ViewBeacon } from "./view-beacon";
import { CallContact } from "./call-contact";
import { money, salePrice, unitRef, vndFull } from "@/lib/utils";
import { groupAmenities } from "@/lib/amenities";
import { apartmentSchema, jsonLd } from "@/lib/structured-data";
import { href, t } from "@/i18n/server";
import { ShareButton } from "./rental-inquiry";
import { Reveal } from "./interactive";

export function RoomDetail({
  room: r,
  content,
  sale = false,
}: {
  room: Property;
  content: SiteContent;
  /** Sale view of the unit (price, terms and calls for buyers). */
  sale?: boolean;
}) {
  const project = content.projects.find((p) => p.id === r.projectId)!;
  const portfolio = content.portfolio.find((p) => p.projectId === r.projectId);
  const media = propertyMedia(r).filter(
    (m) =>
      m.type !== "video" ||
      // Legacy local files must exist in public/; uploads live on the media host.
      !m.src.startsWith("/images/") ||
      existsSync(join(process.cwd(), "public", m.src)),
  );
  const available = r.status === "Còn trống";
  const code = unitRef(r);
  const amenities = groupAmenities(r.amenityKeys ?? []);
  const amenityCount = amenities.reduce((n, g) => n + g.items.length, 0);
  const projectPage = `/du-an/${portfolio?.slug || project.slug}`;
  const salePriceText = r.saleVnd ? salePrice(r.saleVnd) : "Liên hệ";
  // Rent in full đồng ("25.000.000"); `price` is in triệu.
  const rentVnd = r.rentVnd ?? Math.round(r.price * 1e6);
  // "Còn trống" is rental wording; buyers see "Đang bán".
  const status = sale && available ? "Đang bán" : r.status;
  const related = content.properties.filter(
    (x) =>
      x.projectId === r.projectId &&
      x.id !== r.id &&
      (sale ? x.forSale : x.forRent !== false),
  );
  const facts = [
    { icon: Expand, value: `${r.area} m²`, label: "Diện tích" },
    {
      icon: BedDouble,
      value: r.bedrooms ? `${r.bedrooms} phòng` : "Studio",
      label: "Phòng ngủ",
    },
    { icon: Bath, value: `${r.bathrooms} phòng`, label: "Phòng tắm" },
    { icon: Layers, value: `Tầng ${r.floor}`, label: "Vị trí tầng" },
  ];
  return (
    <main
      id="main"
      className={`room-page portfolio-page${sale ? " room-sale" : ""}`}
    >
      {/* Sample units are not real listings: no structured data for them. */}
      {!r.isDemo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              apartmentSchema(
                r,
                content.apiProjects.find((p) => p.id === r.projectId),
                href(`/${sale ? "mua-ban" : "cho-thue"}/${r.slug}`),
                media.filter((m) => m.type === "image").map((m) => m.src),
                t,
              ),
            ),
          }}
        />
      )}
      <div className="container">
        <nav className="breadcrumb" aria-label="Đường dẫn">
          <BackButton />
          {sale ? (
            <>
              <Link href={projectPage}>{project.name}</Link>
              <span>/</span>
              <Link href={`${projectPage}?nhu-cau=mua-ban#nhu-cau`}>
                Mua bán
              </Link>
            </>
          ) : (
            <>
              <Link href="/cho-thue">Cho thuê căn hộ</Link>
              <span>/</span>
              <Link href={`/cho-thue/du-an/${project.slug}`}>
                {project.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span aria-current="page">Chi tiết căn hộ</span>
        </nav>
        {!r.isDemo && <ViewBeacon slug={r.slug} />}
        <header className="room-heading">
          <div>
            <h1>{r.name}</h1>
            <p className="location">
              <MapPin size={16} />
              {r.location}
            </p>
          </div>
          <div className="room-heading-tools">
            <ShareButton title={r.name} />
            <div className="room-save">
              <Favorite id={r.id} />
              <span>Lưu căn hộ</span>
            </div>
          </div>
        </header>
        <div className="room-quick-facts" aria-label="Thông tin nhanh">
          <span
            className={`room-availability ${available ? "" : "unavailable"}`}
          >
            {r.isDemo ? "Căn mẫu · " : ""}
            {status}
          </span>
          <LuxuryBadges property={r} className="lux-inline" />
          {facts.map((f) => (
            <span key={f.label}>
              <f.icon size={16} aria-hidden="true" />
              {f.value}
            </span>
          ))}
          <span>
            <Sofa size={16} aria-hidden="true" />
            {r.furniture}
          </span>
        </div>
        <RentalGallery media={media} title={r.name} demo={r.isDemo} />
        <p className="room-image-note">
          {r.isDemo
            ? "Thông số, giá và ảnh nội thất là dữ liệu mẫu, chưa phải tin chào thuê thực tế."
            : sale
              ? "Liên hệ để xác nhận hiện trạng, giá bán, pháp lý và lịch xem căn hộ."
              : "Liên hệ để xác nhận hiện trạng, giá thuê và lịch xem căn hộ."}
          {r.isDemo &&
            r.videoUrl &&
            " Video do doanh nghiệp cung cấp để xem thử giao diện."}
        </p>
        <div className="room-layout">
          <article className="room-description">
            <div className="room-facts">
              {facts.map((f) => (
                <div key={f.label}>
                  <f.icon size={24} />
                  <strong>{f.value}</strong>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
            <nav className="room-anchor-nav" aria-label="Thông tin căn hộ">
              <a href="#khong-gian">Không gian</a>
              {amenityCount > 0 && <a href="#tien-nghi">Tiện nghi</a>}
              <a href="#thong-tin">Thông số</a>
              <a href="#dieu-kien">
                {sale ? "Giá & giao dịch" : "Chi phí & điều kiện"}
              </a>
              <a href="#khu-vuc">Vị trí & bản đồ</a>
            </nav>
            <section id="khong-gian">
              <span className="signature-kicker">01 / KHÔNG GIAN SỐNG</span>
              <h2>Tổng quan căn hộ</h2>
              <RichText text={r.description} className="room-overview-text" />
              {!sale && (
                <div className="room-space-grid">
                  <div>
                    <Sofa size={24} />
                    <h3>Không gian sinh hoạt</h3>
                    <p>
                      Khu sinh hoạt chung kết nối khu bếp. Khi xem phòng, bạn có
                      thể kiểm tra ánh sáng, độ thoáng và cách bố trí thực tế.
                    </p>
                  </div>
                  <div>
                    <KeyRound size={24} />
                    <h3>Nội thất bàn giao</h3>
                    <p>
                      {r.furniture}. Danh sách thiết bị, tình trạng sử dụng và
                      hạng mục bàn giao cần được xác nhận theo từng căn.
                    </p>
                  </div>
                </div>
              )}
            </section>
            {amenityCount > 0 && (
              <section id="tien-nghi" className="room-amenities">
                <span className="signature-kicker">TIỆN NGHI</span>
                <h2>Tiện ích căn hộ</h2>
                <p className="room-amenities-count">{amenityCount} tiện nghi</p>
                <div className="room-amenity-groups">
                  {amenities.map((group) => (
                    <div key={group.title} className="room-amenity-group">
                      <h3>{group.title}</h3>
                      <ul>
                        {group.items.map((a) => (
                          <li key={a.key}>
                            <a.icon
                              size={22}
                              strokeWidth={1.6}
                              aria-hidden="true"
                            />
                            <span>{a.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section id="thong-tin">
              <span className="signature-kicker">02 / THÔNG SỐ CĂN HỘ</span>
              <h2>Thông số & nội thất</h2>
              <dl className="room-spec-table">
                {[
                  ["Mã căn", code],
                  ["Dự án", project.name],
                  ["Loại căn hộ", r.type],
                  ["Diện tích", `${r.area} m²`],
                  ["Phòng ngủ", r.bedrooms ? String(r.bedrooms) : "Studio"],
                  ["Phòng tắm", String(r.bathrooms)],
                  ["Tầng", String(r.floor)],
                  ["Nội thất", r.furniture],
                  [r.isDemo ? "Tình trạng mẫu" : "Tình trạng", status],
                  [
                    "Ngày cập nhật",
                    new Date(r.updatedAt).toLocaleDateString("vi-VN"),
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section id="dieu-kien">
              <span className="signature-kicker">
                {sale ? "03 / GIÁ & GIAO DỊCH" : "03 / CHI PHÍ & ĐIỀU KIỆN"}
              </span>
              <h2>
                {sale ? "Giá bán & giao dịch" : "Chi phí & điều kiện thuê"}
              </h2>
              <dl className="room-spec-table">
                {(sale
                  ? [
                      ["Giá bán", salePriceText],
                      [
                        "Hình thức",
                        r.forRent !== false ? "Bán · có thể cho thuê" : "Bán",
                      ],
                      ["Phí quản lý", r.managementFee || "Xác nhận khi xem"],
                      [
                        "Ngày bàn giao",
                        r.availableFrom || "Trao đổi theo từng căn",
                      ],
                      ["Thanh toán", "Thống nhất với chủ sở hữu"],
                    ]
                  : [
                      [
                        r.isDemo ? "Giá thuê minh họa" : "Giá thuê",
                        `${money(r.price)} triệu / tháng`,
                      ],
                      ["Tiền đặt cọc", r.deposit || "Trao đổi theo từng căn"],
                      [
                        "Phí quản lý",
                        r.managementFee || "Chưa bao gồm trong giá minh họa",
                      ],
                      [
                        "Thời hạn thuê",
                        r.minimumLease || "Thống nhất với chủ sở hữu",
                      ],
                      [
                        "Ngày nhận nhà",
                        r.availableFrom || "Xác nhận khi hẹn xem",
                      ],
                    ]
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {!sale && (
                <div className="room-check-note">
                  <Check size={20} />
                  <p>
                    {sale
                      ? "Trước khi đặt cọc, hãy đối chiếu giấy tờ pháp lý, tình trạng thanh toán với chủ đầu tư và danh mục bàn giao."
                      : "Khi xem căn hộ, hãy trao đổi thêm về điện nước, chỗ đỗ xe, danh mục nội thất và biên bản bàn giao."}
                  </p>
                </div>
              )}
            </section>
            <section id="khu-vuc" className="room-project-block">
              <span className="signature-kicker">
                04 / KHÔNG GIAN THUỘC VỀ DỰ ÁN
              </span>
              <h2>{project.name}</h2>
              <p>{project.description}</p>
              <ProjectMap place={content.locations[r.projectId]} />
              <Link href={projectPage} className="text-link">
                Khám phá dự án <ArrowUpRight size={18} />
              </Link>
            </section>
          </article>
          <aside className="room-contact-panel">
            <span className="signature-kicker">
              <ShieldCheck size={14} aria-hidden="true" /> ĐẤT VÀNG GROUP
            </span>
            {sale ? (
              <>
                <p className="room-price-label">Giá bán</p>
                <div className="room-price">{salePriceText}</div>
              </>
            ) : (
              <>
                <p className="room-price-label">
                  {r.isDemo
                    ? "Giá thuê tham khảo · Dữ liệu mẫu"
                    : "Giá thuê / tháng"}
                </p>
                <div className="room-price">
                  {vndFull(rentVnd)} <span>đồng / tháng</span>
                </div>
                {r.forSale && r.saleVnd ? (
                  <p className="room-sale-price">
                    Giá bán <strong>{salePrice(r.saleVnd)}</strong>
                  </p>
                ) : null}
              </>
            )}
            <span
              className={`room-availability ${available ? "" : "unavailable"}`}
            >
              {r.isDemo ? "Tình trạng mẫu: " : ""}
              {status}
            </span>
            <h2>
              {!available
                ? "Tìm căn hộ tương tự."
                : sale
                  ? "Trao đổi giá, pháp lý và lịch xem."
                  : "Trao đổi nhanh, hẹn xem thuận tiện."}
            </h2>
            <p>
              {!available
                ? "Liên hệ để kiểm tra tình trạng mới nhất hoặc tìm lựa chọn khác trong cùng dự án."
                : sale
                  ? "Gọi trực tiếp để xác nhận giá bán, giấy tờ và lịch xem căn hộ."
                  : "Gọi trực tiếp để xác nhận giá, hiện trạng và lịch xem căn hộ."}
            </p>
            {!sale && (
              <dl className="room-price-breakdown">
                <div>
                  <dt>Đặt cọc</dt>
                  <dd>{r.deposit || "Theo thỏa thuận"}</dd>
                </div>
                <div>
                  <dt>Phí quản lý</dt>
                  <dd>{r.managementFee || "Xác nhận khi xem"}</dd>
                </div>
                <div>
                  <dt>Thuê tối thiểu</dt>
                  <dd>{r.minimumLease || "Linh hoạt"}</dd>
                </div>
              </dl>
            )}

            <CallContact
              label={
                !available
                  ? "Gọi tìm căn tương tự"
                  : sale
                    ? "Gọi tư vấn mua bán"
                    : "Gọi hẹn xem phòng"
              }
              phone={r.contactPhone || undefined}
              className="button-outline-call"
            />
            <div className="room-call-context">
              <span>Mã căn khi trao đổi</span>
              <strong>
                {project.name} · {code}
              </strong>
            </div>
            <Link
              href={`/du-an/${project.slug}?nhu-cau=ky-gui#nhu-cau`}
              className="text-link"
            >
              Bạn có căn hộ cần ký gửi? <ArrowUpRight size={17} />
            </Link>
          </aside>
        </div>
        {related.length > 0 && (
          <Reveal>
            <section className="room-related">
              <div className="operation-content-heading">
                <div>
                  <span className="signature-kicker">
                    THÊM LỰA CHỌN CHO BẠN
                  </span>
                  <h2>{sale ? "Căn bán cùng dự án." : "Căn hộ cùng dự án."}</h2>
                </div>
                <Link
                  href={
                    sale
                      ? `${projectPage}?nhu-cau=mua-ban#nhu-cau`
                      : `/cho-thue/du-an/${project.slug}#can-ho`
                  }
                  className="text-link"
                >
                  Xem tất cả <ArrowUpRight size={18} />
                </Link>
              </div>
              <div className={sale ? "sale-grid" : "grid grid-3"}>
                {related
                  .slice(0, 3)
                  .map((x, i) =>
                    sale ? (
                      <SaleCard key={x.id} property={x} />
                    ) : (
                      <PropertyCard key={x.id} property={x} index={i} />
                    ),
                  )}
              </div>
            </section>
          </Reveal>
        )}
      </div>
      <div className="room-mobile-call">
        {sale ? (
          <div>
            <strong>{salePriceText}</strong>
            <span>Giá bán</span>
          </div>
        ) : (
          <div>
            <strong>{vndFull(rentVnd)} đ</strong>
            <span>/ tháng{r.isDemo ? " · Giá mẫu" : ""}</span>
          </div>
        )}
        <CallContact
          label={
            available ? (sale ? "Gọi tư vấn" : "Gọi hẹn xem") : "Gọi tư vấn"
          }
          phone={r.contactPhone || undefined}
        />
      </div>
    </main>
  );
}
