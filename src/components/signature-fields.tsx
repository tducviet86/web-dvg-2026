"use client";
import { useT } from "@/i18n/client";
import Image from "next/image";
import Link from "@/components/page-navigation";
import { useRef, useState } from "react";
import { ArrowUpRight, ArrowRight } from "lucide-react";

const fields = [
  {
    title: "Mua bán bất động sản",
    caption: "TÌM ĐÚNG SẢN PHẨM, ĐÚNG NHU CẦU",
    image: "/images/projects/capital.jpg",
    text: "Tư vấn lựa chọn dự án và sản phẩm theo nhu cầu an cư, ngân sách và kế hoạch của khách hàng. Đồng hành trong quá trình tìm hiểu thông tin và kết nối giao dịch.",
    href: "/lien-he?intent=mua-ban",
    action: "Tư vấn mua bán",
    forWho: "Dành cho người mua & người bán",
  },
  {
    title: "Cho thuê bất động sản",
    caption: "KẾT NỐI KHÔNG GIAN SỐNG PHÙ HỢP",
    image: "/images/projects/hiyori.jpg",
    text: "Hỗ trợ khách thuê tìm không gian phù hợp, hẹn xem thực tế và trao đổi điều kiện thuê. Đồng hành cùng chủ sở hữu trong việc khai thác căn hộ.",
    href: "/cho-thue",
    action: "Khám phá căn hộ cho thuê",
    forWho: "Dành cho khách thuê & chủ sở hữu",
  },
  {
    title: "Ký gửi bất động sản",
    caption: "MỘT ĐẦU MỐI, XUYÊN SUỐT HÀNH TRÌNH",
    image: "/images/projects/sam.jpg",
    text: "Tiếp nhận ký gửi bán hoặc cho thuê. Trao đổi thông tin tài sản, phương án giới thiệu và lịch xem; cập nhật phản hồi để chủ sở hữu chủ động quyết định.",
    href: "/lien-he?intent=ky-gui",
    action: "Đăng ký ký gửi",
    forWho: "Dành cho chủ nhà & nhà đầu tư",
  },
];
export function SignatureFields() {
  const t = useT();
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const field = fields[active];
  return (
    <section className="signature-fields" id="linh-vuc">
      <div className="container signature-section-top">
        <span className="signature-kicker">{t("LĨNH VỰC HOẠT ĐỘNG")}</span>
        <p>
          {t("Mỗi tài sản một đặc điểm.")}
          <br />
          {t("Mỗi sự đồng hành một giải pháp.")}
        </p>
      </div>
      <div className="container signature-fields-layout">
        <div className="signature-field-image">
          <Image
            key={field.image}
            src={field.image}
            alt={t("Hình ảnh dự án phục vụ {field}", {
              field: t(field.title).toLowerCase(),
            })}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <span className="signature-image-cross" aria-hidden="true">
            +
          </span>
          <div className="signature-field-caption">
            <span>{t(field.caption)}</span>
            <small>
              {active === 0
                ? t("Phối cảnh Capital Square")
                : active === 1
                  ? "Hiyori Garden Tower"
                  : "SAM Towers"}
            </small>
          </div>
        </div>
        <div className="signature-field-copy">
          <span className="signature-field-audience">
            {t("MUA BÁN · CHO THUÊ · KÝ GỬI")}
          </span>
          <h2>
            {t("Bất động sản.")}
            <br />
            {t("Giải pháp cho bạn.")}
          </h2>
          <div
            role="tablist"
            aria-label={t("Lĩnh vực hoạt động")}
            aria-orientation="vertical"
            className="signature-field-tabs"
          >
            {fields.map((item, index) => (
              <button
                ref={(el) => {
                  buttons.current[index] = el;
                }}
                key={item.title}
                id={`field-tab-${index}`}
                role="tab"
                type="button"
                aria-selected={active === index}
                aria-controls={`field-panel-${index}`}
                tabIndex={active === index ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={(event) => {
                  let next = index;
                  if (event.key === "ArrowDown")
                    next = (index + 1) % fields.length;
                  else if (event.key === "ArrowUp")
                    next = (index + fields.length - 1) % fields.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = fields.length - 1;
                  else return;
                  event.preventDefault();
                  setActive(next);
                  buttons.current[next]?.focus();
                }}
              >
                <span>0{index + 1}</span>
                <strong>{t(item.title)}</strong>
                <ArrowRight size={22} />
              </button>
            ))}
          </div>
          {fields.map((item, index) => (
            <div
              className="signature-field-panel"
              id={`field-panel-${index}`}
              key={item.title}
              role="tabpanel"
              aria-labelledby={`field-tab-${index}`}
              hidden={active !== index}
              tabIndex={0}
            >
              <strong className="signature-field-audience">
                {t(item.forWho)}
              </strong>
              <p>{t(item.text)}</p>
              <Link href={item.href} className="signature-link">
                {t(item.action)}
                <ArrowUpRight size={19} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
