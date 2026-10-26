/** @jsxImportSource @/i18n/jsx */
import Link from "@/components/page-navigation";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  Clock3,
  MapPin,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { photos } from "@/data";
import type { ApiJob, ApiPage } from "@/lib/api/types";
import {
  EMPLOYMENT,
  dateText,
  employmentOptions,
  salaryText,
} from "@/lib/jobs";
import { ORGANIZATION_ID, jsonLd } from "@/lib/structured-data";
import { siteUrl } from "@/lib/utils";
import { href } from "@/i18n/server";
import { CompanyHero } from "./company-layouts";
import { Breadcrumb } from "./public-pages";
import { Reveal } from "./interactive";
import { RichText } from "./rich-text";
import { JobApplyForm } from "./job-apply-form";

type Filters = Record<string, string | undefined>;

function JobMeta({ job }: { job: ApiJob }) {
  return (
    <ul className="job-meta">
      <li>
        <MapPin size={15} aria-hidden="true" />
        {job.location}
      </li>
      <li>
        <Clock3 size={15} aria-hidden="true" />
        {EMPLOYMENT[job.employmentType].label}
      </li>
      <li>
        <Wallet size={15} aria-hidden="true" />
        {salaryText(job)}
      </li>
      {job.deadline && (
        <li>
          <CalendarClock size={15} aria-hidden="true" />
          Hạn nộp {dateText(job.deadline)}
        </li>
      )}
    </ul>
  );
}

