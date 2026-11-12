"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BadgeDollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImageOff,
  KeyRound,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import { availabilityOptions, type AdminDto } from "./adapters";
import { savedRange } from "./dashboard-range";
import { ConfirmDialog } from "./error-dialog";
import {
  highlightLabel,
  highlightOptions,
  TRENDING_LABEL,
} from "@/lib/highlights";

/** The count of hidden units the note was closed at (this browser). */
const DELISTED_SEEN_KEY = "dvg:admin-delisted-seen";

type Stats = {
  total: number;
  published: number;
  draft: number;
  availability: Record<string, number>;
  highlighted: number;
  demo: number;
  /** Rented / sold over `hideDays` days ago: off the site. */
  delisted?: number;
  hideDays?: number;
  kinds?: { unit: number; model: number };
};
type Filters = {
  /** The list's two tabs: units posted for rent / sale, or model apartments. */
  kind: "unit" | "model";
  q: string;
  status: string;
  project: string;
  availability: string;
  listing: string;
  highlight: string;
  sort: string;
  pageSize: number;
};
const EMPTY: Filters = {
  kind: "unit",
  q: "",
  status: "",
  project: "",
  availability: "",
  listing: "",
  highlight: "",
  sort: "created",
  pageSize: 20,
};
/** Filters survive opening a unit and coming back (this browser tab only). */
const STORE = "dvg:admin-units";
function savedFilters(): Filters {
  try {
    return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(STORE) ?? "{}") };
  } catch {
    return EMPTY;
  }
}

const SORTS: [string, string][] = [
  ["created", "Mới tạo trước"],
  ["updated", "Mới sửa trước"],
  ["name", "Tên A → Z"],
  ["price-asc", "Giá thuê thấp → cao"],
  ["price-desc", "Giá thuê cao → thấp"],
  ["area", "Diện tích lớn trước"],
];
const availabilityLabel = (value: string) =>
  availabilityOptions.find(([key]) => key === value)?.[1] ?? value;
/** Under a rented / sold unit: when it leaves the website, or that it has. */
function siteNote(u: AdminDto, days: number) {
  if (u.availability !== "RENTED" && u.availability !== "SOLD") return "";
  if (u.delisted) return "Đã ẩn khỏi website";
  const since = Date.parse(String(u.availabilityChangedAt ?? ""));
  if (!since) return "";
  const left = Math.ceil((since + days * 86_400_000 - Date.now()) / 86_400_000);
  return left > 0
    ? `Tự ẩn khỏi website sau ${left} ngày`
    : "Đã ẩn khỏi website";
}
const vnd = (value: unknown) =>
  value ? `${Number(value).toLocaleString("vi-VN")} đ` : "";
const saleText = (value: unknown) => {
  const n = Number(value);
  const fmt = (v: number) =>
    v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  return n >= 1e9 ? `${fmt(n / 1e9)} tỷ` : `${fmt(n / 1e6)} triệu`;
};
const shortDate = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "";

type Unit = AdminDto & {
  id: string;
  name: string;
  slug: string;
  status: string;
  availability: string;
};

/**
 * "Căn hộ" in Admin, built for hundreds of units: summary cards that filter,
 * search with filters and sorting, a compact table with photos, inline
 * availability / publish changes, bulk actions on selected rows and pages.
 */
