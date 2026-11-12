import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Property } from "../src/types";
import { propertyMedia, videoSource } from "../src/lib/property-media";
import { filterProperties, searchUnits } from "../src/lib/filter";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { BE_DIR, E2E_DATABASE_URL } from "../playwright.config";
import {
  BUILDING_BLOCKS,
  BUILDING_ROWS,
  FLOOR_METRES,
  rowLots,
  blockRing,
  lotFeatures,
  lotPlan,
} from "../src/lib/rental-map";
import { PLAN_ANCHORS, PLAN_OUTLINES } from "../src/lib/floor-plan-outlines";
import { unitFits } from "../src/lib/map-filter";
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
  await search.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
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
  // The site's own map, not Google's, with the way there under it.
  await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveCount(0);
  const route = page.locator(".project-map .mroute");
  await expect(route).toContainText("Sun Panoma");
  await expect(
    route.getByRole("link", { name: /Google Maps/ }),
  ).toHaveAttribute("href", /destination=16.0524094,108.236731/);
  await expect(
    route.getByRole("button", { name: "Chỉ đường từ vị trí của tôi" }),
  ).toBeVisible();
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
  await expect(page.locator(".rental-lightbox-count")).toContainText("2 / 4");
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
  // Grid/list and "Xem thêm" only re-show the same units: not for crawlers.
  for (const link of await page
    .locator(".view-toggle a, .load-more a")
    .all())
    await expect(link).toHaveAttribute("rel", "nofollow");
  await expect(page.locator(".view-toggle a")).toHaveCount(2);
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
  await search.getByLabel("Diện tích").click();
  await search.getByRole("option", { name: "Từ 60 m²" }).click();
  await search.getByLabel("Sắp xếp").click();
  await search.getByRole("option", { name: "Giá tăng dần" }).click();
  await search.getByRole("button", { name: "Tìm kiếm" }).click();
  await expect(page).toHaveURL(/area=60/);
  await expect(page).toHaveURL(/sort=price-asc/);
  // Opened again on arrival, showing the filters in use.
  await expect(search.getByLabel("Diện tích")).toHaveText("Từ 60 m²");
  await expect(search.locator('[name="area"]')).toHaveValue("60");
  await page.locator(".filter-chips a", { hasText: "Từ 60 m²" }).click();
  await expect(page).not.toHaveURL(/area=/);
  await page.getByRole("button", { name: "Gửi thông tin ký gửi" }).click();
  await expect(
    page.getByRole("dialog", { name: "Ký gửi căn hộ cho thuê" }),
  ).toBeVisible();
});

test("shophouse units show the area, no bedrooms or bathrooms", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; status: string }[];
  };
  const projectId = projects.data.find((p) => p.status === "PUBLISHED")!.id;
  const created = await api.send("post", "/admin/properties", {
    // Amenities saved by mistake are not shown for a shophouse.
    amenities: ["washer", "hot-water"],
    name: "Shophouse mặt tiền QA",
    unitCode: "SH-QA",
    projectId,
    propertyType: "shophouse",
    location: "Đà Nẵng",
    areaM2: 120,
    bedrooms: 0,
    bathrooms: 0,
    description: "Shophouse kinh doanh mặt tiền, kiểm tra hiển thị.",
    rentPriceVnd: "45000000",
    status: "PUBLISHED",
  });
  expect(created.ok()).toBeTruthy();
  const { slug, id } = (await created.json()).data as {
    slug: string;
    id: string;
  };
  await page.goto(`/cho-thue/${slug}`);
  const facts = page.locator(".room-quick-facts");
  await expect(facts).toContainText("120 m²");
  await expect(facts).toContainText("Diện tích");
  await expect(facts).not.toContainText("phòng");
  await expect(page.locator("dt", { hasText: "Diện tích" })).toHaveCount(1);
  await expect(page.locator("#tien-nghi")).toHaveCount(0);
  await expect(page.locator("dt", { hasText: /Phòng (ngủ|tắm)/ })).toHaveCount(
    0,
  );
  await page.goto("/cho-thue?q=shophouse+mat+tien+qa");
  const card = page.locator(".rental-card-grid .property-card").first();
  await expect(card.locator(".property-specs")).toContainText("120 m²");
  await expect(card.locator(".property-specs")).toContainText("Shophouse");
  await expect(card.locator(".property-specs")).not.toContainText("WC");
  await expect(card.locator(".property-specs")).not.toContainText("Tầng");
  // The photo says what it is.
  await expect(card.locator(".card-type-tag")).toHaveText("Shophouse");
  // Archived again so later lists stay apartments only.
  await api.send("delete", `/admin/properties/${id}`);
});

