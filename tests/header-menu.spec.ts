import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apiAs } from "./helpers";

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

for (const width of [375, 390]) {
  test(`phone header keeps a short search link at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/", "/du-an"]) {
      await page.goto(path);
      const header = page.locator(".site-header");
      const search = header.getByRole("link", { name: "Tìm BĐS", exact: true });
      await expect(search).toBeVisible();
      await expect(
        header.getByRole("button", { name: "Mở menu", exact: true }),
      ).toBeVisible();
      await expect(
        header.getByRole("link", { name: "Đất Vàng Group — Trang chủ" }),
      ).toBeVisible();
      // Everything fits: nothing in the header passes the right edge.
      const right = await header
        .locator(".header-inner > *")
        .evaluateAll((els) =>
          Math.max(...els.map((el) => el.getBoundingClientRect().right)),
        );
      expect(right).toBeLessThanOrEqual(width);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    await page
      .locator(".site-header")
      .getByRole("link", { name: "Tìm BĐS" })
      .click();
    await expect(page).toHaveURL(/\/cho-thue$/);
  });
}

test("desktop header keeps the full search label", async ({ page }) => {
  await page.goto("/du-an");
  const header = page.locator(".site-header");
  await expect(
    header.getByRole("link", { name: "Tìm kiếm bất động sản", exact: true }),
  ).toBeVisible();
  await expect(header.getByText("Tìm BĐS")).toBeHidden();
});

async function reloadUntil(page: Page, check: () => Promise<boolean>) {
  for (let i = 0; i < 20; i++) {
    if (await check()) return;
    await page.waitForTimeout(1500);
    await page.reload();
  }
  throw new Error("translation did not appear");
}

// Long but realistic translations of "Tìm BĐS" must not break the header.
const longLabels = {
  en: "Find real estate",
  ko: "부동산 찾기",
  zh: "查找房地产",
} as const;
for (const [locale, text] of Object.entries(longLabels)) {
  test(`phone header fits a long search label in ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 760 });
    await page.goto(`/${locale}/cho-thue`);
    const label = page.locator(".site-header .header-cta-short");
    const tag = locale.toUpperCase() + ": ";
    await reloadUntil(page, async () =>
      (await label.innerText()).startsWith(tag),
    );
    const admin = await apiAs("editor");
    const list = (await admin.get(
      `/admin/translations?locale=${locale}&pageSize=100&q=${encodeURIComponent("Tìm BĐS")}`,
    )) as unknown as {
      data: { id: string; source: string; updatedAt: string }[];
    };
    const row = list.data.find((r) => r.source === "Tìm BĐS")!;
    const res = await admin.send("patch", `/admin/translations/${row.id}`, {
      text,
      expectedUpdatedAt: row.updatedAt,
    });
    expect(res.ok()).toBeTruthy();
    await reloadUntil(page, async () => (await label.innerText()) === text);
    // Logo, language, search and menu sit side by side without overlapping.
    const boxes = await page
      .locator(
        ".site-header :is(.logo, .lang-trigger, .header-cta, .mobile-toggle)",
      )
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
    expect(boxes).toHaveLength(4);
    for (let i = 1; i < boxes.length; i++)
      expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right);
    expect(boxes[3].right).toBeLessThanOrEqual(375);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(375);
    // The rent/buy tabs of the search box are translated too ("Mua").
    await reloadUntil(page, async () =>
      (await page.locator(".hero-tabs").innerText()).includes(tag + "Mua"),
    );
  });
}
