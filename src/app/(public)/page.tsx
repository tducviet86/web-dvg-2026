import Image from "next/image";
import Link from "@/components/page-navigation";
import type { Metadata } from "next";
import {
  ArrowUpRight,
  ArrowDown,
  Compass,
  ShieldCheck,
  Handshake,
} from "lucide-react";
import { photos, projects, posts } from "@/data";
import { BlogCard, SectionHeading } from "@/components/cards";
import { Reveal } from "@/components/interactive";
import { CorporateBanner } from "@/components/corporate-banner";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Đất Vàng Group | Giới thiệu doanh nghiệp",
  description:
    "Tìm hiểu Đất Vàng Group, định hướng phát triển, lĩnh vực hoạt động, dự án và cơ hội hợp tác trong lĩnh vực bất động sản.",
  alternates: { canonical: "/" },
};

const fields = [
  {
    number: "01",
    name: "Quản lý bất động sản",
    description:
      "Chăm sóc tài sản bằng quy trình vận hành rõ ràng, chú trọng chất lượng và trải nghiệm sử dụng.",
    href: "/dich-vu/quan-ly-bat-dong-san",
    image: photos.interior,
  },
  {
    number: "02",
    name: "Khai thác & vận hành",
    description:
      "Xây dựng phương án khai thác phù hợp với đặc điểm từng bất động sản và mục tiêu của chủ sở hữu.",
    href: "/dich-vu/khai-thac-cho-thue",
    image: photos.living,
  },
  {
    number: "03",
    name: "Tư vấn & hợp tác",
    description:
      "Kết nối nguồn lực, lắng nghe nhu cầu và cùng đối tác xác định hướng đi cho những kế hoạch dài hạn.",
    href: "/hop-tac-chu-so-huu",
    image: photos.architecture,
  },
];

