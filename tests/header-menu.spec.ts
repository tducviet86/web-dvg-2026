import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("header opens on hover, closes on leave, and parent links navigate", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  const nav = page.getByRole("navigation", {
    name: "Điều hướng chính",
    exact: true,
  });
  const projects = nav.getByRole("link", { name: "Dự án", exact: true });
  const about = nav.getByRole("link", { name: "Giới thiệu", exact: true });
  const operation = nav.getByRole("link", {
    name: "Dự án đang vận hành",
    exact: true,
  });
  await projects.hover();
  await expect(projects).toHaveAttribute("aria-expanded", "true");
  await operation.hover();
  await expect(operation).toBeVisible();
  await expect(projects).toHaveAttribute("aria-expanded", "true");
  await page.mouse.move(20, 500);
  await expect(projects).toHaveAttribute("aria-expanded", "false");
  await expect(operation).toBeHidden();
  await projects.hover();
  await about.hover();
  await expect(projects).toHaveAttribute("aria-expanded", "false");
  await expect(about).toHaveAttribute("aria-expanded", "true");
  await projects.click();
  await expect(page).toHaveURL(/\/du-an$/);
  await expect(projects).toHaveAttribute("aria-expanded", "false");
  await page.mouse.move(20, 500);
  await projects.hover();
  await operation.click();
  await expect(page).toHaveURL(/\/du-an\/van-hanh$/);
  await expect(projects).toHaveAttribute("aria-expanded", "false");
  await page.mouse.move(20, 500);
  await projects.hover();
  await nav
    .getByRole("link", { name: "Dự án đang vận hành", exact: true })
    .click();
  await expect(projects).toHaveAttribute("aria-expanded", "false");
  await page.mouse.move(20, 500);
  await projects.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    nav.getByRole("link", { name: "Tất cả dự án", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(projects).toHaveAttribute("aria-expanded", "false");
  await expect(projects).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const audit = await new AxeBuilder({ page })
    .include(".site-header")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await nav.getByRole("link", { name: "Tin tức", exact: true }).focus();
  await expect(projects).toHaveAttribute("aria-expanded", "false");
});

test("mobile drawer still closes after selecting a destination", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cho-thue");
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  const drawer = page.getByRole("dialog");
  await drawer.locator("summary").filter({ hasText: "Dự án" }).click();
  await drawer
    .getByRole("link", { name: "Dự án đang vận hành", exact: true })
    .click();
  await expect(page).toHaveURL(/\/du-an\/van-hanh$/);
  await expect(drawer).toBeHidden();
});
