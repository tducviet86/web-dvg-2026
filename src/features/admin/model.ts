/** Admin content kinds handled by the generic list/editor screens. */
export type Kind = "projects" | "properties" | "posts" | "leads";
export type FormValue = string | number | boolean | string[] | null | undefined;
/** Flat form values keyed by field name (what the editor renders). */
export type FormValues = Record<string, FormValue>;
/** An uploaded file; `mimeType` tells images from videos (absent = image). */
export type MediaRef = { id: string; url: string; mimeType?: string };
export const isVideo = (m: MediaRef) =>
  m.mimeType
    ? m.mimeType.startsWith("video/")
    : /\.(mp4|webm|mov)(\?|$)/i.test(m.url);
/** One row of an admin list table. */
export type ListItem = {
  id: string;
  name: string;
  subtitle: string;
  info: string;
  infoDetail?: string;
  status: string;
  statusLabel: string;
  badge?: string;
  /** Units only: "Cho thuê" and/or "Bán". */
  listing?: { rent: boolean; sale: boolean };
};

export const endpoints: Record<Kind, string> = {
  projects: "/admin/projects",
  properties: "/admin/properties",
  posts: "/admin/blog/posts",
  leads: "/admin/leads",
};

export const publishOptions: [string, string][] = [
  ["DRAFT", "Bản nháp"],
  ["PUBLISHED", "Đã xuất bản"],
  ["ARCHIVED", "Lưu trữ"],
];
export const leadStatusOptions: [string, string][] = [
  ["NEW", "Mới"],
  ["CONTACTING", "Đang tư vấn"],
  ["DONE", "Hoàn tất"],
  ["UNQUALIFIED", "Không phù hợp"],
];
/** Status filter options per kind ([API value, label]). */
export const statuses: Record<Kind, [string, string][]> = {
  projects: publishOptions.slice(0, 2),
  properties: publishOptions.slice(0, 2),
  posts: publishOptions.slice(0, 2),
  leads: leadStatusOptions,
};
export const statusLabel = (kind: Kind, value: string) =>
  statuses[kind].find(([key]) => key === value)?.[1] ??
  publishOptions.find(([key]) => key === value)?.[1] ??
  value;

export const names: Record<Kind, string> = {
  projects: "dự án",
  properties: "căn hộ",
  posts: "bài viết",
  leads: "khách hàng",
};

/** Permission needed to open each admin section. */
export const sectionPermission: Record<string, string> = {
  projects: "content:read",
  properties: "content:read",
  posts: "content:read",
  banners: "content:read",
  leads: "leads:read",
  settings: "settings:write",
  users: "users:manage",
  translations: "content:read",
};
export const writePermission: Record<Kind, string> = {
  projects: "projects:write",
  properties: "properties:write",
  posts: "blog:write",
  leads: "leads:write",
};
