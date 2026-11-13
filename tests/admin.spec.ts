import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { apiAs, credentials, expectErrorPopup, login } from "./helpers";
import { moneyWords } from "../src/lib/utils";
import { sourceOf } from "../src/lib/visit-source";
import {
  MIN_LANDING_UNITS,
  landingFacts,
  landingSummary,
  landingUnits,
  type Landing,
} from "../src/lib/landings";
import type { Property } from "../src/types";

const SHOTS =
  "/private/tmp/claude-501/-Users-tranducviet-Documents-DVG-WEB/d7e4d8d3-4b31-4315-9fe7-c92d90618232/scratchpad";

const nav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Quản trị", exact: true });

test("login is required and failures are reported", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email").fill(credentials().email);
  await page.getByLabel("Mật khẩu").fill("sai-mat-khau-123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.locator(".admin-login [role=alert]")).toContainText(
    "Email hoặc mật khẩu không đúng",
  );
  await login(page);
  // A reload shows Admin straight away (session checked in the background).
  await page.goto("/admin/projects");
  await expect(nav(page)).toBeVisible();
  await page.reload();
  await expect(nav(page)).toBeVisible({ timeout: 1500 });
  // A session that ended elsewhere still sends the visitor to the login.
  await page.context().clearCookies();
  await page.reload();
  await expect(page).toHaveURL(/\/admin\/login/);
  expect(
    await page.evaluate(() => localStorage.getItem("dvg:admin-session")),
  ).toBeNull();
  await login(page);
  // Desktop: sign-out sits under "Xem website" in the sidebar; phones keep
  // it at the top (the sidebar footer is hidden there).
  const sidebarLogout = page
    .locator(".admin-sidebar")
    .getByRole("button", { name: "Đăng xuất" });
  await expect(sidebarLogout).toBeVisible();
  await expect(
    page.locator(".admin-userbar").getByRole("button", { name: "Đăng xuất" }),
  ).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.locator(".admin-userbar").getByRole("button", { name: "Đăng xuất" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await sidebarLogout.click();
  await expect(page).toHaveURL(/\/admin\/login/);
  expect(
    await page.evaluate(() => localStorage.getItem("dvg:admin-session")),
  ).toBeNull();
  await page.goto("/admin/projects");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("projects persist detailed fields and duplicate slugs are refused by the server", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/projects/new");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Thêm mới dự án",
  );
  const form = page.locator(".admin-editor-page");
  await form.locator("[name=name]").fill("Dự án chi tiết QA");
  await page.getByRole("button", { name: "Tạo đường dẫn từ tên" }).click();
  await expect(form.locator("[name=slug]")).toHaveValue("du-an-chi-tiet-qa");
  await form.getByRole("checkbox", { name: "Dự án đang vận hành" }).check();
  await form.getByRole("checkbox", { name: "Cho thuê" }).check();
  await form
    .locator("textarea[name=description]")
    .fill("Thông tin dự án được kiểm tra đầy đủ.");
  await form.locator("[name=developer]").fill("Chủ đầu tư QA");
  await form.locator("[name=address]").fill("Địa chỉ chi tiết QA");
  await form.locator("[name=totalUnits]").fill("120");
  await form.locator("[name=highlights]").fill("Vị trí | Gần sông Hàn");
  await form.locator("[name=seoTitle]").fill("Tiêu đề SEO QA");
  await form.locator("[name=imageAlt]").fill("Mô tả ảnh QA");
  await expect(form.locator(".editor-progress strong")).toHaveText("6/6");
  await page.getByRole("button", { name: "Tạo dự án" }).click();
  await expect(page).toHaveURL(/\/admin\/projects$/);
  await page
    .getByRole("button", { name: "Sửa Dự án chi tiết QA", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/projects\/[^/]+\/edit$/);
  await page.reload();
  for (const [key, value] of Object.entries({
    developer: "Chủ đầu tư QA",
    address: "Địa chỉ chi tiết QA",
    totalUnits: "120",
    highlights: "Vị trí | Gần sông Hàn",
    seoTitle: "Tiêu đề SEO QA",
    imageAlt: "Mô tả ảnh QA",
  }))
    await expect(form.locator(`[name=${key}]`)).toHaveValue(value);
  await expect(form.getByRole("checkbox", { name: "Cho thuê" })).toBeChecked();
  await page.getByRole("button", { name: "Về danh sách" }).click();
  await page.getByRole("button", { name: "Thêm mới", exact: true }).click();
  await form.locator("[name=name]").fill("Trùng slug QA");
  await form.locator("[name=slug]").fill("du-an-chi-tiet-qa");
  await form.getByRole("checkbox", { name: "Dự án đang triển khai" }).check();
  await form
    .locator("textarea[name=description]")
    .fill("Nội dung kiểm tra trùng đường dẫn.");
  await page.getByRole("button", { name: "Tạo dự án" }).click();
  await expectErrorPopup(page, "Đường dẫn (slug)");
  await expect(form.locator("#field-slug-error")).toContainText(
    "đã được sử dụng",
  );
  await expect(form.locator("[name=slug]")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  // Archive the first project from the list.
  await page.goto("/admin/projects");
  await page
    .getByRole("button", { name: "Xóa Dự án chi tiết QA", exact: true })
    .click();
  // A popup over the list (no separate page).
  await expect(page).toHaveURL(/\/admin\/projects$/);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lưu trữ", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("tbody")).not.toContainText("Dự án chi tiết QA");
});

test("lead tracking: validation, assignment and follow-up persist; stale edits are refused", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/leads/new");
  await page.locator("[name=name]").fill("Khách chi tiết QA");
  await page.locator("[name=email]").fill("chi-tiet@example.com");
  await page.locator("[name=phone]").fill("0912 345 678");
  await page
    .locator("[name=message]")
    .fill("Mong muốn trao đổi hợp tác doanh nghiệp.");
  await page.locator("[name=budgetMin]").fill("30");
  await page.locator("[name=budgetMax]").fill("10");
  await page.getByRole("button", { name: "Tạo khách hàng" }).click();
  await expectErrorPopup(page, "Ngân sách đến");
  await page.locator("[name=budgetMax]").fill("50");
  await page.locator("[name=assignment]").selectOption({ label: "E2E sales" });
  await page.locator("[name=followUpAt]").fill("2026-11-20T10:30");
  await page.getByRole("button", { name: "Tạo khách hàng" }).click();
  await expect(page).toHaveURL(/\/admin\/leads$/);
  await page
    .getByRole("textbox", { name: "Tìm trong bảng" })
    .fill("0912345678");
  await expect(page.locator("tbody")).toContainText("Khách chi tiết QA");
  await expect(page.locator("tbody")).toContainText("E2E sales");
  await page
    .getByRole("button", { name: "Sửa Khách chi tiết QA", exact: true })
    .click();
  await expect(page.locator("[name=followUpAt]")).toHaveValue(
    "2026-11-20T10:30",
  );
  await expect(page.locator("[name=email]")).toHaveAttribute("readonly", "");
  // Another user updates the lead while this form is open.
  const admin = await apiAs();
  const id = page.url().split("/").at(-2)!;
  const lead = (await admin.get(`/admin/leads/${id}`)) as unknown as {
    data: { updatedAt: string };
  };
  expect(
    (
      await admin.send("patch", `/admin/leads/${id}`, {
        notes: "Từ tab khác",
        expectedUpdatedAt: lead.data.updatedAt,
      })
    ).ok(),
  ).toBeTruthy();
  await page.locator("[name=notes]").fill("Nội dung từ tab cũ");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expectErrorPopup(page, "đã được thay đổi ở nơi khác");
  const after = (await admin.get(`/admin/leads/${id}`)) as unknown as {
    data: { notes: string };
  };
  expect(after.data.notes).toBe("Từ tab khác");
});

test("AI suggests SEO from the article and fills the form after review", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/posts/new");
  const form = page.locator(".admin-editor-page");
  await form
    .locator("[name=name]")
    .fill("Cẩm nang thuê căn hộ Đà Nẵng cho người mới");
  await page.getByRole("button", { name: "Tạo đường dẫn từ tên" }).click();
  await form
    .locator("textarea[name=description]")
    .fill("Những điều nên kiểm tra trước khi thuê căn hộ tại Đà Nẵng.");
  await form
    .locator("[name=content]")
    .fill("Vị trí và giao thông.\n\nNội thất và hợp đồng thuê.");
  const assistant = form.locator(".ai-seo");
  await assistant.getByRole("button", { name: "Tạo gợi ý" }).click();
  await expect(assistant.locator(".serp-title")).toHaveText(
    "Kinh nghiệm thuê căn hộ Đà Nẵng | Đất Vàng Group",
  );
  await expect(assistant.locator(".serp-url")).toHaveText(
    "datvanggroup.vn/blog/cam-nang-thue-can-ho-da-nang-cho-nguoi-moi",
  );
  // Nothing is written until the editor accepts the suggestion.
  await expect(form.locator("[name=seoTitle]")).toHaveValue("");
  await assistant.getByRole("button", { name: "Áp dụng vào form" }).click();
  await expect(form.locator("[name=seoTitle]")).toHaveValue(
    "Kinh nghiệm thuê căn hộ Đà Nẵng | Đất Vàng Group",
  );
  await expect(form.locator("[name=seoDescription]")).toHaveValue(
    /Những điều cần kiểm tra/,
  );
  await expect(form.locator("[name=tags]")).toHaveValue(
    "thuê căn hộ đà nẵng, kinh nghiệm thuê nhà",
  );
  await expect(form.locator("[name=imageAlt]")).toHaveValue(
    "Phòng khách căn hộ cho thuê tại Đà Nẵng",
  );
  await form.getByRole("button", { name: "Tạo bài viết" }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);
});

test("posts need content to publish; content and schedule persist", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/posts/new");
  const form = page.locator(".admin-editor-page");
  await form.locator("[name=name]").fill("Bài viết kiểm tra nghiệp vụ");
  await form.locator("[name=slug]").fill("bai-viet-kiem-tra-nghiep-vu");
  await form
    .locator("textarea[name=description]")
    .fill("Mô tả ngắn của bài viết kiểm tra.");
  await form.locator('input[name=status][value="PUBLISHED"]').check();
  await form.getByRole("button", { name: "Tạo bài viết" }).click();
  await expectErrorPopup(page, "Nội dung chi tiết");
  await form
    .locator("[name=content]")
    .fill("Nội dung chi tiết đoạn một.\n\nNội dung đoạn hai.");
  await form.locator("[name=tags]").fill("Thị trường, Đà Nẵng");
  await form.getByRole("button", { name: "Tạo bài viết" }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);
  await page.goto("/blog/bai-viet-kiem-tra-nghiep-vu");
  await expect(page.locator(".article-body")).toContainText(
    "Nội dung đoạn hai.",
  );
});

