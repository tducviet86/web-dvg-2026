"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  ImageOff,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import { categoryOptions, type AdminDto } from "./adapters";
import { ConfirmDialog } from "./error-dialog";
import {
  endpoints,
  leadStatusOptions,
  publishOptions,
  type Kind,
} from "./model";

type Row = AdminDto & { id: string };
type Option = [string, string];
type Column = { head: string; className?: string; cell: (d: Row) => ReactNode };
type Config = {
  noun: string;
  search: string;
  /** Status values: summary cards and the status filter. */
  statuses: Option[];
  /** Content (publish ⇄ draft) or customer requests (status select). */
  mode: "publish" | "lead";
  /** One more filter: fixed options or loaded from the API. */
  filter?: {
    key: string;
    label: string;
    all: string;
    options?: Option[];
    load?: () => Promise<Option[]>;
  };
  sorts: Option[];
  thumb?: (d: Row) => string | undefined;
  title: (d: Row) => string;
  sub: (d: Row) => string;
  badges?: (d: Row) => (string | false | null | undefined)[];
  columns: Column[];
  view?: (d: Row) => string | null;
  /** Leads are deleted, content is archived. */
  remove: "Lưu trữ" | "Xóa";
};

const str = (v: unknown) => (v == null ? "" : String(v));
const day = (v: unknown) =>
  v
    ? new Date(String(v)).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "";
const name = (v: unknown) => (v as { name?: string } | null)?.name ?? "";
const cover = (d: Row) => (d.coverImage as { url?: string } | null)?.url;
const SORTS_CONTENT: Option[] = [
  ["default", "Thứ tự mặc định"],
  ["created", "Mới tạo trước"],
  ["updated", "Mới sửa trước"],
  ["name", "Tên A → Z"],
];
const author: Column = {
  head: "Người đăng · Cập nhật",
  className: "units-author",
  cell: (d) => (
    <>
      {str(d.createdBy) || "—"}
      <small>
        {day(d.updatedAt)}
        {d.updatedBy && d.updatedBy !== d.createdBy
          ? ` · sửa: ${str(d.updatedBy)}`
          : ""}
      </small>
    </>
  ),
};

