import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const room = "/cho-thue/can-ho-sun-ponte-residence-demo-01";

test("foreign-language unit pages offer WhatsApp with the unit in the message", async ({
  page,
}) => {
  await page.goto(`/en${room}`);
  const panel = page.locator(".room-contact-panel");
  const chat = panel.locator("a.whatsapp-button");
  await expect(chat).toBeVisible();
  await expect(chat).toContainText("+84 911 29 69 79");
  const url = new URL((await chat.getAttribute("href"))!);
  expect(url.origin + url.pathname).toBe("https://wa.me/84911296979");
  // The first message names the unit code, whatever the language.
  expect(url.searchParams.get("text")).toMatch(/DEMO|Sun Ponte/i);
  await expect(chat).toHaveAttribute("target", "_blank");
  // The phone call stays available next to it.
  await expect(panel.locator('a[href^="tel:"]')).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .include(".room-contact-panel")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(audit.violations).toEqual([]);

  // Phones: the bottom bar chats on WhatsApp instead of calling abroad.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".room-mobile-call a.whatsapp-button")).toBeVisible();
});

test("Vietnamese unit pages keep the call button only", async ({ page }) => {
  await page.goto(room);
  await expect(page.locator(".room-contact-panel a[href^='tel:']")).toBeVisible();
  await expect(page.locator(".room-contact-panel .whatsapp-button")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".room-mobile-call a[href^='tel:']")).toBeVisible();
});

test("contact page lists WhatsApp; foreign visitors get it in the hero", async ({
  page,
}) => {
  await page.goto("/lien-he");
  await expect(
    page.locator('.contact-main a[href="https://wa.me/84911296979"]'),
  ).toBeVisible();
  await page.goto("/en/lien-he");
  await expect(
    page.locator('.about-hero-actions a[href="https://wa.me/84911296979"]'),
  ).toBeVisible();
});
