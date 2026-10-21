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

## Trang doanh nghiệp — 17/10/2026

- Bố cục riêng cho giới thiệu và các trang con, danh mục dự án, lĩnh vực hoạt động, tin tức/chuyên mục, đối tác, liên hệ/hợp tác/tuyển dụng. Chỉnh diện mạo trang chi tiết dịch vụ, dự án và bài viết.
- Ảnh nhiều lớp với CSS perspective/Motion spring, nghiêng nhẹ theo chuột và trở về khi rời; con trỏ cảm ứng không kích hoạt. Reduced-motion tắt transform. Reveal khi cuộn giữ nội dung render trên server.
- Build, lint và TypeScript đạt. 11 kiểm thử hồi quy/hiệu ứng đạt lượt đầu; sau sửa tương phản số thứ tự, hai kiểm thử trang doanh nghiệp đạt lại (12 bài liên quan đều đã đạt).
- Axe kiểm tra 10 route đại diện; kiểm tra tràn ngang 360/768/1440px. Các form vẫn validate/lưu, route và 404, gallery, menu mobile, banner, admin CRUD và chuyển trang đều đạt.
- Đã xem ảnh chụp desktop của giới thiệu, tin tức và dịch vụ; kiểm tra ảnh liên hệ mobile. Ảnh/dữ liệu vẫn minh họa, không thêm cam kết kinh doanh hoặc đối tác thực tế.

## Rà soát tổng thể — 18/10/2026

Xem `REVIEW-2026-10-18.md` để biết kết luận sẵn sàng vận hành và danh sách nghiệp vụ còn thiếu. Đã tinh giản trang chủ/trang con, chỉnh nội dung liên hệ, gỡ nút ngôn ngữ không hoạt động; bổ sung tìm khách theo điện thoại, kiểm tra stale edit/delete, slug và tham chiếu dự án mới nhất, yêu cầu nội dung trước trạng thái xuất bản demo, biểu đồ sáu tháng có phân biệt năm. Build/typecheck/lint đạt; 19 bài đã đạt qua các lượt chạy sau sửa hai lỗi tương phản. Chưa xác nhận sẵn sàng production.

## 2026-10-19 — Trang chủ kiến trúc / editorial

- Thay cấu trúc trang chủ: banner thương hiệu lớn, thanh mục lục, câu chuyện doanh nghiệp, tab lĩnh vực với ảnh thay đổi, dự án lệch bố cục, bài viết dạng hàng và khối liên hệ.
- Giữ nguyên điều khiển/autoplay banner, logo trong suốt, chuyển trang và khả năng giảm chuyển động. Hiệu ứng chiều sâu dùng lại DepthScene ở ảnh giới thiệu.
- CSS riêng `signature-home.css`; không thay đổi nghiệp vụ admin/backend.
- Đã xem ảnh desktop 1440px và mobile 390px; sửa màu chữ hero bị kế thừa và độ tương phản chú thích.
- `npm run build`, `npm run lint`, TypeScript đạt. 7 kiểm tra Playwright đạt: WCAG AA các trang đại diện, menu điện thoại, banner/autoplay/header, tab lĩnh vực bằng bàn phím, chuyển trang, ảnh và độ rộng 360–1920px.
- Dữ liệu dự án/ảnh vẫn là minh họa; chưa xác nhận dữ liệu doanh nghiệp để xuất bản chính thức.

## 2026-10-19 — Danh mục triển khai / vận hành và form nhu cầu

- Trang chủ: Banner → Dự án triển khai (Capital Square, Sun Symphony Residence, Cora Tower) → Dự án đang vận hành (Monarchy, Sun Ponte Residence, Sun Panoma, Sam Tower, Hiyori Garden Tower) → Lĩnh vực → Góc nhìn → Kết nối.
- Nhóm triển khai/vận hành theo danh sách khách hàng cung cấp; không suy ra vai trò chủ đầu tư hoặc quản lý toàn bộ tòa nhà.
- Ảnh lưu trong public/images/projects; URL tải gốc tại reports/project-image-sources.json. SAM và Hiyori là ảnh chụp; sáu ảnh còn lại là phối cảnh, có nhãn và liên kết nguồn trên từng thẻ. Chưa thay hoàn toàn bằng ảnh chụp thực địa.
- Nút tư vấn mang tên dự án sang form. Tab mua bán/cho thuê/ký gửi chọn sẵn nhu cầu qua query đã kiểm tra giá trị.
- Sửa select chưa register và khôi phục textarea; nhu cầu bắt buộc cho form kinh doanh, form ứng tuyển vẫn dùng kinh nghiệm/vị trí. Nhu cầu được ghép vào message để admin hiện đủ nội dung. Vẫn chỉ lưu localStorage, chưa gửi máy chủ.
- Build, TypeScript, lint đạt. 9 Playwright checks đạt: thứ tự và số dự án; form/prefill/validation/persistence; banner/autoplay; keyboard tabs; navigation; WCAG AA; mobile drawer; ảnh và responsive 360–1920px; 6 luồng form và newsletter.
- Đã xem trực quan dự án desktop 1440px và form mobile 390px.