const CONFIG: Record<Exclude<Kind, "properties">, Config> = {
  projects: {
    noun: "dự án",
    search: "Tìm tên, đường dẫn, khu vực…",
    statuses: publishOptions.slice(0, 2),
    mode: "publish",
    filter: {
      key: "category",
      label: "Lọc nhóm dự án",
      all: "Mọi nhóm",
      options: categoryOptions,
    },
    sorts: [["default", "Thứ tự hiển thị"], ...SORTS_CONTENT.slice(1)],
    thumb: cover,
    title: (d) => str(d.name),
    sub: (d) => str(d.slug),
    badges: (d) => [
      (d.banner as { isActive?: boolean } | null)?.isActive &&
        "Banner trang chủ",
    ],
    columns: [
      { head: "Khu vực", cell: (d) => str(d.location) },
      {
        head: "Nhóm",
        cell: (d) =>
          ((d.categories as string[]) ?? [])
            .map((c) => categoryOptions.find(([k]) => k === c)?.[1] ?? c)
            .join(", "),
      },
      {
        head: "Căn hộ",
        className: "units-interest",
        cell: (d) => `${Number(d.propertyCount ?? 0)} căn`,
      },
      author,
    ],
    view: (d) => `/du-an/${str(d.slug)}`,
    remove: "Lưu trữ",
  },
  posts: {
    noun: "bài viết",
    search: "Tìm tiêu đề bài viết…",
    statuses: publishOptions.slice(0, 2),
    mode: "publish",
    filter: {
      key: "category",
      label: "Lọc chuyên mục",
      all: "Mọi chuyên mục",
      load: async () =>
        (
          await api<{ data: { slug: string; name: string }[] }>(
            "GET",
            "/admin/blog/categories",
          )
        ).data.map((c) => [c.slug, c.name]),
    },
    sorts: [
      ["default", "Mới sửa trước"],
      ...SORTS_CONTENT.slice(1, 2),
      SORTS_CONTENT[3],
    ],
    thumb: cover,
    title: (d) => str(d.title),
    sub: (d) => str(d.slug),
    badges: (d) => [!!d.isDemo && "Minh họa"],
    columns: [
      { head: "Chuyên mục", cell: (d) => name(d.category) },
      {
        head: "Ngày đăng",
        className: "units-date",
        cell: (d) => day(d.publishedAt) || "Chưa đăng",
      },
      author,
    ],
    view: (d) => `/blog/${str(d.slug)}`,
    remove: "Lưu trữ",
  },
  pages: {
    noun: "trang",
    search: "Tìm tiêu đề, đường dẫn…",
    statuses: publishOptions,
    mode: "publish",
    filter: {
      key: "kind",
      label: "Lọc loại trang",
      all: "Mọi loại trang",
      options: [
        ["PAGE", "Trang giới thiệu & khác"],
        ["SERVICE", "Lĩnh vực hoạt động"],
      ],
    },
    sorts: [["default", "Thứ tự mặc định"], ...SORTS_CONTENT.slice(1)],
    thumb: cover,
    title: (d) => str(d.title),
    sub: (d) => `/${str(d.path)}`,
    badges: (d) => [d.kind === "SERVICE" && !!d.inMenu && "Trên menu"],
    columns: [
      {
        head: "Loại",
        cell: (d) =>
          d.kind === "SERVICE" ? "Lĩnh vực hoạt động" : "Trang nội dung",
      },
      author,
    ],
    view: (d) => `/${str(d.path)}`,
    remove: "Lưu trữ",
  },
  jobs: {
    noun: "tin tuyển dụng",
    search: "Tìm vị trí, phòng ban…",
    statuses: publishOptions.slice(0, 2),
    mode: "publish",
    sorts: [["default", "Mới tạo trước"], ...SORTS_CONTENT.slice(2)],
    title: (d) => str(d.title),
    sub: (d) => `${str(d.department)} · ${str(d.location)}`,
    badges: (d) => [d.status === "PUBLISHED" && !d.isOpen && "Hết hạn"],
    columns: [
      {
        head: "Hạn nộp",
        className: "units-date",
        cell: (d) => (d.deadline ? day(d.deadline) : "Không giới hạn"),
      },
      {
        head: "Hồ sơ",
        className: "units-interest",
        cell: (d) => `${Number(d.applicationCount ?? 0)} hồ sơ`,
      },
      author,
    ],
    view: (d) => `/tuyen-dung/${str(d.slug)}`,
    remove: "Lưu trữ",
  },
  leads: {
    noun: "yêu cầu",
    search: "Tìm tên, email, điện thoại, công ty…",
    statuses: leadStatusOptions,
    mode: "lead",
    filter: {
      key: "assigneeId",
      label: "Lọc người phụ trách",
      all: "Mọi người phụ trách",
      load: async () =>
        (
          await api<{ data: { id: string; name: string }[] }>(
            "GET",
            "/admin/users/assignable",
          )
        ).data.map((u) => [u.id, u.name]),
    },
    sorts: [
      ["default", "Mới gửi trước"],
      ["updated", "Mới cập nhật trước"],
      ["name", "Tên A → Z"],
    ],
    title: (d) => str(d.name),
    sub: (d) => [d.phone, d.email].filter(Boolean).join(" · "),
    badges: (d) => [d.priority === "HIGH" && "Ưu tiên cao"],
    columns: [
      {
        head: "Nguồn · Quan tâm",
        cell: (d) => (
          <>
            {str(d.source)}
            <small>
              {name(d.property) || name(d.project) || str(d.intent)}
            </small>
          </>
        ),
      },
      {
        head: "Phụ trách",
        cell: (d) => name(d.assignee) || "Chưa phân công",
      },
      {
        head: "Gửi lúc",
        className: "units-date",
        cell: (d) => day(d.createdAt),
      },
    ],
    remove: "Xóa",
  },
};

