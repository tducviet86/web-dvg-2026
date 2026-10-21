# Cập nhật trải nghiệm thuê — 21/10/2026

## Các trang để xem

- `/cho-thue`: danh sách, tìm kiếm theo tên/mã căn/dự án, bộ lọc, lưu yêu thích, dạng lưới/danh sách.
- `/cho-thue/du-an/monarchy-apartments`, `/cho-thue/du-an/sun-panoma`, `/cho-thue/du-an/sun-ponte-residence`, `/cho-thue/du-an/sam-tower`, `/cho-thue/du-an/hiyori-garden-tower`: nội dung thuê theo dự án, checklist và liên kết nội bộ.
- `/cho-thue/can-ho-sun-ponte-residence-demo-01`: căn mẫu được gắn video doanh nghiệp cung cấp để xem thử thư viện.

## Ảnh và video

- Ảnh đại diện: `Property.image`. Bộ ảnh: `Property.gallery`, mỗi đường dẫn một dòng, không còn giới hạn ba ảnh. Loại bỏ ảnh trùng đường dẫn.
- Video: `Property.videoUrl`. File người dùng cung cấp đã có tại `public/images/video.mp4` (H.264/AAC, 720×1280, khoảng 81 giây). URL dùng trong trình duyệt là `/images/video.mp4`.
- Hỗ trợ MP4/WebM nội bộ dưới `/images/`, MP4/WebM HTTPS và liên kết YouTube. Không tự phát. Chỉ tạo trình phát khi khách chọn Video; rời video sẽ dừng phát.
- Video dọc được giữ đầy đủ tỷ lệ. Kiểm tra file nội bộ tồn tại trước khi đưa vào thư viện, có thông báo khi tải video thất bại.
- Trong admin: phần hình ảnh có thư viện nhiều ảnh và trường video, hỗ trợ đường dẫn nội bộ. Lưu ý kiến trúc hiện có: admin lưu localStorage, trang công khai đọc dữ liệu trong `src/data/index.ts`. Chưa có CMS/API đồng bộ giữa hai phần.
- Chưa có thông tin căn cụ thể tương ứng video, giá và bộ ảnh thực tế từng căn. Giữ nhãn căn mẫu; không coi video này là xác nhận căn thuộc dự án cụ thể. Ảnh nội thất cũ vẫn là ảnh minh họa, không tự gán thành ảnh căn thật.

## Bản đồ do doanh nghiệp cung cấp

Giải liên kết và lấy tọa độ marker (không lấy tọa độ tâm viewport):

| Dự án | Liên kết gốc | Tọa độ marker |
| --- | --- | --- |
| Monarchy | https://maps.app.goo.gl/p7nJ78qqGhvqEweS7 | 16.0548413, 108.2329786 |
| Sun Panoma | https://maps.app.goo.gl/9z4BBFMd3ovgpS5y5 | 16.0524094, 108.236731 |
| Sun Ponte Residence | https://maps.app.goo.gl/qkp75Kg1P8nbW5uk9 | 16.0581693, 108.2307594 |

Bản đồ nhúng tải chậm; nút mở Google Maps giữ nguyên đúng liên kết người dùng gửi. Hiển thị trên trang thuê theo dự án, chi tiết căn và trang vận hành tương ứng.

## SEO và điều hướng

- Metadata riêng, canonical, Open Graph/Twitter, breadcrumb phân cấp và CollectionPage/ItemList cho danh mục dự án.
- 5 landing page thuê có nội dung riêng, câu hỏi thường gặp, checklist và liên kết tổng quan dự án.
- Bộ lọc và căn demo `noindex, follow`; căn demo được loại khỏi sitemap. Không tạo Offer/giá/availability schema giả cho dữ liệu mẫu.
- Cần đặt `NEXT_PUBLIC_SITE_URL` bằng tên miền chính thức khi triển khai (hiện fallback là `https://datvang.example`). Đây là phần kỹ thuật và nội dung nền tảng, không phải cam kết thứ hạng tìm kiếm.
- Tìm kiếm cập nhật URL qua điều hướng client, giữ layout và có trạng thái tải; vẫn hoạt động bằng GET khi chưa có JavaScript.
- Banner dùng kéo chuột, vuốt cảm ứng, phím trái/phải. Bỏ nút điều hướng và chấm; giữ nút dừng/phát để kiểm soát tự chuyển. Tôn trọng thay đổi thiết lập giảm chuyển động của thiết bị.
