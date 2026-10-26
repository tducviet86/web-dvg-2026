"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

export type Section = { heading: string; body: string };

/**
 * The content blocks of a page ("Tầm nhìn", "Giá trị cốt lõi"…): each has a
 * heading and a text. The list is kept in a hidden input as JSON so the
 * editor reads it like any other field.
 */
export function SectionsField({
  name,
  initial,
  onChange,
  describedBy,
}: {
  name: string;
  initial: Section[];
  onChange: () => void;
  describedBy?: string;
}) {
  const [items, setItems] = useState<Section[]>(() =>
    initial.length ? initial : [{ heading: "", body: "" }],
  );
  const first = useRef(true);
  // Report changes after the hidden input holds the new value.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const update = (index: number, patch: Partial<Section>) =>
    setItems((list) =>
      list.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  const move = (index: number, by: number) =>
    setItems((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next;
    });

  return (
    <div className="sections-field" aria-describedby={describedBy}>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <ol>
        {items.map((s, i) => (
          <li key={i} className="section-item">
            <div className="section-item-head">
              <span className="section-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <input
                aria-label={`Tiêu đề mục ${i + 1}`}
                placeholder="Tiêu đề mục, vd: Tầm nhìn"
                value={s.heading}
                maxLength={200}
                onChange={(e) => update(i, { heading: e.target.value })}
              />
              <div className="section-tools">
                <button
                  type="button"
                  aria-label={`Đưa mục ${i + 1} lên`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Đưa mục ${i + 1} xuống`}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  className="danger"
                  aria-label={`Xóa mục ${i + 1}`}
                  onClick={() =>
                    setItems((list) =>
                      list.length > 1
                        ? list.filter((_, n) => n !== i)
                        : [{ heading: "", body: "" }],
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <textarea
              aria-label={`Nội dung mục ${i + 1}`}
              placeholder={
                "Nội dung. Xuống dòng để tách ý; dòng bắt đầu bằng - hoặc • sẽ thành danh sách."
              }
              rows={5}
              maxLength={6000}
              value={s.body}
              onChange={(e) => update(i, { body: e.target.value })}
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="section-add"
        disabled={items.length >= 30}
        onClick={() => setItems((list) => [...list, { heading: "", body: "" }])}
      >
        <Plus size={16} /> Thêm mục
      </button>
    </div>
  );
}
