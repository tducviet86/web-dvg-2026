/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import Link from "@/components/page-navigation";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { BackButton } from "@/components/layout/back-button";
import { parseArticle, type ArticleBlock as Block } from "@/lib/article";
import { canOptimizeImage } from "@/lib/banners";
import { siteUrl } from "@/lib/utils";
import type { Filters } from "@/lib/filter";
import type { Post } from "@/types";
import { photos } from "@/data";
import { ShareButton } from "./rental-inquiry";
import { Reveal } from "./interactive";

type Category = { slug: string; name: string; postCount?: number };

/** "2026-10-12" → "12/10/2026". */
const day = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

function PostMeta({ post }: { post: Post }) {
  return (
    <span className="post-meta">
      <time dateTime={post.createdAt}>{day(post.createdAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{post.readingTime} phút đọc</span>
    </span>
  );
}

/** Image card used in the news grid and "Đọc tiếp". */
export function PostCard({
  post,
  priority = false,
}: {
  post: Post;
  priority?: boolean;
}) {
  return (
    <article className="post-card">
      <Link
        className="post-card-photo image-wrap"
        href={`/blog/${post.slug}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={post.image}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 33vw"
          loading={priority ? "eager" : "lazy"}
        />
      </Link>
      <div className="post-card-body">
        <Link
          className="post-chip"
          href={`/blog/danh-muc/${post.categorySlug}`}
        >
          {post.category}
        </Link>
        <h3>
          <Link href={`/blog/${post.slug}`}>{post.name}</Link>
        </h3>
        <p>{post.description}</p>
        <div className="post-card-foot">
          <span>{post.author || "Đất Vàng Group"}</span>
          <PostMeta post={post} />
        </div>
      </div>
    </article>
  );
}

/** Small row: thumbnail, date and title (category blocks, "Tin mới"). */
function PostRow({ post }: { post: Post }) {
  return (
    <li className="news-row">
      <Link
        className="news-row-photo image-wrap"
        href={`/blog/${post.slug}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image src={post.image} alt="" fill sizes="140px" />
      </Link>
      <div>
        <time dateTime={post.createdAt}>{day(post.createdAt)}</time>
        <h3>
          <Link href={`/blog/${post.slug}`}>{post.name}</Link>
        </h3>
      </div>
    </li>
  );
}

/** /blog and /blog/danh-muc/<slug>: news front page. */
export function BlogListing({
  posts,
  categories,
  filters,
}: {
  posts: Post[];
  categories: Category[];
  filters: Filters;
}) {
  const current = categories.find((c) => c.slug === filters.category);
  const news = current
    ? posts.filter((p) => p.categorySlug === current.slug)
    : posts;
  const [feature, ...rest] = news;
  const banner = feature?.image ?? photos.architecture;
  return (
    <main id="main" className="company-page blog-page">
      <header className="news-banner">
        <Image
          className="news-banner-photo"
          src={banner}
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
        />
        <div className="container">
          <span className="eyebrow">
            {current ? "CHUYÊN MỤC" : "ĐẤT VÀNG GROUP"}
          </span>
          <h1>{current ? current.name : "Tin tức"}</h1>
          <p>
            {current
              ? `${news.length} bài viết về ${current.name.toLowerCase()}.`
              : "Cẩm nang thuê nhà, phong cách sống và câu chuyện bất động sản Đà Nẵng."}
          </p>
        </div>
      </header>
      <div className="news-crumbs">
        <nav className="breadcrumb container" aria-label="Đường dẫn">
          <BackButton />
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          {current ? (
            <>
              <Link href="/blog">Tin tức</Link>
              <span>/</span>
              <span aria-current="page">{current.name}</span>
            </>
          ) : (
            <span aria-current="page">Tin tức</span>
          )}
        </nav>
      </div>

      {feature ? (
        <section className="container news-top" aria-label="Tin nổi bật">
          <article className="blog-feature">
            <Link
              className="blog-feature-photo image-wrap"
              href={`/blog/${feature.slug}`}
              tabIndex={-1}
              aria-hidden="true"
            >
              <Image
                src={feature.image}
                alt=""
                fill
                sizes="(max-width: 1080px) 100vw, 40vw"
              />
            </Link>
            <div className="blog-feature-copy">
              <Link
                className="post-chip"
                href={`/blog/danh-muc/${feature.categorySlug}`}
              >
                {feature.category}
              </Link>
              <h2>
                <Link href={`/blog/${feature.slug}`}>{feature.name}</Link>
              </h2>
              <PostMeta post={feature} />
              <p>{feature.description}</p>
              <Link className="news-more" href={`/blog/${feature.slug}`}>
                Xem chi tiết <span aria-hidden="true">»</span>
              </Link>
            </div>
          </article>
          {rest.length > 0 && (
            <aside className="news-latest" aria-labelledby="tin-moi">
              <h2 id="tin-moi">Tin mới</h2>
              <ol>
                {rest.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <time dateTime={p.createdAt}>{day(p.createdAt)}</time>
                    <Link href={`/blog/${p.slug}`}>{p.name}</Link>
                  </li>
                ))}
              </ol>
            </aside>
          )}
        </section>
      ) : (
        <p className="container blog-empty">
          Chưa có bài viết trong chuyên mục này.
        </p>
      )}

      <nav
        className="blog-categories container"
        aria-label="Chuyên mục bài viết"
      >
        <Link href="/blog" aria-current={!current ? "page" : undefined}>
          Tất cả <span>{posts.length}</span>
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/blog/danh-muc/${c.slug}`}
            aria-current={current?.slug === c.slug ? "page" : undefined}
          >
            {c.name}
            {c.postCount ? <span>{c.postCount}</span> : null}
          </Link>
        ))}
      </nav>

      {current ? (
        rest.length > 0 && (
          <section className="container news-all">
            <div className="post-grid">
              {rest.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 70}>
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>
          </section>
        )
      ) : (
        <div className="container news-sections">
          {categories.map((c) => {
            const list = posts.filter((p) => p.categorySlug === c.slug);
            if (!list.length) return null;
            const [top, ...more] = list;
            return (
              <Reveal key={c.slug}>
                <section
                  className="news-section"
                  aria-labelledby={`cm-${c.slug}`}
                >
                  <div className="news-section-head">
                    <h2 id={`cm-${c.slug}`}>{c.name}</h2>
                    <Link href={`/blog/danh-muc/${c.slug}`}>
                      Xem tất cả <span aria-hidden="true">»</span>
                    </Link>
                  </div>
                  <article className="news-section-top">
                    <Link
                      className="news-section-photo image-wrap"
                      href={`/blog/${top.slug}`}
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <Image
                        src={top.image}
                        alt=""
                        fill
                        sizes="(max-width: 900px) 100vw, 45vw"
                      />
                    </Link>
                    <time dateTime={top.createdAt}>{day(top.createdAt)}</time>
                    <h3>
                      <Link href={`/blog/${top.slug}`}>{top.name}</Link>
                    </h3>
                    <p>{top.description}</p>
                  </article>
                  {more.length > 0 && (
                    <ul className="news-rows">
                      {more.slice(0, 3).map((p) => (
                        <PostRow key={p.id} post={p} />
                      ))}
                    </ul>
                  )}
                </section>
              </Reveal>
            );
          })}
        </div>
      )}
    </main>
  );
}

// ───────────────────────────── article body ─────────────────────────────

function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line}
        </span>
      ))}
    </>
  );
}

function ArticleBody({ blocks }: { blocks: Block[] }) {
  // The first paragraph opens with a drop cap.
  const lead = blocks.findIndex((b) => b.kind === "p");
  return (
    <div className="article-prose">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "h2":
            return (
              <h2 key={i} id={block.id}>
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} id={block.id}>
                {block.text}
              </h3>
            );
          case "quote":
            return (
              <blockquote key={i}>
                <p>
                  <Lines text={block.text} />
                </p>
              </blockquote>
            );
          case "list":
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          case "figure":
            return (
              <figure key={i}>
                <span className="article-figure image-wrap">
                  <Image
                    src={block.src}
                    alt={block.caption}
                    fill
                    sizes="(max-width: 860px) 100vw, 760px"
                    unoptimized={!canOptimizeImage(block.src)}
                  />
                </span>
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
          default: {
            return (
              <p key={i} className={i === lead ? "article-lead" : undefined}>
                <Lines text={block.text} />
              </p>
            );
          }
        }
      })}
    </div>
  );
}

/** /blog/<slug>: the reading page. */
export function ArticlePage({ post, posts }: { post: Post; posts: Post[] }) {
  const blocks = parseArticle(post.content?.trim() || post.description);
  const toc = blocks.flatMap((b) => (b.kind === "h2" ? [b] : []));
  const tags = (post.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  // Posts arrive newest first.
  const index = posts.findIndex((p) => p.id === post.id);
  const newer = index > 0 ? posts[index - 1] : undefined;
  const older = index >= 0 ? posts[index + 1] : undefined;
  const others = [
    ...posts.filter(
      (p) => p.id !== post.id && p.categorySlug === post.categorySlug,
    ),
    ...posts.filter(
      (p) => p.id !== post.id && p.categorySlug !== post.categorySlug,
    ),
  ].slice(0, 8);
  const author = post.author || "Đất Vàng Group";
  return (
    <main id="main" className="page-main article-page">
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
            author: { "@type": "Organization", name: author },
            mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
          }),
        }}
      />
      <div className="container">
        <nav className="breadcrumb" aria-label="Đường dẫn">
          <BackButton />
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <Link href="/blog">Tin tức</Link>
          <span>/</span>
          <Link href={`/blog/danh-muc/${post.categorySlug}`}>
            {post.category}
          </Link>
        </nav>
      </div>
      <header className="article-hero container">
        <div className="article-hero-copy">
          <Link
            className="article-category"
            href={`/blog/danh-muc/${post.categorySlug}`}
          >
            {post.category}
          </Link>
          <h1>{post.name}</h1>
          <div className="article-byline">
            <span className="article-byline-meta">
              <time dateTime={post.createdAt}>{day(post.createdAt)}</time>
              <span aria-hidden="true">·</span>
              <Clock3 size={14} aria-hidden="true" />
              {post.readingTime} phút đọc
              <span aria-hidden="true">·</span>
              {author}
            </span>
            <ShareButton title={post.name} />
          </div>
          <p className="article-standfirst">{post.description}</p>
        </div>
        <span className="article-hero-photo image-wrap">
          <Image
            src={post.image}
            alt={post.imageAlt || post.name}
            fill
            sizes="(max-width: 1080px) 100vw, 55vw"
            loading="eager"
            fetchPriority="high"
          />
        </span>
      </header>
      <div className="article-column container">
        {toc.length > 1 && (
          <nav className="article-toc" aria-label="Mục lục bài viết">
            <span className="eyebrow">NỘI DUNG CHÍNH</span>
            <ol>
              {toc.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`}>{h.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <article className="article-main article-body">
          <ArticleBody blocks={blocks} />
          {post.isDemo && (
            <p className="demo-banner">
              Bài viết biên tập minh họa. Nội dung không thay thế việc kiểm tra
              tài sản hoặc tư vấn chuyên môn cho trường hợp cụ thể.
            </p>
          )}
          <footer className="article-foot">
            {tags.length > 0 && (
              <ul className="article-tags" aria-label="Từ khóa">
                {tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            )}
            <span className="article-foot-share">
              Chia sẻ bài viết <ShareButton title={post.name} />
            </span>
          </footer>
          {(newer || older) && (
            <nav className="article-pager" aria-label="Bài viết khác">
              {older ? (
                <Link
                  href={`/blog/${older.slug}`}
                  className="article-pager-prev"
                >
                  <span>
                    <ArrowLeft size={16} aria-hidden="true" /> Bài trước
                  </span>
                  <strong>{older.name}</strong>
                </Link>
              ) : (
                <span />
              )}
              {newer && (
                <Link
                  href={`/blog/${newer.slug}`}
                  className="article-pager-next"
                >
                  <span>
                    Bài sau <ArrowRight size={16} aria-hidden="true" />
                  </span>
                  <strong>{newer.name}</strong>
                </Link>
              )}
            </nav>
          )}
        </article>
      </div>
      {others.length > 0 && (
        <section className="article-related" aria-labelledby="bai-khac">
          <div className="container">
            <div className="news-section-head">
              <h2 id="bai-khac">Các bài viết khác</h2>
              <Link href="/blog">
                Xem tất cả <span aria-hidden="true">»</span>
              </Link>
            </div>
          </div>
          <ul className="related-rail">
            {others.map((p) => (
              <li key={p.id}>
                <Link
                  className="related-photo image-wrap"
                  href={`/blog/${p.slug}`}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <Image src={p.image} alt="" fill sizes="320px" />
                </Link>
                <time dateTime={p.createdAt}>{day(p.createdAt)}</time>
                <h3>
                  <Link href={`/blog/${p.slug}`}>{p.name}</Link>
                </h3>
                <Link
                  className="news-more"
                  href={`/blog/${p.slug}`}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  Xem chi tiết <span>»</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
