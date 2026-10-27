import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { apiAs, credentials, expectErrorPopup, login } from "./helpers";

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
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
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
    .getByRole("textbox", { name: "Tìm trong bảng" })
    .fill("Căn kiểm thử media");
  await expect(page.locator("tbody")).toContainText("12.5 triệu / tháng");
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
  await expect(page.locator(".overview-kpis button").first()).toBeVisible();
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
