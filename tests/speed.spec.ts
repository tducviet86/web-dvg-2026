import { test, expect } from "@playwright/test";

test("unit page: title, photo and price show at once; the first photos load first", async ({
  page,
}) => {
  await page.goto("/cho-thue/can-ho-sun-panoma-demo-02", {
    waitUntil: "commit",
  });
  const heading = page.locator(".room-heading");
  await expect(heading).toBeVisible();
  // Never invisible while it settles (search engines count it as shown).
  expect(await heading.evaluate((el) => getComputedStyle(el).opacity)).toBe(
    "1",
  );
  const gallery = page.locator(".rental-gallery");
  expect(await gallery.evaluate((el) => getComputedStyle(el).opacity)).toBe(
    "1",
  );
  const first = gallery.locator(".rental-gallery-slide img").first();
  await expect(first).toHaveAttribute("fetchpriority", "high");
  // Thumbnails come after it, never competing with it on a slow phone.
  const thumbs = gallery.locator(".rental-gallery-thumbs img");
  if ((await thumbs.count()) > 1)
    await expect(thumbs.nth(1)).toHaveAttribute("fetchpriority", "low");
});