type Filters = {
  q: string;
  status: string;
  extra: string;
  sort: string;
  pageSize: number;
};
const EMPTY: Filters = {
  q: "",
  status: "",
  extra: "",
  sort: "default",
  pageSize: 20,
};
const storeKey = (kind: Kind) => `dvg:admin-list:${kind}`;
function saved(kind: Kind): Filters {
  try {
    return {
      ...EMPTY,
      ...JSON.parse(sessionStorage.getItem(storeKey(kind)) ?? "{}"),
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Admin list for projects, posts, pages, jobs and customer requests, in the
 * style of "Căn hộ": status cards that filter, search, a filter and sorting,
 * inline status changes, bulk actions on selected rows and pages.
 */
export function ContentList({
  kind,
  canWrite,
  canDelete,
  canExport = false,
  goTo,
  onRemove,
  reloadKey,
}: {
  kind: Exclude<Kind, "properties">;
  canWrite: boolean;
  canDelete: boolean;
  /** CSV export of customer requests. */
  canExport?: boolean;
  goTo: (href: string) => void;
  onRemove: (row: { id: string; name: string }) => void;
  reloadKey: number;
}) {
  const config = CONFIG[kind];
  const [filters, setFilters] = useState<Filters>(() => saved(kind));
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [options, setOptions] = useState<Option[]>(
    config.filter?.options ?? [],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  /** When the rows were loaded: tells scheduled posts from published ones. */
  const [loadedAt, setLoadedAt] = useState(0);
  const [bulkRemove, setBulkRemove] = useState(false);
  const request = useRef(0);

  const set = (patch: Partial<Filters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      try {
        sessionStorage.setItem(storeKey(kind), JSON.stringify(next));
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
    });
    if (filters.sort !== "default") params.set("sort", filters.sort);
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.extra && config.filter)
      params.set(config.filter.key, filters.extra);
    try {
      const res = await api<{
        data: Row[];
        meta: { total: number; byStatus?: Record<string, number> };
      }>("GET", `${endpoints[kind]}?${params}`);
      if (id !== request.current) return;
      setRows(res.data);
      setTotal(res.meta.total);
      setCounts(res.meta.byStatus ?? {});
      setLoadedAt(Date.now());
    } catch (error) {
      if (id !== request.current) return;
      toast.error(errorMessage(error));
      setRows([]);
    }
  }, [filters, page, kind, config.filter]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), filters.q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, filters.q, reloadKey]);
  useEffect(() => {
    config.filter
      ?.load?.()
      .then(setOptions)
      .catch(() => {});
  }, [config.filter]);

  async function change(ids: string[], body: Record<string, unknown>) {
    setBusy(true);
    let failed = 0;
    let lastError: unknown;
    for (const id of ids) {
      try {
        await api("PATCH", `${endpoints[kind]}/${id}`, body);
      } catch (error) {
        failed++;
        lastError = error;
      }
    }
    setBusy(false);
    if (failed)
      toast.error(
        `${failed}/${ids.length} mục chưa cập nhật được: ${errorMessage(lastError)}`,
      );
    else
      toast.success(
        ids.length > 1 ? `Đã cập nhật ${ids.length} mục.` : "Đã cập nhật.",
      );
    setSelected(new Set());
    await load();
  }
  async function removeMany(ids: string[]) {
    setBulkRemove(false);
    setBusy(true);
    let failed = 0;
    for (const id of ids)
      await api("DELETE", `${endpoints[kind]}/${id}`).catch(() => failed++);
    setBusy(false);
    if (failed) toast.error(`${failed}/${ids.length} mục chưa xử lý được.`);
    else
      toast.success(
        config.remove === "Xóa"
          ? `Đã xóa ${ids.length} mục.`
          : `Đã chuyển ${ids.length} mục vào lưu trữ.`,
      );
    setSelected(new Set());
    await load();
  }

  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  const active = !!(filters.q || filters.status || filters.extra);
  const allChecked = !!rows?.length && rows.every((r) => selected.has(r.id));
  const ids = [...selected];
  const all = Object.values(counts).reduce((n, v) => n + v, 0);
  const selectable = canWrite || canDelete;

  return (
    <div className="units">
      <div
        className="units-stats"
        role="group"
        aria-label={`Tóm tắt ${config.noun}`}
        style={{ "--cols": config.statuses.length + 1 } as CSSProperties}
      >
        <button
          type="button"
          className="units-stat"
          aria-pressed={!filters.status}
          onClick={() => set({ status: "" })}
        >
          <strong>{all}</strong>
          <span>Tất cả</span>
        </button>
        {config.statuses.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="units-stat"
            aria-pressed={filters.status === value}
            onClick={() => set({ status: value })}
          >
            <strong>{counts[value] ?? 0}</strong>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <section className="admin-panel units-panel">
        <div className="units-toolbar">
          <label className="admin-search units-search">
            <Search size={18} />
            <input
              aria-label="Tìm trong bảng"
              placeholder={config.search}
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
            />
          </label>
          <select
            aria-label="Lọc trạng thái"
            value={filters.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            <option value="">Tất cả trạng thái</option>
            {config.statuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {config.filter && (
            <select
              aria-label={config.filter.label}
              value={filters.extra}
              onChange={(e) => set({ extra: e.target.value })}
            >
              <option value="">{config.filter.all}</option>
              {options.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Sắp xếp"
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value })}
          >
            {config.sorts.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {active && (
            <button
              type="button"
              className="units-clear"
              onClick={() => set({ q: "", status: "", extra: "" })}
            >
              <X size={14} /> Bỏ lọc
            </button>
          )}
          <span className="units-count" role="status">
            {rows ? `${total} mục` : "Đang tải…"}
          </span>
          {kind === "leads" && canExport && (
            <LeadsExport status={filters.status} />
          )}
        </div>

        {selectable && ids.length > 0 && (
          <div
            className="units-bulk"
            role="region"
            aria-label="Thao tác hàng loạt"
          >
            <strong>Đã chọn {ids.length} mục</strong>
            {canWrite && config.mode === "publish" && (
              <>
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
              </>
            )}
            {canWrite && config.mode === "lead" && (
              <select
                aria-label="Đổi trạng thái các mục đã chọn"
                disabled={busy}
                value=""
                onChange={(e) =>
                  e.target.value && change(ids, { status: e.target.value })
                }
              >
                <option value="">Đổi trạng thái…</option>
                {leadStatusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
            {canDelete && (
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => setBulkRemove(true)}
              >
                {config.remove}
              </button>
            )}
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
          <table className="units-table content-table">
            <thead>
              <tr>
                {selectable && (
                  <th className="units-check">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả mục trên trang"
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
                <th>{kind === "leads" ? "Khách hàng" : "Tên"}</th>
                {config.columns.map((c) => (
                  <th key={c.head}>{c.head}</th>
                ))}
                <th>Trạng thái</th>
                <th>
                  <span className="units-sr">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((d) => {
                const title = config.title(d);
                const badges = (config.badges?.(d) ?? []).filter(
                  Boolean,
                ) as string[];
                const status = str(d.status);
                const published = status === "PUBLISHED";
                const goesLive = d.publishedAt
                  ? new Date(String(d.publishedAt))
                  : null;
                const scheduled =
                  published && !!goesLive && goesLive.getTime() > loadedAt;
                const href = config.view?.(d);
                const thumb = config.thumb?.(d);
                return (
                  <tr
                    key={d.id}
                    data-selected={selected.has(d.id) || undefined}
                  >
                    {selectable && (
                      <td className="units-check">
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${title}`}
                          checked={selected.has(d.id)}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (next.has(d.id)) next.delete(d.id);
                              else next.add(d.id);
                              return next;
                            })
                          }
                        />
                      </td>
                    )}
                    <td>
                      <div className="units-name">
                        {config.thumb && (
                          <span className="units-thumb">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt="" loading="lazy" />
                            ) : (
                              <ImageOff size={18} aria-hidden="true" />
                            )}
                          </span>
                        )}
                        <span>
                          <button
                            type="button"
                            className="units-title"
                            onClick={() => goTo(`/admin/${kind}/${d.id}/edit`)}
                          >
                            {title}
                          </button>
                          <small>{config.sub(d)}</small>
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
                    {config.columns.map((c) => (
                      <td key={c.head} className={c.className}>
                        {c.cell(d)}
                      </td>
                    ))}
                    <td>
                      {config.mode === "lead" ? (
                        <select
                          className="units-availability"
                          data-value={status === "NEW" ? "AVAILABLE" : status}
                          aria-label={`Trạng thái ${title}`}
                          value={status}
                          disabled={!canWrite || busy}
                          onChange={(e) =>
                            change([d.id], { status: e.target.value })
                          }
                        >
                          {leadStatusOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : status === "ARCHIVED" ? (
                        <span className="units-publish">Lưu trữ</span>
                      ) : (
                        <button
                          type="button"
                          className="units-publish"
                          data-on={published}
                          data-scheduled={scheduled || undefined}
                          disabled={!canWrite || busy}
                          aria-label={
                            published
                              ? `Chuyển ${title} về bản nháp`
                              : `Xuất bản ${title}`
                          }
                          onClick={() =>
                            change([d.id], {
                              status: published ? "DRAFT" : "PUBLISHED",
                            })
                          }
                        >
                          <span aria-hidden="true" />
                          {scheduled
                            ? `Hẹn đăng ${goesLive!.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}`
                            : published
                              ? "Đã xuất bản"
                              : "Bản nháp"}
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="table-actions units-actions">
                        <button
                          type="button"
                          aria-label={`Sửa ${title}`}
                          onClick={() => goTo(`/admin/${kind}/${d.id}/edit`)}
                        >
                          <Pencil size={16} />
                        </button>
                        {href && published && !d.isDemo && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Xem ${title} trên website`}
                          >
                            <ArrowUpRight size={16} />
                          </a>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            aria-label={`Xóa ${title}`}
                            onClick={() => onRemove({ id: d.id, name: title })}
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
            <h3>Chưa có kết quả</h3>
            <p>Thử đổi từ khóa, bỏ bớt bộ lọc hoặc thêm dữ liệu mới.</p>
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
                  {n} mục / trang
                </option>
              ))}
            </select>
          </label>
          <span>
            {total
              ? `${(page - 1) * filters.pageSize + 1}–${Math.min(page * filters.pageSize, total)} / ${total}`
              : "0 mục"}
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
        open={bulkRemove}
        title={`${config.remove} ${ids.length} mục đã chọn?`}
        message={
          config.remove === "Xóa"
            ? "Các yêu cầu sẽ bị ẩn khỏi danh sách. Thao tác được ghi vào nhật ký."
            : "Các mục sẽ ngừng hiển thị trên website và vẫn được giữ trong cơ sở dữ liệu."
        }
        confirmLabel={config.remove}
        cancelLabel="Hủy"
        onConfirm={() => void removeMany(ids)}
        onCancel={() => setBulkRemove(false)}
      />
    </div>
  );
}

/** "Xuất CSV" for customer requests (current status filter). */
export function LeadsExport({ status }: { status?: string }) {
  return (
    <a
      className="text-link"
      href={`/api/v1/admin/leads/export${status ? `?status=${status}` : ""}`}
    >
      <Download size={16} /> Xuất CSV
    </a>
  );
}