test("properties upload images and videos, choose the cover, delete and keep order", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/properties/new");
  const form = page.locator(".admin-editor-page");
  // Required fields are checked before anything is sent.
  await form.getByRole("button", { name: "Tạo căn hộ" }).click();
  await expectErrorPopup(page, "Tên căn hộ");
  await expect(form.locator("#field-name-error")).toBeVisible();
  await form.locator("[name=name]").fill("Căn kiểm thử media");
  await page.getByRole("button", { name: "Tạo đường dẫn từ tên" }).click();
  await form
    .locator("[name=description]")
    .fill("Căn hộ kiểm thử ảnh và video tải lên.");
  // Full amount with thousand dots; the sale price only shows for sale units.
  await form.locator("[name=price]").pressSequentially("12500000");
  await expect(form.locator("[name=price]")).toHaveValue("12.500.000");
  await expect(form.locator("[name=salePrice]")).toBeHidden();
  await form.locator("[name=depositMonths]").selectOption("2");
  // Unit types: pills under Căn hộ / Nhà phố / Mặt bằng.
  const kinds = form.locator(".field-pill-group");
  await expect(kinds.locator("> span")).toHaveText([
    "Căn hộ",
    "Nhà phố",
    "Mặt bằng",
  ]);
  await expect(kinds.first().getByLabel("Shophouse")).toHaveCount(1);
  await expect(kinds.nth(1).locator(".field-pill")).toHaveText(["Nhà phố"]);
  // New units start as 1PN; picking a type fills bedrooms / bathrooms.
  await expect(form.getByLabel("1 phòng ngủ")).toBeChecked();
  for (const [type, rooms] of [
    ["Studio", ["0", "1"]],
    ["3 phòng ngủ", ["3", "2"]],
    ["2 phòng ngủ", ["2", "2"]],
  ] as const) {
    await form.getByLabel(type, { exact: true }).check();
    await expect(form.locator("[name=bedrooms]")).toHaveValue(rooms[0]);
    await expect(form.locator("[name=bathrooms]")).toHaveValue(rooms[1]);
  }
  // Shophouse / mặt bằng: no bedrooms or bathrooms, only the area.
  // A shophouse has no floor either.
  await form.locator("[name=floor]").fill("5");
  await form.getByLabel("Shophouse", { exact: true }).check();
  await expect(form.locator("[name=floor]")).toBeHidden();
  await expect(form.locator("[name=floor]")).toHaveValue("");
  await form.getByLabel("Mặt bằng", { exact: true }).check();
  await expect(form.locator("[name=floor]")).toBeVisible();
  for (const type of ["Shophouse", "Mặt bằng"]) {
    await form.getByLabel(type, { exact: true }).check();
    await expect(form.locator("[name=bedrooms]")).toBeHidden();
    await expect(form.locator("[name=bathrooms]")).toBeHidden();
    await expect(form.locator("[name=bedrooms]")).toHaveValue("0");
    await expect(form.locator("[name=area]")).toBeVisible();
    // Nor apartment amenities.
    await expect(page.locator("#editor-section-amenities")).toBeHidden();
  }
  // Nhà phố: 2, 3 or 4 bedrooms to choose from, no studio.
  await form.getByLabel("Nhà phố", { exact: true }).check();
  await expect(form.locator("[name=bedrooms] option")).toHaveText([
    "2 phòng ngủ",
    "3 phòng ngủ",
    "4 phòng ngủ",
  ]);
  await expect(form.locator("[name=bedrooms]")).toHaveValue("3");
  await form.locator("[name=bedrooms]").selectOption("4");
  await expect(form.locator("[name=bedrooms]")).toHaveValue("4");
  await form.getByLabel("2 phòng ngủ", { exact: true }).check();
  await expect(form.locator("[name=bedrooms]")).toBeVisible();
  await expect(form.locator("[name=bedrooms]")).toHaveValue("2");
  await expect(page.locator("#editor-section-amenities")).toBeVisible();
  // Still editable, and the mouse wheel does not change the number.
  await form.locator("[name=bathrooms]").fill("3");
  await form.locator("[name=bathrooms]").hover();
  await page.mouse.wheel(0, 200);
  await expect(form.locator("[name=bathrooms]")).toHaveValue("3");
  // Costs on top of the rent: all ticked by default, untick what it covers.
  const fees = form.locator("[name=feesNotIncluded]");
  await expect(fees).toHaveCount(6);
  for (const box of await fees.all()) await expect(box).toBeChecked();
  await form.getByLabel("Internet", { exact: true }).uncheck();
  // Minimum lease: 3, 6 or 12 months.
  await expect(form.locator("[name=minimumLease] option")).toHaveText([
    "Không yêu cầu",
    "3 tháng",
    "6 tháng",
    "12 tháng",
  ]);
  // No link inputs: media only comes from uploads.
  await expect(form.locator("[name=videoUrl]")).toHaveCount(0);
  const png = readFileSync("public/images/img1.png");
  const jpg = readFileSync("public/images/projects/monarchy.jpg");
  const mp4 = readFileSync("public/images/video.mp4");
  await form.locator(".media-dropzone input[type=file]").setInputFiles([
    { name: "phong-khach.png", mimeType: "image/png", buffer: png },
    { name: "toa-nha.jpg", mimeType: "image/jpeg", buffer: jpg },
    { name: "tour.mp4", mimeType: "video/mp4", buffer: mp4 },
  ]);
  const tiles = form.locator(".media-manager-grid li");
  await expect(tiles).toHaveCount(3, { timeout: 30000 });
  await expect(tiles.nth(0)).toHaveAttribute("data-cover", "true");
  await expect(tiles.nth(2).locator("video")).toHaveCount(1);
  await expect(form.locator(".media-manager-head small")).toHaveText(
    "2 ảnh · 1 video",
  );
  // Make the second image the cover, then delete the first upload.
  await form.getByRole("button", { name: "Đặt ảnh 2 làm ảnh bìa" }).click();
  await expect(tiles.nth(0)).toHaveAttribute("data-cover", "true");
  await form.getByRole("button", { name: "Xóa ảnh 2" }).click();
  await expect(tiles).toHaveCount(2);
  await form.getByRole("button", { name: "Tạo căn hộ" }).click();
  await expect(page).toHaveURL(/\/admin\/properties$/);
  await page
    .getByRole("textbox", { name: "Tìm căn hộ" })
    .fill("Căn kiểm thử media");
  await expect(page.locator("tbody")).toContainText("12.500.000 đ");
  await page
    .getByRole("button", { name: "Sửa Căn kiểm thử media", exact: true })
    .click();
  await expect(tiles).toHaveCount(2);
  await expect(tiles.nth(0).locator("img")).toHaveCount(1);
  await expect(tiles.nth(1).locator("video")).toHaveCount(1);
  await expect(form.locator("[name=price]")).toHaveValue("12.500.000");
  await expect(form.locator("[name=depositMonths]")).toHaveValue("2");
  // The public page shows the uploaded video in the gallery.
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?q=kiem thu media",
  )) as unknown as {
    data: { id: string; slug: string; coverImage: { mimeType: string } }[];
  };
  expect(units.data[0].coverImage.mimeType).toBe("image/webp");
  // Unticked in the form: the rent covers it.
  expect(
    (units.data[0] as unknown as { includedFees: string[] }).includedFees,
  ).toEqual(["internet"]);
  await api.send("patch", `/admin/properties/${units.data[0].id}`, {
    status: "PUBLISHED",
  });
  await page.goto(`/cho-thue/${units.data[0].slug}`);
  await expect(page.locator(".rental-gallery")).toContainText("Video");
});

