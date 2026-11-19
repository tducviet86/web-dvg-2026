import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("one contact button fans out hotline, Zalo and WhatsApp (hover, tap, keyboard)", async ({
  page,
}) => {
  // Final colours for the accessibility check (no fan-out animation).
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cho-thue");
  // Its name switches to "Đóng kênh liên hệ" when open, so locate it by class.
  const toggle = page.locator(".dock-contact-toggle");
  await expect(toggle).toHaveAccessibleName("Liên hệ: Hotline, Zalo, WhatsApp");
  const channels = page.getByRole("group", { name: "Kênh liên hệ" });
  // Closed: the channels are not reachable.
  await expect(page.locator("#dock-channels")).toHaveAttribute("inert", "");
  await toggle.hover();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    channels.getByRole("link", { name: /WhatsApp/ }),
  ).toHaveAttribute("href", "https://wa.me/84911296979");
  await expect(channels.getByRole("link", { name: /Zalo/ })).toHaveAttribute(
    "href",
    "https://zalo.me/0911296979",
  );
  await expect(
    channels.getByRole("link", { name: /Gọi hotline/ }),
  ).toHaveAttribute("href", "tel:+84911296979");
  const audit = await new AxeBuilder({ page })
    .include(".contact-dock")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.mouse.move(10, 10);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  // Keyboard / tap: the button toggles, Escape closes.
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  // The AI assistant is announced as coming soon.
  await page.getByRole("button", { name: "Trợ lý AI (sắp ra mắt)" }).click();
  await expect(
    page.getByRole("dialog", { name: "Trợ lý AI Đất Vàng" }),
  ).toContainText("Sắp ra mắt");
});

test("phones get one contact button, and no greeting on arrival", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cho-thue");
  await expect(page.locator(".dock-contact-toggle")).toBeVisible();
  // The AI assistant (not open yet) stays off phones.
  await expect(page.locator(".dock-bot")).toBeHidden();
  // Desktop: the greeting waits until the visitor has looked around.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(3000);
  await expect(page.locator(".dock-bubble")).toHaveCount(0);
  await page.mouse.wheel(0, 1500);
  await expect(page.locator(".dock-bubble")).toBeVisible();
});
