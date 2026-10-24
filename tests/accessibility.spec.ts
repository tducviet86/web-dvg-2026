import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./helpers";
test("WCAG AA checks on representative pages", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  for (const route of ["/", "/cho-thue", "/lien-he", "/admin"]) {
    await page.goto(route);
    if (route === "/admin")
      await expect(
        page.getByRole("heading", { name: "Tổng quan quản trị" }),
      ).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
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
test("mobile pages and keyboard dialog focus", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of [
    "/du-an",
    "/cho-thue",
    "/cho-thue/can-ho-sun-panoma-demo-02",
    "/blog/kinh-nghiem-thue-can-ho-da-nang",
    "/lien-he",
    "/admin",
  ]) {
    await page.goto(route);
    if (route === "/admin")
      await expect(
        page.getByRole("heading", { name: "Tổng quan quản trị" }),
      ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBeTruthy();
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Mở menu" }).click();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.contains(document.activeElement)),
    ).toBeTruthy();
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Mở menu" })).toBeFocused();
});
