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
  await expect(
    page.getByRole("status").filter({ hasText: "Đang chuyển trang" }),
  ).toBeVisible();
  release();
  await expect(page).toHaveURL(/\/gioi-thieu$/);
  await expect(page.locator(".navigation-shell")).toHaveAttribute(
    "data-navigating",
    "false",
  );
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
