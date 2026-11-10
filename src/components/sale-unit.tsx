/** @jsxImportSource @/i18n/jsx */
import { towerHandover } from "@/lib/handover";
import Image from "next/image";
import { ArrowUpRight, MapPin, MessageCircle } from "lucide-react";
import Link from "@/components/page-navigation";
import type { ApiProject } from "@/lib/api/types";
import { zaloHref } from "@/lib/company-contact";
import { planSpots } from "@/lib/floor-plan-spots";
import { roomsLabel, hasRooms } from "@/lib/property-groups";
import { salePrice, unitRef, vndFull } from "@/lib/utils";
import { CallContact, WhatsAppContact } from "./call-contact";
import { Favorite } from "./client-basics";
import { RichText } from "./rich-text";
import { PlanCutout, planArea } from "./plan-cutout";
import { PaymentTable, toDeskUnit } from "./project-sale";
import { ProjectDesk, ProjectLeadForm } from "./project-sale-desk";
import { ProjectMap } from "./project-map";
import type { MapBuilding } from "./rental-map";
import { ShareButton } from "./rental-inquiry";
import type { ProjectLocation, Property } from "@/types";

/** The plan of a unit's floors, and the unit's place on it. */
export function unitLayout(r: Property, api?: ApiProject) {
  const number = r.unitCode?.split("-")[1];
  const onPlan = (api?.floorPlans ?? []).filter(
    (plan) =>
      r.tower &&
      plan.tower === r.tower &&
      planSpots(plan.image)?.spots.some((spot) => spot.unit === number),
  );
  const plan =
    onPlan.find((p) => r.floorNote && p.name.endsWith(r.floorNote)) ??
    onPlan[0];
  const map = plan && planSpots(plan.image);
  const spot = map?.spots.find((x) => x.unit === number);
  return plan && map && spot ? { plan, ratio: map.ratio, spot } : null;
}

/** The unit cut out of the floor plan, with its areas below. */
export function UnitLayoutCrop({
  layout: { plan, ratio, spot },
  alt,
}: {
  layout: NonNullable<ReturnType<typeof unitLayout>>;
  alt: string;
}) {
  if (spot.outline)
    return (
      <div className="plan-zoom-view sale-unit-layout plan-cut">
        <PlanCutout
          image={plan.image}
          unit={spot.unit}
          outline={spot.outline}
          label={alt}
        />
        <dl className="plan-cut-facts">
          <div>
            <dt>Căn</dt>
            <dd>{`${plan.tower}-${spot.unit}`}</dd>
          </div>
          <div>
            <dt>Thông thủy</dt>
            <dd>{planArea(spot.outline.inner)}</dd>
          </div>
          <div>
            <dt>Tim tường</dt>
            <dd>{planArea(spot.outline.wall)}</dd>
          </div>
        </dl>
      </div>
    );
  return (
    <div
      className="plan-zoom-view sale-unit-layout"
      style={
        {
          aspectRatio: spot.cropRatio,
          "--ratio": spot.cropRatio,
        } as React.CSSProperties
      }
    >
      <div
        style={{
          width: `${(100 / spot.crop.width) * 100}%`,
          aspectRatio: ratio,
          left: `${(-spot.crop.left / spot.crop.width) * 100}%`,
          top: `${(-spot.crop.top / spot.crop.height) * 100}%`,
        }}
      >
        <Image src={plan.image} alt={alt} fill sizes="1800px" />
      </div>
    </div>
  );
}

/**
 * A unit for sale: what a buyer reads first (price, tower, floor, area), the
 * money, the tower's floor plan, then the description. Calling comes first;
 * the form waits at the end of the page.
 */
