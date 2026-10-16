# Kết quả kiểm tra · 15/10/2026

- TypeScript strict: đạt (`npm run typecheck`).
- ESLint: đạt (`npm run lint`).
- Production build: đạt (`npm run build`).
- Playwright chạy trên production tại `http://127.0.0.1:3004`: **9/9 bài kiểm thử đạt**, 18,8 giây.
- Toàn bộ URL công khai trong sitemap trả HTTP 200, có H1, description và canonical; URL không tồn tại trả **HTTP 404**. Robots chặn admin và admin có noindex.
- Bộ lọc từng trường, sắp xếp, tải thêm, yêu thích sau reload và gallery: đạt.
- Sáu luồng biểu mẫu liên hệ/tư vấn/tuyển dụng/hợp tác/dịch vụ và newsletter: validation, xác nhận, localStorage đạt.
- CRUD dự án, căn hộ, bài viết; phân công khách hàng, lưu cài đặt, khôi phục dữ liệu và bảo vệ liên kết dự án–căn hộ: đạt.
- Không phát hiện lỗi JavaScript hoặc lỗi console trong các luồng trang chủ và quản trị được kiểm tra.
- Ảnh trên trang chủ tải thành công khi cuộn qua từng ảnh.
- Trang chủ không tràn ngang ở 360, 390, 768, 1024, 1440, 1920px. Các trang danh sách, chi tiết, blog, liên hệ, quản trị đại diện không tràn ngang ở 360px.
- Menu di động: focus nằm trong dialog, Escape đóng và trả focus về nút mở. Reduced-motion chuyển scroll sang `auto`.
- Axe không báo vi phạm các quy tắc WCAG 2 A/AA, 2.1 AA, 2.2 AA được quét trên trang chủ, căn hộ, liên hệ và admin.

## Giới hạn của kiểm thử

Đã kiểm tra bằng Google Chrome trên macOS. Chưa kiểm tra Safari, Firefox, thiết bị vật lý hoặc screen reader thủ công. Kiểm tra tự động không chứng nhận tuân thủ WCAG toàn diện.

Lighthouse là phép đo mobile mô phỏng trên localhost, không phải dữ liệu Core Web Vitals thực tế. Ảnh đã được tải qua bộ tối ưu ảnh trước lần đo cuối; lần truy cập đầu tiên trên môi trường triển khai mới có thể chậm hơn.

`npm audit --omit=dev` đã không phát hiện lỗ hổng ở dependency production tại lần kiểm tra. Audit đầy đủ báo 5 mục mức high trong chuỗi dependency phát triển `eslint-config-next → fast-glob → micromatch → braces`; chưa ép hạ ESLint config sang major 14 vì không tương thích định hướng Next.js 16. Đây là cảnh báo ở công cụ phát triển, không thuộc bundle production.

## Báo cáo

- `lighthouse-home.report.html` / `.json`: trang chủ.
- `lighthouse-rentals.report.html` / `.json`: danh sách căn hộ.
- `../playwright-report/index.html`: báo cáo kiểm thử trình duyệt.

## Lighthouse mobile · kết quả cuối

| Trang | Performance | Accessibility | Best Practices | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Trang chủ | 90 | 100 | 100 | 100 | 3.6 s | 0 |
| Căn hộ cho thuê | 85 | 100 | 100 | 100 | 4.2 s | 0 |

Trang căn hộ còn dưới mục tiêu Performance 90. LCP mô phỏng ở cả hai trang còn trên mục tiêu 2,5 giây; chưa khẳng định đạt Core Web Vitals ở môi trường thực tế. Các ảnh có next/image, sizes, cache, eager/fetchPriority cho ảnh LCP và lazy-loading cho ảnh bên dưới; còn có thể tối ưu thêm JavaScript, font và hạ tầng khi có môi trường triển khai thực tế.

## Cập nhật trang chủ doanh nghiệp — 15/10/2026

Đã thay bằng logo người dùng cung cấp, banner trình chiếu ảnh và bố cục giới thiệu doanh nghiệp. Bỏ thanh tìm kiếm và căn hộ/giá thuê trên trang chủ; menu chính không còn mục Cho thuê hoặc nút tìm căn hộ.

TypeScript, ESLint và build đã đạt. Các kiểm thử banner (chọn ảnh, trước/sau), logo, giao diện không có khối mua bán, responsive, menu mobile và những luồng chức năng cũ đã qua. Các báo cáo Lighthouse phía trên thuộc bản thiết kế trước, chưa đo lại cho bản thiết kế doanh nghiệp.

