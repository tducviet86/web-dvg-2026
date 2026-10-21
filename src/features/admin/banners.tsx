"use client";

import { useId, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Link2,
  Monitor,
  MousePointerClick,
  Pencil,
  Save,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import Link from "@/components/page-navigation";
import { Button } from "@/components/ui/button";
import { photos } from "@/data";
import { readStore } from "@/lib/storage";
import {
  BANNER_STORE,
  HIDDEN_PROJECT_STATUS,
  isProjectPublic,
  normalizeOrder,
  placeBanner,
  projectBannerOf,
  publicBanners,
  resolveBanner,
  sortBanners,
  validateBanner,
  type ProjectBannerDraft,
  type ResolvedBanner,
} from "@/lib/banners";
import type { Banner, BannerType, Project } from "@/types";

const MAX_UPLOAD_LENGTH = 1_600_000;

/** Downscales an uploaded file into a compact data URL for browser storage. */
async function compressImage(file: File, maxWidth: number) {
  if (!/^image\/(png|jpeg|webp|avif)$/.test(file.type))
    throw new Error("Chỉ hỗ trợ ảnh PNG, JPG, WebP hoặc AVIF.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let url = canvas.toDataURL("image/webp", 0.82);
  if (!url.startsWith("data:image/webp"))
    url = canvas.toDataURL("image/jpeg", 0.82);
  if (url.length > MAX_UPLOAD_LENGTH)
    throw new Error("Ảnh sau khi nén vẫn quá lớn. Hãy chọn ảnh nhỏ hơn.");
  return url;
}

function ImageField({
  label,
  value,
  onChange,
  maxWidth,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxWidth: number;
  required?: boolean;
  hint?: string;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const uploaded = value.startsWith("data:");
  return (
    <div className="banner-image-field full">
      <label htmlFor={id}>
        <span>
          {label}
          {required && <span className="required-mark"> *</span>}
        </span>
        <input
          id={id}
          value={uploaded ? "" : value}
          placeholder={
            uploaded
              ? "Đang dùng ảnh tải lên từ máy"
              : "/images/ten-anh.jpg hoặc https://…"
          }
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
      </label>
      <div className="banner-image-actions">
        <label className="banner-upload" aria-busy={busy}>
          <Upload size={15} />
          {busy ? "Đang xử lý…" : "Tải ảnh lên"}
          <input
            type="file"
            className="sr-only"
            accept="image/png,image/jpeg,image/webp,image/avif"
            disabled={busy}
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                onChange(await compressImage(file, maxWidth));
              } catch (error) {
                toast.error(
                  error instanceof Error && error.message
                    ? error.message
                    : "Không thể đọc tệp ảnh.",
                );
              } finally {
                setBusy(false);
                input.value = "";
              }
            }}
          />
        </label>
        <select
          aria-label={`Chọn nhanh ảnh minh họa cho ${label.toLowerCase()}`}
          value={Object.values(photos).includes(value) ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Chọn ảnh minh họa…</option>
          {Object.entries(photos).map(([key, url], index) => (
            <option value={url} key={key}>
              Không gian minh họa {index + 1}
            </option>
          ))}
        </select>
        {value && (
          <button
            type="button"
            className="admin-inline-button"
            onClick={() => onChange("")}
          >
            Bỏ ảnh
          </button>
        )}
      </div>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}

/** Mirrors the homepage banner layout for desktop and mobile. */
export function BannerPreview({
  banner,
  note,
}: {
  banner: ResolvedBanner | null;
  note?: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [failed, setFailed] = useState("");
  const src =
    device === "mobile" ? banner?.mobileImage || banner?.image : banner?.image;
  return (
    <div className="banner-preview">
      <div
        className="banner-preview-devices"
        role="group"
        aria-label="Thiết bị xem trước"
      >
        {(
          [
            ["desktop", "Desktop", Monitor],
            ["mobile", "Mobile", Smartphone],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            type="button"
            key={key}
            aria-pressed={device === key}
            onClick={() => setDevice(key)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      <div
        className={`banner-preview-frame is-${device}`}
        data-linked={!!banner?.href}
      >
        {src && failed !== src ? (
          // Preview accepts arbitrary admin URLs and uploaded data URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={banner?.alt || ""}
            onError={() => setFailed(src)}
          />
        ) : (
          <span className="banner-preview-empty">
            {src
              ? "Không tải được ảnh. Kiểm tra lại đường dẫn."
              : "Chưa có ảnh banner"}
          </span>
        )}
        <div className="banner-preview-shade" />
        <div className="banner-preview-caption">
          {banner?.label && <span>{banner.label}</span>}
          <p>{banner?.title || "Tiêu đề banner"}</p>
          {banner?.description && <small>{banner.description}</small>}
          {banner?.href && <em>Xem chi tiết dự án ↗</em>}
        </div>
        {banner?.href && (
          <span className="banner-preview-hotspot">
            <MousePointerClick size={13} />
            Vùng click: toàn bộ banner → {banner.href}
          </span>
        )}
      </div>
      <p className="banner-preview-note">
        {note ||
          (banner?.href
            ? "Người dùng click hoặc chạm vào bất kỳ vị trí nào trên banner để mở trang chi tiết dự án."
            : "Banner thường không có liên kết: không điều hướng và không hiển thị con trỏ dạng bàn tay.")}
      </p>
    </div>
  );
}

function PositionField({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id}>
      <span>Thứ tự hiển thị</span>
      <input
        id={id}
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 1)}
        aria-describedby={`${id}-hint`}
      />
      <small id={`${id}-hint`}>
        1 = hiển thị đầu tiên. Dùng chung một thứ tự cho banner thường và banner
        dự án (tối đa {max}).
      </small>
    </label>
  );
}

/** "Hiển thị trên Banner trang chủ" section of the project editor. */
export function ProjectBannerSection({
  number,
  project,
  existing,
  maxPosition,
  draft,
  onChange,
}: {
  number: number;
  project: Project;
  existing?: Banner;
  maxPosition: number;
  draft: ProjectBannerDraft;
  onChange: (draft: ProjectBannerDraft) => void;
}) {
  const set = (patch: Partial<ProjectBannerDraft>) =>
    onChange({ ...draft, ...patch });
  const switchId = useId();
  const preview = useMemo(
    () =>
      resolveBanner(
        {
          id: existing?.id || "preview",
          type: "PROJECT",
          projectId: project.id,
          useProjectImage: draft.useProjectImage,
          imageUrl: draft.imageUrl,
          mobileImageUrl: draft.mobileImageUrl,
          imageAlt: draft.imageAlt,
          label: draft.label,
          title: draft.title,
          description: draft.description,
          isActive: true,
          sortOrder: draft.position,
          createdAt: "",
          updatedAt: "",
        },
        new Map([[project.id, project]]),
        true,
      ),
    [draft, existing?.id, project],
  );
  const hidden = !isProjectPublic(project);
  return (
    <section
      className="admin-panel editor-section"
      id={`editor-section-${number - 1}`}
    >
      <header>
        <span className="editor-section-number">
          {String(number).padStart(2, "0")}
        </span>
        <div>
          <h2>Hiển thị trên Banner trang chủ</h2>
          <p>
            Banner được liên kết theo mã dự án và dẫn tới trang chi tiết theo
            đường dẫn hiện tại của dự án. Có thể quản lý cùng banner này tại mục
            Banner.
          </p>
        </div>
      </header>
      <label className="banner-switch" htmlFor={switchId}>
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          checked={draft.enabled}
          onChange={(event) => set({ enabled: event.target.checked })}
        />
        <span aria-hidden="true" />
        Hiển thị dự án trên Banner trang chủ
      </label>
      {!draft.enabled ? (
        <p className="banner-section-note">
          {existing
            ? "Banner của dự án đang tắt. Nội dung banner vẫn được giữ lại và khôi phục khi bật lại."
            : "Mặc định tắt. Bật để tạo banner liên kết tới trang chi tiết của dự án."}
        </p>
      ) : (
        <>
          {hidden && (
            <p className="banner-section-warning" role="status">
              Dự án đang ở trạng thái “{HIDDEN_PROJECT_STATUS}”, banner sẽ không
              hiển thị công khai cho tới khi dự án được mở lại.
            </p>
          )}
          <div className="form-grid">
            <fieldset className="banner-choice full">
              <legend>Hình ảnh banner</legend>
              <label>
                <input
                  type="radio"
                  checked={draft.useProjectImage}
                  onChange={() => set({ useProjectImage: true })}
                />
                Dùng ảnh đại diện dự án
              </label>
              <label>
                <input
                  type="radio"
                  checked={!draft.useProjectImage}
                  onChange={() => set({ useProjectImage: false })}
                />
                Ảnh riêng cho banner (không thay đổi ảnh đại diện)
              </label>
            </fieldset>
            {!draft.useProjectImage && (
              <>
                <ImageField
                  label="Ảnh banner (desktop)"
                  required
                  value={draft.imageUrl}
                  maxWidth={1920}
                  onChange={(imageUrl) => set({ imageUrl })}
                  hint="Khuyến nghị ảnh ngang ≥ 1920px, tỷ lệ khoảng 16:9."
                />
                <ImageField
                  label="Ảnh banner cho mobile (tùy chọn)"
                  value={draft.mobileImageUrl}
                  maxWidth={900}
                  onChange={(mobileImageUrl) => set({ mobileImageUrl })}
                  hint="Ảnh dọc cho màn hình nhỏ. Để trống sẽ dùng ảnh desktop."
                />
              </>
            )}
            <label className="full">
              <span>Tiêu đề banner</span>
              <input
                value={draft.title}
                maxLength={120}
                placeholder={project.name || "Tên dự án"}
                onChange={(event) => set({ title: event.target.value })}
              />
              <small>
                Để trống để dùng tên dự án (tự cập nhật khi đổi tên dự án).
              </small>
            </label>
            <label className="full">
              <span>Mô tả banner (tùy chọn)</span>
              <textarea
                rows={3}
                maxLength={240}
                value={draft.description}
                onChange={(event) => set({ description: event.target.value })}
              />
              {project.description && (
                <button
                  type="button"
                  className="admin-inline-button"
                  onClick={() =>
                    set({ description: project.description.slice(0, 240) })
                  }
                >
                  Dùng mô tả ngắn của dự án
                </button>
              )}
            </label>
            <label>
              <span>Nhãn nhỏ (tùy chọn)</span>
              <input
                value={draft.label}
                maxLength={40}
                placeholder="DỰ ÁN NỔI BẬT"
                onChange={(event) => set({ label: event.target.value })}
              />
            </label>
            <PositionField
              value={draft.position}
              max={maxPosition}
              onChange={(position) => set({ position })}
            />
            <label className="full">
              <span>Mô tả ảnh (alt text)</span>
              <input
                value={draft.imageAlt}
                maxLength={200}
                placeholder={`Phối cảnh dự án ${project.name}`}
                onChange={(event) => set({ imageAlt: event.target.value })}
              />
            </label>
          </div>
          <BannerPreview
            banner={preview}
            note={
              project.slug
                ? undefined
                : "Nhập đường dẫn (slug) cho dự án để tạo liên kết banner."
            }
          />
        </>
      )}
    </section>
  );
}

type FormState = {
  type: BannerType;
  projectId: string;
  useProjectImage: boolean;
  imageUrl: string;
  mobileImageUrl: string;
  imageAlt: string;
  label: string;
  title: string;
  description: string;
  isActive: boolean;
  position: number;
};

function BannerForm({
  banner,
  banners,
  projects,
  onSave,
  onCancel,
}: {
  banner: Banner | null;
  banners: Banner[];
  projects: Project[];
  onSave: (banner: Banner, position: number) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => ({
    type: banner?.type || "NORMAL",
    projectId: banner?.projectId || "",
    useProjectImage: banner?.useProjectImage ?? true,
    imageUrl: banner?.imageUrl || "",
    mobileImageUrl: banner?.mobileImageUrl || "",
    imageAlt: banner?.imageAlt || "",
    label: banner?.label || "",
    title: banner?.title || "",
    description: banner?.description || "",
    isActive: banner?.isActive ?? true,
    position: banner?.sortOrder || banners.length + 1,
  }));
  const [errors, setErrors] = useState<string[]>([]);
  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });
  const project = projects.find((p) => p.id === form.projectId);
  const record: Banner = {
    id: banner?.id || "draft",
    type: form.type,
    projectId: form.type === "PROJECT" ? form.projectId || null : null,
    useProjectImage: form.type === "PROJECT" ? form.useProjectImage : undefined,
    imageUrl:
      form.type === "PROJECT" && form.useProjectImage
        ? ""
        : form.imageUrl.trim(),
    mobileImageUrl:
      form.type === "PROJECT" && form.useProjectImage
        ? undefined
        : form.mobileImageUrl.trim() || undefined,
    imageAlt: form.imageAlt.trim() || undefined,
    label: form.label.trim() || undefined,
    title: form.title.trim() || undefined,
    description: form.description.trim() || undefined,
    isActive: form.isActive,
    sortOrder: form.position,
    createdAt: banner?.createdAt || "",
    updatedAt: banner?.updatedAt || "",
  };
  const preview = resolveBanner(
    record,
    new Map(projects.map((p) => [p.id, p])),
    true,
  );
  const typeId = useId();
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const issues = validateBanner(record, banners, projects);
    if (form.type === "NORMAL" && !record.title && !record.imageAlt)
      issues.push("Banner thường cần tiêu đề hoặc mô tả ảnh (alt text).");
    if (issues.length) {
      setErrors(issues);
      requestAnimationFrame(() =>
        document.getElementById("editor-errors")?.focus(),
      );
      return;
    }
    const now = new Date().toISOString();
    onSave(
      {
        ...record,
        id: banner?.id || crypto.randomUUID(),
        createdAt: banner?.createdAt || now,
        updatedAt: now,
      },
      form.position,
    );
  }
  return (
    <form onSubmit={submit} className="admin-editor admin-editor-page">
      <div className="editor-topline">
        <button type="button" onClick={onCancel}>
          <ArrowLeft size={17} />
          Về danh sách
        </button>
        <span>{banner ? "Đang chỉnh sửa banner" : "Banner mới"}</span>
      </div>
      {errors.length > 0 && (
        <div
          className="editor-errors"
          id="editor-errors"
          tabIndex={-1}
          role="alert"
        >
          <strong>Vui lòng kiểm tra lại thông tin</strong>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="editor-layout">
        <div className="editor-sections">
          <section className="admin-panel editor-section">
            <header>
              <span className="editor-section-number">01</span>
              <div>
                <h2 id={typeId}>Loại banner</h2>
                <p>
                  Banner thường chỉ hiển thị hình ảnh. Banner dự án dẫn tới
                  trang chi tiết của dự án được chọn.
                </p>
              </div>
            </header>
            <fieldset className="banner-type-picker" aria-labelledby={typeId}>
              {(
                [
                  [
                    "NORMAL",
                    "Banner thường",
                    "Ảnh và nội dung, không có liên kết.",
                  ],
                  [
                    "PROJECT",
                    "Banner dự án",
                    "Click để mở trang chi tiết dự án.",
                  ],
                ] as const
              ).map(([value, label, text]) => (
                <label key={value} data-checked={form.type === value}>
                  <input
                    type="radio"
                    name="banner-type"
                    value={value}
                    checked={form.type === value}
                    disabled={!!banner && banner.type !== value}
                    onChange={() => set({ type: value })}
                  />
                  <strong>{label}</strong>
                  <small>{text}</small>
                </label>
              ))}
            </fieldset>
            {banner && (
              <p className="banner-section-note">
                Loại banner được giữ cố định sau khi tạo để tránh mất liên kết.
              </p>
            )}
          </section>
          <section className="admin-panel editor-section">
            <header>
              <span className="editor-section-number">02</span>
              <div>
                <h2>Nội dung & hình ảnh</h2>
                <p>Tiêu đề, mô tả và hình ảnh hiển thị trên trang chủ.</p>
              </div>
            </header>
            <div className="form-grid">
              {form.type === "PROJECT" && (
                <>
                  <label className="full">
                    <span>
                      Dự án liên kết <span className="required-mark">*</span>
                    </span>
                    <select
                      value={form.projectId}
                      required
                      onChange={(event) =>
                        set({ projectId: event.target.value })
                      }
                    >
                      <option value="">Chọn dự án…</option>
                      {projects.map((p) => {
                        const taken = projectBannerOf(banners, p.id);
                        return (
                          <option
                            key={p.id}
                            value={p.id}
                            disabled={!!taken && taken.id !== banner?.id}
                          >
                            {p.name}
                            {taken && taken.id !== banner?.id
                              ? " — đã có banner"
                              : !isProjectPublic(p)
                                ? ` — ${p.status}`
                                : ""}
                          </option>
                        );
                      })}
                    </select>
                    <small>
                      Mỗi dự án có tối đa một banner. Cấu hình này cũng có thể
                      chỉnh trong form dự án.
                      {project && (
                        <>
                          {" "}
                          <Link href={`/admin/projects/${project.id}/edit`}>
                            Mở dự án {project.name}
                          </Link>
                        </>
                      )}
                    </small>
                  </label>
                  {project && !isProjectPublic(project) && (
                    <p className="banner-section-warning full" role="status">
                      Dự án đang “{project.status}”, banner sẽ không hiển thị
                      công khai.
                    </p>
                  )}
                  <fieldset className="banner-choice full">
                    <legend>Hình ảnh banner</legend>
                    <label>
                      <input
                        type="radio"
                        checked={form.useProjectImage}
                        onChange={() => set({ useProjectImage: true })}
                      />
                      Dùng ảnh đại diện dự án
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={!form.useProjectImage}
                        onChange={() => set({ useProjectImage: false })}
                      />
                      Ảnh riêng cho banner
                    </label>
                  </fieldset>
                </>
              )}
              {(form.type === "NORMAL" || !form.useProjectImage) && (
                <>
                  <ImageField
                    label="Ảnh banner (desktop)"
                    required
                    value={form.imageUrl}
                    maxWidth={1920}
                    onChange={(imageUrl) => set({ imageUrl })}
                    hint="Khuyến nghị ảnh ngang ≥ 1920px, tỷ lệ khoảng 16:9."
                  />
                  <ImageField
                    label="Ảnh banner cho mobile (tùy chọn)"
                    value={form.mobileImageUrl}
                    maxWidth={900}
                    onChange={(mobileImageUrl) => set({ mobileImageUrl })}
                    hint="Ảnh dọc cho màn hình nhỏ. Để trống sẽ dùng ảnh desktop."
                  />
                </>
              )}
              <label className="full">
                <span>Tiêu đề banner</span>
                <input
                  value={form.title}
                  maxLength={120}
                  placeholder={project?.name}
                  onChange={(event) => set({ title: event.target.value })}
                />
                {form.type === "PROJECT" && (
                  <small>Để trống để dùng tên dự án.</small>
                )}
              </label>
              <label className="full">
                <span>Mô tả (tùy chọn)</span>
                <textarea
                  rows={3}
                  maxLength={240}
                  value={form.description}
                  onChange={(event) => set({ description: event.target.value })}
                />
                {project?.description && (
                  <button
                    type="button"
                    className="admin-inline-button"
                    onClick={() =>
                      set({ description: project.description.slice(0, 240) })
                    }
                  >
                    Dùng mô tả ngắn của dự án
                  </button>
                )}
              </label>
              <label>
                <span>Nhãn nhỏ (tùy chọn)</span>
                <input
                  value={form.label}
                  maxLength={40}
                  placeholder={
                    form.type === "PROJECT"
                      ? "DỰ ÁN NỔI BẬT"
                      : "KHÔNG GIAN SỐNG"
                  }
                  onChange={(event) => set({ label: event.target.value })}
                />
              </label>
              <label>
                <span>Mô tả ảnh (alt text)</span>
                <input
                  value={form.imageAlt}
                  maxLength={200}
                  onChange={(event) => set({ imageAlt: event.target.value })}
                />
              </label>
            </div>
          </section>
          <section className="admin-panel editor-section">
            <header>
              <span className="editor-section-number">03</span>
              <div>
                <h2>Hiển thị</h2>
                <p>Trạng thái và vị trí của banner trong trình chiếu.</p>
              </div>
            </header>
            <div className="form-grid">
              <label className="banner-switch">
                <input
                  type="checkbox"
                  role="switch"
                  checked={form.isActive}
                  onChange={(event) => set({ isActive: event.target.checked })}
                />
                <span aria-hidden="true" />
                Bật hiển thị trên trang chủ
              </label>
              <PositionField
                value={form.position}
                max={banners.length + (banner ? 0 : 1)}
                onChange={(position) => set({ position })}
              />
            </div>
          </section>
        </div>
        <aside className="editor-aside">
          <section className="admin-panel editor-media">
            <h2>
              <ImagePlus size={19} />
              Xem trước
            </h2>
            <BannerPreview banner={preview} />
          </section>
        </aside>
      </div>
      <div className="editor-savebar">
        <span>Kiểm tra bản xem trước trước khi lưu</span>
        <div>
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit">
            <Save size={17} />
            Lưu banner
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Admin "Banner" tab: list, create, edit and delete routes. */
export function BannerAdmin({
  recordId,
  action,
  banners,
  projects,
  onCommit,
  goTo,
}: {
  recordId?: string;
  action?: string;
  banners: Banner[];
  projects: Project[];
  onCommit: (banners: Banner[]) => boolean;
  goTo: (href: string) => void;
}) {
  const sorted = sortBanners(banners);
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const selected = banners.find((b) => b.id === recordId);
  const back = () => goTo("/admin/banners");
  const visibleCount = publicBanners(banners, projects).length;

  /** Re-reads storage so edits made in the project form are not overwritten. */
  function latest(id?: string) {
    const rows = readStore<Banner[]>(BANNER_STORE, banners);
    if (id) {
      const before = banners.find((b) => b.id === id);
      const now = rows.find((b) => b.id === id);
      if (JSON.stringify(before) !== JSON.stringify(now)) {
        toast.error(
          "Banner đã thay đổi ở nơi khác (ví dụ form dự án). Hãy tải lại trang trước khi lưu.",
        );
        return null;
      }
    }
    return rows;
  }
  function move(banner: Banner, offset: number) {
    const rows = latest(banner.id);
    if (rows && onCommit(placeBanner(rows, banner, banner.sortOrder + offset)))
      toast.success("Đã cập nhật thứ tự banner.");
  }
  function toggle(banner: Banner) {
    const rows = latest(banner.id);
    if (!rows) return;
    const next = { ...banner, isActive: !banner.isActive };
    if (next.isActive) {
      const issues = validateBanner(next, rows, projects);
      if (issues.length) {
        toast.error(issues[0]);
        return;
      }
    }
    next.updatedAt = new Date().toISOString();
    if (onCommit(rows.map((b) => (b.id === next.id ? next : b))))
      toast.success(next.isActive ? "Đã bật banner." : "Đã tắt banner.");
  }

  if (recordId && recordId !== "new" && !selected)
    return (
      <section className="admin-panel">
        <h2>Không tìm thấy banner</h2>
        <p>Banner này đã bị xóa hoặc chưa có trong trình duyệt hiện tại.</p>
        <Button onClick={back}>Về danh sách</Button>
      </section>
    );
  if (recordId === "new" || (selected && action === "edit"))
    return (
      <BannerForm
        key={recordId}
        banner={selected || null}
        banners={banners}
        projects={projects}
        onCancel={back}
        onSave={(banner, position) => {
          const rows = latest(selected?.id);
          if (!rows) return;
          const issues = validateBanner(banner, rows, projects);
          if (issues.length) {
            toast.error(issues[0]);
            return;
          }
          if (onCommit(placeBanner(rows, banner, position))) {
            toast.success("Đã lưu banner.");
            back();
          }
        }}
      />
    );
  if (selected && action === "delete") {
    const linked = selected.projectId
      ? projectsById.get(selected.projectId)
      : undefined;
    return (
      <section className="admin-panel admin-confirm-page">
        <span className="eyebrow">XÁC NHẬN THAO TÁC</span>
        <h2>
          Xóa banner “
          {resolveBanner(selected, projectsById, true)?.title || "không tên"}”?
        </h2>
        <p>
          {linked
            ? `Chỉ xóa banner; dữ liệu dự án ${linked.name} được giữ nguyên và tùy chọn hiển thị trên banner của dự án sẽ chuyển về tắt.`
            : "Banner sẽ bị gỡ khỏi trang chủ. Thao tác này không thể hoàn tác riêng lẻ."}
        </p>
        <div className="dialog-actions">
          <Button variant="outline" onClick={back}>
            Hủy
          </Button>
          <Button
            onClick={() => {
              const rows = latest(selected.id);
              if (
                rows &&
                onCommit(
                  normalizeOrder(rows.filter((b) => b.id !== selected.id)),
                )
              ) {
                toast.success("Đã xóa banner.");
                back();
              }
            }}
          >
            Xác nhận
          </Button>
        </div>
      </section>
    );
  }
  return (
    <section className="admin-panel admin-list-panel">
      <div className="admin-table-toolbar">
        <span>
          {sorted.length} banner · {visibleCount} đang hiển thị công khai
        </span>
      </div>
      {visibleCount === 0 && (
        <p className="banner-section-warning" role="status">
          Chưa có banner nào hiển thị công khai — trang chủ sẽ dùng bộ banner
          mặc định.
        </p>
      )}
      <div className="table-scroll">
        <table className="banner-table">
          <thead>
            <tr>
              <th>Thứ tự</th>
              <th>Banner</th>
              <th>Loại / Dự án liên kết</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((banner, index) => {
              const resolved = resolveBanner(banner, projectsById, true);
              const project = banner.projectId
                ? projectsById.get(banner.projectId)
                : undefined;
              const title = resolved?.title || "Banner không tên";
              const state = !banner.isActive
                ? "Đã tắt"
                : banner.type === "PROJECT" && !project
                  ? "Lỗi: dự án không tồn tại"
                  : project && !isProjectPublic(project)
                    ? `Ẩn — dự án ${project.status.toLowerCase()}`
                    : "Đang hiển thị";
              return (
                <tr key={banner.id}>
                  <td>
                    <div className="banner-order">
                      <strong>
                        {String(banner.sortOrder).padStart(2, "0")}
                      </strong>
                      <button
                        type="button"
                        aria-label={`Đưa ${title} lên trên`}
                        disabled={index === 0}
                        onClick={() => move(banner, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Đưa ${title} xuống dưới`}
                        disabled={index === sorted.length - 1}
                        onClick={() => move(banner, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="banner-row-title">
                      <span className="banner-thumb">
                        {resolved?.image && (
                          // Thumbnails may be uploaded data URLs or external hosts.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolved.image} alt="" loading="lazy" />
                        )}
                      </span>
                      <span>
                        <strong>{title}</strong>
                        <small>
                          {resolved?.description || resolved?.label}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="status-pill" data-type={banner.type}>
                      {banner.type}
                    </span>
                    {banner.type === "PROJECT" && (
                      <small>
                        {project ? (
                          <Link href={`/admin/projects/${project.id}/edit`}>
                            <Link2 size={12} /> {project.name} · /du-an/
                            {project.slug}
                          </Link>
                        ) : (
                          "Dự án đã bị xóa"
                        )}
                      </small>
                    )}
                  </td>
                  <td>
                    <span
                      className="status-pill"
                      data-state={state === "Đang hiển thị" ? "on" : "off"}
                    >
                      {state}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        aria-label={`Sửa ${title}`}
                        onClick={() => goTo(`/admin/banners/${banner.id}/edit`)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        aria-label={`${banner.isActive ? "Tắt" : "Bật"} ${title}`}
                        aria-pressed={banner.isActive}
                        onClick={() => toggle(banner)}
                      >
                        {banner.isActive ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
                        )}
                      </button>
                      <button
                        aria-label={`Xóa ${title}`}
                        onClick={() =>
                          goTo(`/admin/banners/${banner.id}/delete`)
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!sorted.length && (
        <div className="empty-state">
          <h3>Chưa có banner</h3>
          <p>Thêm banner thường hoặc bật hiển thị banner trong form dự án.</p>
        </div>
      )}
    </section>
  );
}
