import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { API_URL } from "../playwright.config";
import { apiAs, humanPause, login } from "./helpers";

/**
 * The production journey from the brief: an editor creates and publishes a
 * project with images and a homepage banner, the public site and sitemap
 * pick it up, a customer inquiry reaches the database and the admin, and
 * unpublishing removes the project everywhere.
 */
test("admin → database → public site → search engines → leads", async ({
  page,
  request,
}) => {
  // 16. Unauthorized users cannot use admin APIs.
  expect((await request.get(`${API_URL}/api/v1/admin/projects`)).status()).toBe(
    401,
  );
  expect(
    (
      await request.post(`${API_URL}/api/v1/admin/projects`, { data: {} })
    ).status(),
  ).toBe(401);
  await page.goto("/admin/projects");
  await expect(page).toHaveURL(/\/admin\/login/);

  // 1. Admin logs in.
  await login(page);

  // 2–5. Create a project, upload images, enable the homepage banner, publish.
  await page.goto("/admin/projects/new");
  const form = page.locator(".admin-editor-page");
  await form.locator("[name=name]").fill("Dự án Hành Trình QA");
  await page.getByRole("button", { name: "Tạo đường dẫn từ tên" }).click();
  await expect(form.locator("[name=slug]")).toHaveValue("du-an-hanh-trinh-qa");
  await form.locator('input[name=status][value="PUBLISHED"]').check();
  await form.getByRole("checkbox", { name: "Dự án đang triển khai" }).check();
  await form.getByRole("checkbox", { name: "Mua bán" }).check();
  await form.locator("[name=location]").fill("Hải Châu · Đà Nẵng");
  await form
    .locator("textarea[name=description]")
    .fill("Dự án kiểm thử hành trình xuất bản đầy đủ.");
  await form
    .locator("[name=overview]")
    .fill("Đoạn giới thiệu thứ nhất.\n\nĐoạn giới thiệu thứ hai.");
  await form
    .locator("[name=seoTitle]")
    .fill("Dự án Hành Trình QA | Đất Vàng Group");
  await form
    .locator("[name=seoDescription]")
    .fill("Mô tả SEO của dự án hành trình QA.");
  const png = readFileSync("public/images/img1.png");
  await form
    .locator(".editor-media .banner-image-field input[type=file]")
    .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
  await expect(
    form.locator(".editor-media .editor-image-preview img"),
  ).toBeVisible({ timeout: 20000 });
  await form
    .locator(".media-gallery input[type=file]")
    .setInputFiles([{ name: "g1.png", mimeType: "image/png", buffer: png }]);
  await expect(form.locator(".media-gallery li")).toHaveCount(1, {
    timeout: 20000,
  });
  await page
    .getByRole("switch", { name: "Hiển thị dự án trên Banner trang chủ" })
    .check({ force: true });
  await page.getByLabel("Thứ tự hiển thị").fill("1");
  await expect(page.locator(".banner-preview-hotspot")).toContainText(
    "/du-an/du-an-hanh-trinh-qa",
  );
  await page.getByRole("button", { name: "Tạo dự án" }).click();
  await expect(page).toHaveURL(/\/admin\/projects$/);
  await expect(
    page.locator("tbody tr", { hasText: "Dự án Hành Trình QA" }),
  ).toContainText("Banner trang chủ");

  // The database holds the project, its media and exactly one banner.
  const admin = await apiAs();
  const list = (await admin.get("/admin/projects?q=Hành Trình")) as unknown as {
    data: {
      id: string;
      coverImage: { url: string } | null;
      gallery: unknown[];
    }[];
  };
  expect(list.data).toHaveLength(1);
  expect(list.data[0].coverImage?.url).toMatch(/\.webp$/);
  expect(list.data[0].gallery).toHaveLength(1);
  const projectId = list.data[0].id;

  // 6–7. The project is on the homepage banner, which opens its detail page.
  await page.goto("/");
  const slide = page.locator(
    '.banner-slide-link[href="/du-an/du-an-hanh-trinh-qa"]',
  );
  await expect(slide).toHaveCount(1);
  await expect(page.locator(".banner-caption")).toContainText(
    "Dự án Hành Trình QA",
  );
  await slide.click();
  await expect(page).toHaveURL(/\/du-an\/du-an-hanh-trinh-qa$/);
  await expect(page.locator("main h1")).toHaveText("Dự án Hành Trình QA");
  await expect(page.locator("#tong-quan")).toContainText(
    "Đoạn giới thiệu thứ hai.",
  );

  // 8. SEO metadata of the detail page.
  await expect(page).toHaveTitle(/Dự án Hành Trình QA \| Đất Vàng Group/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Mô tả SEO của dự án hành trình QA.",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/du-an\/du-an-hanh-trinh-qa$/,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\.webp/,
  );
  expect(await page.locator('meta[name="robots"]').count()).toBe(0);

  // 9. The URL is in the sitemap.
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/du-an/du-an-hanh-trinh-qa</loc>");

  // 10–11. A customer inquiry is stored in PostgreSQL.
  await page.goto("/lien-he");
  const contact = page.locator(".contact-form");
  await contact.locator("[name=name]").fill("Khách Hành Trình");
  await contact.locator("[name=phone]").fill("0901234567");
  await contact.locator("[name=email]").fill("hanh-trinh@example.com");
  await contact
    .locator("select[name=intent]")
    .selectOption({ label: "Tư vấn mua bán bất động sản" });
  await contact
    .locator("[name=message]")
    .fill("Tôi muốn tìm hiểu Dự án Hành Trình QA.");
  await contact.locator("[name=consent]").check();
  await humanPause(page);
  await contact.getByRole("button", { name: "Đăng ký tư vấn" }).click();
  await expect(contact.getByRole("status")).toContainText(
    "Yêu cầu đã được ghi nhận",
  );
  const leads = (await admin.get(
    "/admin/leads?q=hanh-trinh@example.com",
  )) as unknown as { data: { name: string; status: string }[] };
  expect(leads.data).toEqual([
    expect.objectContaining({ name: "Khách Hành Trình", status: "NEW" }),
  ]);

  // 12. Admin sees the inquiry.
  await page.goto("/admin/leads");
  await page
    .getByRole("textbox", { name: "Tìm trong bảng" })
    .fill("hanh-trinh");
  await expect(page.locator("tbody")).toContainText("Khách Hành Trình");

  // 13–14. Admin updates the project; the public site reflects it at once.
  await page.goto(`/admin/projects/${projectId}/edit`);
  await page.locator("[name=name]").fill("Dự án Hành Trình QA (cập nhật)");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/projects$/);
  await page.goto("/du-an/du-an-hanh-trinh-qa");
  await expect(page.locator("main h1")).toHaveText(
    "Dự án Hành Trình QA (cập nhật)",
  );

  // 15. Unpublishing removes it from listings, the banner and the sitemap.
  await page.goto(`/admin/projects/${projectId}/edit`);
  await page.locator('input[name=status][value="DRAFT"]').check();
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/projects$/);
  expect((await request.get("/du-an/du-an-hanh-trinh-qa")).status()).toBe(404);
  await page.goto("/du-an");
  await expect(page.locator("main")).not.toContainText("Hành Trình QA");
  await page.goto("/");
  await expect(
    page.locator('.banner-slide-link[href="/du-an/du-an-hanh-trinh-qa"]'),
  ).toHaveCount(0);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "du-an-hanh-trinh-qa",
  );

  // Editors can still preview the draft (Draft Mode, noindex).
  await page.goto("/api/preview?type=project&slug=du-an-hanh-trinh-qa");
  await expect(page).toHaveURL(/\/du-an\/du-an-hanh-trinh-qa$/);
  await expect(page.locator(".preview-bar")).toContainText("chưa xuất bản");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await page.goto("/api/preview/exit");
});

