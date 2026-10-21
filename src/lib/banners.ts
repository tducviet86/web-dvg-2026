import type { Banner, Project } from "@/types";

/** Storage key shared by the admin banner module and the project editor. */
export const BANNER_STORE = "banners";
/** Project status that removes a project from the public website. */
export const HIDDEN_PROJECT_STATUS = "Tạm ngưng";

export const isProjectPublic = (project: Project) =>
  project.status !== HIDDEN_PROJECT_STATUS;
/** Public detail route of a project, built from its current slug. */
export const projectHref = (project: Pick<Project, "slug">) =>
  `/du-an/${project.slug}`;

/** Local paths, HTTP(S) URLs and (for banners) uploaded data URLs. */
export function isImageSource(value: string, allowData = false) {
  if (!value) return false;
  if (value.startsWith("/images/") && !value.includes("..")) return true;
  if (allowData && /^data:image\/(png|jpe?g|webp|avif);base64,/.test(value))
    return true;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
/** next/image can only optimise local files and allow-listed hosts. */
export const canOptimizeImage = (src: string) =>
  (src.startsWith("/") && !src.startsWith("//")) ||
  src.startsWith("https://images.unsplash.com/");

export type ResolvedBanner = {
  id: string;
  type: Banner["type"];
  label: string;
  title: string;
  description?: string;
  image: string;
  mobileImage?: string;
  alt: string;
  /** Only set for PROJECT banners whose project is public. */
  href?: string;
  projectName?: string;
};

export const sortBanners = (banners: Banner[]) =>
  [...banners].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
  );

/** Re-number into one continuous 1..n sequence shared by both banner types. */
export const normalizeOrder = (banners: Banner[]) =>
  sortBanners(banners).map((banner, index) =>
    banner.sortOrder === index + 1
      ? banner
      : { ...banner, sortOrder: index + 1 },
  );

/** Inserts or replaces `banner`, placing it at 1-based `position`. */
export function placeBanner(
  banners: Banner[],
  banner: Banner,
  position: number,
) {
  const others = sortBanners(banners.filter((item) => item.id !== banner.id));
  const index = Math.min(Math.max(Math.round(position) - 1, 0), others.length);
  others.splice(index, 0, banner);
  return others.map((item, i) =>
    item.sortOrder === i + 1 ? item : { ...item, sortOrder: i + 1 },
  );
}

export const projectBannerOf = (banners: Banner[], projectId: string) =>
  banners.find((b) => b.type === "PROJECT" && b.projectId === projectId);

/**
 * Resolves the content a banner shows. Returns null when a PROJECT banner
 * points at a missing project. Admin previews pass `includeHidden` to
 * render banners whose project is not public.
 */
export function resolveBanner(
  banner: Banner,
  projectsById: Map<string, Project>,
  includeHidden = false,
): ResolvedBanner | null {
  const project =
    banner.type === "PROJECT" && banner.projectId
      ? projectsById.get(banner.projectId)
      : undefined;
  if (banner.type === "PROJECT" && !project) return null;
  const isPublic = project ? isProjectPublic(project) : true;
  if (!isPublic && !includeHidden) return null;
  const image =
    project && (banner.useProjectImage || !banner.imageUrl)
      ? project.image
      : banner.imageUrl;
  const title = banner.title?.trim() || project?.name || "";
  return {
    id: banner.id,
    type: banner.type,
    label: banner.label?.trim() || (project ? "DỰ ÁN NỔI BẬT" : ""),
    title,
    description: banner.description?.trim() || undefined,
    image,
    mobileImage:
      project && banner.useProjectImage
        ? undefined
        : banner.mobileImageUrl?.trim() || undefined,
    alt:
      banner.imageAlt?.trim() ||
      (project ? project.imageAlt || `Phối cảnh dự án ${project.name}` : title),
    href: project && isPublic ? projectHref(project) : undefined,
    projectName: project?.name,
  };
}

/**
 * Banners visible on the homepage: active, linked project present and
 * public, sorted by the shared order. One pass with a project lookup map.
 */
export function publicBanners(banners: Banner[], projects: Project[]) {
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  return sortBanners(banners)
    .filter((banner) => banner.isActive)
    .map((banner) => resolveBanner(banner, projectsById))
    .filter((banner): banner is ResolvedBanner => !!banner && !!banner.image);
}

