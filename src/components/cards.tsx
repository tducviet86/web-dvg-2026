/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import Link from "@/components/page-navigation";
import {
  ArrowUpRight,
  MapPin,
  BedDouble,
  Expand,
  Bath,
  Sofa,
  Layers,
  Camera,
  PlayCircle,
  Store,
} from "lucide-react";
import type { Project, Property, Post } from "@/types";
import { salePrice, unitRef, vndFull } from "@/lib/utils";
import { propertyMedia } from "@/lib/property-media";
import { unitBadges } from "@/lib/highlights";
import {
  floorLabel,
  hasRooms,
  roomsLabel,
  typeTag,
} from "@/lib/property-groups";
import { Favorite } from "./client-basics";
export function SectionHeading({
  eyebrow,
  title,
  emphasis,
  href,
  link = "Khám phá tất cả",
}: {
  eyebrow: string;
  title: string;
  emphasis?: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>
          {title}
          {emphasis && (
            <>
              <br />
              <em>{emphasis}</em>
            </>
          )}
        </h2>
      </div>
      {href && (
        <Link className="text-link" href={href}>
          {link}
          <ArrowUpRight size={18} />
        </Link>
      )}
    </div>
  );
}
export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="project-card">
      <Link href={`/du-an/${project.slug}`} className="image-wrap">
        <Image
          src={project.image}
          alt={`Dự án ${project.name}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <span className="image-badge">{project.status}</span>
        <span className="round-arrow">
          <ArrowUpRight size={21} />
        </span>
      </Link>
      <div className="card-meta">
        <span>{project.type}</span>
        <span>{project.location}</span>
      </div>
      <h3>
        <Link href={`/du-an/${project.slug}`}>{project.name}</Link>
      </h3>
      <p className="location">
        <MapPin size={14} />
        {project.location}
      </p>
      <p className="project-summary">{project.description}</p>
    </article>
  );
}
/** Editor badge and "Đang được quan tâm", gold on deep green. */
export function LuxuryBadges({
  property,
  className = "",
}: {
  property: Property;
  className?: string;
}) {
  const badges = unitBadges(property);
  if (!badges.length) return null;
  return (
    <span className={`lux-badges ${className}`}>
      {badges.map((b) => (
        <span key={b.key} className={`lux-badge lux-${b.key}`}>
          <span aria-hidden="true">✦</span>
          {b.label}
        </span>
      ))}
    </span>
  );
}

export function PropertyCard({
  property,
  priority = false,
  index = 0,
}: {
  property: Property;
  priority?: boolean;
  /** Position in the grid, used to stagger the entrance animation. */
  index?: number;
}) {
  const media = propertyMedia(property);
  const detail = `/cho-thue/${property.slug}`;
  const photos = media.filter((m) => m.type === "image").length;
  const videos = media.length - photos;
  return (
    <article
      className="property-card"
      style={{ "--i": index % 9 } as React.CSSProperties}
    >
      <div className="image-wrap">
        <Link href={detail}>
          <Image
            src={property.image}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            alt={
              property.imageAlt ||
              `${property.isDemo ? "Nội thất minh họa" : "Nội thất căn hộ"} ${property.name}`
            }
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </Link>
        <span className="card-tags">
          <span
            className={`image-badge ${property.status === "Còn trống" ? "available" : ""}`}
          >
            {property.status}
          </span>
          {typeTag(property) && (
            <span className="card-type-tag">{typeTag(property)}</span>
          )}
        </span>
        <LuxuryBadges property={property} />
        <Favorite id={property.id} />
        <span className="card-media-count">
          <span>
            <Camera size={13} aria-hidden="true" />
            {photos}
            <span className="sr-only"> ảnh</span>
          </span>
          {videos > 0 && (
            <span>
              <PlayCircle size={13} aria-hidden="true" />
              {videos}
              <span className="sr-only"> video</span>
            </span>
          )}
        </span>
      </div>
      <div className="property-body">
        <div className="card-meta">
          <span>{property.projectName}</span>
          <span>{property.isDemo ? "CĂN MẪU" : unitRef(property)}</span>
        </div>
        <h3>
          <Link href={detail}>{property.name}</Link>
        </h3>
        {/* Shown on hover / focus (always on touch screens). */}
        <div className="property-reveal">
          <div>
            <p className="location">
              <MapPin size={14} aria-hidden="true" />
              {property.location}
            </p>
            <div className="property-specs">
              <span>
                <Expand size={16} aria-hidden="true" />
                <b>{property.area} m²</b>
              </span>
              {hasRooms(property) ? (
                <>
                  <span>
                    <BedDouble size={16} aria-hidden="true" />
                    <b>{roomsLabel(property)}</b>
                  </span>
                  <span>
                    <Bath size={16} aria-hidden="true" />
                    <b>{property.bathrooms} WC</b>
                  </span>
                </>
              ) : (
                <span>
                  <Store size={16} aria-hidden="true" />
                  <b>{property.type}</b>
                </span>
              )}
              {floorLabel(property) && (
                <span>
                  <Layers size={16} aria-hidden="true" />
                  <b>{floorLabel(property)}</b>
                </span>
              )}
            </div>
            <p className="property-furniture">
              <Sofa size={14} aria-hidden="true" />
              {property.furniture}
            </p>
          </div>
        </div>
        <div className="property-bottom">
          <p>
            <small>Giá thuê</small>
            <strong>
              {vndFull(property.rentVnd ?? Math.round(property.price * 1e6))}{" "}
              vnđ
            </strong>
            <span> / tháng</span>
          </p>
          <Link href={detail} aria-label={`Xem ${property.name}`}>
            <span className="property-detail-label">Xem căn</span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
/** A unit offered for sale: photo-led card that opens /mua-ban/<slug>. */
export function SaleCard({ property: p }: { property: Property }) {
  return (
    <article className="sale-card">
      <Link
        href={`/mua-ban/${p.slug}`}
        className="sale-card-link"
        aria-label={`Xem căn bán ${p.name}`}
      >
        <span className="sale-card-photo image-wrap">
          <Image
            src={p.image}
            alt={p.imageAlt || `Căn hộ ${p.name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </span>
        <span className="sale-card-badge">
          Đang bán{typeTag(p) ? ` · ${typeTag(p)}` : ""}
        </span>
        <span className="sale-card-open" aria-hidden="true">
          <ArrowUpRight size={20} />
        </span>
        <span className="sale-card-body">
          <span className="sale-card-project">{p.projectName}</span>
          <h3 className="sale-card-name">{p.name}</h3>
          <span className="sale-card-meta">
            <span className="sale-card-price">
              {p.saleVnd ? salePrice(p.saleVnd) : "Liên hệ"}
            </span>
            <span className="sale-card-specs">
              {[
                `${p.area} m²`,
                hasRooms(p) ? roomsLabel(p) : p.type,
                floorLabel(p),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        </span>
      </Link>
    </article>
  );
}
export function BlogCard({ post }: { post: Post }) {
  return (
    <article className="blog-card">
      <Link className="image-wrap" href={`/blog/${post.slug}`}>
        <Image
          src={post.image}
          alt={post.name}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
        />
      </Link>
      <div className="card-meta">
        <Link href={`/blog/danh-muc/${post.categorySlug}`}>
          {post.category}
        </Link>
        <span>{post.readingTime} PHÚT ĐỌC</span>
      </div>
      <h3>
        <Link href={`/blog/${post.slug}`}>{post.name}</Link>
      </h3>
      <p>{post.description}</p>
      <Link className="text-link" href={`/blog/${post.slug}`}>
        Đọc câu chuyện
        <ArrowUpRight size={16} />
      </Link>
    </article>
  );
}
