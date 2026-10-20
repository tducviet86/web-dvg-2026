import { homeProjects, projectStories } from "./home-projects";
import type { Project, Property, Post, Service, Lead } from "@/types";
export const photos = {
  hero: "/images/heroooo.png",
  building: "/images/img1.png",
  living:
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85",
  interior: "/images/nnna.png",
  pool: "/images/img2.png",
  bedroom:
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85",
  architecture: "/images/dvg-phacthao.png",
};
export const projects: Project[] = [...homeProjects]
  .sort(
    (a, b) =>
      Number(a.projectId.split("-")[1]) - Number(b.projectId.split("-")[1]),
  )
  .map((p) => ({
    id: p.projectId,
    slug: p.slug,
    name: p.name,
    location: p.location,
    type: "Căn hộ & bất động sản",
    status: p.group === "development" ? "Dự án triển khai" : "Đang khai thác",
    image: `/images/projects/${p.id}.jpg`,
    description: projectStories[p.id].intro,
    createdAt: "2026-10-19",
  }));
const operationProjects = projects.filter((p) =>
  homeProjects.some((h) => h.projectId === p.id && h.group === "operation"),
);
const names = operationProjects.map((p) => p.name);
const slugs = operationProjects.map((p) => p.slug);
const roomPhotos = [
  photos.living,
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=85",
  photos.bedroom,
];
export const properties: Property[] = Array.from({ length: 24 }, (_, i) => ({
  id: `property-${i + 1}`,
  slug: `can-ho-${slugs[i % operationProjects.length]}-demo-${String(i + 1).padStart(2, "0")}`,
  name: `${["Studio đón nắng", "Căn hộ 1 phòng ngủ thanh lịch", "Căn hộ 2 phòng ngủ view sông", "Căn hộ dịch vụ panorama"][i % 4]} · ${String(i + 1).padStart(2, "0")}`,
  projectId: operationProjects[i % operationProjects.length].id,
  location: operationProjects[i % operationProjects.length].location,
  type: ["Studio", "1 phòng ngủ", "2 phòng ngủ", "Căn hộ dịch vụ"][i % 4],
  price: 7.5 + (i % 9) * 2,
  area: 35 + (i % 7) * 12,
  bedrooms: i % 4 === 0 ? 0 : i % 4 === 2 ? 2 : 1,
  bathrooms: i % 4 === 2 ? 2 : 1,
  floor: 5 + i,
  furniture: i % 5 === 0 ? "Nội thất cơ bản" : "Đầy đủ nội thất",
  status: i % 5 === 0 ? "Đã cho thuê" : "Còn trống",
  image: roomPhotos[i % roomPhotos.length],
  description: `Không gian ${35 + (i % 7) * 12} m² được bố trí thoáng đãng, với khu sinh hoạt chung ngập ánh sáng và khu bếp tiện dụng. Căn hộ mẫu tại ${names[i % operationProjects.length]} phù hợp cho người tìm kiếm một nơi ở chỉn chu, dễ dàng kết nối với nhịp sống Đà Nẵng. Giá minh họa chưa bao gồm phí quản lý và tiện ích.`,
  updatedAt: "2026-10-10",
}));
const titles = [
  "Kinh nghiệm thuê căn hộ tại Đà Nẵng: bắt đầu từ đâu?",
  "Không gian sống xanh giữa lòng thành phố",
  "Chủ nhà cần chuẩn bị gì trước khi cho thuê căn hộ?",
  "Một buổi sáng bên sông Hàn",
  "Nội thất tối giản, trải nghiệm trọn vẹn",
  "Checklist bàn giao căn hộ dành cho người thuê",
  "Hiểu đúng về dịch vụ quản lý bất động sản",
  "Studio hay căn hộ một phòng ngủ?",
  "Ánh sáng tự nhiên trong kiến trúc nhà ở",
  "Lập kế hoạch chi phí thuê nhà hàng tháng",
  "Chăm sóc căn hộ trong mùa mưa",
  "Xây dựng mối quan hệ thuê nhà bền vững",
];
export const posts: Post[] = titles.map((name, i) => ({
  id: `post-${i + 1}`,
  slug: [
    "kinh-nghiem-thue-can-ho-da-nang",
    ...Array.from(
      { length: 11 },
      (_, j) => `goc-nhin-khong-gian-song-${j + 2}`,
    ),
  ][i],
  name,
  category: ["Cẩm nang thuê nhà", "Phong cách sống", "Góc nhìn chủ sở hữu"][
    i % 3
  ],
  categorySlug: ["cam-nang-thue-nha", "phong-cach-song", "goc-nhin-chu-so-huu"][
    i % 3
  ],
  image: [photos.interior, photos.building, photos.living][i % 3],
  description: [
    "Từ lựa chọn khu vực đến kiểm tra hiện trạng: những điều nhỏ giúp bạn tìm được nơi ở phù hợp.",
    "Nhìn lại cách ánh sáng, vật liệu và cây xanh tạo nên một không gian sống dễ chịu mỗi ngày.",
    "Một quy trình rõ ràng giúp chủ sở hữu và người thuê cùng an tâm trong suốt thời gian hợp tác.",
  ][i % 3],
  status: "Đã xuất bản",
  createdAt: `2026-10-${String(12 - i).padStart(2, "0")}`,
  readingTime: 4 + (i % 4),
}));
export const services: Service[] = [
  "Quản lý vận hành bất động sản",
  "Khai thác căn hộ cho thuê",
  "Hợp tác cùng chủ sở hữu",
  "Tư vấn đầu tư",
  "Tối ưu không gian sống",
  "Chăm sóc và bảo trì căn hộ",
].map((name, i) => ({
  id: `service-${i + 1}`,
  slug: [
    "quan-ly-bat-dong-san",
    "khai-thac-cho-thue",
    "hop-tac-chu-so-huu",
    "tu-van-dau-tu",
    "toi-uu-khong-gian",
    "cham-soc-bao-tri",
  ][i],
  name,
  description: [
    "Đồng hành từ tiếp nhận căn hộ, theo dõi vận hành đến báo cáo định kỳ, với quy trình rõ ràng và dễ theo dõi.",
    "Kết nối căn hộ với nhu cầu phù hợp, hỗ trợ giới thiệu không gian, đón tiếp và chăm sóc người thuê.",
    "Lắng nghe mục tiêu của chủ sở hữu để xây dựng phương án hợp tác phù hợp với từng tài sản.",
    "Cùng xem xét mục tiêu, ngân sách và các yếu tố thị trường trước mỗi quyết định dài hạn.",
    "Gợi ý bố trí nội thất, ánh sáng và công năng để mỗi mét vuông mang lại giá trị sử dụng.",
    "Lên lịch kiểm tra, ghi nhận hiện trạng và phối hợp bảo trì để duy trì trải nghiệm sống.",
  ][i],
  image: [photos.interior, photos.living, photos.building][i % 3],
}));
export const testimonials = Array.from({ length: 8 }, (_, i) => ({
  id: `review-${i + 1}`,
  name: [
    "Minh Anh",
    "Hoàng Nam",
    "Thảo Nguyên",
    "Quang Huy",
    "Ngọc Hà",
    "Thanh Tâm",
    "Bảo An",
    "Gia Linh",
  ][i],
  role:
    i % 2
      ? "Chủ sở hữu căn hộ · Nhân vật hư cấu"
      : "Khách thuê căn hộ · Nhân vật hư cấu",
  quote: [
    "Điều tôi trân trọng là sự lắng nghe. Mỗi gợi ý đều bắt đầu từ nhu cầu thực tế của gia đình, để nơi ở mới thực sự trở thành nhà.",
    "Một quy trình rõ ràng giúp tôi dễ dàng theo dõi căn hộ và có thêm thời gian cho những ưu tiên khác.",
  ][i % 2],
}));
export const adminUsers = Array.from({ length: 5 }, (_, i) => ({
  id: `user-${i + 1}`,
  name: ["An Nguyễn", "Bình Trần", "Chi Lê", "Dũng Phạm", "Hà Võ"][i],
  role: i === 0 ? "Quản trị" : "Tư vấn viên",
}));
export const leads: Lead[] = Array.from({ length: 20 }, (_, i) => ({
  id: `lead-${i + 1}`,
  name: `Khách hàng demo ${i + 1}`,
  email: `khach${i + 1}@example.com`,
  phone: "",
  message: `Quan tâm ${properties[i].name}`,
  source: i % 2 ? "Tư vấn căn hộ" : "Hợp tác chủ sở hữu",
  status: ["Mới", "Đang tư vấn", "Hoàn tất"][i % 3],
  assignment: adminUsers[i % 5].name,
  notes: "Dữ liệu minh họa, không phải khách hàng thực.",
  createdAt: `2026-${String(5 + (i % 6)).padStart(2, "0")}-${String(1 + i).padStart(2, "0")}`,
}));
