"use client";

import { createContext, useContext, useEffect, useId, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Film,
  Images,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  api,
  errorMessage,
  uploadMedia,
  type MediaAsset,
  type UploadPlace,
} from "./api";
import { isVideo, type MediaRef } from "./model";

const ACCEPT = "image/png,image/jpeg,image/webp,image/avif";
const ACCEPT_VIDEO = "video/mp4,video/webm,video/quicktime";

/**
 * The editor provides the record being edited (unit code or slug), read at
 * upload time so files are stored as can-ho/MB029/MB029-….webp.
 */
const UploadPlaceContext = createContext<() => UploadPlace | null>(() => null);
export const UploadPlaceProvider = UploadPlaceContext.Provider;

/** Recent uploads to pick from (the media library). */
function Library({
  onPick,
  onClose,
  type = "image",
}: {
  onPick: (media: MediaRef) => void;
  onClose: () => void;
  /** Restrict to images or videos; `all` shows both. */
  type?: "image" | "video" | "all";
}) {
  const [items, setItems] = useState<MediaAsset[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    let alive = true;
    api<{ data: MediaAsset[]; meta: { totalPages: number } }>(
      "GET",
      `/admin/media?page=${page}&pageSize=18${type === "all" ? "" : `&type=${type}`}`,
    )
      .then((res) => {
        if (!alive) return;
        setItems(res.data);
        setPages(res.meta.totalPages || 1);
      })
      .catch((error) => {
        if (alive) setFailure(errorMessage(error));
      });
    return () => {
      alive = false;
    };
  }, [page, type]);
  return (
    <div className="media-library" role="group" aria-label="Thư viện ảnh">
      {failure ? (
        <p role="alert">{failure}</p>
      ) : items === null ? (
        <p role="status">Đang tải thư viện…</p>
      ) : items.length === 0 ? (
        <p>Thư viện chưa có ảnh. Hãy tải ảnh lên.</p>
      ) : (
        <div className="media-library-grid">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() =>
                onPick({ id: item.id, url: item.url, mimeType: item.mimeType })
              }
              aria-label={`Chọn ${item.mimeType.startsWith("video/") ? "video" : "ảnh"} ${item.alt || item.id.slice(0, 8)}`}
            >
              {item.mimeType.startsWith("video/") ? (
                <video src={item.url} muted preload="metadata" />
              ) : (
                // Library thumbnails come from the media host or legacy paths.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}
      <div className="media-library-actions">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Trang trước
        </button>
        <span>
          {page}/{pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
        >
          Trang sau
        </button>
        <button type="button" onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  );
}

function UploadButton({
  multiple,
  onUploaded,
  label = "Tải ảnh lên",
}: {
  multiple?: boolean;
  onUploaded: (media: MediaRef[]) => void;
  label?: string;
}) {
  const place = useContext(UploadPlaceContext);
  const [busy, setBusy] = useState(false);
  return (
    <label className="banner-upload" aria-busy={busy}>
      <Upload size={15} />
      {busy ? "Đang tải lên…" : label}
      <input
        type="file"
        className="sr-only"
        accept={ACCEPT}
        multiple={multiple}
        disabled={busy}
        onChange={async (event) => {
          const input = event.currentTarget;
          const files = [...(input.files ?? [])];
          if (!files.length) return;
          setBusy(true);
          const done: MediaRef[] = [];
          for (const file of files)
            try {
              const media = await uploadMedia(file, undefined, place());
              done.push({ id: media.id, url: media.url });
            } catch (error) {
              toast.error(`${file.name}: ${errorMessage(error)}`);
            }
          setBusy(false);
          input.value = "";
          if (done.length) onUploaded(done);
        }}
      />
    </label>
  );
}

/** A single image chosen by media ID (upload or library). */
export function MediaPicker({
  label,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  value: MediaRef | null;
  onChange: (value: MediaRef | null) => void;
  required?: boolean;
  hint?: string;
}) {
  const id = useId();
  const [library, setLibrary] = useState(false);
  return (
    <div className="banner-image-field full" role="group" aria-labelledby={id}>
      <span id={id} className="media-field-label">
        {label}
        {required && <span className="required-mark"> *</span>}
      </span>
      <div className="editor-image-preview">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.url} alt="" />
        ) : (
          <span>Chưa chọn ảnh</span>
        )}
      </div>
      <div className="banner-image-actions">
        <UploadButton onUploaded={([media]) => onChange(media)} />
        <button
          type="button"
          className="admin-inline-button"
          onClick={() => setLibrary((open) => !open)}
        >
          <Images size={14} /> Chọn từ thư viện
        </button>
        {value && (
          <button
            type="button"
            className="admin-inline-button"
            onClick={() => onChange(null)}
          >
            Bỏ ảnh
          </button>
        )}
      </div>
      {library && (
        <Library
          onClose={() => setLibrary(false)}
          onPick={(media) => {
            onChange(media);
            setLibrary(false);
          }}
        />
      )}
      {hint && <small>{hint}</small>}
    </div>
  );
}

