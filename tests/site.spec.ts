import { test, expect } from "@playwright/test";
test("all sitemap routes return meaningful server HTML and SEO metadata", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const xml = await sitemap.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
  expect(urls.length).toBeGreaterThan(60);
  for (const url of urls) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    const html = await response.text();
    expect(html, url).toContain("<h1");
    expect(html, url).toContain('rel="canonical"');
    expect(html, url).toContain('name="description"');
  }
  expect((await request.get("/khong-ton-tai")).status()).toBe(404);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  const admin = await (await request.get("/admin")).text();
  expect(admin).toContain("noindex");
});
test("home images, responsive widths, reduced motion and mobile drawer", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Đất Vàng Group",
  );
  await page.getByRole("button", { name: "Tạm dừng trình chiếu" }).click();
  await page.locator(".hero-photo").evaluate(async (img: HTMLImageElement) => {
    if (!img.complete)
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
  });
  expect(
    await page
      .locator(".hero-photo")
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  for (const img of await page.locator("main img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveJSProperty("complete", true);
    expect(
      await img.evaluate((el: HTMLImageElement) => el.naturalWidth),
    ).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "tests/home-desktop.png", fullPage: true });
  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `overflow at ${width}`,
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  await page.screenshot({ path: "tests/home-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("filters sort, empty state, load more, favorite persistence, gallery", async ({
  page,
}) => {
  await page.goto("/cho-thue?bedrooms=2&price=20&sort=price-asc");
  const prices = await page
    .locator(".property-bottom strong")
    .allTextContents();
  const numbers = prices.map((v) =>
    Number(v.replace(" triệu", "").replace(",", ".")),
  );
  expect(numbers.length).toBeGreaterThan(0);
  expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  expect(numbers.every((v) => v <= 20)).toBeTruthy();
  await expect(page.locator(".property-specs").first()).toContainText("2 PN");
  await page.goto("/cho-thue?q=khongcocanhonay");
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy không gian phù hợp." }),
  ).toBeVisible();
  await page.goto("/cho-thue");
  expect(await page.locator(".property-card").count()).toBe(9);
  await page.getByRole("link", { name: "Xem thêm căn hộ" }).click();
  await expect(page.locator(".property-card")).toHaveCount(18);
  await page
    .getByRole("button", { name: "Lưu căn hộ yêu thích" })
    .first()
    .click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Bỏ yêu thích" })).toHaveCount(
    1,
  );
  await page.locator(".property-card h3 a").first().click();
  await page.locator(".gallery-image").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Ảnh sau" }).click();
  await expect(page.locator(".lightbox .carousel-actions")).toContainText(
    "2 / 3",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("all lead forms validate and persist; newsletter", async ({ page }) => {
  for (const route of [
    "/lien-he",
    "/hop-tac-chu-so-huu",
    "/tuyen-dung",
    "/dich-vu/quan-ly-bat-dong-san",
  ]) {
    await page.goto(route);
    const form = page.locator(".contact-form");
    await form.getByRole("button", { name: "Đăng ký tư vấn" }).click();
    await expect(form.locator(".field-error").first()).toBeVisible();
    await form.locator("[name=name]").fill("Khách kiểm thử");
    await form.locator("[name=phone]").fill("0901234567");
    await form.locator("[name=email]").fill("qa@example.com");
    if (await form.locator("select[name=intent]").count())
      await form
        .locator("select[name=intent]")
        .selectOption({ label: "Ký gửi bán hoặc cho thuê" });
    await form
      .locator("[name=message]")
      .fill(`Yêu cầu kiểm thử trên trang ${route}`);
    await form.locator("[name=consent]").check();
    await form.getByRole("button", { name: "Đăng ký tư vấn" }).click();
    await expect(form.getByRole("status")).toContainText("Yêu cầu demo đã lưu");
  }
  const count = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dvg:leads") || "[]").length,
  );
  expect(count).toBe(24);
  await page.locator("#newsletter").fill("newsletter@example.com");
  await page.getByRole("button", { name: "Đăng ký bản tin" }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("dvg:newsletter") || "[]"),
    ),
  ).toContain("newsletter@example.com");
});
test("admin CRUD, lead assignment, settings and reset persist", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Dự án", exact: true })
    .click();
  await page.getByRole("button", { name: "Thêm mới" }).click();
  const dialog = page.locator(".admin-editor-page");
  await dialog.locator("[name=name]").fill("Dự án QA");
  await dialog.locator("[name=slug]").fill("du-an-qa");
  await dialog
    .locator("[name=description]")
    .fill("Dự án được tạo bởi bài kiểm tra tự động.");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Dự án QA", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Dự án", exact: true })
    .click();
  await page.getByRole("button", { name: "Sửa Dự án QA", exact: true }).click();
  await dialog.locator("[name=name]").fill("Dự án QA sửa");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Dự án QA sửa", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Xóa Dự án QA sửa", exact: true })
    .click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(
    page.getByText("Dự án QA sửa", { exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: /Khách hàng/ })
    .click();
  await page
    .getByRole("button", { name: "Sửa Khách hàng demo 1", exact: true })
    .click();
  await dialog.locator("[name=assignment]").selectOption("Chi Lê");
  await dialog.locator("[name=status]").selectOption("Hoàn tất");
  await dialog.locator("[name=notes]").fill("Đã kiểm tra phân công.");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("dvg:leads") || "[]")[0].assignment,
    ),
  ).toBe("Chi Lê");
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Cài đặt", exact: true })
    .click();
  await page.locator("[name=brand]").fill("Đất Vàng QA");
  await page.getByRole("button", { name: "Lưu cài đặt" }).click();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Cài đặt", exact: true })
    .click();
  await expect(page.locator("[name=brand]")).toHaveValue("Đất Vàng QA");
  await page.getByRole("button", { name: "Khôi phục dữ liệu mẫu" }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("dvg:")),
    ),
  ).toEqual([]);
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Tổng quan", exact: true })
    .click();
  await page.screenshot({
    path: "tests/admin-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});
