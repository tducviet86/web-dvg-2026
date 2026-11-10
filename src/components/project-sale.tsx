/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  Check,
  House,
  Layers,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import Link from "@/components/page-navigation";
import { t } from "@/i18n/server";
import type { ApiProject, PaymentStep } from "@/lib/api/types";
import { vacantNow } from "@/lib/availability";
import { paymentAmounts } from "@/lib/payment";
import { videoSource, type RentalMedia } from "@/lib/property-media";
import { modelUnit } from "@/lib/model-units";
import { projectSiteMap } from "@/lib/project-site-maps";
import { roomsLabel, hasRooms } from "@/lib/property-groups";
import { unitRef, vndFull } from "@/lib/utils";
import { companyHotline, telephoneHref } from "@/lib/company-contact";
import { CallContact } from "./call-contact";
import { FaqSection } from "./faq-section";
import { saleFaqs } from "@/lib/faq";
import { handoverSummary } from "@/lib/handover";
import { ProjectMap } from "./project-map";
import type { MapBuilding } from "./rental-map";
import {
  GalleryTabs,
  PaymentPlanner,
  ProjectDesk,
  ProjectLeadForm,
  UnitBrowser,
  type DeskUnit,
} from "./project-sale-desk";
import { PhotoHero } from "./search-hero";
import { TourShowcase } from "./tour-360";
import type {
  PortfolioProject,
  ProjectLocation,
  ProjectStory,
  Property,
} from "@/types";

const percentText = (n: number) => `${n.toLocaleString("vi-VN")}%`;

