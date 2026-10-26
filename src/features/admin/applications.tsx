"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fileSize } from "@/lib/jobs";
import { api, errorMessage } from "./api";
import { ConfirmDialog } from "./error-dialog";

type Status = "NEW" | "REVIEWING" | "INTERVIEW" | "HIRED" | "REJECTED";
type Application = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  cvName: string | null;
  cvSize: number | null;
  status: Status;
  notes: string | null;
  createdAt: string;
  job: { id: string; slug: string; title: string } | null;
};
type Job = { id: string; title: string };

export const applicationStatusOptions: [Status, string][] = [
  ["NEW", "Mới"],
  ["REVIEWING", "Đang xem xét"],
  ["INTERVIEW", "Hẹn phỏng vấn"],
  ["HIRED", "Đã tuyển"],
  ["REJECTED", "Không phù hợp"],
];

/** CVs sent from the Tuyển dụng page: review, track and download. */
export function ApplicationsPanel({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<Application[] | null>(null);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [jobId, setJobId] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Application | null>(null);

  // Only the latest request may fill the table.
  const latest = useRef(0);
  const load = useCallback(async () => {
    const request = ++latest.current;
    const params = new URLSearchParams({ pageSize: "100" });
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (jobId) params.set("jobId", jobId);
    try {
      const res = await api<{
        data: Application[];
        meta: { byStatus: Record<string, number> };
      }>("GET", `/admin/job-applications?${params}`);
      if (request !== latest.current) return;
      setRows(res.data);
      setByStatus(res.meta.byStatus);
    } catch (error) {
      toast.error(errorMessage(error));
      setRows([]);
    }
  }, [query, status, jobId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);
  useEffect(() => {
    api<{ data: Job[] }>("GET", "/admin/jobs?pageSize=100")
      .then((res) => setJobs(res.data))
      .catch(() => setJobs([]));
  }, []);

  async function update(row: Application, body: Partial<Application>) {
    try {
      await api("PATCH", `/admin/job-applications/${row.id}`, body);
      toast.success("Đã cập nhật hồ sơ.");
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
  async function remove(row: Application) {
    setDeleting(null);
    try {
      await api("DELETE", `/admin/job-applications/${row.id}`);
      toast.success("Đã xóa hồ sơ và CV.");
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return (
    <>
      <div className="application-stats">
        {applicationStatusOptions.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={status === key}
            onClick={() => setStatus(status === key ? "" : key)}
          >
            <strong>{byStatus[key] ?? 0}</strong>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <section className="admin-panel admin-list-panel">
        <div className="admin-table-toolbar">
          <label className="admin-search">
            <Search size={18} />
            <input
              aria-label="Tìm ứng viên"
              placeholder="Tìm tên, email, điện thoại…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Lọc theo vị trí"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
          >
            <option value="">Tất cả vị trí</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {applicationStatusOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <span>{rows ? `${rows.length} / ${total} hồ sơ` : "Đang tải…"}</span>
        </div>
        {rows && !rows.length ? (
          <p className="admin-empty">
            Chưa có hồ sơ nào. Ứng viên gửi CV ở trang Tuyển dụng sẽ hiện tại
            đây.
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ứng viên</th>
                  <th>Vị trí</th>
                  <th>CV</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <small>
                        <a href={`tel:${row.phone}`}>{row.phone}</a> ·{" "}
                        <a href={`mailto:${row.email}`}>{row.email}</a>
                      </small>
                      <small>
                        {new Date(row.createdAt).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </small>
                    </td>
                    <td>
                      {row.job?.title ?? "Ứng tuyển chung"}
                      <button
                        type="button"
                        className="text-link application-toggle"
                        aria-expanded={open === row.id}
                        onClick={() => setOpen(open === row.id ? null : row.id)}
                      >
                        {open === row.id
                          ? "Thu gọn"
                          : row.notes
                            ? "Lời nhắn & ghi chú"
                            : "Lời nhắn & ghi chú (trống)"}
                      </button>
                      {open === row.id && (
                        <div className="application-note">
                          <p>
                            {row.message || "Ứng viên không để lại lời nhắn."}
                          </p>
                          <label>
                            Ghi chú nội bộ
                            <textarea
                              rows={3}
                              maxLength={4000}
                              defaultValue={row.notes ?? ""}
                              disabled={!canWrite}
                              placeholder="vd: Đã gọi, hẹn phỏng vấn 9h thứ Hai"
                              onBlur={(e) => {
                                const notes = e.target.value.trim() || null;
                                if (notes !== row.notes)
                                  void update(row, { notes });
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </td>
                    <td>
                      {row.cvName ? (
                        <a
                          className="cv-download"
                          href={`/api/v1/admin/job-applications/${row.id}/cv`}
                          download
                        >
                          <Download size={15} />
                          <span>
                            {row.cvName}
                            {row.cvSize ? (
                              <small>{fileSize(row.cvSize)}</small>
                            ) : null}
                          </span>
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <select
                        aria-label={`Trạng thái hồ sơ ${row.name}`}
                        value={row.status}
                        disabled={!canWrite}
                        onChange={(e) =>
                          void update(row, { status: e.target.value as Status })
                        }
                      >
                        {applicationStatusOptions.map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="table-actions">
                        {canWrite && (
                          <button
                            aria-label={`Xóa hồ sơ ${row.name}`}
                            onClick={() => setDeleting(row)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ConfirmDialog
        open={!!deleting}
        title="Xóa hồ sơ ứng viên?"
        message={`Hồ sơ và CV của ${deleting?.name ?? ""} sẽ bị xóa vĩnh viễn, không khôi phục được.`}
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Giữ lại"
        onConfirm={() => deleting && void remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
