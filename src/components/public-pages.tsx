import {
  CompanyListing,
  CompanyEditorial,
  CompanyHero,
} from "./company-layouts";
import Image from "next/image";
import Link from "@/components/page-navigation";
import {
  ArrowUpRight,
  MapPin,
  Check,
  ArrowRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { projects, properties, posts, services, photos } from "@/data";
import { ProjectCard, PropertyCard, BlogCard, SectionHeading } from "./cards";
import { ContactForm, Gallery, DemoAction, Process } from "./interactive";
import { PropertySearch } from "./search";
import { filterProperties, type Filters } from "@/lib/filter";
import { staticPages } from "@/lib/pages";
import { money, siteUrl } from "@/lib/utils";
import type { Project, Property, Post, Service } from "@/types";
export function Breadcrumb({
  title,
  parent,
}: {
  title: string;
  parent?: [string, string];
}) {
  return (
    <nav className="breadcrumb" aria-label="Đường dẫn">
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
}: {
  kind: "projects" | "rentals" | "blog" | "services";
  filters: Filters;
}) {
  if (["projects", "blog", "services"].includes(kind))
    return (
      <CompanyListing
        kind={kind as "projects" | "blog" | "services"}
        filters={filters}
      />
    );
  const result = filterProperties(properties, filters);
  const visible = Math.max(9, Number(filters.limit) || 9);
  const nextUrl = (changes: Record<string, string>) => {
    const q = new URLSearchParams(
      Object.entries(filters).filter(
        (entry): entry is [string, string] => !!entry[1],
      ),
    );
    Object.entries(changes).forEach(([k, v]) => q.set(k, v));
    return `/cho-thue?${q.toString()}`;
  };
  const titles = {
    projects: ["Những điểm đến của giá trị.", "DANH MỤC DỰ ÁN"],
    rentals: ["Tìm không gian thuộc về bạn.", "CĂN HỘ CHO THUÊ"],
    blog: ["Góc nhìn & cảm hứng.", "NHẬT KÝ KHÔNG GIAN SỐNG"],
    services: ["Đồng hành cùng giá trị của bạn.", "GIẢI PHÁP BẤT ĐỘNG SẢN"],
  };
  const [defaultTitle, eyebrow] = titles[kind];
  const title =
    kind === "blog" && filters.category
      ? posts.find((p) => p.categorySlug === filters.category)?.category ||
        defaultTitle
      : defaultTitle;
  const displayedProjects =
    filters.status === "dang-khai-thac"
      ? projects.filter((p) => p.status === "Đang khai thác")
      : filters.status === "noi-bat"
        ? projects.slice(0, 3)
        : projects;
  const displayedPosts = filters.category
    ? posts.filter((p) => p.categorySlug === filters.category)
    : posts;
  return (
    <main id="main" className="page-main">
      <div className="container">
        <Breadcrumb title={title} />
        <PageIntro
          title={title}
          eyebrow={eyebrow}
          description={
            kind === "rentals"
              ? "Từ một studio ngập nắng đến căn hộ rộng mở bên sông. Khám phá lựa chọn phù hợp với nhịp sống của bạn."
              : "Khám phá những câu chuyện, không gian và giải pháp được chọn lọc cho hành trình của bạn."
          }
        />
        <p className="demo-banner">
          Dữ liệu demo · Hình ảnh, nội dung và giá chỉ mang tính minh họa.
        </p>
        {kind === "rentals" ? (
          <>
            <details className="filters-mobile">
              <summary>
                Bộ lọc tìm kiếm <span>+</span>
              </summary>
              <PropertySearch expanded values={filters} />
            </details>
            <div className="rental-layout">
              <aside className="filters-desktop">
                <h2>Tìm kiếm chi tiết</h2>
                <PropertySearch expanded values={filters} />
              </aside>
              <section className="rental-results" aria-label="Kết quả tìm kiếm">
                <h2 className="sr-only">Kết quả tìm kiếm căn hộ</h2>
                <div className="results-toolbar">
                  <p>
                    <strong>{result.length}</strong> căn hộ phù hợp
                  </p>
                  <div className="view-toggle">
                    <Link
                      aria-label="Xem dạng lưới"
                      aria-current={
                        filters.view !== "list" ? "page" : undefined
                      }
                      href={nextUrl({ view: "grid" })}
                    >
                      <LayoutGrid size={19} />
                    </Link>
                    <Link
                      aria-label="Xem dạng danh sách"
                      aria-current={
                        filters.view === "list" ? "page" : undefined
                      }
                      href={nextUrl({ view: "list" })}
                    >
                      <List size={19} />
                    </Link>
                  </div>
                </div>
                <div className="filter-chips">
                  {Object.entries(filters)
                    .filter(
                      ([k, v]) => v && !["sort", "limit", "view"].includes(k),
                    )
                    .map(([k, v]) => {
                      const q = new URLSearchParams(
                        Object.entries(filters).filter(
                          (e): e is [string, string] =>
                            !!e[1] && e[0] !== k && e[0] !== "limit",
                        ),
                      );
                      return (
                        <Link key={k} href={`/cho-thue?${q}`}>
                          {k === "project"
                            ? projects.find((p) => p.id === v)?.name
                            : k === "price"
                              ? `Đến ${v} triệu`
                              : k === "area"
                                ? `Từ ${v} m²`
                                : k === "bedrooms"
                                  ? `${v} phòng ngủ`
                                  : v}{" "}
                          ×
                        </Link>
                      );
                    })}
                </div>
                {result.length ? (
                  <div
                    className={`grid grid-2 ${filters.view === "list" ? "list-view" : ""}`}
                  >
                    {result.slice(0, visible).map((p, index) => (
                      <PropertyCard
                        property={p}
                        key={p.id}
                        priority={index === 0}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h2>Chưa tìm thấy không gian phù hợp.</h2>
                    <p>
                      Thử mở rộng khu vực hoặc điều chỉnh ngân sách của bạn.
                    </p>
                    <Link className="button button-primary" href="/cho-thue">
                      Xóa bộ lọc
                    </Link>
                  </div>
                )}
                {result.length > visible && (
                  <div className="load-more">
                    <Link
                      href={nextUrl({ limit: String(visible + 9) })}
                      className="button button-outline"
                    >
                      Xem thêm căn hộ
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                )}
              </section>
            </div>
          </>
        ) : kind === "projects" ? (
          <>
            <div className="category-tabs">
              <Link href="/du-an">Tất cả dự án</Link>
              <Link href="/du-an?status=noi-bat">Nổi bật</Link>
              <Link href="/du-an?status=dang-khai-thac">Đang khai thác</Link>
            </div>
            <div className="grid grid-3">
              {displayedProjects.map((p) => (
                <ProjectCard project={p} key={p.id} />
              ))}
            </div>
          </>
        ) : kind === "blog" ? (
          <>
            <div className="category-tabs">
              <Link href="/blog">Tất cả bài viết</Link>
              {posts.slice(0, 3).map((p) => (
                <Link
                  key={p.categorySlug}
                  href={`/blog/danh-muc/${p.categorySlug}`}
                >
                  {p.category}
                </Link>
              ))}
            </div>
            <div className="grid grid-3">
              {displayedPosts.map((p) => (
                <BlogCard post={p} key={p.id} />
              ))}
            </div>
          </>
        ) : (
          <div className="service-list">
            {services.map((s, i) => (
              <article key={s.id}>
                <span className="service-number">0{i + 1}</span>
                <div>
                  <h2>{s.name}</h2>
                  <p>{s.description}</p>
                  <Link href={`/dich-vu/${s.slug}`} className="text-link">
                    Tìm hiểu giải pháp
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
                <Link className="image-wrap" href={`/dich-vu/${s.slug}`}>
                  <Image
                    src={s.image}
                    alt={s.name + " — ảnh minh họa"}
                    fill
                    sizes="(max-width:768px) 100vw, 30vw"
                  />
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
export function DetailPage({
  item,
  kind,
}: {
  item: Project | Property;
  kind: "project" | "property";
}) {
  const rental = kind === "property" ? (item as Property) : null;
  const project =
    kind === "project"
      ? (item as Project)
      : projects.find((p) => p.id === rental?.projectId)!;
  return (
    <main
      id="main"
      className={`page-main detail-page ${rental ? "" : "company-project-detail"}`}
    >
      <div className="container">
        <Breadcrumb
          title={item.name}
          parent={rental ? ["Cho thuê", "/cho-thue"] : ["Dự án", "/du-an"]}
        />
        <Gallery
          images={[item.image, photos.living, photos.bedroom]}
          title={item.name}
        />
        <div className="detail-layout">
          <article>
            <span className="eyebrow">
              {rental ? project.name : "KHÔNG GIAN SỐNG CÓ DẤU ẤN"} · DEMO
            </span>
            <h1>{item.name}</h1>
            <p className="location">
              <MapPin size={16} />
              {item.location}
            </p>
            <div className="detail-facts">
              {(rental
                ? [
                    [`${rental.area} m²`, "Diện tích"],
                    [String(rental.bedrooms || "Studio"), "Phòng ngủ"],
                    [String(rental.bathrooms), "Phòng tắm"],
                    [String(rental.floor), "Tầng"],
                  ]
                : [
                    [project.type, "Loại hình"],
                    [project.status, "Tình trạng"],
                    ["Đà Nẵng", "Khu vực"],
                  ]
              ).map(([v, k]) => (
                <div key={k}>
                  <strong>{v}</strong>
                  <span>{k}</span>
                </div>
              ))}
            </div>
            <h2>{rental ? "Một nơi ở, nhiều cảm hứng." : "Tổng quan dự án"}</h2>
            <p>{item.description}</p>
            <h2>Thiết kế cho cuộc sống mỗi ngày</h2>
            <p>
              Vật liệu tự nhiên, bảng màu trung tính và những khoảng mở tạo nên
              một không gian thư thái. Khu vực sinh hoạt được bố trí để kết nối
              các thành viên, trong khi những góc riêng vẫn giữ được sự yên tĩnh
              cần thiết.
            </p>
            <p>
              {rental
                ? `${rental.furniture}. Hiện trạng demo: ${rental.status}. Cập nhật ngày 10/10/2026. Giá và diện tích là dữ liệu giả lập, cần xác minh khi triển khai thực tế.`
                : "Phối cảnh và mô tả trong bản demo được dùng để trình bày trải nghiệm thiết kế. Chưa xác minh thông số xây dựng, vị trí chi tiết hay tiện ích thực tế của dự án."}
            </p>
            <h2>Tiện nghi & trải nghiệm</h2>
            <div className="amenities">
              {[
                "Không gian sinh hoạt mở",
                "Khu bếp tiện dụng",
                "Ánh sáng tự nhiên",
                "Kết nối internet",
                "Khu vực đỗ xe",
                "Không gian xanh",
              ].map((x) => (
                <span key={x}>
                  <Check size={17} />
                  {x}
                </span>
              ))}
            </div>
            <small className="muted">
              Danh sách tiện nghi minh họa, không phải cam kết cung cấp.
            </small>
            <h2>Kết nối khu vực</h2>
            <div className="map-placeholder">
              <MapPin size={35} />
              <strong>{item.location}</strong>
              <span>Sơ đồ vị trí minh họa · Chưa xác minh địa chỉ thực tế</span>
            </div>
            <div className="demo-banner">
              Ảnh minh họa không đại diện cho hiện trạng của bất động sản được
              nêu tên.
            </div>
          </article>
          <aside className="inquiry-panel" id="inquiry">
            {rental && (
              <div className="inquiry-price">
                <span>Giá thuê minh họa</span>
                <strong>
                  {money(rental.price)} triệu <small>/ tháng</small>
                </strong>
                <span className="status-pill">{rental.status}</span>
              </div>
            )}
            <ContactForm
              compact
              source={`${rental ? "Tư vấn căn hộ" : "Tư vấn dự án"}: ${item.name}`}
            />
            <DemoAction>
              Zalo · Kênh demo
              <ArrowUpRight size={17} />
            </DemoAction>
          </aside>
        </div>
        <section className="section">
          <SectionHeading
            eyebrow="TIẾP TỤC KHÁM PHÁ"
            title={rental ? "Những căn hộ cùng cảm hứng." : "Căn hộ tại dự án."}
            href="/cho-thue"
          />
          <div className="grid grid-3">
            {properties
              .filter((p) => p.id !== item.id && p.projectId === project.id)
              .slice(0, 3)
              .map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
          </div>
        </section>
        {!rental && (
          <section className="section">
            <SectionHeading
              eyebrow="NHỮNG KHÔNG GIAN KHÁC"
              title="Dự án liên quan."
            />
            <div className="grid grid-3">
              {projects
                .filter((p) => p.id !== item.id)
                .slice(0, 3)
                .map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
            </div>
          </section>
        )}
      </div>
      <div className="mobile-contact-bar">
        <span>
          {rental
            ? `${money(rental.price)} triệu / tháng`
            : "Cùng tìm hiểu dự án"}
        </span>
        <a className="button button-primary" href="#inquiry">
          Nhận tư vấn
        </a>
      </div>
    </main>
  );
}
export function EditorialPage({ slug }: { slug: string }) {
  if (!slug.includes("chinh-sach") && !slug.includes("dieu-khoan"))
    return <CompanyEditorial slug={slug} />;
  const page = staticPages[slug];
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
export function ArticlePage({ post }: { post: Post }) {
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
            dateModified: post.createdAt,
            image: post.image,
            author: {
              "@type": "Organization",
              name: "Ban biên tập demo Đất Vàng",
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
          Ban biên tập demo · {post.createdAt.split("-").reverse().join("/")} ·{" "}
          {post.readingTime} phút đọc
        </div>
        <div className="editorial-banner image-wrap">
          <Image
            src={post.image}
            alt={post.name}
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <article className="article-body">
          <p className="lead-copy">
            {post.description} Trong hành trình lựa chọn và chăm sóc một căn hộ,
            sự chuẩn bị giúp mỗi quyết định trở nên rõ ràng hơn.
          </p>
          <h2>Bắt đầu từ thói quen sống của bạn</h2>
          <p>
            {post.categorySlug === "cam-nang-thue-nha"
              ? "Hãy liệt kê những điều bạn sử dụng mỗi ngày: khoảng cách đến nơi làm việc, nơi nấu ăn, góc làm việc và nhu cầu tiếp đón người thân. Một căn hộ phù hợp không nhất thiết phải lớn nhất, mà cần hỗ trợ nhịp sống của bạn."
              : post.categorySlug === "phong-cach-song"
                ? "Một góc đọc sách bên cửa sổ, chất liệu gỗ ấm và ánh sáng vừa đủ có thể thay đổi cảm nhận về căn phòng. Quan sát thời điểm sử dụng không gian để chọn cách bố trí thực sự thuận tiện."
                : "Trước khi giới thiệu căn hộ, chủ sở hữu nên ghi nhận hiện trạng và các thiết bị đi kèm. Một bản mô tả rõ ràng giúp khách thuê hình dung đúng và giảm những hiểu nhầm khi trao đổi."}
          </p>
          <h2>{post.name.replace("?", "")}: những điều nên ghi lại</h2>
          <p>
            Đặt các ưu tiên theo thứ tự quan trọng. Với mỗi lựa chọn, ghi lại
            điểm phù hợp, điều còn băn khoăn và câu hỏi cần trao đổi thêm. Tránh
            quyết định chỉ từ một bức ảnh hoặc một lần xem nhanh.
          </p>
          <blockquote>
            Không gian tốt là không gian giúp cuộc sống thường ngày trở nên dễ
            chịu hơn.
          </blockquote>
          <h2>Trao đổi rõ ràng và kiểm tra thực tế</h2>
          <p>
            Dành thời gian quan sát ánh sáng, tiếng ồn, độ thông thoáng và tình
            trạng thiết bị. Thống nhất cách ghi nhận các vấn đề cần xử lý và đầu
            mối liên hệ. Những bước nhỏ này giúp quá trình sử dụng được thuận
            tiện hơn.
          </p>
          <p className="demo-banner">
            Bài viết biên tập minh họa cho demo. Nội dung không thay thế việc
            kiểm tra tài sản hoặc tư vấn chuyên môn cho trường hợp cụ thể.
          </p>
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