test("renamed slugs redirect permanently and archived projects disappear", async ({
  page,
  request,
}) => {
  const admin = await apiAs();
  const type = await admin.get("/project-categories");
  expect(type.data).toBeTruthy();
  const created = await admin.send("post", "/admin/projects", {
    slug: "du-an-doi-ten-qa",
    name: "Dự án Đổi Tên QA",
    categories: ["operation", "rent"],
    location: "Đà Nẵng",
    intro: "Dự án kiểm tra chuyển hướng đường dẫn.",
    status: "PUBLISHED",
  });
  expect(created.status()).toBe(201);
  const { data } = await created.json();
  expect(
    (
      await admin.send("patch", `/admin/projects/${data.id}`, {
        slug: "du-an-ten-moi-qa",
      })
    ).ok(),
  ).toBeTruthy();
  const old = await request.get("/du-an/du-an-doi-ten-qa", { maxRedirects: 0 });
  expect(old.status()).toBe(308);
  expect(old.headers().location).toContain("/du-an/du-an-ten-moi-qa");
  await page.goto("/du-an/du-an-doi-ten-qa");
  await expect(page).toHaveURL(/\/du-an\/du-an-ten-moi-qa$/);
  expect((await request.get("/cho-thue/du-an/du-an-ten-moi-qa")).status()).toBe(
    200,
  );
  expect(
    (await admin.send("delete", `/admin/projects/${data.id}`)).status(),
  ).toBe(204);
  // The page cache is cleared in the background: wait for it.
  await expect
    .poll(async () => (await request.get("/du-an/du-an-ten-moi-qa")).status(), {
      timeout: 15_000,
    })
    .toBe(404);
});
