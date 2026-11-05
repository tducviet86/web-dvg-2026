"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { MediaPicker } from "./media";

export type RowsConfig = {
  columns: {
    key: string;
    label: string;
    placeholder?: string;
    maxLength?: number;
    number?: boolean;
    /** A pick-list instead of free text. */
    options?: string[];
  }[];
  /** Label of the row's photo; none = rows without a photo. */
  image?: string;
  add: string;
  max: number;
  /** Shows the total of this column, which must reach 100. */
  percentTotal?: string;
};
type Row = Record<string, string>;

/**
 * An editable list of small records (unit types, floor plans, payment steps),
 * kept in a hidden input as JSON so the editor reads it like any other field.
 */
export function RowsField({
  name,
  label,
  initial,
  config,
  onChange,
}: {
  name: string;
  label: string;
  initial: Row[];
  config: RowsConfig;
  onChange: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  const first = useRef(true);
  // Report changes after the hidden input holds the new value.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const update = (index: number, patch: Row) =>
    setRows((list) =>
      list.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  const move = (index: number, by: number) =>
    setRows((list) => {
      const next = [...list];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row);
      return next;
    });
  const key = config.percentTotal;
  const total = key
    ? rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0)
    : 0;

  return (
    <div className="sections-field rows-field" role="group" aria-label={label}>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <p className="media-field-label">{label}</p>
      {rows.length > 0 && (
        <ol>
          {rows.map((row, i) => (
            <li key={i} className="section-item">
              <div className="section-item-head">
                <span className="section-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="rows-field-inputs">
                  {config.columns.map((column) => (
                    <label key={column.key}>
                      {column.label}
                      {column.options ? (
                        <select
                          value={row[column.key] ?? column.options[0]}
                          onChange={(e) =>
                            update(i, { [column.key]: e.target.value })
                          }
                        >
                          {column.options.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                      <input
                        value={row[column.key] ?? ""}
                        placeholder={column.placeholder}
                        maxLength={column.maxLength}
                        inputMode={column.number ? "decimal" : undefined}
                        onChange={(e) =>
                          update(i, { [column.key]: e.target.value })
                        }
                      />
                      )}
                    </label>
                  ))}
                </div>
                <div className="section-tools">
                  <button
                    type="button"
                    aria-label={`Đưa dòng ${i + 1} lên`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Đưa dòng ${i + 1} xuống`}
                    disabled={i === rows.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    className="danger"
                    aria-label={`Xóa dòng ${i + 1}`}
                    onClick={() =>
                      setRows((list) => list.filter((_, n) => n !== i))
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {config.image && (
                <MediaPicker
                  label={config.image}
                  value={row.image ? { id: row.image, url: row.image } : null}
                  onChange={(img) => update(i, { image: img?.url ?? "" })}
                />
              )}
            </li>
          ))}
        </ol>
      )}
      {key && rows.length > 0 && (
        <p
          className={
            Math.round(total * 100) === 10000
              ? "rows-field-total"
              : "rows-field-total invalid"
          }
          role="status"
        >
          Tổng: {Math.round(total * 100) / 100}% (cần đúng 100%)
        </p>
      )}
      <button
        type="button"
        className="section-add"
        disabled={rows.length >= config.max}
        onClick={() =>
          setRows((list) => [
            ...list,
            Object.fromEntries(
              config.columns.flatMap((column) =>
                column.options ? [[column.key, column.options[0]]] : [],
              ),
            ),
          ])
        }
      >
        <Plus size={16} /> {config.add}
      </button>
    </div>
  );
}
