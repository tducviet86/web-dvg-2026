"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Info,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import {
  LANDING_FILTERS,
  MIN_LANDING_UNITS,
  landingPath,
  readLandings,
  type Landing,
} from "@/lib/landings";
import { api, errorMessage } from "./api";

/**
 * Admin › Từ khoá & SEO (administrators only): what people search on Google
 * to find the site, AI titles for the pages those searches land on, and
 * search landing pages ("Cho thuê căn hộ 2PN Đà Nẵng") for the searches the
 * site should answer.
 */
export function SeoPanel() {
  const [view, setView] = useState<"keywords" | "landings">("keywords");
  return (
    <section className="admin-panel seo-panel">
      <div className="seo-tabs" role="tablist" aria-label="Từ khoá & SEO">
        {(
          [
            ["keywords", "Từ khoá trên Google"],
            ["landings", "Trang theo nhu cầu"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "keywords" ? <Keywords /> : <Landings />}
    </section>
  );
}

/* ── Keywords ─────────────────────────────────────────────────────────── */

type Row = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
type KeywordData = {
  configured: boolean;
  site: string | null;
  rows: Row[];
  from?: string;
  to?: string;
  fetchedAt?: string;
  /** Pages rewritten from this table: slug → when (last 180 days). */
  rewritten?: Record<string, string>;
};
/** One search, all the site's pages Google showed for it. */
type Keyword = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  /** Average place on Google, weighted by how often each page showed. */
  position: number;
  /** The page shown most, then the others. */
  pages: Row[];
  brand: boolean;
};
type Proposal = {
  row: Row;
  target: {
    kind: "property" | "project" | "landing";
    id?: string;
    purpose?: "rent" | "sale";
    slug?: string;
    title: string;
    seoTitle: string | null;
    seoDescription: string | null;
  };
  seoTitle: string;
  seoDescription: string;
  /** What the page says now (its <title> and description), read from it. */
  current: { title: string; description: string } | null;
};

/** A page's own title and description, as the website serves them now. */
const readPage = (path: string) =>
  fetch(path)
    .then((res) => (res.ok ? res.text() : Promise.reject()))
    .then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return {
        title: doc.title,
        description:
          doc
            .querySelector('meta[name="description"]')
            ?.getAttribute("content") ?? "",
      };
    })
    .catch(() => null);

const pathOf = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname) || "/";
  } catch {
    return url;
  }
};
const plain = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
/** People who already know the company: not new customers to win. */
const isBrand = (query: string) => /dat ?vang|datvang|dvg\b/.test(plain(query));
/** Page 2 of Google (or the bottom of page 1): worth improving first. */
const nearTop = (k: { position: number }) =>
  k.position >= 8 && k.position <= 20;
const nf = (n: number, digits = 0) =>
  n.toLocaleString("vi-VN", { maximumFractionDigits: digits });
/** "2026-10-14" → "14/10/2026". */
/** A page address's last part: the unit, project or landing slug. */
const slugOf = (url: string) =>
  pathOf(url).split("/").filter(Boolean).at(-1) ?? "";
const vnDate = (iso?: string) =>
  iso ? iso.split("-").reverse().join("/") : "";
const pct = (n: number) => `${nf(n * 100, 1)}%`;

function group(rows: Row[]): Keyword[] {
  const by = new Map<string, Row[]>();
  for (const r of rows) by.set(r.query, [...(by.get(r.query) ?? []), r]);
  return [...by].map(([query, pages]) => {
    const impressions = pages.reduce((s, r) => s + r.impressions, 0);
    const clicks = pages.reduce((s, r) => s + r.clicks, 0);
    return {
      query,
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      position:
        Math.round(
          (pages.reduce((s, r) => s + r.position * r.impressions, 0) /
            (impressions || 1)) *
            10,
        ) / 10,
      pages: [...pages].sort((a, b) => b.impressions - a.impressions),
      brand: isBrand(query),
    };
  });
}

/** Where a place on Google puts the page, in words. */
function Place({ position }: { position: number }) {
  const page = position <= 10 ? 1 : position <= 20 ? 2 : 3;
  return (
    <span className="seo-place" data-page={page}>
      <b>{page === 3 ? "Trang 3+" : `Trang ${page}`}</b>
      <small>hạng {nf(position, 1)}</small>
    </span>
  );
}

/** "(i)": a short explanation, on click (and hover with a mouse). */
function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !box.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <span
      className="seo-info"
      ref={box}
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover)").matches) setOpen(true);
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(hover: hover)").matches) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={`Giải thích: ${label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Info size={14} aria-hidden="true" />
      </button>
      {open && (
        <span id={id} role="tooltip" className="seo-info-pop">
          <strong>{label}</strong>
          {children}
        </span>
      )}
    </span>
  );
}