Ảnh chụp giao diện: `../tests/corporate-desktop.png`, `../tests/corporate-mobile.png`.

Kiểm tra lại sau chỉnh tương phản: axe WCAG trên các trang đại diện đã đạt (1/1 bài kiểm thử, 5,8 giây). Chín bài kiểm thử chức năng/responsive còn lại đã đạt ở lần chạy trước chỉnh màu. Bản build cuối thành công và đang được phục vụ tại cổng 3004.

### Logo trong suốt, autoplay và header theo scroll

Đã thay PNG nền trong suốt (alpha min 0, max 255), bỏ khung trắng footer, tích hợp header trên ảnh banner và chuyển nền xanh đậm khi scroll quá 48px. Banner chuyển mỗi 5 giây, không dừng vì hover hoặc chọn ảnh bằng chuột; nút pause/play, focus bàn phím và reduced-motion vẫn hoạt động.

TypeScript, ESLint, production build đạt. 5/5 kiểm thử liên quan đạt trên production (12,2 giây): WCAG, mobile/keyboard focus, logo/banner, autoplay kể cả khi hover và sau thao tác chuyển ảnh, pause/play, header khi scroll xuống/lên, ảnh và responsive. Đã xem lại ảnh chụp desktop.

## Cập nhật 2026-10-16 — Chuyển trang và bố cục doanh nghiệp

- Liên kết nội bộ dùng Next Link và React transition: phản hồi tải thực tế, thanh tiến trình, thông báo tiếng Việt; hiệu ứng vào trang theo pathname và hỗ trợ reduced motion. Giữ hành vi liên kết hash, modifier và mở tab mới của Next Link.
- Không thêm loading boundary toàn cục để giữ mã HTTP 404 chính xác.
- Trang chủ thêm cụm ảnh bất đối xứng, huy hiệu DVG, họa tiết đường cung, dải giá trị, các thẻ lĩnh vực so le và khung ảnh dự án. Giữ logo trong suốt, banner tự chạy và header đổi nền theo scroll.
- Typecheck, ESLint, production build: đạt.
- 11 bài kiểm thử hiện có đạt trong lần chạy toàn bộ. Bài kiểm thử điều hướng mới ban đầu chọn trùng liên kết; sau khi thu hẹp selector vào phần giới thiệu đã chạy lại và đạt (tổng 12 bài đạt).
- Kiểm thử điều hướng chặn phản hồi route để xác nhận trạng thái chờ; kiểm tra không reload document, lịch sử Back và reduced motion.
- Đã xem ảnh desktop và mobile; kiểm tra responsive, WCAG AA, route/404, banner, biểu mẫu và admin đều đạt. Điểm Lighthouse cũ không đại diện bản thiết kế này.

## Admin dạng trang — 2026-10-16

- Thay form modal bằng URL riêng cho danh sách, thêm mới, chỉnh sửa, xóa và khôi phục. Route không hợp lệ đi qua notFound; ID không có trong localStorage hiển thị thông báo và nút về danh sách.
- Thiết kế lại sidebar với logo công ty, thẻ thống kê, bảng dữ liệu, breadcrumb, form chia nhóm, cột ảnh/SEO hướng dẫn và thanh lưu cố định. Mobile dùng thanh điều hướng ngang, form một cột.
- Bổ sung thông tin dự án, pháp lý/vai trò, diện tích/quy mô, điều kiện thuê, nội dung bài viết, ảnh/alt/gallery, SEO, khách hàng/doanh nghiệp, ngân sách và lịch chăm sóc. Dữ liệu cũ giữ tương thích; trường mới được lưu cùng bản ghi.
- Kiểm tra slug trùng, URL ảnh, ngân sách, số điện thoại, thứ tự ngày và dự án liên kết. Hủy chỉnh sửa có xác nhận ngay trong trang; vẫn bảo vệ dự án đang có căn hộ khi xóa.
- Build, TypeScript và ESLint đạt. Toàn bộ 15 bài kiểm thử đã đạt qua các lượt chạy: các bài cũ về route/404, homepage, form, dữ liệu và admin; ba bài mới về URL/form chi tiết, responsive/axe và ngân sách/nội dung bài viết.
- Đã sửa lỗi tương phản nhãn demo. Kiểm tra kích thước 360/768/1440px dùng polling để chờ trình duyệt cập nhật layout sau resize. Ảnh kiểm tra chờ client editor tải xong.
- Giới hạn giữ nguyên: localStorage, không xác thực/backend, không xuất bản từ admin lên website; ảnh bằng URL, chưa upload tệp; nội dung văn bản thuần, chưa tự động hẹn giờ xuất bản.
