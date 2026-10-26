import { test, expect } from "@playwright/test";
import { apiAs, humanPause } from "./helpers";
test("all sitemap routes return meaningful server HTML and SEO metadata", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const xml = await sitemap.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
  expect(urls).toContain("/cho-thue/du-an/monarchy-apartments");
  expect(urls.some((url) => url.includes("demo-"))).toBe(false);
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
  await page
    .locator(".hero-photo")
    .first()
    .evaluate(async (img: HTMLImageElement) => {
      if (!img.complete)
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
    });
  expect(
    await page
      .locator(".hero-photo")
      .first()
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
  // Newest units are listed first; open a seeded sample unit (4 photos).
  await page.locator('.property-card h3 a[href*="-demo-"]').first().click();
  await page.locator(".gallery-image").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Ảnh sau" }).click();
  await expect(page.locator(".lightbox .carousel-actions")).toContainText(
    /2 \/ \d+/,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("all lead forms validate and persist; newsletter", async ({ page }) => {
  for (const route of [
    "/lien-he",
    "/hop-tac-chu-so-huu",
    // /tuyen-dung has its own CV form (tests/pages-jobs.spec.ts).
    "/dich-vu/quan-ly-bat-dong-san",
  ]) {
    await page.goto(route);
    // Service pages keep the form in a dialog behind a button.
    if (route.startsWith("/dich-vu/"))
      await page
        .getByRole("button", { name: "Gửi yêu cầu tư vấn" })
        .first()
        .click();
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
    await humanPause(page);
    await form.getByRole("button", { name: "Đăng ký tư vấn" }).click();
    await expect(form.getByRole("status")).toContainText(
      "Yêu cầu đã được ghi nhận",
    );
  }
  // Stored in PostgreSQL, visible to staff.
  const admin = await apiAs();
  const leads = (await admin.get(
    "/admin/leads?q=qa@example.com",
  )) as unknown as {
    meta: { total: number };
  };
  expect(leads.meta.total).toBe(3);
  // Close the service consultation dialog before using the footer.
  await page.keyboard.press("Escape");
  await page.locator("#newsletter").fill("newsletter@example.com");
  await page.getByRole("button", { name: "Đăng ký bản tin" }).click();
  await expect(page.getByText("Đã đăng ký nhận bản tin.")).toBeVisible();
});
