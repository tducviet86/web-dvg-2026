/** @jsxImportSource @/i18n/jsx */
import { BackButton } from "@/components/layout/back-button";
import {
  CompanyListing,
  CompanyEditorial,
  CompanyHero,
} from "./company-layouts";
import Image from "next/image";
import Link from "@/components/page-navigation";
import { ArrowUpRight } from "lucide-react";
import { photos } from "@/data";
import { BlogCard, SectionHeading } from "./cards";
import { ContactForm, Process } from "./interactive";
import type { Filters } from "@/lib/filter";
import type { EditorialContent } from "@/lib/pages";
import { siteUrl } from "@/lib/utils";
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
}: {
  kind: "blog" | "services";
  filters: Filters;
  posts?: Post[];
  categories?: { slug: string; name: string }[];
}) {
  return (
    <CompanyListing
      kind={kind}
      filters={filters}
      posts={posts}
      categories={categories}
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
  const hasForm = ["lien-he", "hop-tac-chu-so-huu", "tuyen-dung"].includes(
    slug,
  );
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
              alt="Không gian kiến trúc minh họa định hướng Đất Vàng Group"
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
                <p>{text}</p>
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
                slug === "tuyen-dung"
                  ? "Ứng tuyển demo"
                  : slug === "hop-tac-chu-so-huu"
                    ? "Hợp tác chủ sở hữu"
                    : "Liên hệ"
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
export function ServiceDetail({ service }: { service: Service }) {
  return (
    <main id="main" className="company-page company-service-detail">
      <CompanyHero
        title={service.name}
        eyebrow="LĨNH VỰC HOẠT ĐỘNG"
        description={service.description}
        image={service.image}
      />
      <div className="container" id="noi-dung">
        <div className="editorial-body with-form">
          <article>
            <h2>Phương án phù hợp với nhu cầu thực tế.</h2>
            <p>
              {service.description} Mỗi phương án bắt đầu bằng việc hiểu mục
              tiêu của bạn, các đặc điểm của tài sản và những nguồn lực sẵn có.
            </p>
            <h2>Phạm vi phối hợp</h2>
            <ul className="editorial-list">
              <li>Tiếp nhận thông tin và xác định các ưu tiên.</li>
              <li>Khảo sát hiện trạng, làm rõ phạm vi và đầu mối công việc.</li>
              <li>Đề xuất kế hoạch, thời gian và cơ chế cập nhật.</li>
              <li>Theo dõi phản hồi và cùng điều chỉnh khi cần thiết.</li>
            </ul>
            <h2>Minh bạch trước khi bắt đầu</h2>
            <p>
              Các chi phí và trách nhiệm cần được trao đổi theo từng trường hợp.
              Nội dung này là mô hình dịch vụ minh họa, không phải báo giá hoặc
              cam kết hiệu quả tài chính.
            </p>
            <Link className="text-link" href="/hop-tac-chu-so-huu">
              Tìm hiểu hợp tác chủ sở hữu
              <ArrowUpRight size={18} />
            </Link>
          </article>
          <ContactForm source={`Dịch vụ: ${service.name}`} />
        </div>
        <Process />
      </div>
    </main>
  );
}
export function ArticlePage({ post, posts }: { post: Post; posts: Post[] }) {
  return (
    <main id="main" className="page-main company-article">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.name,
            description: post.description,
            datePublished: post.createdAt,
            dateModified: post.updatedAt || post.createdAt,
            image: post.image,
            author: {
              "@type": "Organization",
              name: post.author || "Đất Vàng Group",
            },
            mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
          }),
        }}
      />
      <div className="container">
        <Breadcrumb title={post.name} parent={["Góc nhìn", "/blog"]} />
        <PageIntro
          title={post.name}
          eyebrow={post.category}
          description={post.description}
        />
        <div className="article-meta">
          {post.author || "Đất Vàng Group"} ·{" "}
          {post.createdAt.split("-").reverse().join("/")} · {post.readingTime}{" "}
          phút đọc
        </div>
        <div className="editorial-banner image-wrap">
          <Image
            src={post.image}
            alt={post.imageAlt || post.name}
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <article className="article-body">
          {(post.content?.trim()
            ? post.content.split(/\n\s*\n/)
            : [post.description]
          ).map((paragraph, i) => (
            <p key={i} className={i === 0 ? "lead-copy" : undefined}>
              {paragraph.split("\n").map((line, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          ))}
          {post.isDemo && (
            <p className="demo-banner">
              Bài viết biên tập minh họa. Nội dung không thay thế việc kiểm tra
              tài sản hoặc tư vấn chuyên môn cho trường hợp cụ thể.
            </p>
          )}
          <Link className="text-link" href="/cho-thue">
            Khám phá không gian sống
            <ArrowUpRight size={18} />
          </Link>
        </article>
        <section className="section">
          <SectionHeading eyebrow="ĐỌC TIẾP" title="Thêm một góc nhìn." />
          <div className="grid grid-3">
            {posts
              .filter(
                (p) => p.id !== post.id && p.categorySlug === post.categorySlug,
              )
              .slice(0, 3)
              .map((p) => (
                <BlogCard post={p} key={p.id} />
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}
