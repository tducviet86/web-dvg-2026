import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Property } from "../src/types";
import { propertyMedia, videoSource } from "../src/lib/property-media";
import { filterProperties } from "../src/lib/filter";
import { apiAs, humanPause } from "./helpers";

const room = "/cho-thue/can-ho-sun-ponte-residence-demo-01";

test("media accepts local video and unlimited images; search handles project names and accents", () => {
  expect(videoSource("/images/video.mp4")).toEqual({
    src: "/images/video.mp4",
    embed: false,
  });
  expect(videoSource("/images/../private/video.mp4")).toBeNull();
  expect(videoSource("https://evil.test/embed/video")).toBeNull();
  expect(videoSource("javascript:alert(1)")).toBeNull();
  expect(videoSource("https://youtu.be/abcdefghijk")?.src).toBe(
    "https://www.youtube-nocookie.com/embed/abcdefghijk",
  );
  const sample: Property = {
    id: "p-1",
    slug: "can-mau",
    name: "Căn hộ đón nắng",
    projectId: "uuid-monarchy",
    projectName: "The Monarchy",
    projectSlug: "monarchy-apartments",
    location: "Sơn Trà, Đà Nẵng",
    type: "Studio",
    price: 9.5,
    area: 40,
    bedrooms: 0,
    bathrooms: 1,
    floor: 8,
    furniture: "Đầy đủ nội thất",
    status: "Còn trống",
    image: "/images/projects/monarchy.jpg",
    description: "Căn hộ mẫu.",
    updatedAt: "2026-10-21",
    unitCode: "property-2",
    videoUrl: "/images/video.mp4",
  };
  const properties: Property[] = [
    sample,
    {
      ...sample,
      id: "p-2",
      projectId: "uuid-ponte",
      projectName: "Sun Ponte Residence",
      projectSlug: "sun-ponte-residence",
      name: "Căn hộ view sông",
      unitCode: "A-12",
    },
  ];
  const media = propertyMedia({
    ...sample,
    gallery: Array.from({ length: 12 }, (_, i) => `/images/room-${i}.jpg`).join(
      "\n",
    ),
  });
  expect(media.filter((m) => m.type === "image")).toHaveLength(13);
  expect(media.at(-1)?.type).toBe("video");
  expect(
    filterProperties(properties, { q: "monarchy" }).every(
      (p) => p.projectSlug === "monarchy-apartments",
    ),
  ).toBeTruthy();
  expect(
    filterProperties(properties, { q: "property-2" }).length,
  ).toBeGreaterThan(0);
  expect(
    filterProperties(properties, { q: "don nang" }).length,
  ).toBeGreaterThan(0);
  expect(
    filterProperties(properties, { project: "sun-ponte-residence" }).map(
      (p) => p.id,
    ),
  ).toEqual(["p-2"]);
});

test("banner supports mouse drag, keyboard and automatic playback without navigation buttons", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tạm dừng trình chiếu" }).click();
  await expect(
    page.getByRole("button", { name: /Ảnh banner|Hiển thị ảnh/ }),
  ).toHaveCount(0);
  const viewport = page.locator(".banner-swipe-viewport");
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, {
    steps: 30,
  });
  await page.mouse.up();
  await expect(page.locator(".banner-count")).toHaveText("0203");
  await viewport.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".banner-count")).toHaveText("0303");
  await page.getByRole("button", { name: "Phát trình chiếu" }).click();
  await expect(page.locator(".banner-count")).toHaveText("0103", {
    timeout: 8000,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Tạm dừng trình chiếu" }),
  ).toHaveCount(0);
});

test("rental search, project landing, real map links and filter removal", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  await expect(page.locator(".property-card")).toHaveCount(9);
  await page.evaluate(() => {
    document.documentElement.dataset.searchProbe = "retained";
  });
  // One search box: the one over the photo.
  await expect(page.locator("main form")).toHaveCount(1);
  const search = page.locator(".hero-search");
  await search.locator('[name="q"]').fill("monarchy");
  await search
    .getByRole("button", { name: "Tìm căn thuê", exact: true })
    .click();
  await expect(page.locator(".property-card")).toHaveCount(5);
  await expect(page.locator("html")).toHaveAttribute(
    "data-search-probe",
    "retained",
  );
  expect(
    (await page.locator(".property-card .card-meta").allTextContents()).every(
      (s) => s.includes("Monarchy"),
    ),
  ).toBeTruthy();
  await page.goto("/cho-thue/du-an/sun-panoma");
  await expect(
    page.locator('main a[href="https://maps.app.goo.gl/9z4BBFMd3ovgpS5y5"]'),
  ).toHaveCount(1);
  await expect(page.locator('iframe[title*="Panoma"]')).toHaveAttribute(
    "src",
    /16.0524094,108.236731/,
  );
  await page.goto("/cho-thue/du-an/sun-panoma?bedrooms=2&sort=price-asc");
  await expect(page.locator('.hero-search [name="project"]')).toHaveCount(0);
  await page.locator(".filter-chips a").click();
  await expect(page).not.toHaveURL(/bedrooms=/);
  await expect(page).toHaveURL(/sun-panoma\?sort=price-asc/);
});

