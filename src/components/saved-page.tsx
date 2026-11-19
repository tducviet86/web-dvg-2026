/** @jsxImportSource @/i18n/jsx */
import { Heart } from "lucide-react";
import { BackButton } from "@/components/layout/back-button";
import Link from "@/components/page-navigation";
import type { Property } from "@/types";
import { PropertyCard, SaleCard } from "./cards";
import { Favorite, SavedSync } from "./client-basics";

/**
 * /da-luu: the units this visitor saved with the heart button, newest first.
 * The list lives in the visitor's browser (a cookie), never on the server.
 */
export function SavedPage({
  ids,
  units,
}: {
  /** The saved ids as the cookie had them. */
  ids: string[];
  /** Those still on the site, newest first. */
  units: Property[];
}) {
  const gone = ids.length - units.length;
  return (
    <main id="main" className="rental-page saved-page">
      <SavedSync shown={ids.join(".")} />
      <div className="container">
        <nav className="breadcrumb saved-crumbs" aria-label="Đường dẫn">
          <BackButton />
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <span aria-current="page">Căn đã lưu</span>
        </nav>
        <header className="saved-head">
          <span className="signature-kicker">YÊU THÍCH</span>
          <h1>Căn hộ đã lưu</h1>
          <p>
            Các căn bạn bấm biểu tượng trái tim được lưu trên trình duyệt này.
            Bấm lại trái tim để bỏ lưu.
          </p>
        </header>
        {units.length ? (
          <div className="rental-card-grid">
            {units.map((p, i) =>
              p.forRent ? (
                <PropertyCard property={p} key={p.id} index={i} />
              ) : (
                <div className="saved-sale" key={p.id}>
                  <SaleCard property={p} />
                  <Favorite id={p.id} />
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="saved-empty">
            <Heart size={28} aria-hidden="true" />
            <p>Bạn chưa lưu căn hộ nào.</p>
            <Link href="/cho-thue" className="button button-primary">
              Tìm căn hộ cho thuê
            </Link>
          </div>
        )}
        {gone > 0 && (
          <p className="saved-note">
            Một số căn bạn đã lưu hiện đã có người thuê hoặc không còn hiển thị.
          </p>
        )}
      </div>
    </main>
  );
}
