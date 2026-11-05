"use client";
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { ChevronDown, MessageCircle, Phone, X } from "lucide-react";
import Link from "@/components/page-navigation";
import { useT } from "@/i18n/client";
import { track } from "@/lib/analytics";
import type { PaymentStep } from "@/lib/api/types";
import { postPublic } from "@/lib/api/client";
import { companyHotline, telephoneHref, zaloHref } from "@/lib/company-contact";
import {
  planCoversFloor,
  planSpots,
  unitOnFloor,
} from "@/lib/floor-plan-spots";
import { loanFigures, paymentAmounts } from "@/lib/payment";
import type { RentalMedia } from "@/lib/property-media";
import { salePrice, vndFull } from "@/lib/utils";
import { RentalGallery } from "./rental-gallery";

export type DeskUnit = {
  id: string;
  slug: string;
  name: string;
  code: string;
  tower: string;
  floor: number;
  bedrooms: number;
  rooms: string;
  area: number;
  direction: string;
  view: string;
  quota: string;
  excludesFees: boolean;
  price: number | null;
  state: "available" | "reserved" | "sold";
};
export type DeskTower = { name: string; status: string; note: string };
export type DeskPlan = { name: string; tower: string; image: string };

/** The unit the visitor last chose: the calculator and the form follow it. */
const PickContext = createContext<{
  picked: DeskUnit | null;
  pick: (unit: DeskUnit | null) => void;
}>({ picked: null, pick: () => {} });

export function ProjectDesk({
  children,
  initial = null,
}: {
  children: ReactNode;
  /** The unit already chosen (a unit's own page). */
  initial?: DeskUnit | null;
}) {
  const [picked, pick] = useState<DeskUnit | null>(initial);
  const value = useMemo(() => ({ picked, pick }), [picked]);
  return <PickContext.Provider value={value}>{children}</PickContext.Provider>;
}

function useStateLabel() {
  const t = useT();
  return (state: DeskUnit["state"]) =>
    state === "available"
      ? t("Đang bán")
      : state === "reserved"
        ? t("Đang giữ chỗ")
        : t("Đã bán");
}
const call = telephoneHref(companyHotline) ?? "#dang-ky";

export function GalleryTabs({
  title,
  groups,
}: {
  title: string;
  groups: { label: string; media: RentalMedia[] }[];
}) {
  const [active, setActive] = useState(0);
  const group = groups[active];
  return (
    <>
      <div className="desk-tabs" role="group" aria-label={title}>
        {groups.map((g, i) => (
          <button
            key={g.label}
            type="button"
            aria-pressed={i === active}
            onClick={() => setActive(i)}
          >
            {g.label}
            <small>{g.media.length}</small>
          </button>
        ))}
      </div>
      <RentalGallery key={group.label} title={title} media={group.media} />
    </>
  );
}

/**
 * The floor plan with its units clickable: units on sale are marked; choosing
 * one lists its floors, each opening that unit.
 */
