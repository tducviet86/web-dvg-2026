import { vacantNow } from "./availability";
/**
 * Questions and answers for rental pages, written from the live listings so
 * every answer is a fact the site can stand behind (prices, free units,
 * sizes, furniture, location). Search engines and AI assistants read them
 * through FAQPage structured data; nothing is guessed — a question whose
 * answer the data does not hold is left out.
 */
import type { PortfolioProject, Property } from "@/types";

export type Faq = [question: string, answer: string];

const million = (vnd: number) =>
  `${(vnd / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
const range = (values: number[], unit: (n: number) => string) => {
  const low = Math.min(...values);
  const high = Math.max(...values);
  return low === high ? unit(low) : `${unit(low)} đến ${unit(high)}`;
};
const roomLabel = (bedrooms: number) =>
  bedrooms === 0 ? "studio" : `${bedrooms} phòng ngủ`;
const list = (items: string[]) =>
  items.length > 1
    ? `${items.slice(0, -1).join(", ")} và ${items.at(-1)}`
    : (items[0] ?? "");

/** Real units offered for rent (sample units left out). */
export const rentalUnits = (units: Property[]) =>
  units.filter((u) => !u.isDemo && u.forRent !== false);

/**
 * FAQs from the listings of one project, or of all rental projects when
 * `project` is not given.
 */
export function listingFaqs(
  units: Property[],
  project?: Pick<PortfolioProject, "name" | "location" | "projectId">,
  projects: Pick<PortfolioProject, "name" | "projectId">[] = [],
): Faq[] {
  const scope = rentalUnits(units).filter(
    (u) => !project || u.projectId === project.projectId,
  );
  const where = project ? project.name : "Đà Nẵng";
  const free = scope.filter(vacantNow);
  const faqs: Faq[] = [];

  if (project?.location)
    faqs.push([
      `${project.name} nằm ở đâu?`,
      `${project.name} nằm tại ${project.location}. Đất Vàng Group giới thiệu căn hộ cho thuê tại dự án này.`,
    ]);

  const priced = free.filter((u) => u.rentVnd);
  if (priced.length) {
    const byRooms = [...new Set(priced.map((u) => u.bedrooms))]
      .sort((a, b) => a - b)
      .map((rooms) => {
        const cheapest = Math.min(
          ...priced.filter((u) => u.bedrooms === rooms).map((u) => u.rentVnd!),
        );
        return `căn ${roomLabel(rooms)} từ ${million(cheapest)}`;
      });
    faqs.push([
      `Giá thuê căn hộ ${where} hiện nay khoảng bao nhiêu?`,
      `Các căn còn trống Đất Vàng Group đang cho thuê tại ${where} có giá từ ${range(
        priced.map((u) => u.rentVnd!),
        million,
      )} mỗi tháng${byRooms.length > 1 ? `: ${list(byRooms)}` : ""}. Giá có thể thay đổi theo thời điểm; chi phí đầy đủ được xác nhận trước khi ký hợp đồng.`,
    ]);
  }

  if (scope.length) {
    const inProjects = project
      ? ""
      : ` thuộc ${new Set(scope.map((u) => u.projectId)).size} dự án`;
    faqs.push([
      `Hiện còn bao nhiêu căn hộ cho thuê tại ${where}?`,
      free.length
        ? `Hiện có ${free.length} căn còn trống trong ${scope.length} căn Đất Vàng Group đang giới thiệu tại ${where}${inProjects}. Danh sách trên trang được cập nhật khi căn được thuê.`
        : `Các căn Đất Vàng Group giới thiệu tại ${where} hiện đã có khách. Hãy để lại số điện thoại để được báo khi có căn trống.`,
    ]);
  }

  if (!project) {
    const named = projects
      .map((p) => ({
        name: p.name,
        count: free.filter((u) => u.projectId === p.projectId).length,
      }))
      .filter((p) => p.count);
    if (named.length)
      faqs.push([
        "Đất Vàng Group cho thuê căn hộ ở những dự án nào?",
        `Đất Vàng Group đang có căn hộ còn trống tại ${list(
          named.map((p) => `${p.name} (${p.count} căn)`),
        )}.`,
      ]);
  }

  if (free.length) {
    const rooms = [...new Set(free.map((u) => u.bedrooms))]
      .sort((a, b) => a - b)
      .map(roomLabel);
    const areas = free.map((u) => u.area).filter((a) => a > 0);
    faqs.push([
      `Căn hộ cho thuê tại ${where} có diện tích và số phòng ngủ thế nào?`,
      `Các căn còn trống gồm loại ${list(rooms)}${
        areas.length ? `, diện tích từ ${range(areas, (n) => `${n} m²`)}` : ""
      }.`,
    ]);
    const furnished = free.filter((u) => u.furniture === "Đầy đủ nội thất");
    if (furnished.length)
      faqs.push([
        `Có căn hộ ${where} đầy đủ nội thất, vào ở ngay không?`,
        `Có. ${furnished.length} trong ${free.length} căn còn trống tại ${where} được trang bị đầy đủ nội thất. Mỗi căn ghi rõ danh sách tiện nghi trên trang chi tiết.`,
      ]);
  }
  return faqs;
}
