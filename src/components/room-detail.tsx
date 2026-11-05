/** @jsxImportSource @/i18n/jsx */
import { BackButton } from "@/components/layout/back-button";
import Link from "@/components/page-navigation";
import {
  MapPin,
  Expand,
  BedDouble,
  Layers,
  Check,
  ArrowUpRight,
  Sofa,
} from "lucide-react";
import type { Property } from "@/types";
import type { SiteContent } from "@/lib/api/content";
import { Favorite } from "./client-basics";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RentalGallery } from "./rental-gallery";
import { RichText } from "./rich-text";
import {
  modelUnitMedia,
  propertyMedia,
  type RentalMedia,
} from "@/lib/property-media";
import { FALLBACK_IMAGE } from "@/lib/api/content";
import { ProjectMap } from "./project-map";
import { LuxuryBadges, SaleCard } from "./cards";
import { modelUnit } from "@/lib/model-units";
import { ModelUnitBody } from "./model-unit";
import { SaleUnitBody } from "./sale-unit";
import { ViewBeacon } from "./view-beacon";
import { CallContact, WhatsAppContact } from "./call-contact";
import { salePrice, unitRef, vndFull } from "@/lib/utils";
import { groupAmenities } from "@/lib/amenities";
import { apartmentSchema, jsonLd } from "@/lib/structured-data";
import { getRequestLocale, href, t, tf } from "@/i18n/server";
import { ShareButton } from "./rental-inquiry";
import { Reveal } from "./client-basics";
import { RentalMini, rentalScore } from "./home-rentals";
import { ShowMore } from "./show-more";
import { RecentUnits } from "./recent-units";
import { floorLabel, groupLabel, hasRooms } from "@/lib/property-groups";
import { moveInLabel, statusLabel } from "@/lib/availability";
import { RENT_FEES } from "@/lib/included-fees";

/**
 * "1 tháng tiền nhà · 25.000.000 đ" → ["1 tháng tiền nhà · ", "25.000.000",
 * " đ"]: each piece is translated on its own, so the words are translated
 * once for every price instead of once per amount.
 */
