# FE-DVG · Đất Vàng Group

Website bất động sản và Admin CMS của Đất Vàng Group — Next.js 16 (App Router), React 19, TypeScript strict. Dữ liệu (dự án, căn hộ, banner, bài viết, trang, khách hàng) đến từ **BE-DVG** (`../BE-DVG`, NestJS + PostgreSQL).

## Chạy tại máy

Node.js ≥ 22.13. Cần BE-DVG đang chạy (mặc định `http://127.0.0.1:4000`).

```bash
cp .env.example .env.local      # API_INTERNAL_URL, REVALIDATE_SECRET (trùng BE), NEXT_PUBLIC_SITE_URL
npm ci
npm run dev                      # http://localhost:3000 · Admin: /admin (đăng nhập)
```

Bản production: `npm run build && npm start`. `API_INTERNAL_URL` phải đúng **lúc build** (proxy `/api/v1/*` và `/media/*` tới BE được cố định khi build).

## Kiến trúc

- Trang công khai là Server Components, render theo yêu cầu; dữ liệu API được cache theo tag (5 phút) và làm mới ngay khi Admin lưu (BE gọi `POST /api/revalidate`).
- Trình duyệt gọi API qua chính domain website (`/api/v1/*`) ⇒ cookie phiên httpOnly first-party, không cần CORS.
- Slug cũ → 308; nội dung nháp/lưu trữ → 404; dữ liệu demo và trang lọc → `noindex`; sitemap sinh từ DB.
- Admin: đăng nhập, phân quyền (quản trị / biên tập / tư vấn), CRUD dự án–banner–căn hộ–bài viết–khách hàng, thư viện ảnh, xem trước bản nháp (Draft Mode), người dùng, cài đặt.

Chi tiết: `../BE-DVG/docs/FRONTEND-INTEGRATION.md`, `SYSTEM-ARCHITECTURE.md`, `ADMIN-CMS-GUIDE.md`.

## Cấu trúc

```text
src/app/                 Route công khai, admin, sitemap/robots, API route (revalidate, preview)
src/components/          UI, banner, thẻ, tìm kiếm, form
src/features/admin/      Admin CMS (api client, adapters, editor, media, banners, users, login)
src/lib/api/             Lớp dữ liệu: fetch phía server + adapter, preview, client cho form
src/data/                Ảnh & nội dung marketing tĩnh (không còn dữ liệu nghiệp vụ mock)
tests/                   Playwright full-stack (BE + PostgreSQL e2e + bản build production)
```

## Kiểm thử

```bash
npm run typecheck && npm run lint
npx playwright test     # tự khởi động BE (DB dvg_e2e) + FE; dừng server dev ở cổng 3000/4000 trước
```

Global setup reset database e2e (`E2E_DATABASE_URL`, tên phải kết thúc bằng `_e2e`), import nội dung, seed demo và tạo tài khoản test với mật khẩu ngẫu nhiên (`.playwright/`, không commit).
