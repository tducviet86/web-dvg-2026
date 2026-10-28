"use client";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Eye,
  Heading2,
  Heading3,
  ImagePlus,
  Images,
  List,
  Quote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseArticle, type ArticleBlock } from "@/lib/article";
import { Library, UploadButton } from "./media";
import type { MediaRef } from "./model";

/** Reads a field of the editor form (title, sapo…) by its name. */
function formValue(area: HTMLTextAreaElement | null, name: string) {
  const el = area?.form?.elements.namedItem(name) as
    HTMLInputElement | HTMLTextAreaElement | null;
  return el?.value ?? "";
}

/** Replaces the text the cursor is on (whole lines) and keeps the change undoable. */
function editLines(
  area: HTMLTextAreaElement,
  change: (lines: string[]) => string[],
) {
  const { value, selectionStart, selectionEnd } = area;
  const start = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const endBreak = value.indexOf("\n", selectionEnd);
  const end = endBreak === -1 ? value.length : endBreak;
  const next = change(value.slice(start, end).split("\n")).join("\n");
  area.focus();
  area.setSelectionRange(start, end);
  // execCommand keeps Ctrl+Z working; setRangeText is the fallback.
  if (!document.execCommand?.("insertText", false, next))
    area.setRangeText(next, start, end, "select");
  area.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Adds the prefix to every line, or removes it when all lines have it. */
const togglePrefix = (prefix: string, others: RegExp) => (lines: string[]) => {
  const has = lines.every((l) => !l.trim() || l.startsWith(prefix));
  return lines.map((l) =>
    !l.trim()
      ? l
      : has
        ? l.slice(prefix.length)
        : prefix + l.replace(others, ""),
  );
};
const MARKS = /^(#{2,3}\s+|>\s?|[-•*]\s+)/;

/**
 * Writing tools under "Nội dung chi tiết" of a post: heading / quote / list
 * buttons, inserting a photo with its caption (a small dialog instead of the
 * browser prompt) and a full preview laid out like the article on the site.
 */
export function PostComposer({ targetId }: { targetId: string }) {
  const [library, setLibrary] = useState(false);
  /** Photos waiting for a caption, inserted one after another. */
  const [queue, setQueue] = useState<MediaRef[]>([]);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState(false);
  const [words, setWords] = useState(0);
  const area = () =>
    document.getElementById(targetId) as HTMLTextAreaElement | null;

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!(el instanceof HTMLTextAreaElement)) return;
    const count = () =>
      setWords(el.value.trim() ? el.value.trim().split(/\s+/).length : 0);
    count();
    el.addEventListener("input", count);
    return () => el.removeEventListener("input", count);
  }, [targetId]);

  function format(prefix: string) {
    const el = area();
    if (el) editLines(el, togglePrefix(prefix, MARKS));
  }
  function insertImage(media: MediaRef, text: string) {
    const el = area();
    if (!el) return;
    const before = el.value.slice(0, el.selectionStart);
    const gap =
      !before || before.endsWith("\n\n")
        ? ""
        : before.endsWith("\n")
          ? "\n"
          : "\n\n";
    const snippet = `${gap}![${text.replace(/[[\]\n]/g, " ").trim()}](${media.url})\n\n`;
    // Written straight into the field: the caption dialog still holds the focus.
    el.setRangeText(snippet, el.selectionStart, el.selectionEnd, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const current = queue[0];
  function next(insert: boolean) {
    if (insert && current) insertImage(current, caption);
    setCaption("");
    setQueue((q) => q.slice(1));
  }

  const el = preview ? area() : null;
  const blocks = preview ? parseArticle(el?.value ?? "") : [];
  const minutes = Math.max(1, Math.round(words / 200));

  return (
    <div className="post-composer">
      <div
        className="post-toolbar"
        role="toolbar"
        aria-label="Định dạng nội dung"
      >
        <button type="button" onClick={() => format("## ")}>
          <Heading2 size={16} aria-hidden="true" /> Tiêu đề mục
        </button>
        <button type="button" onClick={() => format("### ")}>
          <Heading3 size={16} aria-hidden="true" /> Tiêu đề nhỏ
        </button>
        <button type="button" onClick={() => format("> ")}>
          <Quote size={16} aria-hidden="true" /> Trích dẫn
        </button>
        <button type="button" onClick={() => format("- ")}>
          <List size={16} aria-hidden="true" /> Danh sách
        </button>
        <span className="post-toolbar-sep" aria-hidden="true" />
        <UploadButton
          multiple
          label="Chèn ảnh mới"
          onUploaded={(items) => setQueue((q) => [...q, ...items])}
        />
        <button type="button" onClick={() => setLibrary((open) => !open)}>
          <Images size={16} aria-hidden="true" /> Ảnh từ thư viện
        </button>
        <span className="post-toolbar-sep" aria-hidden="true" />
        <button
          type="button"
          className="post-preview-button"
          onClick={() => setPreview(true)}
        >
          <Eye size={16} aria-hidden="true" /> Xem trước bài viết
        </button>
        <small className="post-words" aria-live="polite">
          {words} chữ · khoảng {minutes} phút đọc
        </small>
      </div>
      {library && (
        <Library
          onClose={() => setLibrary(false)}
          onPick={(media) => {
            setQueue((q) => [...q, media]);
            setLibrary(false);
          }}
        />
      )}

      <Dialog.Root
        open={!!current}
        onOpenChange={(open) => !open && next(false)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="admin-dialog-overlay" />
          <Dialog.Content className="admin-dialog post-image-dialog">
            <Dialog.Title>Chèn ảnh vào bài</Dialog.Title>
            <Dialog.Description>
              Ảnh được chèn tại vị trí con trỏ trong nội dung.
              {queue.length > 1 && ` Còn ${queue.length - 1} ảnh tiếp theo.`}
            </Dialog.Description>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // The editor form around this dialog must not be submitted.
                e.stopPropagation();
                next(true);
              }}
            >
              {current && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="post-image-preview" src={current.url} alt="" />
              )}
              <label className="post-image-caption">
                Chú thích ảnh
                <input
                  autoFocus
                  value={caption}
                  maxLength={200}
                  placeholder="vd: Phòng khách hướng sông Hàn, căn 2PN The Monarchy"
                  onChange={(e) => setCaption(e.target.value)}
                />
                <small>
                  Hiện dưới ảnh và giúp Google hiểu ảnh. Có thể để trống.
                </small>
              </label>
              <div className="dialog-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => next(false)}
                >
                  Bỏ qua ảnh này
                </Button>
                <Button type="submit">
                  <ImagePlus size={16} aria-hidden="true" /> Chèn vào bài
                </Button>
              </div>
            </form>
            <Dialog.Close className="admin-dialog-close" aria-label="Đóng">
              <X size={18} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={preview} onOpenChange={setPreview}>
        <Dialog.Portal>
          <Dialog.Overlay className="admin-dialog-overlay" />
          <Dialog.Content className="post-preview-dialog">
            <div className="post-preview-bar">
              <Dialog.Title>Xem trước bài viết</Dialog.Title>
              <Dialog.Description>
                Bố cục như trên website, theo nội dung đang soạn (chưa lưu).
              </Dialog.Description>
              <Dialog.Close
                className="admin-dialog-close"
                aria-label="Đóng xem trước"
              >
                <X size={18} />
              </Dialog.Close>
            </div>
            <article className="post-preview">
              <span className="post-preview-category">
                {(() => {
                  const select = el?.form?.elements.namedItem(
                    "category",
                  ) as HTMLSelectElement | null;
                  return select?.selectedOptions[0]?.text ?? "";
                })()}
              </span>
              <h1>{formValue(el, "name") || "Tiêu đề bài viết"}</h1>
              <p className="post-preview-meta">
                {new Date().toLocaleDateString("vi-VN")} · {minutes} phút đọc ·{" "}
                {formValue(el, "author") || "Đất Vàng Group"}
              </p>
              {formValue(el, "description") && (
                <p className="post-preview-standfirst">
                  {formValue(el, "description")}
                </p>
              )}
              {blocks.length ? (
                <PreviewBody blocks={blocks} />
              ) : (
                <p className="post-preview-empty">
                  Chưa có nội dung. Hãy viết vào ô “Nội dung chi tiết”.
                </p>
              )}
            </article>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Lines({ text }: { text: string }) {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line}
    </span>
  ));
}

