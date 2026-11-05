/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import { ArrowUpRight, MapPin, MessageCircle } from "lucide-react";
import Link from "@/components/page-navigation";
import type { ApiProject } from "@/lib/api/types";
import { zaloHref } from "@/lib/company-contact";
import { roomsLabel, hasRooms } from "@/lib/property-groups";
import { salePrice, unitRef, vndFull } from "@/lib/utils";
import { CallContact, WhatsAppContact } from "./call-contact";
import { Favorite } from "./client-basics";
import { RichText } from "./rich-text";
import { PaymentTable, toDeskUnit } from "./project-sale";
import { ProjectDesk, ProjectLeadForm } from "./project-sale-desk";
import { ProjectMap } from "./project-map";
import { ShareButton } from "./rental-inquiry";
import type { ProjectLocation, Property } from "@/types";

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
  status: string;
  available: boolean;
  foreign: boolean;
  whatsappMessage: string;
  amenities: React.ReactNode;
}) {
  const steps = api?.paymentSchedule ?? [];
  const towerPlans = (api?.floorPlans ?? []).filter(
    (plan) => r.tower && plan.tower === r.tower,
  );
  // "Tòa C6 · Tầng 11-12, 14-27": the plan of this unit's floor, if named.
  const coversFloor = (name: string) =>
    [...name.matchAll(/(\d+)\s*-\s*(\d+)/g)].some(
      ([, low, high]) => r.floor >= Number(low) && r.floor <= Number(high),
    );
  const floorPlans = towerPlans.filter((plan) => coversFloor(plan.name));
  const plans = floorPlans.length ? floorPlans : towerPlans;
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
    [
      "Nội thất bàn giao",
      r.furniture === "Bàn giao thô" ? "Thô" : r.furniture,
    ],
    ...(api?.handoverNote
      ? [["Bàn giao nhà", api.handoverNote] as [string, string]]
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
          {plans.length > 0 && (
            <section id="mat-bang">
              <h2>{`Mặt bằng tòa ${r.tower}`}</h2>
              <ul className="sale-unit-plans">
                {plans.map((plan) => (
                  <li key={plan.image}>
                    <a href={plan.image} target="_blank" rel="noreferrer">
                      <span>
                        <Image
                          src={plan.image}
                          alt={plan.name}
                          fill
                          sizes="(max-width: 900px) 100vw, 800px"
                        />
                      </span>
                      {plan.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section id="mo-ta">
            <h2>Về căn hộ này</h2>
            <RichText text={r.description} className="sale-unit-text" />
          </section>
          {amenities}
          <section id="du-an">
            <h2>{projectName}</h2>
            <p className="sale-unit-text">{projectDescription}</p>
            <ProjectMap place={place} />
            <Link href={projectPage} className="sale-unit-link">
              Xem toàn bộ dự án, bảng giá và mặt bằng
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </section>
        </article>
        <aside className="sale-unit-panel">
          <p className="sale-unit-price-label">Giá bán</p>
          <p className="sale-unit-price">
            {r.saleVnd ? salePrice(r.saleVnd) : "Liên hệ"}
          </p>
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
