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
import { planSpots } from "@/lib/floor-plan-spots";
import { loanFigures, paymentAmounts } from "@/lib/payment";
import type { RentalMedia } from "@/lib/property-media";
import { vndFull } from "@/lib/utils";
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
  floorNote: string;
  /** The model apartment's 3D picture, when there is one. */
  model3d: string;
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

/** "C4-06-T5" → "06": the unit's place on the floor plan. */
const planNumber = (code: string) => code.split("-")[1] ?? "";
/** "C4-06-T5" → "C4-06": the name visitors read. */
const shownCode = (code: string) => code.replace(/-T5$/, "");

/**
 * The floor plan with its units clickable: choosing one enlarges its layout
 * on the right and offers its model-unit page.
 */
function FloorPlanMap({ plan, units }: { plan: DeskPlan; units: DeskUnit[] }) {
  const t = useT();
  const { pick } = useContext(PickContext);
  const [chosen, setChosen] = useState<string | null>(null);
  // False while the enlarged unit slides away; `chosen` goes once it has.
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [show3d, setShow3d] = useState(false);
  const [seen, setSeen] = useState(plan.image);
  if (seen !== plan.image) {
    setSeen(plan.image);
    setChosen(null);
    setOpen(false);
  }
  const map = planSpots(plan.image);
  const floors = plan.name.split("· ")[1] ?? "";
  const unitAt = (spot: string) => {
    const here = units.filter((u) => planNumber(u.code) === spot);
    return here.find((u) => u.floorNote === floors) ?? here[0];
  };
  const choose = (spot: string) => {
    clearTimeout(closing.current);
    setChosen(spot);
    setOpen(true);
    setShow3d(false);
    pick(unitAt(spot) ?? null);
  };
  const close = () => {
    setOpen(false);
    closing.current = setTimeout(
      () => setChosen(null),
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450,
    );
  };
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
      <div className="plan-stage">
        <a
          href={plan.image}
          target="_blank"
          rel="noreferrer"
          className="plan-map"
          aria-label={t("Mở ảnh mặt bằng")}
        >
          {image}
        </a>
      </div>
    );
  const zoom = map.spots.find((spot) => spot.unit === chosen);
  const unit = chosen ? unitAt(chosen) : undefined;
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
              const here = unitAt(spot.unit);
              return (
                <button
                  key={spot.unit}
                  type="button"
                  className="plan-spot"
                  disabled={!here}
                  aria-pressed={open && chosen === spot.unit}
                  aria-label={t("Xem căn {unit}", {
                    unit: here ? shownCode(here.code) : spot.unit,
                  })}
                  style={{
                    left: `${spot.left}%`,
                    top: `${spot.top}%`,
                    width: `${spot.width}%`,
                    height: `${spot.height}%`,
                  }}
                  onClick={() => choose(spot.unit)}
                />
              );
            })}
          </div>
        </div>
        {zoom && (
          <div
            key={zoom.unit}
            className={`${open ? "plan-zoom" : "plan-zoom closing"}${unit?.model3d ? " with-model" : ""}`}
          >
            <button
              type="button"
              className="plan-zoom-close"
              aria-label={t("Đóng ảnh phóng to")}
              onClick={close}
            >
              <X size={16} aria-hidden="true" />
            </button>
            {unit?.model3d && (
              <div className="plan-zoom-switch" role="group">
                <button
                  type="button"
                  aria-pressed={!show3d}
                  onClick={() => setShow3d(false)}
                >
                  {t("Mặt bằng")}
                </button>
                <button
                  type="button"
                  aria-pressed={show3d}
                  onClick={() => setShow3d(true)}
                >
                  3D
                </button>
              </div>
            )}
            {show3d && unit?.model3d ? (
              <Image
                className="plan-zoom-model"
                src={unit.model3d}
                alt={t("Căn mẫu 3D {unit}", { unit: shownCode(unit.code) })}
                width={1600}
                height={1192}
                sizes="(max-width: 900px) 100vw, 500px"
              />
            ) : (
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
            )}
          </div>
        )}
      </div>
      <div className={open ? "plan-floors-fold open" : "plan-floors-fold"}>
        <div>
          {unit && (
            <div className="plan-floors" aria-live="polite">
              <div>
                <small>{shownCode(unit.code)}</small>
                <h4>
                  {unit.rooms} · {unit.area.toLocaleString("vi-VN")} m²
                </h4>
              </div>
              <nav aria-label={unit.name}>
                <Link href={`/mua-ban/${unit.slug}`} className="plan-open">
                  {t("Xem chi tiết căn mẫu")}
                </Link>
                <a href={call}>
                  <Phone size={15} aria-hidden="true" />
                  {t("Gọi tư vấn")}
                </a>
              </nav>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * One tower at a time: its floor plans with clickable units and its model
 * units. Prices are not shown here: visitors call for them.
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
  const [plan, setPlan] = useState(0);
  const current = tabs.find((x) => x.name === tower);
  const inTower = units
    .filter((u) => u.tower === tower)
    .sort((a, b) => a.code.localeCompare(b.code, "vi", { numeric: true }));
  const towerPlans = plans.filter((p) => p.tower === tower);
  const activePlan = towerPlans[plan] ?? towerPlans[0];
  return (
    <div className="unit-browser">
      {tabs.length > 0 && (
        <>
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
                  setPlan(0);
                }}
              >
                <b>{x.name}</b>
                <small>{x.status || t("Đang cập nhật")}</small>
              </button>
            ))}
          </div>
          <div className="tower-head">
            <h3>
              {t("Tòa {tower}", { tower })}
              {current?.note && <span> · {current.note}</span>}
            </h3>
          </div>
        </>
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
            <p>{t("Bấm vào một căn trên sơ đồ để xem layout")}</p>
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
      {!activePlan && tabs.length > 0 && (
        <div className="unit-picker-empty">
          <p>
            {t("Thông tin căn của tòa {tower} đang được cập nhật.", { tower })}
          </p>
          <a href={call} className="button button-primary">
            <Phone size={16} aria-hidden="true" />
            {t("Gọi tư vấn tòa này")}
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
                        {shownCode(u.code)}
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
