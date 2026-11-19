import { test, expect } from "@playwright/test";

test("saved units: the heart saves a unit, /da-luu lists it, the heart removes it", async ({
  page,
}) => {
  await page.goto("/da-luu");
  await expect(page.locator("main h1")).toHaveText("Căn hộ đã lưu");
  await expect(page.locator(".saved-empty")).toContainText(
    "Bạn chưa lưu căn hộ nào.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  // Nothing saved yet: no heart in the header.
  await expect(page.locator(".header-saved")).toHaveCount(0);

  await page.goto("/cho-thue");
  const card = page.locator(".property-card").first();
  const name = (await card.locator("h3").textContent())?.trim() ?? "";
  await card.getByRole("button", { name: "Lưu căn hộ yêu thích" }).click();
  await expect(page.locator(".header-saved")).toHaveAttribute(
    "aria-label",
    "Căn đã lưu (1)",
  );
  // The toast leads to the saved list.
  await page.getByRole("button", { name: "Xem căn đã lưu" }).click();
  await expect(page).toHaveURL(/\/da-luu$/);
  const saved = page.locator(".saved-page .property-card");
  await expect(saved).toHaveCount(1);
  await expect(saved.locator("h3")).toHaveText(name);

  await saved.getByRole("button", { name: "Bỏ yêu thích" }).click();
  await expect(page.locator(".saved-empty")).toBeVisible();
  await expect(page.locator(".header-saved")).toHaveCount(0);
});

test("units saved before the list page existed still show on /da-luu", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  const card = page.locator(".property-card").first();
  const name = (await card.locator("h3").textContent())?.trim() ?? "";
  await card.getByRole("button", { name: "Lưu căn hộ yêu thích" }).click();
  // An older visit: the browser list only, no cookie.
  await page.context().clearCookies({ name: "dvg_saved" });
  await page.goto("/da-luu");
  await expect(page.locator(".saved-page .property-card h3")).toHaveText(name);
});

test("/da-luu fits a phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/cho-thue");
  await page
    .locator(".property-card")
    .first()
    .getByRole("button", { name: "Lưu căn hộ yêu thích" })
    .click();
  await expect(page.locator(".header-saved")).toBeVisible();
  await page.goto("/da-luu");
  await expect(page.locator(".saved-page .property-card")).toHaveCount(1);
  const width = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(width).toBeLessThanOrEqual(0);
});
