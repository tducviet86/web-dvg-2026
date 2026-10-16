import type { Project, Property, Post, Lead } from "@/types";
export type Kind = "projects" | "properties" | "posts" | "leads";
export type Row = Project | Property | Post | Lead;
export const statuses: Record<Kind, string[]> = {
  projects: ["Đang khai thác", "Sắp ra mắt", "Đang triển khai", "Tạm ngưng"],
  properties: ["Còn trống", "Đã cho thuê", "Đang bảo trì"],
  posts: ["Bản nháp", "Đã xuất bản", "Lưu trữ"],
  leads: ["Mới", "Đang tư vấn", "Hoàn tất", "Không phù hợp"],
};
export const names: Record<Kind, string> = {
  projects: "dự án",
  properties: "căn hộ",
  posts: "bài viết",
  leads: "khách hàng",
};
