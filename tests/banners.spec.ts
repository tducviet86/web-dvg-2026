import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Banner } from "../src/types";

const CAPITAL = "project-6";
const toggle = (page: Page) =>
  page.getByRole("switch", { name: "Hiển thị dự án trên Banner trang chủ" });
const storedBanners = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("dvg:banners") || "[]") as Banner[],
  );
const slideLinks = (page: Page) =>
  page.locator(".corporate-banner .banner-slide-link");

async function fresh(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
}
async function saveProject(page: Page) {
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/projects$/);
}
async function enableCapitalBanner(page: Page) {
  await page.goto(`/admin/projects/${CAPITAL}/edit`);
  await toggle(page).check({ force: true });
  await page.getByLabel("Thứ tự hiển thị").fill("1");
  await saveProject(page);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fresh(page);
});

test("seed homepage banners render without links", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".corporate-banner .banner-swipe-slide")).toHaveCount(3);
  await expect(slideLinks(page)).toHaveCount(0);
  await expect(page.locator(".banner-caption")).toContainText(
    "Kiến trúc hòa cùng thiên nhiên",
  );
});

test("1. normal banner shows on the homepage without navigation", async ({
  page,
}) => {
  await page.goto("/admin/banners/new");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Thêm mới banner",
  );
  await page
    .getByLabel("Chọn nhanh ảnh minh họa cho ảnh banner (desktop)")
    .selectOption({ index: 2 });
  await page.getByLabel("Tiêu đề banner").fill("Banner thường QA");
  await page.getByLabel("Thứ tự hiển thị").fill("1");
  await expect(page.locator(".banner-preview-caption")).toContainText(
    "Banner thường QA",
  );
  await page.getByRole("button", { name: "Lưu banner" }).click();
  await expect(page).toHaveURL(/\/admin\/banners$/);
  await expect(page.locator(".banner-table tbody tr")).toHaveCount(4);
  await expect(page.locator(".banner-table tbody tr").first()).toContainText(
    "Banner thường QA",
  );

  await page.goto("/");
  await expect(page.locator(".banner-caption")).toContainText(
    "Banner thường QA",
  );
  const first = page.locator(".banner-swipe-slide").first();
  await expect(first.locator("a")).toHaveCount(0);
  expect(await first.evaluate((el) => getComputedStyle(el).cursor)).not.toBe(
    "pointer",
  );
  await first.click({ position: { x: 400, y: 300 } });
  await expect(page).toHaveURL(/\/$/);
});

test("2/3. project banner from the project form links to the detail page", async ({
  page,
}) => {
  await page.goto(`/admin/projects/${CAPITAL}/edit`);
  await expect(toggle(page)).not.toBeChecked();
  await toggle(page).check({ force: true });
  await expect(page.locator(".banner-preview-hotspot")).toContainText(
    "/du-an/capital-square",
  );
  await page.getByLabel("Thứ tự hiển thị").fill("1");
  await saveProject(page);
  await expect(page.locator("tbody tr", { hasText: "Capital Square" })).toContainText(
    "● Banner trang chủ",
  );

  await page.goto("/");
  const link = slideLinks(page).first();
  await expect(link).toHaveAttribute("href", "/du-an/capital-square");
  await expect(page.locator(".banner-caption")).toContainText("Capital Square");
  expect(await link.evaluate((el) => getComputedStyle(el).cursor)).toBe(
    "pointer",
  );
  await link.click();
  await expect(page).toHaveURL(/\/du-an\/capital-square$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Capital Square",
  );
});

test("2. a newly created project with banner enabled appears on the homepage", async ({
  page,
}) => {
  await page.goto("/admin/projects/new");
  const form = page.locator(".admin-editor-page");
  await form.locator("[name=name]").fill("Dự án banner QA");
  await page.getByRole("button", { name: "Tạo đường dẫn từ tên" }).click();
  await form
    .locator("textarea[name=description]")
    .fill("Dự án mới dùng để kiểm tra banner.");
  await toggle(page).check({ force: true });
  await saveProject(page);
  const banners = await storedBanners(page);
  expect(banners.filter((b) => b.type === "PROJECT")).toHaveLength(1);
  await page.goto("/");
  await expect(
    page.locator('.banner-slide-link[href="/du-an/du-an-banner-qa"]'),
  ).toHaveCount(1);
});

