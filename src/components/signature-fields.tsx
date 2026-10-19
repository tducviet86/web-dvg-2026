"use client";
import Image from "next/image";
import Link from "@/components/page-navigation";
import { useRef, useState } from "react";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { photos } from "@/data";

const fields = [
  {
    title: "Quản lý bất động sản",
    caption: "CHĂM CHÚT TỪNG CHI TIẾT",
    image: photos.interior,
    text: "Chăm sóc tài sản bằng quy trình rõ ràng. Chú trọng chất lượng vận hành và trải nghiệm của người sử dụng.",
    href: "/dich-vu/quan-ly-bat-dong-san",
  },
  {
    title: "Khai thác & vận hành",
    caption: "HIỂU KHÔNG GIAN, HIỂU NHU CẦU",
    image: photos.pool,
    text: "Tìm phương án khai thác phù hợp với đặc điểm từng bất động sản và mục tiêu của chủ sở hữu.",
    href: "/dich-vu/khai-thac-cho-thue",
  },
  {
    title: "Tư vấn & hợp tác",
    caption: "KẾT NỐI ĐỂ CÙNG PHÁT TRIỂN",
    image: photos.architecture,
    text: "Lắng nghe nhu cầu, kết nối chuyên môn và cùng đối tác xác định hướng đi cho những kế hoạch dài hạn.",
    href: "/hop-tac-chu-so-huu",
  },
];
export function SignatureFields() {
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const field = fields[active];
  return (
    <section className="signature-fields" id="linh-vuc">
      <div className="container signature-section-top">
        <span className="signature-kicker">02 / LĨNH VỰC HOẠT ĐỘNG</span>
        <p>
          Mỗi tài sản một đặc điểm.
          <br />
          Mỗi sự đồng hành một giải pháp.
        </p>
      </div>
      <div className="container signature-fields-layout">
        <div className="signature-field-image">
          <Image
            key={field.image}
            src={field.image}
            alt={`Không gian minh họa ${field.title.toLowerCase()}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <span className="signature-image-cross" aria-hidden="true">
            +
          </span>
          <div className="signature-field-caption">
            <span>{field.caption}</span>
            <small>Hình ảnh minh họa</small>
          </div>
        </div>
        <div className="signature-field-copy">
          <h2>Thấu hiểu để đồng hành.</h2>
          <div
            role="tablist"
            aria-label="Lĩnh vực hoạt động"
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
                <strong>{item.title}</strong>
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
              <p>{item.text}</p>
              <Link href={item.href} className="signature-link">
                Tìm hiểu giải pháp
                <ArrowUpRight size={19} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
