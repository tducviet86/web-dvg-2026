/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import Link from "@/components/page-navigation";
import {
  ArrowRight,
  Building,
  Headset,
  KeyRound,
  Lamp,
  PencilRuler,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import type { EditorialContent } from "@/lib/pages";
import type { PortfolioProject } from "@/types";
import { BackButton } from "./layout/back-button";
import { RichText } from "./rich-text";
import { PhotoHero } from "./search-hero";
import { Reveal } from "./interactive";
import { AboutCta, AboutExplore, AboutProjects, AboutTabs } from "./about-page";

export type AboutSubKind = "vision" | "team" | "partners";
export const ABOUT_SUBPAGES: Record<string, AboutSubKind> = {
  "gioi-thieu/tam-nhin-su-menh": "vision",
  "gioi-thieu/doi-ngu": "team",
  "gioi-thieu/doi-tac": "partners",
};

const TEAM_ICONS = [Headset, Wrench, KeyRound, ShieldCheck, Users, Building];
const PARTNER_ICONS = [PencilRuler, Lamp, Wrench, Building, ShieldCheck];

/**
 * "Tầm nhìn & sứ mệnh", "Đội ngũ" and "Đối tác" in the style of the
 * "Giới thiệu" page: a shorter photo hero, tabs between the four pages,
 * the page sections (Admin › Trang nội dung) in a layout of their own,
 * projects, the other pages and a call to action.
 */
export function AboutSubPage({
  slug,
  kind,
  page,
  portfolio,
}: {
  slug: string;
  kind: AboutSubKind;
  page: EditorialContent;
  portfolio: PortfolioProject[];
}) {
  const photos = portfolio.filter((p) => p.image);
  // Each page opens on different photos.
  const shift =
    { vision: 1, team: 3, partners: 5 }[kind] % (photos.length || 1);
  const ordered = [...photos.slice(shift), ...photos.slice(0, shift)];
  const slides = ordered
    .slice(0, 3)
    .map((p) => ({ src: p.image, alt: p.name }));
  const current = `/${slug}`;
  return (
    <main id="main" className={`about-page about-sub about-${kind}`}>
      <PhotoHero
        className="about-hero-compact"
        slides={slides}
        crumbs={
          <>
            <BackButton />
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <Link href="/gioi-thieu">Giới thiệu</Link>
            <span>/</span>
            <span aria-current="page">{page.eyebrow}</span>
          </>
        }
        title={page.title}
        subtitle={page.intro}
        scroll={{ label: "Xem nội dung", target: "#noi-dung" }}
      />
      <AboutTabs current={current} />

      <div id="noi-dung">
        {kind === "vision" && <VisionRows page={page} photos={ordered} />}
        {kind === "team" && <TeamGrid page={page} photo={ordered[1]} />}
        {kind === "partners" && <PartnerAreas page={page} />}
      </div>

      <AboutProjects
        photos={ordered}
        kicker={kind === "partners" ? "DỰ ÁN ĐỒNG HÀNH" : "DẤU ẤN DỰ ÁN"}
        title="Những công trình chúng tôi đồng hành"
      />
      <AboutExplore current={current} />
      <AboutCta
        photo={ordered[2]?.image ?? ordered[0]?.image}
        {...(kind === "partners"
          ? {
              title: "Cùng nhau tạo nên giá trị",
              text: "Đơn vị kiến trúc, nội thất, vận hành hay chủ đầu tư muốn hợp tác: hãy để lại thông tin, chúng tôi liên hệ trao đổi.",
              action: { href: "/hop-tac-chu-so-huu", label: "Đề xuất hợp tác" },
            }
          : kind === "team"
            ? {
                title: "Cần một người đồng hành?",
                text: "Chia sẻ nhu cầu thuê, mua, ký gửi hay vận hành căn hộ, chuyên viên phụ trách sẽ liên hệ lại trong ngày.",
              }
            : {})}
      />
    </main>
  );
}

/** Vision & mission: one row per section, photo and text alternating. */
function VisionRows({
  page,
  photos,
}: {
  page: EditorialContent;
  photos: PortfolioProject[];
}) {
  return (
    <section className="about-rows container">
      {page.sections.map(([heading, text], i) => {
        const photo = photos[i % (photos.length || 1)];
        return (
          <Reveal key={heading}>
            <article className="about-row">
              {photo && (
                <span className="about-row-photo">
                  <Image
                    src={photo.image}
                    alt=""
                    fill
                    sizes="(max-width: 900px) 92vw, 46vw"
                  />
                </span>
              )}
              <div className="about-row-copy">
                <span className="about-value-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2>{heading}</h2>
                <RichText text={text} />
              </div>
            </article>
          </Reveal>
        );
      })}
    </section>
  );
}

/** Team: the groups as cards on deep green, beside one photo. */
function TeamGrid({
  page,
  photo,
}: {
  page: EditorialContent;
  photo?: PortfolioProject;
}) {
  return (
    <section className="about-values about-team">
      <div className="container">
        <div className="about-team-head">
          <div>
            <span className="home-kicker">CÁCH CHÚNG TÔI LÀM VIỆC</span>
            <h2>Mỗi nhóm một vai trò, một đầu mối cho bạn</h2>
          </div>
          {photo && (
            <span className="about-team-photo" aria-hidden="true">
              <Image
                src={photo.image}
                alt=""
                fill
                sizes="(max-width: 900px) 92vw, 34vw"
              />
            </span>
          )}
        </div>
        <ul className="about-team-grid">
          {page.sections.map(([heading, text], i) => {
            const Icon = TEAM_ICONS[i % TEAM_ICONS.length];
            return (
              <li key={heading}>
                <Reveal delay={i * 80}>
                  <Icon size={28} strokeWidth={1.4} aria-hidden="true" />
                  <span className="about-team-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3>{heading}</h3>
                  <RichText text={text} />
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Partners: areas of cooperation as large cards with a call to propose. */
function PartnerAreas({ page }: { page: EditorialContent }) {
  return (
    <section className="about-partner container">
      <div className="home-head">
        <div>
          <span className="home-kicker">LĨNH VỰC HỢP TÁC</span>
          <h2>Kết nối chuyên môn, mở rộng giá trị</h2>
        </div>
        <div className="home-head-aside">
          <Link href="/hop-tac-chu-so-huu" className="home-more">
            Đề xuất hợp tác
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <ul className="about-partner-grid">
        {page.sections.map(([heading, text], i) => {
          const Icon = PARTNER_ICONS[i % PARTNER_ICONS.length];
          return (
            <li key={heading}>
              <Reveal delay={i * 80}>
                <span className="about-partner-icon">
                  <Icon size={26} strokeWidth={1.4} aria-hidden="true" />
                </span>
                <span className="about-field-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{heading}</h3>
                <RichText text={text} />
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
