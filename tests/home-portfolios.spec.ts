import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { homeProjects } from "../src/data/home-projects";
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
  await page
    .getByRole("navigation", { name: "Nhu cầu tại dự án" })
    .getByRole("link", { name: "Mua bán", exact: true })
    .click();
  await expect(page.locator(".inventory-empty")).toContainText(
    "Chưa có căn bán",
  );
  await expect(page.locator(".property-card")).toHaveCount(0);
  await expect(page.locator("main .contact-form")).toHaveCount(0);
});

test("all portfolio details resolve and room calls use a configured number only", async ({
  page,
}) => {
  for (const project of homeProjects) {
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