/**
 * Inserts an image into a post's text as `![caption](url)` at the cursor, so
 * articles can carry photos between paragraphs (rendered by blog-pages.tsx).
 */
export function ContentImageInsert({ targetId }: { targetId: string }) {
  const [library, setLibrary] = useState(false);
  function insert(media: MediaRef) {
    const area = document.getElementById(targetId);
    if (!(area instanceof HTMLTextAreaElement)) return;
    const caption = window.prompt("Chú thích ảnh (có thể để trống)", "") ?? "";
    const before = area.value.slice(0, area.selectionStart);
    const gap =
      !before || before.endsWith("\n\n")
        ? ""
        : before.endsWith("\n")
          ? "\n"
          : "\n\n";
    area.setRangeText(
      `${gap}![${caption.replace(/[[\]]/g, "")}](${media.url})\n\n`,
      area.selectionStart,
      area.selectionEnd,
      "end",
    );
    area.dispatchEvent(new Event("input", { bubbles: true }));
    area.focus();
  }
  return (
    <div className="content-image-insert">
      <div className="banner-image-actions">
        <UploadButton
          label="Chèn ảnh mới"
          onUploaded={(items) => items.forEach(insert)}
        />
        <button
          type="button"
          className="admin-inline-button"
          onClick={() => setLibrary((open) => !open)}
        >
          <Images size={14} /> Chèn từ thư viện
        </button>
      </div>
      {library && (
        <Library
          onClose={() => setLibrary(false)}
          onPick={(media) => {
            insert(media);
            setLibrary(false);
          }}
        />
      )}
    </div>
  );
}

