import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { properties } from "../src/data";
import { propertyMedia, videoSource } from "../src/lib/property-media";
import { filterProperties } from "../src/lib/filter";

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
  const media = propertyMedia({
    ...properties[0],
    gallery: Array.from({ length: 12 }, (_, i) => `/images/room-${i}.jpg`).join(
      "\n",
    ),
  });
  expect(media.filter((m) => m.type === "image")).toHaveLength(13);
  expect(media.at(-1)?.type).toBe("video");
  expect(
    filterProperties(properties, { q: "monarchy" }).every(
      (p) => p.projectId === "project-3",
    ),
  ).toBeTruthy();
  expect(
    filterProperties(properties, { q: "property-2" }).length,
  ).toBeGreaterThan(0);
  expect(
    filterProperties(properties, { q: "don nang" }).length,
  ).toBeGreaterThan(0);
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
  const search = page.locator(".rental-search");
  await search.locator('[name="q"]').fill("monarchy");
  await search.getByRole("button", { name: "Tìm căn hộ", exact: true }).click();
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
  await page
    .getByRole("navigation", { name: "Thuê theo dự án" })
    .getByRole("link", { name: "Sun Panoma", exact: true })
    .click();
  await expect(page).toHaveURL(/cho-thue\/du-an\/sun-panoma/);
  await expect(
    page.locator('main a[href="https://maps.app.goo.gl/9z4BBFMd3ovgpS5y5"]'),
  ).toHaveCount(1);
  await expect(page.locator('iframe[title*="Panoma"]')).toHaveAttribute(
    "src",
    /16.0524094,108.236731/,
  );
  await page.goto("/cho-thue/du-an/sun-panoma?bedrooms=2&sort=price-asc");
  await expect(page.locator('.rental-search [name="project"]')).toHaveCount(0);
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

test("admin saves local gallery and video and rejects unsupported video links", async ({
  page,
}) => {
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Căn hộ", exact: true })
    .click();
  await page.getByRole("button", { name: "Thêm mới" }).click();
  const form = page.locator(".admin-editor-page");
  await form.locator('[name="name"]').fill("Căn kiểm thử video");
  await form.locator('[name="slug"]').fill("can-kiem-thu-video");
  await form
    .locator('[name="description"]')
    .fill("Thông tin kiểm thử thư viện nhiều ảnh và video.");
  await form.locator('[name="image"]').fill("/images/projects/monarchy.jpg");
  await form
    .locator('[name="gallery"]')
    .fill("/images/projects/monarchy.jpg\n/images/projects/ponte.jpg");
  await form.locator('[name="videoUrl"]').fill("https://evil.test/embed/video");
  await form.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.locator("#editor-errors")).toContainText("Video cần");
  await form.locator('[name="videoUrl"]').fill("/images/video.mp4");
  await form.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByText("Căn kiểm thử video", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Sửa Căn kiểm thử video", exact: true })
    .click();
  await expect(form.locator('[name="videoUrl"]')).toHaveValue(
    "/images/video.mp4",
  );
  await expect(form.locator('[name="gallery"]')).toHaveValue(
    "/images/projects/monarchy.jpg\n/images/projects/ponte.jpg",
  );
});
