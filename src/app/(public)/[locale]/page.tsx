/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import Link from "@/components/page-navigation";
import type { Metadata } from "next";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import {
  getBanners,
  getPosts,
  getPublicSettings,
  getSiteContent,
} from "@/lib/api/content";
import { agentSchema, graphNode, jsonLd } from "@/lib/structured-data";
import type { ResolvedBanner } from "@/lib/banners";
import { Reveal } from "@/components/interactive";
import { CorporateBanner } from "@/components/corporate-banner";
import { SignatureFields } from "@/components/signature-fields";
import { HomeProjects } from "@/components/home-projects";
import { siteUrl } from "@/lib/utils";
import { HTML_LANG, isLocale, type Locale } from "@/i18n/config";
import { localeAlternates, ogLocale } from "@/i18n/metadata";
import { setRequestLocale, t } from "@/i18n/server";

type Props = { params: Promise<{ locale: string }> };
async function pageLocale(params: Props["params"]): Promise<Locale> {
  const { locale } = await params;
  const value = isLocale(locale) ? locale : "vi";
  await setRequestLocale(value);
  return value;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await pageLocale(params);
  return {
    title: t("Đất Vàng Group | Giới thiệu doanh nghiệp"),
    description: t(
      "Tìm hiểu Đất Vàng Group, định hướng phát triển, lĩnh vực hoạt động, dự án và cơ hội hợp tác trong lĩnh vực bất động sản.",
    ),
    alternates: localeAlternates(locale, "/"),
    openGraph: ogLocale(locale),
  };
}

// Rendered per request from cached API data (see lib/api/server.ts); the
// build does not depend on the API being reachable.
export const revalidate = 0;

/** Shown only when no banner is published, so the hero never collapses. */
const fallbackSlides: ResolvedBanner[] = [
  {
    id: "fallback",
    type: "NORMAL",
    label: "ĐẤT VÀNG GROUP",
    title: "Kết nối giá trị bất động sản",
    image: "/images/img1.png",
    alt: "Không gian kiến trúc — hình ảnh minh họa",
  },
];

export default async function Home({ params }: Props) {
  const locale = await pageLocale(params);
  const [banners, { portfolio }, posts, settings] = await Promise.all([
    getBanners(),
    getSiteContent(),
    getPosts(),
    getPublicSettings().catch(() => ({}) as Record<string, string>),
  ]);
  // The company as a local real-estate agent (address, hours from Admin › Cài đặt).
  const agent = graphNode(agentSchema(settings));
  return (
    <main id="main" className="corporate-home signature-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                ...agent,
                description: t(
                  "Giới thiệu doanh nghiệp, lĩnh vực hoạt động và định hướng phát triển của Đất Vàng Group.",
                ),
              },
              {
                "@type": "WebSite",
                "@id": `${siteUrl}/#website`,
                name: "Đất Vàng Group",
                url: siteUrl,
                inLanguage: HTML_LANG[locale],
                publisher: { "@id": `${siteUrl}/#organization` },
              },
            ],
          }),
        }}
      />
      <CorporateBanner slides={banners.length ? banners : fallbackSlides} />
      <h1 className="sr-only">
        Đất Vàng Group — Mua bán, cho thuê và ký gửi bất động sản
      </h1>
      <HomeProjects group="development" projects={portfolio} />
      <HomeProjects group="operation" projects={portfolio} />
      <SignatureFields />
      <section className="signature-journal" id="goc-nhin">
        <div className="container">
          <div className="ds-section-head">
            <div>
              <span className="signature-kicker">04 / GÓC NHÌN ĐẤT VÀNG</span>
              <h2>
                Những câu chuyện <em>đáng chia sẻ.</em>
              </h2>
            </div>
            <div className="ds-section-aside">
              <p>Góc nhìn về không gian sống, con người và sự đồng hành.</p>
              <Link href="/blog" className="signature-link">
                Tất cả bài viết
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
          <div className="journal-grid">
            {posts.slice(0, 3).map((post, index) => (
              <Reveal key={post.id} delay={index * 90}>
                <article className="journal-card">
                  <Link
                    className="journal-card-photo image-wrap"
                    href={`/blog/${post.slug}`}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <Image
                      src={post.image}
                      alt=""
                      fill
                      sizes="(max-width: 900px) 34vw, 33vw"
                    />
                  </Link>
                  <div>
                    <span className="journal-card-meta">
                      {post.category} · {post.readingTime} PHÚT ĐỌC
                    </span>
                    <h3>
                      <Link href={`/blog/${post.slug}`}>{post.name}</Link>
                    </h3>
                    <span className="journal-card-cta" aria-hidden="true">
                      Đọc bài viết
                      <ArrowUpRight size={15} />
                    </span>
                  </div>
                </article>
              </Reveal>
            ))}
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