test("“Loại hình” pills: Căn hộ, Nhà phố, Mặt bằng; headings follow", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  // The list says what it holds, not how many.
  await expect(page.locator(".rental-results-heading")).not.toContainText(
    "phù hợp",
  );
  const hero = page.locator(".hero-search");
  // Only what exists can be chosen: no townhouses or premises yet.
  await expect(hero.getByLabel("Tất cả", { exact: true })).toBeChecked();
  await expect(hero.getByLabel("Nhà phố", { exact: true })).toBeDisabled();
  await expect(hero.getByLabel("Mặt bằng", { exact: true })).toBeDisabled();
  await expect(hero.getByLabel("Shophouse", { exact: true })).toBeDisabled();
  await expect(hero.locator(".hero-kinds label").nth(3)).toHaveText("Nhà phố");
  await expect(hero.locator(".hero-kinds label").nth(1)).toHaveText("Căn hộ");

  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: {
      id: string;
      name: string;
      status: string;
      categories: string[];
    }[];
  };
  // The "Dự án" list on this page holds the projects offered for rent.
  const project = projects.data.find(
    (p) => p.status === "PUBLISHED" && p.categories.includes("rent"),
  )!;
  const ids: string[] = [];
  for (const [code, propertyType, bedrooms] of [
    ["NP-3", "nha-pho", 3],
    ["NP-4", "nha-pho", 4],
    ["MB-1", "mat-bang", 0],
    ["SH-1", "shophouse", 0],
  ] as const) {
    const created = await api.send("post", "/admin/properties", {
      name: `Kiểm tra loại hình ${code}`,
      unitCode: code,
      projectId: project.id,
      propertyType,
      location: "Đà Nẵng",
      areaM2: 100,
      bedrooms,
      bathrooms: bedrooms,
      description: "Kiểm tra lựa chọn trong ô tìm kiếm.",
      rentPriceVnd: "30000000",
      status: "PUBLISHED",
    });
    expect(created.ok()).toBeTruthy();
    ids.push(((await created.json()).data as { id: string }).id);
  }
  // Saved one right after another: wait for the list holding all of them.
  await expect(async () => {
    await page.goto("/cho-thue");
    await expect(hero.getByLabel("Mặt bằng", { exact: true })).toBeEnabled({
      timeout: 1000,
    });
    await expect(hero.getByLabel("Shophouse", { exact: true })).toBeEnabled({
      timeout: 1000,
    });
    await expect(hero.getByLabel("Nhà phố", { exact: true })).toBeEnabled({
      timeout: 1000,
    });
  }).toPass({ timeout: 60_000 });
  // Shophouse and mặt bằng have no bedrooms: the field goes away.
  await hero.getByLabel("Shophouse", { exact: true }).check();
  await expect(hero.getByLabel("Phòng ngủ")).toHaveCount(0);
  await hero.getByLabel("Mặt bằng", { exact: true }).check();
  await expect(hero.getByLabel("Phòng ngủ")).toHaveCount(0);
  // Nhà phố: the bedrooms and the one project that really have them.
  await hero.getByLabel("Nhà phố", { exact: true }).check();
  // Picking a kind loads its results by itself, no jump.
  await expect(page).toHaveURL(/\?loai=townhouse$/);
  await expect(page.locator(".rental-results-heading h2")).toHaveText(
    "Khám phá nhà phố cho thuê",
  );
  await hero.getByLabel("Phòng ngủ").click();
  await expect(hero.getByRole("option")).toHaveText([
    "Tất cả",
    "3 phòng ngủ",
    "4 phòng ngủ",
  ]);
  await page.keyboard.press("Escape");
  await hero.getByLabel("Dự án").click();
  await expect(hero.getByRole("option")).toHaveText([
    "Tất cả dự án",
    project.name,
  ]);
  await page.keyboard.press("Escape");
  // Searching shophouses: only them, and the heading says so.
  await page.goto("/cho-thue?loai=shophouse");
  await expect(page.locator(".rental-results-heading h2")).toHaveText(
    "Khám phá shophouse cho thuê",
  );
  await expect(page.locator(".rental-card-grid .property-card")).toHaveCount(1);
  for (const id of ids) await api.send("delete", `/admin/properties/${id}`);
  await expect(async () => {
    await page.goto("/cho-thue");
    await expect(hero.getByLabel("Nhà phố", { exact: true })).toBeDisabled({
      timeout: 1000,
    });
    await expect(hero.getByLabel("Mặt bằng", { exact: true })).toBeDisabled({
      timeout: 1000,
    });
  }).toPass({ timeout: 60_000 });
  await hero.getByLabel("Căn hộ", { exact: true }).check();
  await expect(hero.getByLabel("Phòng ngủ")).toBeVisible();
  await hero.getByRole("button", { name: "Tìm kiếm" }).click();
  await expect(page).toHaveURL(/loai=apartment/);
  await expect(page.locator(".filter-chips")).toContainText("Căn hộ");
  await expect(page.locator(".rental-results-heading h2")).toHaveText(
    "Khám phá căn hộ cho thuê",
  );
  expect(
    await page.locator(".rental-card-grid .property-card").count(),
  ).toBeGreaterThan(0);
  await expect(hero.getByLabel("Căn hộ", { exact: true })).toBeChecked();
  // Searching premises: the heading and the count say so.
  await page.goto("/cho-thue?loai=premises");
  await expect(page.locator(".rental-card-grid .property-card")).toHaveCount(0);
  await expect(page.locator(".rental-results-heading h2")).toHaveText(
    "Khám phá mặt bằng cho thuê",
  );
  await page.goto("/du-an/van-hanh?loai=townhouse");
  await expect(page.locator("#can-ho h2")).toHaveText("Nhà phố cho thuê");
});

test("free units come first, soon-free next; on the date they count as free", async ({
  page,
}) => {
  const unit = (slug: string, status: string, availableFrom?: string) =>
    ({
      id: slug,
      slug,
      name: slug,
      location: "",
      status,
      availableFrom,
    }) as Property;
  const later = "2999-01-15";
  const order = filterProperties(
    [
      unit("da-thue", "Đã cho thuê"),
      unit("sap-trong", "Còn trống", later),
      unit("trong", "Còn trống"),
      unit("den-ngay", "Còn trống", "2020-01-01"),
    ],
    {},
  ).map((p) => p.slug);
  expect(order).toEqual(["trong", "den-ngay", "sap-trong", "da-thue"]);

  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; status: string }[];
  };
  const projectId = projects.data.find((p) => p.status === "PUBLISHED")!.id;
  const make = async (code: string, availableFrom: string) => {
    const res = await api.send("post", "/admin/properties", {
      name: `Căn ${code}`,
      unitCode: code,
      projectId,
      propertyType: "2pn",
      location: "Đà Nẵng",
      areaM2: 70,
      bedrooms: 2,
      bathrooms: 2,
      description: "Kiểm tra căn sắp trống và nhận nhà ngay.",
      rentPriceVnd: "20000000",
      availableFrom,
      includedFees: ["water", "internet"],
      status: "PUBLISHED",
    });
    expect(res.ok()).toBeTruthy();
    return (await res.json()).data as { id: string; slug: string };
  };
  const soon = await make("SOON-1", later);
  const now = await make("NOW-1", "2020-01-01");
  await page.goto(`/cho-thue/${soon.slug}`);
  const panel = page.locator(".room-contact-panel");
  await expect(panel).toContainText("Trống từ 15/01/2999");
  await expect(panel).toContainText("Từ 15/01/2999");
  // The call comes first; only the costs ticked in Admin are listed.
  await expect(panel.locator("> *").first()).toHaveAttribute("href", /^tel:/);
  // Covered ones are listed; the rest stay on the tenant.
  await expect(panel.locator(".room-included-fees li")).toHaveText([
    "Nước",
    "Internet",
  ]);
  await expect(panel.locator(".room-fees-out")).toHaveText(
    "Giá thuê chưa bao gồmĐiện, Phí quản lý, Phí gửi xe máy, Phí gửi ô tô",
  );
  await page.goto(`/cho-thue/${now.slug}`);
  await expect(page.locator(".room-contact-panel")).toContainText(
    "Nhận nhà ngay",
  );
  // Every unit by default: the tenant pays them all.
  await api.send("patch", `/admin/properties/${now.id}`, { includedFees: [] });
  await page.goto(`/cho-thue/${now.slug}`);
  await expect(page.locator(".room-fees-out")).toHaveText(
    "Giá thuê chưa bao gồmNước, Điện, Internet, Phí quản lý, Phí gửi xe máy, Phí gửi ô tô",
  );
  await expect(page.locator(".room-included-fees li")).toHaveCount(0);
  await page.goto("/cho-thue?q=SOON-1");
  await expect(page.locator(".property-card .image-badge")).toHaveText(
    "Trống từ 15/01/2999",
  );
  for (const u of [soon, now])
    await api.send("delete", `/admin/properties/${u.id}`);
});

test("search dropdowns open past the photo; a kind reloads only the results", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 760 });
  await page.goto("/cho-thue");
  const hero = page.locator(".hero-search");
  await hero.getByLabel("Dự án").click();
  const last = hero.getByRole("option").last();
  await last.scrollIntoViewIfNeeded();
  // Not cut off or covered: the point in its middle belongs to it.
  expect(
    await last.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      return el.contains(hit);
    }),
  ).toBe(true);
  await page.keyboard.press("Escape");
  // Picking a kind: spinner over the results, none over the page.
  let release!: () => void;
  const gate = new Promise<void>((done) => (release = done));
  await page.route("**/cho-thue?loai=apartment*", async (route) => {
    await gate;
    await route.continue();
  });
  await hero.getByLabel("Căn hộ", { exact: true }).check();
  await expect(page.locator("[data-results-loading]")).toHaveCount(1);
  await expect(page.locator(".navigation-spinner")).toHaveCount(0);
  await expect(hero).toBeInViewport();
  release();
  await expect(page).toHaveURL(/loai=apartment/);
  await expect(page.locator("[data-results-loading]")).toHaveCount(0);
});

