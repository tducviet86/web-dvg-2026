import Image from "next/image";
import Link from "@/components/page-navigation";
import type { Metadata } from "next";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { posts } from "@/data";
import { Reveal } from "@/components/interactive";
import { CorporateBanner } from "@/components/corporate-banner";
import { SignatureFields } from "@/components/signature-fields";
import { HomeProjects } from "@/components/home-projects";
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
      <h1 className="sr-only">
        Đất Vàng Group — Mua bán, cho thuê và ký gửi bất động sản
      </h1>
      <HomeProjects group="development" />
      <HomeProjects group="operation" />
      <SignatureFields />
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
