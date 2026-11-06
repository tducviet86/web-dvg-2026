/** @jsxImportSource @/i18n/jsx */
import { BackButton } from "@/components/layout/back-button";
import Link from "@/components/page-navigation";
import type { SiteContent } from "@/lib/api/content";
import { searchUnits } from "@/lib/filter";
import { SaleCard } from "./cards";
import { SearchHero } from "./search-hero";

/**
 * /mua-ban: everything on sale, as one page search engines can index. Filtering
 * stays on /cho-thue?nhu-cau=mua, whose result pages are not indexed.
 */
export function SalePage({ content }: { content: SiteContent }) {
  const units = searchUnits(content.properties, { "nhu-cau": "mua" }).filter(
    (p) => !p.isDemo && !p.delisted,
  );
  const forSale = units.filter((p) => !p.floorNote);
  const projects = content.portfolio.filter((p) =>
    units.some((u) => u.projectId === p.projectId),
  );
  const modelProjects = projects.filter((p) =>
    units.some((u) => u.projectId === p.projectId && u.floorNote),
  );
  return (
    <main id="main" className="rental-page">
      <SearchHero
        slides={projects.slice(0, 4).map((p) => ({
          src: p.image,
          alt: p.imageAlt,
        }))}
        action="/cho-thue"
        mode="mua"
        // Matches mode, or the search box would load its results on arrival.
        values={{ "nhu-cau": "mua" }}
        projects={projects.map((p) => [p.slug, p.name])}
        locations={[...new Set(units.map((p) => p.location))]}
        title="Mua bán căn hộ tại Đà Nẵng"
        units={units}
        crumbs={
          <>
            <BackButton />
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <span aria-current="page">Mua bán căn hộ</span>
          </>
        }
      />
      <div className="container">
        {forSale.length > 0 && (
          <section id="can-ho" className="rental-results">
            <div className="rental-results-heading">
              <div>
                <span className="signature-kicker">CĂN ĐANG BÁN</span>
                <h2>Căn hộ đang bán tại Đà Nẵng</h2>
              </div>
            </div>
            <div className="rental-card-grid">
              {forSale.map((p) => (
                <SaleCard property={p} key={p.id} />
              ))}
            </div>
          </section>
        )}
        {modelProjects.map((p, i) => (
          <section
            key={p.projectId}
            id={forSale.length === 0 && i === 0 ? "can-ho" : undefined}
            className="rental-results"
          >
            <div className="rental-results-heading">
              <div>
                <span className="signature-kicker">CĂN MẪU</span>
                <h2>{`Căn mẫu tại ${p.name}`}</h2>
              </div>
            </div>
            <Link href={`/du-an/${p.slug}#can-mau`} className="text-link">
              Xem mặt bằng và sơ đồ dự án
            </Link>
          </section>
        ))}
      </div>
    </main>
  );
}
