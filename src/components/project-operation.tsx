/** @jsxImportSource @/i18n/jsx */
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  Handshake,
  House,
  KeyRound,
  Layers,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import Image from "next/image";
import Link from "@/components/page-navigation";
import { t, tf } from "@/i18n/server";
import type { ApiProject } from "@/lib/api/types";
import { availabilityRank } from "@/lib/availability";
import { companyHotline, telephoneHref, zaloHref } from "@/lib/company-contact";
import { listingFaqs } from "@/lib/faq";
import { videoSource, type RentalMedia } from "@/lib/property-media";
import { projectSiteMap } from "@/lib/project-site-maps";
import type {
  PortfolioProject,
  ProjectLocation,
  ProjectStory,
  Property,
} from "@/types";
import { CallContact } from "./call-contact";
import { PropertyCard, SaleCard } from "./cards";
import { FaqSection } from "./faq-section";
import { ProjectMap } from "./project-map";
import { projectPlans } from "./project-sale";
import { GalleryTabs, ProjectDesk, UnitBrowser } from "./project-sale-desk";
import { InquiryDialog } from "./rental-inquiry";
import type { MapBuilding } from "./rental-map";
import { RichText } from "./rich-text";
import { PhotoHero } from "./search-hero";

/** What follows a project's first paragraph; a short line alone is a heading. */
function storyGroups(paragraphs: string[]) {
  const groups: { title: string; text: string }[] = [];
  for (const text of paragraphs) {
    if (/^[\p{L}\p{N}][^\n]{0,58}[^\n.:;!?]$/u.test(text))
      groups.push({ title: text, text: "" });
    else if (groups.length)
      groups.at(-1)!.text = [groups.at(-1)!.text, text]
        .filter(Boolean)
        .join("\n\n");
    else groups.push({ title: "", text });
  }
  return groups.filter((g) => g.text);
}

/**
 * A project in operation, presented: photos, overview, floor plans, a few of
 * its units, then where to go (rent, buy, consign) and how to reach us. Its
 * searches (?nhu-cau=…) keep the list page. A block with no data stays away.
 */
