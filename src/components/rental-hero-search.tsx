"use client";
import { useEffect, useId, useRef, useState } from "react";
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
import { PriceRange } from "./price-range";
import { RENT_RANGE, type SearchFacet } from "@/lib/filter";
import { hasRooms, unitKind } from "@/lib/property-groups";
import { HeroKeyword } from "./hero-keyword";
import { HeroSelect } from "./hero-select";

export type HeroMode = "thue" | "mua" | "ky-gui";
type Options = [value: string, label: string][];

/** Loại hình; written here so the labels are listed for translation. */
const KINDS: Options = [
  ["", "Tất cả"],
  ["apartment", "Căn hộ"],
  ["shophouse", "Shophouse"],
  ["townhouse", "Nhà phố"],
  ["premises", "Mặt bằng"],
];
const BEDROOM_LABELS: Record<number, string> = {
  0: "Studio",
  1: "1 phòng ngủ",
  2: "2 phòng ngủ",
  3: "3 phòng ngủ",
  4: "4 phòng ngủ",
  5: "5 phòng ngủ",
};
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
  ["Sắp trống", "Sắp trống"],
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
  saleRange = [0, 20],
  facets,
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
  /** Sale slider bounds in tỷ, from the units for sale. */
  saleRange?: [number, number];
  /** The units searched: only choices they can match are offered. */
  facets: SearchFacet[];
}) {
  const t = useT();
  const id = useId();
  const navigate = usePageNavigation();
  const form = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<HeroMode>(initialMode);
  const [more, setMore] = useState(() => MORE.some((k) => !!values[k]));
  // Loại hình: Căn hộ / Nhà phố / Mặt bằng ("" = all).
  const [kind, setKind] = useState(values.loai ?? "");
  const tabs: { key: HeroMode; label: string; icon: typeof KeyRound }[] = [
    { key: "thue", label: "Thuê", icon: KeyRound },
    { key: "mua", label: "Mua", icon: HandCoins },
    { key: "ky-gui", label: "Ký gửi", icon: Building2 },
  ];
  const target = projectSlug
    ? { projectSlug, label: projectName ?? projectSlug }
    : {};
  // Only what this search can find: units of this mode, then of this kind.
  const listed = facets.filter((f) => (mode === "mua" ? f.sale : f.rent));
  const ofKind = (group: string) =>
    listed.filter((f) => !group || unitKind(f) === group);
  const matching = ofKind(kind);
  const bedrooms: Options = [
    ...new Set([
      ...matching.filter((f) => hasRooms(f)).map((f) => f.bedrooms),
      ...(values.bedrooms ? [Number(values.bedrooms)] : []),
    ]),
  ]
    .sort((a, b) => a - b)
    .map((n) => [String(n), BEDROOM_LABELS[n] ?? `${n} phòng ngủ`]);
  const kindProjects = projects.filter(
    ([slug]) =>
      slug === values.project || matching.some((f) => f.project === slug),
  );

  function search(box: HTMLFormElement, stay = false) {
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(box))
      if (typeof value === "string" && value.trim())
        query.set(key, value.trim());
    const url = `${action}${query.size ? `?${query}` : ""}`;
    // "stay": the results below refresh where the visitor is looking.
    if (stay) navigate?.(url, false, false, true);
    else navigate?.(`${url}#can-ho`);
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    if (!navigate) return; // native GET submit
    event.preventDefault();
    search(event.currentTarget);
  }
  /** A suggested word; its input has not re-rendered with it yet. */
  function pick(word: string) {
    const box = form.current;
    if (!box) return;
    (box.elements.namedItem("q") as HTMLInputElement).value = word;
    search(box);
  }
  // The Back button changes the URL: the tabs and kind buttons follow it.
  const urlKind = values.loai ?? "";
  const urlMode: HeroMode = ["mua", "mua-ban"].includes(values["nhu-cau"] ?? "")
    ? "mua"
    : values["nhu-cau"] === "ky-gui"
      ? "ky-gui"
      : "thue";
  const [seen, setSeen] = useState({ kind: urlKind, mode: urlMode });
  if (seen.kind !== urlKind || seen.mode !== urlMode) {
    setSeen({ kind: urlKind, mode: urlMode });
    setKind(urlKind);
    setMode(urlMode);
  }
  // Clicking a kind or Thuê / Mua loads its results, once the fields have
  // followed it. "Ký gửi" is a request form: nothing to load.
  useEffect(() => {
    if (mode === "ky-gui" || !form.current) return;
    if (kind !== urlKind || mode !== urlMode) search(form.current, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, mode]);

  const field = (
    name: string,
    label: string,
    options: Options,
    placeholder: string,
  ) => (
    <div className="hero-field">
      <label htmlFor={`${id}-${name}`}>{t(label)}</label>
      <HeroSelect
        id={`${id}-${name}`}
        name={name}
        defaultValue={values[name] ?? ""}
        placeholder={t(placeholder)}
        options={options.map(([value, text]) => [value, t(text)])}
      />
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
            onClick={() => {
              setMode(tab.key);
              // A kind this tab has no units of would only list nothing.
              const sale = tab.key === "mua";
              if (
                tab.key !== "ky-gui" &&
                !facets.some(
                  (f) =>
                    (sale ? f.sale : f.rent) && (!kind || unitKind(f) === kind),
                )
              )
                setKind("");
            }}
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
            ref={form}
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
            <div className="hero-form-top">
              <fieldset className="hero-kinds">
                <legend className="sr-only">{t("Loại hình")}</legend>
                {KINDS.map(([value, label]) => {
                  return (
                    <label key={value}>
                      <input
                        type="radio"
                        name="loai"
                        value={value}
                        aria-label={t(label)}
                        checked={kind === value}
                        disabled={!ofKind(value).length && kind !== value}
                        onChange={() => setKind(value)}
                      />
                      <span>{t(label)}</span>
                    </label>
                  );
                })}
              </fieldset>
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
            </div>
            <div className="hero-bar">
              <HeroKeyword
                units={matching}
                defaultValue={values.q}
                onPick={pick}
              />
              {!projectSlug &&
                field("project", "Dự án", kindProjects, "Tất cả dự án")}
              {bedrooms.length > 0 &&
                field("bedrooms", "Phòng ngủ", bedrooms, "Tất cả")}
              {mode === "mua" ? (
                <PriceRange
                  label="Giá bán"
                  amountText="{n} tỷ"
                  bounds={saleRange}
                  step={saleRange[1] - saleRange[0] > 5 ? 0.5 : 0.1}
                  names={["gia-ban-tu", "gia-ban"]}
                  values={values}
                />
              ) : (
                <PriceRange
                  label="Giá thuê / tháng"
                  amountText="{n} triệu"
                  bounds={RENT_RANGE}
                  step={1}
                  names={["gia-tu", "price"]}
                  values={values}
                  openEnded
                />
              )}
              <button type="submit" className="hero-submit">
                <Search size={18} aria-hidden="true" />
                {t("Tìm kiếm")}
              </button>
            </div>
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
