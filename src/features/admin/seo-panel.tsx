"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LANDING_FILTERS,
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
};

const pathOf = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname) || "/";
  } catch {
    return url;
  }
};
/** Page 2 of Google, close enough to page 1 to be worth the work. */
const nearTop = (r: Row) => r.position >= 8 && r.position <= 20;

function Keywords() {
  const [days, setDays] = useState<7 | 28 | 90>(28);
  const [data, setData] = useState<KeywordData | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [onlyNear, setOnlyNear] = useState(false);
  const [busy, setBusy] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
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

  const rows = useMemo(() => {
    const words = q.trim().toLowerCase();
    return (data?.rows ?? [])
      .filter((r) => (!onlyNear || nearTop(r)) && r.query.includes(words))
      .sort((a, b) => b.impressions - a.impressions);
  }, [data, q, onlyNear]);
  const near = (data?.rows ?? []).filter(nearTop).length;
  const totals = (data?.rows ?? []).reduce(
    (s, r) => ({ c: s.c + r.clicks, i: s.i + r.impressions }),
    { c: 0, i: 0 },
  );

  async function suggest(row: Row) {
    setBusy(`${row.query}|${row.page}`);
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
      setProposal({ row, target: res.data.target, ...res.data.suggestion });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
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
      toast.success(
        "Đã áp dụng. Google cập nhật kết quả sau vài ngày; xem lại vị trí sau 2–3 tuần.",
      );
      setProposal(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (error) return <p className="seo-error">{error}</p>;
  if (!data) return <p role="status">Đang lấy dữ liệu từ Search Console…</p>;
  if (!data.configured) return <SetupGuide />;
  return (
    <div className="seo-keywords">
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
        <label className="admin-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Tìm từ khoá"
            placeholder="Tìm từ khoá…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="seo-near"
          aria-pressed={onlyNear}
          onClick={() => setOnlyNear(!onlyNear)}
        >
          <TrendingUp size={16} aria-hidden="true" /> Gần trang 1 ({near})
        </button>
      </div>
      <p className="seo-muted">
        {data.site} · {data.from} → {data.to} · {data.rows.length} cặp từ khoá –
        trang · {totals.i.toLocaleString("vi-VN")} lượt hiển thị ·{" "}
        {totals.c.toLocaleString("vi-VN")} lượt nhấp. &quot;Gần trang 1&quot;:
        vị trí 8–20, nơi sửa tiêu đề và mô tả dễ đưa trang lên trang 1 nhất.
      </p>

      {proposal && (
        <div className="seo-proposal" role="region" aria-label="Gợi ý của AI">
          <h3>
            <Sparkles size={17} aria-hidden="true" /> Gợi ý cho “
            {proposal.row.query}”
          </h3>
          <p className="seo-muted">
            Trang: <strong>{proposal.target.title}</strong> (
            {pathOf(proposal.row.page)})
          </p>
          <div className="seo-compare">
            <div>
              <h4>Hiện tại</h4>
              <p>
                <b>{proposal.target.seoTitle || "(chưa có tiêu đề SEO)"}</b>
              </p>
              <p>{proposal.target.seoDescription || "(chưa có mô tả SEO)"}</p>
            </div>
            <div>
              <h4>Đề xuất (sửa được trước khi áp dụng)</h4>
              <label>
                Tiêu đề SEO ({proposal.seoTitle.length}/60)
                <input
                  value={proposal.seoTitle}
                  maxLength={70}
                  onChange={(e) =>
                    setProposal({ ...proposal, seoTitle: e.target.value })
                  }
                />
              </label>
              <label>
                Mô tả SEO ({proposal.seoDescription.length}/160)
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
            </div>
          </div>
          <div className="seo-actions">
            <Button type="button" onClick={apply}>
              Áp dụng cho trang này
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProposal(null)}
            >
              Bỏ qua
            </Button>
          </div>
        </div>
      )}

      {rows.length ? (
        <div className="table-scroll">
          <table className="seo-table">
            <thead>
              <tr>
                <th>Từ khoá</th>
                <th>Trang</th>
                <th>Vị trí</th>
                <th>Hiển thị</th>
                <th>Nhấp</th>
                <th>CTR</th>
                <th aria-label="Gợi ý" />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r) => (
                <tr key={`${r.query}|${r.page}`} data-near={nearTop(r)}>
                  <td>{r.query}</td>
                  <td>
                    <a href={r.page} target="_blank" rel="noreferrer">
                      {pathOf(r.page)} <ArrowUpRight size={13} />
                    </a>
                  </td>
                  <td>
                    <span className="seo-pos" data-near={nearTop(r)}>
                      {r.position.toLocaleString("vi-VN")}
                    </span>
                  </td>
                  <td>{r.impressions.toLocaleString("vi-VN")}</td>
                  <td>{r.clicks.toLocaleString("vi-VN")}</td>
                  <td>
                    {(r.ctr * 100).toLocaleString("vi-VN", {
                      maximumFractionDigits: 1,
                    })}
                    %
                  </td>
                  <td>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!!busy}
                      onClick={() => suggest(r)}
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      {busy === `${r.query}|${r.page}`
                        ? "Đang viết…"
                        : "Gợi ý AI"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">
          {data.rows.length
            ? "Không có từ khoá phù hợp bộ lọc."
            : "Search Console chưa có dữ liệu trong khoảng này."}
        </p>
      )}
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
  published: false,
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

function Landings() {
  const [list, setList] = useState<Landing[] | null>(null);
  const [editing, setEditing] = useState<{
    index: number;
    item: Landing;
  } | null>(null);
  const [projects, setProjects] = useState<[string, string][]>([]);
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
  }, []);

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
  return (
    <div className="seo-landings">
      <div className="seo-toolbar">
        <p className="seo-muted">
          Mỗi trang là một tìm kiếm cố định có địa chỉ, tiêu đề và đoạn giới
          thiệu riêng, để Google xếp hạng cho đúng cụm từ khách gõ (vd “cho thuê
          căn hộ 2 phòng ngủ Đà Nẵng”). Danh sách căn tự cập nhật.
        </p>
        <Button
          type="button"
          onClick={() => setEditing({ index: -1, item: EMPTY })}
        >
          <Plus size={16} aria-hidden="true" /> Thêm trang
        </Button>
      </div>
      {list.length ? (
        <ul className="seo-landing-list">
          {list.map((l, i) => (
            <li key={`${l.purpose}/${l.slug}`}>
              <div>
                <strong>{l.h1}</strong>
                <small>
                  {landingPath(l)} ·{" "}
                  {Object.entries(l.filters)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(", ") || "không lọc"}
                </small>
              </div>
              <span
                className={`status-badge ${l.published ? "status-done" : ""}`}
              >
                {l.published ? "Đang hiển thị" : "Nháp"}
              </span>
              {l.published && (
                <a href={landingPath(l)} target="_blank" rel="noreferrer">
                  Xem <ArrowUpRight size={14} />
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
          ))}
        </ul>
      ) : (
        <p className="empty-state">Chưa có trang theo nhu cầu nào.</p>
      )}
    </div>
  );
}

function LandingForm({
  item,
  projects,
  saving,
  onSave,
  onCancel,
}: {
  item: Landing;
  projects: [string, string][];
  saving: boolean;
  onSave: (item: Landing) => void;
  onCancel: () => void;
}) {
  const [l, setL] = useState<Landing>(item);
  const [slugTouched, setSlugTouched] = useState(!!item.slug);
  const [pasted, setPasted] = useState("");
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
  return (
    <form
      className="seo-landing-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...l, slug: l.slug || slugify(l.h1) });
      }}
    >
      <div className="seo-paste">
        <label>
          Dán link tìm kiếm trên website (tự điền bộ lọc)
          <input
            placeholder="https://datvanggroup.vn/cho-thue?bedrooms=2&price=20"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
          />
        </label>
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
        <label className="seo-wide">
          Tiêu đề trang (H1) *
          <input
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
        <label className="seo-wide">
          Đường dẫn
          <span className="seo-slug">
            <span>/{sale ? "mua-ban" : "cho-thue"}/nhu-cau/</span>
            <input
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
        <label className="seo-wide">
          Tiêu đề SEO ({l.seoTitle.length}/60, trống = dùng tiêu đề trang)
          <input
            maxLength={70}
            value={l.seoTitle}
            onChange={(e) => set({ seoTitle: e.target.value })}
          />
        </label>
        <label className="seo-wide">
          Mô tả SEO ({l.seoDescription.length}/160)
          <textarea
            rows={2}
            maxLength={320}
            value={l.seoDescription}
            onChange={(e) => set({ seoDescription: e.target.value })}
          />
        </label>
        <label className="seo-wide">
          Đoạn giới thiệu (hiện trên trang, xuống dòng 2 lần để tách đoạn)
          <textarea
            rows={5}
            maxLength={3000}
            value={l.intro}
            onChange={(e) => set({ intro: e.target.value })}
          />
        </label>
        <label className="seo-check">
          <input
            type="checkbox"
            checked={l.published}
            onChange={(e) => set({ published: e.target.checked })}
          />
          Hiển thị trên website và gửi Google
        </label>
      </div>
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