test("a unit slug is its name plus unit code, made when missing; the page shows rent in đồng", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/properties/new");
  const form = page.locator(".admin-editor-page");
  const slug = form.locator("[name=slug]");
  // The slug follows the title and unit code until it is typed by hand.
  await form.locator("[name=name]").fill("Căn tạm QA");
  await expect(slug).toHaveValue("can-tam-qa");
  await form.locator("[name=unitCode]").fill("PT029");
  await expect(slug).toHaveValue("can-tam-qa-pt029");
  await form.locator("[name=unitCode]").fill("");
  await slug.fill("duong-dan-rieng");
  await form.locator("[name=name]").fill("Căn tạm QA 2");
  await expect(slug).toHaveValue("duong-dan-rieng");
  await slug.fill("");
  await form.locator("[name=name]").fill("Căn tự tạo đường dẫn QA");
  await expect(slug).toHaveValue("can-tu-tao-duong-dan-qa");
  await expect(form.locator("[name=unitCode]")).toHaveValue("");
  await form
    .locator("[name=description]")
    .fill("Căn hộ kiểm tra đường dẫn và mã căn tự tạo.");
  await form.locator("[name=price]").pressSequentially("25000000");
  await form.getByRole("button", { name: "Tạo căn hộ" }).click();
  await expect(page).toHaveURL(/\/admin\/properties$/);
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?q=tu tao duong dan qa",
  )) as unknown as { data: { id: string; slug: string; unitCode: string }[] };
  const unit = units.data[0];
  // No code typed: the server makes one and adds it to the slug.
  expect(unit.unitCode).toMatch(/^DVG-[0-9A-F]{4}$/);
  expect(unit.slug).toBe(
    `can-tu-tao-duong-dan-qa-${unit.unitCode.toLowerCase()}`,
  );
  await api.send("patch", `/admin/properties/${unit.id}`, {
    status: "PUBLISHED",
  });
  await page.goto(`/cho-thue/${unit.slug}`);
  await expect(page.locator(".room-contact-panel .room-price")).toHaveText(
    "25.000.000 đồng / tháng",
  );
});

