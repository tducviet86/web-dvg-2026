import { vacantNow } from "./availability";
/**
 * Questions and answers for rental pages, written from the live listings so
 * every answer is a fact the site can stand behind (prices, free units,
 * sizes, furniture, location). Search engines and AI assistants read them
 * through FAQPage structured data; nothing is guessed — a question whose
 * answer the data does not hold is left out.
 */
import type { ApiProject } from "./api/types";
import { handoverSummary } from "./handover";
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

/**
 * FAQs of a project on sale, from what is stored about it.
 */
export function saleFaqs(
  name: string,
  api: Pick<
    ApiProject,
    | "address"
    | "location"
    | "developer"
    | "legalStatus"
    | "scale"
    | "towers"
    | "handoverNote"
  >,
  units: Pick<Property, "bedrooms" | "area">[],
): Faq[] {
  const faqs: Faq[] = [];
  const place = (api.address || api.location || "").trim();
  if (place) faqs.push([`${name} nằm ở đâu?`, `${name} nằm tại ${place}.`]);
  if (api.developer)
    faqs.push([`Chủ đầu tư ${name} là ai?`, `${api.developer}.`]);
  if (api.scale) faqs.push([`Quy mô ${name} như thế nào?`, `${api.scale}.`]);
  if (api.towers?.length)
    faqs.push([
      `${name} có những tòa nào?`,
      `Đất Vàng Group đang giới thiệu các tòa ${list(
        api.towers.map((x) => (x.note ? `${x.name} (${x.note})` : x.name)),
      )}.`,
    ]);
  const rooms = [...new Set(units.map((u) => u.bedrooms))].sort(
    (a, b) => a - b,
  );
  if (rooms.length)
    faqs.push([
      `${name} có những loại căn nào?`,
      `${name} có ${list(
        rooms.map(
          (n) =>
            `căn ${roomLabel(n)} ${range(
              units.filter((u) => u.bedrooms === n).map((u) => u.area),
              (m2) => `${m2.toLocaleString("vi-VN")} m²`,
            )}`,
        ),
      )}. Diện tích ghi theo thông thủy của căn mẫu.`,
    ]);
  if (api.legalStatus) faqs.push([`Pháp lý ${name} ra sao?`, api.legalStatus]);
  if (api.handoverNote)
    faqs.push([
      `Khi nào ${name} bàn giao?`,
      `Dự kiến bàn giao ${handoverSummary(api)}.`,
    ]);
  faqs.push([
    `Giá căn hộ ${name} là bao nhiêu?`,
    "Giá phụ thuộc vào từng căn và thời điểm. Vui lòng gọi Đất Vàng Group để nhận giá và chính sách mới nhất.",
  ]);
  return faqs;
}

/** FAQs of the page listing everything on sale. */
export function saleListFaqs(projects: string[], hasModels: boolean): Faq[] {
  const faqs: Faq[] = [];
  if (projects.length)
    faqs.push([
      "Đất Vàng Group đang bán căn hộ ở những dự án nào?",
      `Đất Vàng Group đang giới thiệu căn bán tại ${list(projects)}, Đà Nẵng.`,
    ]);
  if (hasModels)
    faqs.push([
      "Căn mẫu là gì?",
      "Căn mẫu giới thiệu bố cục và diện tích theo mặt bằng của dự án. Thông tin từng căn cụ thể được xác nhận khi tư vấn.",
    ]);
  faqs.push([
    "Làm sao để biết giá và tình trạng căn đang bán?",
    "Gọi hotline hoặc nhắn Zalo cho Đất Vàng Group để được xác nhận giá, tình trạng và giấy tờ của đúng căn trước khi giao dịch.",
  ]);
  return faqs;
}
