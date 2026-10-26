"use client";
import { useId, useState } from "react";
import {
  ArrowRight,
  Building2,
  HandCoins,
  KeyRound,
  MessageCircle,
  Phone,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useT } from "@/i18n/client";
import { usePageNavigation } from "./page-navigation";
import { InquiryDialog } from "./rental-inquiry";

export type HeroMode = "thue" | "mua" | "ky-gui";
type Options = [value: string, label: string][];

const BEDROOMS: Options = [
  ["0", "Studio"],
  ["1", "1 phòng ngủ"],
  ["2", "2 phòng ngủ"],
  ["3", "3 phòng ngủ"],
];
const RENT_BUDGET: Options = [
  ["10", "Đến 10 triệu"],
  ["15", "Đến 15 triệu"],
  ["20", "Đến 20 triệu"],
  ["30", "Đến 30 triệu"],
];
const SALE_BUDGET: Options = [
  ["2", "Đến 2 tỷ"],
  ["3", "Đến 3 tỷ"],
  ["5", "Đến 5 tỷ"],
  ["8", "Đến 8 tỷ"],
  ["12", "Đến 12 tỷ"],
];
const AREA: Options = [
  ["40", "Từ 40 m²"],
  ["60", "Từ 60 m²"],
  ["90", "Từ 90 m²"],
];
const FURNITURE: Options = [
  ["Đầy đủ nội thất", "Đầy đủ nội thất"],
  ["Nội thất cơ bản", "Nội thất cơ bản"],
];
const STATUS: Options = [
  ["Còn trống", "Còn trống"],
  ["Đã cho thuê", "Đã cho thuê"],
];
const SORT: Options = [
  ["price-asc", "Giá tăng dần"],
  ["price-desc", "Giá giảm dần"],
  ["area", "Diện tích lớn nhất"],
];
/** Filters behind "Bộ lọc chi tiết" (opened when one is in use). */
const MORE = ["location", "area", "furniture", "status", "sort"];

/**
 * The search box over the full-screen photo: rent or buy (results open in the
 * list below, from the database), or consign a unit (a short request form).
 * Also a plain GET form, so it works before JavaScript loads.
 */
