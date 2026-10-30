"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  MapPin,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage, type MediaAsset } from "./api";
import { ConfirmDialog } from "./error-dialog";
import { UploadButton } from "./media";

type Usage = {
  projects: number;
  properties: number;
  banners: number;
  posts: number;
  pages: number;
  other: number;
};
type Asset = MediaAsset & {
  key: string;
  sizeBytes: number;
  createdAt: string;
  usage: Usage;
  used: boolean;
};
type Stats = {
  total: number;
  bytes: number;
  videos: number;
  unused: number;
  unusedBytes: number;
};
type Place = { kind: string; id: string; label: string };
type Filters = { q: string; type: string; usage: string; sort: string };
const EMPTY: Filters = { q: "", type: "", usage: "", sort: "newest" };
const PAGE_SIZE = 24;

const USAGE_LABEL: Record<keyof Usage, string> = {
  projects: "dự án",
  properties: "căn hộ",
  banners: "banner",
  posts: "bài viết",
  pages: "trang",
  other: "cài đặt / tuyển dụng",
};
/** Where to edit the record that uses a file. */
const placeHref = (place: Place) =>
  place.kind === "settings"
    ? "/admin/settings"
    : `/admin/${place.kind}/${place.id}/edit`;

export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024 * 1024
    ? `${(bytes / 1024 ** 3).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} GB`
    : bytes >= 1024 * 1024
      ? `${(bytes / 1024 ** 2).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`
      : bytes > 0
        ? `${Math.max(1, Math.round(bytes / 1024))} KB`
        : "0 KB";
const usageText = (usage: Usage) =>
  (Object.keys(USAGE_LABEL) as (keyof Usage)[])
    .filter((k) => usage[k])
    .map((k) => `${usage[k]} ${USAGE_LABEL[k]}`)
    .join(", ");
const fileName = (key: string) => key.split("/").pop() ?? key;

/**
 * "Thư viện ảnh": every uploaded photo and video with its size and where it
 * is used. Files nothing uses can be deleted for good (database and
 * Cloudflare storage); files in use, including photos pasted into an
 * article, are protected.
 */