## 2026-10-20 — Luồng triển khai / vận hành và chi tiết phòng

- Đồng bộ danh mục công khai 8 dự án; menu Dự án có Triển khai và Vận hành. Thẻ homepage mở đúng trang dự án.
- Trang triển khai có giới thiệu riêng, điểm nổi bật, loại hình sản phẩm, vị trí, liên kết nguồn và gọi tư vấn.
- Trang vận hành có 3 mục theo URL: mua bán, cho thuê, ký gửi. Danh sách thuê liên kết đúng dự án. Chưa có dữ liệu căn bán nên hiển thị trạng thái chưa công bố và hướng dẫn trao đổi, không tạo giá hoặc tin bán giả.
- Trang phòng thay form bằng gọi trực tiếp, bổ sung gallery, thông số, nội thất, chi phí/điều kiện cần trao đổi, dự án liên quan và căn cùng dự án; có thanh gọi cố định trên mobile. Giá, trạng thái và ảnh phòng vẫn là dữ liệu mẫu có nhãn.
- Hotline được người dùng xác nhận: 0911 29 69 79; href tel:0911296979. Kiểm tra href, không thực hiện cuộc gọi.
- 24 căn hộ mẫu được phân vào 5 dự án đang vận hành; bộ lọc lấy danh mục từ các căn đã có dữ liệu.
- Build, lint và TypeScript đạt. Vòng kiểm tra đầu: 15/16 đạt, một assertion dùng địa danh seed cũ. Đã cập nhật theo danh mục mới và sửa gallery mobile bị cố định chiều cao; chạy lại các kiểm tra liên quan.
- Đã xem ảnh desktop của Capital Square, Monarchy, phòng Sun Panoma và mobile 390px. Các liên kết sitemap trả 200, đường dẫn không tồn tại 404. Form liên hệ chung/ứng tuyển/dịch vụ và admin CRUD vẫn hoạt động.
- Kết quả kiểm tra cuối: 5/5 kiểm tra liên quan đạt (liên kết dữ liệu/bộ lọc, luồng dự án–phòng–ký gửi, hotline, responsive 360/768/1440 và WCAG AA). Gallery mobile không còn đè chú thích, nút gọi cố định hiển thị đúng.

## 21/10/2026 — Trải nghiệm cho thuê, banner kéo/vuốt và video

- Banner dùng Embla với kéo chuột/vuốt, bàn phím trái/phải, bỏ nút trước/sau và chấm chọn ảnh. Giữ dừng/phát, tự chuyển; phản hồi ngay khi thiết bị đổi chế độ giảm chuyển động.
- Làm lại `/cho-thue`: khu giới thiệu, bộ lọc chính gọn, bộ lọc mở rộng, thẻ căn ba cột, tab dự án, checklist, FAQ và ký gửi. Điều hướng bộ lọc giữ tài liệu/layout và hiện trạng thái tải.
- Thêm 5 landing page cho thuê theo dự án, metadata/canonical/OG, breadcrumb và CollectionPage. Loại căn mẫu khỏi sitemap, noindex căn mẫu và URL bộ lọc.
- Thư viện phòng nhận nhiều ảnh, kéo/xem lớn, thumbnail, video MP4/WebM/YouTube. Đã phát thật file `/images/video.mp4` do người dùng cung cấp tại căn mẫu đầu tiên; video dọc giữ đúng tỷ lệ. Video không tiếp tục chạy khi chuyển về ảnh.
- Gắn tọa độ và đúng URL Maps người dùng gửi cho Monarchy/Panoma/Ponte trên trang thuê dự án, phòng và dự án vận hành.
- Admin lưu được bộ ảnh nội bộ và video, có kiểm tra đường dẫn. Admin vẫn là bản lưu cục bộ, chưa có backend đồng bộ public. Ảnh, giá, hiện trạng căn vẫn là dữ liệu mẫu; không đưa Offer schema giả vào SEO.
- Build và lint đạt. 17 kiểm thử liên quan đạt: banner, chuyển trang, danh mục/chi tiết dự án, phòng, bộ lọc/sắp xếp/yêu thích, metadata/sitemap/404, gallery/video, admin media.
- Axe không phát hiện vi phạm WCAG A/AA trong các trang được kiểm tra. Không tràn ngang ở 360/390/768/1024/1440 px. Đã kiểm tra video sau khi đổi 1440→390→1440 px.
- Kiểm tra ảnh chụp phát hiện CSS cũ làm nền nút phóng to kéo dài che ảnh. Đã tách selector và đặt lại bottom; thêm kiểm thử chiều cao nút để ngăn lỗi lặp lại.
- Hướng dẫn cấu hình dữ liệu và bản đồ: `reports/RENTAL-UPDATE.md`.
