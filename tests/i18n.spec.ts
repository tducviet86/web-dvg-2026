import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apiAs } from "./helpers";

/*
 * The e2e Gemini stand-in "translates" by removing accents and prefixing the
 * language ("EN: Cho thue can ho Da Nang"). New strings are translated in the
 * background after a page renders, so tests reload until they appear.
 */
async function reloadUntil(page: Page, check: () => Promise<boolean>) {
  for (let i = 0; i < 20; i++) {
    if (await check()) return;
    await page.waitForTimeout(1500);
    await page.reload();
  }
  throw new Error("translation did not appear");
}

test("translated pages are rendered by the server with their own URLs and hreflang", async ({
  page,
  request,
}) => {
  await page.goto("/en/cho-thue");
  await reloadUntil(page, async () =>
    (await page.locator("h1").innerText()).startsWith("EN: "),
  );
  // Server HTML (what search engines index) is already in English.
  const html = await (await request.get("/en/cho-thue")).text();
  expect(html).toContain('<html lang="en"');
  expect(html).toMatch(/<h1[^>]*>EN: /);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/en\/cho-thue$/,
  );
  for (const [lang, path] of [
    ["vi", "/cho-thue"],
    ["en", "/en/cho-thue"],
    ["ko", "/ko/cho-thue"],
    ["zh-Hans", "/zh/cho-thue"],
    ["x-default", "/cho-thue"],
  ])
    await expect(
      page.locator(`link[rel="alternate"][hreflang="${lang}"]`),
    ).toHaveAttribute("href", new RegExp(`${path}$`));
  await expect(page).toHaveTitle(/^EN: /);
  // Internal links keep the language; data sent to the CRM stays Vietnamese.
  await expect(page.locator("#nav-du-an-trigger")).toHaveAttribute(
    "href",
    "/en/du-an",
  );
  await page.locator(".property-card h3 a").first().click();
  await expect(page).toHaveURL(/\/en\/cho-thue\/[a-z0-9-]+$/);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/en/cho-thue/du-an/monarchy-apartments</loc>");
  expect(sitemap).toContain('hreflang="ko"');
});

test("client components (popups, forms) are translated too", async ({
  page,
}) => {
  // No entrance animation, so the accessibility check sees final colours.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/cho-thue");
  const open = page.locator(".hero-contact button").first();
  await reloadUntil(page, async () =>
    (await open.innerText()).includes("EN: "),
  );
  await open.click();
  const dialog = page.getByRole("dialog");
  await reloadUntil(page, async () => {
    if (!(await dialog.isVisible())) await open.click();
    return (await dialog.locator("h2").innerText()).startsWith("EN: ");
  });
  await expect(dialog.locator("h2")).toHaveText("EN: Tu van chon can");
  const audit = await new AxeBuilder({ page })
    .include(".inquiry-dialog")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test.describe("first visit from a Korean browser", () => {
  test.use({ locale: "ko-KR" });
  test("is sent to Korean, can switch languages and the choice is remembered", async ({
    page,
    request,
  }) => {
    await page.goto("/du-an");
    await expect(page).toHaveURL(/\/ko\/du-an$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    // Search engines are never redirected.
    const bot = await request.get("/du-an", {
      headers: { "user-agent": "Googlebot/2.1", "accept-language": "ko" },
      maxRedirects: 0,
    });
    expect(bot.status()).toBe(200);

    await page.locator(".lang-trigger").click();
    await page.getByRole("link", { name: "中文" }).click();
    await expect(page).toHaveURL(/\/zh\/du-an$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
    await page.goto("/gioi-thieu");
    await expect(page).toHaveURL(/\/zh\/gioi-thieu$/);

    await page.locator(".lang-trigger").click();
    await page.getByRole("link", { name: "Tiếng Việt" }).click();
    await expect(page).toHaveURL(/\/gioi-thieu$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    // Chose Vietnamese: no more redirects despite the Korean browser.
    await page.goto("/du-an");
    await expect(page).toHaveURL(/\/du-an$/);
    await expect(
      page
        .locator(".desktop-nav")
        .getByRole("link", { name: "Dự án", exact: true }),
    ).toBeVisible();
  });
});

test("mobile drawer lists the four languages; Admin stays Vietnamese", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await expect(
    page
      .getByRole("group", { name: "Ngôn ngữ / Language" })
      .getByRole("button"),
  ).toHaveText(["Tiếng Việt", "English", "한국어", "中文"]);
  expect((await page.request.get("/en/admin")).status()).toBe(404);
  await page.goto("/admin");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
});

test("editors correct a translation in Admin and the website shows it", async ({
  page,
}) => {
  await page.goto("/en/lien-he");
  const contact = page.locator('.desktop-nav a[href="/en/lien-he"]');
  await reloadUntil(page, async () =>
    (await contact.innerText()).startsWith("EN: "),
  );
  const admin = await apiAs("editor");
  const list = (await admin.get(
    `/admin/translations?locale=en&pageSize=100&q=${encodeURIComponent("Liên hệ")}`,
  )) as unknown as {
    data: { id: string; source: string; updatedAt: string }[];
  };
  const row = list.data.find((r) => r.source === "Liên hệ")!;
  const res = await admin.send("patch", `/admin/translations/${row.id}`, {
    text: "Contact us",
    expectedUpdatedAt: row.updatedAt,
  });
  expect(res.ok()).toBeTruthy();
  await reloadUntil(
    page,
    async () => (await contact.innerText()) === "Contact us",
  );
});
