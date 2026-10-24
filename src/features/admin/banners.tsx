"use client";

import { useCallback, useEffect, useId, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import Link from "@/components/page-navigation";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "./api";
import { MediaPicker } from "./media";
import type { MediaRef } from "./model";

/** Banner settings edited inside the project form (sent as `banner`). */
export type ProjectBannerDraft = {
  enabled: boolean;
  useProjectImage: boolean;
  image: MediaRef | null;
  mobileImage: MediaRef | null;
  imageAlt: string;
  label: string;
  title: string;
  description: string;
  position: number;
  /** Version loaded with the form, for conflict detection. */
  expectedBannerUpdatedAt?: string;
};
type ApiImage = { id: string; url: string; alt: string } | null;
export type AdminBanner = {
  id: string;
  type: "NORMAL" | "PROJECT";
  label: string | null;
  title: string | null;
  description: string | null;
  imageAlt: string | null;
  image: ApiImage;
  mobileImage: ApiImage;
  useProjectImage: boolean;
  projectId: string | null;
  project: {
    id: string;
    slug: string;
    name: string;
    status: string;
    deleted: boolean;
  } | null;
  isActive: boolean;
  sortOrder: number;
  publiclyVisible: boolean;
  preview: {
    label: string | null;
    title: string;
    description: string | null;
    image: ApiImage;
    mobileImage: ApiImage;
    href: string | null;
  };
  updatedAt: string;
};
export type ProjectBannerRecord = {
  id: string;
  isActive: boolean;
  useProjectImage: boolean;
  imageId: string | null;
  mobileImageId: string | null;
  imageAlt: string | null;
  label: string | null;
  title: string | null;
  description: string | null;
  sortOrder: number;
  updatedAt: string;
} | null;

export function projectBannerDraft(
  record: ProjectBannerRecord,
  images: { image: MediaRef | null; mobileImage: MediaRef | null },
  total: number,
): ProjectBannerDraft {
  return {
    enabled: !!record?.isActive,
    useProjectImage: record ? record.useProjectImage : true,
    image: images.image,
    mobileImage: images.mobileImage,
    imageAlt: record?.imageAlt ?? "",
    label: record?.label ?? "",
    title: record?.title ?? "",
    description: record?.description ?? "",
    position: record?.sortOrder ?? total + 1,
    expectedBannerUpdatedAt: record?.updatedAt,
  };
}
/** Request body for the project API (`banner` field). */
export const bannerPayload = (d: ProjectBannerDraft) => ({
  enabled: d.enabled,
  useProjectImage: d.useProjectImage,
  imageId: d.useProjectImage ? null : (d.image?.id ?? null),
  mobileImageId: d.useProjectImage ? null : (d.mobileImage?.id ?? null),
  imageAlt: d.imageAlt.trim() || null,
  label: d.label.trim() || null,
  title: d.title.trim() || null,
  description: d.description.trim() || null,
  position: d.position,
  expectedBannerUpdatedAt: d.expectedBannerUpdatedAt,
});

type Preview = {
  label?: string | null;
  title: string;
  description?: string | null;
  image?: string;
  mobileImage?: string;
  alt?: string;
  href?: string | null;
};

/** Mirrors the homepage banner layout for desktop and mobile. */
export function BannerPreview({
  banner,
  note,
}: {
  banner: Preview | null;
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
          // Preview accepts media from the CDN or legacy paths.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={banner?.alt || ""}
            onError={() => setFailed(src)}
          />
        ) : (
          <span className="banner-preview-empty">
            {src ? "Không tải được ảnh." : "Chưa có ảnh banner"}
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

type ContentValue = {
  title: string;
  description: string;
  label: string;
  imageAlt: string;
  position: number;
};
function ContentFields({
  value,
  onChange,
  titlePlaceholder,
  projectDescription,
  maxPosition,
}: {
  value: ContentValue;
  onChange: (patch: Partial<ContentValue>) => void;
  titlePlaceholder?: string;
  projectDescription?: string;
  maxPosition: number;
}) {
  return (
    <>
      <label className="full">
        <span>Tiêu đề banner</span>
        <input
          value={value.title}
          maxLength={120}
          placeholder={titlePlaceholder}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        {titlePlaceholder !== undefined && (
          <small>
            Để trống để dùng tên dự án (tự cập nhật khi đổi tên dự án).
          </small>
        )}
      </label>
      <label className="full">
        <span>Mô tả banner (tùy chọn)</span>
        <textarea
          rows={3}
          maxLength={240}
          value={value.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
        {projectDescription && (
          <button
            type="button"
            className="admin-inline-button"
            onClick={() =>
              onChange({ description: projectDescription.slice(0, 240) })
            }
          >
            Dùng mô tả ngắn của dự án
          </button>
        )}
      </label>
      <label>
        <span>Nhãn nhỏ (tùy chọn)</span>
        <input
          value={value.label}
          maxLength={40}
          placeholder="DỰ ÁN NỔI BẬT"
          onChange={(event) => onChange({ label: event.target.value })}
        />
      </label>
      <PositionField
        value={value.position}
        max={maxPosition}
        onChange={(position) => onChange({ position })}
      />
      <label className="full">
        <span>Mô tả ảnh (alt text)</span>
        <input
          value={value.imageAlt}
          maxLength={200}
          onChange={(event) => onChange({ imageAlt: event.target.value })}
        />
      </label>
    </>
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
  project: {
    name: string;
    slug: string;
    description: string;
    published: boolean;
    cover: MediaRef | null;
    coverAlt: string;
  };
  existing: boolean;
  maxPosition: number;
  draft: ProjectBannerDraft;
  onChange: (draft: ProjectBannerDraft) => void;
}) {
  const set = (patch: Partial<ProjectBannerDraft>) =>
    onChange({ ...draft, ...patch });
  const switchId = useId();
  const image = draft.useProjectImage ? project.cover : draft.image;
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
          {!project.published && (
            <p className="banner-section-warning" role="status">
              Dự án chưa ở trạng thái “Đã xuất bản”, banner sẽ chỉ hiển thị công
              khai sau khi dự án được xuất bản.
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
            {draft.useProjectImage && !project.cover && (
              <p className="banner-section-warning full" role="status">
                Dự án chưa có ảnh đại diện. Hãy thêm ảnh đại diện ở khung “Hình
                ảnh” hoặc chọn ảnh riêng cho banner.
              </p>
            )}
            {!draft.useProjectImage && (
              <>
                <MediaPicker
                  label="Ảnh banner (desktop)"
                  required
                  value={draft.image}
                  onChange={(img) => set({ image: img })}
                  hint="Khuyến nghị ảnh ngang ≥ 1920px, tỷ lệ khoảng 16:9."
                />
                <MediaPicker
                  label="Ảnh banner cho mobile (tùy chọn)"
                  value={draft.mobileImage}
                  onChange={(img) => set({ mobileImage: img })}
                  hint="Ảnh dọc cho màn hình nhỏ. Để trống sẽ dùng ảnh desktop."
                />
              </>
            )}
            <ContentFields
              value={draft}
              onChange={set}
              titlePlaceholder={project.name || "Tên dự án"}
              projectDescription={project.description}
              maxPosition={maxPosition}
            />
          </div>
          <BannerPreview
            banner={{
              label: draft.label || "DỰ ÁN NỔI BẬT",
              title: draft.title || project.name,
              description: draft.description,
              image: image?.url,
              mobileImage: draft.useProjectImage
                ? undefined
                : draft.mobileImage?.url,
              alt: draft.imageAlt || project.coverAlt,
              href: project.slug ? `/du-an/${project.slug}` : null,
            }}
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

type ProjectOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
  intro: string;
  banner: { id: string } | null;
};
type FormState = ContentValue & {
  type: "NORMAL" | "PROJECT";
  projectId: string;
  useProjectImage: boolean;
  image: MediaRef | null;
  mobileImage: MediaRef | null;
  isActive: boolean;
};
const ref = (img: ApiImage): MediaRef | null =>
  img ? { id: img.id, url: img.url } : null;

function BannerForm({
  banner,
  total,
  projects,
  onSaved,
  onCancel,
}: {
  banner: AdminBanner | null;
  total: number;
  projects: ProjectOption[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => ({
    type: banner?.type ?? "NORMAL",
    projectId: banner?.projectId ?? "",
    useProjectImage: banner?.useProjectImage ?? true,
    image: ref(banner?.image ?? null),
    mobileImage: ref(banner?.mobileImage ?? null),
    imageAlt: banner?.imageAlt ?? "",
    label: banner?.label ?? "",
    title: banner?.title ?? "",
    description: banner?.description ?? "",
    isActive: banner?.isActive ?? true,
    position: banner?.sortOrder ?? total + 1,
  }));
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });
  const project = projects.find((p) => p.id === form.projectId);
  const isProject = form.type === "PROJECT";
  const typeId = useId();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const issues: string[] = [];
    if (isProject && !form.projectId) issues.push("Hãy chọn dự án liên kết.");
    if ((!isProject || !form.useProjectImage) && !form.image)
      issues.push("Hãy chọn ảnh banner.");
    if (!isProject && !form.title.trim() && !form.imageAlt.trim())
      issues.push("Banner thường cần tiêu đề hoặc mô tả ảnh (alt text).");
    if (issues.length) {
      setErrors(issues);
      return;
    }
    const content = {
      label: form.label.trim() || null,
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      imageAlt: form.imageAlt.trim() || null,
      imageId:
        isProject && form.useProjectImage ? null : (form.image?.id ?? null),
      mobileImageId:
        isProject && form.useProjectImage
          ? null
          : (form.mobileImage?.id ?? null),
      useProjectImage: isProject ? form.useProjectImage : false,
      isActive: form.isActive,
      position: form.position,
    };
    setSaving(true);
    try {
      if (banner)
        await api("PATCH", `/admin/banners/${banner.id}`, {
          ...content,
          expectedUpdatedAt: banner.updatedAt,
        });
      else
        await api("POST", "/admin/banners", {
          ...content,
          type: form.type,
          projectId: isProject ? form.projectId : null,
        });
      toast.success("Đã lưu banner.");
      onSaved();
    } catch (error) {
      setErrors([errorMessage(error)]);
    } finally {
      setSaving(false);
    }
  }
  const image = isProject && form.useProjectImage ? null : form.image;
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
        <div className="editor-errors" tabIndex={-1} role="alert">
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
              {isProject && (
                <>
                  <label className="full">
                    <span>
                      Dự án liên kết <span className="required-mark">*</span>
                    </span>
                    <select
                      value={form.projectId}
                      required
                      disabled={!!banner}
                      onChange={(event) =>
                        set({ projectId: event.target.value })
                      }
                    >
                      <option value="">Chọn dự án…</option>
                      {projects.map((p) => {
                        const taken = !!p.banner && p.banner.id !== banner?.id;
                        return (
                          <option key={p.id} value={p.id} disabled={taken}>
                            {p.name}
                            {taken
                              ? " — đã có banner"
                              : p.status !== "PUBLISHED"
                                ? " — chưa xuất bản"
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
                  {project && project.status !== "PUBLISHED" && (
                    <p className="banner-section-warning full" role="status">
                      Dự án chưa xuất bản, banner sẽ không hiển thị công khai.
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
              {(!isProject || !form.useProjectImage) && (
                <>
                  <MediaPicker
                    label="Ảnh banner (desktop)"
                    required
                    value={form.image}
                    onChange={(img) => set({ image: img })}
                    hint="Khuyến nghị ảnh ngang ≥ 1920px, tỷ lệ khoảng 16:9."
                  />
                  <MediaPicker
                    label="Ảnh banner cho mobile (tùy chọn)"
                    value={form.mobileImage}
                    onChange={(img) => set({ mobileImage: img })}
                    hint="Ảnh dọc cho màn hình nhỏ. Để trống sẽ dùng ảnh desktop."
                  />
                </>
              )}
              <ContentFields
                value={form}
                onChange={set}
                titlePlaceholder={isProject ? project?.name : undefined}
                projectDescription={isProject ? project?.intro : undefined}
                maxPosition={total + (banner ? 0 : 1)}
              />
            </div>
          </section>
          <section className="admin-panel editor-section">
            <header>
              <span className="editor-section-number">03</span>
              <div>
                <h2>Hiển thị</h2>
                <p>Trạng thái của banner trong trình chiếu.</p>
              </div>
            </header>
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
          </section>
        </div>
        <aside className="editor-aside">
          <section className="admin-panel editor-media">
            <h2>
              <ImagePlus size={19} />
              Xem trước
            </h2>
            <BannerPreview
              banner={{
                label: form.label || (isProject ? "DỰ ÁN NỔI BẬT" : ""),
                title: form.title || project?.name || "",
                description: form.description,
                image:
                  image?.url ??
                  (isProject && banner?.preview.image
                    ? banner.preview.image.url
                    : undefined),
                mobileImage: form.mobileImage?.url,
                alt: form.imageAlt,
                href: isProject && project ? `/du-an/${project.slug}` : null,
              }}
            />
          </section>
        </aside>
      </div>
      <div className="editor-savebar">
        <span>
          {saving
            ? "Đang lưu lên máy chủ…"
            : "Kiểm tra bản xem trước trước khi lưu"}
        </span>
        <div>
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" disabled={saving}>
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
  canWrite,
  goTo,
}: {
  recordId?: string;
  action?: string;
  canWrite: boolean;
  goTo: (href: string) => void;
}) {
  const [banners, setBanners] = useState<AdminBanner[] | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [list, projectList] = await Promise.all([
        api<{ data: AdminBanner[] }>("GET", "/admin/banners"),
        api<{ data: ProjectOption[] }>("GET", "/admin/projects?pageSize=100"),
      ]);
      setBanners(list.data);
      setProjects(projectList.data);
    } catch (error) {
      toast.error(errorMessage(error));
      setBanners([]);
    }
  }, []);
  useEffect(() => {
    // Loaded on mount; writes reload explicitly.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const back = () => goTo("/admin/banners");
  const selected = banners?.find((b) => b.id === recordId);

  async function patch(
    banner: AdminBanner,
    body: Record<string, unknown>,
    done: string,
  ) {
    setBusy(true);
    try {
      await api("PATCH", `/admin/banners/${banner.id}`, {
        ...body,
        expectedUpdatedAt: banner.updatedAt,
      });
      toast.success(done);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      await load();
      setBusy(false);
    }
  }

  if (banners === null) return <p role="status">Đang tải banner…</p>;
  if (recordId && recordId !== "new" && !selected)
    return (
      <section className="admin-panel">
        <h2>Không tìm thấy banner</h2>
        <p>Banner này đã bị xóa.</p>
        <Button onClick={back}>Về danh sách</Button>
      </section>
    );
  if (recordId === "new" || (selected && action === "edit"))
    return (
      <BannerForm
        key={recordId}
        banner={selected ?? null}
        total={banners.length}
        projects={projects}
        onCancel={back}
        onSaved={() => {
          void load();
          back();
        }}
      />
    );
  if (selected && action === "delete")
    return (
      <section className="admin-panel admin-confirm-page">
        <span className="eyebrow">XÁC NHẬN THAO TÁC</span>
        <h2>Xóa banner “{selected.preview.title || "không tên"}”?</h2>
        <p>
          {selected.project
            ? `Chỉ xóa banner; dữ liệu dự án ${selected.project.name} được giữ nguyên và tùy chọn hiển thị trên banner của dự án sẽ chuyển về tắt.`
            : "Banner sẽ bị gỡ khỏi trang chủ. Thao tác này không thể hoàn tác."}
        </p>
        <div className="dialog-actions">
          <Button variant="outline" onClick={back}>
            Hủy
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api("DELETE", `/admin/banners/${selected.id}`);
                toast.success("Đã xóa banner.");
                await load();
                back();
              } catch (error) {
                toast.error(errorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            Xác nhận
          </Button>
        </div>
      </section>
    );
  const visibleCount = banners.filter((b) => b.publiclyVisible).length;
  return (
    <section className="admin-panel admin-list-panel">
      <div className="admin-table-toolbar">
        <span>
          {banners.length} banner · {visibleCount} đang hiển thị công khai
        </span>
      </div>
      {visibleCount === 0 && (
        <p className="banner-section-warning" role="status">
          Chưa có banner nào hiển thị công khai — trang chủ sẽ dùng ảnh nền mặc
          định.
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
            {banners.map((banner, index) => {
              const title = banner.preview.title || "Banner không tên";
              const state = !banner.isActive
                ? "Đã tắt"
                : banner.publiclyVisible
                  ? "Đang hiển thị"
                  : banner.project
                    ? "Ẩn — dự án chưa xuất bản"
                    : "Ẩn — thiếu ảnh";
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
                        disabled={!canWrite || busy || index === 0}
                        onClick={() =>
                          patch(
                            banner,
                            { position: banner.sortOrder - 1 },
                            "Đã cập nhật thứ tự banner.",
                          )
                        }
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Đưa ${title} xuống dưới`}
                        disabled={
                          !canWrite || busy || index === banners.length - 1
                        }
                        onClick={() =>
                          patch(
                            banner,
                            { position: banner.sortOrder + 1 },
                            "Đã cập nhật thứ tự banner.",
                          )
                        }
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="banner-row-title">
                      <span className="banner-thumb">
                        {banner.preview.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={banner.preview.image.url}
                            alt=""
                            loading="lazy"
                          />
                        )}
                      </span>
                      <span>
                        <strong>{title}</strong>
                        <small>
                          {banner.preview.description || banner.preview.label}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="status-pill" data-type={banner.type}>
                      {banner.type}
                    </span>
                    {banner.type === "PROJECT" && banner.project && (
                      <small>
                        <Link
                          href={`/admin/projects/${banner.project.id}/edit`}
                        >
                          <Link2 size={12} /> {banner.project.name} · /du-an/
                          {banner.project.slug}
                        </Link>
                      </small>
                    )}
                  </td>
                  <td>
                    <span
                      className="status-pill"
                      data-state={banner.publiclyVisible ? "on" : "off"}
                    >
                      {state}
                    </span>
                  </td>
                  <td>
                    {canWrite && (
                      <div className="table-actions">
                        <button
                          aria-label={`Sửa ${title}`}
                          onClick={() =>
                            goTo(`/admin/banners/${banner.id}/edit`)
                          }
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          aria-label={`${banner.isActive ? "Tắt" : "Bật"} ${title}`}
                          aria-pressed={banner.isActive}
                          disabled={busy}
                          onClick={() =>
                            patch(
                              banner,
                              { isActive: !banner.isActive },
                              banner.isActive
                                ? "Đã tắt banner."
                                : "Đã bật banner.",
                            )
                          }
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
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!banners.length && (
        <div className="empty-state">
          <h3>Chưa có banner</h3>
          <p>Thêm banner thường hoặc bật hiển thị banner trong form dự án.</p>
        </div>
      )}
    </section>
  );
}