export function ProjectOperationPage({
  project: p,
  api,
  story,
  place,
  buildings,
  units,
  crumbs,
  related,
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
  /** Links to the other projects. */
  related?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const call = telephoneHref(companyHotline);
  const zalo = zaloHref();
  const { towers, plans } = projectPlans(api, buildings, p.slug);
  const byRank = (list: Property[]) =>
    [...list].sort((a, b) => availabilityRank(a) - availabilityRank(b));
  const rent = byRank(units.filter((u) => u.forRent !== false));
  const sale = byRank(units.filter((u) => u.forSale && !u.floorNote));
  const listing = p.categories.includes("rent")
    ? `/cho-thue/du-an/${p.slug}`
    : `/du-an/${p.slug}?nhu-cau=thue`;
  const image = (src: string, alt: string): RentalMedia => ({
    type: "image",
    src,
    alt,
  });
  const photos = (group: string) =>
    (api?.photos ?? [])
      .filter((x) => x.group === group)
      .map((x) => image(x.image, `${x.title || group} ${p.name}`));
  const views = photos("Phối cảnh");
  const video = videoSource(api?.videoUrl ?? undefined);
  const groups = [
    {
      label: t("Phối cảnh"),
      media: views.length
        ? views
        : [
            image(p.image, p.imageAlt),
            ...(api?.gallery ?? []).map((x) => image(x.url, x.alt || p.name)),
          ],
    },
    { label: t("Tiện ích"), media: photos("Tiện ích") },
    {
      label: t("Căn hộ"),
      media: [
        ...photos("Căn hộ mẫu"),
        ...[...rent, ...sale]
          .filter((u) => !u.isDemo && u.image)
          .filter((u, i, all) => all.findIndex((x) => x.id === u.id) === i)
          .slice(0, 12)
          .map((u) => image(u.image, u.imageAlt || u.name)),
      ],
    },
    {
      label: t("Mặt bằng"),
      media: plans.map((x) => image(x.image, x.name)),
    },
    {
      label: "Video",
      media: video
        ? [{ type: "video", ...video, alt: `Video ${p.name}` } as RentalMedia]
        : [],
    },
  ].filter((g) => g.media.length);
  const about = storyGroups(story.paragraphs.slice(1));
  const facts = (
    [
      [Building2, "Chủ đầu tư", api?.developer ? [api.developer] : []],
      [MapPin, "Vị trí", [api?.address || p.location]],
      [Layers, "Quy mô", api?.scale ? api.scale.split(/,\s+/) : []],
      [
        House,
        "Số căn",
        api?.totalUnits
          ? [`Khoảng ${api.totalUnits.toLocaleString("vi-VN")} căn`]
          : [],
      ],
    ] as [typeof MapPin, string, string[]][]
  ).filter(([, , values]) => values.length);
  const connections = api?.connections ?? [];
  const amenityCards = (api?.photos ?? []).filter(
    (x) => x.group === "Tiện ích" && x.title,
  );
  // Those with a card are not named twice.
  const amenities = (api?.amenities ?? []).filter(
    (name) => !amenityCards.some((x) => x.title === name),
  );
  const hasAmenities = amenityCards.length > 0 || amenities.length > 0;
  const faqs = listingFaqs(units, { ...p, towers: api?.towers });
  const nav: [string, string][] = [
    ["hinh-anh", "Hình ảnh"],
    ["tong-quan", "Tổng quan"],
    ...(hasAmenities ? [["tien-ich", "Tiện ích"] as [string, string]] : []),
    ...(plans.length
      ? [["mat-bang", "Sơ đồ mặt bằng"] as [string, string]]
      : []),
    ...(rent.length || sale.length
      ? [["can-ho", "Căn tiêu biểu"] as [string, string]]
      : []),
    ["nhu-cau", "Thuê, mua, ký gửi"],
    ["vi-tri", "Vị trí"],
    ["lien-he", "Liên hệ"],
  ];
  /** Every other block is tinted, whichever of them show. */
  const block = (id: string) =>
    nav.findIndex(([x]) => x === id) % 2
      ? "project-block"
      : "project-block project-block-tint";
  return (
    <main
      id="main"
      className="portfolio-page portfolio-development portfolio-operating"
    >
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
          <a
            href={rent.length || sale.length ? "#can-ho" : "#nhu-cau"}
            className="button project-hero-cta"
          >
            {rent.length || sale.length
              ? "Xem căn tiêu biểu"
              : "Thuê, mua, ký gửi"}{" "}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          {call && (
            <a href={call} className="button project-hero-ghost">
              <Phone size={17} aria-hidden="true" />
              Gọi tư vấn
            </a>
          )}
        </div>
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
        <section id="hinh-anh" className={block("hinh-anh")}>
          <div className="container">
            <span className="signature-kicker">BỘ SƯU TẬP</span>
            <h2>{tf("Hình ảnh {name}", { name: p.name })}</h2>
            <GalleryTabs title={p.name} groups={groups} />
            {p.source && (
              <p className="project-credit">
                {tf("Ảnh dự án: {source}", {
                  source: new URL(p.source).hostname.replace(/^www\./, ""),
                })}
              </p>
            )}
          </div>
        </section>

        <section id="tong-quan" className={block("tong-quan")}>
          <div className="container project-overview">
            <div>
              <span className="signature-kicker">TỔNG QUAN DỰ ÁN</span>
              <h2>{p.name}</h2>
              <p>{story.paragraphs[0] || story.intro}</p>
              {p.facebook && (
                <a
                  href={p.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  {tf("Theo dõi fanpage {name}", { name: p.name })}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              )}
            </div>
            <dl className="project-facts">
              {facts.map(([Icon, label, values]) => (
                <div key={label} className="is-wide">
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
            {about.length > 0 ? (
              <div className="operation-about">
                {about.map((g) => (
                  <div key={g.title + g.text}>
                    {g.title && <h3>{g.title}</h3>}
                    <RichText text={g.text} />
                  </div>
                ))}
              </div>
            ) : (
              story.highlights.length > 0 && (
                <div className="project-highlights">
                  {story.highlights.map((h) => (
                    <article key={h.title}>
                      <h3>{h.title}</h3>
                      <p>{h.text}</p>
                    </article>
                  ))}
                </div>
              )
            )}
          </div>
        </section>

        {hasAmenities && (
          <section id="tien-ich" className={block("tien-ich")}>
            <div className="container">
              <span className="signature-kicker">TIỆN ÍCH</span>
              <h2>{tf("Sống tại {name} có gì?", { name: p.name })}</h2>
              {amenityCards.length > 0 && (
                <ul className="amenity-cards">
                  {amenityCards.map((x) => (
                    <li key={x.image}>
                      <div className="image-wrap">
                        <Image
                          src={x.image}
                          alt={`${x.title} ${p.name}`}
                          fill
                          sizes="(max-width: 640px) 76vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      </div>
                      <h3>{x.title}</h3>
                      {x.note && <p>{x.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {amenities.length > 0 && (
                <ul className="amenity-list">
                  {amenities.map((name) => (
                    <li key={name}>
                      <Check size={15} aria-hidden="true" />
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {plans.length > 0 && (
          <section id="mat-bang" className={block("mat-bang")}>
            <div className="container">
              <span className="signature-kicker">SƠ ĐỒ MẶT BẰNG</span>
              <h2>Mặt bằng từng tòa, từng tầng</h2>
              <UnitBrowser
                towers={towers}
                units={[]}
                plans={plans}
                siteMap={projectSiteMap(p.slug)}
              />
            </div>
          </section>
        )}

        {(rent.length > 0 || sale.length > 0) && (
          <section id="can-ho" className={block("can-ho")}>
            <div className="container">
              {rent.length > 0 && (
                <>
                  <div className="operation-content-heading">
                    <h2>{tf("Căn cho thuê tại {name}", { name: p.name })}</h2>
                    <Link href={listing} className="text-link">
                      Xem tất cả căn cho thuê <ArrowRight size={17} />
                    </Link>
                  </div>
                  <div className="grid grid-3">
                    {rent.slice(0, 3).map((u) => (
                      <PropertyCard key={u.id} property={u} />
                    ))}
                  </div>
                </>
              )}
              {sale.length > 0 && (
                <>
                  <div className="operation-content-heading">
                    <h2>{tf("Căn đang bán tại {name}", { name: p.name })}</h2>
                    <Link
                      href={`/du-an/${p.slug}?nhu-cau=mua`}
                      className="text-link"
                    >
                      Xem tất cả căn đang bán <ArrowRight size={17} />
                    </Link>
                  </div>
                  <div className="sale-grid">
                    {sale.slice(0, 3).map((u) => (
                      <SaleCard key={u.id} property={u} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        <section id="nhu-cau" className={block("nhu-cau")}>
          <div className="container">
            <span className="signature-kicker">BẠN CẦN GÌ?</span>
            <h2>{tf("Thuê, mua hay ký gửi tại {name}", { name: p.name })}</h2>
            <ul className="operation-choices">
              {(
                [
                  [
                    KeyRound,
                    "Thuê căn hộ",
                    "Xem các căn cho thuê, lọc theo giá, phòng ngủ và nội thất.",
                    listing,
                  ],
                  [
                    House,
                    "Mua căn hộ",
                    "Xem các căn đang bán và nhờ tư vấn giá, pháp lý.",
                    `/du-an/${p.slug}?nhu-cau=mua`,
                  ],
                  [
                    Handshake,
                    "Ký gửi căn hộ",
                    "Chủ nhà gửi bán hoặc cho thuê qua một đầu mối.",
                    `/du-an/${p.slug}?nhu-cau=ky-gui`,
                  ],
                ] as const
              ).map(([Icon, title, text, href]) => (
                <li key={title}>
                  <Link href={href}>
                    <Icon size={24} aria-hidden="true" />
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <ArrowUpRight size={20} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="vi-tri" className={block("vi-tri")}>
          <div className="container">
            <span className="signature-kicker">VỊ TRÍ</span>
            <h2>{p.location}</h2>
            <ProjectMap
              place={place}
              slug={p.slug}
              name={p.name}
              address={p.location}
              buildings={buildings}
            />
            {connections.length > 0 && (
              <div className="place-card" data-only="info">
                <div className="place-info">
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
                </div>
              </div>
            )}
          </div>
        </section>

        {faqs.length > 1 && (
          <div className="container">
            <FaqSection faqs={faqs} />
          </div>
        )}
        {related && <div className="container project-related">{related}</div>}

        <section id="lien-he" className={block("lien-he")}>
          <div className="container">
            <div className="portfolio-direct">
              <div>
                <h2>{tf("Cần tư vấn về {name}?", { name: p.name })}</h2>
                <p>
                  Gọi, nhắn Zalo hoặc để lại thông tin, Đất Vàng Group sẽ liên
                  hệ lại.
                </p>
              </div>
              <div className="operation-contact">
                <CallContact label="Gọi tư vấn" />
                {zalo && (
                  <a
                    href={zalo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button"
                  >
                    <MessageCircle size={18} aria-hidden="true" /> Nhắn Zalo
                  </a>
                )}
                <InquiryDialog
                  mode="advice"
                  target={{ projectSlug: p.slug, label: p.name }}
                  trigger={
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      className="button"
                    >
                      Để lại thông tin
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </ProjectDesk>
    </main>
  );
}