function FloorPlanMap({ plan, units }: { plan: DeskPlan; units: DeskUnit[] }) {
  const t = useT();
  const [chosen, setChosen] = useState<string | null>(null);
  // False while the enlarged unit slides away; `chosen` goes once it has.
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [seen, setSeen] = useState(plan.image);
  if (seen !== plan.image) {
    setSeen(plan.image);
    setChosen(null);
    setOpen(false);
  }
  const choose = (unit: string) => {
    clearTimeout(closing.current);
    setChosen(unit);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    closing.current = setTimeout(
      () => setChosen(null),
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450,
    );
  };
  const map = planSpots(plan.image);
  const onSale = units.filter(
    (u) => u.state !== "sold" && planCoversFloor(plan.name, u.floor),
  );
  const ofUnit = (unit: string) =>
    onSale
      .filter((u) => unitOnFloor(u.code, u.floor) === unit)
      .sort((a, b) => a.floor - b.floor);
  const image = (
    <Image
      src={plan.image}
      alt={plan.name}
      fill
      sizes="(max-width: 900px) 100vw, 1000px"
    />
  );
  if (!map)
    return (
      <a
        href={plan.image}
        target="_blank"
        rel="noreferrer"
        className="plan-map"
        aria-label={t("Mở ảnh mặt bằng")}
      >
        {image}
      </a>
    );
  const floors = chosen ? ofUnit(chosen) : [];
  const zoom = map.spots.find((spot) => spot.unit === chosen);
  return (
    <>
      <div
        className={open ? "plan-stage zoomed" : "plan-stage"}
        style={{ "--plan-ratio": map.ratio } as React.CSSProperties}
      >
        <div className="plan-scroll">
          <div className="plan-map" style={{ aspectRatio: map.ratio }}>
            {image}
            {map.spots.map((spot) => {
              const count = ofUnit(spot.unit).length;
              return (
                <button
                  key={spot.unit}
                  type="button"
                  className="plan-spot"
                  disabled={!count}
                  aria-pressed={open && chosen === spot.unit}
                  aria-label={
                    count
                      ? t("Căn {unit}, còn {n} căn", {
                          unit: spot.unit,
                          n: count,
                        })
                      : t("Căn {unit}, chưa có căn đang bán", {
                          unit: spot.unit,
                        })
                  }
                  style={{
                    left: `${spot.left}%`,
                    top: `${spot.top}%`,
                    width: `${spot.width}%`,
                    height: `${spot.height}%`,
                  }}
                  onClick={() => choose(spot.unit)}
                >
                  {count > 0 && <span>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
        {zoom && (
          <div
            key={zoom.unit}
            className={open ? "plan-zoom" : "plan-zoom closing"}
          >
            <button
              type="button"
              className="plan-zoom-close"
              aria-label={t("Đóng ảnh phóng to")}
              onClick={close}
            >
              <X size={16} aria-hidden="true" />
            </button>
            <div
              className="plan-zoom-view"
              style={
                {
                  aspectRatio: zoom.cropRatio,
                  "--ratio": zoom.cropRatio,
                } as React.CSSProperties
              }
            >
              <div
                style={{
                  width: `${(100 / zoom.crop.width) * 100}%`,
                  aspectRatio: map.ratio,
                  left: `${(-zoom.crop.left / zoom.crop.width) * 100}%`,
                  top: `${(-zoom.crop.top / zoom.crop.height) * 100}%`,
                }}
              >
                <Image
                  src={plan.image}
                  alt={t("Mặt bằng căn {unit}", { unit: zoom.unit })}
                  fill
                  sizes="1800px"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className={open ? "plan-floors-fold open" : "plan-floors-fold"}>
        <div>
          {chosen && floors.length > 0 && (
            <div className="plan-floors" aria-live="polite">
              <div>
                <small>{t("Căn {unit}", { unit: chosen })}</small>
                <h4>
                  {floors[0].rooms} · {floors[0].area.toLocaleString("vi-VN")}{" "}
                  m²
                </h4>
              </div>
              <nav aria-label={t("Chọn tầng")}>
                {floors.map((u) => (
                  <Link key={u.id} href={`/mua-ban/${u.slug}`}>
                    <b>{t("Tầng {n}", { n: u.floor })}</b>
                    <small>{u.price ? salePrice(u.price) : t("Liên hệ")}</small>
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const PRICES: [string, number, number][] = [
  ["Dưới 6 tỷ", 0, 6e9],
  ["6–8 tỷ", 6e9, 8e9],
  ["8–10 tỷ", 8e9, 10e9],
  ["Trên 10 tỷ", 10e9, Infinity],
];
const PAGE = 8;
const NO_FILTER = { floor: "", rooms: "", price: "", quota: "" };

/**
 * One list per tower: pick a tower, then narrow by floor, rooms or price. The
 * list opens with a few units and the floor plan stays folded, so a project
 * with hundreds of units still reads easily.
 */
export function UnitBrowser({
  towers,
  units,
  plans,
}: {
  towers: DeskTower[];
  units: DeskUnit[];
  plans: DeskPlan[];
}) {
  const t = useT();
  const stateLabel = useStateLabel();
  const { pick } = useContext(PickContext);
  // Units of a tower not listed in Admin still get a tab.
  const tabs = [
    ...towers,
    ...[...new Set(units.map((u) => u.tower))]
      .filter((name) => name && !towers.some((x) => x.name === name))
      .map((name) => ({ name, status: "", note: "" })),
  ];
  const count = (name: string) => units.filter((u) => u.tower === name).length;
  const [tower, setTower] = useState(
    tabs.find((x) => count(x.name) > 0)?.name ?? tabs[0]?.name ?? "",
  );
  const [filter, setFilter] = useState(NO_FILTER);
  const [limit, setLimit] = useState(PAGE);
  const [plan, setPlan] = useState(0);
  const current = tabs.find((x) => x.name === tower);
  const inTower = units.filter((u) => u.tower === tower);
  const towerPlans = plans.filter((p) => p.tower === tower);
  const activePlan = towerPlans[plan] ?? towerPlans[0];
  const priceRange = PRICES.find(([label]) => label === filter.price);
  const found = inTower
    .filter(
      (u) =>
        (!filter.floor || String(u.floor) === filter.floor) &&
        (!filter.rooms || u.rooms === filter.rooms) &&
        (!filter.quota || u.quota === filter.quota) &&
        (!priceRange ||
          (u.price !== null &&
            u.price >= priceRange[1] &&
            u.price < priceRange[2])),
    )
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  const lowest = inTower.flatMap((u) => u.price ?? []);
  const hasDirection = inTower.some((u) => u.direction);
  const hasView = inTower.some((u) => u.view);
  const filtered = Object.values(filter).some(Boolean);
  const select = (
    key: keyof typeof NO_FILTER,
    label: string,
    options: [value: string, text: string][],
  ) => (
    <label>
      {label}
      <select
        value={filter[key]}
        onChange={(e) => {
          setFilter({ ...filter, [key]: e.target.value });
          setLimit(PAGE);
        }}
      >
        <option value="">{t("Tất cả")}</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  const distinct = (values: string[]) =>
    [...new Set(values.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map((v): [string, string] => [v, v]);
  return (
    <div className="unit-browser">
      {tabs.length > 0 && (
        <div
          className="desk-tabs tower-tabs"
          role="group"
          aria-label={t("Chọn tòa")}
        >
          {tabs.map((x) => (
            <button
              key={x.name}
              type="button"
              aria-pressed={x.name === tower}
              onClick={() => {
                setTower(x.name);
                setFilter(NO_FILTER);
                setLimit(PAGE);
                setPlan(0);
              }}
            >
              <b>{x.name}</b>
              <small>
                {count(x.name)
                  ? t("{n} căn", { n: count(x.name) })
                  : x.status || t("Đang cập nhật")}
              </small>
            </button>
          ))}
        </div>
      )}
      {tabs.length > 0 && (
        <div className="tower-head">
          <div>
            <h3>
              {t("Tòa {tower}", { tower })}
              {current?.note && <span> · {current.note}</span>}
            </h3>
            {lowest.length > 0 && (
              <p>
                {t("{n} căn · Giá từ {price}", {
                  n: inTower.length,
                  price: salePrice(Math.min(...lowest)),
                })}
              </p>
            )}
          </div>
        </div>
      )}
      {activePlan && (
        <details className="tower-plan" open>
          <summary>
            <span>
              <small>{t("Sơ đồ mặt bằng")}</small>
              <b>{t("Tòa {tower}", { tower })}</b>
            </span>
            <ChevronDown size={20} aria-hidden="true" />
          </summary>
          <div className="tower-plan-bar">
            <p>{t("Bấm vào căn có số để xem layout và chọn tầng")}</p>
            {towerPlans.length > 1 && (
              <div className="unit-plan-switch">
                {towerPlans.map((p, i) => (
                  <button
                    key={p.image}
                    type="button"
                    aria-pressed={p === activePlan}
                    onClick={() => setPlan(i)}
                  >
                    {p.name.replace(/^Tòa \S+ · /, "")}
                  </button>
                ))}
              </div>
            )}
          </div>
          <FloorPlanMap plan={activePlan} units={inTower} />
        </details>
      )}
      {inTower.length || !tabs.length ? (
        <>
          <div className="price-filters">
            {select(
              "floor",
              t("Tầng"),
              [...new Set(inTower.map((u) => u.floor))]
                .filter(Boolean)
                .sort((a, b) => a - b)
                .map((f): [string, string] => [String(f), String(f)]),
            )}
            {select(
              "rooms",
              t("Phòng ngủ"),
              distinct(inTower.map((u) => u.rooms)),
            )}
            {select(
              "price",
              t("Mức giá"),
              PRICES.map(([label]) => [label, t(label)]),
            )}
            {inTower.some((u) => u.quota) &&
              select(
                "quota",
                t("Quỹ căn"),
                distinct(inTower.map((u) => u.quota)),
              )}
          </div>
          <div className="price-count" role="status">
            {t("{n} căn phù hợp", { n: found.length })}
            {filtered && (
              <button type="button" onClick={() => setFilter(NO_FILTER)}>
                {t("Xóa bộ lọc")}
              </button>
            )}
          </div>
          {found.length > 0 && (
            <div className="price-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t("Mã căn")}</th>
                    <th scope="col">{t("Tầng")}</th>
                    <th scope="col">{t("Phòng ngủ")}</th>
                    <th scope="col">{t("Diện tích")}</th>
                    {hasDirection && <th scope="col">{t("Hướng")}</th>}
                    {hasView && <th scope="col">View</th>}
                    <th scope="col">{t("Giá bán (đồng)")}</th>
                    <th scope="col">
                      <span className="sr-only">{t("Thao tác")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {found.slice(0, limit).map((u) => (
                    <tr key={u.id}>
                      <th scope="row">
                        <Link href={`/mua-ban/${u.slug}`}>{u.code}</Link>
                        {u.quota && (
                          <small className="unit-quota">{u.quota}</small>
                        )}
                        {u.state !== "available" && (
                          <span className={`state-pill ${u.state}`}>
                            {stateLabel(u.state)}
                          </span>
                        )}
                      </th>
                      <td data-label={t("Tầng")}>{u.floor || "–"}</td>
                      <td data-label={t("Phòng ngủ")}>{u.rooms}</td>
                      <td data-label={t("Diện tích")}>
                        {u.area.toLocaleString("vi-VN")} m²
                      </td>
                      {hasDirection && (
                        <td data-label={t("Hướng")}>{u.direction || "–"}</td>
                      )}
                      {hasView && <td data-label="View">{u.view || "–"}</td>}
                      <td data-label={t("Giá bán")} className="price-cell">
                        {u.price ? (
                          <>
                            {vndFull(u.price)}
                            <small>
                              {t("{n} triệu/m²", {
                                n: (u.price / u.area / 1e6).toLocaleString(
                                  "vi-VN",
                                  { maximumFractionDigits: 1 },
                                ),
                              })}
                            </small>
                            {u.excludesFees && (
                              <small className="price-excludes">
                                {t("Chưa gồm VAT, KPBT")}
                              </small>
                            )}
                          </>
                        ) : (
                          t("Liên hệ")
                        )}
                      </td>
                      <td className="price-action">
                        <a
                          href={call}
                          className="button button-outline"
                          onClick={() => pick(u)}
                        >
                          <Phone size={15} aria-hidden="true" />
                          {t("Gọi tư vấn")}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {found.length > limit && (
            <div className="load-more">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setLimit(limit + PAGE)}
              >
                {t("Xem thêm {n} căn", {
                  n: Math.min(PAGE, found.length - limit),
                })}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="unit-picker-empty">
          <p>
            {t("Danh sách căn của tòa {tower} đang được cập nhật.", { tower })}
          </p>
          <a href={call} className="button button-primary">
            <Phone size={16} aria-hidden="true" />
            {t("Gọi nhận danh sách căn")}
          </a>
        </div>
      )}
    </div>
  );
}

const grouped = (n: number) => (n ? n.toLocaleString("vi-VN") : "");

/** Payment steps worked out for a price, and a reducing-balance loan. */
export function PaymentPlanner({
  steps,
  startPrice,
}: {
  steps: PaymentStep[];
  startPrice: number;
}) {
  const t = useT();
  const { picked } = useContext(PickContext);
  const [price, setPrice] = useState(startPrice);
  const [seen, setSeen] = useState(picked);
  if (picked !== seen) {
    setSeen(picked);
    if (picked?.price) setPrice(picked.price);
  }
  const [share, setShare] = useState(70);
  const [rate, setRate] = useState("10");
  const [years, setYears] = useState(20);
  const amounts = price ? paymentAmounts(price, steps) : [];
  const loan = Math.round((price * share) / 100);
  const figures = loanFigures(loan, Number(rate.replace(",", ".")) || 0, years);
  const money = (n: number) => `${vndFull(Math.round(n))} ${t("đồng")}`;
  return (
    <div className="payment-planner">
      <label className="planner-price">
        {t("Giá căn hộ (đồng)")}
        <input
          inputMode="numeric"
          value={grouped(price)}
          placeholder="3.000.000.000"
          onChange={(e) =>
            setPrice(Number(e.target.value.replace(/\D/g, "")) || 0)
          }
        />
        {picked?.price === price && (
          <small>{t("Theo căn {code}", { code: picked.code })}</small>
        )}
      </label>
      <div className="planner-grid">
        {steps.length > 0 && (
          <div>
            <h3>{t("Các đợt thanh toán")}</h3>
            <div className="payment-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t("Đợt thanh toán")}</th>
                    <th scope="col">{t("Tỷ lệ")}</th>
                    <th scope="col">{t("Số tiền")}</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step, i) => (
                    <tr key={step.label}>
                      <th scope="row">
                        {step.label}
                        {step.timing && <small>{step.timing}</small>}
                      </th>
                      <td>{step.percent.toLocaleString("vi-VN")}%</td>
                      <td>{price ? vndFull(amounts[i]) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="loan-card">
          <h3>{t("Tính khoản vay ngân hàng")}</h3>
          <label>
            {t("Tỷ lệ vay: {n}%", { n: share })}
            <input
              type="range"
              min={0}
              max={80}
              step={5}
              value={share}
              onChange={(e) => setShare(Number(e.target.value))}
            />
          </label>
          <div className="loan-inputs">
            <label>
              {t("Lãi suất (%/năm)")}
              <input
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </label>
            <label>
              {t("Thời hạn vay")}
              <select
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
              >
                {[5, 10, 15, 20, 25, 30, 35].map((y) => (
                  <option key={y} value={y}>
                    {t("{n} năm", { n: y })}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <dl>
            <div>
              <dt>{t("Vốn tự có")}</dt>
              <dd>{money(price - loan)}</dd>
            </div>
            <div>
              <dt>{t("Số tiền vay")}</dt>
              <dd>{money(loan)}</dd>
            </div>
            <div className="loan-main">
              <dt>{t("Trả tháng đầu")}</dt>
              <dd>{money(figures.firstMonth)}</dd>
            </div>
            <div>
              <dt>{t("Tổng tiền lãi")}</dt>
              <dd>{money(figures.totalInterest)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="desk-note">
        {t(
          "Kết quả chỉ để tham khảo, tính theo dư nợ giảm dần với lãi suất bạn nhập. Lãi suất và hạn mức thực tế do ngân hàng quyết định.",
        )}
      </p>
    </div>
  );
}

/** The sign-up form: it carries the unit the visitor chose. */
export function ProjectLeadForm({
  units,
  projectSlug,
  projectName,
}: {
  units: DeskUnit[];
  projectSlug: string;
  projectName: string;
}) {
  const t = useT();
  const { picked, pick } = useContext(PickContext);
  const [openedAt] = useState(() => Date.now());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const call = telephoneHref(companyHotline);
  const zalo = zaloHref();

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    const phone = text("phone").replace(/[\s.()-]/g, "");
    if (text("name").length < 2) return setError(t("Vui lòng nhập họ tên."));
    if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phone))
      return setError(t("Nhập số di động Việt Nam hợp lệ."));
    if (!/^\S+@\S+\.\S+$/.test(text("email")))
      return setError(t("Email chưa đúng định dạng."));
    if (!data.get("consent"))
      return setError(t("Bạn cần đồng ý để Đất Vàng Group liên hệ lại."));
    setError("");
    setSending(true);
    const unit = picked;
    const result = await postPublic("/inquiries", {
      name: text("name"),
      phone,
      email: text("email"),
      message: [
        unit
          ? `Quan tâm căn ${unit.code}${unit.tower ? ` tòa ${unit.tower}` : ""} tại ${projectName}.`
          : `Muốn nhận bảng giá và mặt bằng tại ${projectName}.`,
        text("note") && `Ghi chú: ${text("note")}`,
      ]
        .filter(Boolean)
        .join("\n"),
      consent: true,
      intent: "Mua căn hộ",
      source: "Trang dự án",
      propertySlug: unit?.slug,
      projectSlug,
      website: text("website"),
      elapsedMs: Date.now() - openedAt,
    });
    setSending(false);
    if (result.ok) {
      setSent(true);
      track("generate_lead", { form: "buy", source: "Trang dự án" });
    } else {
      setError(
        result.code === "RATE_LIMITED"
          ? t("Bạn gửi hơi nhanh, vui lòng thử lại sau ít phút.")
          : t("Chưa gửi được yêu cầu, vui lòng thử lại hoặc gọi hotline."),
      );
    }
  }
  return (
    <div className="lead-panel">
      <div className="lead-panel-intro">
        <span className="signature-kicker">{t("ĐĂNG KÝ TƯ VẤN")}</span>
        <h2>{t("Nhận bảng giá và chọn căn cùng Đất Vàng")}</h2>
        <p>
          {t(
            "Để lại thông tin, tư vấn viên sẽ gửi bảng giá, mặt bằng và chính sách mới nhất.",
          )}
        </p>
        <div className="lead-panel-contacts">
          {call && (
            <a href={call}>
              <Phone size={18} aria-hidden="true" />
              {companyHotline}
            </a>
          )}
          {zalo && (
            <a href={zalo} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} aria-hidden="true" />
              Zalo
            </a>
          )}
        </div>
      </div>
      {sent ? (
        <div className="lead-sent" role="status">
          <h3>{t("Đã gửi yêu cầu tới Đất Vàng Group.")}</h3>
          <p>{t("Tư vấn viên sẽ liên hệ với bạn sớm.")}</p>
        </div>
      ) : (
        <form
          className="lead-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit(e.currentTarget);
          }}
        >
          <label>
            {t("Họ và tên")}
            <input name="name" autoComplete="name" maxLength={80} />
          </label>
          <label>
            {t("Số điện thoại")}
            <input name="phone" type="tel" autoComplete="tel" />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={120}
            />
          </label>
          <label>
            {t("Căn quan tâm")}
            <select
              value={picked?.id ?? ""}
              onChange={(e) =>
                pick(units.find((u) => u.id === e.target.value) ?? null)
              }
            >
              <option value="">{t("Chưa chọn căn")}</option>
              {[...new Set(units.map((u) => u.tower))].map((tower) => (
                <optgroup key={tower} label={tower || t("Căn hộ")}>
                  {units
                    .filter((u) => u.tower === tower)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.code}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="wide">
            {t("Ghi chú")}
            <textarea name="note" rows={3} maxLength={800} />
          </label>
          <input
            className="lead-trap"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <label className="lead-consent wide">
            <input name="consent" type="checkbox" />
            {t("Tôi đồng ý để Đất Vàng Group liên hệ tư vấn.")}
          </label>
          {error && (
            <p className="lead-error wide" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="button button-primary wide"
            disabled={sending}
          >
            {sending ? t("Đang gửi…") : t("Gửi yêu cầu tư vấn")}
          </button>
        </form>
      )}
    </div>
  );
}