/** /tuyen-dung: search and filter open positions, general application. */
export function JobsPage({
  page,
  filters,
  data,
}: {
  page: ApiPage | null;
  filters: Filters;
  data: { jobs: ApiJob[]; departments: string[] };
}) {
  const q = filters.q?.trim() ?? "";
  const department = filters["bo-phan"] ?? "";
  const type = filters["hinh-thuc"] ?? "";
  const filtered = !!(q || department || type);
  const link = (changes: Filters) => {
    const params = new URLSearchParams(
      Object.entries({
        q,
        "bo-phan": department,
        "hinh-thuc": type,
        ...changes,
      })
        .filter((e): e is [string, string] => !!e[1])
        .map(([k, v]) => [k, v]),
    );
    return `/tuyen-dung${params.size ? `?${params}` : ""}#co-hoi`;
  };
  return (
    <main id="main" className="company-page jobs-page">
      <CompanyHero
        title={page?.title || "Cùng kiến tạo những không gian sống đáng nhớ."}
        eyebrow="TUYỂN DỤNG"
        description={
          page?.intro ||
          "Đất Vàng Group tìm kiếm những người đồng hành tận tâm cho kinh doanh, marketing, phiên dịch và vận hành căn hộ tại Đà Nẵng."
        }
        image={page?.coverImage?.url || photos.architecture}
      />
      <section id="co-hoi" className="container jobs-board">
        <div className="jobs-board-head">
          <div>
            <span className="eyebrow">CƠ HỘI NGHỀ NGHIỆP</span>
            <h2>Tìm vị trí phù hợp với bạn</h2>
          </div>
          <p className="jobs-count" role="status">
            {data.jobs.length
              ? `${data.jobs.length} vị trí đang tuyển`
              : "Chưa có vị trí phù hợp"}
          </p>
        </div>
        {/* A plain GET form: works without JavaScript and keeps a shareable URL. */}
        <form
          className="jobs-search"
          action={href("/tuyen-dung")}
          role="search"
        >
          <label className="jobs-search-input">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Tìm vị trí</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={100}
              placeholder="Tìm vị trí: kinh doanh, phiên dịch, marketing…"
            />
          </label>
          <label className="jobs-search-type">
            <span className="sr-only">Hình thức làm việc</span>
            <select name="hinh-thuc" defaultValue={type}>
              <option value="">Mọi hình thức</option>
              {employmentOptions.map(([key, v]) => (
                <option key={key} value={v.slug}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          {department && (
            <input type="hidden" name="bo-phan" value={department} />
          )}
          <button type="submit" className="button button-primary">
            Tìm việc
          </button>
        </form>
        {data.departments.length > 1 && (
          <nav className="jobs-departments" aria-label="Bộ phận">
            <Link
              href={link({ "bo-phan": "" })}
              aria-current={!department ? "page" : undefined}
            >
              Tất cả bộ phận
            </Link>
            {data.departments.map((d) => (
              <Link
                key={d}
                href={link({ "bo-phan": d })}
                aria-current={department === d ? "page" : undefined}
              >
                {d}
              </Link>
            ))}
          </nav>
        )}
        {data.jobs.length ? (
          <div className="job-list">
            {data.jobs.map((job) => (
              <Reveal key={job.id}>
                <article className="job-card">
                  <div className="job-card-main">
                    <span className="job-department">
                      <BriefcaseBusiness size={14} aria-hidden="true" />
                      {job.department}
                    </span>
                    <h3>
                      <Link href={`/tuyen-dung/${job.slug}`}>{job.title}</Link>
                    </h3>
                    <p>{job.summary}</p>
                    <JobMeta job={job} />
                  </div>
                  <Link
                    className="job-card-cta"
                    href={`/tuyen-dung/${job.slug}`}
                    aria-label={`Xem chi tiết ${job.title}`}
                  >
                    Xem chi tiết
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="jobs-empty">
            <p>
              {filtered
                ? "Không có vị trí nào khớp với tìm kiếm của bạn."
                : "Hiện chưa có vị trí đang tuyển. Bạn vẫn có thể gửi hồ sơ để chúng tôi liên hệ khi có cơ hội phù hợp."}
            </p>
            {filtered && (
              <Link className="text-link" href="/tuyen-dung#co-hoi">
                Xem tất cả vị trí
                <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        )}
      </section>
      {!!page?.sections.length && (
        <section className="container jobs-culture">
          {page.sections.map((s, i) => (
            <Reveal key={s.heading}>
              <article>
                <span className="eyebrow">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2>{s.heading}</h2>
                <RichText text={s.body} />
              </article>
            </Reveal>
          ))}
        </section>
      )}
      <section id="ung-tuyen" className="container jobs-general">
        <div className="jobs-general-copy">
          <span className="eyebrow">ỨNG TUYỂN CHUNG</span>
          <h2>Chưa thấy vị trí phù hợp?</h2>
          <p>
            Gửi CV cho chúng tôi. Bộ phận nhân sự sẽ lưu hồ sơ và liên hệ ngay
            khi có cơ hội phù hợp với kinh nghiệm của bạn.
          </p>
        </div>
        <JobApplyForm />
      </section>
    </main>
  );
}

/** schema.org JobPosting (Google for Jobs). Closed postings get none. */
function jobSchema(job: ApiJob) {
  const vnd = (v: string | null) => (v ? Number(v) : undefined);
  const min = vnd(job.salaryMinVnd);
  const max = vnd(job.salaryMaxVnd);
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: [job.summary, job.description, job.requirements, job.benefits]
      .join("\n\n")
      .replace(/\n/g, "<br>"),
    identifier: {
      "@type": "PropertyValue",
      name: "Đất Vàng Group",
      value: job.id,
    },
    datePosted: job.publishedAt?.slice(0, 10),
    ...(job.deadline ? { validThrough: `${job.deadline}T23:59:59+07:00` } : {}),
    employmentType: job.employmentType,
    ...(job.openings ? { totalJobOpenings: job.openings } : {}),
    hiringOrganization: {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "Đất Vàng Group",
      sameAs: siteUrl,
      logo: `${siteUrl}/images/dat-vang-group-logo-transparent.png`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressRegion: "Đà Nẵng",
        addressCountry: "VN",
      },
    },
    ...(min || max
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "VND",
            value: {
              "@type": "QuantitativeValue",
              ...(min ? { minValue: min } : {}),
              ...(max ? { maxValue: max } : {}),
              unitText: "MONTH",
            },
          },
        }
      : {}),
    directApply: true,
    url: `${siteUrl}/tuyen-dung/${job.slug}`,
  };
}

/** /tuyen-dung/<slug>: the posting and its application form. */
export function JobDetail({ job }: { job: ApiJob }) {
  return (
    <main id="main" className="page-main job-detail">
      {job.isOpen && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(jobSchema(job)) }}
        />
      )}
      <div className="container">
        <Breadcrumb title={job.title} parent={["Tuyển dụng", "/tuyen-dung"]} />
        <header className="job-detail-head">
          <span className="job-department">
            <BriefcaseBusiness size={14} aria-hidden="true" />
            {job.department}
          </span>
          <h1>{job.title}</h1>
          <p>{job.summary}</p>
          <JobMeta job={job} />
          {!job.isOpen && (
            <p className="job-closed" role="status">
              Tin này đã hết hạn nhận hồ sơ.
            </p>
          )}
        </header>
        <div className="job-detail-body">
          <article>
            <section>
              <h2>Mô tả công việc</h2>
              <RichText text={job.description} />
            </section>
            <section>
              <h2>Yêu cầu</h2>
              <RichText text={job.requirements} />
            </section>
            <section>
              <h2>Quyền lợi</h2>
              <RichText text={job.benefits} />
            </section>
            <dl className="job-facts">
              <div>
                <dt>
                  <Wallet size={16} aria-hidden="true" /> Mức lương
                </dt>
                <dd>{salaryText(job)}</dd>
              </div>
              <div>
                <dt>
                  <Clock3 size={16} aria-hidden="true" /> Hình thức
                </dt>
                <dd>{EMPLOYMENT[job.employmentType].label}</dd>
              </div>
              {job.openings && (
                <div>
                  <dt>
                    <Users size={16} aria-hidden="true" /> Số lượng
                  </dt>
                  <dd>{job.openings} người</dd>
                </div>
              )}
              <div>
                <dt>
                  <MapPin size={16} aria-hidden="true" /> Nơi làm việc
                </dt>
                <dd>{job.location}</dd>
              </div>
            </dl>
          </article>
          <aside id="ung-tuyen" className="job-apply">
            {job.isOpen ? (
              <JobApplyForm jobSlug={job.slug} jobTitle={job.title} />
            ) : (
              <div className="contact-form">
                <span className="eyebrow">ỨNG TUYỂN</span>
                <h3>Tin đã hết hạn</h3>
                <p className="muted">
                  Bạn có thể xem các vị trí khác hoặc gửi hồ sơ ứng tuyển chung.
                </p>
                <Link
                  className="button button-primary"
                  href="/tuyen-dung#co-hoi"
                >
                  Xem vị trí đang tuyển
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