test("4/6/7/8/5. banner follows project edits without duplicates", async ({
  page,
}) => {
  await enableCapitalBanner(page);
  // 4. custom banner image
  await page.goto(`/admin/projects/${CAPITAL}/edit`);
  await page.getByLabel("Ảnh riêng cho banner (không thay đổi ảnh đại diện)").check();
  await page
    .getByLabel("Chọn nhanh ảnh minh họa cho ảnh banner (desktop)")
    .selectOption({ index: 3 });
  await saveProject(page);
  const [custom] = (await storedBanners(page)).filter(
    (b) => b.projectId === CAPITAL,
  );
  expect(custom.imageUrl).toBeTruthy();
  const projects = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dvg:projects") || "[]"),
  );
  expect(
    projects.find((p: { id: string }) => p.id === CAPITAL).image,
  ).toBe("/images/projects/capital.jpg");
  await page.goto("/");
  await expect(slideLinks(page).first()).toBeVisible();
  expect(
    await slideLinks(page).first().locator("img").getAttribute("src"),
  ).toContain(encodeURIComponent(custom.imageUrl));

  // 6. saving several times keeps one banner per project
  for (let i = 0; i < 2; i++) {
    await page.goto(`/admin/projects/${CAPITAL}/edit`);
    await saveProject(page);
  }
  expect(
    (await storedBanners(page)).filter((b) => b.projectId === CAPITAL),
  ).toHaveLength(1);

  // 7. slug change is followed by the banner link
  await page.goto(`/admin/projects/${CAPITAL}/edit`);
  await page.locator("[name=slug]").fill("capital-square-moi");
  await saveProject(page);
  await page.goto("/");
  await expect(slideLinks(page).first()).toHaveAttribute(
    "href",
    "/du-an/capital-square-moi",
  );

  // 8. unpublished project hides its banner
  await page.goto(`/admin/projects/${CAPITAL}/edit`);
  await page.locator("[name=status]").selectOption("Tạm ngưng");
  await saveProject(page);
  await page.goto("/");
  await expect(page.locator(".banner-swipe-slide")).toHaveCount(3);
  await expect(slideLinks(page)).toHaveCount(0);
  await page.goto("/admin/banners");
  await expect(page.locator(".banner-table")).toContainText(
    "Ẩn — dự án tạm ngưng",
  );

  // 5. switching the toggle off hides it but keeps project + banner data
  await page.goto(`/admin/projects/${CAPITAL}/edit`);
  await page.locator("[name=status]").selectOption("Đang triển khai");
  await toggle(page).uncheck({ force: true });
  await saveProject(page);
  const after = (await storedBanners(page)).filter(
    (b) => b.projectId === CAPITAL,
  );
  expect(after).toHaveLength(1);
  expect(after[0].isActive).toBe(false);
  await page.goto("/");
  await expect(slideLinks(page)).toHaveCount(0);
});

test("9. banner module and project form share one record", async ({ page }) => {
  await enableCapitalBanner(page);
  await page.goto("/admin/banners");
  const row = page.locator(".banner-table tbody tr", {
    hasText: "Capital Square",
  });
  await expect(row).toContainText("PROJECT");
  await row.getByRole("button", { name: "Tắt Capital Square" }).click();
  await expect(row).toContainText("Đã tắt");
  await page.goto(`/admin/projects/${CAPITAL}/edit`);
  await expect(toggle(page)).not.toBeChecked();

  // A second PROJECT banner for the same project is refused.
  await page.goto("/admin/banners/new");
  await page.getByText("Banner dự án", { exact: true }).click();
  const select = page.getByLabel(/Dự án liên kết/);
  await expect(select.locator(`option[value="${CAPITAL}"]`)).toHaveJSProperty(
    "disabled",
    true,
  );

  // Edit from the banner module, then the project form shows the change.
  await page.goto("/admin/banners");
  await row.getByRole("button", { name: "Bật Capital Square" }).click();
  await row.getByRole("button", { name: "Sửa Capital Square" }).click();
  await page.getByLabel("Tiêu đề banner").fill("Capital Square bên sông Hàn");
  await page.getByRole("button", { name: "Lưu banner" }).click();
  await page.goto(`/admin/projects/${CAPITAL}/edit`);
  await expect(toggle(page)).toBeChecked();
  await expect(page.getByLabel("Tiêu đề banner")).toHaveValue(
    "Capital Square bên sông Hàn",
  );

  // Concurrent change from another module is detected, not overwritten.
  await page.evaluate((id) => {
    const rows = JSON.parse(localStorage.getItem("dvg:banners") || "[]");
    localStorage.setItem(
      "dvg:banners",
      JSON.stringify(
        rows.map((b: Banner) =>
          b.projectId === id ? { ...b, title: "Sửa ở tab khác" } : b,
        ),
      ),
    );
  }, CAPITAL);
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText(/Banner của dự án đã thay đổi/)).toBeVisible();
  expect(
    (await storedBanners(page)).find((b) => b.projectId === CAPITAL)?.title,
  ).toBe("Sửa ở tab khác");
  expect(
    (await storedBanners(page)).filter((b) => b.projectId === CAPITAL),
  ).toHaveLength(1);
});

test("11. dragging a linked banner changes slide without navigating", async ({
  page,
}) => {
  await enableCapitalBanner(page);
  await page.goto("/");
  await expect(slideLinks(page).first()).toBeVisible();
  const box = (await page.locator(".banner-swipe-viewport").boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 12 });
  await page.mouse.up();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".banner-count")).toContainText("02");
});

test("10. linked banner works on mobile with touch", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await fresh(page);
  await enableCapitalBanner(page);
  await page.goto("/");
  const link = slideLinks(page).first();
  await expect(link).toBeVisible();
  const box = (await link.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(389);
  await link.tap();
  await expect(page).toHaveURL(/\/du-an\/capital-square$/);
  await context.close();
});

test("banner admin and homepage banner pass axe checks", async ({ page }) => {
  await enableCapitalBanner(page);
  await page.goto("/admin/banners");
  await expect(page.locator(".banner-table")).toBeVisible();
  const admin = await new AxeBuilder({ page }).include(".admin-main").analyze();
  expect(admin.violations).toEqual([]);
  await page.goto(`/admin/projects/${CAPITAL}/edit`);
  await expect(toggle(page)).toBeChecked();
  const form = await new AxeBuilder({ page })
    .include(".admin-main")
    .analyze();
  expect(form.violations).toEqual([]);
  await page.goto("/");
  await expect(slideLinks(page).first()).toBeVisible();
  const home = await new AxeBuilder({ page })
    .include(".corporate-banner")
    .analyze();
  expect(home.violations).toEqual([]);
});