test("Thuê / Mua tabs load their units by themselves, keeping the kind", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; status: string; categories: string[] }[];
  };
  const projectId = projects.data.find(
    (p) => p.status === "PUBLISHED" && p.categories.includes("operation"),
  )!.id;
  const created = await api.send("post", "/admin/properties", {
    name: "Căn bán theo tab QA",
    unitCode: "TAB-1",
    projectId,
    propertyType: "2pn",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    description: "Kiểm tra bấm tab Mua là thấy căn bán.",
    forRent: false,
    forSale: true,
    salePriceVnd: "5000000000",
    status: "PUBLISHED",
  });
  expect(created.ok()).toBeTruthy();
  const { id } = (await created.json()).data as { id: string };
  await page.goto("/du-an/van-hanh");
  const hero = page.locator(".hero-search");
  await hero.getByLabel("Căn hộ", { exact: true }).check();
  await expect(page).toHaveURL(/loai=apartment/);
  // No "Tìm kiếm": the tab alone brings the units for sale.
  await hero.getByRole("tab", { name: "Mua" }).click();
  await expect(page).toHaveURL(/nhu-cau=mua/);
  await expect(page).toHaveURL(/loai=apartment/);
  await expect(page.locator("#can-ho .sale-card")).not.toHaveCount(0);
  await expect(page.locator("#can-ho h2")).toHaveText("Căn hộ đang bán");
  // And back, the Back button too.
  await hero.getByRole("tab", { name: "Thuê" }).click();
  await expect(page).not.toHaveURL(/nhu-cau/);
  await expect(page.locator("#can-ho .property-card")).not.toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/nhu-cau=mua/);
  await expect(hero.getByRole("tab", { name: "Mua" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  // "Ký gửi" is a form: the list stays as it is.
  const url = page.url();
  await hero.getByRole("tab", { name: "Ký gửi" }).click();
  await expect(hero.locator(".hero-consign")).toBeVisible();
  expect(page.url()).toBe(url);
  await api.send("delete", `/admin/properties/${id}`);
});

test("keyword suggestions: words that find units, picked with one click", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  const hero = page.locator(".hero-search");
  const input = hero.getByRole("combobox", { name: "Từ khóa" });
  const list = hero.getByRole("listbox", { includeHidden: false });
  await expect(hero.locator(".hero-suggest")).toBeHidden();
  await input.focus();
  await expect(hero.locator(".hero-suggest")).toBeVisible();
  const chips = hero.locator(".hero-suggest li");
  expect(await chips.count()).toBeGreaterThan(0);
  // Each word shows how many units it finds: the same as the search gives.
  const first = (await chips.first().innerText()).split("\n");
  // Narrowed while typing, accents do not matter.
  await input.fill("phong");
  await expect(hero.locator(".hero-suggest")).toBeHidden();
  await input.fill("");
  await page.keyboard.press("Escape");
  await expect(hero.locator(".hero-suggest")).toBeHidden();
  await page.keyboard.press("ArrowDown");
  await expect(list).toBeVisible();
  await chips.first().click();
  await expect(page).toHaveURL(/\?q=.+#can-ho$/);
  await expect(input).toHaveValue(first[0]);
  await expect(page.locator(".rental-card-grid .property-card")).toHaveCount(
    Math.min(Number(first[1]), 9),
  );
  // Other words still search as before.
  await input.fill("sun panoma");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=sun\+panoma/);
});

test("unit page opens with the photos, then name and facts beside the price", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(room);
  const gallery = (await page.locator(".rental-gallery").boundingBox())!;
  const title = (await page.locator(".room-heading h1").boundingBox())!;
  const panel = (await page.locator(".room-contact-panel").boundingBox())!;
  expect(title.y).toBeGreaterThanOrEqual(gallery.y + gallery.height);
  // The price panel starts level with the name, on its right.
  expect(panel.x).toBeGreaterThan(title.x + title.width - 1);
  expect(Math.abs(panel.y - title.y)).toBeLessThan(120);
  // Sections: overview, costs, specs, then amenities and the project.
  const order = await page
    .locator(".room-description section")
    .evaluateAll((all) => all.map((x) => x.id).filter(Boolean));
  expect(order.indexOf("dieu-kien")).toBe(order.indexOf("khong-gian") + 1);
  expect(order.indexOf("thong-tin")).toBe(order.indexOf("dieu-kien") + 1);
  // At most four photos beside the main one; "see all" opens every one.
  const tiles = page.locator(".rental-gallery-thumbs > button:visible");
  expect(await tiles.count()).toBeLessThanOrEqual(4);
  await page.locator(".rental-gallery-all").click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("phones: facts in one row, price right after them, no sideways scroll", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(room);
    const facts = page.locator(".room-quick-facts > div");
    const tops = await facts.evaluateAll((all) =>
      all.map((x) => Math.round(x.getBoundingClientRect().top)),
    );
    expect(new Set(tops).size).toBe(1);
    await expect(page.locator(".room-quick-facts")).not.toContainText(
      "Phòng tắm",
    );
    const strip = (await page.locator(".room-quick-facts").boundingBox())!;
    const panel = (await page.locator(".room-contact-panel").boundingBox())!;
    const overview = (await page.locator("#khong-gian").boundingBox())!;
    // Both use the whole width, each fact on one line.
    expect(strip.width).toBeGreaterThan(width * 0.85);
    expect(panel.width).toBeGreaterThan(width * 0.85);
    expect(strip.height).toBeLessThan(90);
    expect(panel.y).toBeGreaterThanOrEqual(strip.y + strip.height);
    expect(overview.y).toBeGreaterThanOrEqual(panel.y + panel.height);
    // The call stays in the fixed bottom bar, not twice on screen.
    await expect(
      page.locator(".room-mobile-call a[href^='tel:']"),
    ).toBeVisible();
    await expect(page.locator(".room-contact-panel .call-button")).toBeHidden();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
});

