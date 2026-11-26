import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("rental cards tell free and taken units apart, prices in gold, on every card", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  const free = page.locator("article.property-card .image-badge.available");
  await expect(free.first()).toHaveCSS("background-color", "rgb(23, 131, 79)");
  // Free is bright green, never the dark green of the HOT / HIẾM CÓ badges.
  const price = page.locator("article.property-card .property-bottom strong");
  await expect(price.first()).toHaveCSS("color", "rgb(240, 207, 122)");

  // The unit page shows its rent in gold too, on a computer and on a phone.
  // A sample unit: its page suggests the other samples (a real unit's page
  // suggests real units only, and tests may leave just one).
  await page
    .locator("article.property-card", { hasText: "CĂN MẪU" })
    .locator("h3 a")
    .first()
    .click();
  await expect(page.locator(".room-page .room-price")).toHaveCSS(
    "color",
    "rgb(138, 106, 31)",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.locator(".room-mobile-call > div:first-child strong"),
  ).toHaveCSS("color", "rgb(138, 106, 31)");
  await page.setViewportSize({ width: 1440, height: 1000 });
  // The small cards (similar units on a unit page) use the same colours.
  const mini = page.locator(".rent-mini").first();
  await mini.scrollIntoViewIfNeeded();
  await expect(page.locator(".rent-mini-status.is-free").first()).toHaveCSS(
    "background-color",
    "rgb(23, 131, 79)",
  );
  await expect(page.locator(".rent-mini-price b").first()).toHaveCSS(
    "color",
    "rgb(240, 207, 122)",
  );

  await page.goto(`/cho-thue?status=${encodeURIComponent("Đã cho thuê")}`);
  const taken = page.locator("article.property-card").first();
  await expect(taken.locator(".image-badge")).toHaveText("Đã cho thuê");
  await expect(taken.locator(".image-badge")).toHaveClass(/rented/);
  await expect(taken.locator(".image-wrap > a img")).toHaveCSS(
    "filter",
    /grayscale\(1\)/,
  );
});

test("admin fields are 16px on a phone, so iPhone does not zoom and slide", async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/admin/properties", "/admin/properties/new"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.locator(".admin-shell input:visible").first(),
    ).toBeVisible();
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll("input, select, textarea")]
        .filter(
          (e) =>
            (e as HTMLElement).offsetParent &&
            !["checkbox", "radio", "range", "file"].includes(
              (e as HTMLInputElement).type,
            ),
        )
        .map((e) => parseFloat(getComputedStyle(e).fontSize)),
    );
    expect(sizes.length, path).toBeGreaterThan(0);
    expect(Math.min(...sizes), path).toBeGreaterThanOrEqual(16);
  }
});
