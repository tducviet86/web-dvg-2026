# FE-DVG · Đất Vàng Group

Website bất động sản tiếng Việt, xây dựng bằng Next.js App Router, React và TypeScript strict. Đây là **frontend demo**: không có backend, đăng nhập thật, gửi email, thanh toán hoặc giao dịch bất động sản.

## Chạy tại máy

Dùng Node.js 22 LTS (từ 22.13 trở lên) hoặc Node.js 24 LTS.

```bash
cd /Users/tranducviet/Documents/DVG_WEB/FE-DVG
npm ci
npm run dev
```

Mở http://localhost:3000. Trang quản trị: http://localhost:3000/admin.

Bản production:

```bash
npm run build
npm start
```

`next/font` tải font khi build; ảnh minh họa Unsplash cần kết nối mạng khi tải lần đầu. `next/image` tối ưu và cache ảnh. Không cần API key.

## Nội dung và chức năng

- Trang chủ doanh nghiệp: logo chính thức do người dùng cung cấp, banner trình chiếu ảnh có điều khiển, giới thiệu công ty, lĩnh vực hoạt động, tầm nhìn, dự án giới thiệu, giá trị cốt lõi, tin tức và liên hệ hợp tác. Không có thanh tìm kiếm, giá thuê hoặc danh sách căn hộ trên trang chủ.
- Menu chính tập trung vào thông tin doanh nghiệp; các route căn hộ có sẵn được giữ để không làm hỏng liên kết cũ.
- Các trang giới thiệu, tầm nhìn, đội ngũ, đối tác; danh sách và chi tiết dự án/căn hộ/dịch vụ; blog và danh mục; hợp tác chủ sở hữu, liên hệ, tuyển dụng và chính sách.
- 6 dự án, 24 căn hộ, 12 bài viết, 6 dịch vụ, 8 lời chia sẻ hư cấu, 20 khách hàng mẫu và 5 người dùng quản trị mẫu.
- Bộ lọc thực hiện trên server: từ khóa, khu vực, dự án, loại căn hộ, giá tối đa, số phòng ngủ, diện tích tối thiểu, nội thất, tình trạng; sắp xếp, lưới/danh sách, tải thêm và URL query.
- Yêu thích lưu trên trình duyệt; bộ ảnh dùng Radix Dialog, điều khiển bằng bàn phím, đóng bằng Escape.
- Biểu mẫu dùng React Hook Form + Zod, có lỗi từng trường, xác nhận đồng ý và Sonner toast.
- Admin: biểu đồ Recharts, tìm kiếm/lọc bảng, thêm/sửa/xóa dự án/căn hộ/bài viết/khách hàng, ghi chú/phân công, cài đặt và khôi phục dữ liệu.
- Không cho xóa dự án khi vẫn có căn hộ liên kết.
- Metadata, canonical, Open Graph, ảnh chia sẻ, JSON-LD Organization/Breadcrumb/Article, sitemap, robots và HTTP 404. Admin đặt noindex.
- Motion tôn trọng reduced-motion; biểu đồ chỉ tải ở admin. Nội dung công khai render bằng Server Components.

## Phạm vi lưu dữ liệu

Các khóa `dvg:*` trong localStorage lưu dữ liệu admin, yêu cầu tư vấn, đăng ký bản tin và yêu thích. Khôi phục chỉ xóa dữ liệu của ứng dụng này.

**Admin là sandbox cục bộ**: thay đổi trong admin không ghi lại các file mock và không xuất bản lên website công khai. Trang công khai tiếp tục dùng bộ dữ liệu server trong `src/data/index.ts`. Cài đặt nhận diện/liên hệ được lưu để trải nghiệm thao tác, chưa áp dụng toàn website. Không có xác thực: không nhập thông tin nhạy cảm hoặc dữ liệu thật của khách hàng.

Nút ngôn ngữ thông báo bản demo hiện chỉ có tiếng Việt. Chưa có bản dịch EN nên không khai báo hreflang giả. Địa chỉ, điện thoại, Zalo và đối tác thực tế chưa được cung cấp; không tạo số điện thoại hoặc liên kết liên hệ giả.

## Cấu trúc

```text
src/app/                 Layout, các route công khai, admin, SEO
src/components/          UI, navigation, card, tìm kiếm, form, gallery
src/features/admin/      Quản trị, editor, biểu đồ tải động
src/data/                Dữ liệu mock có kiểu
src/types/               Kiểu Project, Property, Post, Lead, Service
src/lib/                 Bộ lọc, storage, nội dung trang, cấu hình URL
tests/                  Playwright: route, dữ liệu, tương tác, WCAG
reports/                 Báo cáo Lighthouse
```