test("price sliders: rent 0–100 triệu, sale from the units for sale", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  const hero = page.locator(".hero-search");
  const rent = hero.getByRole("group", { name: "Giá thuê / tháng" });
  await expect(rent.locator("output")).toHaveText("Mọi mức giá");
  const low = rent.getByRole("slider", { name: /thấp nhất/ });
  const high = rent.getByRole("slider", { name: /cao nhất/ });
  await expect(low).toHaveAttribute("aria-valuemin", "0");
  await expect(high).toHaveAttribute("aria-valuemax", "100");
  await low.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
  await high.focus();
  for (let i = 0; i < 80; i++) await page.keyboard.press("ArrowLeft");
  await expect(rent.locator("output")).toHaveText("10 – 20 triệu");
  await hero.getByRole("button", { name: "Tìm kiếm" }).click();
  await expect(page).toHaveURL(/\?gia-tu=10&price=20#can-ho$/);
  const prices = (
    await page
      .locator(".rental-card-grid .property-bottom strong")
      .allTextContents()
  ).map((v) => Number(v.replace(/\D/g, "")) / 1e6);
  expect(prices.length).toBeGreaterThan(0);
  expect(prices.every((v) => v >= 10 && v <= 20)).toBeTruthy();
  await expect(page.locator(".filter-chips")).toContainText("Từ 10 triệu");
  // Arriving with a range keeps the handles where they were.
  await expect(rent.locator("output")).toHaveText("10 – 20 triệu");

  await hero.getByRole("tab", { name: "Mua" }).click();
  const sale = hero.getByRole("group", { name: "Giá bán" });
  const bottom = Number(
    await sale
      .getByRole("slider", { name: /thấp nhất/ })
      .getAttribute("aria-valuemin"),
  );
  const top = Number(
    await sale
      .getByRole("slider", { name: /cao nhất/ })
      .getAttribute("aria-valuemax"),
  );
  expect(top).toBeGreaterThan(bottom);
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
  await hero.getByLabel("Phòng ngủ").click();
  await hero.getByRole("option", { name: "1 phòng ngủ" }).click();
  await hero.getByRole("button", { name: "Tìm kiếm" }).click();
  await expect(page).toHaveURL(/\/cho-thue\?bedrooms=1#can-ho$/);
  await expect(page.locator(".rental-results-heading h2")).toHaveText(
    "Khám phá căn hộ cho thuê",
  );
  await expect(page.locator("#can-ho")).toBeInViewport();

  // Buy: the list switches to units for sale.
  await page.goto("/cho-thue");
  await hero.getByRole("tab", { name: "Mua" }).click();
  await expect(hero.getByRole("group", { name: "Giá bán" })).toBeVisible();
  await hero.getByRole("button", { name: "Tìm kiếm" }).click();
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

test("unit page folds long lists, offers other rentals and remembers viewed units", async ({
  page,
}) => {
  const other = "/cho-thue/can-ho-sam-tower-demo-04";
  await page.goto(other);
  // Saved once the page is interactive.
  await page.waitForFunction(() =>
    localStorage.getItem("dvg:recent-rentals")?.includes("sam-tower-demo-04"),
  );
  await page.goto(room);
  // Specs: folded with a "Xem thêm" button that unfolds every row.
  const specs = page.locator("#thong-tin");
  const toggle = specs.getByRole("button", { name: "Xem thêm" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(specs.locator(".show-more")).toHaveAttribute(
    "data-folded",
    "true",
  );
  await toggle.click();
  await expect(specs.getByRole("button", { name: "Thu gọn" })).toBeVisible();
  // The last row is no longer clipped: it can be scrolled into view.
  await expect(specs.locator(".show-more")).toHaveAttribute(
    "data-folded",
    "false",
  );
  const lastRow = specs.getByText("Ngày cập nhật");
  await lastRow.scrollIntoViewIfNeeded();
  await expect(lastRow).toBeInViewport();
  // Featured rentals mixing the projects.
  const explore = page.locator(".room-more", {
    has: page.getByRole("heading", {
      name: "Căn hộ nổi bật đang được quan tâm",
    }),
  });
  const cards = explore.locator(".rent-mini");
  // A few suggestions (5) in a row, no sideways scrolling.
  await expect(cards).toHaveCount(5);
  expect(
    await explore
      .locator(".room-strip")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  // Projects take turns: the first cards come from different projects.
  const projects = await explore.locator(".rent-mini small").allInnerTexts();
  expect(new Set(projects.slice(0, 3)).size).toBe(3);
  // Recently viewed: the unit seen before, not the current one.
  const recent = page.locator(".room-recent");
  await expect(recent.locator(".rent-mini a")).toHaveCount(1);
  await expect(recent.locator(".rent-mini a")).toHaveAttribute(
    "href",
    new RegExp(`${other}$`),
  );
  await recent.getByRole("button", { name: "Xóa lịch sử" }).click();
  await expect(recent).toHaveCount(0);
  // Photos open full screen, the title over the photo.
  await page.locator(".gallery-image").first().click();
  const viewer = page.locator(".rental-lightbox");
  await expect(viewer.getByRole("heading")).toBeVisible();
  const box = (await viewer.boundingBox())!;
  expect(box.width).toBe(page.viewportSize()!.width);
  await viewer.getByRole("button", { name: "Ảnh sau" }).click();
  await expect(viewer.locator(".rental-lightbox-count")).toContainText("2 /");
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
});

test("list view: photo on the left, facts on the right, one unit per row", async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/cho-thue?view=list");
    const cards = page.locator(".list-view article.property-card");
    await expect(cards.first()).toBeVisible();
    const [a, b] = [
      (await cards.nth(0).boundingBox())!,
      (await cards.nth(1).boundingBox())!,
    ];
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
    const photo = (await cards.first().locator(".image-wrap").boundingBox())!;
    const body = (await cards.first().locator(".property-body").boundingBox())!;
    expect(body.x).toBeGreaterThanOrEqual(photo.x + photo.width - 1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("hovering a card fades through the unit's other photos, on a mouse only", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  const card = page
    .locator("article.property-card")
    // A unit with more than one photo.
    .filter({ has: page.locator(".card-media-count", { hasText: /^[2-9]/ }) })
    .first();
  const photos = card.locator(".card-photos img");
  await expect(photos).toHaveCount(0);
  await card.hover();
  await expect(photos).not.toHaveCount(0);
  await expect(card.locator(".card-photos img[data-shown]")).toHaveCount(1, {
    timeout: 6000,
  });
  await page.mouse.move(0, 0);
  await expect(card.locator(".card-photos img[data-shown]")).toHaveCount(0);
});

test("the rental map lists buildings without filters and opens a building's units", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  const section = page.locator("#ban-do-can-thue");
  await section.scrollIntoViewIfNeeded();
  const buildings = section.locator(".rmap-towers button");
  await expect(buildings.first()).toBeVisible();
  await expect(section.locator(".rmap-filters")).toHaveCount(0);
  // Units appear only once a building is chosen.
  await expect(section.locator(".rmap-panel")).toHaveCount(0);
  const name = await buildings.first().textContent();
  await buildings.first().click();
  await expect(section.locator(".rmap-head h3")).toHaveText(name ?? "");
  await section.getByRole("button", { name: "Đóng" }).click();
  await expect(section.locator(".rmap-panel")).toHaveCount(0);
  // A building's own rental page has no city map.
  await page.goto("/cho-thue/du-an/monarchy-apartments");
  await expect(page.locator("#ban-do-can-thue")).toHaveCount(0);
});

test("the map's filter: rooms and monthly rent", () => {
  const unit = (bedrooms: number, rent: number) => ({ bedrooms, rent });
  const fits = (
    u: { bedrooms: number; rent: number },
    rooms = "",
    price = "",
  ) => unitFits(u, { rooms, price });
  expect(fits(unit(0, 8), "1")).toBe(true);
  expect(fits(unit(1, 8), "1", "0-10")).toBe(true);
  expect(fits(unit(2, 8), "1")).toBe(false);
  expect(fits(unit(4, 60), "3", "35-")).toBe(true);
  expect(fits(unit(2, 20), "", "10-20")).toBe(false);
  expect(fits(unit(2, 20), "", "20-35")).toBe(true);
  // A shop has no rooms; a unit on sale has no rent.
  expect(fits(unit(-1, 30), "2")).toBe(false);
  expect(fits(unit(2, 0), "", "0-10")).toBe(false);
  expect(fits(unit(-1, 0))).toBe(true);
});

test("the owner's consign button is a dialog button in the server's HTML", async ({
  request,
}) => {
  // Made in a Server Component: the attribute must not wait for the browser,
  // or the page hydrates with a mismatch (seen in development).
  const html = await (await request.get("/cho-thue")).text();
  expect(html).toMatch(
    /<button[^>]*aria-haspopup="dialog"[^>]*class="button button-primary"/,
  );
});

test("the whole-screen map filters towers by rooms and rent", async ({
  page,
}) => {
  await page.goto("/ban-do");
  await page.getByRole("button", { name: "Danh sách dự án" }).click();
  const rows = page.locator(".rmap-side .rmap-list button");
  const all = await rows.count();
  expect(all).toBeGreaterThan(0);
  const tools = page.locator(".rmap-filter-map");
  await tools.getByRole("button", { name: "Lọc căn" }).click();
  const panel = tools.getByRole("group", { name: "Lọc căn" });
  await panel.getByRole("button", { name: "2PN", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "2PN", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".rmap-side .rmap-list")).toContainText(
    /căn phù hợp|Không tìm thấy dự án phù hợp/,
  );
  const left = await rows.count();
  expect(left).toBeLessThanOrEqual(all);
  // Each tower left says how many of its units fit, as the panel adds up.
  for (let i = 0; i < left; i++)
    await expect(rows.nth(i).locator("small").last()).toHaveText(
      /^[1-9]\d* căn phù hợp$/,
    );
  await expect(panel.locator(".rmap-filter-result")).toHaveText(
    left ? new RegExp(`căn phù hợp ở ${left} tòa`) : /Chưa có căn phù hợp/,
  );
  // A second choice narrows further; the button shows what is chosen.
  await panel.getByRole("button", { name: "Dưới 10 triệu" }).click();
  expect(await rows.count()).toBeLessThanOrEqual(left);
  await expect(tools.locator(".rmap-filter-toggle")).toHaveText(
    "2PN · Dưới 10 triệu",
  );
  await panel.getByRole("button", { name: "Bỏ lọc" }).click();
  await expect(rows).toHaveCount(all);
  await panel.getByRole("button", { name: "Xem trên bản đồ" }).click();
  await expect(panel).toHaveCount(0);
  await expect(tools.locator(".rmap-filter-toggle")).toHaveText("Lọc căn");
});

test("the whole-screen map searches projects and shares what is open", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  const section = page.locator("#ban-do-can-thue");
  await section.scrollIntoViewIfNeeded();
  await section.getByRole("link", { name: "Phóng to" }).click();
  await expect(page).toHaveURL(/\/ban-do$/);
  // The list starts hidden so the city fills the screen; a button opens it.
  const side = page.locator(".rmap-side");
  await expect(side).toBeHidden();
  await page.getByRole("button", { name: "Danh sách dự án" }).click();
  await expect(side).toBeVisible();
  const rows = side.locator(".rmap-list button");
  const first = (await rows.first().locator("b").textContent()) ?? "";
  // Without accents and in lower case, the search still finds it.
  await side.getByRole("searchbox").fill(
    first
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
  );
  await expect(rows.first().locator("b")).toHaveText(first);
  await side.getByRole("searchbox").fill("khong co du an nay");
  await expect(rows).toHaveCount(0);
  await side.getByRole("searchbox").fill("");
  // The tools answer: the sun's hour.
  await page.getByRole("button", { name: "Nắng" }).click();
  await expect(page.locator(".rmap-sun input")).toBeVisible();
  // No ruler any more. The tour flies to the first tower and stays a while
  // there (it used to skip on at once), until pressed again.
  await expect(
    page.getByRole("button", { name: "Đo", exact: true }),
  ).toHaveCount(0);
  const tour = page.getByRole("button", { name: "Tham quan" });
  await tour.click();
  await expect(tour).toHaveAttribute("aria-pressed", "true");
  const shown = page.locator(".rmap-pin:not([hidden])");
  await expect(shown).toHaveCount(1);
  const firstStop = await shown.textContent();
  await page.waitForTimeout(2500);
  await expect(shown).toHaveText(firstStop ?? "");
  await tour.click();
  await expect(tour).toHaveAttribute("aria-pressed", "false");
  // The tour folds the list away; it opens again from its button.
  // A project in operation opens its card (one being built shows none).
  await page.getByRole("button", { name: "Danh sách dự án" }).click();
  await rows.filter({ hasText: "The Monarchy" }).click();
  await expect(page.locator(".rmap-head h3")).toHaveText("The Monarchy");
  await expect(page).toHaveURL(/du-an=/);
  // The address opens the same building again.
  await page.reload();
  await expect(page.locator(".rmap-head h3")).toHaveText("The Monarchy");
  // "Thoát" leaves the full-screen map.
  await page.getByRole("link", { name: "Thoát" }).click();
  await expect(page).not.toHaveURL(/\/ban-do/);
});

test("The Monarchy stands inside its four roads, with its real floors", () => {
  // Trần Hưng Đạo, An Trung 3, An Trung 2, Trần Quang Diệu.
  const plot = [
    [-51, 93],
    [41, 105],
    [62, -32],
    [-29, -46],
  ];
  const inside = ([x, y]: number[]) =>
    plot.every(([ax, ay], i) => {
      const [bx, by] = plot[(i + 1) % plot.length];
      return (bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0;
    });
  const blocks = BUILDING_BLOCKS["monarchy-apartments"];
  for (const b of blocks)
    for (const [x, y] of b.outline ?? [])
      expect(inside([b.east + x, b.north + y])).toBe(true);
  expect(
    blocks
      .filter((b) => b.tower)
      .map((b) => [b.tower, Math.round(b.height / FLOOR_METRES)]),
  ).toEqual([
    // A: a one-floor podium of shops under the 17-floor octagon.
    ["Monarchy A", 1],
    ["Monarchy A", 17],
    // One tower B, in two parts: 33 floors (B1,2) and 27 (B3).
    ["Monarchy B", 33],
    ["Monarchy B", 27],
  ]);
});

test("Sun Ponte stands east of Trần Hưng Đạo, the Rio west of it, off the road", () => {
  // The road, in metres from the pin, from OpenStreetMap; x at a given y.
  const road = [
    [-2, -78],
    [-4, -58],
    [-16, 45],
    [-17, 62],
  ];
  const roadX = (y: number) => {
    const i = Math.max(0, road.findIndex(([, q]) => q >= y) - 1);
    const [ax, ay] = road[i];
    const [bx, by] = road[i + 1];
    return ax + ((bx - ax) * (y - ay)) / (by - ay);
  };
  const LAT = 16.058169;
  const LNG = 108.230759;
  const metres = ([lng, lat]: number[]) => [
    (lng - LNG) * 110_574 * Math.cos((LAT * Math.PI) / 180),
    (lat - LAT) * 110_574,
  ];
  const blocks = BUILDING_BLOCKS["sun-ponte-residence"];
  expect(blocks.filter((b) => b.tower === "Rio")).toHaveLength(3);
  for (const block of blocks) {
    const away = blockRing(LAT, LNG, block).map((c) => {
      const [x, y] = metres(c);
      return x - roadX(y);
    });
    if (block.tower === "Rio") expect(Math.max(...away)).toBeLessThan(-8);
    else expect(Math.min(...away)).toBeGreaterThan(8);
  }
});

test("Sun Panoma: P1 by Ngũ Hành Sơn, P2 by the bridge, nothing on the main roads", () => {
  // Centre lines from OpenStreetMap, metres from the pin.
  const roads = [
    [
      [-344, -169],
      [-265, -157],
      [-229, -147],
      [-195, -131],
      [-162, -110],
      [-115, -68],
      [-61, 7],
      [-11, 80],
      [1, 93],
    ],
    [
      [-342, -187],
      [-263, -175],
      [-224, -163],
      [-177, -141],
      [-123, -104],
      [-93, -70],
      [-67, -38],
      [-53, -22],
      [-25, 26],
      [-3, 58],
      [9, 71],
    ],
    [
      [43, -26],
      [58, -5],
      [47, 32],
      [28, 92],
    ],
  ];
  const toSegment = (p: number[], a: number[], b: number[]) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const u = Math.max(
      0,
      Math.min(
        1,
        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy),
      ),
    );
    return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
  };
  const blocks = BUILDING_BLOCKS["sun-panoma"];
  const LAT = 16.052409;
  const LNG = 108.236731;
  for (const b of blocks) {
    const turn = (b.angle * Math.PI) / 180;
    const corners = b.outline
      ? b.outline.map(([x, y]) => [b.east + x, b.north + y])
      : blockRing(LAT, LNG, b).map(([lng, lat]) => [
          (lng - LNG) * 110_574 * Math.cos((LAT * Math.PI) / 180),
          (lat - LAT) * 110_574,
        ]);
    expect(turn).not.toBeNaN();
    for (const p of corners)
      for (const road of roads)
        for (let i = 0; i + 1 < road.length; i++)
          expect(toSegment(p, road[i], road[i + 1])).toBeGreaterThan(8);
  }
  // Townhouses are cut into houses, none on the road either.
  const lots = BUILDING_ROWS["sun-panoma"].flatMap(rowLots);
  expect(lots.length).toBeGreaterThan(40);
  for (const lot of lots)
    for (const p of lot)
      for (const road of roads)
        for (let i = 0; i + 1 < road.length; i++)
          expect(toSegment(p, road[i], road[i + 1])).toBeGreaterThan(4);
  // No solid slab of townhouses any more.
  expect(blocks.filter((b) => b.low)).toHaveLength(0);
  const p1 = blocks.filter((b) => b.tower === "Panoma 1");
  expect(p1.map((b) => Math.round(b.height / FLOOR_METRES))).toEqual([
    33, 26, 18,
  ]);
  const p2 = blocks.find((b) => b.tower === "Panoma 2");
  expect(Math.round((p2?.height ?? 0) / FLOOR_METRES)).toBe(27);
});

test("Sun Cosmo's houses: every lot of the master plan, by block, kind and size", () => {
  const lots = lotFeatures("sun-panoma", 16.052409, 108.236731).map(
    (f) => f.properties,
  );
  const count = (key: (l: (typeof lots)[number]) => string) =>
    lots.reduce<Record<string, number>>((n, l) => {
      n[key(l)] = (n[key(l)] ?? 0) + 1;
      return n;
    }, {});
  expect(count((l) => l.code.split(" · ")[0])).toEqual({
    "B2-3": 16,
    "B2-5": 21,
    "B2-6": 4,
    "B2-7": 35,
    "B2-8": 25,
    "B3-10": 9,
    "B3-12": 12,
    "B3-13": 19,
    "B3-14": 5,
  });
  expect(count((l) => l.kind)).toEqual({
    "Nhà phố": 101,
    "Biệt thự song lập": 30,
    "Biệt thự đơn lập": 6,
    "Biệt thự song lập đặc biệt": 9,
  });
  const lot = (code: string) => lots.find((l) => l.code === code);
  expect(lot("B2-7 · 35")).toMatchObject({ area: 114, kind: "Nhà phố" });
  expect(lot("B3-13 · 06")).toMatchObject({
    area: 455,
    kind: "Biệt thự đơn lập",
  });
  expect(lot("B3-12 · 02")?.kind).toBe("Biệt thự song lập đặc biệt");
  expect(lot("B3-10 · 12")?.area).toBe(381);
  // Floors and model plans as the developer's drawings give them.
  expect(lot("B2-3 · 05")?.floors).toBe(7);
  expect(lot("B3-12 · 02")?.floors).toBe(3);
  expect(lotPlan("sun-panoma", "Nhà phố", 100, 4)?.image).toMatch(
    /nha-pho-20-tang-4-5\.webp$/,
  );
  expect(lotPlan("sun-panoma", "Nhà phố", 140, 7)?.model).toBe("5 × 28 m");
  expect(lotPlan("sun-panoma", "Biệt thự đơn lập", 455, 4)).toBeNull();
  expect(lotPlan("sun-symphony-residence", "Nhà phố", 100, 1)).toBeNull();
  for (const l of lots)
    for (let n = 1; n <= l.floors; n++) {
      const plan = lotPlan("sun-panoma", l.kind, l.area, n);
      expect(plan, `${l.code} floor ${n}`).not.toBeNull();
      expect(existsSync(`public${plan?.image}`)).toBe(true);
    }
  // Each drawn near its printed size (the plan is a picture, not to scale:
  // its triangle B3-13 · 06 comes out smallest), and none on another.
  const rings = BUILDING_ROWS["sun-panoma"].flatMap(rowLots);
  const area = (r: number[][]) =>
    Math.abs(
      r.reduce((n, p, i) => {
        const q = r[(i + 1) % r.length];
        return n + p[0] * q[1] - q[0] * p[1];
      }, 0) / 2,
    );
  const inside = ([x, y]: number[], r: number[][]) =>
    r.reduce((odd, p, i) => {
      const q = r[(i + r.length - 1) % r.length];
      return p[1] > y !== q[1] > y &&
        x < ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]) + p[0]
        ? !odd
        : odd;
    }, false);
  rings.forEach((r, i) => {
    expect(area(r) / lots[i].area).toBeGreaterThan(0.5);
    expect(area(r) / lots[i].area).toBeLessThan(1.6);
    const middle = [0, 1].map(
      (k) => r.reduce((n, p) => n + p[k], 0) / r.length,
    );
    rings.forEach((other, j) => {
      if (j !== i) expect(inside(middle, other)).toBe(false);
    });
  });
});

test("Sun Panoma's floor plans: every unit, laid on its own tower", () => {
  // The affine map of a drawing onto the site, from its three anchors.
  const onSite = (file: string) => {
    const { image, site } = PLAN_ANCHORS[file];
    const [[x0, y0], [x1, y1], [x2, y2]] = image;
    const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    return ([x, y]: number[]) => {
      const u = ((x - x0) * (y2 - y0) - (x2 - x0) * (y - y0)) / det;
      const v = ((x1 - x0) * (y - y0) - (x - x0) * (y1 - y0)) / det;
      return [0, 1].map(
        (k) =>
          site[0][k] +
          u * (site[1][k] - site[0][k]) +
          v * (site[2][k] - site[0][k]),
      );
    };
  };
  const inside = ([x, y]: number[], ring: number[][]) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[i];
      const [bx, by] = ring[j];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
        hit = !hit;
    }
    return hit;
  };
  const near = (p: number[], ring: number[][], metres: number) =>
    inside(p, ring) ||
    ring.some(([ax, ay], i) => {
      const [bx, by] = ring[(i + 1) % ring.length];
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) /
            ((bx - ax) ** 2 + (by - ay) ** 2),
        ),
      );
      return (
        Math.hypot(ax + t * (bx - ax) - p[0], ay + t * (by - ay) - p[1]) <
        metres
      );
    });
  const towers = (name: string) =>
    BUILDING_BLOCKS["sun-panoma"]
      .filter((b) => b.tower === name)
      .map((b) => (b.outline ?? []).map(([x, y]) => [b.east + x, b.north + y]));
  const counts: Record<string, [string, number]> = {
    "p1-tang-1.webp": ["Panoma 1", 16],
    "p1-tang-4-17.webp": ["Panoma 1", 18],
    "p1-tang-19-25.webp": ["Panoma 1", 13],
    "p1-tang-20-26.webp": ["Panoma 1", 13],
    "p1-tang-27.webp": ["Panoma 1", 6],
    "p1-tang-28-32.webp": ["Panoma 1", 6],
    "p1-tang-29-33.webp": ["Panoma 1", 6],
    "p2-tang-1.webp": ["Panoma 2", 13],
    "p2-tang-dien-hinh.webp": ["Panoma 2", 12],
  };
  for (const [file, [tower, count]] of Object.entries(counts)) {
    const units = Object.values(PLAN_OUTLINES[file].units);
    expect(units, file).toHaveLength(count);
    const map = onSite(file);
    const rings = towers(tower);
    // Each corner of each unit on its tower (the ground floor's shops reach a
    // few metres past the tower above them).
    for (const unit of units)
      for (const p of unit.points)
        expect(
          rings.some((ring) =>
            near(map(p), ring, file.endsWith("-1.webp") ? 9 : 4),
          ),
          `${file} ${p}`,
        ).toBe(true);
  }
});

