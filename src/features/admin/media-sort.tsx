"use client";

import { useLayoutEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Film, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isVideo, type MediaRef } from "./model";

type Drag = { id: string; grabX: number; grabY: number; x: number; y: number };

/**
 * "Chỉnh sửa ảnh": the unit's photos and videos large, in a popup, put in
 * order by dragging (mouse or finger) or with the arrow keys, made the main
 * photo (★) or removed. The first photo is the main one (the cover).
 * Nothing changes until "Áp dụng".
 */
export function MediaSortDialog({
  items,
  onApply,
  onClose,
}: {
  items: MediaRef[];
  onApply: (items: MediaRef[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(items);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [said, setSaid] = useState("");
  const grid = useRef<HTMLOListElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const tiles = useRef(new Map<string, HTMLLIElement>());
  const coverId = draft.find((m) => !isVideo(m))?.id;
  const label = (m: MediaRef, i: number) =>
    `${isVideo(m) ? "Video" : "Ảnh"} ${i + 1}`;

  function moveTo(id: string, to: number) {
    setDraft((list) => {
      const from = list.findIndex((m) => m.id === id);
      if (from === to || to < 0 || to >= list.length) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }
  /** Says where an item went, for screen readers. */
  const announce = (id: string, to: number) => {
    const item = draft.find((m) => m.id === id)!;
    setSaid(
      to === 0 && !isVideo(item)
        ? "Đã đặt làm ảnh chính."
        : `Đã chuyển tới vị trí ${to + 1} trên ${draft.length}.`,
    );
  };

  // The dragged tile follows the pointer from wherever its slot now is.
  useLayoutEffect(() => {
    for (const [id, el] of tiles.current)
      el.style.transform =
        drag?.id === id && grid.current
          ? `translate(${drag.x - grid.current.getBoundingClientRect().left - drag.grabX - el.offsetLeft}px, ${drag.y - grid.current.getBoundingClientRect().top - drag.grabY - el.offsetTop}px)`
          : "";
  }, [drag, draft]);

  function onPointerMove(event: React.PointerEvent) {
    if (!drag) return;
    const { clientX: x, clientY: y } = event;
    setDrag({ ...drag, x, y });
    // The slot under the pointer takes the dragged item.
    for (const [id, el] of tiles.current) {
      if (id === drag.id) continue;
      const box = el.getBoundingClientRect();
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)
        moveTo(
          drag.id,
          draft.findIndex((m) => m.id === id),
        );
    }
    // Near the top or bottom of a long list: scroll.
    const view = body.current?.getBoundingClientRect();
    if (view && y < view.top + 48) body.current!.scrollBy(0, -14);
    else if (view && y > view.bottom - 48) body.current!.scrollBy(0, 14);
  }
  function endDrag() {
    if (!drag) return;
    announce(
      drag.id,
      draft.findIndex((m) => m.id === drag.id),
    );
    setDrag(null);
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="admin-dialog-overlay" />
        <Dialog.Content
          className="admin-dialog media-sort"
          aria-describedby="media-sort-desc"
        >
          <header className="media-sort-head">
            <Dialog.Title>Chỉnh sửa ảnh & video</Dialog.Title>
            <Dialog.Description id="media-sort-desc">
              Kéo thả để đổi thứ tự (hoặc chọn một ảnh rồi dùng phím mũi tên),
              bấm ★ để đặt làm ảnh chính, bấm thùng rác để xóa. Ảnh đầu tiên là{" "}
              <strong>ảnh chính</strong>, hiện trên thẻ căn và đầu trang căn hộ.
            </Dialog.Description>
          </header>
          <div className="media-sort-body" ref={body}>
            {!draft.length && (
              <p className="media-sort-empty">
                Đã xóa hết ảnh và video. Bấm “Áp dụng” để lưu như vậy, hoặc
                “Hủy” để giữ lại.
              </p>
            )}
            <ol
              ref={grid}
              className="media-sort-grid"
              data-dragging={drag ? "" : undefined}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {draft.map((item, index) => {
                const video = isVideo(item);
                const cover = item.id === coverId;
                return (
                  <li
                    key={item.id}
                    ref={(el) => {
                      if (el) tiles.current.set(item.id, el);
                      else tiles.current.delete(item.id);
                    }}
                    tabIndex={0}
                    aria-label={`${label(item, index)}${cover ? ", ảnh chính" : ""}. Phím mũi tên để di chuyển.`}
                    data-cover={cover || undefined}
                    data-dragged={drag?.id === item.id || undefined}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      if ((event.target as Element).closest("button")) return;
                      const box = event.currentTarget.getBoundingClientRect();
                      event.currentTarget.parentElement?.setPointerCapture(
                        event.pointerId,
                      );
                      setDrag({
                        id: item.id,
                        grabX: event.clientX - box.left,
                        grabY: event.clientY - box.top,
                        x: event.clientX,
                        y: event.clientY,
                      });
                    }}
                    onKeyDown={(event) => {
                      const to = {
                        ArrowLeft: index - 1,
                        ArrowUp: index - 1,
                        ArrowRight: index + 1,
                        ArrowDown: index + 1,
                        Home: 0,
                        End: draft.length - 1,
                      }[event.key];
                      if (to === undefined) return;
                      event.preventDefault();
                      if (to < 0 || to >= draft.length) return;
                      moveTo(item.id, to);
                      announce(item.id, to);
                      // Focus stays on the tile in its new place.
                      requestAnimationFrame(() =>
                        tiles.current.get(item.id)?.focus(),
                      );
                    }}
                  >
                    {video ? (
                      <video src={item.url} muted preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt="" draggable={false} />
                    )}
                    <span className="media-sort-number" aria-hidden="true">
                      {index + 1}
                    </span>
                    {cover && <span className="media-badge">Ảnh chính</span>}
                    {video && (
                      <span className="media-badge media-badge-video">
                        <Film size={12} /> Video
                      </span>
                    )}
                    <button
                      type="button"
                      className="media-sort-remove"
                      aria-label={`Xóa ${label(item, index).toLowerCase()}`}
                      title="Xóa"
                      onClick={() => {
                        setDraft((list) =>
                          list.filter((m) => m.id !== item.id),
                        );
                        setSaid(`Đã xóa ${label(item, index).toLowerCase()}.`);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                    {!video && !cover && (
                      <button
                        type="button"
                        className="media-sort-star"
                        aria-label={`Đặt ${label(item, index).toLowerCase()} làm ảnh chính`}
                        onClick={() => {
                          moveTo(item.id, 0);
                          announce(item.id, 0);
                        }}
                      >
                        <Star size={14} /> Đặt làm ảnh chính
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
          <footer className="media-sort-foot">
            <span aria-live="polite" className="media-sort-said">
              {said}
            </span>
            <Dialog.Close asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              Áp dụng
            </Button>
          </footer>
          <Dialog.Close className="admin-dialog-close" aria-label="Đóng">
            <X size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
