/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import Link from "@/components/page-navigation";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, KeyRound, Phone } from "lucide-react";
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
import { HomeShowcase } from "@/components/home-showcase";
import { HomeRentals, pickFeaturedRentals } from "@/components/home-rentals";
import { companyHotline, telephoneHref } from "@/lib/company-contact";
import { photos } from "@/data";
import { siteUrl } from "@/lib/utils";
import { HTML_LANG, isLocale, type Locale } from "@/i18n/config";
import { defaultOgImage, localeAlternates, ogLocale } from "@/i18n/metadata";
import { href, setRequestLocale, t } from "@/i18n/server";

type Props = { params: Promise<{ locale: string }> };
async function pageLocale(params: Props["params"]): Promise<Locale> {
  const { locale } = await params;
  const value = isLocale(locale) ? locale : "vi";
  await setRequestLocale(value);
  return value;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await pageLocale(params);
  const title = t("Đất Vàng Group | Giới thiệu doanh nghiệp");
  const description = t(
    "Tìm hiểu Đất Vàng Group, định hướng phát triển, lĩnh vực hoạt động, dự án và cơ hội hợp tác trong lĩnh vực bất động sản.",
  );
  return {
    title: { absolute: title },
    description,
    alternates: localeAlternates(locale, "/"),
    openGraph: {
      title,
      description,
      url: href("/"),
      ...ogLocale(locale),
      images: [defaultOgImage],
    },
    twitter: { title, description, images: [defaultOgImage] },
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
  const [banners, { portfolio, properties }, posts, settings] =
    await Promise.all([
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
      <HomeShowcase
        id="du-an-trien-khai"
        kicker="DỰ ÁN ĐANG TRIỂN KHAI"
        title="Dự án mới tại Đà Nẵng"
        lead="Thông tin, vị trí và sản phẩm của các dự án đang phát triển."
        more={{ href: "/du-an/trien-khai", label: "Xem dự án triển khai" }}
        projects={portfolio.filter((p) => p.group === "development")}
      />
      <HomeShowcase
        id="du-an-van-hanh"
        kicker="DỰ ÁN ĐANG VẬN HÀNH"
        title=""
        lead="Căn hộ thực tế tại các tòa nhà Đất Vàng Group đang vận hành."
        more={{ href: "/du-an/van-hanh", label: "Xem dự án vận hành" }}
        projects={portfolio.filter((p) => p.group === "operation")}
      />
      <HomeRentals units={pickFeaturedRentals(properties)} />
      <SignatureFields />
      <section className="signature-journal" id="goc-nhin">
        <div className="container">
          <div className="home-head">
            <div>
              <span className="home-kicker">GÓC NHÌN ĐẤT VÀNG</span>
              <h2>Tin tức & cẩm nang</h2>
            </div>
            <div className="home-head-aside">
              <p>
                Góc nhìn về không gian sống, thị trường và kinh nghiệm thuê,
                mua.
              </p>
              <Link href="/blog" className="home-more">
                Tất cả bài viết
                <ArrowRight size={17} aria-hidden="true" />
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
      <section className="home-cta" aria-labelledby="home-cta-title">
        <Image
          className="home-cta-photo"
          src={
            portfolio.find((p) => p.group === "operation")?.image ??
            photos.building
          }
          alt=""
          fill
          sizes="100vw"
        />
        <div className="container home-cta-inner">
          <span className="home-kicker">KẾT NỐI VỚI ĐẤT VÀNG GROUP</span>
          <h2 id="home-cta-title">Cùng tìm không gian phù hợp với bạn</h2>
          <p>
            Thuê, mua hay ký gửi căn hộ tại Đà Nẵng: chia sẻ nhu cầu, tư vấn
            viên sẽ liên hệ lại trong ngày.
          </p>
          <div className="home-cta-actions">
            <Link href="/lien-he" className="hero-submit">
              Liên hệ tư vấn
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href={telephoneHref() || href("/lien-he")}>
              <Phone size={16} aria-hidden="true" />
              Gọi <strong>{companyHotline}</strong>
            </a>
            <Link href="/hop-tac-chu-so-huu">
              <KeyRound size={16} aria-hidden="true" />
              Ký gửi căn hộ
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