test("Sun Ponte's floor plans: every unit on T1, T2 or the floors joining them", () => {
  const onSite = (file: string) => {
    const { image, site } = PLAN_ANCHORS[file];
    const [[x0, y0], [x1, y1], [x2, y2]] = image;
    const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    return ([x, y]: number[]) => {
      const u = ((x - x0) * (y2 - y0) - (x2 - x0) * (y - y0)) / det;
      const v = ((x1 - x0) * (y - y0) - (x - x0) * (y1 - y0)) / det;
      return [0, 1].map(
        (k) =>
          site[0][k] +
          u * (site[1][k] - site[0][k]) +
          v * (site[2][k] - site[0][k]),
      );
    };
  };
  const LAT = 16.058169;
  const LNG = 108.230759;
  const ring = (b: (typeof BUILDING_BLOCKS)[string][number]) =>
    blockRing(LAT, LNG, b)
      .slice(0, 4)
      .map(([lng, lat]) => [
        (lng - LNG) * 110_574 * Math.cos((LAT * Math.PI) / 180),
        (lat - LAT) * 110_574,
      ]);
  const blocks = BUILDING_BLOCKS["sun-ponte-residence"];
  const bridge = ring(blocks.find((b) => b.bare)!);
  const towerRing = (name: string) =>
    ring(blocks.find((b) => b.tower === name)!);
  const toEdge = (p: number[], r: number[][]) => {
    const inside =
      r.every(([ax, ay], i) => {
        const [bx, by] = r[(i + 1) % r.length];
        return (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax) <= 0;
      }) ||
      r.every(([ax, ay], i) => {
        const [bx, by] = r[(i + 1) % r.length];
        return (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax) >= 0;
      });
    if (inside) return 0;
    return Math.min(
      ...r.map(([ax, ay], i) => {
        const [bx, by] = r[(i + 1) % r.length];
        const t = Math.max(
          0,
          Math.min(
            1,
            ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) /
              ((bx - ax) ** 2 + (by - ay) ** 2),
          ),
        );
        return Math.hypot(ax + t * (bx - ax) - p[0], ay + t * (by - ay) - p[1]);
      }),
    );
  };
  const counts: Record<string, [string, number]> = {
    "ponte-t1-tang-3a-18.webp": ["T1", 12],
    "ponte-t2-tang-3a-18.webp": ["T2", 11],
    "ponte-t1-tang-19-21-23.webp": ["T1", 12],
    "ponte-t2-tang-19-21-23.webp": ["T2", 13],
    "ponte-t1-tang-20-22-24.webp": ["T1", 12],
    "ponte-t2-tang-20-22-24.webp": ["T2", 13],
  };
  for (const [file, [tower, count]] of Object.entries(counts)) {
    const units = PLAN_OUTLINES[file].units;
    expect(Object.keys(units), file).toHaveLength(count);
    const map = onSite(file);
    const own = towerRing(tower);
    for (const [n, unit] of Object.entries(units)) {
      expect(unit.inner, `${file} ${n}`).toBeGreaterThan(20);
      // On 3A–18 the towers stand apart; above, the middle units join them.
      for (const p of unit.points)
        expect(
          Math.min(
            toEdge(map(p), own),
            file.includes("3a-18") ? Infinity : toEdge(map(p), bridge),
          ),
          `${file} ${n} ${p}`,
        ).toBeLessThan(4);
    }
  }
  // The podium's shophouses: 26 on floor 1, 24 on floor 2 (the nursery takes
  // the middle), all on the podium.
  const podium = ring(blocks.find((b) => !b.tower && !b.bare)!);
  for (const [file, count] of [
    ["ponte-khoi-de-tang-1.webp", 26],
    ["ponte-khoi-de-tang-2.webp", 24],
  ] as const) {
    const units = PLAN_OUTLINES[file].units;
    expect(Object.keys(units), file).toHaveLength(count);
    const map = onSite(file);
    for (const [n, unit] of Object.entries(units)) {
      expect(unit.inner, `${file} ${n}`).toBeGreaterThan(30);
      for (const p of unit.points)
        expect(toEdge(map(p), podium), `${file} ${n} ${p}`).toBeLessThan(3);
    }
  }
});

