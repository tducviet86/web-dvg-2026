/** @jsxImportSource @/i18n/jsx */
import Link from "@/components/page-navigation";
import { ArrowUpRight, Facebook } from "lucide-react";
import { Logo } from "./header";
import {
  companyFacebook,
  companyHotline,
  telephoneHref,
} from "@/lib/company-contact";
import { Newsletter } from "../interactive";
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Logo />
            <p>
              Tận tâm trong từng kết nối.
              <br />
              Đồng hành cùng giá trị bền vững.
            </p>
            <small>
              Đà Nẵng, Việt Nam
              <br />
              <a href={telephoneHref() || undefined}>
                Hotline: {companyHotline}
              </a>
              <br />
              <a
                className="footer-social"
                href={companyFacebook}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook size={15} aria-hidden="true" />
                Đất Vàng Group
              </a>
            </small>
          </div>
          <div>
            <h3>Khám phá</h3>
            {[
              ["Về Đất Vàng", "/gioi-thieu"],
              ["Dự án", "/du-an"],
              ["Căn hộ cho thuê", "/cho-thue"],
              ["Tin tức", "/blog"],
            ].map(([t, h]) => (
              <Link key={h} href={h}>
                {t}
              </Link>
            ))}
          </div>
          <div>
            <h3>Đồng hành</h3>
            {[
              ["Lĩnh vực hoạt động", "/dich-vu"],
              ["Ký gửi căn hộ", "/hop-tac-chu-so-huu"],
              ["Đối tác", "/gioi-thieu/doi-tac"],
              ["Cơ hội nghề nghiệp", "/tuyen-dung"],
              ["Liên hệ", "/lien-he"],
            ].map(([t, h]) => (
              <Link key={h} href={h}>
                {t}
              </Link>
            ))}
          </div>
          <div>
            <Newsletter />
            <p className="footer-note">
              Nhận góc nhìn mới về không gian sống. Hủy đăng ký bất cứ lúc nào.
            </p>
            <Link href="/lien-he">
              Kết nối với chúng tôi
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Đất Vàng Group</span>
          <div>
            <Link href="/chinh-sach-bao-mat">Chính sách bảo mật</Link>
            <Link href="/dieu-khoan-su-dung">Điều khoản sử dụng</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
