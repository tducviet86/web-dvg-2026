import Link from "@/components/page-navigation";
import {
  MapPin,
  Expand,
  BedDouble,
  Bath,
  Layers,
  Check,
  ArrowUpRight,
  Sofa,
  KeyRound,
} from "lucide-react";
import type { Property } from "@/types";
import { projects, properties, photos } from "@/data";
import { homeProjects } from "@/data/home-projects";
import { Gallery, Favorite } from "./interactive";
import { PropertyCard } from "./cards";
import { CallContact } from "./call-contact";
import { money } from "@/lib/utils";

export function RoomDetail({ room: r }: { room: Property }) {
  const project = projects.find((p) => p.id === r.projectId)!;
  const portfolio = homeProjects.find((p) => p.projectId === r.projectId);
  const images = [
    ...new Set([
      r.image,
      photos.living,
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=85",
      photos.bedroom,
    ]),
  ].slice(0, 3);
  const available = r.status === "Còn trống";
  const facts = [
    { icon: Expand, value: `${r.area} m²`, label: "Diện tích" },
    {
      icon: BedDouble,
      value: r.bedrooms ? `${r.bedrooms} phòng` : "Studio",
      label: "Phòng ngủ",
    },
    { icon: Bath, value: `${r.bathrooms} phòng`, label: "Phòng tắm" },
    { icon: Layers, value: `Tầng ${r.floor}`, label: "Vị trí tầng" },
  ];
  return (
    <main id="main" className="room-page portfolio-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Đường dẫn">
          <Link href="/du-an/van-hanh">Dự án vận hành</Link>
          <span>/</span>
          <Link href={`/du-an/${project.slug}?nhu-cau=thue`}>
            {project.name}
          </Link>
          <span>/</span>
          <span aria-current="page">Chi tiết căn hộ</span>
        </nav>
        <header className="room-heading">
          <div>
            <span className="signature-kicker">
              {project.name} / CĂN HỘ MẪU
            </span>
            <h1>{r.name}</h1>
            <p className="location">
              <MapPin size={16} />
              {r.location}
            </p>
          </div>
          <div className="room-save">
            <Favorite id={r.id} />
            <span>Lưu căn hộ</span>
          </div>
        </header>
        <Gallery images={images} title={r.name} />
        <p className="room-image-note">
          Ảnh nội thất minh họa · Thông số và giá là dữ liệu mẫu, chưa phải căn
          hộ đang chào thuê thực tế.
        </p>
        <div className="room-layout">
          <article className="room-description">
            <div className="room-facts">
              {facts.map((f) => (
                <div key={f.label}>
                  <f.icon size={24} />
                  <strong>{f.value}</strong>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
            <nav className="room-anchor-nav" aria-label="Thông tin căn hộ">
              <a href="#khong-gian">Không gian</a>
              <a href="#thong-tin">Thông số</a>
              <a href="#dieu-kien">Chi phí & điều kiện</a>
              <a href="#khu-vuc">Dự án</a>
            </nav>
            <section id="khong-gian">
              <span className="signature-kicker">01 / KHÔNG GIAN SỐNG</span>
              <h2>
                Một căn hộ,
                <br />
                <em>nhiều điều để khám phá.</em>
              </h2>
              <p>{r.description}</p>
              <div className="room-space-grid">
                <div>
                  <Sofa size={24} />
                  <h3>Không gian sinh hoạt</h3>
                  <p>
                    Khu sinh hoạt chung kết nối khu bếp. Khi xem phòng, bạn có
                    thể kiểm tra ánh sáng, độ thoáng và cách bố trí thực tế.
                  </p>
                </div>
                <div>
                  <KeyRound size={24} />
                  <h3>Nội thất bàn giao</h3>
                  <p>
                    {r.furniture}. Danh sách thiết bị, tình trạng sử dụng và
                    hạng mục bàn giao cần được xác nhận theo từng căn.
                  </p>
                </div>
              </div>
            </section>
            <section id="thong-tin">
              <span className="signature-kicker">02 / THÔNG SỐ CĂN HỘ</span>
              <h2>Thông tin rõ ràng.</h2>
              <dl className="room-spec-table">
                {[
                  ["Mã tham chiếu", r.unitCode || r.id.toUpperCase()],
                  ["Dự án", project.name],
                  ["Loại căn hộ", r.type],
                  ["Diện tích", `${r.area} m²`],
                  ["Phòng ngủ", r.bedrooms ? String(r.bedrooms) : "Studio"],
                  ["Phòng tắm", String(r.bathrooms)],
                  ["Tầng", String(r.floor)],
                  ["Nội thất", r.furniture],
                  ["Tình trạng mẫu", r.status],
                  [
                    "Ngày cập nhật",
                    new Date(r.updatedAt).toLocaleDateString("vi-VN"),
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section id="dieu-kien">
              <span className="signature-kicker">03 / CHI PHÍ & ĐIỀU KIỆN</span>
              <h2>Trao đổi trước khi thuê.</h2>
              <dl className="room-spec-table">
                {[
                  ["Giá thuê minh họa", `${money(r.price)} triệu / tháng`],
                  ["Tiền đặt cọc", r.deposit || "Trao đổi theo từng căn"],
                  [
                    "Phí quản lý",
                    r.managementFee || "Chưa bao gồm trong giá minh họa",
                  ],
                  [
                    "Thời hạn thuê",
                    r.minimumLease || "Thống nhất với chủ sở hữu",
                  ],
                  ["Ngày nhận nhà", r.availableFrom || "Xác nhận khi hẹn xem"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="room-check-note">
                <Check size={20} />
                <p>
                  Khi xem căn hộ, hãy trao đổi thêm về điện nước, chỗ đỗ xe,
                  danh mục nội thất và biên bản bàn giao.
                </p>
              </div>
            </section>
            <section id="khu-vuc" className="room-project-block">
              <span className="signature-kicker">
                04 / KHÔNG GIAN THUỘC VỀ DỰ ÁN
              </span>
              <h2>{project.name}</h2>
              <p>{project.description}</p>
              <Link
                href={`/du-an/${portfolio?.slug || project.slug}`}
                className="text-link"
              >
                Khám phá dự án <ArrowUpRight size={18} />
              </Link>
            </section>
          </article>
          <aside className="room-contact-panel">
            <span className="signature-kicker">ĐẤT VÀNG GROUP</span>
            <p className="room-price-label">Giá thuê tham khảo · Dữ liệu mẫu</p>
            <div className="room-price">
              {money(r.price)} <span>triệu / tháng</span>
            </div>
            <span
              className={`room-availability ${available ? "" : "unavailable"}`}
            >
              {available
                ? "Tình trạng mẫu: Còn trống"
                : "Tình trạng mẫu: Đã cho thuê"}
            </span>
            <h2>
              {available
                ? "Trao đổi nhanh, hẹn xem thuận tiện."
                : "Tìm căn hộ tương tự."}
            </h2>
            <p>
              {available
                ? "Gọi trực tiếp để xác nhận giá, hiện trạng và lịch xem căn hộ."
                : "Căn hộ mẫu này được đánh dấu đã cho thuê. Liên hệ để tìm lựa chọn khác trong cùng dự án."}
            </p>
            <CallContact
              label={available ? "Gọi hẹn xem phòng" : "Gọi tìm căn tương tự"}
              phone={r.contactPhone || undefined}
            />
            <div className="room-call-context">
              <span>Khi gọi, bạn có thể cung cấp</span>
              <strong>
                {project.name} · {r.unitCode || r.id.toUpperCase()}
              </strong>
            </div>
            <Link
              href={`/du-an/${project.slug}?nhu-cau=ky-gui#nhu-cau`}
              className="text-link"
            >
              Bạn có căn hộ cần ký gửi? <ArrowUpRight size={17} />
            </Link>
          </aside>
        </div>
        <section className="room-related">
          <div className="operation-content-heading">
            <div>
              <span className="signature-kicker">THÊM LỰA CHỌN CHO BẠN</span>
              <h2>Căn hộ cùng dự án.</h2>
            </div>
            <Link
              href={`/du-an/${project.slug}?nhu-cau=thue#nhu-cau`}
              className="text-link"
            >
              Xem tất cả <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="grid grid-3">
            {properties
              .filter((x) => x.projectId === r.projectId && x.id !== r.id)
              .slice(0, 3)
              .map((x) => (
                <PropertyCard key={x.id} property={x} />
              ))}
          </div>
        </section>
      </div>
      <div className="room-mobile-call">
        <div>
          <strong>{money(r.price)} triệu</strong>
          <span>/ tháng · Giá mẫu</span>
        </div>
        <CallContact
          label={available ? "Gọi xem phòng" : "Gọi tư vấn"}
          phone={r.contactPhone || undefined}
        />
      </div>
    </main>
  );
}
