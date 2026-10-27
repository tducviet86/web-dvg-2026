/** @jsxImportSource @/i18n/jsx */
import { RichText } from "@/components/rich-text";
import { BackButton } from "@/components/layout/back-button";
import { CompanyListing, CompanyEditorial } from "./company-layouts";
import Image from "next/image";
import Link from "@/components/page-navigation";
import { ArrowUpRight, Phone } from "lucide-react";
import { companyHotline, telephoneHref } from "@/lib/company-contact";
import { photos } from "@/data";
import { SectionHeading } from "./cards";
import { BlogListing } from "./blog-pages";
export { ArticlePage } from "./blog-pages";
import { ContactDialog, ContactForm, Process, Reveal } from "./interactive";
import type { Filters } from "@/lib/filter";
import type { EditorialContent } from "@/lib/pages";
import type { Post, Service } from "@/types";
export function Breadcrumb({
  title,
  parent,
}: {
  title: string;
  parent?: [string, string];
}) {
  return (
    <nav className="breadcrumb" aria-label="Đường dẫn">
      <BackButton />
      <Link href="/">Trang chủ</Link>
      <span>/</span>
      {parent && (
        <>
          <Link href={parent[1]}>{parent[0]}</Link>
          <span>/</span>
        </>
      )}
      <span aria-current="page">{title}</span>
    </nav>
  );
}
export function PageIntro({
  title,
  eyebrow,
  description,
}: {
  title: string;
  eyebrow: string;
  description?: string;
}) {
  return (
    <div className="page-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}
export function ListingPage({
  kind,
  filters,
  posts = [],
  categories = [],
  services = [],
}: {
  kind: "blog" | "services";
  filters: Filters;
  posts?: Post[];
  categories?: { slug: string; name: string }[];
  services?: Service[];
}) {
  if (kind === "blog")
    return (
      <BlogListing posts={posts} categories={categories} filters={filters} />
    );
  return (
    <CompanyListing
      kind={kind}
      filters={filters}
      posts={posts}
      categories={categories}
      services={services}
    />
  );
}
export function EditorialPage({
  slug,
  page,
}: {
  slug: string;
  page: EditorialContent;
}) {
  if (!slug.includes("chinh-sach") && !slug.includes("dieu-khoan"))
    return <CompanyEditorial slug={slug} page={page} />;
  const hasForm = ["lien-he", "hop-tac-chu-so-huu"].includes(slug);
  return (
    <main id="main" className="page-main">
      <div className="container">
        <Breadcrumb title={page.eyebrow} />
        <PageIntro
          title={page.title}
          eyebrow={page.eyebrow}
          description={page.intro}
        />
        {!slug.includes("chinh-sach") && !slug.includes("dieu-khoan") && (
          <div className="editorial-banner image-wrap">
            <Image
              src={slug === "gioi-thieu" ? photos.building : photos.interior}
              alt="Không gian kiến trúc Đất Vàng Group"
              fill
              sizes="100vw"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        )}
        <div className={`editorial-body ${hasForm ? "with-form" : ""}`}>
          <article>
            {page.sections.map(([heading, text], i) => (
              <section key={heading}>
                <span className="eyebrow">0{i + 1}</span>
                <h2>{heading}</h2>
                <RichText text={text} />
              </section>
            ))}
            {slug.startsWith("gioi-thieu") && (
              <div className="category-tabs">
                <Link href="/gioi-thieu/tam-nhin-su-menh">
                  Tầm nhìn & sứ mệnh
                </Link>
                <Link href="/gioi-thieu/doi-ngu">Đội ngũ</Link>
                <Link href="/gioi-thieu/doi-tac">Đối tác</Link>
              </div>
            )}
            {!hasForm && (
              <Link href="/lien-he" className="button button-primary">
                Kết nối cùng chúng tôi
                <ArrowUpRight size={18} />
              </Link>
            )}
          </article>
          {hasForm && (
            <ContactForm
              source={
                slug === "hop-tac-chu-so-huu" ? "Hợp tác chủ sở hữu" : "Liên hệ"
              }
            />
          )}
        </div>
        {slug === "hop-tac-chu-so-huu" && (
          <section className="section">
            <SectionHeading
              eyebrow="QUY TRÌNH PHỐI HỢP"
              title="Rõ ràng từ bước đầu tiên."
            />
            <Process />
          </section>
        )}
      </div>
    </main>
  );
}
export function ServiceDetail({
  service,
  services = [],
}: {
  service: Service;
  /** Every service, for "Lĩnh vực khác". */
  services?: Service[];
}) {
  const index = services.findIndex((s) => s.id === service.id);
  const others = services.filter((s) => s.id !== service.id).slice(0, 3);
  const phone = telephoneHref();
  // CMS sections: a body of several lines is a list of steps.
  const [lead, ...rest] = service.sections;
  const lines = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
      .filter(Boolean);
  return (
    <main id="main" className="company-page service-detail">
      <header className="service-hero">
        <Image
          className="service-hero-photo"
          src={service.image}
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
        />
        <div className="container service-hero-inner">
          <nav className="breadcrumb" aria-label="Đường dẫn">
            <BackButton />
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <Link href="/dich-vu">Lĩnh vực hoạt động</Link>
            <span>/</span>
            <span aria-current="page">{service.name}</span>
          </nav>
          <div className="service-hero-copy">
            <span className="service-hero-kicker">
              LĨNH VỰC HOẠT ĐỘNG
              {index >= 0 && ` · ${String(index + 1).padStart(2, "0")}`}
            </span>
            <h1>{service.name}</h1>
            {service.summary !== service.description && (
              <p className="service-hero-summary">{service.summary}</p>
            )}
            <p>{service.description}</p>
            <div className="service-hero-actions">
              <ContactDialog source={`Dịch vụ: ${service.name}`} />
              {phone && (
                <a className="button service-call" href={phone}>
                  <Phone size={17} aria-hidden="true" />
                  {companyHotline}
                </a>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="container service-body" id="noi-dung">
        <article className="service-article">
          {lead && (
            <Reveal>
              <section className="service-lead">
                <span className="eyebrow">TỔNG QUAN</span>
                <h2>{lead[0]}</h2>
                <RichText text={lead[1]} />
              </section>
            </Reveal>
          )}
          {rest.map(([heading, text]) =>
            lines(text).length >= 3 ? (
              <Reveal key={heading}>
                <section className="service-steps-block">
                  <h2>{heading}</h2>
                  <ol>
                    {lines(text).map((line, i) => (
                      <li key={line}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <p>{line}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              </Reveal>
            ) : (
              <Reveal key={heading}>
                <section className="service-note">
                  <h2>{heading}</h2>
                  <RichText text={text} />
                </section>
              </Reveal>
            ),
          )}
        </article>
        {others.length > 0 && (
          <section className="service-others">
            <div className="service-others-head">
              <h2>Lĩnh vực khác</h2>
              <Link className="text-link" href="/dich-vu">
                Tất cả lĩnh vực
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="service-others-grid">
              {others.map((s) => (
                <Link key={s.id} href={s.href} className="service-other">
                  <span className="service-other-photo image-wrap">
                    <Image
                      src={s.image}
                      alt=""
                      fill
                      sizes="(max-width: 760px) 100vw, 33vw"
                    />
                  </span>
                  <span className="service-other-summary">{s.summary}</span>
                  <strong>{s.name}</strong>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <section className="service-cta">
        <div className="container">
          <div>
            <span className="eyebrow">BẮT ĐẦU TỪ MỘT CUỘC TRÒ CHUYỆN</span>
            <h2>
              Cùng tìm phương án <em>phù hợp với bạn.</em>
            </h2>
          </div>
          <div className="service-hero-actions">
            <ContactDialog source={`Dịch vụ: ${service.name}`} />
            {phone && (
              <a className="button service-call" href={phone}>
                <Phone size={17} aria-hidden="true" />
                {companyHotline}
              </a>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
