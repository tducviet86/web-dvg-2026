import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apiAs, expectErrorPopup, login } from "./helpers";

type Api = Awaited<ReturnType<typeof apiAs>>;
const toggle = (page: Page) =>
  page.getByRole("switch", { name: "Hiển thị dự án trên Banner trang chủ" });
const slideLinks = (page: Page) =>
  page.locator(".corporate-banner .banner-slide-link");

let api: Api;
let capitalId: string;
const publicBanners = async () =>
  (
    (await api.get("/banners")) as unknown as {
      data: { title: string; href: string | null }[];
    }
  ).data;

async function editCapital(page: Page) {
  await page.goto(`/admin/projects/${capitalId}/edit`);
  await expect(page.locator(".admin-editor-page")).toBeVisible();
}
async function saveProject(page: Page) {
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/projects$/);
}

test.beforeEach(async ({ page }) => {
  api = await apiAs();
  const projects = (await api.get("/admin/projects?q=Capital")) as unknown as {
    data: { id: string; slug: string }[];
  };
  capitalId = projects.data[0].id;
  // Known starting point: Capital Square published under its original slug, no banner.
  await api.send("patch", `/admin/projects/${capitalId}`, {
    slug: "capital-square",
    status: "PUBLISHED",
    banner: { enabled: false },
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
});

// Leave the homepage as the other suites expect it (the 3 imported slides).
test.afterAll(async () => {
  const admin = await apiAs();
  await admin.send("patch", `/admin/projects/${capitalId}`, {
    slug: "capital-square",
    status: "PUBLISHED",
    banner: { enabled: false },
  });
  const banners = (await admin.get("/admin/banners")) as unknown as {
    data: { id: string; type: string; title: string | null }[];
  };
  for (const banner of banners.data)
    if (banner.type === "NORMAL" && banner.title === "Banner thường QA")
      await admin.send("delete", `/admin/banners/${banner.id}`);
});

/** Embla sets a transform on the track once the carousel is interactive. */
const carouselReady = (page: Page) =>
  page.waitForFunction(() =>
    document
      .querySelector(".banner-swipe-track")
      ?.getAttribute("style")
      ?.includes("transform"),
  );

test("1. a normal banner shows on the homepage without navigation", async ({
  page,
}) => {
  const media = (await api.get("/admin/media?pageSize=50")) as unknown as {
    data: { id: string; key: string }[];
  };
  await page.goto("/admin/banners/new");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Thêm mới banner",
  );
  await page.getByRole("button", { name: "Chọn từ thư viện" }).first().click();
  await page.locator(".media-library-grid button").first().click();
  await page.getByLabel("Tiêu đề banner").fill("Banner thường QA");
  await page.getByLabel("Thứ tự hiển thị").fill("1");
  await expect(page.locator(".banner-preview-caption")).toContainText(
    "Banner thường QA",
  );
  await page.getByRole("button", { name: "Lưu banner" }).click();
  await expect(page).toHaveURL(/\/admin\/banners$/);
  await expect(page.locator(".banner-table tbody tr").first()).toContainText(
    "Banner thường QA",
  );
  expect(media.data.length).toBeGreaterThan(0);
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

test("2/3/6. the project form creates one linked banner that opens the detail page", async ({
  page,
}) => {
  await editCapital(page);
  await expect(toggle(page)).not.toBeChecked();
  await toggle(page).check({ force: true });
  await expect(page.locator(".banner-preview-hotspot")).toContainText(
    "/du-an/capital-square",
  );
  await page.getByLabel("Thứ tự hiển thị").fill("1");
  await saveProject(page);
  for (let i = 0; i < 2; i++) {
    await editCapital(page);
    await saveProject(page);
  }
  const all = (await api.get("/admin/banners")) as unknown as {
    data: { projectId: string | null }[];
  };
  expect(all.data.filter((b) => b.projectId === capitalId)).toHaveLength(1);
  await page.goto("/");
  const link = slideLinks(page).first();
  await expect(link).toHaveAttribute("href", "/du-an/capital-square");
  expect(await link.evaluate((el) => getComputedStyle(el).cursor)).toBe(
    "pointer",
  );
  await link.click();
  await expect(page).toHaveURL(/\/du-an\/capital-square$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Capital Square",
  );
});

test("4/5/7/8. image, slug, publication and toggle changes reach the homepage", async ({
  page,
}) => {
  await api.send("patch", `/admin/projects/${capitalId}`, {
    banner: { enabled: true, useProjectImage: true, position: 1 },
  });
  // 4. Own banner image (the project cover stays unchanged).
  await editCapital(page);
  await page
    .getByLabel("Ảnh riêng cho banner (không thay đổi ảnh đại diện)")
    .check();
  const section = page.locator("section", {
    hasText: "Hiển thị trên Banner trang chủ",
  });
  await section
    .getByRole("button", { name: "Chọn từ thư viện" })
    .first()
    .click();
  await section.locator(".media-library-grid button").nth(1).click();
  await saveProject(page);
  const project = (await api.get(
    `/admin/projects/${capitalId}`,
  )) as unknown as {
    data: { coverImage: { url: string }; banner: { image: { url: string } } };
  };
  expect(project.data.banner.image.url).not.toBe(project.data.coverImage.url);
  expect(project.data.coverImage.url).toBe("/images/projects/capital.jpg");
  await page.goto("/");
  await expect(slideLinks(page).first().locator("img")).toHaveAttribute(
    "src",
    new RegExp(encodeURIComponent(project.data.banner.image.url).slice(0, 18)),
  );
  // 7. Slug change: the banner follows the project ID.
  await api.send("patch", `/admin/projects/${capitalId}`, {
    slug: "capital-square-moi",
  });
  expect((await publicBanners())[0].href).toBe("/du-an/capital-square-moi");
  await page.goto("/");
  await expect(slideLinks(page).first()).toHaveAttribute(
    "href",
    "/du-an/capital-square-moi",
  );
  // 8. Unpublished project: no public banner.
  await api.send("patch", `/admin/projects/${capitalId}`, { status: "DRAFT" });
  await page.goto("/");
  await expect(slideLinks(page)).toHaveCount(0);
  await page.goto("/admin/banners");
  await expect(page.locator(".banner-table")).toContainText(
    "Ẩn — dự án chưa xuất bản",
  );
  // 5. Toggle off keeps project and banner content.
  await api.send("patch", `/admin/projects/${capitalId}`, {
    status: "PUBLISHED",
  });
  await editCapital(page);
  await toggle(page).uncheck({ force: true });
  await saveProject(page);
  const after = (await api.get(`/admin/projects/${capitalId}`)) as unknown as {
    data: { banner: { isActive: boolean; image: unknown } };
  };
  expect(after.data.banner.isActive).toBe(false);
  expect(after.data.banner.image).toBeTruthy();
  await page.goto("/");
  await expect(slideLinks(page)).toHaveCount(0);
});

test("9. banner module and project form share one record", async ({ page }) => {
  await api.send("patch", `/admin/projects/${capitalId}`, {
    banner: { enabled: true, useProjectImage: true },
  });
  await page.goto("/admin/banners");
  const row = page.locator(".banner-table tbody tr", {
    hasText: "Capital Square",
  });
  await expect(row).toContainText("PROJECT");
  await row.getByRole("button", { name: "Tắt Capital Square" }).click();
  await expect(row).toContainText("Đã tắt");
  await editCapital(page);
  await expect(toggle(page)).not.toBeChecked();
  await page.goto("/admin/banners/new");
  await page.getByText("Banner dự án", { exact: true }).click();
  await expect(
    page.getByLabel(/Dự án liên kết/).locator(`option[value="${capitalId}"]`),
  ).toHaveJSProperty("disabled", true);
  // Edit from the banner module, then the project form shows the change.
  await page.goto("/admin/banners");
  await row.getByRole("button", { name: "Bật Capital Square" }).click();
  await expect(row).toContainText("Đang hiển thị");
  await row.getByRole("button", { name: "Sửa Capital Square" }).click();
  await page.getByLabel("Tiêu đề banner").fill("Capital Square bên sông Hàn");
  await page.getByRole("button", { name: "Lưu banner" }).click();
  await expect(page).toHaveURL(/\/admin\/banners$/);
  await editCapital(page);
  await expect(toggle(page)).toBeChecked();
  await expect(page.getByLabel("Tiêu đề banner")).toHaveValue(
    "Capital Square bên sông Hàn",
  );
  // A change made elsewhere while the form is open is not overwritten.
  const banner = (
    (await api.get(`/admin/projects/${capitalId}`)) as unknown as {
      data: { banner: { id: string; updatedAt: string } };
    }
  ).data.banner;
  await api.send("patch", `/admin/banners/${banner.id}`, {
    title: "Sửa ở tab khác",
    expectedUpdatedAt: banner.updatedAt,
  });
  await page.getByLabel("Tiêu đề banner").fill("Nội dung cũ");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expectErrorPopup(page, "Banner của dự án đã thay đổi");
  expect(
    (await publicBanners()).some((b) => b.title === "Sửa ở tab khác"),
  ).toBe(true);
});

test("11. dragging a linked banner changes slide without navigating", async ({
  page,
}) => {
  await api.send("patch", `/admin/projects/${capitalId}`, {
    banner: { enabled: true, useProjectImage: true, position: 1 },
  });
  await page.goto("/");
  await expect(slideLinks(page).first()).toBeVisible();
  await carouselReady(page);
  const box = (await page.locator(".banner-swipe-viewport").boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 30 });
  await page.mouse.up();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".banner-count")).toContainText("02");
});

