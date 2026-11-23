/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import Link from "@/components/page-navigation";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import type { PortfolioProject } from "@/types";

/**
 * Home: one row of projects as tall photo cards (name over the photo). The
 * whole card opens the project page, where the search lives; on phones the
 * row scrolls sideways.
 */
export function HomeShowcase({
  id,
  kicker,
  title,
  hiddenTitle,
  lead,
  more,
  projects,
  compact = false,
}: {
  id: string;
  kicker: string;
  title: string;
  /** For readers and crawlers, when no title is shown. */
  hiddenTitle?: string;
  lead: string;
  more: { href: string; label: string };
  projects: PortfolioProject[];
  /** Shorter photos, so the row takes less of the screen. */
  compact?: boolean;
}) {
  if (!projects.length) return null;
  return (
    <section id={id} className="home-showcase">
      <div className="container">
        <div className="home-head">
          <div>
            <span className="home-kicker">{kicker}</span>
            {title ? (
              <h2>{title}</h2>
            ) : (
              hiddenTitle && <h2 className="sr-only">{hiddenTitle}</h2>
            )}
          </div>
          <div className="home-head-aside">
            <p>{lead}</p>
            <Link href={more.href} className="home-more">
              {more.label}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <ul
          className="showcase-row"
          data-count={projects.length}
          data-size={compact ? "compact" : undefined}
        >
          {projects.map((p, i) => (
            <li key={p.id} className="showcase-card">
              <Link
                href={`/du-an/${p.slug}`}
                aria-label={`Xem chi tiết ${p.name}`}
              >
                <span className="showcase-photo">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    loading="lazy"
                    // After the banner: it is the page's main picture.
                    fetchPriority="low"
                    // As wide as drawn: 61% / 70% of a phone, never more
                    // than 345px from 761px up (measured 216–486 / 240–344).
                    sizes={
                      compact
                        ? "(max-width: 760px) 61vw, 345px"
                        : "(max-width: 760px) 70vw, 345px"
                    }
                  />
                </span>
                <span className="showcase-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="showcase-body">
                  <strong>{p.name}</strong>
                  <small>
                    <MapPin size={13} aria-hidden="true" />
                    {p.location}
                  </small>
                </span>
                <span className="showcase-open" aria-hidden="true">
                  <ArrowUpRight size={18} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