/** Business rules shared by both admin entry points. */
export function validateBanner(
  banner: Banner,
  banners: Banner[],
  projects: Project[],
) {
  const issues: string[] = [];
  if (banner.type === "PROJECT") {
    if (!banner.projectId || !projects.some((p) => p.id === banner.projectId))
      issues.push("Banner dự án cần liên kết với một dự án còn tồn tại.");
    else {
      const duplicate = banners.find(
        (b) =>
          b.id !== banner.id &&
          b.type === "PROJECT" &&
          b.projectId === banner.projectId,
      );
      if (duplicate)
        issues.push(
          "Dự án này đã có banner. Hãy chỉnh sửa banner hiện có thay vì tạo mới.",
        );
    }
    if (!banner.useProjectImage && !isImageSource(banner.imageUrl, true))
      issues.push("Hãy chọn ảnh dự án hoặc nhập/tải lên ảnh banner hợp lệ.");
  } else {
    if (banner.projectId)
      issues.push("Banner thường không được liên kết dự án.");
    if (!isImageSource(banner.imageUrl, true))
      issues.push(
        "Ảnh banner cần là đường dẫn HTTP/HTTPS, /images/ten-anh.jpg hoặc ảnh tải lên.",
      );
  }
  if (banner.mobileImageUrl && !isImageSource(banner.mobileImageUrl, true))
    issues.push("Ảnh banner cho mobile không hợp lệ.");
  if ((banner.title?.length || 0) > 120)
    issues.push("Tiêu đề banner tối đa 120 ký tự.");
  if ((banner.description?.length || 0) > 240)
    issues.push("Mô tả banner tối đa 240 ký tự.");
  return issues;
}

/** Banner settings edited inside the project form. */
export type ProjectBannerDraft = {
  enabled: boolean;
  useProjectImage: boolean;
  imageUrl: string;
  mobileImageUrl: string;
  imageAlt: string;
  label: string;
  title: string;
  description: string;
  position: number;
};
export function projectBannerDraft(
  banner: Banner | undefined,
  total: number,
): ProjectBannerDraft {
  return {
    enabled: !!banner?.isActive,
    useProjectImage: banner ? !!banner.useProjectImage : true,
    imageUrl: banner?.imageUrl || "",
    mobileImageUrl: banner?.mobileImageUrl || "",
    imageAlt: banner?.imageAlt || "",
    label: banner?.label || "",
    title: banner?.title || "",
    description: banner?.description || "",
    position: banner?.sortOrder || total + 1,
  };
}
/**
 * Creates or updates the single PROJECT banner of `project` (upsert keyed by
 * project ID). Turning the toggle off only deactivates the banner and keeps
 * its content, so re-enabling restores it.
 */
export function syncProjectBanner(
  banners: Banner[],
  project: Project,
  draft: ProjectBannerDraft,
  projects: Project[],
  now = new Date().toISOString(),
): { banners: Banner[]; issues: string[] } {
  const existing = projectBannerOf(banners, project.id);
  if (!existing && !draft.enabled) return { banners, issues: [] };
  if (!draft.enabled && existing)
    return {
      banners: banners.map((b) =>
        b.id === existing.id ? { ...b, isActive: false, updatedAt: now } : b,
      ),
      issues: [],
    };
  const banner: Banner = {
    id: existing?.id || crypto.randomUUID(),
    type: "PROJECT",
    projectId: project.id,
    useProjectImage: draft.useProjectImage,
    imageUrl: draft.useProjectImage ? "" : draft.imageUrl.trim(),
    mobileImageUrl: draft.useProjectImage
      ? undefined
      : draft.mobileImageUrl.trim() || undefined,
    imageAlt: draft.imageAlt.trim() || undefined,
    label: draft.label.trim() || undefined,
    title: draft.title.trim() || undefined,
    description: draft.description.trim() || undefined,
    isActive: true,
    sortOrder: existing?.sortOrder || banners.length + 1,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const withProject = projects.some((p) => p.id === project.id)
    ? projects.map((p) => (p.id === project.id ? project : p))
    : [...projects, project];
  const issues = validateBanner(banner, banners, withProject);
  return {
    banners: issues.length
      ? banners
      : placeBanner(banners, banner, draft.position),
    issues,
  };
}
