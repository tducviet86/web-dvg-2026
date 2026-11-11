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
  const dialog = page.getByRole("dialog");
  // The form is downloaded on the first click, so the dialog opens a moment later.
  await reloadUntil(page, async () => {
    if (!(await dialog.isVisible())) {
      await open.click();
      if (
        !(await dialog.waitFor({ timeout: 5000 }).then(
          () => true,
          () => false,
        ))
      )
        return false;
    }
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

test("phones pick the language in the top bar; Admin stays Vietnamese", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator(".site-header .lang-trigger").click();
  await expect(page.locator(".lang-menu a")).toHaveText([
    "Tiếng Việt",
    "English",
    "한국어",
    "中文",
  ]);
  await page.locator(".lang-menu a", { hasText: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 640 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
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

test("the search box labels and slider are translated too", async ({
  page,
}) => {
  await page.goto("/en/cho-thue");
  const kinds = page.locator(".hero-kinds");
  await reloadUntil(page, async () =>
    (await kinds.innerText()).includes("EN: Can ho"),
  );
  await expect(page.locator(".hero-submit")).toContainText("EN: Tim kiem");
  await expect(page.locator(".price-range output")).toContainText("EN: ");
  // Addresses in the area list: the label is translated, the value kept.
  const area = page.locator('[id$="-location-o1"]');
  if (await area.count())
    await reloadUntil(page, async () =>
      (await area.textContent())!.startsWith("EN: "),
    );
});

test("a new unit is translated, prices kept apart from the words", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; status: string }[];
  };
  const projectId = projects.data.find((p) => p.status === "PUBLISHED")!.id;
  const created = await api.send("post", "/admin/properties", {
    name: "Căn dịch giá QA",
    unitCode: "I18N-QA",
    projectId,
    propertyType: "2pn",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn hộ kiểm tra dịch giá thuê.",
    rentPriceVnd: "27300000",
    depositVnd: "27300000",
    status: "PUBLISHED",
  });
  expect(created.ok()).toBeTruthy();
  const { slug, id } = (await created.json()).data as {
    slug: string;
    id: string;
  };
  await page.goto(`/ko/cho-thue/${slug}`);
  // "1 tháng tiền nhà · 27.300.000 đ": the words are translated on their
  // own (once for every price), the amount stays as it is.
  const deposit = page.locator("dd", { hasText: "27.300.000" }).filter({
    hasText: "1 thang tien nha",
  });
  await reloadUntil(page, async () => (await deposit.count()) > 0);
  await expect(deposit.first()).toContainText("KO: 1 thang tien nha");
  await expect(
    page.locator("main").getByText("KO: Can ho kiem tra dich gia thue."),
  ).toBeVisible();
  // The costs the rent leaves out, listed side by side, are translated too.
  const out = page.locator(".room-fees-out");
  await reloadUntil(page, async () =>
    (await out.innerText()).includes("KO: Nuoc"),
  );
  await expect(out).toContainText("KO: Phi quan ly");
  await api.send("delete", `/admin/properties/${id}`);
});

test.describe("first visit language", () => {
  const bar = (page: Page) => page.locator(".lang-suggestion");

  test("Korean and Chinese browsers are redirected, without the bar", async ({
    browser,
    baseURL,
  }) => {
    for (const [locale, path] of [
      ["ko-KR", "/ko"],
      ["zh-CN", "/zh"],
    ]) {
      const context = await browser.newContext({ locale, baseURL });
      const page = await context.newPage();
      await page.goto("/");
      expect(new URL(page.url()).pathname).toBe(path);
      await expect(page.locator("header.site-header")).toBeVisible();
      await expect(bar(page)).toHaveCount(0);
      await context.close();
    }
  });

  test("Vietnamese browsers see Vietnamese without the bar", async ({
    page,
  }) => {
    await page.goto("/");
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(bar(page)).toHaveCount(0);
  });

  test("other browsers stay in Vietnamese and can switch to English once", async ({
    browser,
    baseURL,
  }) => {
    for (const locale of ["en-US", "ru-RU"]) {
      const context = await browser.newContext({ locale, baseURL });
      const page = await context.newPage();
      await page.goto("/du-an");
      expect(new URL(page.url()).pathname).toBe("/du-an");
      await expect(page.locator("html")).toHaveAttribute("lang", "vi");
      await bar(page)
        .getByRole("button", { name: /in English/ })
        .click();
      await expect(page).toHaveURL(/\/en\/du-an$/);
      await expect(bar(page)).toHaveCount(0);
      await page.goto("/gioi-thieu");
      await expect(page).toHaveURL(/\/en\/gioi-thieu$/);
      await context.close();
    }
  });

  test("closing the bar is remembered and keeps Vietnamese", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ locale: "en-US", baseURL });
    const page = await context.newPage();
    await page.goto("/");
    await bar(page).getByRole("button", { name: "Close" }).click();
    await expect(bar(page)).toHaveCount(0);
    await page.goto("/du-an");
    expect(new URL(page.url()).pathname).toBe("/du-an");
    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(bar(page)).toHaveCount(0);
    await context.close();
  });

  test("a remembered choice beats the browser language", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ locale: "ko-KR", baseURL });
    await context.addCookies([
      { name: "dvg_lang", value: "vi", url: baseURL! },
    ]);
    const page = await context.newPage();
    await page.goto("/");
    expect(new URL(page.url()).pathname).toBe("/");
    await context.close();
  });

  test("the bar fits a phone without sideways scrolling", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      locale: "en-US",
      baseURL,
      viewport: { width: 375, height: 800 },
    });
    const page = await context.newPage();
    // Page content starts below the bar.
    await page.goto("/cho-thue");
    await expect(bar(page)).toBeVisible();
    const barBox = await bar(page).boundingBox();
    const back = await page
      .locator(".breadcrumb button, .breadcrumb a")
      .first()
      .boundingBox();
    expect(back!.y).toBeGreaterThanOrEqual(barBox!.y + barBox!.height);
    await page.goto("/");
    await expect(bar(page)).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await context.close();
  });
});