/** The payment steps with the money due at each, for one unit's price. */
export function PaymentTable({
  steps,
  price,
}: {
  steps: PaymentStep[];
  price: number;
}) {
  const amounts = paymentAmounts(price, steps);
  return (
    <div className="payment-table">
      <table>
        <thead>
          <tr>
            <th scope="col">Đợt thanh toán</th>
            <th scope="col">Tỷ lệ</th>
            <th scope="col">Số tiền</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={step.label}>
              <th scope="row">
                {step.label}
                {step.timing && <small>{step.timing}</small>}
              </th>
              <td>{percentText(step.percent)}</td>
              <td>
                {vndFull(amounts[i])} <span>đồng</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Tổng cộng</th>
            <td>100%</td>
            <td>
              {vndFull(price)} <span>đồng</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export const toDeskUnit = (r: Property): DeskUnit => ({
  id: r.id,
  slug: r.slug,
  name: t(r.name),
  code: unitRef(r),
  tower: r.tower ?? "",
  floor: r.floor,
  bedrooms: r.bedrooms,
  rooms: t(hasRooms(r) ? roomsLabel(r) : r.type),
  area: r.area,
  direction: r.direction ? t(r.direction) : "",
  view: r.viewNote ? t(r.viewNote) : "",
  quota: r.quota ? t(r.quota) : "",
  excludesFees: !!r.priceExcludesFees,
  floorNote: r.floorNote ?? "",
  model3d: modelUnit(r)?.layout ?? "",
  price: r.saleVnd ?? null,
  state: vacantNow(r)
    ? "available"
    : r.status === "Đã bán"
      ? "sold"
      : "reserved",
});

/**
 * A project under development, as a sales page: hero, overview, photos, tower
 * → floor → unit, price list, policies, payment and loan, location, sign-up.
 * Everything is entered in Admin › Dự án; a block with no data stays away.
 */
export function ProjectSalePage({
  project: p,
  api,
  story,
  place,
  buildings,
  units: rawUnits,
  crumbs,
  productLinks,
  children,
}: {
  project: PortfolioProject;
  api?: ApiProject;
  story: ProjectStory;
  place?: ProjectLocation;
  /** The site map's buildings, for the location block. */
  buildings: MapBuilding[];
  units: Property[];
  crumbs: React.ReactNode;
  productLinks: Record<string, string>;
  children?: React.ReactNode;
}) {
  const units = rawUnits.map(toDeskUnit);
  const call = telephoneHref(companyHotline);
  const towers = (api?.towers ?? []).map((x) => ({
    name: x.name,
    status: x.status ? t(x.status) : "",
    note: x.note ? t(x.note) : "",
  }));
  const plans = (api?.floorPlans ?? []).map((x) => ({
    name: t(x.name),
    tower: x.tower ?? "",
    image: x.image,
  }));
  const types = api?.unitTypes ?? [];
  const steps = api?.paymentSchedule ?? [];
  const policies = api?.salesPolicies ?? [];
  const connections = api?.connections ?? [];
  const progress = api?.progressPhotos ?? [];
  const amenities = api?.amenities ?? [];
  const open = towers.filter((x) => x.status === t("Đang mở bán"));
  const media = (group: string): RentalMedia[] =>
    (api?.photos ?? [])
      .filter((photo) => photo.group === group)
      .map((photo) => ({
        type: "image",
        src: photo.image,
        alt: `${group} ${p.name}`,
      }));
  const video = videoSource(api?.videoUrl ?? undefined);
  const groups = [
    { label: t("Phối cảnh"), media: media("Phối cảnh") },
    { label: t("Căn hộ mẫu"), media: media("Căn hộ mẫu") },
    { label: t("Căn 1 phòng ngủ"), media: media("Căn 1 phòng ngủ") },
    { label: t("Căn 2 phòng ngủ"), media: media("Căn 2 phòng ngủ") },
    { label: t("Căn 3 phòng ngủ"), media: media("Căn 3 phòng ngủ") },
    { label: t("Tiện ích"), media: media("Tiện ích") },
    {
      label: t("Mặt bằng"),
      media: plans.map((plan): RentalMedia => ({
        type: "image",
        src: plan.image,
        alt: plan.name,
      })),
    },
    {
      label: "Video",
      media: video
        ? [
            {
              type: "video",
              ...video,
              alt: `Video ${p.name}`,
            } as RentalMedia,
          ]
        : [],
    },
  ].filter((group) => group.media.length);
  const handover = api?.handoverDate?.split("-");
  const facts: {
    icon: typeof MapPin;
    label: string;
    values: string[];
    wide?: boolean;
  }[] = [
    ...(api?.developer
      ? [
          {
            icon: Building2,
            label: "Chủ đầu tư",
            values: api.developer.split(/\.\s+/),
            wide: true,
          },
        ]
      : []),
    { icon: MapPin, label: "Vị trí", values: [api?.address || p.location] },
    ...(api?.scale
      ? [
          {
            icon: Layers,
            label: "Quy mô",
            values: api.scale.split(/,\s+/),
            wide: true,
          },
        ]
      : []),
    ...(api?.totalUnits
      ? [
          {
            icon: House,
            label: "Số căn",
            values: [`Khoảng ${api.totalUnits.toLocaleString("vi-VN")} căn`],
          },
        ]
      : []),
    ...(api?.legalStatus
      ? [
          {
            icon: ShieldCheck,
            label: "Pháp lý",
            values: [api.legalStatus.split(/\.\s+/)[0].replace(/\.$/, "")],
          },
        ]
      : []),
    ...(api?.handoverNote || handover
      ? [
          {
            icon: CalendarCheck,
            label: "Bàn giao",
            values: [
              api?.handoverNote
                ? `Dự kiến ${handoverSummary(api)}`
                : `Dự kiến tháng ${Number(handover![1])}/${handover![0]}`,
            ],
          },
        ]
      : []),
  ];
  // Short facts pair up; an odd one out takes the whole row, leaving no gap.
  const short = facts.filter((f) => !f.wide);
  if (short.length % 2) short[short.length - 1].wide = true;
  const nav: [string, string][] = [
    ...(groups.length ? [["hinh-anh", "Hình ảnh"] as [string, string]] : []),
    ["tong-quan", "Tổng quan"],
    ...(p.slug === "capital-square"
      ? [["tham-quan-360", "Tham quan 360°"] as [string, string]]
      : []),
    ["can-mau", "Căn mẫu & mặt bằng"],
    ...(policies.length
      ? [["chinh-sach", "Chính sách"] as [string, string]]
      : []),
    ["thanh-toan", "Thanh toán"],
    ["vi-tri", "Vị trí & tiện ích"],
    ["dang-ky", "Đăng ký tư vấn"],
  ];
  return (
    <main id="main" className="portfolio-page portfolio-development">
      {children}
      <PhotoHero
        slides={[{ src: p.image, alt: p.imageAlt }]}
        crumbs={crumbs}
        title={p.name}
        subtitle={
          <>
            <MapPin size={16} aria-hidden="true" />
            {p.location}
          </>
        }
      >
        <div className="project-hero-actions">
          <a href="#can-mau" className="button project-hero-cta">
            Xem căn mẫu <ArrowRight size={18} aria-hidden="true" />
          </a>
          {call && (
            <a href={call} className="button project-hero-ghost">
              <Phone size={17} aria-hidden="true" />
              Gọi tư vấn
            </a>
          )}
        </div>
        <dl className="project-hero-facts">
          {open.length > 0 && (
            <div>
              <dt>Tòa đang mở bán</dt>
              <dd>{open.map((x) => x.name).join(" · ")}</dd>
            </div>
          )}
          {towers
            .filter((x) => x.status && x.status !== t("Đang mở bán"))
            .map((x) => (
              <div key={x.name}>
                <dt>{x.status}</dt>
                <dd>{x.name}</dd>
              </div>
            ))}
          {api?.totalUnits ? (
            <div>
              <dt>Quy mô</dt>
              <dd>{`Khoảng ${api.totalUnits.toLocaleString("vi-VN")} căn`}</dd>
            </div>
          ) : null}
          {api?.handoverNote ? (
            <div>
              <dt>Bàn giao</dt>
              <dd>{handoverSummary(api)}</dd>
            </div>
          ) : null}
        </dl>
      </PhotoHero>
      <nav className="project-nav" aria-label="Nội dung dự án">
        <div className="container">
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </div>
      </nav>
      <ProjectDesk>
        {groups.length > 0 && (
          <section id="hinh-anh" className="project-block project-block-tint">
            <div className="container">
              <span className="signature-kicker">BỘ SƯU TẬP</span>
              <h2>{`Hình ảnh ${p.name}`}</h2>
              <GalleryTabs title={p.name} groups={groups} />
            </div>
          </section>
        )}

        <section id="tong-quan" className="project-block">
          <div className="container project-overview">
            <div>
              <span className="signature-kicker">TỔNG QUAN DỰ ÁN</span>
              <h2>{`${p.name} Đà Nẵng`}</h2>
              {[...new Set([story.intro, ...story.paragraphs])].map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
            <dl className="project-facts">
              {facts.map(({ icon: Icon, label, values, wide }) => (
                <div key={label} className={wide ? "is-wide" : undefined}>
                  <Icon size={20} aria-hidden="true" />
                  <dt>{label}</dt>
                  {values.map((value) => (
                    <dd key={value}>{value}</dd>
                  ))}
                </div>
              ))}
            </dl>
          </div>
          <div className="container">
            {story.highlights.length > 0 && (
              <div className="project-highlights">
                {story.highlights.map((h) => (
                  <article key={h.title}>
                    <h3>{h.title}</h3>
                    <p>{h.text}</p>
                  </article>
                ))}
              </div>
            )}
            {story.products.length > 0 && (
              <div id="san-pham" className="project-links">
                <ul>
                  {story.products.map((name) => (
                    <li key={name}>
                      {productLinks[name] ? (
                        <Link href={productLinks[name]}>
                          {name}
                          <ArrowUpRight size={18} aria-hidden="true" />
                        </Link>
                      ) : (
                        <span>{name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {p.slug === "capital-square" && (
          <section id="tham-quan-360" className="project-block project-tour">
            <div className="container">
              <span className="signature-kicker">THAM QUAN 360°</span>
              <h2>Căn Hộ Mẫu</h2>
              <TourShowcase title={p.name} />
            </div>
          </section>
        )}

        <section id="can-mau" className="project-block project-block-tint">
          <div className="container">
            <span className="signature-kicker">CĂN MẪU & MẶT BẰNG</span>
            <h2>Phối Cảnh Căn Hộ Mẫu</h2>
            {types.length > 0 && (
              <ul className="unit-types">
                {types.map((type) => (
                  <li key={type.name}>
                    {type.image && (
                      <a
                        href={type.image}
                        target="_blank"
                        rel="noreferrer"
                        className="unit-type-photo"
                        aria-label={`Xem mặt bằng ${type.name}`}
                      >
                        <Image
                          src={type.image}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, 25vw"
                        />
                      </a>
                    )}
                    <h3>{type.name}</h3>
                    {type.area && <p>{type.area}</p>}
                    {type.note && <p>{type.note}</p>}
                    {type.price && <strong>{type.price}</strong>}
                  </li>
                ))}
              </ul>
            )}
            {units.length > 0 || towers.length > 0 ? (
              <UnitBrowser
                towers={towers}
                units={units}
                plans={plans}
                siteMap={projectSiteMap(p.slug)}
              />
            ) : (
              <div className="price-empty">
                <p>Thông tin căn đang được cập nhật. Gọi để được tư vấn.</p>
                <CallContact label="Gọi tư vấn" />
              </div>
            )}
          </div>
        </section>

        {policies.length > 0 && (
          <section id="chinh-sach" className="project-block">
            <div className="container">
              <span className="signature-kicker">CHÍNH SÁCH BÁN HÀNG</span>
              <h2>Ưu đãi đang áp dụng</h2>
              <ul className="policy-grid">
                {policies.map((policy) => (
                  <li key={policy.title}>
                    <h3>{policy.title}</h3>
                    {policy.body && <p>{policy.body}</p>}
                    {policy.condition && (
                      <small>
                        <b>Điều kiện:</b> {policy.condition}
                      </small>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section id="thanh-toan" className="project-block project-block-dark">
          <div className="container">
            <span className="signature-kicker">THANH TOÁN & VAY NGÂN HÀNG</span>
            <h2>Ước tính dòng tiền của bạn</h2>
            {steps.length === 0 && (
              <p className="desk-note">
                Tiến độ thanh toán đang được cập nhật. Bạn vẫn có thể ước tính
                khoản vay bên dưới.
              </p>
            )}
            <PaymentPlanner steps={steps} startPrice={0} />
            {api?.paymentNote && <p className="desk-note">{api.paymentNote}</p>}
          </div>
        </section>

        <section id="vi-tri" className="project-block">
          <div className="container">
            <span className="signature-kicker">VỊ TRÍ, TIỆN ÍCH, TIẾN ĐỘ</span>
            <h2>{p.location}</h2>
            <ProjectMap
              place={place}
              slug={p.slug}
              name={p.name}
              address={p.location}
              buildings={buildings}
            />
            {(connections.length > 0 || amenities.length > 0) && (
              <div className="place-card" data-only="info">
                <div className="place-info">
                  {connections.length > 0 && (
                    <>
                      <h3>Kết nối khu vực</h3>
                      <ul className="place-links">
                        {connections.map((c) => (
                          <li key={c.place}>
                            <MapPin size={15} aria-hidden="true" />
                            <span>{c.place}</span>
                            {c.time && <b>{c.time}</b>}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {amenities.length > 0 && (
                    <>
                      <h3>Tiện ích</h3>
                      <ul className="place-amenities">
                        {amenities.map((name) => (
                          <li key={name}>
                            <Check size={15} aria-hidden="true" />
                            {name}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            )}
            {progress.length > 0 && (
              <>
                <h3 className="progress-title">Tiến độ xây dựng thực tế</h3>
                <ul className="progress-grid">
                  {progress.map((photo) => (
                    <li key={photo.image}>
                      <span>
                        <Image
                          src={photo.image}
                          alt={photo.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      </span>
                      <b>{photo.title}</b>
                      {photo.date && <small>{photo.date}</small>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        {api && (
          <div className="container">
            <FaqSection faqs={saleFaqs(p.name, api, rawUnits)} />
          </div>
        )}

        <section id="dang-ky" className="project-block project-block-tint">
          <div className="container">
            <ProjectLeadForm
              units={units.filter((u) => u.state !== "sold")}
              projectSlug={p.slug}
              projectName={p.name}
            />
          </div>
        </section>
      </ProjectDesk>
    </main>
  );
}
