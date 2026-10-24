import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("back button returns to the previous page, or the parent when arriving directly", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".crumb-back")).toHaveCount(0);
  await page.goto("/cho-thue");
  await page.locator(".property-card h3 a").first().click();
  await expect(page).toHaveURL(/\/cho-thue\/[a-z0-9-]+$/);
  await expect(page.locator(".site-header .crumb-back")).toHaveCount(0);
  await expect(page.locator(".breadcrumb .crumb-back")).toBeVisible();
  await page.getByRole("button", { name: "Quay lại" }).click();
  await expect(page).toHaveURL(/\/cho-thue$/);
  // Arriving straight on a unit (e.g. from Google): back goes to the listing.
  const fresh = await page.context().newPage();
  await fresh.goto("/cho-thue/can-ho-sun-panoma-demo-02");
  await fresh.getByRole("button", { name: "Quay lại" }).click();
  await expect(fresh).toHaveURL(/\/cho-thue$/);
});

test("switching language keeps the app loaded (no full page reload)", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  await page.evaluate(() => {
    (window as unknown as { __probe: string }).__probe = "kept";
  });
  await page.locator(".lang-trigger").click();
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/cho-thue$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(
    await page.evaluate(
      () => (window as unknown as { __probe?: string }).__probe,
    ),
  ).toBe("kept");
  await page.locator(".lang-trigger").click();
  await page.getByRole("link", { name: "Tiếng Việt" }).click();
  await expect(page).toHaveURL(/\/cho-thue$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
});

test("new units default to the company contact", async ({ page }) => {
  await login(page);
  await page.goto("/admin/properties/new");
  const form = page.locator(".admin-editor-page");
  await expect(form.locator("[name=contactName]")).toHaveValue("Ánh Đất Vàng");
  await expect(form.locator("[name=contactPhone]")).toHaveValue(
    "0911 29 69 79",
  );
  // "Cho thuê" is on for a new unit, so the rent fields are shown.
  await expect(form.locator("[name=forRent]")).toBeChecked();
  await expect(form.locator("[name=price]")).toBeVisible();
  await expect(form.locator("[name=contactPick]")).toHaveCount(0);
});

test("leaving a changed form asks in a popup; staying keeps the edits", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/properties/new");
  const form = page.locator(".admin-editor-page");
  await form.locator("[name=name]").fill("Căn đang soạn dở");
  await page.getByRole("button", { name: "Về danh sách" }).click();
  const dialog = page.getByRole("dialog", { name: "Rời đi mà không lưu?" });
  await expect(dialog).toBeVisible();
  await page.screenshot({
    path: "/private/tmp/claude-501/-Users-tranducviet-Documents-DVG-WEB/d7e4d8d3-4b31-4315-9fe7-c92d90618232/scratchpad/confirm-popup.png",
  });
  // The safe choice is focused: Escape keeps the form.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(form.locator("[name=name]")).toHaveValue("Căn đang soạn dở");
  await expect(page.locator(".editor-errors")).toHaveCount(0);
  await page.getByRole("button", { name: "Về danh sách" }).click();
  await dialog.getByRole("button", { name: "Bỏ thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/properties$/);
});
