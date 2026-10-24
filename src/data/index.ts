import type { Service } from "@/types";
/**
 * Static company imagery and service descriptions (marketing copy that is
 * not managed in the CMS). Projects, units, posts, banners and pages come
 * from BE-DVG; the former mock data lives in BE-DVG/prisma/data.
 */
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