/** The article body as the public page shows it (blog-pages.tsx). */
function PreviewBody({ blocks }: { blocks: ArticleBlock[] }) {
  const toc = blocks.filter((b) => b.kind === "h2");
  const lead = blocks.findIndex((b) => b.kind === "p");
  return (
    <>
      {toc.length > 1 && (
        <nav className="post-preview-toc" aria-label="Mục lục (xem trước)">
          <span>NỘI DUNG CHÍNH</span>
          <ol>
            {toc.map((h, i) => (
              <li key={i}>{h.kind === "h2" && h.text}</li>
            ))}
          </ol>
        </nav>
      )}
      <div className="post-preview-body">
        {blocks.map((b, i) =>
          b.kind === "h2" ? (
            <h2 key={i}>{b.text}</h2>
          ) : b.kind === "h3" ? (
            <h3 key={i}>{b.text}</h3>
          ) : b.kind === "quote" ? (
            <blockquote key={i}>
              <Lines text={b.text} />
            </blockquote>
          ) : b.kind === "list" ? (
            <ul key={i}>
              {b.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          ) : b.kind === "figure" ? (
            <figure key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.src} alt={b.caption} />
              {b.caption && <figcaption>{b.caption}</figcaption>}
            </figure>
          ) : (
            <p key={i} className={i === lead ? "post-preview-lead" : undefined}>
              <Lines text={b.text} />
            </p>
          ),
        )}
      </div>
    </>
  );
}
