"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Date field for the Admin forms: a Vietnamese calendar instead of the
 * browser's picker. The value lives in a hidden input (YYYY-MM-DD), so it is
 * submitted and validated like any other field.
 */
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DAY_NAMES = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const today = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && toIso(a) === toIso(b);
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** 6 weeks starting on the Monday on/before the 1st of the month. */
function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function DatePicker({
  id,
  name,
  defaultValue,
  invalid,
  describedBy,
  disabled,
  onChange,
}: {
  id: string;
  name: string;
  defaultValue: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  onChange?: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const selected = parse(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => selected ?? today());
  const [focus, setFocus] = useState<Date>(() => selected ?? today());
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Tell the form after the hidden input holds the new value.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onChange?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => {
    if (open)
      grid.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${toIso(focus)}"]`)
        ?.focus();
  }, [open, focus]);

  function choose(day: Date | null) {
    setValue(day ? toIso(day) : "");
    setOpen(false);
    root.current?.querySelector<HTMLButtonElement>(".date-trigger")?.focus();
  }
  function show(next: boolean) {
    const start = selected ?? today();
    setMonth(start);
    setFocus(start);
    setOpen(next);
  }
  function move(days: number) {
    const next = addDays(focus, days);
    setFocus(next);
    if (
      next.getMonth() !== month.getMonth() ||
      next.getFullYear() !== month.getFullYear()
    )
      setMonth(next);
  }
  const shiftMonth = (n: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + n, 1);
    setMonth(next);
    setFocus(next);
  };

  const label = selected
    ? `${pad(selected.getDate())}/${pad(selected.getMonth() + 1)}/${selected.getFullYear()}`
    : "";
  return (
    <div ref={root} className={`date-picker${open ? " open" : ""}`}>
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        type="button"
        className="date-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => show(!open)}
      >
        <CalendarDays size={18} aria-hidden="true" />
        {selected ? (
          <span className="date-value">
            <strong>{label}</strong>
            <small>{DAY_NAMES[selected.getDay()]}</small>
          </span>
        ) : (
          <span className="date-placeholder">Chọn ngày</span>
        )}
      </button>
      {selected && !disabled && (
        <button
          type="button"
          className="date-clear"
          aria-label="Xóa ngày"
          onClick={() => choose(null)}
        >
          <X size={15} />
        </button>
      )}
      {open && (
        <div
          className="date-popover"
          role="dialog"
          aria-label="Chọn ngày"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              choose(selected);
            }
          }}
        >
          <div className="date-head">
            <button
              type="button"
              aria-label="Tháng trước"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <strong aria-live="polite">
              Tháng {month.getMonth() + 1}, {month.getFullYear()}
            </strong>
            <button
              type="button"
              aria-label="Tháng sau"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="date-weekdays" aria-hidden="true">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div
            ref={grid}
            className="date-grid"
            role="grid"
            onKeyDown={(event) => {
              const step = {
                ArrowLeft: -1,
                ArrowRight: 1,
                ArrowUp: -7,
                ArrowDown: 7,
              }[event.key];
              if (step) {
                event.preventDefault();
                move(step);
              } else if (event.key === "PageUp" || event.key === "PageDown") {
                event.preventDefault();
                shiftMonth(event.key === "PageUp" ? -1 : 1);
              }
            }}
          >
            {monthGrid(month).map((day) => {
              const outside = day.getMonth() !== month.getMonth();
              const iso = toIso(day);
              return (
                <button
                  key={iso}
                  type="button"
                  data-day={iso}
                  tabIndex={sameDay(day, focus) ? 0 : -1}
                  className={[
                    outside && "outside",
                    sameDay(day, today()) && "today",
                    sameDay(day, selected) && "selected",
                    (day.getDay() === 0 || day.getDay() === 6) && "weekend",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={sameDay(day, selected)}
                  aria-label={`${DAY_NAMES[day.getDay()]}, ${day.getDate()}/${day.getMonth() + 1}/${day.getFullYear()}`}
                  onClick={() => choose(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="date-quick">
            <button type="button" onClick={() => choose(today())}>
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => {
                const t = today();
                choose(new Date(t.getFullYear(), t.getMonth() + 1, 1));
              }}
            >
              Đầu tháng sau
            </button>
            {selected && (
              <button
                type="button"
                className="danger"
                onClick={() => choose(null)}
              >
                Xóa
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