export function RentalHeroSearch({
  action,
  mode: initialMode,
  values,
  projects,
  locations = [],
  projectSlug,
  projectName,
  hotline,
  callHref,
}: {
  action: string;
  mode: HeroMode;
  values: Record<string, string | undefined>;
  /** [slug, name] of projects with units, for the "Dự án" select. */
  projects: Options;
  /** Districts with units ("Khu vực" filter). */
  locations?: string[];
  /** On a project page the project is fixed. */
  projectSlug?: string;
  projectName?: string;
  hotline: string;
  callHref: string;
}) {
  const t = useT();
  const id = useId();
  const navigate = usePageNavigation();
  const [mode, setMode] = useState<HeroMode>(initialMode);
  const [more, setMore] = useState(() => MORE.some((k) => !!values[k]));
  const tabs: { key: HeroMode; label: string; icon: typeof KeyRound }[] = [
    { key: "thue", label: "Thuê", icon: KeyRound },
    { key: "mua", label: "Mua", icon: HandCoins },
    { key: "ky-gui", label: "Ký gửi", icon: Building2 },
  ];
  const target = projectSlug
    ? { projectSlug, label: projectName ?? projectSlug }
    : {};

  function submit(event: React.FormEvent<HTMLFormElement>) {
    if (!navigate) return; // native GET submit
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const [key, value] of data)
      if (typeof value === "string" && value.trim())
        query.set(key, value.trim());
    navigate(`${action}${query.size ? `?${query}` : ""}#can-ho`);
  }

  const field = (
    name: string,
    label: string,
    options: Options,
    placeholder: string,
  ) => (
    <div className="hero-field">
      <label htmlFor={`${id}-${name}`}>{t(label)}</label>
      <select
        id={`${id}-${name}`}
        name={name}
        defaultValue={values[name] ?? ""}
      >
        <option value="">{t(placeholder)}</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {t(text)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="hero-search">
      <div className="hero-tabs" role="tablist" aria-label={t("Nhu cầu")}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`${id}-${tab.key}`}
            aria-selected={mode === tab.key}
            aria-controls={`${id}-panel`}
            onClick={() => setMode(tab.key)}
          >
            <tab.icon size={16} aria-hidden="true" />
            {t(tab.label)}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${mode}`}
        className="hero-panel"
      >
        {mode === "ky-gui" ? (
          <div className="hero-consign" key="ky-gui">
            <div>
              <strong>{t("Bạn có căn hộ cần cho thuê hoặc bán?")}</strong>
              <p>
                {t(
                  "Gửi thông tin căn hộ, Đất Vàng Group khảo sát, định giá và tìm khách phù hợp cho bạn.",
                )}
              </p>
            </div>
            <InquiryDialog
              mode="consign"
              target={target}
              trigger={
                <button type="button" className="hero-submit">
                  {t("Gửi thông tin ký gửi")}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              }
            />
          </div>
        ) : (
          <form
            key={mode}
            className="hero-form"
            action={action}
            method="get"
            role="search"
            onSubmit={submit}
          >
            {mode === "mua" && (
              <input type="hidden" name="nhu-cau" value="mua" />
            )}
            <div className="hero-field hero-field-wide">
              <label htmlFor={`${id}-q`}>{t("Từ khóa")}</label>
              <span className="hero-input">
                <Search size={17} aria-hidden="true" />
                <input
                  id={`${id}-q`}
                  name="q"
                  defaultValue={values.q}
                  maxLength={100}
                  placeholder={t("Tên căn, mã căn, dự án…")}
                />
              </span>
            </div>
            {!projectSlug &&
              field("project", "Dự án", projects, "Tất cả dự án")}
            {field("bedrooms", "Phòng ngủ", BEDROOMS, "Mọi loại")}
            {mode === "mua"
              ? field("gia-ban", "Giá bán", SALE_BUDGET, "Mọi mức giá")
              : field("price", "Giá thuê / tháng", RENT_BUDGET, "Mọi mức giá")}
            <button type="submit" className="hero-submit">
              <Search size={18} aria-hidden="true" />
              {t(mode === "mua" ? "Tìm căn bán" : "Tìm căn thuê")}
            </button>
            <button
              type="button"
              className="hero-more-toggle"
              aria-expanded={more}
              aria-controls={`${id}-more`}
              onClick={() => setMore((v) => !v)}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              {t("Bộ lọc chi tiết")}
              <span aria-hidden="true">{more ? "−" : "+"}</span>
            </button>
            <div id={`${id}-more`} className="hero-more" hidden={!more}>
              {locations.length > 1 &&
                field(
                  "location",
                  "Khu vực",
                  locations.map((x) => [x, x]),
                  "Mọi khu vực",
                )}
              {field("area", "Diện tích", AREA, "Mọi diện tích")}
              {field("furniture", "Nội thất", FURNITURE, "Tất cả")}
              {mode === "thue" &&
                field("status", "Tình trạng", STATUS, "Tất cả")}
              {field("sort", "Sắp xếp", SORT, "Mới đăng trước")}
            </div>
            {values.view && (
              <input type="hidden" name="view" value={values.view} />
            )}
          </form>
        )}
      </div>
      <div className="hero-contact">
        <InquiryDialog
          mode="advice"
          target={target}
          trigger={
            <button type="button">
              <MessageCircle size={16} aria-hidden="true" />
              {t("Tư vấn chọn căn")}
            </button>
          }
        />
        <a href={callHref}>
          <Phone size={16} aria-hidden="true" />
          {t("Gọi")} <strong>{hotline}</strong>
        </a>
      </div>
    </div>
  );
}
