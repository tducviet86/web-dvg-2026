/** @jsxImportSource @/i18n/jsx */
import Image from "next/image";
import { ArrowUpRight, Info, MapPin, MessageCircle } from "lucide-react";
import Link from "@/components/page-navigation";
import { zaloHref } from "@/lib/company-contact";
import type { ApiProject } from "@/lib/api/types";
import { modelTour } from "@/lib/model-tours";
import type { ModelUnit } from "@/lib/model-units";
import { roomsLabel } from "@/lib/property-groups";
import type { Property } from "@/types";
import { CallContact, WhatsAppContact } from "./call-contact";
import { Favorite } from "./client-basics";
import { toDeskUnit } from "./project-sale";
import { ProjectDesk, ProjectLeadForm } from "./project-sale-desk";
import { Tour360 } from "./tour-360";
import { ShareButton } from "./rental-inquiry";
import { UnitLayoutCrop, unitLayout } from "./sale-unit";

/**
 * A model apartment built from its 3D layout: the model first, then its
 * floor plan and a walk through each room. No prices: visitors call.
 */
export function ModelUnitBody({
  unit: r,
  model,
  api,
  projectName,
  projectPage,
  foreign,
  whatsappMessage,
}: {
  unit: Property;
  model: ModelUnit;
  api?: ApiProject;
  projectName: string;
  projectPage: string;
  foreign: boolean;
  whatsappMessage: string;
}) {
  const code = (r.unitCode ?? "").replace(/-T5$/, "");
  const layout = unitLayout(r, api);
  const tour = modelTour(r.typeCode);
  const zalo = zaloHref();
  const facts: [string, string][] = [
    ["Tòa", r.tower ?? ""],
    ["Vị trí căn", code],
    ["Phòng ngủ", roomsLabel(r)],
    ["Diện tích thông thủy", `${r.area.toLocaleString("vi-VN")} m²`],
    ["Tầng áp dụng", (r.floorNote ?? "").replace(/^Tầng /, "")],
    ["Bàn giao", "Thô"],
    ...(api?.handoverNote
      ? [["Thời điểm", api.handoverNote] as [string, string]]
      : []),
  ];
  return (
    <>
      <section className="model-hero">
        <div className="model-hero-photo">
          <a
            href={model.layout}
            target="_blank"
            rel="noreferrer"
            aria-label="Mở ảnh mô hình 3D"
          >
            <Image
              src={model.layout}
              alt={`Mô hình 3D ${r.name}`}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 800px"
            />
          </a>
          <span>Mô hình 3D · Ảnh minh hoạ</span>
        </div>
        <aside className="model-hero-panel">
          <span className="signature-kicker">{projectName}</span>
          <h1>{r.name}</h1>
          <p className="model-hero-place">
            <MapPin size={15} aria-hidden="true" />
            {r.location}
          </p>
          <dl>
            {facts.map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <CallContact label="Gọi tư vấn căn này" />
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
          <div className="model-hero-tools">
            <ShareButton title={r.name} />
            <div className="room-save">
              <Favorite id={r.id} />
              <span>Lưu căn</span>
            </div>
          </div>
        </aside>
      </section>

      <aside className="model-note">
        <Info size={22} aria-hidden="true" />
        <div>
          <strong>Hình ảnh mang tính minh hoạ</strong>
          <p>
            Mô hình, hình ảnh và kích thước nội thất lấy từ căn mẫu của chủ đầu
            tư, chỉ để định hướng bố trí. Căn hộ bàn giao thô; diện tích từng
            phòng có thể khác theo vị trí căn.
          </p>
        </div>
      </aside>

      {tour && (
        <section id="tham-quan-360" className="model-tour">
          <span className="signature-kicker">THAM QUAN 360°</span>
          <h2>Đi một vòng trong căn mẫu</h2>
          <Tour360 tour={tour} title={`Tham quan 360° ${r.name}`} />
        </section>
      )}

      <section className="model-plan">
        {layout && (
          <div>
            <span className="signature-kicker">MẶT BẰNG CĂN</span>
            <h2>{`Vị trí ${code} trên mặt bằng tầng`}</h2>
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
          </div>
        )}
        <div>
          <span className="signature-kicker">CÁC KHÔNG GIAN</span>
          <h2>Bố trí trong căn mẫu</h2>
          <ul className="model-room-list">
            {model.rooms.map((room) => (
              <li key={room.name}>
                <a href={`#phong-${model.rooms.indexOf(room) + 1}`}>
                  <i>
                    {String(model.rooms.indexOf(room) + 1).padStart(2, "0")}
                  </i>
                  <span>{room.name}</span>
                  <b>{`${room.area} m²`}</b>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="model-rooms">
        {model.rooms.map((room, i) => (
          <section key={room.name} id={`phong-${i + 1}`} className="model-room">
            <div className="model-room-photos" data-count={room.photos.length}>
              {room.photos.map((photo) => (
                <span key={photo}>
                  <Image
                    src={photo}
                    alt={`${room.name} căn mẫu`}
                    fill
                    sizes="(max-width: 900px) 100vw, 60vw"
                  />
                </span>
              ))}
              <em className="model-photo-tag">Ảnh minh hoạ</em>
            </div>
            <div className="model-room-text">
              <span className="model-room-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{room.name}</h2>
              <p>{`Khoảng ${room.area} m²`}</p>
              {room.furniture.length > 0 && (
                <dl>
                  {room.furniture.map(([item, size]) => (
                    <div key={item}>
                      <dt>{item}</dt>
                      <dd>{size}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </section>
        ))}
      </div>

      <Link
        href={`${projectPage}#can-mau`}
        className="sale-unit-link model-more"
      >
        Xem các căn mẫu khác của dự án
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>

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