export function SaleUnitBody({
  unit: r,
  api,
  projectName,
  projectDescription,
  projectPage,
  place,
  buildings,
  status,
  available,
  foreign,
  whatsappMessage,
  amenities,
}: {
  unit: Property;
  api?: ApiProject;
  projectName: string;
  projectDescription: string;
  projectPage: string;
  place?: ProjectLocation;
  /** The site map's buildings, for the project's place. */
  buildings: MapBuilding[];
  status: string;
  available: boolean;
  foreign: boolean;
  whatsappMessage: string;
  amenities: React.ReactNode;
}) {
  const steps = api?.paymentSchedule ?? [];
  const layout = unitLayout(r, api);
  const zalo = zaloHref();
  const perSquareMetre = r.saleVnd
    ? (r.saleVnd / r.area / 1e6).toLocaleString("vi-VN", {
        maximumFractionDigits: 1,
      })
    : "";
  const facts: [string, string][] = [
    ["Mã căn", unitRef(r)],
    ...(r.tower ? [["Tòa", r.tower] as [string, string]] : []),
    ...(r.floor ? [["Tầng", String(r.floor)] as [string, string]] : []),
    [
      hasRooms(r) ? "Phòng ngủ" : "Loại hình",
      hasRooms(r) ? roomsLabel(r) : r.type,
    ],
    ["Diện tích", `${r.area.toLocaleString("vi-VN")} m²`],
    ...(r.direction ? [["Hướng", r.direction] as [string, string]] : []),
    ...(r.viewNote ? [["View", r.viewNote] as [string, string]] : []),
    ...(r.quota ? [["Quỹ căn", r.quota] as [string, string]] : []),
    ...(r.floorNote ? [["Tầng áp dụng", r.floorNote] as [string, string]] : []),
    ["Nội thất bàn giao", r.furniture === "Bàn giao thô" ? "Thô" : r.furniture],
    ...(towerHandover(api, r.tower)
      ? [["Bàn giao nhà", towerHandover(api, r.tower)] as [string, string]]
      : []),
  ];
  return (
    <>
      <div className="sale-unit">
        <article className="sale-unit-main">
          <header className="sale-unit-head">
            <span
              className={`room-availability ${available ? "" : "unavailable"}`}
            >
              {status}
            </span>
            <h1>{r.name}</h1>
            <p className="location">
              <MapPin size={16} aria-hidden="true" />
              {r.location}
            </p>
            <div className="room-heading-tools">
              <ShareButton title={r.name} />
              <div className="room-save">
                <Favorite id={r.id} />
                <span>Lưu căn hộ</span>
              </div>
            </div>
          </header>
          <dl className="sale-unit-facts">
            {facts.map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {layout && (
            <section id="mat-bang">
              <h2>Mặt bằng căn</h2>
              <UnitLayoutCrop layout={layout} alt={`Mặt bằng ${r.name}`} />
              <a
                href={layout.plan.image}
                target="_blank"
                rel="noreferrer"
                className="sale-unit-link"
              >
                {`Xem toàn bộ mặt bằng ${layout.plan.name}`}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </section>
          )}
          {r.saleVnd ? (
            <section id="gia-ban">
              <h2>Giá và thanh toán</h2>
              {steps.length > 0 ? (
                <div className="room-payment">
                  <PaymentTable steps={steps} price={r.saleVnd} />
                  <p className="project-sale-note">
                    Số tiền chỉ để tham khảo, tính theo giá bán và tiến độ của
                    dự án. Hãy xác nhận lại khi giao dịch.
                  </p>
                </div>
              ) : (
                <p className="sale-unit-text">
                  Tiến độ thanh toán sẽ được tư vấn viên gửi theo chính sách mới
                  nhất của chủ đầu tư.
                </p>
              )}
              {r.priceExcludesFees ? (
                <p className="project-sale-note">
                  Giá căn này chưa gồm VAT và kinh phí bảo trì. Tiến độ thanh
                  toán và số tiền cuối cùng sẽ được xác nhận khi giao dịch.
                </p>
              ) : (
                api?.priceNote && (
                  <p className="project-sale-note">{api.priceNote}</p>
                )
              )}
              <Link
                href={`${projectPage}#thanh-toan`}
                className="sale-unit-link"
              >
                Tính khoản vay ngân hàng
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </section>
          ) : null}
          <section id="mo-ta">
            <h2>Về căn hộ này</h2>
            <RichText text={r.description} className="sale-unit-text" />
          </section>
          {amenities}
          <section id="du-an">
            <h2>{projectName}</h2>
            <p className="sale-unit-text">{projectDescription}</p>
            <ProjectMap
              place={place}
              slug={r.projectSlug ?? ""}
              name={projectName}
              address={r.location}
              buildings={buildings}
            />
            <Link href={projectPage} className="sale-unit-link">
              Xem toàn bộ dự án và mặt bằng
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </section>
        </article>
        <aside className="sale-unit-panel">
          {r.saleVnd ? (
            <>
              <p className="sale-unit-price-label">Giá bán</p>
              <p className="sale-unit-price">{salePrice(r.saleVnd)}</p>
            </>
          ) : (
            <>
              <p className="sale-unit-price-label">Căn mẫu</p>
              <p className="sale-unit-ask">
                Gọi để nhận tư vấn và giá mới nhất
              </p>
            </>
          )}
          {r.saleVnd ? (
            <p className="sale-unit-price-exact">
              {`${vndFull(r.saleVnd)} đồng`}
              <br />
              {`Khoảng ${perSquareMetre} triệu/m²`}
            </p>
          ) : null}
          {r.priceExcludesFees && (
            <p className="sale-unit-excludes">
              Chưa gồm VAT và kinh phí bảo trì
            </p>
          )}
          <CallContact
            label={available ? "Gọi tư vấn căn này" : "Gọi tìm căn tương tự"}
            phone={r.contactPhone || undefined}
          />
          {foreign ? (
            <WhatsAppContact
              label="Chat WhatsApp"
              message={whatsappMessage}
              className="room-whatsapp"
            />
          ) : (
            zalo && (
              <a
                href={zalo}
                target="_blank"
                rel="noopener noreferrer"
                className="sale-unit-zalo"
              >
                <MessageCircle size={18} aria-hidden="true" />
                Nhắn Zalo
              </a>
            )
          )}
          <a href="#dang-ky" className="sale-unit-link">
            Hoặc để lại thông tin
          </a>
        </aside>
      </div>
      <section id="dang-ky" className="sale-unit-form">
        <ProjectDesk initial={toDeskUnit(r)}>
          <ProjectLeadForm
            units={[toDeskUnit(r)]}
            projectSlug={r.projectSlug ?? ""}
            projectName={projectName}
          />
        </ProjectDesk>
      </section>
    </>
  );
}
