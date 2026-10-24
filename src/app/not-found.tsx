/** @jsxImportSource @/i18n/jsx */
import Link from "@/components/page-navigation";
export default function NotFound() {
  return (
    <main id="main" className="not-found">
      <span className="eyebrow">ĐẤT VÀNG GROUP · 404</span>
      <h1>Một lối rẽ chưa có trên bản đồ.</h1>
      <p>Trang bạn tìm không tồn tại hoặc đường dẫn đã thay đổi.</p>
      <Link className="button button-primary" href="/">
        Trở về trang chủ ↗
      </Link>
      <Link className="text-link" href="/cho-thue">
        Khám phá căn hộ
      </Link>
    </main>
  );
}
