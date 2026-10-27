/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import Link from "@/components/page-navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  Compass,
  Handshake,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import type { EditorialContent } from "@/lib/pages";
import type { PortfolioProject, Property, Service } from "@/types";
import { companyHotline, telephoneHref } from "@/lib/company-contact";
import { href } from "@/i18n/server";
import { BackButton } from "./layout/back-button";
import { RichText } from "./rich-text";
import { PhotoHero } from "./search-hero";
import { Counter } from "./counter";
import { Reveal } from "./interactive";

/** The four "Giới thiệu" pages, in menu order. */
export const ABOUT_PAGES = [
  {
    href: "/gioi-thieu",
    label: "Câu chuyện",
    title: "Câu chuyện doanh nghiệp",
    text: "Đất Vàng Group là ai, làm gì và tin vào điều gì.",
    icon: BookOpen,
  },
  {
    href: "/gioi-thieu/tam-nhin-su-menh",
    label: "Tầm nhìn & sứ mệnh",
    title: "Tầm nhìn & sứ mệnh",
    text: "Định hướng phát triển và những giá trị chúng tôi theo đuổi.",
    icon: Compass,
  },
  {
    href: "/gioi-thieu/doi-ngu",
    label: "Đội ngũ",
    title: "Đội ngũ",
    text: "Những con người đồng hành cùng chủ nhà và khách hàng mỗi ngày.",
    icon: Users,
  },
  {
    href: "/gioi-thieu/doi-tac",
    label: "Đối tác",
    title: "Đối tác",
    text: "Chủ đầu tư và đơn vị cùng chúng tôi tạo nên giá trị.",
    icon: Handshake,
  },
];

/**
 * "Giới thiệu": full-screen project photos with real figures, the company
 * in a few lines beside a photo collage, the values written in Admin
 * (page sections) on a deep green band, fields of activity, projects,
 * the other "Giới thiệu" pages and a call to action.
 */
