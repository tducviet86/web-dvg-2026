"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "./api";

type Row = {
  id: string;
  locale: "en" | "ko" | "zh";
  source: string;
  text: string;
  reviewed: boolean;
  updatedAt: string;
};
const LOCALES = [
  ["en", "English"],
  ["ko", "한국어"],
  ["zh", "中文"],
] as const;

/**
 * Website translations made by AI (EN/KO/ZH). Editors correct wording here;
 * a corrected line is marked "Đã duyệt" and AI never replaces it.
 */
export function TranslationsPanel({ canWrite }: { canWrite: boolean }) {
  const [locale, setLocale] = useState<Row["locale"]>("en");
  const [q, setQ] = useState("");
  const [reviewed, setReviewed] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    rows: Row[];
    total: number;
    pages: number;
  } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams({
        locale,
        page: String(page),
        pageSize: "25",
      });
      if (q.trim()) query.set("q", q.trim());
      if (reviewed) query.set("reviewed", reviewed);
      const res = await api<{
        data: Row[];
        meta: { total: number; totalPages: number };
      }>("GET", `/admin/translations?${query}`);
      setData({
        rows: res.data,
        total: res.meta.total,
        pages: res.meta.totalPages,
      });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, [locale, q, reviewed, page]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(row: Row) {
    const text = (drafts[row.id] ?? row.text).trim();
    if (!text) return toast.error("Bản dịch không được để trống.");
    try {
      await api("PATCH", `/admin/translations/${row.id}`, {
        text,
        expectedUpdatedAt: row.updatedAt,
      });
      toast.success("Đã lưu bản dịch. Website cập nhật trong khoảng 1 phút.");
      setDrafts((d) => {
        const next = { ...d };
        delete next[row.id];
        return next;
      });
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <section className="admin-panel admin-list-panel translations-panel">
      <p className="translations-intro">
        Website tự dịch sang tiếng Anh, Hàn, Trung bằng AI. Sửa câu chưa sát
        nghĩa rồi bấm <strong>Lưu</strong>: câu đã sửa được đánh dấu{" "}
        <em>Đã duyệt</em> và không bị AI thay đổi nữa.
      </p>
      <div className="admin-table-toolbar">
        <label className="admin-search">
          <Search size={16} aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo câu tiếng Việt hoặc bản dịch…"
            aria-label="Tìm bản dịch"
          />
        </label>
        <select
          value={locale}
          aria-label="Ngôn ngữ"
          onChange={(e) => {
            setLocale(e.target.value as Row["locale"]);
            setPage(1);
          }}
        >
          {LOCALES.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={reviewed}
          aria-label="Trạng thái duyệt"
          onChange={(e) => {
            setReviewed(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          <option value="false">Chưa duyệt (AI)</option>
          <option value="true">Đã duyệt</option>
        </select>
      </div>
      {!data ? (
        <p role="status">Đang tải bản dịch…</p>
      ) : !data.rows.length ? (
        <p className="empty-state">Chưa có bản dịch phù hợp.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tiếng Việt (gốc)</th>
                <th>Bản dịch</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const draft = drafts[row.id] ?? row.text;
                return (
                  <tr key={row.id}>
                    <td className="translation-source">{row.source}</td>
                    <td>
                      <textarea
                        className="translation-text"
                        value={draft}
                        rows={Math.min(
                          6,
                          Math.max(1, Math.ceil(draft.length / 60)),
                        )}
                        readOnly={!canWrite}
                        aria-label={`Bản dịch của: ${row.source.slice(0, 80)}`}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [row.id]: e.target.value }))
                        }
                      />
                    </td>
                    <td>
                      {row.reviewed ? (
                        <span className="status-badge status-done">
                          <Check size={13} /> Đã duyệt
                        </span>
                      ) : (
                        <span className="status-badge">AI</span>
                      )}
                      {canWrite && draft !== row.text && (
                        <Button size="sm" onClick={() => void save(row)}>
                          Lưu
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && data.pages > 1 && (
        <div className="translations-pager">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Trang trước
          </Button>
          <span>
            Trang {page}/{data.pages} · {data.total} câu
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.pages}
            onClick={() => setPage(page + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}
    </section>
  );
}