test("10. linked banner works on mobile with touch", async ({ browser }) => {
  await api.send("patch", `/admin/projects/${capitalId}`, {
    banner: { enabled: true, useProjectImage: true, position: 1 },
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  const link = slideLinks(page).first();
  await expect(link).toBeVisible();
  expect((await link.boundingBox())!.width).toBeGreaterThanOrEqual(389);
  await link.tap();
  await expect(page).toHaveURL(/\/du-an\/capital-square$/);
  await context.close();
});

test("banner admin and homepage banner pass axe checks", async ({ page }) => {
  await api.send("patch", `/admin/projects/${capitalId}`, {
    banner: { enabled: true, useProjectImage: true, position: 1 },
  });
  await page.goto("/admin/banners");
  await expect(page.locator(".banner-table")).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include(".admin-main").analyze())
      .violations,
  ).toEqual([]);
  await editCapital(page);
  await expect(toggle(page)).toBeChecked();
  expect(
    (await new AxeBuilder({ page }).include(".admin-main").analyze())
      .violations,
  ).toEqual([]);
  await page.goto("/");
  await expect(slideLinks(page).first()).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include(".corporate-banner").analyze())
      .violations,
  ).toEqual([]);
});

test("a banner photo too small for a full screen is flagged before saving", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/banners/new");
  const desktop = page.getByRole("group", { name: /Ảnh banner \(desktop\)/ });
  // A 1×1 PNG: far below the 1920px a full-screen banner needs.
  const tiny = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await desktop
    .locator("input[type=file]")
    .setInputFiles({ name: "nho.png", mimeType: "image/png", buffer: tiny });
  await expect(desktop.getByRole("status")).toContainText(
    "chỉ rộng 1px nên hiện toàn màn hình sẽ bị mờ",
  );
  // A large photo shows no warning.
  await desktop.getByRole("button", { name: "Bỏ ảnh" }).click();
  await desktop.locator("input[type=file]").setInputFiles({
    name: "lon.jpg",
    mimeType: "image/jpeg",
    buffer: readFileSync("public/images/projects/capital.jpg"),
  });
  await expect(desktop.locator(".editor-image-preview img")).toBeVisible();
  await expect(desktop.getByRole("status")).toHaveCount(0);
});