test("settings persist and roles limit what staff can open", async ({
  page,
  browser,
}) => {
  await login(page);
  await nav(page).getByRole("link", { name: "Cài đặt", exact: true }).click();
  await page.locator('[name="company.brand"]').fill("Đất Vàng QA");
  await page.getByRole("button", { name: "Lưu cài đặt" }).click();
  await expect(page.getByText("Đã lưu cài đặt.")).toBeVisible();
  await page.reload();
  await expect(page.locator('[name="company.brand"]')).toHaveValue(
    "Đất Vàng QA",
  );

  const sales = await browser.newPage();
  await login(sales, "sales");
  await expect(
    nav(sales).getByRole("link", { name: "Khách hàng" }),
  ).toBeVisible();
  await expect(nav(sales).getByRole("link", { name: "Cài đặt" })).toHaveCount(
    0,
  );
  await expect(
    nav(sales).getByRole("link", { name: "Người dùng" }),
  ).toHaveCount(0);
  await sales.goto("/admin/projects");
  await expect(sales.getByRole("button", { name: "Thêm mới" })).toHaveCount(0);
  // The photo library is the administrator's alone.
  await expect(
    nav(sales).getByRole("link", { name: "Thư viện ảnh" }),
  ).toHaveCount(0);
  await sales.close();

  const editor = await browser.newPage();
  await login(editor, "editor");
  await expect(
    nav(editor).getByRole("link", { name: "Khách hàng" }),
  ).toHaveCount(0);
  await editor.goto("/admin/leads");
  await expect(
    editor.getByRole("heading", {
      name: "Bạn không có quyền truy cập mục này",
    }),
  ).toBeVisible();
  await expect(
    nav(editor).getByRole("link", { name: "Thư viện ảnh" }),
  ).toHaveCount(0);
  await editor.goto("/admin/media");
  await expect(
    editor.getByRole("heading", {
      name: "Bạn không có quyền truy cập mục này",
    }),
  ).toBeVisible();
  await editor.close();
});

test("admin screens are accessible and responsive", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/admin/login");
  const loginResult = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(loginResult.violations.map((v) => v.id)).toEqual([]);
  await login(page);
  for (const section of [
    "projects",
    "properties",
    "posts",
    "leads",
    "settings",
    "banners",
    "users",
  ]) {
    await page.goto(
      `/admin/${section}${["settings", "users"].includes(section) ? "" : "/new"}`,
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Đang tải" }),
    ).toHaveCount(0);
    const result = await new AxeBuilder({ page })
      .include(".admin-shell")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      section,
    ).toEqual([]);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          { message: `${section} ${width}` },
        )
        .toBeTruthy();
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.goto("/admin/projects/new");
  await expect(page.locator(".admin-editor-page")).toBeVisible();
  await page.screenshot({
    path: "tests/admin-editor-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "tests/admin-editor-mobile.png",
    fullPage: true,
  });
});