export function MediaLibraryPanel({
  canWrite,
  goTo,
}: {
  canWrite: boolean;
  goTo: (href: string) => void;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Asset[] | null>(null);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [places, setPlaces] = useState<{
    id: string;
    list: Place[] | null;
  } | null>(null);
  const [failure, setFailure] = useState("");
  const [reload, setReload] = useState(0);
  const request = useRef(0);

  const set = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
    setSelected(new Set());
  };

  const load = useCallback(async () => {
    const id = ++request.current;
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sort: filters.sort,
    });
    if (filters.q.trim()) query.set("q", filters.q.trim());
    if (filters.type) query.set("type", filters.type);
    if (filters.usage) query.set("usage", filters.usage);
    try {
      const [list, summary] = await Promise.all([
        api<{ data: Asset[]; meta: { total: number } }>(
          "GET",
          `/admin/media?${query}`,
        ),
        api<{ data: Stats }>("GET", "/admin/media/stats"),
      ]);
      if (id !== request.current) return;
      setRows(list.data);
      setTotal(list.meta.total);
      setStats(summary.data);
      setFailure("");
    } catch (error) {
      if (id === request.current) setFailure(errorMessage(error));
    }
  }, [filters, page]);
  useEffect(() => {
    // Typing in the search box waits a moment before asking the server.
    const timer = setTimeout(() => void load(), filters.q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, reload, filters.q]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const unusedOnPage = rows?.filter((r) => !r.used).map((r) => r.id) ?? [];
  const ids = [...selected];
  const selectedBytes =
    rows
      ?.filter((r) => selected.has(r.id))
      .reduce((sum, r) => sum + r.sizeBytes, 0) ?? 0;
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function remove(list: string[]) {
    setConfirm(null);
    setBusy(true);
    try {
      const res = await api<{
        data: { deleted: number; bytes: number; kept: string[] };
      }>("POST", "/admin/media/delete", { ids: list });
      const { deleted, bytes, kept } = res.data;
      if (deleted)
        toast.success(`Đã xóa ${deleted} tệp, giải phóng ${fileSize(bytes)}.`);
      if (kept.length)
        toast.error(
          `${kept.length} tệp đang được dùng nên được giữ lại. Gỡ khỏi nội dung trước khi xóa.`,
        );
      setSelected(new Set());
      setReload((n) => n + 1);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function showPlaces(id: string) {
    setPlaces({ id, list: null });
    try {
      const res = await api<{ data: { places: Place[] } }>(
        "GET",
        `/admin/media/${id}/usage`,
      );
      setPlaces((current) =>
        current?.id === id ? { id, list: res.data.places } : current,
      );
    } catch (error) {
      toast.error(errorMessage(error));
      setPlaces(null);
    }
  }

  const cards = [
    {
      label: "Tổng số tệp",
      value: stats?.total,
      note: stats ? fileSize(stats.bytes) : "",
      patch: { usage: "", type: "" },
      on: !filters.usage && !filters.type,
    },
    {
      label: "Đang dùng",
      value: stats ? stats.total - stats.unused : undefined,
      note: stats ? fileSize(stats.bytes - stats.unusedBytes) : "",
      patch: { usage: "used" },
      on: filters.usage === "used",
    },
    {
      label: "Chưa dùng",
      value: stats?.unused,
      note: stats ? `có thể giải phóng ${fileSize(stats.unusedBytes)}` : "",
      patch: { usage: "unused" },
      on: filters.usage === "unused",
    },
    {
      label: "Video",
      value: stats?.videos,
      note: "",
      patch: { type: "video" },
      on: filters.type === "video",
    },
  ];
  const active = filters.q || filters.type || filters.usage;

  return (
    <div className="units media-lib">
      <div className="units-stats" role="group" aria-label="Tóm tắt thư viện">
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
            {c.note && <small>{c.note}</small>}
          </button>
        ))}
      </div>

      <section className="admin-panel units-panel">
        <div className="units-toolbar">
          <label className="admin-search units-search">
            <Search size={18} />
            <input
              aria-label="Tìm tệp"
              placeholder="Tìm theo tên tệp, mã căn, mô tả ảnh…"
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
            />
          </label>
          <select
            aria-label="Loại tệp"
            value={filters.type}
            onChange={(e) => set({ type: e.target.value })}
          >
            <option value="">Ảnh & video</option>
            <option value="image">Ảnh</option>
            <option value="video">Video</option>
          </select>
          <select
            aria-label="Tình trạng sử dụng"
            value={filters.usage}
            onChange={(e) => set({ usage: e.target.value })}
          >
            <option value="">Đang dùng & chưa dùng</option>
            <option value="used">Đang dùng</option>
            <option value="unused">Chưa dùng</option>
          </select>
          <select
            aria-label="Sắp xếp"
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value })}
          >
            <option value="newest">Mới tải lên trước</option>
            <option value="oldest">Cũ trước</option>
            <option value="largest">Dung lượng lớn trước</option>
          </select>
          {active && (
            <button
              type="button"
              className="units-clear"
              onClick={() => set({ ...EMPTY, sort: filters.sort })}
            >
              <X size={14} /> Bỏ lọc
            </button>
          )}
          {canWrite && (
            <UploadButton
              multiple
              label="Tải ảnh lên"
              onUploaded={(media) => {
                toast.success(`Đã tải lên ${media.length} ảnh.`);
                setReload((n) => n + 1);
              }}
            />
          )}
          <span className="units-count" role="status">
            {rows ? `${total} tệp` : "Đang tải…"}
          </span>
        </div>

        {canWrite && (ids.length > 0 || unusedOnPage.length > 0) && (
          <div
            className="units-bulk"
            role="region"
            aria-label="Thao tác hàng loạt"
          >
            {ids.length ? (
              <>
                <strong>
                  Đã chọn {ids.length} tệp · {fileSize(selectedBytes)}
                </strong>
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() => setConfirm(ids)}
                >
                  <Trash2 size={14} /> Xóa vĩnh viễn
                </button>
                <button
                  type="button"
                  className="units-bulk-cancel"
                  onClick={() => setSelected(new Set())}
                >
                  Bỏ chọn
                </button>
              </>
            ) : (
              <>
                <span>Trang này có {unusedOnPage.length} tệp chưa dùng.</span>
                <button
                  type="button"
                  onClick={() => setSelected(new Set(unusedOnPage))}
                >
                  Chọn các tệp chưa dùng
                </button>
              </>
            )}
          </div>
        )}

        {failure && <p role="alert">{failure}</p>}
        <ul className="media-lib-grid" aria-label="Danh sách tệp">
          {rows?.map((item) => {
            const video = item.mimeType.startsWith("video/");
            const name = fileName(item.key);
            return (
              <li
                key={item.id}
                className="media-lib-card"
                data-used={item.used}
                data-selected={selected.has(item.id)}
              >
                <div className="media-lib-thumb">
                  {video ? (
                    <video src={item.url} muted preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail, any host
                    <img src={item.url} alt={item.alt ?? ""} loading="lazy" />
                  )}
                  {canWrite && !item.used && (
                    <label className="media-lib-check">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${name}`}
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                    </label>
                  )}
                  {video && <span className="media-lib-type">Video</span>}
                </div>
                <div className="media-lib-info">
                  <strong title={item.key}>{name}</strong>
                  <small>
                    {fileSize(item.sizeBytes)}
                    {item.width && item.height
                      ? ` · ${item.width}×${item.height}`
                      : ""}
                    {" · "}
                    {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                  </small>
                  {item.used ? (
                    <button
                      type="button"
                      className="media-lib-usage"
                      onClick={() => showPlaces(item.id)}
                    >
                      <MapPin size={13} /> Đang dùng: {usageText(item.usage)}
                    </button>
                  ) : (
                    <span className="media-lib-usage unused">Chưa dùng</span>
                  )}
                  <div className="media-lib-actions">
                    <button
                      type="button"
                      aria-label={`Sao chép đường dẫn ${name}`}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(item.url);
                          toast.success("Đã sao chép đường dẫn.");
                        } catch {
                          toast.error("Trình duyệt chặn sao chép.");
                        }
                      }}
                    >
                      <Copy size={14} /> Link
                    </button>
                    {canWrite && !item.used && (
                      <button
                        type="button"
                        className="danger"
                        disabled={busy}
                        aria-label={`Xóa ${name}`}
                        onClick={() => setConfirm([item.id])}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    )}
                  </div>
                  {places?.id === item.id && (
                    <div className="media-lib-places" role="region">
                      {places.list === null ? (
                        <p role="status">Đang tìm nơi dùng…</p>
                      ) : (
                        <ul aria-label={`Nơi dùng ${name}`}>
                          {places.list.map((p) => (
                            <li key={`${p.kind}-${p.id}`}>
                              <a
                                href={placeHref(p)}
                                onClick={(e) => {
                                  e.preventDefault();
                                  goTo(placeHref(p));
                                }}
                              >
                                {USAGE_LABEL[p.kind as keyof Usage] ??
                                  (p.kind === "jobs" ? "tuyển dụng" : "")}
                                {p.kind !== "settings" ? ": " : ""}
                                {p.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        aria-label="Đóng danh sách nơi dùng"
                        onClick={() => setPlaces(null)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {rows && !rows.length && (
          <div className="empty-state">
            <h3>
              {filters.usage === "unused"
                ? "Không có tệp nào chưa dùng"
                : "Chưa có tệp phù hợp"}
            </h3>
            <p>
              {filters.usage === "unused" ? (
                <>
                  <Check size={15} /> Thư viện đang gọn gàng.
                </>
              ) : (
                "Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
              )}
            </p>
          </div>
        )}

        <div className="units-pager">
          <span>
            {total
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} / ${total}`
              : "0 tệp"}
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
        open={!!confirm}
        title={`Xóa vĩnh viễn ${confirm?.length ?? 0} tệp?`}
        message="Tệp sẽ bị xóa khỏi thư viện và khỏi kho lưu trữ (Cloudflare), không khôi phục được. Tệp đang được dùng sẽ tự được giữ lại."
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Hủy"
        onConfirm={() => confirm && remove(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
