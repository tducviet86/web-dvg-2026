"use client";
import Image from "next/image";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { ArrowUpRight, BedDouble, Expand, MapPin } from "lucide-react";
import Link from "@/components/page-navigation";
import { useT } from "@/i18n/client";
import { writeStore } from "@/lib/storage";

/** What a "Căn hộ vừa xem" card needs, saved when a unit page opens. */
export type RecentUnit = {
  slug: string;
  name: string;
  image: string;
  project: string;
  area: number;
  bedrooms: number;
  /** Rent already formatted ("25.000.000"). */
  rent: string;
};

const KEY = "recent-rentals";
const KEEP = 12;

function subscribe(onChange: () => void) {
  window.addEventListener("dvg-storage", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("dvg-storage", onChange);
    window.removeEventListener("storage", onChange);
  };
}
function readRaw() {
  try {
    return localStorage.getItem(`dvg:${KEY}`) ?? "[]";
  } catch {
    return "[]";
  }
}
/** The saved units other than `exclude`, ignoring anything malformed. */
function parse(raw: string, exclude: string): RecentUnit[] {
  try {
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list)
      ? list.filter(
          (u): u is RecentUnit =>
            !!u &&
            typeof u.slug === "string" &&
            typeof u.name === "string" &&
            u.slug !== exclude,
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * Remembers this unit in the visitor's browser and lists the other units
 * seen lately, newest first, as a sideways row of small cards.
 */
export function RecentUnits({ current }: { current: RecentUnit }) {
  const t = useT();
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const units = useMemo(
    () => parse(raw, current.slug).slice(0, 8),
    [raw, current.slug],
  );
  useEffect(() => {
    const seen = parse(readRaw(), current.slug);
    // Quietly: a full storage must not interrupt the visitor.
    try {
      localStorage.setItem(
        `dvg:${KEY}`,
        JSON.stringify([current, ...seen].slice(0, KEEP)),
      );
    } catch {
      /* storage blocked */
    }
  }, [current]);
  if (!units.length) return null;
  return (
    <section className="room-more room-recent" aria-labelledby="room-recent">
      <div className="room-more-head">
        <div>
          <span className="signature-kicker">{t("LỊCH SỬ XEM")}</span>
          <h2 id="room-recent">{t("Căn hộ bạn vừa xem")}</h2>
        </div>
        <button
          type="button"
          className="room-recent-clear"
          onClick={() => {
            writeStore(KEY, [current]);
          }}
        >
          {t("Xóa lịch sử")}
        </button>
      </div>
      <ul className="room-strip">
        {units.map((u) => (
          <li key={u.slug} className="rent-mini">
            <Link
              href={`/cho-thue/${u.slug}`}
              aria-label={t("Xem căn {name}", { name: u.name })}
            >
              <span className="rent-mini-photo">
                {u.image && <Image src={u.image} alt="" fill sizes="260px" />}
              </span>
              <span className="rent-mini-body">
                <small>
                  <MapPin size={12} aria-hidden="true" />
                  {u.project}
                </small>
                <strong>{u.name}</strong>
                <span className="rent-mini-specs">
                  <span>
                    <Expand size={13} aria-hidden="true" />
                    {u.area} m²
                  </span>
                  <span>
                    <BedDouble size={13} aria-hidden="true" />
                    {u.bedrooms > 0 ? `${u.bedrooms} PN` : "Studio"}
                  </span>
                </span>
                <span className="rent-mini-foot">
                  <span className="rent-mini-price">
                    <b>{u.rent} vnđ</b> {t("/ tháng")}
                  </span>
                  <span className="rent-mini-open" aria-hidden="true">
                    <ArrowUpRight size={16} />
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
