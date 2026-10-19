import Image from "next/image";
import Link from "@/components/page-navigation";
import { ArrowUpRight } from "lucide-react";
import { homeProjects } from "@/data/home-projects";
import { Reveal } from "@/components/interactive";
export function HomeProjects({
  group,
}: {
  group: "development" | "operation";
}) {
  const development = group === "development";
  return (
    <section
      id={development ? "du-an-trien-khai" : "du-an-van-hanh"}
      className={`home-projects home-projects-${group}`}
    >
      <div className="container">
        <div className="home-project-heading">
          <div>
            <span className="signature-kicker">
              {development
                ? "01 / DANH MỤC TRIỂN KHAI"
                : "02 / DANH MỤC VẬN HÀNH"}
            </span>
            <h2>
              Dự án <em>{development ? "triển khai." : "vận hành."}</em>
            </h2>
          </div>
          <p>
            {development
              ? "Khám phá dự án, tìm hiểu sản phẩm và kết nối nhu cầu mua bán bất động sản."
              : "Kết nối nhu cầu thuê, cho thuê và ký gửi tại các dự án trong danh mục của Đất Vàng."}
          </p>
        </div>
        <div className="home-project-cards">
          {homeProjects
            .filter((p) => p.group === group)
            .map((p, i) => (
              <Reveal key={p.id}>
                <article>
                  <Link
                    className="home-project-photo image-wrap"
                    href={`/lien-he?project=${encodeURIComponent(p.name)}`}
                    aria-label={`Tư vấn dự án ${p.name}`}
                  >
                    <Image
                      src={`/images/projects/${p.id}.jpg`}
                      alt={`${p.imageType} ${p.name}`}
                      fill
                      sizes="(max-width:600px) 100vw, (max-width:1000px) 50vw, 33vw"
                    />
                    <span className="home-project-number">0{i + 1}</span>
                    <span className="home-project-open">
                      <ArrowUpRight size={24} />
                    </span>
                  </Link>
                  <div className="home-project-info">
                    <span>{p.location}</span>
                    <h3>
                      <Link
                        href={`/lien-he?project=${encodeURIComponent(p.name)}`}
                      >
                        {p.name}
                      </Link>
                    </h3>
                    <div>
                      <a href={p.source} target="_blank" rel="noreferrer">
                        {p.imageType} · Nguồn ảnh <ArrowUpRight size={12} />
                      </a>
                      <Link
                        href={`/lien-he?project=${encodeURIComponent(p.name)}`}
                      >
                        Tư vấn <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
        </div>
      </div>
    </section>
  );
}
