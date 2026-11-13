"use client";
import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";

export type ListView = "grid" | "table";
/** One choice for every admin list with photos (this browser). */
const KEY = "dvg:admin-view";

export function useListView() {
  const [view, setView] = useState<ListView>(() => {
    try {
      return localStorage.getItem(KEY) === "table" ? "table" : "grid";
    } catch {
      return "grid";
    }
  });
  const change = (next: ListView) => {
    setView(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the choice lasts for this visit */
    }
  };
  return [view, change] as const;
}

/** "Lưới / Bảng" switch in a list toolbar. */
export function ViewToggle({
  view,
  onChange,
}: {
  view: ListView;
  onChange: (view: ListView) => void;
}) {
  return (
    <div className="view-toggle" role="group" aria-label="Kiểu hiển thị">
      {(
        [
          ["grid", "Lưới", LayoutGrid],
          ["table", "Bảng", List],
        ] as const
      ).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          title={label}
          onClick={() => onChange(value)}
        >
          <Icon size={16} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