/** How a result looks on Google: title, address, description. */
function SerpPreview({
  title,
  url,
  text,
}: {
  title: string;
  url: string;
  text: string;
}) {
  return (
    <div className="seo-serp">
      <small>
        {url
          .replace(/^https?:\/\//, "")
          .replace(/\/$/, "")
          .replace(/\//g, " › ")}
      </small>
      <b>{title.length > 62 ? `${title.slice(0, 60)}…` : title}</b>
      <span>{text.length > 162 ? `${text.slice(0, 160)}…` : text}</span>
    </div>
  );
}

const VIEWS = [
  ["chance", "Cơ hội lên trang 1"],
  ["new", "Khách mới tìm"],
  ["brand", "Tìm tên công ty"],
  ["all", "Tất cả"],
] as const;
type View = (typeof VIEWS)[number][0];

function Keywords() {
  const [days, setDays] = useState<7 | 28 | 90>(28);
  const [data, setData] = useState<KeywordData | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("chance");
  const [open, setOpen] = useState("");
  /** The search being rewritten: its window is open while AI writes. */
  const [asking, setAsking] = useState<Row | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const close = () => {
    setAsking(null);
    setProposal(null);
  };
  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api<{ data: KeywordData }>(
        "GET",
        `/admin/seo/keywords?days=${days}`,
      );
      setData(res.data);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [days]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const rewrittenAt = (page: string) => data?.rewritten?.[slugOf(page)] ?? "";
  const all = useMemo(() => group(data?.rows ?? []), [data]);
  const counts: Record<View, number> = {
    chance: all.filter((k) => !k.brand && nearTop(k)).length,
    new: all.filter((k) => !k.brand).length,
    brand: all.filter((k) => k.brand).length,
    all: all.length,
  };
  const shown = useMemo(() => {
    const words = plain(q.trim());
    return all
      .filter(
        (k) =>
          (view === "all" ||
            (view === "brand"
              ? k.brand
              : !k.brand && (view === "new" || nearTop(k)))) &&
          plain(k.query).includes(words),
      )
      .sort((a, b) => b.impressions - a.impressions);
  }, [all, q, view]);
  const totals = (data?.rows ?? []).reduce(
    (s, r) => ({
      c: s.c + r.clicks,
      i: s.i + r.impressions,
      p: s.p + r.position * r.impressions,
    }),
    { c: 0, i: 0, p: 0 },
  );

  async function suggest(row: Row) {
    setAsking(row);
    setProposal(null);
    try {
      const res = await api<{
        data: {
          target: Proposal["target"];
          suggestion: { seoTitle: string; seoDescription: string };
        };
      }>("POST", "/admin/seo/keywords/suggest", {
        query: row.query,
        page: row.page,
      });
      const current = await readPage(pathOf(row.page));
      setProposal({
        row,
        target: res.data.target,
        ...res.data.suggestion,
        current,
      });
    } catch (e) {
      toast.error(errorMessage(e));
      setAsking(null);
    }
  }
  async function apply() {
    if (!proposal) return;
    const { target } = proposal;
    try {
      await api("POST", "/admin/seo/keywords/apply", {
        kind: target.kind,
        id: target.id,
        purpose: target.purpose,
        slug: target.slug,
        seoTitle: proposal.seoTitle.trim(),
        seoDescription: proposal.seoDescription.trim(),
      });
      const at = new Date().toISOString();
      setData(
        (d) =>
          d && {
            ...d,
            rewritten: { ...d.rewritten, [slugOf(proposal.row.page)]: at },
          },
      );
      toast.success(
        "Đã áp dụng. Google cập nhật kết quả sau vài ngày; xem lại vị trí sau 2–3 tuần.",
      );
      close();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (error) return <p className="seo-error">{error}</p>;
  if (!data) return <p role="status">Đang lấy dữ liệu từ Search Console…</p>;
  if (!data.configured) return <SetupGuide />;
  return (
    <div className="seo-keywords">
      <div className="seo-help">
        <strong>Bảng này cho biết gì?</strong> Những gì khách gõ trên Google mà
        website của mình hiện ra, ở trang mấy, bao nhiêu lần và có ai bấm vào
        không. Bắt đầu từ thẻ <b>Cơ hội lên trang 1</b>: các từ khoá đang ở
        trang 2, chỉ cần sửa tiêu đề và mô tả cho hay hơn (nút{" "}
        <b>Viết lại bằng AI</b>) là có thể lên trang 1. Viết xong, dòng đó hiện{" "}
        <b>Đã viết lại</b> kèm ngày; tiêu đề mới đã lưu vào trang, không cần sửa
        lại khi số liệu cập nhật. Chờ Google 2–3 tuần rồi xem thứ hạng.
      </div>

      <div className="seo-toolbar">
        <div className="seo-range" role="group" aria-label="Khoảng thời gian">
          {([7, 28, 90] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
            >
              {d} ngày
            </button>
          ))}
        </div>
        <span className="seo-muted">
          {vnDate(data.from)} → {vnDate(data.to)} · số liệu Google trễ khoảng 2
          ngày
        </span>
      </div>

      <div className="seo-cards">
        <div>
          <span>
            Lượt hiển thị
            <InfoTip label="Lượt hiển thị">
              Số lần website xuất hiện trong kết quả Google (khách có thể chưa
              bấm). Càng nhiều càng tốt: Google đang giới thiệu mình.
            </InfoTip>
          </span>
          <b>{nf(totals.i)}</b>
        </div>
        <div>
          <span>
            Lượt nhấp
            <InfoTip label="Lượt nhấp">
              Số lần khách bấm vào website từ Google. Đây là khách thật vào xem.
            </InfoTip>
          </span>
          <b>{nf(totals.c)}</b>
        </div>
        <div>
          <span>
            Tỉ lệ nhấp (CTR)
            <InfoTip label="Tỉ lệ nhấp (CTR)">
              Cứ 100 lần hiện thì bao nhiêu lần được bấm. Thấp nghĩa là tiêu đề
              và mô tả chưa hấp dẫn, hoặc trang đang ở thứ hạng thấp. Trang 1
              thường đạt 3–10%.
            </InfoTip>
          </span>
          <b>{pct(totals.i ? totals.c / totals.i : 0)}</b>
        </div>
        <div>
          <span>
            Thứ hạng trung bình
            <InfoTip label="Thứ hạng trung bình">
              Vị trí trung bình của website trên Google. 1–10 là trang 1 (khách
              thấy ngay), 11–20 là trang 2, trên 20 là trang 3 trở đi (rất ít
              người xem tới).
            </InfoTip>
          </span>
          <b>{nf(totals.i ? totals.p / totals.i : 0, 1)}</b>
        </div>
      </div>

      <div className="seo-views" role="tablist" aria-label="Loại từ khoá">
        {VIEWS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
          >
            {label} <small>{counts[key]}</small>
          </button>
        ))}
        <InfoTip label="Các nhóm từ khoá">
          <span>
            <b>Cơ hội lên trang 1</b>: khách mới tìm, website đang ở hạng 8–20.
            Làm nhóm này trước.
          </span>
          <span>
            <b>Khách mới tìm</b>: các cụm từ không có tên công ty (vd “thuê căn
            hộ đà nẵng”), là khách chưa biết Đất Vàng.
          </span>
          <span>
            <b>Tìm tên công ty</b>: khách đã biết, gõ “đất vàng…”. Thường đã
            đứng đầu, không cần làm gì.
          </span>
        </InfoTip>
        <label className="admin-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Tìm từ khoá"
            placeholder="Tìm từ khoá…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      {shown.length ? (
        <div className="table-scroll">
          <table className="seo-table">
            <thead>
              <tr>
                <th>Khách gõ trên Google</th>
                <th>
                  Thứ hạng
                  <InfoTip label="Thứ hạng">
                    Trang 1 = hạng 1–10, khách thấy ngay. Trang 2 = hạng 11–20.
                    Trang 3+ = rất ít người thấy.
                  </InfoTip>
                </th>
                <th>
                  Hiển thị
                  <InfoTip label="Hiển thị">
                    Số lần website hiện ra khi khách gõ cụm từ này.
                  </InfoTip>
                </th>
                <th>
                  Nhấp
                  <InfoTip label="Nhấp">
                    Số lần khách bấm vào website từ cụm từ này.
                  </InfoTip>
                </th>
                <th>Trang của mình hiện ra</th>
                <th aria-label="Việc nên làm" />
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 200).map((k) => {
                const top = k.pages[0];
                const more = k.pages.length - 1;
                return (
                  <tr key={k.query} data-near={nearTop(k)}>
                    <td className="seo-query">{k.query}</td>
                    <td>
                      <Place position={k.position} />
                    </td>
                    <td>{nf(k.impressions)}</td>
                    <td>
                      {nf(k.clicks)}
                      {k.clicks > 0 && <small> ({pct(k.ctr)})</small>}
                    </td>
                    <td>
                      <div className="seo-pages">
                        <a href={top.page} target="_blank" rel="noreferrer">
                          {pathOf(top.page)} <ArrowUpRight size={13} />
                        </a>
                        {more > 0 && (
                          <button
                            type="button"
                            className="seo-more"
                            aria-expanded={open === k.query}
                            onClick={() =>
                              setOpen(open === k.query ? "" : k.query)
                            }
                          >
                            {open === k.query
                              ? "Thu gọn"
                              : `+${more} trang khác`}
                          </button>
                        )}
                        {open === k.query &&
                          k.pages.slice(1).map((p) => (
                            <a
                              key={p.page}
                              href={p.page}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {pathOf(p.page)} · hạng {nf(p.position, 1)}
                            </a>
                          ))}
                      </div>
                    </td>
                    <td>
                      {!k.brand && rewrittenAt(top.page) ? (
                        <div className="seo-done">
                          <span>
                            <Check size={14} aria-hidden="true" /> Đã viết lại{" "}
                            {vnDate(rewrittenAt(top.page).slice(0, 10))}
                          </span>
                          <button type="button" onClick={() => suggest(top)}>
                            Viết lại lần nữa
                          </button>
                        </div>
                      ) : (
                        !k.brand && (
                          <Button
                            type="button"
                            size="sm"
                            variant={nearTop(k) ? "default" : "outline"}
                            onClick={() => suggest(top)}
                          >
                            <Sparkles size={14} aria-hidden="true" />
                            Viết lại bằng AI
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">
          {data.rows.length
            ? view === "chance"
              ? "Chưa có từ khoá nào ở hạng 8–20. Xem thẻ “Khách mới tìm” để thấy các cụm từ khác."
              : "Không có từ khoá phù hợp."
            : "Search Console chưa có dữ liệu trong khoảng này."}
        </p>
      )}
      <Dialog.Root open={!!asking} onOpenChange={(o) => !o && close()}>
        <Dialog.Portal>
          <Dialog.Overlay className="admin-dialog-overlay" />
          <Dialog.Content
            className="admin-dialog seo-dialog"
            aria-describedby="seo-dialog-desc"
          >
            <Dialog.Title>
              <Sparkles size={18} aria-hidden="true" /> Viết lại cho “
              {asking?.query}”
            </Dialog.Title>
            <Dialog.Description id="seo-dialog-desc" className="seo-muted">
              Trang:{" "}
              {proposal?.target.title ?? (asking ? pathOf(asking.page) : "")}.
              Đây là dòng chữ khách thấy trên Google; sửa được trước khi áp
              dụng, không có gì tự lưu.
            </Dialog.Description>
            <Dialog.Close className="admin-dialog-close" aria-label="Đóng">
              <X size={18} />
            </Dialog.Close>
            {!proposal ? (
              <p className="seo-writing" role="status">
                <Sparkles size={16} aria-hidden="true" /> AI đang viết tiêu đề
                và mô tả mới…
              </p>
            ) : (
              <>
                <div className="seo-compare">
                  <div>
                    <h4>Trang đang có</h4>
                    <SerpPreview
                      title={
                        proposal.current?.title ||
                        proposal.target.seoTitle ||
                        proposal.target.title
                      }
                      url={proposal.row.page}
                      text={
                        proposal.current?.description ||
                        proposal.target.seoDescription ||
                        "(chưa có mô tả: Google tự lấy một đoạn trong trang)"
                      }
                    />
                  </div>
                  <div>
                    <h4>Sau khi áp dụng</h4>
                    <SerpPreview
                      // The website adds the brand, as on every page.
                      title={
                        plain(proposal.seoTitle).includes("dat vang group")
                          ? proposal.seoTitle
                          : `${proposal.seoTitle} | Đất Vàng Group`
                      }
                      url={proposal.row.page}
                      text={proposal.seoDescription}
                    />
                  </div>
                </div>
                <label>
                  Tiêu đề ({proposal.seoTitle.length}/60 ký tự)
                  <input
                    value={proposal.seoTitle}
                    maxLength={70}
                    onChange={(e) =>
                      setProposal({ ...proposal, seoTitle: e.target.value })
                    }
                  />
                </label>
                <label>
                  Mô tả ({proposal.seoDescription.length}/160 ký tự)
                  <textarea
                    rows={3}
                    value={proposal.seoDescription}
                    maxLength={320}
                    onChange={(e) =>
                      setProposal({
                        ...proposal,
                        seoDescription: e.target.value,
                      })
                    }
                  />
                </label>
                <div className="seo-actions">
                  <Button type="button" onClick={apply}>
                    Áp dụng cho trang này
                  </Button>
                  <Button type="button" variant="outline" onClick={close}>
                    Bỏ qua
                  </Button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function SetupGuide() {
  return (
    <div className="seo-setup">
      <h3>Kết nối Google Search Console</h3>
      <p>
        Bảng từ khoá đọc dữ liệu trực tiếp từ Search Console (chỉ đọc). Cần làm
        một lần:
      </p>
      <ol>
        <li>
          Vào Google Cloud Console › chọn hoặc tạo dự án › bật{" "}
          <b>Google Search Console API</b>.
        </li>
        <li>
          IAM &amp; Admin › Service accounts › <b>Create service account</b> ›
          tab Keys › Add key › JSON (tải file về, giữ kín).
        </li>
        <li>
          Search Console › Cài đặt › Người dùng và quyền › Thêm người dùng: dán
          email của service account, quyền <b>Bị hạn chế</b>.
        </li>
        <li>
          Trên máy chủ API <b>đang chạy website này</b>, thêm vào file{" "}
          <code>.env</code> (mỗi biến một dòng, không có dấu phẩy cuối dòng):{" "}
          <code>GSC_SITE</code> (tên thuộc tính, vd{" "}
          <code>sc-domain:datvanggroup.vn</code>), <code>GSC_CLIENT_EMAIL</code>{" "}
          và <code>GSC_PRIVATE_KEY</code> (lấy từ file JSON), rồi khởi động lại
          API.
        </li>
      </ol>
    </div>
  );
}

/* ── Landing pages ─────────────────────────────────────────────────────── */

const EMPTY: Landing = {
  slug: "",
  purpose: "rent",
  h1: "",
  seoTitle: "",
  seoDescription: "",
  intro: "",
  filters: {},
  published: true,
};
const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
const KINDS: [string, string][] = [
  ["", "Mọi loại"],
  ["apartment", "Căn hộ"],
  ["shophouse", "Shophouse"],
  ["townhouse", "Nhà phố"],
  ["premises", "Mặt bằng"],
];
const ROOMS: [string, string][] = [
  ["", "Mọi số phòng"],
  ["0", "Studio"],
  ["1", "1 phòng ngủ"],
  ["2", "2 phòng ngủ"],
  ["3", "3 phòng ngủ"],
];
const FURNITURE: [string, string][] = [
  ["", "Mọi nội thất"],
  ["Đầy đủ nội thất", "Đầy đủ nội thất"],
  ["Nội thất cơ bản", "Nội thất cơ bản"],
];

/** The filters of a search URL pasted from the website. */
function filtersFromUrl(text: string): Partial<Landing> | null {
  try {
    const url = new URL(text.trim(), "https://datvanggroup.vn");
    const filters = Object.fromEntries(
      [...url.searchParams].filter(
        ([k, v]) => (LANDING_FILTERS as readonly string[]).includes(k) && v,
      ),
    );
    const sale =
      ["mua", "mua-ban"].includes(url.searchParams.get("nhu-cau") ?? "") ||
      url.pathname.includes("/mua-ban");
    return { filters, purpose: sale ? "sale" : "rent" };
  } catch {
    return null;
  }
}

/** A unit as the public API lists it: what a landing page filters on. */
type ApiUnit = {
  forRent: boolean;
  forSale: boolean;
  isDemo: boolean;
  floorNote: string | null;
  bedrooms: number;
  areaM2: number | string;
  rentPriceVnd: string | number | null;
  salePriceVnd: string | number | null;
  furnishing: string;
  location: string;
  project: { slug: string } | null;
  propertyType: { code: string; group: string } | null;
};
const FURNISHING: Record<string, string> = {
  FULL: "Đầy đủ nội thất",
  BASIC: "Nội thất cơ bản",
  NONE: "Không nội thất",
  ROUGH: "Bàn giao thô",
};
/** Whether a unit shows on a landing page (as lib/filter does on the site). */
function fits(u: ApiUnit, l: Pick<Landing, "purpose" | "filters">) {
  const f = l.filters;
  const kind =
    u.propertyType?.code === "shophouse"
      ? "shophouse"
      : (u.propertyType?.group ?? "apartment");
  const rent = Number(u.rentPriceVnd ?? 0) / 1e6;
  const sale = Number(u.salePriceVnd ?? 0) / 1e9;
  return (
    !u.isDemo &&
    (l.purpose === "sale" ? u.forSale && !u.floorNote : u.forRent) &&
    (!f.project || u.project?.slug === f.project) &&
    (!f.loai || kind === f.loai) &&
    (!f.bedrooms || u.bedrooms === Number(f.bedrooms)) &&
    (!f.price || rent <= Number(f.price)) &&
    (!f["gia-tu"] || rent >= Number(f["gia-tu"])) &&
    (!f["gia-ban"] || (sale > 0 && sale <= Number(f["gia-ban"]))) &&
    (!f["gia-ban-tu"] || sale >= Number(f["gia-ban-tu"])) &&
    (!f.area || Number(u.areaM2) >= Number(f.area)) &&
    (!f.furniture || FURNISHING[u.furnishing] === f.furniture) &&
    (!f.location || u.location === f.location)
  );
}
/** Every published unit, page by page. */
async function loadUnits() {
  const all: ApiUnit[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await api<{ data: ApiUnit[]; meta: { totalPages: number } }>(
      "GET",
      `/properties?pageSize=100&page=${page}`,
    );
    all.push(...res.data);
    if (page >= res.meta.totalPages) break;
  }
  return all;
}
/** The filters in words: "2 phòng ngủ · đến 20 triệu/tháng". */
function describe(f: Record<string, string>, projects: [string, string][]) {
  const label = (list: [string, string][], v: string) =>
    list.find(([k]) => k === v)?.[1] ?? v;
  const parts = [
    f.loai && label(KINDS, f.loai),
    f.bedrooms && label(ROOMS, f.bedrooms),
    f.project && label(projects, f.project),
    f.furniture,
    f["gia-tu"] && `từ ${f["gia-tu"]} triệu`,
    f.price && `đến ${f.price} triệu/tháng`,
    f["gia-ban-tu"] && `từ ${f["gia-ban-tu"]} tỷ`,
    f["gia-ban"] && `đến ${f["gia-ban"]} tỷ`,
    f.area && `từ ${f.area} m²`,
    f.location,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Mọi căn";
}

/**
 * Whether a page is worth indexing: enough units, and not the general list
 * again under another name (Google skips thin and near-duplicate pages).
 */
function quality(n: number | null, all: number | null) {
  if (n === null) return null;
  if (n === 0) return { weak: true, text: "Chưa có căn phù hợp" };
  if (n < MIN_LANDING_UNITS)
    return {
      weak: true,
      text: `Chỉ ${n} căn: Google chưa lập chỉ mục (cần từ ${MIN_LANDING_UNITS} căn)`,
    };
  if (all && n / all >= 0.85)
    return {
      weak: true,
      text: `${n}/${all} căn: gần trùng trang danh sách chung, Google dễ bỏ qua`,
    };
  return { weak: false, text: `${n} căn phù hợp` };
}

/** Pages worth having, ready to fill in with one click. */
const TEMPLATES: Landing[] = [
  {
    slug: "cho-thue-can-ho-2-phong-ngu-da-nang",
    purpose: "rent",
    h1: "Cho thuê căn hộ 2 phòng ngủ Đà Nẵng",
    seoTitle: "",
    seoDescription:
      "Căn hộ 2 phòng ngủ cho thuê tại Đà Nẵng: ảnh thật, giá theo tháng, đầy đủ nội thất, gần sông Hàn và biển. Gọi Đất Vàng Group hẹn xem căn.",
    intro:
      "Căn hộ 2 phòng ngủ phù hợp gia đình nhỏ hoặc hai người ở cùng. Danh sách dưới đây là các căn đang cho thuê, cập nhật theo tình trạng thực tế; mỗi căn có ảnh thật, diện tích và giá thuê theo tháng.",
    filters: { loai: "apartment", bedrooms: "2" },
    published: true,
  },
  {
    slug: "cho-thue-can-ho-studio-da-nang",
    purpose: "rent",
    h1: "Cho thuê căn hộ studio Đà Nẵng",
    seoTitle: "",
    seoDescription:
      "Căn hộ studio cho thuê tại Đà Nẵng, đầy đủ nội thất, vào ở ngay. Xem ảnh thật, giá theo tháng và hẹn xem căn cùng Đất Vàng Group.",
    intro:
      "Studio gọn gàng cho một người hoặc cặp đôi, đầy đủ nội thất để dọn vào ở ngay. Danh sách cập nhật theo các căn đang trống.",
    filters: { loai: "apartment", bedrooms: "0" },
    published: true,
  },
  {
    slug: "cho-thue-can-ho-1-phong-ngu-da-nang",
    purpose: "rent",
    h1: "Cho thuê căn hộ 1 phòng ngủ Đà Nẵng",
    seoTitle: "",
    seoDescription:
      "Căn hộ 1 phòng ngủ cho thuê tại Đà Nẵng: ảnh thật, giá theo tháng, nội thất đầy đủ. Xem căn trống và hẹn xem cùng Đất Vàng Group.",
    intro:
      "Căn hộ 1 phòng ngủ có phòng khách riêng, phù hợp người đi làm hoặc cặp đôi ở dài hạn tại Đà Nẵng.",
    filters: { loai: "apartment", bedrooms: "1" },
    published: true,
  },
  {
    slug: "can-ho-cho-thue-da-nang-duoi-20-trieu",
    purpose: "rent",
    h1: "Căn hộ cho thuê Đà Nẵng dưới 20 triệu/tháng",
    seoTitle: "",
    seoDescription:
      "Căn hộ cho thuê tại Đà Nẵng giá dưới 20 triệu mỗi tháng: studio, 1–2 phòng ngủ, ảnh thật và giá rõ ràng. Liên hệ Đất Vàng Group.",
    intro:
      "Các căn hộ cho thuê giá đến 20 triệu đồng mỗi tháng tại Đà Nẵng. Giá trên trang là giá chào thuê hiện tại; chi phí đầy đủ được xác nhận trước khi ký hợp đồng.",
    filters: { loai: "apartment", price: "20" },
    published: true,
  },
  {
    slug: "cho-thue-can-ho-day-du-noi-that-da-nang",
    purpose: "rent",
    h1: "Cho thuê căn hộ đầy đủ nội thất Đà Nẵng",
    seoTitle: "",
    seoDescription:
      "Căn hộ đầy đủ nội thất cho thuê tại Đà Nẵng, xách vali vào ở: ảnh thật, giá theo tháng, nhiều dự án ven sông Hàn. Đất Vàng Group.",
    intro:
      "Căn hộ đã có đủ nội thất và thiết bị, chỉ cần mang đồ cá nhân là vào ở được. Phù hợp người nước ngoài và khách thuê ngắn hạn.",
    filters: { loai: "apartment", furniture: "Đầy đủ nội thất" },
    published: true,
  },
  {
    slug: "cho-thue-shophouse-da-nang",
    purpose: "rent",
    h1: "Cho thuê shophouse Đà Nẵng",
    seoTitle: "",
    seoDescription:
      "Shophouse cho thuê tại Đà Nẵng, mặt tiền khối đế các dự án căn hộ: diện tích, giá thuê và vị trí rõ ràng. Liên hệ Đất Vàng Group.",
    intro:
      "Shophouse khối đế dự án căn hộ, phù hợp kinh doanh cà phê, cửa hàng, văn phòng giao dịch.",
    filters: { loai: "shophouse" },
    published: true,
  },
  {
    slug: "mua-ban-can-ho-2-phong-ngu-da-nang",
    purpose: "sale",
    h1: "Mua bán căn hộ 2 phòng ngủ Đà Nẵng",
    seoTitle: "",
    seoDescription:
      "Căn hộ 2 phòng ngủ đang bán tại Đà Nẵng: giá, diện tích, pháp lý và ảnh thật. Tư vấn mua bán cùng Đất Vàng Group.",
    intro:
      "Các căn hộ 2 phòng ngủ đang bán tại Đà Nẵng, thông tin giá và diện tích theo từng căn.",
    filters: { loai: "apartment", bedrooms: "2" },
    published: true,
  },
];

function Landings() {
  const [list, setList] = useState<Landing[] | null>(null);
  const [editing, setEditing] = useState<{
    index: number;
    item: Landing;
  } | null>(null);
  const [projects, setProjects] = useState<[string, string][]>([]);
  const [units, setUnits] = useState<ApiUnit[] | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api<{ data: { key: string; value: string | null }[] }>(
      "GET",
      "/admin/settings",
    )
      .then((res) =>
        setList(
          readLandings(
            res.data.find((s) => s.key === "seo.landings")?.value ?? "",
          ),
        ),
      )
      .catch((e) => toast.error(errorMessage(e)));
    api<{ data: { slug: string; name: string }[] }>(
      "GET",
      "/admin/projects?pageSize=100",
    )
      .then((res) => setProjects(res.data.map((p) => [p.slug, p.name])))
      .catch(() => {});
    loadUnits()
      .then(setUnits)
      .catch(() => setUnits([]));
  }, []);
  const count = (l: Pick<Landing, "purpose" | "filters">) =>
    units ? units.filter((u) => fits(u, l)).length : null;
  const check = (l: Pick<Landing, "purpose" | "filters">) =>
    quality(count(l), count({ purpose: l.purpose, filters: {} }));

  async function save(next: Landing[]) {
    setSaving(true);
    try {
      await api("PUT", "/admin/settings", {
        values: { "seo.landings": next.length ? JSON.stringify(next) : null },
      });
      setList(next);
      setEditing(null);
      toast.success("Đã lưu. Trang trên website cập nhật trong khoảng 1 phút.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!list) return <p role="status">Đang tải…</p>;
  if (editing)
    return (
      <LandingForm
        item={editing.item}
        projects={projects}
        count={count}
        check={check}
        saving={saving}
        onCancel={() => setEditing(null)}
        onSave={(item) =>
          save(
            editing.index < 0
              ? [...list, item]
              : list.map((x, i) => (i === editing.index ? item : x)),
          )
        }
      />
    );
  const taken = new Set(list.map((l) => `${l.purpose}/${l.slug}`));
  const ideas = TEMPLATES.filter((t) => !taken.has(`${t.purpose}/${t.slug}`));
  return (
    <div className="seo-landings">
      <div className="seo-help">
        <strong>Trang theo nhu cầu là gì?</strong> Là một trang danh sách căn
        dành riêng cho <b>một nhu cầu khách hay tìm</b>, ví dụ “cho thuê căn hộ
        2 phòng ngủ Đà Nẵng”. Trang có địa chỉ, tiêu đề và đoạn giới thiệu
        riêng, chỉ hiện các căn đúng nhu cầu đó và tự cập nhật khi căn được đăng
        hoặc cho thuê xong. Google ưu tiên trang nói đúng một nhu cầu, nên trang
        này dễ lên top cho cụm từ đó hơn trang danh sách chung.
        <div className="seo-example">
          <span>
            <small>Khách gõ trên Google</small>
            <b>“cho thuê căn hộ 2 phòng ngủ đà nẵng”</b>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
          <span>
            <small>Google đưa tới</small>
            <b>
              datvanggroup.vn/cho-thue/nhu-cau/cho-thue-can-ho-2-phong-ngu-da-nang
            </b>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
          <span>
            <small>Khách thấy</small>
            <b>Chỉ các căn 2 phòng ngủ đang cho thuê</b>
          </span>
        </div>
      </div>

      <div className="seo-section-head">
        <h3>
          Trang đã tạo <small>{list.length}</small>
        </h3>
        <Button
          type="button"
          onClick={() => setEditing({ index: -1, item: EMPTY })}
        >
          <Plus size={16} aria-hidden="true" /> Tạo trang trống
        </Button>
      </div>
      {list.length ? (
        <ul className="seo-landing-list">
          {list.map((l, i) => {
            const q = check(l);
            return (
              <li key={`${l.purpose}/${l.slug}`}>
                <div>
                  <strong>{l.h1}</strong>
                  <small>
                    {l.purpose === "sale" ? "Mua bán" : "Cho thuê"} ·{" "}
                    {describe(l.filters, projects)}
                  </small>
                  {q && (
                    <small className="seo-quality" data-weak={q.weak}>
                      {q.text}
                    </small>
                  )}
                  <small>{landingPath(l)}</small>
                </div>
                <span
                  className={`status-badge ${l.published ? "status-done" : ""}`}
                >
                  {l.published ? "Đang hiển thị" : "Nháp"}
                </span>
                {l.published && (
                  <a href={landingPath(l)} target="_blank" rel="noreferrer">
                    Xem trang <ArrowUpRight size={14} />
                  </a>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing({ index: i, item: l })}
                >
                  Sửa
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`Xoá ${l.h1}`}
                  disabled={saving}
                  onClick={() => {
                    if (window.confirm(`Xoá trang “${l.h1}”?`))
                      void save(list.filter((_, j) => j !== i));
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty-state">
          Chưa có trang nào. Chọn một gợi ý bên dưới để bắt đầu nhanh.
        </p>
      )}

      {ideas.length > 0 && (
        <>
          <div className="seo-section-head">
            <h3>
              Gợi ý trang nên tạo
              <InfoTip label="Gợi ý trang nên tạo">
                Các nhu cầu khách thuê và mua hay tìm nhất. Bấm “Dùng mẫu này”
                để mở form đã điền sẵn, xem lại rồi lưu. Số căn phù hợp tính
                theo dữ liệu hiện có. Mẫu dưới {MIN_LANDING_UNITS} căn hoặc gần
                trùng trang danh sách chung thì chưa nên tạo: Google sẽ bỏ qua
                trang đó.
              </InfoTip>
            </h3>
          </div>
          <ul className="seo-ideas">
            {ideas.map((t) => {
              const q = check(t);
              return (
                <li key={`${t.purpose}/${t.slug}`} data-empty={!!q?.weak}>
                  <strong>{t.h1}</strong>
                  <small>{describe(t.filters, projects)}</small>
                  <span className="seo-idea-count">
                    {q ? (
                      q.weak ? (
                        <>
                          <b>Chưa nên tạo</b> {q.text}
                        </>
                      ) : (
                        q.text
                      )
                    ) : (
                      "Đang đếm căn…"
                    )}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={q && !q.weak ? "default" : "outline"}
                    onClick={() => setEditing({ index: -1, item: t })}
                  >
                    Dùng mẫu này
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function LandingForm({
  item,
  projects,
  count,
  check,
  saving,
  onSave,
  onCancel,
}: {
  item: Landing;
  projects: [string, string][];
  count: (l: Pick<Landing, "purpose" | "filters">) => number | null;
  check: (
    l: Pick<Landing, "purpose" | "filters">,
  ) => ReturnType<typeof quality>;
  saving: boolean;
  onSave: (item: Landing) => void;
  onCancel: () => void;
}) {
  const [l, setL] = useState<Landing>(item);
  const [slugTouched, setSlugTouched] = useState(!!item.slug);
  const [pasted, setPasted] = useState("");
  // Fields whose label also holds an (i) button are tied to it by id.
  const id = useId();
  const set = (patch: Partial<Landing>) => setL((x) => ({ ...x, ...patch }));
  const filter = (key: string, value: string) =>
    set({
      filters: Object.fromEntries(
        Object.entries({ ...l.filters, [key]: value }).filter(([, v]) => v),
      ),
    });
  const select = (key: string, label: string, options: [string, string][]) => (
    <label>
      {label}
      <select
        value={l.filters[key] ?? ""}
        onChange={(e) => filter(key, e.target.value)}
      >
        {options.map(([v, name]) => (
          <option key={v} value={v}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
  const number = (key: string, label: string) => (
    <label>
      {label}
      <input
        inputMode="decimal"
        value={l.filters[key] ?? ""}
        onChange={(e) => filter(key, e.target.value.replace(/[^\d.]/g, ""))}
      />
    </label>
  );
  const sale = l.purpose === "sale";
  const n = count(l);
  const q = check(l);
  const path = landingPath({ purpose: l.purpose, slug: l.slug || "…" });
  const title = l.seoTitle || l.h1 || "Tiêu đề trang";
  return (
    <form
      className="seo-landing-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...l, slug: l.slug || slugify(l.h1) });
      }}
    >
      <fieldset>
        <legend>
          <span className="seo-step">1</span> Khách tìm gì?
        </legend>
        <div className="form-grid">
          <label>
            Nhu cầu
            <select
              value={l.purpose}
              onChange={(e) =>
                set({ purpose: e.target.value as Landing["purpose"] })
              }
            >
              <option value="rent">Cho thuê</option>
              <option value="sale">Mua bán</option>
            </select>
          </label>
          <label className="seo-wide" htmlFor={`${id}-h1`}>
            <span className="seo-label">
              Tiêu đề trang (H1) *
              <InfoTip label="Tiêu đề trang">
                Dòng chữ lớn nhất trên trang. Viết đúng cụm từ khách hay gõ, vd
                “Cho thuê căn hộ 2 phòng ngủ Đà Nẵng”.
              </InfoTip>
            </span>
            <input
              id={`${id}-h1`}
              required
              minLength={5}
              maxLength={120}
              value={l.h1}
              placeholder="Cho thuê căn hộ 2 phòng ngủ Đà Nẵng"
              onChange={(e) =>
                set({
                  h1: e.target.value,
                  ...(slugTouched ? {} : { slug: slugify(e.target.value) }),
                })
              }
            />
          </label>
          <label className="seo-wide" htmlFor={`${id}-slug`}>
            <span className="seo-label">
              Đường dẫn
              <InfoTip label="Đường dẫn">
                Địa chỉ của trang trên website, tự tạo từ tiêu đề (chữ thường,
                không dấu). Nên giữ nguyên sau khi đã đăng để Google không mất
                trang.
              </InfoTip>
            </span>
            <span className="seo-slug">
              <span>/{sale ? "mua-ban" : "cho-thue"}/nhu-cau/</span>
              <input
                id={`${id}-slug`}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={80}
                value={l.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set({ slug: slugify(e.target.value) });
                }}
              />
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>
          <span className="seo-step">2</span> Trang hiện những căn nào?
          <InfoTip label="Bộ lọc">
            Chọn điều kiện; trang chỉ hiện các căn đúng điều kiện và tự cập
            nhật. Để trống ô nào là không lọc theo ô đó.
          </InfoTip>
        </legend>
        <div className="form-grid">
          {select("loai", "Loại", KINDS)}
          {select("bedrooms", "Phòng ngủ", ROOMS)}
          {select("project", "Dự án", [["", "Mọi dự án"], ...projects])}
          {select("furniture", "Nội thất", FURNITURE)}
          {sale ? (
            <>
              {number("gia-ban-tu", "Giá bán từ (tỷ)")}
              {number("gia-ban", "Giá bán đến (tỷ)")}
            </>
          ) : (
            <>
              {number("gia-tu", "Giá thuê từ (triệu/tháng)")}
              {number("price", "Giá thuê đến (triệu/tháng)")}
            </>
          )}
          {number("area", "Diện tích từ (m²)")}
        </div>
        <p className="seo-fit" data-empty={!!q?.weak}>
          {n === null || !q
            ? "Đang đếm căn…"
            : n === 0
              ? "Chưa có căn nào phù hợp. Trang sẽ trống, nên nới bộ lọc."
              : q.weak
                ? `${q.text}. Trang vẫn mở cho khách xem; nên đổi bộ lọc cho hẹp/rộng hơn.`
                : `Hiện có ${n} căn phù hợp: ${describe(l.filters, projects)}.`}
        </p>
        <details className="seo-paste">
          <summary>
            Hoặc dán link tìm kiếm trên website để tự điền bộ lọc
          </summary>
          <div>
            <input
              aria-label="Link tìm kiếm"
              placeholder="https://datvanggroup.vn/cho-thue?bedrooms=2&price=20"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const found = filtersFromUrl(pasted);
                if (!found) return toast.error("Link không đọc được.");
                set(found);
                toast.success("Đã lấy bộ lọc từ link.");
              }}
            >
              Lấy bộ lọc
            </Button>
          </div>
        </details>
      </fieldset>

      <fieldset>
        <legend>
          <span className="seo-step">3</span> Khách thấy gì trên Google?
        </legend>
        <SerpPreview
          title={
            plain(title).includes("dat vang group")
              ? title
              : `${title} | Đất Vàng Group`
          }
          url={`https://datvanggroup.vn${path}`}
          text={
            l.seoDescription ||
            l.intro ||
            "(viết mô tả bên dưới: 1–2 câu giới thiệu trang)"
          }
        />
        <div className="form-grid">
          <label className="seo-wide" htmlFor={`${id}-title`}>
            <span className="seo-label">
              Tiêu đề trên Google ({l.seoTitle.length}/60)
              <InfoTip label="Tiêu đề trên Google">
                Dòng chữ xanh khách bấm vào trên Google. Để trống thì dùng tiêu
                đề trang ở bước 1.
              </InfoTip>
            </span>
            <input
              id={`${id}-title`}
              maxLength={70}
              value={l.seoTitle}
              placeholder={l.h1}
              onChange={(e) => set({ seoTitle: e.target.value })}
            />
          </label>
          <label className="seo-wide" htmlFor={`${id}-desc`}>
            <span className="seo-label">
              Mô tả trên Google ({l.seoDescription.length}/160)
              <InfoTip label="Mô tả trên Google">
                1–2 câu dưới tiêu đề trên Google, nói trang có gì để khách muốn
                bấm vào.
              </InfoTip>
            </span>
            <textarea
              id={`${id}-desc`}
              rows={2}
              maxLength={320}
              value={l.seoDescription}
              onChange={(e) => set({ seoDescription: e.target.value })}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>
          <span className="seo-step">4</span> Đoạn giới thiệu trên trang
          <InfoTip label="Đoạn giới thiệu">
            Hiện ngay dưới ảnh đầu trang, trước danh sách căn. Vài câu hữu ích
            cho khách (ai hợp với loại căn này, giá khoảng bao nhiêu…) giúp
            Google hiểu trang hơn. Xuống dòng 2 lần để tách đoạn.
          </InfoTip>
        </legend>
        <textarea
          aria-label="Đoạn giới thiệu"
          rows={5}
          maxLength={3000}
          value={l.intro}
          onChange={(e) => set({ intro: e.target.value })}
        />
        <label className="seo-check">
          <input
            type="checkbox"
            checked={l.published}
            onChange={(e) => set({ published: e.target.checked })}
          />
          Hiển thị trên website và gửi Google
        </label>
      </fieldset>

      <div className="seo-actions">
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu trang"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}
