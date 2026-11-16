"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FileSpreadsheet, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { downloadFile, errorMessage } from "./api";
import { DatePicker } from "./date-picker";
import { Button } from "@/components/ui/button";

/** Longest period one report covers (the API refuses more). */
const MAX_DAYS = 366;
/** First year with data on the new site. */
const FIRST_YEAR = 2025;
const DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const vn = (value: string) => value.split("-").reverse().join("/");
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;

/**
 * "Xuất Excel" on Tổng quan: picks a month or a span of days and downloads
 * the report the API builds (overview with logo, charts and unit photos,
 * then sheets by day, unit, project, source and — with the right — contacts).
 */
export function ReportExport({ canContacts }: { canContacts: boolean }) {
  const now = new Date();
  const today = iso(now);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"month" | "range">("month");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [range, setRange] = useState({
    from: iso(new Date(now.getTime() - 29 * DAY)),
    to: today,
  });
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  // The period asked for; a month still running ends today.
  const period =
    mode === "month"
      ? {
          from: `${year}-${pad(month)}-01`,
          to: iso(new Date(year, month, 0)),
        }
      : range;
  const shownTo = period.to > today ? today : period.to;
  const problem =
    !period.from || !period.to
      ? "Chọn đủ ngày bắt đầu và ngày kết thúc."
      : period.from > today
        ? "Kỳ báo cáo chưa bắt đầu."
        : period.from > period.to
          ? "Ngày bắt đầu phải trước ngày kết thúc."
          : daysBetween(period.from, shownTo) > MAX_DAYS
            ? `Mỗi báo cáo tối đa ${MAX_DAYS} ngày.`
            : "";
  const years = Array.from(
    { length: now.getFullYear() - FIRST_YEAR + 1 },
    (_, i) => now.getFullYear() - i,
  );

  const readRange = () => {
    const data = new FormData(form.current!);
    setRange({
      from: String(data.get("from") ?? ""),
      to: String(data.get("to") ?? ""),
    });
  };
  const download = async (event: React.FormEvent) => {
    event.preventDefault();
    if (problem || busy) return;
    setBusy(true);
    try {
      const name = await downloadFile(
        `/admin/dashboard/export?from=${period.from}&to=${period.to}`,
      );
      toast.success(`Đã tải báo cáo ${name}`);
      setOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(value) => !busy && setOpen(value)}>
      <Dialog.Trigger asChild>
        <button type="button" className="dash-export">
          <FileSpreadsheet size={15} aria-hidden="true" />
          Xuất Excel
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="admin-dialog-overlay" />
        <Dialog.Content
          className="admin-dialog report-dialog"
          aria-describedby="report-dialog-desc"
        >
          <div className="report-dialog-icon" aria-hidden="true">
            <FileSpreadsheet size={22} />
          </div>
          <Dialog.Title>Xuất báo cáo Excel</Dialog.Title>
          <Dialog.Description id="report-dialog-desc">
            Lượt xem, nguồn truy cập, căn hộ được xem nhiều (kèm ảnh)
            {canContacts ? " và khách để lại liên hệ" : ""} trong kỳ bạn chọn.
          </Dialog.Description>
          <form ref={form} onSubmit={download} noValidate>
            <div
              className="report-mode"
              role="group"
              aria-label="Kiểu kỳ báo cáo"
            >
              <button
                type="button"
                aria-pressed={mode === "month"}
                onClick={() => setMode("month")}
              >
                Theo tháng
              </button>
              <button
                type="button"
                aria-pressed={mode === "range"}
                onClick={() => setMode("range")}
              >
                Theo khoảng ngày
              </button>
            </div>
            {mode === "month" ? (
              <div className="report-fields">
                <label>
                  <span>Tháng</span>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option
                        key={m}
                        value={m}
                        disabled={iso(new Date(year, m - 1, 1)) > today}
                      >
                        Tháng {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Năm</span>
                  <select
                    value={year}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      setYear(y);
                      if (y === now.getFullYear() && month > now.getMonth() + 1)
                        setMonth(now.getMonth() + 1);
                    }}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="report-fields report-days">
                <div>
                  <span id="report-from">Từ ngày</span>
                  <DatePicker
                    id="report-from-date"
                    name="from"
                    defaultValue={range.from}
                    describedBy="report-from"
                    onChange={readRange}
                  />
                </div>
                <div>
                  <span id="report-to">Đến ngày</span>
                  <DatePicker
                    id="report-to-date"
                    name="to"
                    defaultValue={range.to}
                    describedBy="report-to"
                    onChange={readRange}
                  />
                </div>
              </div>
            )}
            <p
              className="report-summary"
              role="status"
              data-error={!!problem || undefined}
            >
              {problem ||
                `Kỳ báo cáo: ${vn(period.from)} – ${vn(shownTo)} · ${daysBetween(period.from, shownTo)} ngày${
                  shownTo !== period.to ? " (tính đến hôm nay)" : ""
                }`}
            </p>
            {!canContacts && (
              <p className="report-note">
                File không gồm danh sách khách liên hệ (cần quyền xuất dữ liệu
                khách hàng).
              </p>
            )}
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  Hủy
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={!!problem || busy}>
                {busy ? (
                  <LoaderCircle size={16} className="spin" aria-hidden="true" />
                ) : (
                  <FileSpreadsheet size={16} aria-hidden="true" />
                )}
                {busy ? "Đang tạo file…" : "Tải file .xlsx"}
              </Button>
            </div>
          </form>
          <Dialog.Close className="admin-dialog-close" aria-label="Đóng">
            <X size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
