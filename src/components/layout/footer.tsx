import Link from "@/components/page-navigation";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./header";
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
              Địa chỉ và kênh liên hệ chính thức đang cập nhật.
            </small>
          </div>
          <div>
            <h3>Khám phá</h3>
            {[
              ["Về Đất Vàng", "/gioi-thieu"],
              ["Dự án", "/du-an"],
              ["Tầm nhìn & sứ mệnh", "/gioi-thieu/tam-nhin-su-menh"],
              ["Tin tức & góc nhìn", "/blog"],
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
              ["Hợp tác chủ sở hữu", "/hop-tac-chu-so-huu"],
              ["Cơ hội nghề nghiệp", "/tuyen-dung"],
              ["Liên hệ", "/lien-he"],
              ["Quản trị demo", "/admin"],
            ].map(([t, h]) => (
              <Link key={h} href={h}>
                {t}
              </Link>
            ))}
          </div>
          <div>
            <Newsletter />
            <p className="footer-note">Đăng ký chỉ lưu tại trình duyệt.</p>
            <Link href="/lien-he">
              Kết nối với chúng tôi
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Đất Vàng Group · Frontend demo</span>
          <div>
            <Link href="/chinh-sach-bao-mat">Chính sách bảo mật</Link>
            <Link href="/dieu-khoan-su-dung">Điều khoản sử dụng</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