`components/ui/button.tsx` dùng mô hình shadcn/ui (Radix Slot + CVA); cấu hình nằm trong `components.json`. Design tokens và responsive styles nằm trong `src/app/globals.css`.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm run build
# Khởi động npm run dev ở terminal khác; cần Google Chrome:
npm test
# Hoặc trỏ bộ test vào bản production:
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002 npm test
```

Bộ test kiểm tra các URL trong sitemap, metadata, HTTP 404, bộ lọc, phân trang, yêu thích, bộ ảnh, các biểu mẫu, CRUD, khôi phục dữ liệu, keyboard focus, reduced-motion và tràn ngang ở 360/390/768/1024/1440/1920px. Kiểm tra axe WCAG chạy trên các trang đại diện; không thay thế một cuộc đánh giá khả năng truy cập thủ công đầy đủ.

```bash
npm run format
npx lighthouse http://localhost:3000 --chrome-flags='--headless' --output=html --output-path=reports/lighthouse.html
```

Đo Lighthouse trên **production**, không dùng điểm từ dev server. Điểm là kết quả phòng thí nghiệm cục bộ; chưa có dữ liệu Core Web Vitals thực tế ở phân vị 75.

## Khi triển khai thật

Sao chép `.env.example` thành `.env.local`, thay `NEXT_PUBLIC_SITE_URL` bằng tên miền thực, sau đó build lại. Mặc định `https://datvang.example` là tên miền placeholder. Cần thay và xác minh ảnh, dự án, giá, tình trạng căn hộ, địa chỉ, thông tin pháp lý, chính sách và nội dung thương hiệu trước khi sử dụng thương mại.

Thiết kế nền tảng theo tài liệu Next.js được đóng gói tại `node_modules/next/dist/docs/`. Ảnh dùng từ Unsplash để minh họa, không xác nhận hiện trạng của dự án mang tên trên giao diện.

## Kết quả đã chạy

Bản production đã vượt qua TypeScript, ESLint, build và **9/9 bài kiểm thử Playwright**. Chi tiết phạm vi, giới hạn kiểm tra và các báo cáo nằm trong [reports/QA.md](reports/QA.md).

Lighthouse mobile cục bộ: trang chủ **90 / 100 / 100 / 100**, danh sách căn hộ **85 / 100 / 100 / 100** theo thứ tự Performance / Accessibility / Best Practices / SEO. Hiệu năng trang căn hộ chưa đạt mục tiêu 90; xem số đo và điều kiện đo trong báo cáo QA.

## Cập nhật giao diện doanh nghiệp

Logo nguyên bản: `public/images/dat-vang-group-logo-transparent.png`, được sao chép từ tệp người dùng cung cấp, không vẽ lại hoặc đổi màu. Banner dùng hình ảnh minh họa, có nút trước/sau, chọn ảnh và tạm dừng; tự chuyển mỗi 5 giây kể cả khi trỏ chuột lên banner; tạm dừng khi thao tác bằng bàn phím và tôn trọng reduced-motion.

Các điểm Lighthouse ghi ở trên là của giao diện trước lần chuyển sang trang chủ doanh nghiệp, không đại diện cho giao diện mới.

Header trang chủ nằm trên ảnh banner với nền trong suốt; khi cuộn quá 48px chuyển sang nền xanh đậm. Logo PNG nền trong suốt do người dùng cung cấp được giữ nguyên màu và tỉ lệ, không đặt trên khung trắng ở footer.

### Admin dạng trang

- `/admin`: tổng quan; `/admin/projects`, `/admin/properties`, `/admin/posts`, `/admin/leads`: danh sách; `/admin/settings`: cấu hình.
- Thêm mới: `/admin/{nhóm}/new`; chỉnh sửa: `/admin/{nhóm}/{id}/edit`. Có thể mở URL trực tiếp, tải lại và dùng lịch sử trình duyệt.
- Xóa và khôi phục dữ liệu có trang xác nhận riêng, không dùng modal.
- Form chia nhóm thông tin, hình ảnh, SEO, thông số/chi phí, nội dung biên tập hoặc chăm sóc khách hàng. Các trường bổ sung lưu cùng bản ghi trong localStorage, giữ tương thích dữ liệu mẫu cũ.
- Ảnh nhập bằng URL HTTP(S) hoặc chọn bộ ảnh mẫu; thư viện ảnh lưu mỗi URL trên một dòng. Chưa có dịch vụ tải tệp lên máy chủ. Nội dung bài viết lưu văn bản thuần; ngày xuất bản là thông tin biên tập, không có tác vụ tự động hẹn giờ.
- Kiểm tra đường dẫn trùng, định dạng slug, khoảng ngân sách, thứ tự ngày dự án, số điện thoại và dự án liên kết. Nút hủy hiển thị xác nhận ngay trong trang khi đã thay đổi dữ liệu.
# web-dvg-2026

### Bố cục trang doanh nghiệp (17/10/2026)

Các trang giới thiệu, dự án, dịch vụ, tin tức, đối tác và liên hệ dùng bố cục riêng trong `company-layouts.tsx` và stylesheet `company-pages.css`. Hiệu ứng chiều sâu dùng CSS perspective và Motion spring (`DepthScene`), không dùng thư viện 3D/WebGL. Chỉ phản hồi với chuột; tôn trọng reduced-motion. Nội dung chính vẫn render phía server, các form và bộ lọc giữ luồng cũ.