const splitAmounts = (text: string) =>
  text.split(/(\d{1,3}(?:\.\d{3})+)/).filter(Boolean);

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
  // The unit comes fresh from the API while the project list may be up to a
  // few minutes old (a project just published): the page must still open.
  const project = content.projects.find((p) => p.id === r.projectId) ?? {
    slug: r.projectSlug ?? "",
    name: r.projectName ?? "",
    description: "",
  };
  const portfolio = content.portfolio.find((p) => p.projectId === r.projectId);
  const ownMedia = propertyMedia(r).filter(
    (m) =>
      m.type !== "video" ||
      // Legacy local files must exist in public/; uploads live on the media host.
      !m.src.startsWith("/images/") ||
      existsSync(join(process.cwd(), "public", m.src)),
  );
  const projectApi = content.apiProjects.find((x) => x.id === r.projectId);
  const modelOf = (unit: Property, own: RentalMedia[]) =>
    modelUnitMedia(unit, own, projectApi?.photos ?? [], [
      FALLBACK_IMAGE,
      portfolio?.image ?? "",
    ]);
  const modelMedia = modelOf(r, ownMedia);
  const model = sale ? modelUnit(r) : undefined;
  const usesModel = modelMedia.length > 0;
  const media = usesModel ? modelMedia : ownMedia;
  const available = r.status === "Còn trống";
  const code = unitRef(r);
  // Visitors reading in another language chat on WhatsApp rather than call.
  const foreign = getRequestLocale() !== "vi";
  const whatsappMessage = tf(
    "Xin chào Đất Vàng Group, tôi quan tâm căn {code} tại {project}.",
    { code, project: project.name },
  );
  // Shophouse / mặt bằng: no apartment amenities shown.
  const amenities = hasRooms(r) ? groupAmenities(r.amenityKeys ?? []) : [];
  const amenityCount = amenities.reduce((n, g) => n + g.items.length, 0);
  const projectPage = `/du-an/${portfolio?.slug || project.slug}`;
  const salePriceText = r.saleVnd ? salePrice(r.saleVnd) : "Liên hệ";
  // Rent in full đồng ("25.000.000"); `price` is in triệu.
  const rentVnd = r.rentVnd ?? Math.round(r.price * 1e6);
  // "Còn trống" is rental wording; buyers see "Đang bán".
  const status = r.floorNote
    ? "Căn mẫu"
    : sale && available
      ? "Đang bán"
      : statusLabel(r);
  const fees = RENT_FEES.filter(([key]) => r.includedFees?.includes(key));
  const feesOut = RENT_FEES.filter(([key]) => !r.includedFees?.includes(key));
  /** Each name is its own text, translated once: "Nước", ", ", "Điện"… */
  const feeNames = (list: [string, string][]) =>
    list.flatMap(([, label], i) => (i ? [", ", label] : [label]));
  const others = content.properties.filter(
    (x) =>
      x.id !== r.id &&
      (sale ? x.forSale : x.forRent !== false) &&
      // Sample units only next to other samples.
      (r.isDemo || !x.isDemo),
  );
  const related = others.filter((x) => x.projectId === r.projectId);
  // "Khám phá thêm": hot / much-viewed units first, taking turns between
  // projects so Monarchy, Panoma, Ponte… all show up early.
  const ranked = others
    .map((p, order) => ({ p, order }))
    .sort((a, b) => rentalScore(b.p) - rentalScore(a.p) || a.order - b.order)
    .map(({ p }) => p);
  const byProject = new Map<string, Property[]>();
  for (const p of ranked)
    byProject.set(p.projectId, [...(byProject.get(p.projectId) ?? []), p]);
  const explore: Property[] = [];
  for (let i = 0; explore.length < Math.min(5, ranked.length); i++)
    for (const list of byProject.values()) if (list[i]) explore.push(list[i]);
  // A few suggestions; "Xem tất cả" opens the full list.
  explore.splice(5);
  // Shophouse / mặt bằng: no bedrooms or bathrooms, just the area.
  const rooms = hasRooms(r);
  const facts = [
    { icon: Expand, value: `${r.area} m²`, label: "Diện tích" },
    ...(rooms
      ? [
          {
            icon: BedDouble,
            value: r.bedrooms ? String(r.bedrooms) : r.type,
            label: "Phòng ngủ",
          },
        ]
      : []),
    ...(floorLabel(r)
      ? [{ icon: Layers, value: String(r.floor), label: "Tầng" }]
      : []),
    // Short: the label already says "Nội thất", and it all fits one row.
    {
      icon: Sofa,
      value:
        {
          "Đầy đủ nội thất": "Đầy đủ",
          "Nội thất cơ bản": "Cơ bản",
          "Không nội thất": "Không có",
        }[r.furniture] ?? r.furniture,
      label: "Nội thất",
    },
  ];
  const saleList =
    portfolio?.group === "development"
      ? `${projectPage}#can-mau`
      : `${projectPage}?nhu-cau=mua-ban#nhu-cau`;
  const amenityBlock = amenityCount > 0 && (
    <section id="tien-nghi" className="room-amenities">
      <span className="signature-kicker">TIỆN NGHI</span>
      <h2>Tiện ích căn hộ</h2>
      <p className="room-amenities-count">{amenityCount} tiện nghi</p>
      <ShowMore height={330}>
        <div className="room-amenity-groups">
          {amenities.map((group) => (
            <div key={group.title} className="room-amenity-group">
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((a) => (
                  <li key={a.key}>
                    <a.icon size={22} strokeWidth={1.6} aria-hidden="true" />
                    <span>{a.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </ShowMore>
    </section>
  );
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
              <Link href={saleList}>Mua bán</Link>
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
        {model ? (
          <ModelUnitBody
            unit={r}
            model={model}
            api={projectApi}
            projectName={project.name}
            projectPage={projectPage}
            foreign={foreign}
            whatsappMessage={whatsappMessage}
          />
        ) : (
          <>
            <RentalGallery
              media={media}
              title={r.name}
              demo={r.isDemo || usesModel}
            />
            <p className="room-image-note" data-demo={r.isDemo || undefined}>
              {usesModel && "Hình ảnh căn hộ mẫu, mang tính minh họa. "}
              {r.isDemo
                ? "Thông số, giá và ảnh nội thất là dữ liệu mẫu, chưa phải tin chào thuê thực tế."
                : sale
                  ? "Liên hệ để xác nhận hiện trạng, giá bán, pháp lý và lịch xem căn hộ."
                  : "Liên hệ để xác nhận hiện trạng, giá thuê và lịch xem căn hộ."}
              {r.isDemo &&
                r.videoUrl &&
                " Video do doanh nghiệp cung cấp để xem thử giao diện."}
            </p>
            {sale ? (
              <SaleUnitBody
                unit={r}
                api={projectApi}
                projectName={project.name}
                projectDescription={project.description}
                projectPage={projectPage}
                place={content.locations[r.projectId]}
                status={status}
                available={available}
                foreign={foreign}
                whatsappMessage={whatsappMessage}
                amenities={amenityBlock}
              />
            ) : (
              <div className="room-layout">
                <article className="room-description">
                  <header className="room-heading">
                    <div>
                      <div className="room-tags">
                        <span
                          className={`room-availability ${available ? "" : "unavailable"}`}
                        >
                          {r.isDemo ? "Căn mẫu · " : ""}
                          {status}
                        </span>
                        <LuxuryBadges property={r} className="lux-inline" />
                      </div>
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
                  <div
                    className="room-quick-facts"
                    aria-label="Thông tin nhanh"
                  >
                    {facts.map((f) => (
                      <div key={f.label}>
                        <f.icon size={20} aria-hidden="true" />
                        <span>
                          <small>{f.label}</small>
                          <strong>{f.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                  <nav
                    className="room-anchor-nav"
                    aria-label="Thông tin căn hộ"
                  >
                    <a href="#khong-gian">Không gian</a>
                    <a href="#dieu-kien">Chi phí & điều kiện</a>
                    <a href="#thong-tin">Thông số</a>
                    {amenityCount > 0 && <a href="#tien-nghi">Tiện nghi</a>}
                    <a href="#khu-vuc">Vị trí & bản đồ</a>
                  </nav>
                  <section id="khong-gian">
                    <span className="signature-kicker">
                      01 / KHÔNG GIAN SỐNG
                    </span>
                    <h2>Tổng quan căn hộ</h2>
                    <RichText
                      text={r.description}
                      className="room-overview-text"
                    />
                  </section>
                  <section id="dieu-kien">
                    <span className="signature-kicker">
                      02 / CHI PHÍ & ĐIỀU KIỆN
                    </span>
                    <h2>Chi phí & điều kiện thuê</h2>
                    <dl className="room-spec-table">
                      {[
                        [
                          r.isDemo ? "Giá thuê minh họa" : "Giá thuê",
                          `${vndFull(rentVnd)} đồng / tháng`,
                        ],
                        ["Tiền đặt cọc", r.deposit || "Trao đổi theo từng căn"],
                        ...(r.managementFee
                          ? [["Phí quản lý", r.managementFee]]
                          : []),
                        [
                          "Thời hạn thuê",
                          r.minimumLease || "Thống nhất với chủ sở hữu",
                        ],
                        [
                          "Ngày nhận nhà",
                          moveInLabel(r) || "Xác nhận khi hẹn xem",
                        ],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{splitAmounts(v)}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="room-check-note">
                      <Check size={20} />
                      <p>
                        Khi xem căn hộ, hãy trao đổi thêm về điện nước, chỗ đỗ
                        xe, danh mục nội thất và biên bản bàn giao.
                      </p>
                    </div>
                  </section>
                  <section id="thong-tin">
                    <span className="signature-kicker">
                      03 / THÔNG SỐ CĂN HỘ
                    </span>
                    <h2>Thông số & nội thất</h2>
                    <ShowMore height={300}>
                      <dl className="room-spec-table">
                        {[
                          ["Mã căn", code],
                          ["Dự án", project.name],
                          [
                            "Loại hình",
                            `${groupLabel(r.typeGroup)} · ${r.type}`,
                          ],
                          ["Diện tích", `${r.area} m²`],
                          ...(rooms
                            ? [
                                [
                                  "Phòng ngủ",
                                  r.bedrooms ? String(r.bedrooms) : r.type,
                                ],
                                ["Phòng tắm", String(r.bathrooms)],
                              ]
                            : []),
                          ...(floorLabel(r) ? [["Tầng", String(r.floor)]] : []),
                          ["Nội thất", r.furniture],
                          [r.isDemo ? "Tình trạng mẫu" : "Tình trạng", status],
                          [
                            "Ngày cập nhật",
                            new Date(r.updatedAt).toLocaleDateString("vi-VN"),
                          ],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{splitAmounts(v)}</dd>
                          </div>
                        ))}
                      </dl>
                    </ShowMore>
                  </section>
                  {amenityBlock}
                  <section id="khu-vuc" className="room-project-block">
                    <span className="signature-kicker">
                      04 / KHÔNG GIAN THUỘC VỀ DỰ ÁN
                    </span>
                    <h2>{project.name}</h2>
                    <p>{project.description}</p>
                    <ProjectMap place={content.locations[r.projectId]} />
                    <Link href={projectPage} className="room-project-link">
                      <span>
                        <small>Dự án</small>
                        <strong>Khám phá {project.name}</strong>
                      </span>
                      <ArrowUpRight size={18} aria-hidden="true" />
                    </Link>
                  </section>
                </article>
                <aside className="room-contact-panel">
                  <CallContact
                    label={
                      available
                        ? "Gọi hẹn xem/đặt phòng"
                        : "Gọi tìm căn tương tự"
                    }
                    phone={r.contactPhone || undefined}
                    className="button-outline-call"
                  />
                  {foreign && (
                    <WhatsAppContact
                      label="Chat WhatsApp"
                      message={whatsappMessage}
                      className="room-whatsapp"
                    />
                  )}
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
                  <dl className="room-price-breakdown">
                    <div>
                      <dt>Tình trạng</dt>
                      <dd
                        className={`room-availability ${available ? "" : "unavailable"}`}
                      >
                        {r.isDemo ? "Mẫu: " : ""}
                        {status}
                      </dd>
                    </div>
                    {moveInLabel(r) && (
                      <div>
                        <dt>Nhận nhà</dt>
                        <dd>{moveInLabel(r)}</dd>
                      </div>
                    )}
                    {!sale && (
                      <>
                        <div>
                          <dt>Đặt cọc</dt>
                          <dd>
                            {splitAmounts(r.deposit || "Theo thỏa thuận")}
                          </dd>
                        </div>
                        <div>
                          <dt>Thuê tối thiểu</dt>
                          <dd>{r.minimumLease || "Linh hoạt"}</dd>
                        </div>
                      </>
                    )}
                    <div>
                      <dt>Mã căn</dt>
                      <dd>
                        <b>{code}</b>
                      </dd>
                    </div>
                  </dl>
                  {!sale && (
                    <div className="room-included-fees">
                      {feesOut.length > 0 && (
                        <p className="room-fees-out">
                          <span>Giá thuê chưa bao gồm</span>
                          {feeNames(feesOut)}
                        </p>
                      )}
                      {fees.length > 0 && (
                        <>
                          <p>Giá thuê đã bao gồm</p>
                          <ul>
                            {fees.map(([key, label]) => (
                              <li key={key}>
                                <Check size={15} aria-hidden="true" />
                                {label}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </aside>
              </div>
            )}
          </>
        )}
        {sale
          ? related.length > 0 && (
              <Reveal>
                <section className="room-related">
                  <div className="operation-content-heading">
                    <div>
                      <span className="signature-kicker">
                        THÊM LỰA CHỌN CHO BẠN
                      </span>
                      <h2>{model ? "Căn mẫu cùng dự án." : "Căn bán cùng dự án."}</h2>
                    </div>
                    <Link href={saleList} className="text-link">
                      Xem tất cả <ArrowUpRight size={18} />
                    </Link>
                  </div>
                  <div className="sale-grid">
                    {related.slice(0, 3).map((x) => (
                      <SaleCard
                        key={x.id}
                        property={x}
                        image={(() => {
                          const album = modelOf(x, propertyMedia(x));
                          return (album[1] ?? album[0])?.src;
                        })()}
                      />
                    ))}
                  </div>
                </section>
              </Reveal>
            )
          : explore.length > 0 && (
              <section className="room-more" aria-labelledby="room-explore">
                <div className="room-more-head">
                  <div>
                    <span className="signature-kicker">KHÁM PHÁ THÊM</span>
                    <h2 id="room-explore">Căn hộ nổi bật đang được quan tâm</h2>
                  </div>
                  <Link href="/cho-thue" className="text-link">
                    Xem tất cả <ArrowUpRight size={18} />
                  </Link>
                </div>
                <ul className="room-strip">
                  {explore.map((x) => (
                    <RentalMini key={x.id} unit={x} />
                  ))}
                </ul>
              </section>
            )}
        {!sale && (
          <RecentUnits
            current={{
              slug: r.slug,
              name: r.name,
              image: media.find((m) => m.type === "image")?.src ?? r.image,
              project: project.name,
              area: r.area,
              bedrooms: r.bedrooms,
              type: r.type,
              rent: vndFull(rentVnd),
            }}
          />
        )}
      </div>
      <div className="room-mobile-call">
        {sale ? (
          <div>
            <strong>{model ? code.replace(/-T5$/, "") : salePriceText}</strong>
            <span>{model ? "Căn mẫu" : "Giá bán"}</span>
          </div>
        ) : (
          <div>
            <strong>{vndFull(rentVnd)} đ</strong>
            <span>/ tháng{r.isDemo ? " · Giá mẫu" : ""}</span>
          </div>
        )}
        {foreign ? (
          <WhatsAppContact label="WhatsApp" message={whatsappMessage} />
        ) : (
          <CallContact
            label={
              available ? (sale ? "Gọi tư vấn" : "Gọi hẹn xem") : "Gọi tư vấn"
            }
            phone={r.contactPhone || undefined}
          />
        )}
      </div>
    </main>
  );
}