/** An ordered list of images (gallery). */
export function MediaGallery({
  value,
  onChange,
}: {
  value: MediaRef[];
  onChange: (value: MediaRef[]) => void;
}) {
  const [library, setLibrary] = useState(false);
  const add = (items: MediaRef[]) =>
    onChange([
      ...value,
      ...items.filter((item) => !value.some((v) => v.id === item.id)),
    ]);
  const move = (index: number, offset: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item);
    onChange(next);
  };
  return (
    <div className="media-gallery" role="group" aria-label="Thư viện hình ảnh">
      <span className="media-field-label">Thư viện hình ảnh</span>
      {value.length ? (
        <ol>
          {value.map((item, index) => (
            <li key={item.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" loading="lazy" />
              <div>
                <button
                  type="button"
                  aria-label={`Đưa ảnh ${index + 1} lên trước`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowLeft size={13} />
                </button>
                <button
                  type="button"
                  aria-label={`Đưa ảnh ${index + 1} ra sau`}
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  aria-label={`Bỏ ảnh ${index + 1}`}
                  onClick={() =>
                    onChange(value.filter((v) => v.id !== item.id))
                  }
                >
                  <X size={13} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="banner-section-note">Chưa có ảnh trong thư viện.</p>
      )}
      <div className="banner-image-actions">
        <UploadButton multiple label="Thêm ảnh" onUploaded={add} />
        <button
          type="button"
          className="admin-inline-button"
          onClick={() => setLibrary((open) => !open)}
        >
          <Images size={14} /> Chọn từ thư viện
        </button>
      </div>
      {library && (
        <Library
          onClose={() => setLibrary(false)}
          onPick={(media) => add([media])}
        />
      )}
      <small>
        Ảnh được kiểm tra định dạng, nén sang WebP và lưu trên kho media. Dùng
        mũi tên để sắp xếp thứ tự hiển thị.
      </small>
    </div>
  );
}

/** Uploads files one by one; failures are reported per file. */
async function uploadAll(
  files: File[],
  onProgress: (done: number) => void,
  place: UploadPlace | null,
) {
  const done: MediaRef[] = [];
  for (const [i, file] of files.entries()) {
    try {
      const media = await uploadMedia(file, undefined, place);
      done.push({ id: media.id, url: media.url, mimeType: media.mimeType });
    } catch (error) {
      toast.error(`${file.name}: ${errorMessage(error)}`);
    }
    onProgress(i + 1);
  }
  return done;
}

/**
 * Images and videos of a unit, uploaded from the computer (no external
 * links). The first image is the cover; items can be reordered or removed.
 */
export function MediaManager({
  value,
  onChange,
  legacyVideo,
  onRemoveLegacyVideo,
}: {
  value: MediaRef[];
  onChange: (value: MediaRef[]) => void;
  /** A video path stored before uploads existed (e.g. /images/video.mp4). */
  legacyVideo?: string;
  onRemoveLegacyVideo?: () => void;
}) {
  const inputId = useId();
  const place = useContext(UploadPlaceContext);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [library, setLibrary] = useState(false);
  const coverIndex = value.findIndex((m) => !isVideo(m));
  const images = value.filter((m) => !isVideo(m)).length;
  const videos = value.length - images + (legacyVideo ? 1 : 0);

  const add = (items: MediaRef[]) =>
    onChange([
      ...value,
      ...items.filter((item) => !value.some((v) => v.id === item.id)),
    ]);
  async function upload(list: FileList | File[]) {
    const files = [...list].filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    );
    if (!files.length) {
      toast.error(
        "Chỉ hỗ trợ ảnh (JPG, PNG, WebP, AVIF) và video (MP4, MOV, WebM).",
      );
      return;
    }
    setProgress({ done: 0, total: files.length });
    const uploaded = await uploadAll(
      files,
      (done) => setProgress({ done, total: files.length }),
      place(),
    );
    setProgress(null);
    if (uploaded.length) {
      add(uploaded);
      toast.success(`Đã tải lên ${uploaded.length}/${files.length} tệp.`);
    }
  }
  const move = (index: number, offset: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item);
    onChange(next);
  };
  const makeCover = (index: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    onChange([item, ...next]);
  };
  return (
    <div
      className="media-manager"
      role="group"
      aria-labelledby={`${inputId}-title`}
    >
      <div className="media-manager-head">
        <span id={`${inputId}-title`} className="media-field-label">
          Ảnh & video căn hộ
        </span>
        <small>
          {images} ảnh · {videos} video
        </small>
      </div>
      <label
        htmlFor={inputId}
        className="media-dropzone"
        data-dragging={dragging}
        aria-busy={!!progress}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!progress) void upload(event.dataTransfer.files);
        }}
      >
        <Upload size={22} />
        <strong>
          {progress
            ? `Đang tải lên ${progress.done}/${progress.total}…`
            : "Kéo thả hoặc bấm để chọn tệp"}
        </strong>
        <small>
          Ảnh JPG, PNG, WebP, AVIF (tự nén WebP) · Video MP4, MOV, WebM (≤ 100
          MB) · Chọn được nhiều tệp
        </small>
        <input
          id={inputId}
          type="file"
          className="sr-only"
          multiple
          accept={`${ACCEPT},${ACCEPT_VIDEO}`}
          disabled={!!progress}
          onChange={async (event) => {
            const input = event.currentTarget;
            if (input.files?.length) await upload(input.files);
            input.value = "";
          }}
        />
      </label>
      {value.length || legacyVideo ? (
        <ol className="media-manager-grid">
          {value.map((item, index) => {
            const video = isVideo(item);
            const label = video ? `video ${index + 1}` : `ảnh ${index + 1}`;
            return (
              <li key={item.id} data-cover={index === coverIndex}>
                {video ? (
                  <video src={item.url} muted preload="metadata" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" loading="lazy" />
                )}
                {index === coverIndex && (
                  <span className="media-badge">Ảnh bìa</span>
                )}
                {video && (
                  <span className="media-badge media-badge-video">
                    <Film size={12} /> Video
                  </span>
                )}
                <div className="media-tile-actions">
                  <button
                    type="button"
                    aria-label={`Đưa ${label} lên trước`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Đưa ${label} ra sau`}
                    disabled={index === value.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowRight size={14} />
                  </button>
                  {!video && index !== coverIndex && (
                    <button
                      type="button"
                      aria-label={`Đặt ${label} làm ảnh bìa`}
                      onClick={() => makeCover(index)}
                    >
                      <Star size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="danger"
                    aria-label={`Xóa ${label}`}
                    onClick={() =>
                      onChange(value.filter((v) => v.id !== item.id))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
          {legacyVideo && (
            <li>
              <video src={legacyVideo} muted preload="metadata" />
              <span className="media-badge media-badge-video">
                <Film size={12} /> Video
              </span>
              <div className="media-tile-actions">
                <button
                  type="button"
                  className="danger"
                  aria-label="Xóa video hiện có"
                  onClick={onRemoveLegacyVideo}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          )}
        </ol>
      ) : (
        <p className="banner-section-note">
          Chưa có ảnh hoặc video. Căn hộ nên có ít nhất 3 ảnh.
        </p>
      )}
      <div className="banner-image-actions">
        <button
          type="button"
          className="admin-inline-button"
          onClick={() => setLibrary((open) => !open)}
        >
          <Images size={14} /> Chọn từ thư viện đã tải lên
        </button>
      </div>
      {library && (
        <Library
          type="all"
          onClose={() => setLibrary(false)}
          onPick={(media) => add([media])}
        />
      )}
      <small className="media-manager-help">
        Ảnh đầu tiên là ảnh bìa (dùng bấm ★ để đổi). Dùng mũi tên để sắp xếp thứ
        tự hiển thị; xóa khỏi căn hộ không xóa tệp khỏi thư viện.
      </small>
    </div>
  );
}