test("Capital Square stands inside its roads, each tower with its floors", () => {
  // Centre lines from OpenStreetMap, metres from the pin.
  const roads = [
    [
      [-156, -158],
      [-161, -13],
      [-161, 132],
      [-158, 213],
    ],
    [
      [194, -240],
      [127, -214],
      [28, -183],
      [-50, -160],
      [-156, -158],
    ],
    [
      [56, 153],
      [176, -159],
      [198, -230],
    ],
  ];
  const toSegment = (p: number[], a: number[], b: number[]) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const u = Math.max(
      0,
      Math.min(
        1,
        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy),
      ),
    );
    return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
  };
  const LAT = 16.07008;
  const LNG = 108.23038;
  const blocks = BUILDING_BLOCKS["capital-square"];
  for (const b of blocks)
    for (const [lng, lat] of blockRing(LAT, LNG, b)) {
      const p = [
        (lng - LNG) * 110_574 * Math.cos((LAT * Math.PI) / 180),
        (lat - LAT) * 110_574,
      ];
      for (const road of roads)
        for (let i = 0; i + 1 < road.length; i++)
          expect(toSegment(p, road[i], road[i + 1])).toBeGreaterThan(8);
    }
  const floors = Object.fromEntries(
    blocks.map((b) => [b.tower, Math.round(b.height / FLOOR_METRES)]),
  );
  expect(floors).toMatchObject({
    C4: 27,
    C6: 27,
    C7: 27,
    S4: 24,
    S3: 24,
    C3: 23,
    C1: 25,
  });
  expect(blocks.filter((b) => b.tower)).toHaveLength(14);
  // Only the seven towers on sale are solid; the rest are "coming soon".
  expect(blocks.filter((b) => b.tower && !b.soon).map((b) => b.tower)).toEqual([
    "C4",
    "C6",
    "C7",
    "S4",
    "S3",
    "C3",
    "C1",
  ]);
});