test("admin tabs switch in place and every menu entry is reachable", async ({
  page,
}) => {
  await login(page);
  // Any request to /auth/me after this point would mean a session reload.
  let sessionChecks = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/auth/me")) sessionChecks++;
  });
  const menu = page.getByRole("navigation", { name: "Quản trị" });
  for (const label of [
    "Căn hộ",
    "Bài viết",
    "Khách hàng",
    "Ứng viên",
    "Cài đặt",
  ]) {
    await menu.getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(label);
    await expect(page.getByText("Đang kiểm tra phiên đăng nhập")).toHaveCount(
      0,
    );
  }
  expect(sessionChecks).toBe(0);
  // Short laptop screen: the last entry can still be scrolled to and used.
  await page.setViewportSize({ width: 1280, height: 640 });
  const last = menu.getByRole("link", { name: "Cài đặt" });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await menu.getByRole("link", { name: "Tổng quan" }).click();
  await expect(page.locator(".dash-kpi").first()).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(1500); // entrance animations
  await page.screenshot({
    path: `${SHOTS}/admin-overview.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `${SHOTS}/admin-overview-mobile.png`,
    fullPage: true,
  });
});

test("the unit list filters, sorts, pages and changes units in bulk", async ({
  page,
}) => {
  const api = await apiAs();
  const all = (await api.get("/admin/properties?pageSize=100")) as unknown as {
    data: { id: string; slug: string; name: string }[];
    meta: { total: number };
  };
  expect(all.meta.total).toBeGreaterThan(20);
  await login(page);
  await page.goto("/admin/properties");
  const rows = page.locator(".units-table tbody tr");
  // 20 units per page, with summary cards and pages.
  await expect(rows).toHaveCount(20);
  const stats = page.getByRole("group", { name: "Tóm tắt căn hộ" });
  await expect(
    stats.getByRole("button", { name: /Tổng căn hộ/ }),
  ).toContainText(String(all.meta.total));
  await expect(page.locator(".units-pager")).toContainText(
    `Trang 1 / ${Math.ceil(all.meta.total / 20)}`,
  );
  await page.getByRole("button", { name: "Trang sau" }).click();
  await expect(rows).toHaveCount(Math.min(20, all.meta.total - 20));
  await page.screenshot({ path: `${SHOTS}/admin-units.png`, fullPage: true });
  // Search and filters narrow the list; the filter survives a reload.
  const expected = (
    (await api.get(
      "/admin/properties?q=sam tower&pageSize=100",
    )) as unknown as {
      meta: { total: number };
    }
  ).meta.total;
  expect(expected).toBeGreaterThan(1);
  await page.getByRole("textbox", { name: "Tìm căn hộ" }).fill("sam tower");
  await page.getByLabel("Sắp xếp").selectOption("name");
  const count = page.locator(".units-count");
  await expect(count).toHaveText(`${expected} căn`);
  await expect(rows).toHaveCount(Math.min(20, expected));
  await expect(rows.first()).toContainText(/Sam Tower/i);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Tìm căn hộ" })).toHaveValue(
    "sam tower",
  );
  await expect(page.getByLabel("Sắp xếp")).toHaveValue("name");
  await expect(count).toHaveText(`${expected} căn`);
  // Inline and bulk changes, on two units made for this test.
  const projectId = (
    all.data[0] as unknown as { projectId?: string; project?: { id: string } }
  ).projectId;
  for (const n of [1, 2])
    await api.send("post", "/admin/properties", {
      name: `Căn hàng loạt QA ${n}`,
      projectId,
      propertyType: "2pn",
      location: "Đà Nẵng",
      areaM2: 70,
      bedrooms: 2,
      bathrooms: 2,
      description: "Căn hộ kiểm tra thao tác hàng loạt trong Admin.",
      rentPriceVnd: "15000000",
      status: "PUBLISHED",
    });
  await page.getByRole("button", { name: "Bỏ lọc" }).click();
  await page.getByRole("textbox", { name: "Tìm căn hộ" }).fill("hang loat qa");
  await expect(count).toHaveText("2 căn");
  // Who created it is shown.
  await expect(rows.first().locator(".units-author")).not.toContainText("—");
  const first = rows.first();
  const name = (await first.locator(".units-title").innerText()).trim();
  await first.getByLabel(`Tình trạng ${name}`).selectOption("RENTED");
  await expect(page.getByText("Đã cập nhật.")).toBeVisible();
  await expect(first.getByLabel(`Tình trạng ${name}`)).toHaveValue("RENTED");
  // Rented: it leaves the website a few days later.
  await expect(first.locator(".units-site-note")).toHaveText(
    "Tự ẩn khỏi website sau 5 ngày",
  );
  await page
    .getByRole("checkbox", { name: "Chọn tất cả căn trên trang" })
    .check();
  const bulk = page.getByRole("region", { name: "Thao tác hàng loạt" });
  await expect(bulk).toContainText("Đã chọn 2 căn");
  await bulk.getByRole("button", { name: "Chuyển nháp" }).click();
  await expect(page.getByText("Đã cập nhật 2 căn.")).toBeVisible();
  // The less used filters sit behind "Bộ lọc".
  await page.getByRole("button", { name: /^Bộ lọc/ }).click();
  await page.getByLabel("Lọc trạng thái đăng").selectOption("PUBLISHED");
  await expect(count).toHaveText("0 căn");
  await page.getByLabel("Lọc trạng thái đăng").selectOption("DRAFT");
  await expect(rows).toHaveCount(2);
  // Archive both: they leave the list.
  await page
    .getByRole("checkbox", { name: "Chọn tất cả căn trên trang" })
    .check();
  await bulk.getByRole("button", { name: "Lưu trữ" }).click();
  await page
    .getByRole("button", { name: "Lưu trữ", exact: true })
    .last()
    .click();
  await expect(page.getByText("Đã chuyển 2 căn vào lưu trữ.")).toBeVisible();
  await expect(count).toHaveText("0 căn");
  await page.getByRole("button", { name: "Bỏ lọc" }).click();
  await expect(page.getByRole("textbox", { name: "Tìm căn hộ" })).toHaveValue(
    "",
  );
  const results = await new AxeBuilder({ page })
    .include(".units")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("units and posts open as photo cards; the choice of grid or table is kept", async ({
  page,
}) => {
  await login(page);
  await page.evaluate(() => localStorage.removeItem("dvg:admin-view"));
  await page.goto("/admin/properties");
  const cards = page.locator(".ucard");
  await expect(cards).toHaveCount(20);
  const first = cards.first();
  await expect(first.locator(".ucard-price")).toContainText("tr/tháng");
  const name = (await first.locator(".ucard-title").innerText()).trim();
  await expect(first.getByLabel(`Tình trạng ${name}`)).toBeVisible();
  // A card can be selected for bulk actions.
  await first.getByRole("checkbox", { name: `Chọn ${name}` }).check();
  await expect(
    page.getByRole("region", { name: "Thao tác hàng loạt" }),
  ).toContainText("Đã chọn 1 căn");
  await page.screenshot({ path: `${SHOTS}/admin-units-grid.png` });
  // No sideways scrolling on a phone.
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Table view, kept for the next list.
  const views = page.getByRole("group", { name: "Kiểu hiển thị" });
  await views.getByRole("button", { name: "Bảng" }).click();
  await expect(page.locator(".units-table tbody tr")).toHaveCount(20);
  await page.goto("/admin/posts");
  await expect(page.locator(".units-table")).toBeVisible();
  await views.getByRole("button", { name: "Lưới" }).click();
  await expect(
    page.locator(".ucard").first().locator(".ucard-tag"),
  ).toBeVisible();
  // Contrast is checked once the cards have faded in.
  await page
    .locator(".ucards")
    .evaluate((el) =>
      Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)),
    );
  const results = await new AxeBuilder({ page })
    .include(".ucards")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("every admin list counts, filters, sorts and changes items in bulk", async ({
  page,
}) => {
  const api = await apiAs();
  const categories = (await api.get("/admin/blog/categories")) as unknown as {
    data: { slug: string }[];
  };
  for (const n of [1, 2])
    await api.send("post", "/admin/blog/posts", {
      slug: `bai-hang-loat-qa-${n}`,
      title: `Bài hàng loạt QA ${n}`,
      excerpt: "Bài viết kiểm tra thao tác hàng loạt trong Admin.",
      content:
        "Nội dung bài viết kiểm tra thao tác hàng loạt.\n\nĐoạn thứ hai của bài viết đủ dài để xuất bản trên website.",
      category: categories.data[0].slug,
    });
  await login(page);
  await page.goto("/admin/posts");
  const rows = page.locator(".units-table tbody tr");
  const count = page.locator(".units-count");
  // Status cards: drafts include the two new posts; a card filters the list.
  const stats = page.getByRole("group", { name: "Tóm tắt bài viết" });
  const drafts = stats.getByRole("button", { name: /Bản nháp/ });
  await drafts.click();
  await expect(drafts).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("textbox", { name: "Tìm trong bảng" })
    .fill("hàng loạt QA");
  await expect(count).toHaveText("2 mục");
  await page.getByLabel("Sắp xếp").selectOption("name");
  await expect(rows.first()).toContainText("Bài hàng loạt QA 1");
  // Who created it is shown.
  await expect(rows.first().locator(".units-author")).not.toContainText("—");
  // Bulk publish, then one back to draft inline.
  await page
    .getByRole("checkbox", { name: "Chọn tất cả mục trên trang" })
    .check();
  const bulk = page.getByRole("region", { name: "Thao tác hàng loạt" });
  await bulk.getByRole("button", { name: "Xuất bản" }).click();
  await expect(page.getByText("Đã cập nhật 2 mục.")).toBeVisible();
  await expect(count).toHaveText("0 mục");
  await stats.getByRole("button", { name: /Đã xuất bản/ }).click();
  await expect(count).toHaveText("2 mục");
  await rows
    .first()
    .getByRole("button", { name: "Chuyển Bài hàng loạt QA 1 về bản nháp" })
    .click();
  await expect(page.getByText("Đã cập nhật.")).toBeVisible();
  await expect(count).toHaveText("1 mục");
  // Archive the rest in bulk; the filter survives a reload.
  await page.reload();
  await expect(count).toHaveText("1 mục");
  await page
    .getByRole("checkbox", { name: "Chọn tất cả mục trên trang" })
    .check();
  await bulk.getByRole("button", { name: "Lưu trữ" }).click();
  await page
    .getByRole("button", { name: "Lưu trữ", exact: true })
    .last()
    .click();
  await expect(page.getByText("Đã chuyển 1 mục vào lưu trữ.")).toBeVisible();
  await expect(count).toHaveText("0 mục");
  await page.getByRole("button", { name: "Bỏ lọc" }).click();

  // Customer requests: status cards and an inline status change.
  await api.send("post", "/admin/leads", {
    kind: "INQUIRY",
    name: "Khách danh sách QA",
    email: "khach-danh-sach@example.com",
    message: "Tôi cần tư vấn thuê căn hộ 2 phòng ngủ.",
    source: "Nhập tay",
  });
  await page.goto("/admin/leads");
  await page
    .getByRole("textbox", { name: "Tìm trong bảng" })
    .fill("danh sách QA");
  await expect(count).toHaveText("1 mục");
  await expect(
    page.getByRole("group", { name: "Tóm tắt yêu cầu" }),
  ).toBeVisible();
  const lead = rows.first();
  const leadName = (await lead.locator(".units-title").innerText()).trim();
  await lead.getByLabel(`Trạng thái ${leadName}`).selectOption("CONTACTING");
  await expect(page.getByText("Đã cập nhật.")).toBeVisible();
  await expect(lead.getByLabel(`Trạng thái ${leadName}`)).toHaveValue(
    "CONTACTING",
  );
  await page.getByRole("button", { name: "Bỏ lọc" }).click();
  await page.screenshot({ path: `${SHOTS}/admin-leads.png`, fullPage: true });
  // Projects, pages and jobs use the same list.
  for (const [path, label] of [
    ["projects", "Tóm tắt dự án"],
    ["pages", "Tóm tắt trang"],
    ["jobs", "Tóm tắt tin tuyển dụng"],
  ]) {
    await page.goto(`/admin/${path}`);
    await expect(page.getByRole("group", { name: label })).toBeVisible();
    await expect(count).toHaveText(/^\d+ mục$/);
  }
  await page.goto("/admin/projects");
  await expect(rows.first()).toBeVisible();
  await page.screenshot({
    path: `${SHOTS}/admin-projects.png`,
    fullPage: true,
  });
  const results = await new AxeBuilder({ page })
    .include(".units")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("the post editor formats text, inserts captioned photos and previews the article", async ({
  page,
}) => {
  let prompted = false;
  page.on("dialog", (d) => {
    prompted = true;
    void d.dismiss();
  });
  await login(page);
  await page.goto("/admin/posts/new");
  const form = page.locator(".admin-editor-page");
  await form.locator("[name=name]").fill("Bài soạn thảo QA");
  await form.locator("[name=slug]").fill("bai-soan-thao-qa");
  await form
    .locator("textarea[name=description]")
    .fill("Bài viết kiểm tra công cụ soạn thảo trong Admin.");
  const content = form.locator("[name=content]");
  await content.fill("Kinh nghiệm chọn căn");
  // Toolbar: the line becomes a section heading, then back.
  const toolbar = page.getByRole("toolbar", { name: "Định dạng nội dung" });
  await toolbar.getByRole("button", { name: "Tiêu đề mục" }).click();
  await expect(content).toHaveValue("## Kinh nghiệm chọn căn");
  await content.press("End");
  await content.pressSequentially("\n\nĐoạn mở đầu của bài viết.\n\n");
  // A photo asks for its caption in a dialog, not the browser prompt.
  const png = readFileSync("public/images/img1.png");
  await toolbar
    .locator("input[type=file]")
    .setInputFiles({ name: "anh.png", mimeType: "image/png", buffer: png });
  const dialog = page.getByRole("dialog", { name: "Chèn ảnh vào bài" });
  await expect(dialog.locator(".post-image-preview")).toBeVisible();
  await dialog.getByLabel("Chú thích ảnh").fill("Phòng khách view sông");
  await dialog.getByRole("button", { name: "Chèn vào bài" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(content).toHaveValue(/!\[Phòng khách view sông\]\(.+\)/);
  expect(prompted).toBe(false);
  await expect(toolbar).toContainText(/\d+ chữ · khoảng 1 phút đọc/);
  // Preview: laid out like the site, from the unsaved text.
  await toolbar.getByRole("button", { name: "Xem trước bài viết" }).click();
  const preview = page.getByRole("dialog", { name: "Xem trước bài viết" });
  await expect(preview.getByRole("heading", { level: 1 })).toHaveText(
    "Bài soạn thảo QA",
  );
  await expect(preview.getByRole("heading", { level: 2 }).last()).toHaveText(
    "Kinh nghiệm chọn căn",
  );
  await expect(preview.locator("figcaption")).toHaveText(
    "Phòng khách view sông",
  );
  await page.screenshot({ path: `${SHOTS}/post-preview.png` });
  await preview.getByRole("button", { name: "Đóng xem trước" }).click();
  // Saved, the site shows the same article.
  await form.getByRole("button", { name: "Tạo bài viết" }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);
  const api = await apiAs();
  const posts = (await api.get(
    "/admin/blog/posts?q=Bài soạn thảo QA",
  )) as unknown as { data: { id: string }[] };
  await api.send("patch", `/admin/blog/posts/${posts.data[0].id}`, {
    status: "PUBLISHED",
  });
  await page.goto("/blog/bai-soan-thao-qa");
  await expect(page.locator(".article-body h2")).toHaveText(
    "Kinh nghiệm chọn căn",
  );
  await expect(page.locator(".article-body figcaption")).toHaveText(
    "Phòng khách view sông",
  );
});

test("saving a draft says it is not on the site yet and can publish it at once", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/posts/new");
  const form = page.locator(".admin-editor-page");
  await form.locator("[name=name]").fill("Thị trường căn hộ Đà Nẵng QA");
  await form.locator("[name=slug]").fill("thi-truong-can-ho-da-nang-qa");
  await form
    .locator("textarea[name=description]")
    .fill("Bài viết thị trường kiểm tra thông báo bản nháp.");
  await form
    .locator("[name=content]")
    .fill(
      "Giá thuê căn hộ tăng nhẹ.\n\nNguồn cung mới tập trung ven sông Hàn.",
    );
  await form.getByRole("button", { name: "Tạo bài viết" }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);
  await expect(
    page.getByText("Đã lưu bài viết ở dạng Bản nháp, chưa hiện trên website."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xuất bản ngay" }).click();
  await expect(page.getByText("Đã xuất bản bài viết.")).toBeVisible();
  await page.goto("/blog");
  await expect(
    page.getByRole("link", { name: /Thị trường căn hộ Đà Nẵng QA/ }).first(),
  ).toBeVisible();
});

test("a post scheduled for later says so, and can be published now", async ({
  page,
}) => {
  const api = await apiAs();
  const categories = (await api.get("/admin/blog/categories")) as unknown as {
    data: { slug: string }[];
  };
  const later = new Date(Date.now() + 3 * 3_600_000).toISOString();
  const res = await api.send("post", "/admin/blog/posts", {
    slug: "bai-hen-gio-qa",
    title: "Bài hẹn giờ QA",
    excerpt: "Bài viết kiểm tra hẹn giờ đăng trong Admin.",
    content: "Nội dung bài hẹn giờ.\n\nĐoạn thứ hai đủ dài để xuất bản.",
    category: categories.data[0].slug,
    status: "PUBLISHED",
    publishedAt: later,
  });
  expect(res.status()).toBe(201);
  const created = (await res.json()) as { data: { id: string } };
  await login(page);
  await page.goto("/admin/posts");
  await page
    .getByRole("textbox", { name: "Tìm trong bảng" })
    .fill("hẹn giờ QA");
  const row = page.locator(".units-table tbody tr").first();
  await expect(row.locator(".units-publish")).toContainText("Hẹn đăng");
  await page.goto(`/admin/posts/${created.data.id}/edit`);
  const note = page.locator(".schedule-note");
  await expect(note).toContainText("Hẹn đăng lúc");
  await expect(note).toContainText("còn khoảng 3 giờ");
  await note.getByRole("button", { name: "Đăng ngay" }).click();
  await expect(note).toHaveCount(0);
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);
  await page.goto("/blog/bai-hen-gio-qa");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Bài hẹn giờ QA",
  );
});

test("project form: payment steps total 100%, are saved and stay editable", async ({
  page,
}) => {
  await login(page);
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; name: string; stage: string }[];
  };
  const project = projects.data.find((p) => p.stage === "UNDER_DEVELOPMENT")!;
  await page.goto("/admin/projects");
  await page
    .getByRole("button", { name: `Sửa ${project.name}`, exact: true })
    .click();
  const field = page.getByRole("group", { name: "Tiến độ thanh toán" });
  await field.getByRole("button", { name: "Thêm đợt thanh toán" }).click();
  await field.getByLabel("Tên đợt").fill("Đợt giao diện QA");
  await field.getByLabel("Tỷ lệ (%)").fill("40");
  await expect(field.locator(".rows-field-total.invalid")).toContainText("40%");
  // The server refuses a schedule that is not 100%.
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expectErrorPopup(page, /100%/);
  await page.keyboard.press("Escape");
  await field.getByLabel("Tỷ lệ (%)").fill("100");
  await expect(field.locator(".rows-field-total.invalid")).toHaveCount(0);
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect
    .poll(async () => {
      const saved = (await api.get(`/admin/projects/${project.id}`)) as {
        data: { paymentSchedule: { label: string; percent: number }[] };
      };
      return saved.data.paymentSchedule;
    })
    .toEqual([{ label: "Đợt giao diện QA", percent: 100 }]);
  await api.send("patch", `/admin/projects/${project.id}`, {
    paymentSchedule: [],
  });
});

test("a unit page is not counted as a view while signed in to Admin", async ({
  browser,
  page,
}) => {
  // A published rental of its own, so the test needs nothing seeded.
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; name: string }[];
  };
  const res = await api.send("post", "/admin/properties", {
    name: "Căn đếm lượt xem QA",
    projectId: projects.data.find((p) => p.name.includes("Monarchy"))!.id,
    propertyType: "2pn",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn hộ kiểm tra cách đếm lượt xem trang chi tiết.",
    rentPriceVnd: "16000000",
    status: "PUBLISHED",
  });
  expect(res.ok()).toBeTruthy();
  const unit = ((await res.json()) as { data: { id: string; slug: string } })
    .data;
  const url = `/cho-thue/${unit.slug}`;
  const counted = (p: typeof page) => {
    const sent: string[] = [];
    p.on("request", (r) => {
      if (r.method() === "POST" && new URL(r.url()).pathname.endsWith("/view"))
        sent.push(r.url());
    });
    return sent;
  };

  // A visitor: one view, with where the visit came from.
  const visitor = await browser.newPage();
  const fromVisitor = counted(visitor);
  await visitor.goto(url);
  await expect.poll(() => fromVisitor.length).toBe(1);
  expect(fromVisitor[0]).toContain("source=direct");
  await visitor.close();
  // Sent by ChatGPT: the source is kept for the rest of the visit.
  const fromAi = await browser.newPage();
  const aiViews = counted(fromAi);
  await fromAi.goto(`/?utm_source=chatgpt.com`);
  await fromAi.goto(url);
  await expect.poll(() => aiViews.length).toBe(1);
  expect(aiViews[0]).toContain("source=ai");
  await fromAi.close();

  // Staff signed in: none.
  await login(page);
  const fromStaff = counted(page);
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  expect(fromStaff).toHaveLength(0);
  await api.send("delete", `/admin/properties/${unit.id}`);
});

test("prices go to the AI writer in words it cannot misread", () => {
  // Once sent as "19.000.000 đ/tháng", read back as "19 đ/tháng".
  expect(moneyWords("19.000.000", "/tháng")).toBe(
    "19 triệu đồng/tháng (19.000.000 đ/tháng)",
  );
  expect(moneyWords("16500000", "/tháng")).toBe(
    "16,5 triệu đồng/tháng (16.500.000 đ/tháng)",
  );
  expect(moneyWords("3.200.000.000")).toBe("3,2 tỷ đồng (3.200.000.000 đ)");
  expect(moneyWords("")).toBe("");
});

test("a visit's source, from its link or the page that sent it", () => {
  const own = "datvanggroup.vn";
  expect(sourceOf("", "https://www.google.com/", own)).toBe("google");
  expect(sourceOf("", "https://www.google.com.vn/", own)).toBe("google");
  expect(sourceOf("chatgpt.com", "", own)).toBe("ai");
  expect(sourceOf("", "https://gemini.google.com/app", own)).toBe("ai");
  expect(sourceOf("", "https://search.naver.com/", own)).toBe("search");
  expect(sourceOf("zalo", "", own)).toBe("zalo");
  expect(sourceOf("", "https://l.facebook.com/", own)).toBe("facebook");
  expect(sourceOf("", "", own)).toBe("direct");
  expect(sourceOf("", "https://datvanggroup.vn/cho-thue", own)).toBe("direct");
  expect(sourceOf("", "https://batdongsan.com.vn/", own)).toBe("other");
});

test("Từ khoá & SEO: an administrator publishes a search landing page; editors never see it", async ({
  browser,
  page,
}) => {
  await login(page);
  await nav(page).getByRole("link", { name: "Từ khoá & SEO" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Từ khoá & SEO",
  );
  // Without a Search Console account the table explains how to connect one.
  await expect(
    page.getByRole("heading", { name: "Kết nối Google Search Console" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Trang theo nhu cầu" }).click();
  // Ready-made ideas, and an empty page to start from.
  await expect(
    page.getByRole("button", { name: "Dùng mẫu này" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tạo trang trống" }).click();
  await page
    .getByLabel(/Tiêu đề trang \(H1\)/)
    .fill("Cho thuê căn hộ 2 phòng ngủ Đà Nẵng QA");
  await page.getByLabel("Phòng ngủ").selectOption("2");
  await page
    .getByRole("textbox", { name: "Đoạn giới thiệu", exact: true })
    .fill("Các căn 2 phòng ngủ đang cho thuê tại Đà Nẵng.");
  await page.getByLabel(/Hiển thị trên website/).check();
  await page.getByRole("button", { name: "Lưu trang" }).click();
  await expect(page.getByText("Đã lưu.")).toBeVisible();
  const path = "/cho-thue/nhu-cau/cho-thue-can-ho-2-phong-ngu-da-nang-qa";
  await expect(page.getByText(path)).toBeVisible();

  // The public page: its heading, text and units at its own address. The
  // test data holds only sample units, which do not count: too thin to be
  // indexed, so it stays out of search, the sitemap and llms.txt.
  await expect
    .poll(async () => (await page.request.get(path)).status(), {
      timeout: 15_000,
    })
    .toBe(200);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Cho thuê căn hộ 2 phòng ngủ Đà Nẵng QA",
  );
  await expect(page.locator(".rental-landing-intro")).toContainText(
    "Các căn 2 phòng ngủ",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`${path}$`),
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  // The fixed filter is the page itself, not a chip to remove.
  await expect(page.locator(".filter-chips a")).toHaveCount(0);
  expect(await (await page.request.get("/sitemap.xml")).text()).not.toContain(
    path,
  );
  expect(await (await page.request.get("/llms.txt")).text()).not.toContain(
    path,
  );
  // Admin says why.
  await page.goto("/admin/seo");
  await page.getByRole("tab", { name: "Trang theo nhu cầu" }).click();
  await expect(page.locator(".seo-quality")).toHaveText(
    /Chưa có căn phù hợp|Chỉ \d căn/,
  );

  const editor = await browser.newPage();
  await login(editor, "editor");
  await expect(
    nav(editor).getByRole("link", { name: "Từ khoá & SEO" }),
  ).toHaveCount(0);
  await editor.close();

  // Clean up through the same screen.
  await page.goto("/admin/seo");
  await page.getByRole("tab", { name: "Trang theo nhu cầu" }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Xoá Cho thuê căn hộ 2 phòng ngủ Đà Nẵng QA" })
    .click();
  await expect(page.getByText("Chưa có trang nào.")).toBeVisible();
});

test("Từ khoá & SEO: a landing page counts real units only and sums them up", () => {
  const unit = (slug: string, extra: Partial<Property> = {}) =>
    ({
      id: slug,
      slug,
      status: "Còn trống",
      bedrooms: 2,
      rentVnd: 15e6,
      projectName: "Monarchy",
      ...extra,
    }) as Property;
  const landing: Landing = {
    slug: "qa",
    purpose: "rent",
    h1: "QA",
    seoTitle: "",
    seoDescription: "",
    intro: "",
    filters: { bedrooms: "2" },
    published: true,
  };
  const units = landingUnits(landing, [
    unit("a"),
    unit("b", { rentVnd: 22e6, projectName: "Sun Ponte" }),
    unit("c", { status: "Đã cho thuê" }),
    unit("mau", { isDemo: true }),
    unit("go", { delisted: true }),
    unit("1pn", { bedrooms: 1 }),
  ]);
  expect(units.map((u) => u.slug).sort()).toEqual(["a", "b", "c"]);
  expect(units.length).toBeGreaterThanOrEqual(MIN_LANDING_UNITS);
  const facts = landingFacts(landing, units);
  expect(facts).toMatchObject({ total: 3, low: 15, high: 22 });
  expect(landingSummary(facts)).toContain("giá 15 – 22 triệu/tháng");
  expect(landingSummary(facts)).toContain("tại Monarchy, Sun Ponte");
});
