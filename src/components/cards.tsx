import Image from "next/image";
import Link from "@/components/page-navigation";
import { ArrowUpRight, MapPin, BedDouble, Expand, Bath } from "lucide-react";
import type { Project, Property, Post } from "@/types";
import { projects } from "@/data";
import { money } from "@/lib/utils";
import { Favorite } from "./interactive";
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
          alt={`Kiến trúc minh họa ${project.name}`}
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
        <span>DỮ LIỆU DEMO</span>
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
export function PropertyCard({
  property,
  priority = false,
}: {
  property: Property;
  priority?: boolean;
}) {
  return (
    <article className="property-card">
      <div className="image-wrap">
        <Link href={`/cho-thue/${property.slug}`}>
          <Image
            src={property.image}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            alt={`Nội thất minh họa ${property.name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </Link>
        <span
          className={`image-badge ${property.status === "Còn trống" ? "available" : ""}`}
        >
          {property.status}
        </span>
        <Favorite id={property.id} />
      </div>
      <div className="property-body">
        <div className="card-meta">
          <span>{projects.find((p) => p.id === property.projectId)?.name}</span>
          <span>DEMO</span>
        </div>
        <h3>
          <Link href={`/cho-thue/${property.slug}`}>{property.name}</Link>
        </h3>
        <p className="location">
          <MapPin size={14} />
          {property.location}
        </p>
        <div className="property-specs">
          <span>
            <Expand size={16} />
            {property.area} m²
          </span>
          <span>
            <BedDouble size={16} />
            {property.bedrooms || "Studio"}
            {property.bedrooms > 0 ? " PN" : ""}
          </span>
          <span>
            <Bath size={16} />
            {property.bathrooms} WC
          </span>
        </div>
        <div className="property-bottom">
          <p>
            <strong>{money(property.price)} triệu</strong>
            <span> / tháng</span>
          </p>
          <Link
            href={`/cho-thue/${property.slug}`}
            aria-label={`Xem ${property.name}`}
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function BlogCard({ post }: { post: Post }) {
  return (
    <article className="blog-card">
      <Link className="image-wrap" href={`/blog/${post.slug}`}>
        <Image
          src={post.image}
          alt={`Không gian minh họa: ${post.name}`}
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