test("Sun Symphony: five towers with their floors, all west of Trần Hưng Đạo", () => {
  const blocks = BUILDING_BLOCKS["sun-symphony-residence"];
  expect(
    Object.fromEntries(
      blocks.map((b) => [b.tower, Math.round(b.height / FLOOR_METRES)]),
    ),
  ).toEqual({ S1: 30, S2A: 24, S2B: 16, S3A: 30, S3B: 22 });
  // The road runs at x = 57 from the pin.
  for (const b of blocks)
    for (const [x] of b.outline ?? []) expect(b.east + x).toBeLessThan(49);
  const rows = BUILDING_ROWS["sun-symphony-residence"];
  // The rows along the road; the last one follows Lê Văn Duyệt, inland.
  for (const row of rows.slice(0, -1))
    for (const lot of rowLots(row))
      for (const [x] of lot) expect(x).toBeLessThan(49);
  // As many lots as the plan has numbers, each with its printed area.
  expect(rows[2].lots).toHaveLength(43);
  expect(rows[3].lots).toHaveLength(43);
  expect(rows[2].lots?.[0]).toEqual(["23", 172.69]);
  expect(rows[8].lots?.[0]).toEqual(["02", 473.59]);
  const count = rows.reduce((n, r) => n + (r.lots?.length ?? 0), 0);
  expect(count).toBeGreaterThan(150);
});