export function AboutPage({
  page,
  portfolio,
  properties,
  services,
}: {
  page: EditorialContent;
  portfolio: PortfolioProject[];
  properties: Property[];
  services: Service[];
}) {
  const photos = portfolio.filter((p) => p.image);
  const slides = photos.slice(0, 3).map((p) => ({ src: p.image, alt: p.name }));
  const units = properties.filter((p) => !p.isDemo).length;
  const [first, second] = [photos[0], photos[1] ?? photos[0]];
  return (
    <main id="main" className="about-page">
      <PhotoHero
        slides={slides}
        crumbs={
          <>
            <BackButton />
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <span aria-current="page">{page.eyebrow || "Giới thiệu"}</span>
          </>
        }
        title={page.title}
        subtitle={page.intro}
        stats={
          <>
            <div>
              <dt>Dự án đồng hành</dt>
              <dd>
                <Counter value={portfolio.length} />
              </dd>
            </div>
            {units > 0 && (
              <div>
                <dt>Căn hộ đang giới thiệu</dt>
                <dd>
                  <Counter value={units} />
                </dd>
              </div>
            )}
            {services.length > 0 && (
              <div>
                <dt>Lĩnh vực hoạt động</dt>
                <dd>
                  <Counter value={services.length} />
                </dd>
              </div>
            )}
          </>
        }
        scroll={{ label: "Câu chuyện Đất Vàng", target: "#ve-chung-toi" }}
      >
        <div className="about-hero-actions">
          <Link href="/du-an" className="hero-submit">
            Xem các dự án
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/lien-he" className="about-hero-ghost">
            Liên hệ hợp tác
          </Link>
        </div>
      </PhotoHero>
      <AboutTabs current="/gioi-thieu" />

      <section id="ve-chung-toi" className="about-intro container">
        {first && (
          <div className="about-collage" aria-hidden="true">
            <span className="about-collage-main">
              <Image
                src={first.image}
                alt=""
                fill
                sizes="(max-width: 900px) 90vw, 38vw"
              />
            </span>
            <span className="about-collage-side">
              <Image
                src={second.image}
                alt=""
                fill
                sizes="(max-width: 900px) 50vw, 20vw"
              />
            </span>
            <span className="about-collage-badge">
              <MapPin size={15} />
              Đà Nẵng, Việt Nam
            </span>
          </div>
        )}
        <Reveal>
          <div className="about-intro-copy">
            <span className="home-kicker">VỀ ĐẤT VÀNG GROUP</span>
            <h2>
              Không gian xứng tầm.
              <br />
              <em>Giá trị bền vững.</em>
            </h2>
            <p>{page.intro}</p>
            <ul className="about-intro-points">
              <li>Quản lý, vận hành và khai thác căn hộ tại Đà Nẵng</li>
              <li>Minh bạch thông tin, một đầu mối theo suốt hành trình</li>
              <li>Quan hệ lâu dài với chủ nhà, khách thuê và đối tác</li>
            </ul>
          </div>
        </Reveal>
      </section>

      {page.sections.length > 0 && (
        <section className="about-values" aria-labelledby="about-values-title">
          <div className="container">
            <div className="about-values-head">
              <span className="home-kicker">GIÁ TRỊ CỐT LÕI</span>
              <h2 id="about-values-title">Điều chúng tôi tin và theo đuổi</h2>
            </div>
            <ol className="about-values-list">
              {page.sections.map(([heading, text], i) => (
                <li key={heading}>
                  <Reveal delay={i * 90}>
                    <span className="about-value-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>{heading}</h3>
                    <RichText text={text} />
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section className="about-fields container">
          <div className="home-head">
            <div>
              <span className="home-kicker">LĨNH VỰC HOẠT ĐỘNG</span>
              <h2>Đồng hành trọn vòng đời bất động sản</h2>
            </div>
            <div className="home-head-aside">
              <Link href="/dich-vu" className="home-more">
                Tất cả lĩnh vực
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <ul className="about-fields-grid">
            {services.slice(0, 6).map((s, i) => (
              <li key={s.id}>
                <Link href={s.href}>
                  <span className="about-field-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <strong>{s.name}</strong>
                  <span className="about-field-text">
                    {s.summary || s.description}
                  </span>
                  <span className="about-field-more">
                    Tìm hiểu
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AboutProjects
        photos={photos}
        kicker="DẤU ẤN DỰ ÁN"
        title="Những công trình chúng tôi đồng hành"
      />

      <AboutExplore current="/gioi-thieu" />
      <AboutCta photo={second?.image} />
    </main>
  );
}

/** Tabs between the four "Giới thiệu" pages (under the hero). */
export function AboutTabs({ current }: { current: string }) {
  return (
    <nav className="about-tabs" aria-label="Giới thiệu">
      <div className="container">
        {ABOUT_PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            aria-current={p.href === current ? "page" : undefined}
          >
            {p.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Project photos: one tall and four smaller, each opening its project. */
export function AboutProjects({
  photos,
  kicker,
  title,
}: {
  photos: PortfolioProject[];
  kicker: string;
  title: string;
}) {
  if (!photos.length) return null;
  return (
    <section className="about-projects">
      <div className="container">
        <div className="home-head">
          <div>
            <span className="home-kicker">{kicker}</span>
            <h2>{title}</h2>
          </div>
          <div className="home-head-aside">
            <Link href="/du-an" className="home-more">
              Xem tất cả dự án
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <ul className="about-mosaic" data-count={Math.min(photos.length, 5)}>
          {photos.slice(0, 5).map((p) => (
            <li key={p.id}>
              <Link
                href={`/du-an/${p.slug}`}
                aria-label={`Xem dự án ${p.name}`}
              >
                <Image
                  src={p.image}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 80vw, 33vw"
                />
                <span className="about-mosaic-caption">
                  <small>
                    <Building2 size={13} aria-hidden="true" />
                    {p.group === "development"
                      ? "Đang triển khai"
                      : "Đang vận hành"}
                  </small>
                  <strong>{p.name}</strong>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The other "Giới thiệu" pages as cards. */
export function AboutExplore({ current }: { current: string }) {
  return (
    <section className="about-explore container" aria-label="Tìm hiểu thêm">
      {ABOUT_PAGES.filter((item) => item.href !== current).map((item) => (
        <Link key={item.href} href={item.href} className="about-explore-card">
          <item.icon size={26} strokeWidth={1.4} aria-hidden="true" />
          <strong>{item.title}</strong>
          <span>{item.text}</span>
          <ArrowUpRight
            className="about-explore-arrow"
            size={18}
            aria-hidden="true"
          />
        </Link>
      ))}
    </section>
  );
}

/** Photo band with the contact buttons, closing every "Giới thiệu" page. */
export function AboutCta({
  photo,
  title = "Cùng tạo nên những kết nối có giá trị",
  text = "Chủ nhà cần vận hành căn hộ, khách tìm nơi ở hay đối tác muốn hợp tác: chia sẻ nhu cầu, chúng tôi liên hệ lại trong ngày.",
  action = { href: "/lien-he", label: "Liên hệ tư vấn" },
}: {
  photo?: string;
  title?: string;
  text?: string;
  action?: { href: string; label: string };
}) {
  return (
    <section className="home-cta" aria-labelledby="about-cta-title">
      {photo && (
        <Image
          className="home-cta-photo"
          src={photo}
          alt=""
          fill
          sizes="100vw"
        />
      )}
      <div className="container home-cta-inner">
        <span className="home-kicker">KẾT NỐI VỚI ĐẤT VÀNG GROUP</span>
        <h2 id="about-cta-title">{title}</h2>
        <p>{text}</p>
        <div className="home-cta-actions">
          <Link href={action.href} className="hero-submit">
            {action.label}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <a href={telephoneHref() || href("/lien-he")}>
            <Phone size={16} aria-hidden="true" />
            Gọi <strong>{companyHotline}</strong>
          </a>
        </div>
      </div>
    </section>
  );
}