test("room gallery loads supplied MP4, opens photos, and keeps call CTAs without a form", async ({
  page,
  request,
}) => {
  const response = await request.get("/images/video.mp4", {
    headers: { Range: "bytes=0-127" },
  });
  expect([200, 206]).toContain(response.status());
  expect(response.headers()["content-type"]).toContain("video/mp4");
  await page.goto(room);
  await expect(page.locator("main form")).toHaveCount(0);
  await expect(
    page.locator('.room-contact-panel a[href="tel:0911296979"]'),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xem video căn hộ", exact: true })
    .click();
  const video = page.locator(".rental-gallery video");
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(1);
  expect(
    await video.evaluate((v: HTMLVideoElement) => v.duration),
  ).toBeGreaterThan(0);
  await video.evaluate(async (v: HTMLVideoElement) => {
    v.muted = true;
    await v.play();
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(async () => {
        const frame = await page
          .locator(".rental-gallery-viewport")
          .boundingBox();
        const clip = await video.boundingBox();
        return (
          Math.abs(frame!.x - clip!.x) + Math.abs(frame!.width - clip!.width)
        );
      })
      .toBeLessThan(2);
  }
  await page.getByRole("button", { name: "Chọn ảnh 1", exact: true }).click();
  await expect(video).toHaveCount(0);
  const enlarge = page.locator(
    '.rental-gallery-slide[aria-hidden="false"] .gallery-enlarge',
  );
  expect((await enlarge.boundingBox())!.height).toBeLessThan(60);
  await page
    .locator('.rental-gallery-slide:not([aria-hidden="true"]) .gallery-image')
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".lightbox .carousel-actions")).toContainText(
    "2 / 4",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.locator('a[href="https://maps.app.goo.gl/qkp75Kg1P8nbW5uk9"]'),
  ).toHaveCount(1);
});

