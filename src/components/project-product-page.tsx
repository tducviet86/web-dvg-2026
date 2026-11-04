/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "@/components/page-navigation";
import { BackButton } from "@/components/layout/back-button";
import { CallContact } from "./call-contact";
import { RichText } from "./rich-text";
import { PhotoHero } from "./search-hero";
import type { ApiPage } from "@/lib/api/types";
import type { PortfolioProject } from "@/types";

/**
 * One product row of a project ("Căn hộ", "Tiện ích nội khu"…): its sections
 * (Admin › Trang nội dung, path du-an/<project>/<item>) beside the other rows
 * and a call.
 */
export function ProjectProductPage({
  project,
  page,
  others,
}: {
  project: PortfolioProject;
  page: ApiPage;
  /** The project's other rows that have a page. */
  others: { name: string; href: string }[];
}) {
  const projectPage = `/du-an/${project.slug}`;
  return (
    <main id="main" className="portfolio-page project-product">
      <PhotoHero
        className="about-hero-compact"
        slides={[
          {
            src: page.coverImage?.url || project.image,
            alt: page.coverImage?.alt || project.imageAlt || project.name,
          },
        ]}
        crumbs={
          <>
            <BackButton />
            <Link href="/du-an">Dự án</Link>
            <span>/</span>
            <Link href={projectPage}>{project.name}</Link>
            <span>/</span>
            <span aria-current="page">{page.title}</span>
          </>
        }
        title={page.title}
        subtitle={page.intro}
      />
      <div className="container project-product-layout">
        <div className="project-product-sections">
          {page.sections.map((section, i) => (
            <section key={section.heading}>
              {section.image && (
                <div className="project-product-photo">
                  <Image
                    src={section.image}
                    alt={section.heading}
                    fill
                    sizes="(max-width: 900px) 100vw, 800px"
                  />
                </div>
              )}
              <span className="signature-kicker">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{section.heading}</h2>
              <RichText text={section.body} />
            </section>
          ))}
        </div>
        <aside className="project-product-aside">
          <CallContact label="Gọi tư vấn dự án" />
          {others.length > 0 && (
            <nav aria-label="Các mục khác của dự án">
              <p>Xem thêm tại {project.name}</p>
              {others.map((other) => (
                <Link key={other.href} href={other.href}>
                  {other.name}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              ))}
            </nav>
          )}
          <Link href={projectPage} className="project-product-back">
            <ArrowLeft size={16} aria-hidden="true" />
            Về trang {project.name}
          </Link>
        </aside>
      </div>
    </main>
  );
}
