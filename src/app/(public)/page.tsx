import Image from "next/image";
import Link from "@/components/page-navigation";
import type { Metadata } from "next";
import { ArrowUpRight, ArrowDown, ArrowRight } from "lucide-react";
import { photos, projects, posts } from "@/data";
import { Reveal } from "@/components/interactive";
import { CorporateBanner } from "@/components/corporate-banner";
import { SignatureFields } from "@/components/signature-fields";
import { DepthScene } from "@/components/depth-scene";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Đất Vàng Group | Giới thiệu doanh nghiệp",
  description:
    "Tìm hiểu Đất Vàng Group, định hướng phát triển, lĩnh vực hoạt động, dự án và cơ hội hợp tác trong lĩnh vực bất động sản.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main id="main" className="corporate-home signature-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Đất Vàng Group",
            url: siteUrl,
            logo: `${siteUrl}/images/dat-vang-group-logo-transparent.png`,
            description:
              "Giới thiệu doanh nghiệp, lĩnh vực hoạt động và định hướng phát triển của Đất Vàng Group.",
          }),
        }}
      />
      <CorporateBanner />
      <nav className="signature-chapters" aria-label="Khám phá trang chủ">
        <div className="container">
          <a href="#ve-chung-toi">
            <span>01</span>Về Đất Vàng
            <ArrowDown size={16} />
          </a>
          <a href="#linh-vuc">
            <span>02</span>Lĩnh vực hoạt động
            <ArrowDown size={16} />
          </a>
          <a href="#khong-gian">
            <span>03</span>Không gian & dự án
            <ArrowDown size={16} />
          </a>
        </div>
      </nav>
      <section id="ve-chung-toi" className="signature-about corporate-about">
        <div className="container">
          <div className="signature-section-top">
            <span className="signature-kicker">
              01 / CÂU CHUYỆN DOANH NGHIỆP
            </span>
            <span className="signature-location">TỪ ĐÀ NẴNG, TỪ NĂM 2018</span>
          </div>
          <div className="signature-about-layout">
            <Reveal className="signature-statement">
              <h1>
                <span>Đất Vàng Group.</span>Không chỉ là
                <br />
                một không gian.
                <br />
                <em>
                  Là những giá trị
                  <br />
                  được tiếp nối.
                </em>
              </h1>
              <Link
                href="/gioi-thieu"
                className="signature-round-link"
                aria-label="Tìm hiểu về Đất Vàng Group"
              >
                <ArrowUpRight size={30} />
                <span>
                  Câu chuyện
                  <br />
                  Đất Vàng
                </span>
              </Link>
            </Reveal>
            <div className="signature-about-aside">
              <DepthScene>
                <div className="signature-about-photo image-wrap">
                  <Image
                    src={photos.architecture}
                    alt="Không gian mở kết nối ánh sáng và con người — hình ảnh minh họa"
                    fill
                    sizes="(max-width:768px) 100vw, 35vw"
                  />
                  <span aria-hidden="true">DVG / 2018</span>
                </div>
              </DepthScene>
              <p>
                Đất Vàng Group hoạt động trong lĩnh vực quản lý, vận hành và
                khai thác bất động sản tại Đà Nẵng.
              </p>
              <p>
                Chúng tôi bắt đầu từ việc lắng nghe, chăm chút từng chi tiết và
                đồng hành cùng chủ sở hữu, khách hàng, đối tác trong những kế
                hoạch dài lâu.
              </p>
              <div className="signature-principles">
                <span>Minh bạch</span>
                <span>Tận tâm</span>
                <span>Đồng hành</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SignatureFields />
      <section id="khong-gian" className="signature-projects">
        <div className="container">
          <div className="signature-section-top">
            <span className="signature-kicker">03 / KHÔNG GIAN & DỰ ÁN</span>
            <Link className="signature-link" href="/du-an">
              Xem danh mục
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <Reveal>
            <h2 className="signature-display">
              Một góc nhìn mới.
              <br />
              <em>Một giá trị khác.</em>
            </h2>
          </Reveal>
          <p className="signature-demo-note">
            Danh mục và hình ảnh minh họa định hướng hoạt động, chưa xác nhận
            vai trò triển khai thực tế của doanh nghiệp.
          </p>
          <div className="signature-project-grid">
            {projects.slice(0, 2).map((project, index) => (
              <Reveal
                key={project.id}
                className={`signature-project signature-project-${index + 1}`}
              >
                <article>
                  <Link
                    href={`/du-an/${project.slug}`}
                    className="signature-project-image image-wrap"
                  >
                    <Image
                      src={project.image}
                      alt={`Kiến trúc minh họa ${project.name}`}
                      fill
                      sizes="(max-width:768px) 100vw, 55vw"
                    />
                    <span className="signature-project-index">
                      0{index + 1}
                    </span>
                    <span className="signature-project-action">
                      Khám phá
                      <ArrowUpRight size={22} />
                    </span>
                  </Link>
                  <div className="signature-project-caption">
                    <div>
                      <span>{project.location} · Dự án minh họa</span>
                      <h3>
                        <Link href={`/du-an/${project.slug}`}>
                          {project.name}
                        </Link>
                      </h3>
                    </div>
                    <ArrowUpRight size={24} />
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="signature-journal">
        <div className="container">
          <div className="signature-section-top">
            <span className="signature-kicker">04 / GÓC NHÌN ĐẤT VÀNG</span>
            <Link href="/blog" className="signature-link">
              Tất cả bài viết
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="signature-journal-layout">
            <div>
              <h2>
                Những câu chuyện
                <br />
                <em>đáng chia sẻ.</em>
              </h2>
              <p>
                Góc nhìn về không gian sống,
                <br />
                con người và sự đồng hành.
              </p>
            </div>
            <div className="signature-journal-list">
              {posts.slice(0, 3).map((post, index) => (
                <Reveal key={post.id}>
                  <article>
                    <span className="signature-journal-number">
                      0{index + 1}
                    </span>
                    <Link
                      className="signature-journal-photo image-wrap"
                      href={`/blog/${post.slug}`}
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <Image
                        src={post.image}
                        alt=""
                        fill
                        sizes="(max-width:768px) 100px, 150px"
                      />
                    </Link>
                    <div>
                      <span className="signature-kicker">
                        {post.category} · {post.readingTime} PHÚT ĐỌC
                      </span>
                      <h3>
                        <Link href={`/blog/${post.slug}`}>{post.name}</Link>
                      </h3>
                    </div>
                    <ArrowUpRight size={22} />
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="signature-connect">
        <div className="container">
          <div className="signature-section-top">
            <span className="signature-kicker">KẾT NỐI VỚI ĐẤT VÀNG GROUP</span>
            <span>CÙNG BẮT ĐẦU MỘT ĐIỀU MỚI</span>
          </div>
          <div className="signature-connect-layout">
            <h2>
              Bạn có một ý tưởng.
              <br />
              <em>
                Chúng ta có thể
                <br />
                bắt đầu từ đó.
              </em>
            </h2>
            <Link href="/lien-he" className="signature-contact-orbit">
              <ArrowUpRight size={48} />
              <span>Liên hệ hợp tác</span>
            </Link>
          </div>
          <div className="signature-connect-bottom">
            <p>
              Chia sẻ nhu cầu, trao đổi định hướng,
              <br />
              cùng tìm một cách đồng hành.
            </p>
            <Link href="/hop-tac-chu-so-huu">
              Dành cho chủ sở hữu
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
