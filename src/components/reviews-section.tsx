/** @jsxImportSource @/i18n/jsx */
import { ArrowUpRight, PenLine, Star } from "lucide-react";
import { getPublicSettings, getReviews, type Review } from "@/lib/api/content";

const SOURCE: Record<Review["source"], string> = {
  GOOGLE: "Google",
  FACEBOOK: "Facebook",
  DIRECT: "Khách hàng",
};
const date = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const safeUrl = (url?: string) =>
  url && /^https:\/\//.test(url) ? url : undefined;

function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span className="review-stars" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={15}
          aria-hidden="true"
          fill={n <= Math.round(value) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

/**
 * "Khách hàng nói gì": reviews entered in Admin › Đánh giá, with the Google
 * profile's overall rating and links to read all reviews or write one
 * (Admin › Cài đặt). No review markup for search engines: Google does not
 * accept a company's own reviews of itself as rich results.
 */
export function ReviewsSection({
  reviews,
  settings,
  limit = 6,
}: {
  reviews: Review[];
  settings: Record<string, string>;
  limit?: number;
}) {
  const googleUrl = safeUrl(settings["reviews.googleUrl"]);
  const writeUrl = safeUrl(settings["reviews.googleWriteUrl"]);
  const rating = Number(settings["reviews.googleRating"]?.replace(",", "."));
  const count = Number(settings["reviews.googleCount"]);
  const hasSummary = rating > 0 && rating <= 5 && count > 0;
  const shown = reviews.slice(0, limit);
  if (!shown.length && !hasSummary) return null;
  return (
    <section className="reviews-section" aria-labelledby="danh-gia-title">
      <div className="container">
        <div className="home-head">
          <div>
            <span className="home-kicker">KHÁCH HÀNG NÓI GÌ</span>
            <h2 id="danh-gia-title">Được khách hàng tin tưởng</h2>
          </div>
          <div className="reviews-summary">
            {hasSummary && (
              <p>
                <strong>{rating.toLocaleString("vi-VN")}</strong>
                <Stars value={rating} label={`${rating} trên 5 sao`} />
                <span>{count} đánh giá trên Google</span>
              </p>
            )}
            <div>
              {googleUrl && (
                <a
                  className="home-more"
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Xem tất cả trên Google
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              )}
              {writeUrl && (
                <a
                  className="reviews-write"
                  href={writeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PenLine size={15} aria-hidden="true" />
                  Viết đánh giá
                </a>
              )}
            </div>
          </div>
        </div>
        {shown.length > 0 && (
          <ul className="reviews-grid">
            {shown.map((r) => {
              const link = safeUrl(r.sourceUrl ?? undefined);
              return (
                <li key={r.id}>
                  <figure className="review-card">
                    <Stars value={r.rating} label={`${r.rating} trên 5 sao`} />
                    <blockquote>
                      <p>{r.content}</p>
                    </blockquote>
                    <figcaption>
                      <span className="review-avatar" aria-hidden="true">
                        {r.authorName.trim().charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <strong>{r.authorName}</strong>
                        <small>
                          {r.project ? `${r.project.name} · ` : ""}
                          {date(r.reviewedAt)}
                        </small>
                      </span>
                      {link ? (
                        <a
                          className="review-source"
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Xem đánh giá của ${r.authorName} trên ${SOURCE[r.source]}`}
                        >
                          {SOURCE[r.source]}
                        </a>
                      ) : (
                        <span className="review-source">
                          {SOURCE[r.source]}
                        </span>
                      )}
                    </figcaption>
                  </figure>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/** The section with its own data: reviews (of one project, if given) and the Google summary. */
export async function Reviews({
  project,
  limit,
}: {
  project?: string;
  limit?: number;
}) {
  const [reviews, settings] = await Promise.all([
    getReviews(project),
    getPublicSettings().catch(() => ({}) as Record<string, string>),
  ]);
  return <ReviewsSection reviews={reviews} settings={settings} limit={limit} />;
}
