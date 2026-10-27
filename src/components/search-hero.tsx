/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { companyHotline, telephoneHref } from "@/lib/company-contact";
import { href } from "@/i18n/server";
import { RentalHeroSearch, type HeroMode } from "./rental-hero-search";

type Slide = { src: string; alt: string };

/**
 * Full-screen photos (slow cross-fade) with a breadcrumb, a short title and
 * whatever the page puts in the middle (search box, shortcuts…). Shared by
 * "Cho thuê", the project directory and each operated project.
 */
export function PhotoHero({
  slides,
  crumbs,
  title,
  subtitle,
  children,
  stats,
  scroll,
  className = "",
}: {
  slides: Slide[];
  crumbs: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  stats?: React.ReactNode;
  /** "Xem … căn phù hợp ↓" link to the list below. */
  scroll?: { label: string; target: string };
  /** Extra class, e.g. a shorter hero. */
  className?: string;
}) {
  return (
    <section className={`rental-hero ${className}`.trim()} aria-label={title}>
      <div
        className="rental-hero-media"
        data-count={slides.length}
        aria-hidden="true"
      >
        {slides.map((slide, i) => (
          <Image
            key={slide.src}
            src={slide.src}
            alt=""
            fill
            sizes="100vw"
            quality={70}
            priority={i === 0}
            loading={i === 0 ? "eager" : "lazy"}
            style={
              { "--slide": i, "--slides": slides.length } as React.CSSProperties
            }
            className={slides.length > 1 ? "rental-hero-slide" : ""}
          />
        ))}
      </div>
      <div className="rental-hero-inner container">
        <nav className="breadcrumb rental-hero-crumbs" aria-label="Đường dẫn">
          {crumbs}
        </nav>
        <div className="rental-hero-center">
          <div className="rental-hero-heading">
            <h1 className="rental-hero-title">{title}</h1>
            {subtitle && <p className="rental-hero-subtitle">{subtitle}</p>}
          </div>
          {children}
        </div>
        {stats && <dl className="rental-hero-stats">{stats}</dl>}
      </div>
      {scroll && (
        <a className="rental-hero-scroll" href={scroll.target}>
          <span>{scroll.label}</span>
          <ArrowDown size={16} aria-hidden="true" />
        </a>
      )}
    </section>
  );
}

/** The photo hero with the one search box of the page (Thuê / Mua / Ký gửi). */
export function SearchHero({
  slides,
  crumbs,
  title,
  subtitle,
  action,
  mode,
  values,
  projects = [],
  locations = [],
  project,
  stats,
  count,
}: {
  slides: Slide[];
  crumbs: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  /** Page that lists the results (the search stays on it). */
  action: string;
  mode: HeroMode;
  values: Record<string, string | undefined>;
  projects?: [string, string][];
  locations?: string[];
  /** On a project page the project is fixed. */
  project?: { slug: string; name: string };
  stats?: React.ReactNode;
  count: number;
}) {
  return (
    <PhotoHero
      slides={slides}
      crumbs={crumbs}
      title={title}
      subtitle={subtitle}
      stats={stats}
      scroll={{ label: `Xem ${count} căn phù hợp`, target: "#can-ho" }}
    >
      <RentalHeroSearch
        action={href(action)}
        mode={mode}
        values={values}
        projects={projects}
        locations={locations}
        projectSlug={project?.slug}
        projectName={project?.name}
        hotline={companyHotline}
        callHref={telephoneHref() || href("/lien-he")}
      />
    </PhotoHero>
  );
}
