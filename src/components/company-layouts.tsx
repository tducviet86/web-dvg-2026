import Image from "next/image";
import Link from "@/components/page-navigation";
import {
  ArrowUpRight,
  ArrowDown,
  Compass,
  Layers,
  Handshake,
} from "lucide-react";
import { photos, projects, posts, services } from "@/data";
import { staticPages } from "@/lib/pages";
import type { Filters } from "@/lib/filter";
import { Reveal, ContactForm, Process } from "./interactive";
import { DepthScene } from "./depth-scene";
import { BlogCard } from "./cards";

export function CompanyHero({
  title,
  eyebrow,
  description,
  image = photos.architecture,
}: {
  title: string;
  eyebrow: string;
  description: string;
  image?: string;
}) {
  return (
    <header className="company-hero container">
      <div className="company-hero-copy">
        <nav className="breadcrumb" aria-label="Đường dẫn">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <span aria-current="page">{eyebrow}</span>
        </nav>
        <Reveal>
          <span className="eyebrow">ĐẤT VÀNG GROUP / {eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <a className="company-scroll" href="#noi-dung">
            <span>Khám phá câu chuyện</span>
            <ArrowDown size={18} />
          </a>
        </Reveal>
      </div>
      <DepthScene className="company-hero-art">
        <div className="company-art-outline" aria-hidden="true" />
        <div className="company-hero-photo image-wrap">
          <Image
            src={image}
            alt="Không gian kiến trúc — hình ảnh minh họa"
            fill
            sizes="(max-width: 768px) 100vw, 48vw"
            loading="eager"
          />
        </div>
        <div className="company-art-label">
          <span>KHÔNG GIAN & CON NGƯỜI</span>
          <strong>Giá trị từ sự tận tâm.</strong>
          <small>Hình ảnh minh họa</small>
        </div>
        <span className="company-art-index" aria-hidden="true">
          DVG
        </span>
      </DepthScene>
    </header>
  );
}
export function CompanyClosing() {
  return (
    <section className="company-closing">
      <div className="container">
        <div>
          <span className="eyebrow">BẮT ĐẦU MỘT CUỘC TRÒ CHUYỆN</span>
          <h2>
            Cùng tạo nên
            <br />
            <em>những kết nối có giá trị.</em>
          </h2>
        </div>
        <Link className="button button-gold" href="/lien-he">
          Kết nối cùng chúng tôi
          <ArrowUpRight size={19} />
        </Link>
      </div>
    </section>
  );
}
export function CompanyListing({
  kind,
  filters,
}: {
  kind: "projects" | "blog" | "services";
  filters: Filters;
}) {
  const projectList =
    filters.status === "dang-khai-thac"
      ? projects.filter((p) => p.status === "Đang khai thác")
      : filters.status === "noi-bat"
        ? projects.slice(0, 3)
        : projects;
  const news = filters.category
    ? posts.filter((p) => p.categorySlug === filters.category)
    : posts;
  const title =
    kind === "projects"
      ? "Không gian mang dấu ấn."
      : kind === "services"
        ? "Thấu hiểu nhu cầu. Đồng hành dài lâu."
        : filters.category
          ? news[0]?.category || "Góc nhìn & cảm hứng."
          : "Góc nhìn mới. Cảm hứng mỗi ngày.";
  return (
    <main id="main" className={`company-page company-${kind}`}>
      <CompanyHero
        title={title}
        eyebrow={
          kind === "projects"
            ? "DỰ ÁN"
            : kind === "services"
              ? "LĨNH VỰC HOẠT ĐỘNG"
              : "TIN TỨC & GÓC NHÌN"
        }
        description={
          kind === "projects"
            ? "Khám phá kiến trúc, trải nghiệm sống và những không gian minh họa định hướng hoạt động của Đất Vàng Group."
            : kind === "services"
              ? "Từ quản lý đến khai thác bất động sản, mỗi giải pháp bắt đầu bằng việc lắng nghe và làm rõ những điều bạn cần."
              : "Những chia sẻ về không gian sống, vận hành và các mối quan hệ bền vững trong lĩnh vực bất động sản."
        }
        image={
          kind === "projects"
            ? photos.building
            : kind === "blog"
              ? photos.living
              : photos.interior
        }
      />
      <section id="noi-dung" className="container company-content">
        <div className="company-section-bar">
          <span>
            {kind === "projects"
              ? "DANH MỤC KHÔNG GIAN"
              : kind === "services"
                ? "NĂNG LỰC & GIẢI PHÁP"
                : "TẠP CHÍ ĐẤT VÀNG"}
          </span>
          <small>Nội dung và hình ảnh minh họa</small>
        </div>
        {kind === "projects" ? (
          <>
            <nav className="category-tabs" aria-label="Lọc dự án">
              {[
                ["", "Tất cả dự án"],
                ["noi-bat", "Nổi bật"],
                ["dang-khai-thac", "Đang khai thác"],
              ].map(([status, label]) => (
                <Link
                  key={label}
                  aria-current={
                    (filters.status || "") === status ? "page" : undefined
                  }
                  href={status ? `/du-an?status=${status}` : "/du-an"}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="company-projects-grid">
              {projectList.map((p, i) => (
                <Reveal key={p.id} className="company-project-item">
                  <article>
                    <DepthScene>
                      <Link href={`/du-an/${p.slug}`} className="image-wrap">
                        <Image
                          src={p.image}
                          alt={`Kiến trúc minh họa ${p.name}`}
                          fill
                          sizes="(max-width:768px) 100vw, 50vw"
                        />
                        <span className="company-image-tag">{p.type}</span>
                        <span className="round-arrow">
                          <ArrowUpRight />
                        </span>
                      </Link>
                    </DepthScene>
                    <div className="company-project-info">
                      <span>0{i + 1}</span>
                      <div>
                        <p>
                          {p.location} · {p.status}
                        </p>
                        <h2>
                          <Link href={`/du-an/${p.slug}`}>{p.name}</Link>
                        </h2>
                        <p>{p.description}</p>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </>
        ) : kind === "services" ? (
          <div className="company-service-stories">
            {services.map((service, i) => (
              <Reveal key={service.id}>
                <article>
                  <div className="company-service-copy">
                    <span className="company-large-number">0{i + 1}</span>
                    <span className="eyebrow">
                      LẮNG NGHE / ĐỀ XUẤT / ĐỒNG HÀNH
                    </span>
                    <h2>{service.name}</h2>
                    <p>{service.description}</p>
                    <Link
                      className="text-link"
                      href={`/dich-vu/${service.slug}`}
                    >
                      Khám phá giải pháp
                      <ArrowUpRight size={18} />
                    </Link>
                  </div>
                  <DepthScene>
                    <Link
                      href={`/dich-vu/${service.slug}`}
                      className="image-wrap"
                    >
                      <Image
                        src={service.image}
                        alt={`${service.name} — hình ảnh minh họa`}
                        fill
                        sizes="(max-width:768px) 100vw, 45vw"
                      />
                    </Link>
                  </DepthScene>
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <>
            <nav className="category-tabs" aria-label="Chuyên mục bài viết">
              <Link
                href="/blog"
                aria-current={!filters.category ? "page" : undefined}
              >
                Tất cả bài viết
              </Link>
              {posts.slice(0, 3).map((p) => (
                <Link
                  key={p.categorySlug}
                  href={`/blog/danh-muc/${p.categorySlug}`}
                  aria-current={
                    filters.category === p.categorySlug ? "page" : undefined
                  }
                >
                  {p.category}
                </Link>
              ))}
            </nav>
            {news[0] && (
              <Reveal className="company-featured-story">
                <Link className="image-wrap" href={`/blog/${news[0].slug}`}>
                  <Image
                    src={news[0].image}
                    alt={news[0].name}
                    fill
                    sizes="(max-width:768px) 100vw, 60vw"
                  />
                </Link>
                <div>
                  <span className="eyebrow">
                    GÓC ĐỌC NỔI BẬT / {news[0].category}
                  </span>
                  <h2>
                    <Link href={`/blog/${news[0].slug}`}>{news[0].name}</Link>
                  </h2>
                  <p>{news[0].description}</p>
                  <Link className="text-link" href={`/blog/${news[0].slug}`}>
                    Đọc câu chuyện
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
              </Reveal>
            )}
            <div className="company-news-grid">
              {news.slice(1).map((p) => (
                <Reveal key={p.id}>
                  <BlogCard post={p} />
                </Reveal>
              ))}
            </div>
          </>
        )}
      </section>
      <CompanyClosing />
    </main>
  );
}
export function CompanyEditorial({ slug }: { slug: string }) {
  const page = staticPages[slug];
  const contact = ["lien-he", "hop-tac-chu-so-huu", "tuyen-dung"].includes(
    slug,
  );
  const partner = slug === "gioi-thieu/doi-tac";
  const source =
    slug === "tuyen-dung"
      ? "Ứng tuyển demo"
      : slug === "hop-tac-chu-so-huu"
        ? "Hợp tác chủ sở hữu"
        : "Liên hệ";
  const icons = [Compass, Layers, Handshake];
  return (
    <main
      id="main"
      className={`company-page company-editorial ${contact ? "company-contact" : partner ? "company-partners" : "company-about"}`}
    >
      {contact ? (
        <header className="company-contact-heading container">
          <nav className="breadcrumb" aria-label="Đường dẫn">
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <span>{page.eyebrow}</span>
          </nav>
          <Reveal>
            <span className="eyebrow">{page.eyebrow}</span>
            <h1>{page.title}</h1>
            <p>{page.intro}</p>
          </Reveal>
        </header>
      ) : (
        <CompanyHero
          title={page.title}
          eyebrow={page.eyebrow}
          description={page.intro}
          image={partner ? photos.interior : photos.building}
        />
      )}
      <section
        id="noi-dung"
        className={`container company-content ${contact ? "company-connect-grid" : ""}`}
      >
        {contact ? (
          <>
            <div className="company-contact-info">
              <DepthScene>
                <div className="image-wrap">
                  <Image
                    src={photos.architecture}
                    alt="Không gian kết nối — hình ảnh minh họa"
                    fill
                    sizes="(max-width:768px) 100vw, 42vw"
                  />
                </div>
              </DepthScene>
              {page.sections.map(([heading, text], i) => (
                <Reveal key={heading}>
                  <section>
                    <span className="eyebrow">0{i + 1} / KẾT NỐI</span>
                    <h2>{heading}</h2>
                    <p>{text}</p>
                  </section>
                </Reveal>
              ))}
            </div>
            <div className="company-form-panel">
              <span className="eyebrow">CHIA SẺ CÙNG CHÚNG TÔI</span>
              <ContactForm source={source} />
            </div>
          </>
        ) : partner ? (
          <>
            <div className="company-partner-intro">
              <span className="eyebrow">MỘT TẦM NHÌN CHUNG</span>
              <h2>
                Kết nối chuyên môn.
                <br />
                <em>Mở rộng giá trị.</em>
              </h2>
              <p>
                Ba lĩnh vực hợp tác được đề xuất, hướng đến chất lượng không
                gian và trải nghiệm sử dụng lâu dài.
              </p>
            </div>
            <div className="company-partner-grid">
              {page.sections.map(([heading, text], i) => {
                const Icon = icons[i % icons.length];
                return (
                  <Reveal key={heading}>
                    <DepthScene>
                      <article>
                        <Icon size={34} strokeWidth={1} />
                        <span>0{i + 1}</span>
                        <h2>{heading}</h2>
                        <p>{text}</p>
                        <Link href="/hop-tac-chu-so-huu" className="text-link">
                          Trao đổi hợp tác
                          <ArrowUpRight size={17} />
                        </Link>
                      </article>
                    </DepthScene>
                  </Reveal>
                );
              })}
            </div>
          </>
        ) : (
          <div className="company-story-layout">
            <aside>
              <span className="eyebrow">TINH THẦN ĐẤT VÀNG</span>
              <strong>
                Giá trị
                <br />
                từ con người.
              </strong>
              <nav aria-label="Khám phá doanh nghiệp">
                {[
                  ["/gioi-thieu", "Câu chuyện doanh nghiệp"],
                  ["/gioi-thieu/tam-nhin-su-menh", "Tầm nhìn & sứ mệnh"],
                  ["/gioi-thieu/doi-ngu", "Đội ngũ"],
                  ["/gioi-thieu/doi-tac", "Đối tác"],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={`/${slug}` === href ? "page" : undefined}
                  >
                    {label}
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
              </nav>
            </aside>
            <div>
              {page.sections.map(([heading, text], i) => (
                <Reveal key={heading}>
                  <section className="company-story-section">
                    <span>0{i + 1}</span>
                    <div>
                      <h2>{heading}</h2>
                      <p>{text}</p>
                      {i === 1 && (
                        <div className="company-story-inset image-wrap">
                          <Image
                            src={photos.pool}
                            alt="Kiến trúc kết nối thiên nhiên — minh họa"
                            fill
                            sizes="(max-width:768px) 100vw, 55vw"
                          />
                        </div>
                      )}
                    </div>
                  </section>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </section>
      {slug === "hop-tac-chu-so-huu" && (
        <section className="container section">
          <span className="eyebrow">QUY TRÌNH PHỐI HỢP</span>
          <h2>Rõ ràng từ bước đầu tiên.</h2>
          <Process />
        </section>
      )}
      {!contact && <CompanyClosing />}
    </main>
  );
}