export default function Home() {
  return (
    <main id="main" className="corporate-home">
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
      <div className="corporate-intro-line">
        <div className="container">
          <span>ĐẤT VÀNG GROUP</span>
          <p>Tận tâm trong từng kết nối. Bền vững trong từng giá trị.</p>
          <a href="#ve-chung-toi" aria-label="Tìm hiểu về Đất Vàng Group">
            <ArrowDown size={18} />
          </a>
        </div>
      </div>

      <section id="ve-chung-toi" className="section corporate-about">
        <div className="brand-orbits" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="container corporate-about-grid">
          <div className="corporate-section-index">
            <span className="eyebrow">01 / VỀ CHÚNG TÔI</span>
            <span className="corporate-year">
              2018<small>NĂM THÀNH LẬP</small>
            </span>
          </div>
          <Reveal className="corporate-about-copy">
            <h1>
              Đất Vàng Group.
              <br />
              <em>
                Đồng hành cùng
                <br className="corporate-title-break" /> giá trị bền vững.
              </em>
            </h1>
            <div className="corporate-about-text">
              <p className="lead-copy">
                Chúng tôi tin rằng giá trị của một doanh nghiệp được tạo nên từ
                sự tận tâm, những kết nối có trách nhiệm và tầm nhìn dài hạn.
              </p>
              <p>
                Được thành lập từ năm 2018, Đất Vàng Group định hướng hoạt động
                trong lĩnh vực quản lý, vận hành và khai thác bất động sản tại
                Đà Nẵng. Chúng tôi đồng hành cùng khách hàng, chủ sở hữu và đối
                tác để xây dựng những giải pháp phù hợp với từng nhu cầu thực
                tế.
              </p>
              <Link className="text-link" href="/gioi-thieu">
                Tìm hiểu về Đất Vàng Group
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className="brand-story container"
        aria-label="Tinh thần Đất Vàng Group"
      >
        <Reveal className="brand-story-main image-wrap">
          <Image
            src={photos.architecture}
            alt="Kiến trúc đón ánh sáng tự nhiên — hình ảnh minh họa"
            fill
            sizes="(max-width: 768px) 100vw, 60vw"
          />
          <span className="story-photo-label">
            KHÔNG GIAN / CON NGƯỜI / GIÁ TRỊ
          </span>
        </Reveal>
        <div className="brand-story-aside">
          <div className="brand-seal" aria-hidden="true">
            <span>DVG</span>
            <small>TẬN TÂM · BỀN VỮNG</small>
          </div>
          <Reveal className="brand-story-detail image-wrap">
            <Image
              src={photos.interior}
              alt="Chi tiết không gian nội thất — hình ảnh minh họa"
              fill
              sizes="(max-width: 768px) 45vw, 30vw"
            />
          </Reveal>
          <p>
            Chăm chút từng chi tiết.
            <br />
            <em>Gắn kết những giá trị dài lâu.</em>
          </p>
        </div>
      </section>
      <div className="brand-ribbon" aria-hidden="true">
        <span>TẬN TÂM</span>
        <i />
        MINH BẠCH
        <i />
        <span>ĐỒNG HÀNH</span>
        <i />
        BỀN VỮNG
      </div>
      <section className="section corporate-fields">
        <div className="container">
          <SectionHeading
            eyebrow="02 / LĨNH VỰC HOẠT ĐỘNG"
            title="Thấu hiểu để đồng hành."
            href="/dich-vu"
            link="Tìm hiểu lĩnh vực hoạt động"
          />
          <div className="corporate-fields-grid">
            {fields.map((field) => (
              <article key={field.number}>
                <Link className="image-wrap" href={field.href}>
                  <Image
                    src={field.image}
                    alt={`Hình ảnh minh họa lĩnh vực ${field.name.toLowerCase()}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <span className="corporate-field-number">{field.number}</span>
                </Link>
                <h3>
                  <Link href={field.href}>
                    {field.name}
                    <ArrowUpRight size={21} />
                  </Link>
                </h3>
                <p>{field.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="corporate-vision">
        <div className="corporate-vision-image image-wrap">
          <Image
            src={photos.pool}
            alt="Không gian kiến trúc kết nối ánh sáng và cây xanh — minh họa"
            fill
            sizes="(max-width: 768px) 100vw, 55vw"
          />
        </div>
        <div className="corporate-vision-copy">
          <div className="brand-orbits" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span className="eyebrow">TẦM NHÌN & ĐỊNH HƯỚNG</span>
          <h2>
            Phát triển từ nền tảng.
            <br />
            <em>Vững bước về tương lai.</em>
          </h2>
          <p>
            Đất Vàng Group hướng đến việc xây dựng những mối quan hệ hợp tác lâu
            dài, nơi chất lượng công việc và sự tin cậy được vun đắp qua từng
            bước đồng hành.
          </p>
          <div className="corporate-principle">
            <span>01</span>
            <div>
              <h3>Lấy con người làm trọng tâm</h3>
              <p>Lắng nghe, tôn trọng và thấu hiểu nhu cầu.</p>
            </div>
          </div>
          <div className="corporate-principle">
            <span>02</span>
            <div>
              <h3>Lấy chất lượng làm nền tảng</h3>
              <p>Chăm chút quy trình và trách nhiệm trong thực hiện.</p>
            </div>
          </div>
          <Link href="/gioi-thieu/tam-nhin-su-menh" className="text-link">
            Tầm nhìn và sứ mệnh
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>

      <section className="section corporate-projects">
        <div className="container">
          <SectionHeading
            eyebrow="03 / KHÔNG GIAN & DỰ ÁN"
            title="Những không gian được giới thiệu."
            href="/du-an"
            link="Xem danh mục dự án"
          />
          <p className="corporate-section-note">
            Danh mục và hình ảnh minh họa định hướng hoạt động, chưa xác nhận
            vai trò triển khai thực tế của doanh nghiệp.
          </p>
          <div className="corporate-project-grid">
            {projects.slice(0, 2).map((project, index) => (
              <article key={project.id}>
                <Link href={`/du-an/${project.slug}`} className="image-wrap">
                  <Image
                    src={project.image}
                    alt={`Kiến trúc minh họa ${project.name}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <span className="round-arrow">
                    <ArrowUpRight size={25} />
                  </span>
                </Link>
                <div className="corporate-project-caption">
                  <span>0{index + 1}</span>
                  <div>
                    <h3>
                      <Link href={`/du-an/${project.slug}`}>
                        {project.name}
                      </Link>
                    </h3>
                    <p>{project.location} · Dự án minh họa</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section corporate-values">
        <div className="container">
          <div className="corporate-values-heading">
            <span className="eyebrow">04 / GIÁ TRỊ CỐT LÕI</span>
            <h2>
              Điều chúng tôi
              <br />
              <em>luôn gìn giữ.</em>
            </h2>
            <p>
              Những nguyên tắc định hướng cách chúng tôi làm việc, kết nối và
              phát triển mỗi ngày.
            </p>
          </div>
          <div className="corporate-values-list">
            {[
              {
                icon: ShieldCheck,
                title: "Minh bạch",
                text: "Rõ ràng trong thông tin, phạm vi công việc và quá trình phối hợp.",
              },
              {
                icon: Compass,
                title: "Tận tâm",
                text: "Lắng nghe nhu cầu thực tế, chú trọng từng chi tiết trong trải nghiệm.",
              },
              {
                icon: Handshake,
                title: "Đồng hành",
                text: "Tôn trọng sự tin cậy và cùng đối tác vun đắp mối quan hệ dài lâu.",
              },
            ].map((value, index) => (
              <div key={value.title}>
                <value.icon size={28} strokeWidth={1.2} />
                <div>
                  <h3>{value.title}</h3>
                  <p>{value.text}</p>
                </div>
                <span>0{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section corporate-news">
        <div className="container">
          <SectionHeading
            eyebrow="05 / TIN TỨC & GÓC NHÌN"
            title="Chia sẻ để kết nối."
            href="/blog"
            link="Xem tất cả bài viết"
          />
          <div className="grid grid-3">
            {posts.slice(0, 3).map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </section>

      <section className="corporate-partnership">
        <div className="brand-orbits" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="container">
          <div>
            <span className="eyebrow">KẾT NỐI VỚI ĐẤT VÀNG GROUP</span>
            <h2>
              Cùng mở ra
              <br />
              <em>những giá trị mới.</em>
            </h2>
          </div>
          <div>
            <p>
              Chúng tôi luôn sẵn sàng lắng nghe những ý tưởng, nhu cầu và cơ hội
              hợp tác từ bạn.
            </p>
            <Link className="button button-gold" href="/lien-he">
              Liên hệ hợp tác
              <ArrowUpRight size={19} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
