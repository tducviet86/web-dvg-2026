"use client";
import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "./api";
import { ConfirmDialog } from "./error-dialog";

type Source = "GOOGLE" | "FACEBOOK" | "DIRECT";
type Review = {
  id: string;
  authorName: string;
  rating: number;
  content: string;
  source: Source;
  sourceUrl: string | null;
  reviewedAt: string;
  isPublished: boolean;
  sortOrder: number;
  project: { id: string; name: string } | null;
};
type Draft = Omit<Review, "id" | "project"> & {
  id?: string;
  projectId: string;
};
const SOURCES: [Source, string][] = [
  ["GOOGLE", "Google"],
  ["FACEBOOK", "Facebook"],
  ["DIRECT", "Khách gửi trực tiếp"],
];
const today = () => new Date().toISOString().slice(0, 10);
const blank = (): Draft => ({
  authorName: "",
  rating: 5,
  content: "",
  source: "GOOGLE",
  sourceUrl: "",
  reviewedAt: today(),
  isPublished: true,
  sortOrder: 0,
  projectId: "",
});
const shortDate = (iso: string) => iso.split("-").reverse().join("/");

function Stars({ value }: { value: number }) {
  return (
    <span className="reviews-admin-stars" aria-label={`${value} sao`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          aria-hidden="true"
          fill={n <= value ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

/**
 * Admin › Đánh giá: customer reviews shown on the website ("Khách hàng nói
 * gì"), copied from Google or Facebook with a link to the original, or
 * received directly. The Google rating and links live in Cài đặt.
 */
export function ReviewsPanel({
  canWrite,
  goTo,
}: {
  canWrite: boolean;
  goTo: (href: string) => void;
}) {
  const [rows, setRows] = useState<Review[] | null>(null);
  const [projects, setProjects] = useState<[string, string][]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Review | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ data: Review[] }>("GET", "/admin/reviews");
      setRows(res.data);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    api<{ data: { id: string; name: string }[] }>(
      "GET",
      "/admin/projects?pageSize=100",
    )
      .then((res) => setProjects(res.data.map((p) => [p.id, p.name])))
      .catch(() => setProjects([]));
    return () => clearTimeout(first);
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    const { id, ...fields } = draft;
    const body = {
      ...fields,
      authorName: fields.authorName.trim(),
      content: fields.content.trim(),
      sourceUrl: fields.sourceUrl?.trim() || null,
      projectId: fields.projectId || null,
    };
    try {
      await api(
        id ? "PATCH" : "POST",
        id ? `/admin/reviews/${id}` : "/admin/reviews",
        body,
      );
      toast.success(id ? "Đã lưu đánh giá." : "Đã thêm đánh giá.");
      setDraft(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(review: Review) {
    try {
      await api("PATCH", `/admin/reviews/${review.id}`, {
        isPublished: !review.isPublished,
      });
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function remove(review: Review) {
    setToDelete(null);
    try {
      await api("DELETE", `/admin/reviews/${review.id}`);
      toast.success("Đã xóa đánh giá.");
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const set = (patch: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));
  const shown = rows?.filter((r) => r.isPublished).length ?? 0;

  return (
    <div className="reviews-admin">
      <section className="admin-panel">
        <div className="reviews-admin-head">
          <div>
            <h2>Khách hàng nói gì</h2>
            <p>
              Đánh giá hiện trên trang chủ và trang cho thuê. Chép nguyên văn từ
              Google hoặc Facebook (kèm link gốc), không tự viết hay sửa ý
              khách. Điểm sao và link Google nhập ở{" "}
              <button
                type="button"
                className="text-link"
                onClick={() => goTo("/admin/settings")}
              >
                Cài đặt
              </button>
              .
            </p>
          </div>
          {canWrite && (
            <Button onClick={() => setDraft(blank())}>
              <Plus size={17} /> Thêm đánh giá
            </Button>
          )}
        </div>
        <p className="reviews-admin-count" role="status">
          {rows
            ? `${rows.length} đánh giá · ${shown} đang hiển thị`
            : "Đang tải…"}
        </p>
        {rows && !rows.length && (
          <div className="empty-state">
            <h3>Chưa có đánh giá nào</h3>
            <p>
              Mở trang Google Business Profile của công ty, chép các đánh giá
              hay nhất vào đây.
            </p>
          </div>
        )}
        <ul className="reviews-admin-list">
          {rows?.map((r) => (
            <li key={r.id} data-hidden={!r.isPublished || undefined}>
              <div className="reviews-admin-meta">
                <Stars value={r.rating} />
                <strong>{r.authorName}</strong>
                <small>
                  {SOURCES.find(([k]) => k === r.source)?.[1]} ·{" "}
                  {shortDate(r.reviewedAt)}
                  {r.project ? ` · ${r.project.name}` : ""}
                </small>
                {r.sourceUrl && (
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Mở đánh giá gốc của ${r.authorName}`}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <p>{r.content}</p>
              {canWrite && (
                <div className="reviews-admin-actions">
                  <label className="banner-switch">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={r.isPublished}
                      onChange={() => togglePublished(r)}
                      aria-label={`Hiển thị đánh giá của ${r.authorName}`}
                    />
                    <span aria-hidden="true" />
                    <span className="switch-text">
                      {r.isPublished ? "Đang hiển thị" : "Đang ẩn"}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...r,
                        sourceUrl: r.sourceUrl ?? "",
                        projectId: r.project?.id ?? "",
                      })
                    }
                  >
                    <Pencil size={14} /> Sửa
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => setToDelete(r)}
                  >
                    <Trash2 size={14} /> Xóa
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Dialog.Root
        open={!!draft}
        onOpenChange={(open) => !open && setDraft(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="admin-dialog-overlay" />
          <Dialog.Content className="admin-dialog reviews-admin-dialog">
            <Dialog.Title>
              {draft?.id ? "Sửa đánh giá" : "Thêm đánh giá"}
            </Dialog.Title>
            <Dialog.Description>
              Chép đúng tên và nội dung khách đã viết.
            </Dialog.Description>
            {draft && (
              <form onSubmit={save}>
                <label>
                  Tên khách hàng
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={draft.authorName}
                    onChange={(e) => set({ authorName: e.target.value })}
                  />
                </label>
                <fieldset className="reviews-admin-rating">
                  <legend>Số sao</legend>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n}>
                      <input
                        type="radio"
                        name="rating"
                        value={n}
                        checked={draft.rating === n}
                        onChange={() => set({ rating: n })}
                      />
                      {n} ★
                    </label>
                  ))}
                </fieldset>
                <label>
                  Nội dung đánh giá
                  <textarea
                    required
                    minLength={10}
                    maxLength={1500}
                    rows={5}
                    value={draft.content}
                    onChange={(e) => set({ content: e.target.value })}
                  />
                </label>
                <div className="reviews-admin-row">
                  <label>
                    Nguồn
                    <select
                      value={draft.source}
                      onChange={(e) =>
                        set({ source: e.target.value as Source })
                      }
                    >
                      {SOURCES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ngày đánh giá
                    <input
                      type="date"
                      required
                      max={today()}
                      value={draft.reviewedAt}
                      onChange={(e) => set({ reviewedAt: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Link đánh giá gốc (không bắt buộc)
                  <input
                    type="url"
                    pattern="https://.*"
                    placeholder="https://maps.app.goo.gl/…"
                    value={draft.sourceUrl ?? ""}
                    onChange={(e) => set({ sourceUrl: e.target.value })}
                  />
                </label>
                <div className="reviews-admin-row">
                  <label>
                    Về dự án (không bắt buộc)
                    <select
                      value={draft.projectId}
                      onChange={(e) => set({ projectId: e.target.value })}
                    >
                      <option value="">Chung, không riêng dự án nào</option>
                      {projects.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Thứ tự (nhỏ hiện trước)
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      value={draft.sortOrder}
                      onChange={(e) =>
                        set({ sortOrder: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                </div>
                <label className="reviews-admin-check">
                  <input
                    type="checkbox"
                    checked={draft.isPublished}
                    onChange={(e) => set({ isPublished: e.target.checked })}
                  />
                  Hiển thị trên website
                </label>
                <div className="dialog-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraft(null)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Đang lưu…" : "Lưu đánh giá"}
                  </Button>
                </div>
              </form>
            )}
            <Dialog.Close className="admin-dialog-close" aria-label="Đóng">
              <X size={18} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={!!toDelete}
        title="Xóa đánh giá này?"
        message={`Đánh giá của ${toDelete?.authorName ?? ""} sẽ bị xóa khỏi website. Bạn có thể ẩn thay vì xóa.`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={() => toDelete && remove(toDelete)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