export function PropertiesList({
  canWrite,
  goTo,
  onArchive,
  reloadKey,
}: {
  canWrite: boolean;
  goTo: (href: string) => void;
  onArchive: (unit: { id: string; name: string }) => void;
  /** Changes after a unit was archived from outside (reloads the list). */
  reloadKey: number;
}) {
  const [filters, setFilters] = useState<Filters>(savedFilters);
  const [page, setPage] = useState(1);
  const [interestDays] = useState(savedRange);
  const [rows, setRows] = useState<Unit[] | null>(null);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  // The note on hidden units, once closed, stays closed until the count changes.
  const [seenDelisted, setSeenDelisted] = useState(() => {
    try {
      return Number(localStorage.getItem(DELISTED_SEEN_KEY)) || 0;
    } catch {
      return 0;
    }
  });
  const [projects, setProjects] = useState<[string, string][]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [bulkArchive, setBulkArchive] = useState(false);
  const request = useRef(0);

  const set = (patch: Partial<Filters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      try {
        sessionStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        /* storage blocked: filters reset on reload */
      }
      return next;
    });
    setPage(1);
    setSelected(new Set());
  };

  const load = useCallback(async () => {
    const id = ++request.current;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(filters.pageSize),
      sort: filters.sort,
      kind: filters.kind,
      // Views over the period chosen on "Tổng quan", so both agree.
      interestDays: String(interestDays),
    });
    for (const key of [
      "q",
      "status",
      "project",
      "availability",
      "listing",
      "highlight",
    ] as const)
      if (filters[key]) params.set(key, filters[key]);
    try {
      const [list, summary] = await Promise.all([
        api<{ data: Unit[]; meta: { total: number } }>(
          "GET",
          `/admin/properties?${params}`,
        ),
        api<{ data: Stats }>(
          "GET",
          `/admin/properties/stats?kind=${filters.kind}`,
        ),
      ]);
      if (id !== request.current) return;
      setRows(list.data);
      setTotal(list.meta.total);
      setStats(summary.data);
    } catch (error) {
      if (id !== request.current) return;
      toast.error(errorMessage(error));
      setRows([]);
    }
  }, [filters, page, interestDays]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), filters.q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, filters.q, reloadKey]);
  useEffect(() => {
    api<{ data: { slug: string; name: string }[] }>(
      "GET",
      "/admin/projects?pageSize=100",
    )
      .then((res) => setProjects(res.data.map((p) => [p.slug, p.name])))
      .catch(() => {});
  }, []);

  /** PATCH several units; reports how many failed. */
  async function change(ids: string[], body: Record<string, unknown>) {
    setBusy(true);
    let failed = 0;
    let lastError: unknown;
    for (const id of ids) {
      try {
        await api("PATCH", `/admin/properties/${id}`, body);
      } catch (error) {
        failed++;
        lastError = error;
      }
    }
    setBusy(false);
    if (failed)
      toast.error(
        `${failed}/${ids.length} căn chưa cập nhật được: ${errorMessage(lastError)}`,
      );
    else
      toast.success(
        ids.length > 1 ? `Đã cập nhật ${ids.length} căn.` : "Đã cập nhật.",
      );
    setSelected(new Set());
    await load();
  }
  async function archive(ids: string[]) {
    setBulkArchive(false);
    setBusy(true);
    let failed = 0;
    for (const id of ids)
      await api("DELETE", `/admin/properties/${id}`).catch(() => failed++);
    setBusy(false);
    if (failed) toast.error(`${failed}/${ids.length} căn chưa lưu trữ được.`);
    else toast.success(`Đã chuyển ${ids.length} căn vào lưu trữ.`);
    setSelected(new Set());
    await load();
  }

  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  const active = Object.entries(filters).some(
    ([key, value]) =>
      !["kind", "sort", "pageSize"].includes(key) &&
      value !== EMPTY[key as keyof Filters],
  );
  const allChecked = !!rows?.length && rows.every((r) => selected.has(r.id));
  const ids = [...selected];
  const cards: {
    label: string;
    value?: number;
    patch: Partial<Filters>;
    on: boolean;
  }[] = [
    {
      label: "Tổng căn hộ",
      value: stats?.total,
      patch: { status: "", availability: "" },
      on: !filters.status && !filters.availability,
    },
    {
      label: "Đã xuất bản",
      value: stats?.published,
      patch: { status: "PUBLISHED" },
      on: filters.status === "PUBLISHED",
    },
    {
      label: "Bản nháp",
      value: stats?.draft,
      patch: { status: "DRAFT" },
      on: filters.status === "DRAFT",
    },
    {
      label: "Còn trống",
      value: stats?.availability.AVAILABLE ?? 0,
      patch: { availability: "AVAILABLE" },
      on: filters.availability === "AVAILABLE",
    },
    {
      label: "Đã cho thuê",
      value: stats?.availability.RENTED ?? 0,
      patch: { availability: "RENTED" },
      on: filters.availability === "RENTED",
    },
    {
      label: "Đã giữ chỗ",
      value: stats?.availability.RESERVED ?? 0,
      patch: { availability: "RESERVED" },
      on: filters.availability === "RESERVED",
    },
  ];

  return (
    <div className="units">
      <div className="units-kinds" role="group" aria-label="Loại căn">
        {(
          [
            ["unit", "Căn đăng thuê / bán", stats?.kinds?.unit],
            ["model", "Căn mẫu dự án", stats?.kinds?.model],
          ] as const
        ).map(([kind, label, count]) => (
          <button
            key={kind}
            type="button"
            aria-pressed={filters.kind === kind}
            onClick={() => set({ ...EMPTY, kind, pageSize: filters.pageSize })}
          >
            {label} <small>{count ?? "–"}</small>
          </button>
        ))}
      </div>
      <div className="units-stats" role="group" aria-label="Tóm tắt căn hộ">
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            className="units-stat"
            aria-pressed={c.on}
            onClick={() => set(c.patch)}
          >
            <strong>{c.value ?? "–"}</strong>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      {!filters.availability &&
        !filters.q &&
        !!stats?.delisted &&
        stats.delisted !== seenDelisted && (
          <p className="units-delisted-note">
            {stats.delisted} căn đã cho thuê hoặc đã bán quá {stats.hideDays}{" "}
            ngày đã tự ẩn khỏi website và không hiện trong danh sách này.{" "}
            <button
              type="button"
              onClick={() => set({ availability: "RENTED" })}
            >
              Xem mục Đã cho thuê
            </button>
            <button
              type="button"
              className="units-delisted-close"
              aria-label="Đóng thông báo"
              onClick={() => {
                setSeenDelisted(stats.delisted ?? 0);
                try {
                  localStorage.setItem(
                    DELISTED_SEEN_KEY,
                    String(stats.delisted),
                  );
                } catch {
                  /* storage blocked: closed for this visit only */
                }
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </p>
        )}

      <section className="admin-panel units-panel">
        <div className="units-toolbar">
          <label className="admin-search units-search">
            <Search size={18} />
            <input
              aria-label="Tìm căn hộ"
              placeholder="Tìm tên, mã căn, dự án, khu vực…"
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
            />
          </label>
          <select
            aria-label="Lọc dự án"
            value={filters.project}
            onChange={(e) => set({ project: e.target.value })}
          >
            <option value="">Tất cả dự án</option>
            {projects.map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái đăng"
            value={filters.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            <option value="">Mọi trạng thái đăng</option>
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="DRAFT">Bản nháp</option>
          </select>
          <select
            aria-label="Lọc tình trạng"
            value={filters.availability}
            onChange={(e) => set({ availability: e.target.value })}
          >
            <option value="">Mọi tình trạng</option>
            {availabilityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc hình thức"
            value={filters.listing}
            onChange={(e) => set({ listing: e.target.value })}
          >
            <option value="">Thuê & bán</option>
            <option value="rent">Cho thuê</option>
            <option value="sale">Bán</option>
          </select>
          <select
            aria-label="Lọc nhãn"
            value={filters.highlight}
            onChange={(e) => set({ highlight: e.target.value })}
          >
            <option value="">Mọi nhãn</option>
            {highlightOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
            <option value="none">Chưa gắn nhãn</option>
          </select>
          <select
            aria-label="Sắp xếp"
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value })}
          >
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {active && (
            <button
              type="button"
              className="units-clear"
              onClick={() =>
                set({
                  ...EMPTY,
                  kind: filters.kind,
                  sort: filters.sort,
                  pageSize: filters.pageSize,
                })
              }
            >
              <X size={14} /> Bỏ lọc
            </button>
          )}
          <span className="units-count" role="status">
            {rows ? `${total} căn` : "Đang tải…"}
          </span>
        </div>

        {canWrite && ids.length > 0 && (
          <div
            className="units-bulk"
            role="region"
            aria-label="Thao tác hàng loạt"
          >
            <strong>Đã chọn {ids.length} căn</strong>
            <button
              type="button"
              disabled={busy}
              onClick={() => change(ids, { status: "PUBLISHED" })}
            >
              Xuất bản
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => change(ids, { status: "DRAFT" })}
            >
              Chuyển nháp
            </button>
            <select
              aria-label="Đổi tình trạng các căn đã chọn"
              disabled={busy}
              value=""
              onChange={(e) =>
                e.target.value && change(ids, { availability: e.target.value })
              }
            >
              <option value="">Đổi tình trạng…</option>
              {availabilityOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => setBulkArchive(true)}
            >
              Lưu trữ
            </button>
            <button
              type="button"
              className="units-bulk-cancel"
              onClick={() => setSelected(new Set())}
            >
              Bỏ chọn
            </button>
          </div>
        )}

        <div className="table-scroll units-scroll">
          <table className="units-table">
            <thead>
              <tr>
                {canWrite && (
                  <th className="units-check">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả căn trên trang"
                      checked={allChecked}
                      onChange={() =>
                        setSelected(
                          allChecked
                            ? new Set()
                            : new Set(rows?.map((r) => r.id)),
                        )
                      }
                    />
                  </th>
                )}
                <th>Căn hộ</th>
                <th>Dự án · Loại</th>
                <th>Giá</th>
                <th>Tình trạng · Đăng</th>
                <th title="Cùng khoảng thời gian đã chọn ở Tổng quan">
                  Quan tâm ({interestDays} ngày)
                </th>
                <th>Người đăng · Cập nhật</th>
                <th>
                  <span className="units-sr">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((u) => {
                const project = u.project as { name: string } | undefined;
                const cover = u.coverImage as { url: string } | null;
                const interest = u.interest as
                  { views: number; leads: number } | undefined;
                const badges = [
                  u.isDemo && "Căn mẫu",
                  highlightLabel(u.highlight as string),
                  u.trending && TRENDING_LABEL,
                ].filter(Boolean) as string[];
                const published = u.status === "PUBLISHED";
                const href = u.forRent
                  ? `/cho-thue/${u.slug}`
                  : `/mua-ban/${u.slug}`;
                return (
                  <tr
                    key={u.id}
                    data-selected={selected.has(u.id) || undefined}
                  >
                    {canWrite && (
                      <td className="units-check">
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${u.name}`}
                          checked={selected.has(u.id)}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (next.has(u.id)) next.delete(u.id);
                              else next.add(u.id);
                              return next;
                            })
                          }
                        />
                      </td>
                    )}
                    <td>
                      <div className="units-name">
                        <span className="units-thumb">
                          {cover?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover.url} alt="" loading="lazy" />
                          ) : (
                            <ImageOff size={18} aria-hidden="true" />
                          )}
                        </span>
                        <span>
                          <button
                            type="button"
                            className="units-title"
                            onClick={() =>
                              goTo(`/admin/properties/${u.id}/edit`)
                            }
                          >
                            {u.name}
                          </button>
                          <small>
                            <b>{String(u.unitCode ?? "")}</b>
                            {u.slug}
                          </small>
                          {badges.length > 0 && (
                            <span className="units-badges">
                              {badges.map((b) => (
                                <em key={b}>{b}</em>
                              ))}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="units-project">
                      {project?.name}
                      <small>
                        {Number(u.bedrooms) > 0
                          ? `${u.bedrooms} PN`
                          : ((u.propertyType as { name?: string } | undefined)
                              ?.name ?? "Studio")}{" "}
                        · {Number(u.areaM2)} m²
                      </small>
                    </td>
                    <td className="units-price">
                      {!!u.forRent && (
                        <span>
                          <KeyRound size={12} aria-hidden="true" />
                          {vnd(u.rentPriceVnd) || "Chưa có giá"}
                        </span>
                      )}
                      {!!u.forSale && (
                        <span data-mode="sale">
                          <BadgeDollarSign size={12} aria-hidden="true" />
                          {u.salePriceVnd
                            ? saleText(u.salePriceVnd)
                            : "Chưa có giá"}
                        </span>
                      )}
                    </td>
                    <td className="units-state">
                      {canWrite ? (
                        <select
                          className="units-availability"
                          data-value={u.availability}
                          aria-label={`Tình trạng ${u.name}`}
                          value={u.availability}
                          disabled={busy}
                          onChange={(e) =>
                            change([u.id], { availability: e.target.value })
                          }
                        >
                          {availabilityOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        availabilityLabel(u.availability)
                      )}
                      {siteNote(u, stats?.hideDays ?? 5) && (
                        <small className="units-site-note">
                          {siteNote(u, stats?.hideDays ?? 5)}
                        </small>
                      )}
                      <button
                        type="button"
                        className="units-publish"
                        data-on={published}
                        disabled={!canWrite || busy}
                        aria-label={
                          published
                            ? `Chuyển ${u.name} về bản nháp`
                            : `Xuất bản ${u.name}`
                        }
                        onClick={() =>
                          change([u.id], {
                            status: published ? "DRAFT" : "PUBLISHED",
                          })
                        }
                      >
                        <span aria-hidden="true" />
                        {published ? "Đã xuất bản" : "Bản nháp"}
                      </button>
                    </td>
                    <td className="units-interest">
                      <span>
                        <Eye size={13} aria-hidden="true" />
                        {interest?.views ?? 0} lượt xem
                      </span>
                      <small>{interest?.leads ?? 0} yêu cầu</small>
                    </td>
                    <td className="units-author">
                      {u.createdBy ? String(u.createdBy) : "—"}
                      <small>
                        {shortDate(u.updatedAt)}
                        {u.updatedBy && u.updatedBy !== u.createdBy
                          ? ` · sửa: ${String(u.updatedBy)}`
                          : ""}
                      </small>
                    </td>
                    <td>
                      <div className="table-actions units-actions">
                        <button
                          type="button"
                          aria-label={`Sửa ${u.name}`}
                          onClick={() => goTo(`/admin/properties/${u.id}/edit`)}
                        >
                          <Pencil size={16} />
                        </button>
                        {published && !u.isDemo && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Xem ${u.name} trên website`}
                          >
                            <ArrowUpRight size={16} />
                          </a>
                        )}
                        {canWrite && (
                          <button
                            type="button"
                            aria-label={`Xóa ${u.name}`}
                            onClick={() =>
                              onArchive({ id: u.id, name: u.name })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows && !rows.length && (
          <div className="empty-state">
            <h3>Chưa có căn hộ phù hợp</h3>
            <p>Thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p>
          </div>
        )}

        <div className="units-pager">
          <label>
            Hiển thị
            <select
              value={filters.pageSize}
              onChange={(e) => set({ pageSize: Number(e.target.value) })}
            >
              {[20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} căn / trang
                </option>
              ))}
            </select>
          </label>
          <span>
            {total
              ? `${(page - 1) * filters.pageSize + 1}–${Math.min(page * filters.pageSize, total)} / ${total}`
              : "0 căn"}
          </span>
          <div>
            <button
              type="button"
              aria-label="Trang trước"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Trang {page} / {pages}
            </span>
            <button
              type="button"
              aria-label="Trang sau"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      <ConfirmDialog
        open={bulkArchive}
        title={`Lưu trữ ${ids.length} căn đã chọn?`}
        message="Các căn sẽ ngừng hiển thị trên website và vẫn được giữ trong cơ sở dữ liệu."
        confirmLabel="Lưu trữ"
        cancelLabel="Hủy"
        onConfirm={() => void archive(ids)}
        onCancel={() => setBulkArchive(false)}
      />
    </div>
  );
}
