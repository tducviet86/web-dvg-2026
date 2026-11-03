import { test, expect } from "@playwright/test";

test("navigation provides pending feedback, preserves document and supports back", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/gioi-thieu?*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.dataset.navigationProbe = "retained";
  });
  await page
    .locator(".site-footer")
    .getByRole("link", { name: "Về Đất Vàng", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Đang chuyển trang…");
  // The current page stays in place, dimmed, under a spinning ring.
  const spinner = page.locator(".navigation-spinner");
  await expect(spinner).toBeVisible();
  await expect(spinner.locator(".navigation-spinner-ring")).toHaveCSS(
    "animation-name",
    "nav-spin",
  );
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  release();
  await expect(page).toHaveURL(/\/gioi-thieu$/);
  await expect(page.locator(".navigation-shell")).toHaveAttribute(
    "data-navigating",
    "false",
  );
  await expect(spinner).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute(
    "data-navigation-probe",
    "retained",
  );
  await expect(page.locator(".page-surface")).toHaveCSS(
    "animation-name",
    "page-arrive",
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Đất Vàng Group",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".page-surface")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("“Xem thêm căn hộ” and filter links keep the visitor where they are", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  const more = page.getByRole("link", { name: "Xem thêm căn hộ" });
  await more.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  expect(before).toBeGreaterThan(400);
  const cards = page.locator(".rental-card-grid .property-card");
  const shown = await cards.count();
  await more.click();
  await expect(page).toHaveURL(/limit=18/);
  await expect(cards).not.toHaveCount(shown);
  // Not sent back to the top of the page.
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(before - 200);
});
