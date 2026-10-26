import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { API_URL } from "../playwright.config";
import { apiAs } from "./helpers";
import { telephoneHref } from "../src/lib/company-contact";

test("project entry points separate introductions from operations", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Xem chi tiết Capital Square", exact: true })
    .click();
  await expect(page).toHaveURL(/\/du-an\/capital-square$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Capital Square",
  );
  await expect(page.locator("main .contact-form")).toHaveCount(0);
  await expect(page.locator("#tong-quan")).toContainText("bờ Đông sông Hàn");
  await expect(page.locator("#san-pham li")).toHaveCount(3);
  await page.goto("/du-an/van-hanh");
  await expect(page.locator(".home-project-cards article")).toHaveCount(5);
  const monarchy = page.getByRole("navigation", {
    name: /Dịch vụ tại .*Monarchy/,
  });
  await monarchy.getByRole("link", { name: "Cho thuê", exact: true }).click();
  await expect(page.locator(".property-card")).not.toHaveCount(0);
  await expect(page.locator(".property-card .card-meta").first()).toContainText(
    "Monarchy",
  );
  const room = page.locator(".property-card h3 a").first();
  await room.click();
  await expect(page.locator("main .contact-form")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Thông số & nội thất" }),
  ).toBeVisible();
  await expect(page.locator(".room-contact-panel")).toBeVisible();
  await page.getByRole("link", { name: /Bạn có căn hộ cần ký gửi/ }).click();
  await expect(page).toHaveURL(/nhu-cau=ky-gui/);
  await expect(page.locator(".consign-checklist")).toBeVisible();
  await expect(page.locator(".service-steps li")).toHaveCount(3);
  const hero = page.locator(".hero-search");
  await expect(hero.getByRole("tab", { name: "Ký gửi" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await hero.getByRole("tab", { name: "Mua" }).click();
  await hero.getByRole("button", { name: "Tìm căn bán" }).click();
  await expect(page).toHaveURL(/nhu-cau=mua/);
  await expect(page.locator(".inventory-empty")).toContainText(
    "Chưa có căn bán",
  );
  await expect(page.locator(".property-card")).toHaveCount(0);
  await expect(page.locator("main .contact-form")).toHaveCount(0);
});

test("all portfolio details resolve and room calls use a configured number only", async ({
  page,
  request,
}) => {
  const { data: projects } = (await (
    await request.get(`${API_URL}/api/v1/projects?pageSize=100`)
  ).json()) as { data: { slug: string; name: string }[] };
  expect(projects.length).toBeGreaterThanOrEqual(8);
  for (const project of projects) {
    const response = await page.goto(`/du-an/${project.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1")).toHaveText(project.name);
    await expect(page.locator("main .contact-form")).toHaveCount(0);
  }
  expect(telephoneHref("+84 901 234 567")).toBe("tel:+84901234567");
  expect(telephoneHref("")).toBeNull();
  expect(telephoneHref("javascript:alert(1)")).toBeNull();
  await page.goto("/cho-thue/can-ho-sun-panoma-demo-02");
  const phone = page.locator('.room-contact-panel a[href^="tel:"]');
  await expect(phone).toHaveAttribute("href", "tel:0911296979");
  await expect(phone).toContainText("0911 29 69 79");
  await page.setViewportSize({ width: 390, height: 844 });
  const gallery = await page.locator(".rental-gallery").boundingBox();
  const note = await page.locator(".room-image-note").boundingBox();
  expect(note!.y).toBeGreaterThanOrEqual(gallery!.y + gallery!.height);
  await expect(
    page.locator('.room-mobile-call a[href="tel:0911296979"]'),
  ).toBeVisible();
});

test("project and room layouts fit mobile with accessible content", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of [
    "/du-an",
    "/du-an/trien-khai",
    "/du-an/cora-tower",
    "/du-an/sun-ponte-residence?nhu-cau=thue",
    "/du-an/sam-tower?nhu-cau=ky-gui",
    "/cho-thue/can-ho-sun-panoma-demo-02",
  ]) {
    await page.goto(route);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBeTruthy();
    }
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      route,
    ).toEqual([]);
  }
});

test("project directories open on full-screen photos with their own shortcuts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Vận hành: the same search as "Cho thuê", results listed below.
  await page.goto("/du-an/van-hanh");
  await expect(page.locator("main h1")).toHaveText("Dự án đang vận hành");
  await expect(page.locator("main form")).toHaveCount(1);
  await expect(page.locator("#can-ho .property-card")).not.toHaveCount(0);
  const search = page.locator(".hero-search");
  await search.getByRole("tab", { name: "Mua" }).click();
  await search.getByRole("button", { name: "Tìm căn bán" }).click();
  await expect(page).toHaveURL(/\/du-an\/van-hanh\?nhu-cau=mua/);
  await expect(page.locator("#can-ho h2")).toHaveText("Căn hộ đang bán");
  // Triển khai: shortcuts to each project, no search.
  await page.goto("/du-an/trien-khai");
  await expect(page.locator("main form")).toHaveCount(0);
  const picks = page.getByRole("navigation", { name: "Chọn dự án" });
  await expect(picks.getByRole("link")).not.toHaveCount(0);
  await picks.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/du-an\/[a-z0-9-]+$/);
  // Tất cả: two entry cards.
  await page.goto("/du-an");
  const groups = page.getByRole("navigation", { name: "Nhóm dự án" });
  await groups.getByRole("link", { name: /Đang vận hành/ }).click();
  await expect(page).toHaveURL(/\/du-an\/van-hanh$/);
});

test("home: no search box, project rows open project pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("main form")).toHaveCount(0);
  await expect(
    page.locator("#du-an-trien-khai .showcase-card"),
  ).not.toHaveCount(0);
  await expect(page.locator("#du-an-van-hanh .showcase-card")).toHaveCount(5);
  await page.locator("#du-an-van-hanh .showcase-card a").first().click();
  await expect(page).toHaveURL(/\/du-an\/[a-z0-9-]+$/);
});

test("home features a few rental units under the operated projects", async ({
  page,
}) => {
  // Sample (demo) units never show here: publish a real one first.
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?pageSize=100",
  )) as unknown as { data: { projectId?: string; project?: { id: string } }[] };
  const projectId = units.data[0].projectId ?? units.data[0].project!.id;
  await api.send("post", "/admin/properties", {
    name: "Căn tiêu biểu trang chủ QA",
    projectId,
    propertyType: "2pn",
    location: "Đà Nẵng",
    areaM2: 72,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn hộ kiểm tra khối căn tiêu biểu trên trang chủ.",
    rentPriceVnd: "18000000",
    highlight: "hot",
    status: "PUBLISHED",
  });
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "Căn hộ cho thuê tiêu biểu",
  });
  await expect(section).toBeVisible();
  await expect(section).toContainText("Căn tiêu biểu trang chủ QA");
  // Between "Dự án đang triển khai" and "Dự án đang vận hành".
  await expect(
    page.locator("#du-an-trien-khai + #can-ho-tieu-bieu + #du-an-van-hanh"),
  ).toHaveCount(1);
  const tiles = section.locator(".rent-mini");
  expect(await tiles.count()).toBeGreaterThan(0);
  expect(await tiles.count()).toBeLessThanOrEqual(4);
  await expect(tiles.first()).toContainText(/\d{1,3}(\.\d{3})+ vnđ/);
  await section.getByRole("link", { name: "Xem tất cả căn cho thuê" }).click();
  await expect(page).toHaveURL(/\/cho-thue$/);
  await page.goBack();
  await page.locator("#can-ho-tieu-bieu .rent-mini a").first().click();
  await expect(page).toHaveURL(/\/cho-thue\/[^/]+$/);
});
