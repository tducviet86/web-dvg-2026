/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import Link from "@/components/page-navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Expand,
  MapPin,
} from "lucide-react";
import type { Property } from "@/types";
import { vndFull } from "@/lib/utils";
import { LuxuryBadges } from "./cards";

/** Editor badges first, then units many visitors look at. */
const BADGE_RANK: Record<string, number> = {
  hot: 4,
  exclusive: 3,
  rare: 2,
  "good-price": 1,
};
export const rentalScore = (p: Property) =>
  (p.status === "Còn trống" ? 10 : 0) +
  (BADGE_RANK[p.highlight ?? ""] ?? 0) +
  (p.trending ? 2 : 0);

/**
 * The few rental units worth a look right now: available ones with a badge
 * first, then the newest (the API already lists them newest first).
 */
export function pickFeaturedRentals(units: Property[], count = 4) {
  return units
    .filter((p) => p.forRent !== false && !p.isDemo)
    .map((p, order) => ({ p, order }))
    .sort((a, b) => rentalScore(b.p) - rentalScore(a.p) || a.order - b.order)
    .slice(0, count)
    .map(({ p }) => p);
}

/**
 * Home: "Căn hộ cho thuê tiêu biểu", a row of compact unit cards (photo,
 * name, key facts, rent; a sideways row on phones). Every card opens the
 * unit page.
 */
export function HomeRentals({ units }: { units: Property[] }) {
  if (!units.length) return null;
  return (
    <section
      id="can-ho-tieu-bieu"
      className="home-rentals"
      aria-label="Căn hộ cho thuê tiêu biểu"
    >
      <div className="container">
        <div className="home-head">
          <div>
            <span className="home-kicker">CĂN HỘ CHO THUÊ TIÊU BIỂU</span>
          </div>
          <div className="home-head-aside">
            <p>
              Những căn đang được quan tâm nhiều nhất, ảnh thật và giá thuê rõ
              ràng.
            </p>
            <Link href="/cho-thue" className="home-more">
              Xem tất cả căn cho thuê
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <ul className="rent-mini-row">
          {units.map((unit) => (
            <RentalMini key={unit.id} unit={unit} />
          ))}
        </ul>
      </div>
    </section>
  );
}

export function RentalMini({ unit }: { unit: Property }) {
  return (
    <li className="rent-mini">
      <Link href={`/cho-thue/${unit.slug}`} aria-label={`Xem căn ${unit.name}`}>
        <span className="rent-mini-photo">
          <Image
            src={unit.image}
            alt=""
            fill
            sizes="(max-width: 760px) 70vw, (max-width: 1080px) 45vw, 22vw"
          />
          <LuxuryBadges property={unit} />
          {unit.status === "Còn trống" && (
            <span className="rent-mini-status">Còn trống</span>
          )}
        </span>
        <span className="rent-mini-body">
          <small>
            <MapPin size={12} aria-hidden="true" />
            {unit.projectName || unit.location}
          </small>
          <strong>{unit.name}</strong>
          <span className="rent-mini-specs">
            <span>
              <Expand size={13} aria-hidden="true" />
              {unit.area} m²
            </span>
            <span>
              <BedDouble size={13} aria-hidden="true" />
              {unit.bedrooms > 0 ? `${unit.bedrooms} PN` : "Studio"}
            </span>
          </span>
          <span className="rent-mini-foot">
            <span className="rent-mini-price">
              <b>{vndFull(unit.rentVnd ?? Math.round(unit.price * 1e6))} vnđ</b>{" "}
              / tháng
            </span>
            <span className="rent-mini-open" aria-hidden="true">
              <ArrowUpRight size={16} />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