test("rental SEO distinguishes project pages, filters and unpublished sample units", async ({
  page,
  request,
}) => {
  for (const slug of [
    "monarchy-apartments",
    "sun-panoma",
    "sun-ponte-residence",
    "sam-tower",
    "hiyori-garden-tower",
  ]) {
    const response = await page.goto(`/cho-thue/du-an/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Cho thuê căn hộ/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`/cho-thue/du-an/${slug}$`),
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /images\/projects/,
    );
    const breadcrumb = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    expect(JSON.parse(breadcrumb!).itemListElement).toHaveLength(3);
  }
  await page.goto("/cho-thue?price=15");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await page.goto(room);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("cho-thue/du-an/monarchy-apartments");
  expect(sitemap).not.toContain("demo-01");
  expect((await request.get("/cho-thue/du-an/khong-ton-tai")).status()).toBe(
    404,
  );
});

test("rental layouts fit desktop/mobile and remain accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of [
    "/cho-thue",
    "/cho-thue/du-an/monarchy-apartments",
    room,
  ]) {
    await page.goto(route);
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}`,
      ).toBeTruthy();
    }
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      route,
    ).toEqual([]);
    await page.screenshot({
      path: `/tmp/dvg-rental-${route === "/cho-thue" ? "listing" : route === room ? "detail" : "project"}.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `/tmp/dvg-rental-${route === "/cho-thue" ? "listing" : route === room ? "detail" : "project"}-mobile.png`,
      fullPage: true,
    });
  }
});

test("advice request popup validates, reaches the API with the project, and reports errors", async ({
  page,
}) => {
  // Unit pages offer calling only (no viewing booking form).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cho-thue/can-ho-sun-panoma-demo-02");
  await expect(page.locator(".room-mobile-call a[href^='tel:']")).toBeVisible();
  await expect(page.locator(".room-mobile-call button")).toHaveCount(0);
  await expect(page.getByText("Đặt lịch xem căn")).toHaveCount(0);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/cho-thue/du-an/sun-panoma");
  const open = page
    .locator(".hero-contact")
    .getByRole("button", { name: "Tư vấn chọn căn" });
  await open.click();
  // The title changes with the outcome (form → success/error), so locate the
  // dialog by role only.
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Tư vấn chọn căn");
  await expect(dialog.locator(".inquiry-target")).toContainText("Sun Panoma");
  await dialog.getByRole("button", { name: "Gửi nhu cầu" }).click();
  await expect(
    dialog.getByText("Nhập số di động Việt Nam hợp lệ."),
  ).toBeVisible();
  await dialog.getByLabel("Họ và tên").fill("Khách Kiểm Thử");
  await dialog.getByLabel("Số điện thoại").fill("0911 222 333");
  await dialog.getByLabel("Email").fill("khach.e2e@example.test");
  await dialog.getByLabel("Ngân sách mỗi tháng").selectOption("10–15 triệu");
  await dialog.getByLabel(/Tôi đồng ý/).check();
  // Real API call; the anti-spam timer needs a human-like delay.
  await humanPause(page);
  const sent = page.waitForRequest((r) =>
    r.url().endsWith("/api/v1/inquiries"),
  );
  await dialog.getByRole("button", { name: "Gửi nhu cầu" }).click();
  const body = (await sent).postDataJSON();
  expect(body).toMatchObject({
    projectSlug: "sun-panoma",
    phone: "0911222333",
    intent: "Tìm thuê bất động sản",
  });
  expect(body.message).toContain("Ngân sách: 10–15 triệu");
  expect((await (await sent).response())?.status()).toBe(202);
  await expect(dialog.getByRole("status")).toContainText(
    "Đã nhận yêu cầu của bạn",
  );
  // The lead reaches Admin › Khách hàng.
  const leads = (await (
    await apiAs()
  ).get("/admin/leads?q=khach.e2e@example.test")) as unknown as {
    data: { intent: string }[];
  };
  expect(leads.data[0]).toMatchObject({ intent: "Tìm thuê bất động sản" });
  await dialog.getByRole("button", { name: "Hoàn tất" }).click();
  await expect(dialog).toBeHidden();

  // Server refusal: the popup explains it and keeps the visitor's input.
  await page.route("**/api/v1/inquiries", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "RATE_LIMITED", message: "Too many", requestId: "x" },
      }),
    }),
  );
  await open.click();
  await dialog.getByLabel("Họ và tên").fill("Khách Kiểm Thử");
  await dialog.getByLabel("Số điện thoại").fill("0911222333");
  await dialog.getByLabel("Email").fill("khach.e2e@example.test");
  await dialog.getByLabel(/Tôi đồng ý/).check();
  await dialog.getByRole("button", { name: "Gửi nhu cầu" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Bạn gửi hơi nhanh");
  await dialog.getByRole("button", { name: "Sửa và gửi lại" }).click();
  await expect(dialog.getByLabel("Họ và tên")).toHaveValue("Khách Kiểm Thử");
});

test("detailed filters live in the hero search and the owner popup opens", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  const search = page.locator(".hero-search");
  await search.getByRole("button", { name: /Bộ lọc chi tiết/ }).click();
  await search.getByLabel("Diện tích").selectOption("60");
  await search.getByLabel("Sắp xếp").selectOption("price-asc");
  await search.getByRole("button", { name: "Tìm căn thuê" }).click();
  await expect(page).toHaveURL(/area=60/);
  await expect(page).toHaveURL(/sort=price-asc/);
  // Opened again on arrival, showing the filters in use.
  await expect(search.getByLabel("Diện tích")).toHaveValue("60");
  await page.locator(".filter-chips a", { hasText: "Từ 60 m²" }).click();
  await expect(page).not.toHaveURL(/area=/);
  await page.getByRole("button", { name: "Gửi thông tin ký gửi" }).click();
  await expect(
    page.getByRole("dialog", { name: "Ký gửi căn hộ cho thuê" }),
  ).toBeVisible();
});

test("full-screen search: rent, buy and consign from the rental page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/cho-thue");
  const hero = page.locator(".rental-hero");
  await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
  // The photo fills the screen under the header.
  const box = (await hero.boundingBox())!;
  expect(box.height).toBeGreaterThan(700);

  // Rent: results below, filtered, scrolled into view.
  await hero.getByLabel("Phòng ngủ").selectOption("1");
  await hero.getByRole("button", { name: "Tìm căn thuê" }).click();
  await expect(page).toHaveURL(/\/cho-thue\?bedrooms=1#can-ho$/);
  await expect(page.locator(".rental-results-heading h2")).toHaveText(
    "Khám phá căn hộ cho thuê",
  );
  await expect(page.locator("#can-ho")).toBeInViewport();

  // Buy: the list switches to units for sale.
  await page.goto("/cho-thue");
  await hero.getByRole("tab", { name: "Mua" }).click();
  await expect(hero.getByLabel("Giá bán")).toBeVisible();
  await hero.getByRole("button", { name: "Tìm căn bán" }).click();
  await expect(page).toHaveURL(/nhu-cau=mua/);
  await expect(page.locator(".rental-results-heading h2")).toHaveText(
    "Căn hộ đang bán",
  );
  await expect(hero.getByRole("tab", { name: "Mua" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".rental-card-grid .property-card")).toHaveCount(0);

  // Consign: a request form, no search.
  await hero.getByRole("tab", { name: "Ký gửi" }).click();
  await hero.getByRole("button", { name: "Gửi thông tin ký gửi" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