/** Capital Square with the plans of two towers (they ship with the site). */
async function seedFloorPlans() {
  const dir = "/images/projects/capital-square";
  const plans = [
    {
      name: "Tòa C4 · Tầng 5-10",
      tower: "C4",
      image: `${dir}/mat-bang-c4-tang-5-10.webp`,
    },
    {
      name: "Tòa C4 · Tầng 11-12, 14-27",
      tower: "C4",
      image: `${dir}/mat-bang-c4-tang-11-27.webp`,
    },
    {
      name: "Tòa C7 · Tầng 5-10",
      tower: "C7",
      image: `${dir}/mat-bang-c7-tang-5-10.webp`,
    },
  ];
  const { Client } = createRequire(`${BE_DIR}/package.json`)("pg");
  const db = new Client({ connectionString: E2E_DATABASE_URL });
  await db.connect();
  for (const plan of plans)
    await db.query(
      `INSERT INTO media_assets (id, storage, key, url, mime_type, size_bytes, updated_at)
       VALUES (gen_random_uuid(), 'EXTERNAL', $1, $1, 'image/webp', 1, now())
       ON CONFLICT DO NOTHING`,
      [plan.image],
    );
  await db.end();
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; slug: string }[];
  };
  const project = projects.data.find((p) => p.slug === "capital-square")!;
  const saved = await api.send("patch", `/admin/projects/${project.id}`, {
    towers: [
      { name: "C4", status: "Đang mở bán" },
      { name: "C7", status: "Đang mở bán" },
    ],
    floorPlans: plans,
  });
  expect(saved.ok(), await saved.text()).toBeTruthy();
}

for (const [name, width] of [
  ["computer", 1440],
  ["phone", 390],
] as const)
  test(`3D floor plan: tower, floor and unit, on a ${name}`, async ({
    page,
  }) => {
    await seedFloorPlans();
    await page.setViewportSize({ width, height: 844 });
    const plan = page.getByRole("region", { name: "Mặt bằng 3D" });
    await expect
      .poll(
        async () => {
          await page.goto("/ban-do?du-an=capital-square&toa=C4&tang=10");
          // The viewer loads after the page.
          await plan.waitFor({ timeout: 5_000 }).catch(() => {});
          return plan.count();
        },
        { timeout: 60_000 },
      )
      .toBe(1);
    await expect(plan.locator("canvas")).toBeVisible();
    const floor = plan.getByRole("combobox", { name: "Tầng" });
    await expect(floor).toHaveValue("10");
    // Tầng 13 does not exist in this tower.
    await expect(floor.locator("option", { hasText: /^13$/ })).toHaveCount(0);
    await plan.getByRole("button", { name: "Tầm nhìn từ tầng 10" }).click();
    await expect(page.locator(".rmap-view")).toBeVisible();
    await page.getByRole("button", { name: "Quay lại mặt bằng" }).click();
    await expect(floor).toHaveValue("10");
    await plan.getByRole("combobox", { name: "Căn" }).selectOption("01");
    await expect(plan.locator(".fp3d-info h3")).toHaveText("C4-1001");
    await expect(plan.locator(".fp3d-info")).toContainText("77,69");
    // Capital Square's units open the model apartment in 360°.
    await plan.getByRole("button", { name: "Xem 360° căn mẫu" }).click();
    const tour = page.getByRole("dialog", { name: "Căn mẫu 360°" });
    await expect(tour).toBeVisible();
    await tour.getByRole("button", { name: "Đóng", exact: true }).click();
    await expect(tour).toHaveCount(0);
    await expect(page).toHaveURL(/toa=C4&tang=10&can=01/);
    // Another floor uses another drawing: the choice of unit starts over.
    await floor.selectOption("11");
    await expect(plan.locator(".fp3d-info")).toHaveCount(0);
    await plan.getByRole("button", { name: "C7", exact: true }).click();
    await expect(
      plan.getByRole("button", { name: "C7", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(floor).toHaveValue("5");
    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(sideways).toBeLessThanOrEqual(0);
    await plan.getByRole("button", { name: "Đóng mặt bằng 3D" }).click();
    await expect(plan).toHaveCount(0);
  });

test("a tower on the map lists its units to rent and to buy, hottest first", async ({
  page,
}) => {
  await page.goto("/ban-do?du-an=sun-ponte-residence");
  await page
    .locator(".rmap-plan-towers")
    .getByRole("button", { name: "T1", exact: true })
    .click({ timeout: 30_000 });
  const split = page.locator(".rmap-panel .rmap-split");
  await expect(split).toBeVisible();
  await expect(split.locator("h4")).toHaveText([/^Cho thuê/, /^Bán/]);
});

test("model units stay off the sale search: only their project page shows them", () => {
  const base = {
    id: "1",
    slug: "a",
    name: "A",
    projectId: "p",
    projectSlug: "capital-square",
    location: "Đà Nẵng",
    type: "Căn hộ",
    price: 0,
    area: 70,
    bedrooms: 2,
    bathrooms: 2,
    floor: 10,
    furniture: "",
    status: "Còn trống",
    image: "",
    description: "",
    updatedAt: "2026-01-01",
    forRent: false,
    forSale: true,
    saleVnd: 3e9,
  } as unknown as Property;
  const model = { ...base, id: "2", slug: "b", floorNote: "Căn mẫu" };
  const found = searchUnits([base, model], { "nhu-cau": "mua" });
  expect(found.map((p) => p.slug)).toEqual(["a"]);
});

test("project pages have no payment and loan block", async ({ page }) => {
  await page.goto("/du-an/capital-square");
  await expect(page.locator("#vi-tri")).toBeAttached();
  await expect(page.locator("#thanh-toan")).toHaveCount(0);
  await expect(page.locator('a[href="#thanh-toan"]')).toHaveCount(0);
});

test("the rentals page's heading says what its title says", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Cho thuê căn hộ tại Đà Nẵng",
  );
  await page.goto("/cho-thue?nhu-cau=mua");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Mua bán căn hộ tại Đà Nẵng",
  );
});

test("a typed SEO title never ends with the brand twice", async () => {
  const { pageTitle } = await import("../src/i18n/metadata");
  expect(pageTitle("Bán căn 2PN tầng 4 | Đất Vàng")).toBe("Bán căn 2PN tầng 4");
  expect(pageTitle("Căn 2PN view biển - đất vàng")).toBe("Căn 2PN view biển");
  expect(pageTitle("Căn 2PN | Đất Vàng Group")).toEqual({
    absolute: "Căn 2PN | Đất Vàng Group",
  });
  expect(pageTitle("Căn 2PN view sông")).toBe("Căn 2PN view sông");
});
