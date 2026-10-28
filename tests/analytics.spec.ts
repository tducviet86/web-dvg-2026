import { test, expect, type Page } from "@playwright/test";

const LIVE = "https://datvanggroup.vn";

/** Serves the test site under the real domain; Google's script is stubbed. */
async function asLiveSite(page: Page, baseURL: string) {
  await page.route(`${LIVE}/**`, async (route) => {
    const url = route.request().url().replace(LIVE, baseURL);
    const response = await route.fetch({ url });
    await route.fulfill({ response });
  });
  await page.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "" }),
  );
}
const layer = (page: Page) =>
  page.evaluate(() =>
    ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? []).map(
      (args) => Array.from(args),
    ),
  );

test("GA4 waits for consent, then counts calls and Zalo as leads; local copies are not measured", async ({
  page,
  baseURL,
}) => {
  // Local copy / tests: no tracking script, no notice.
  await page.goto("/lien-he");
  await expect(page.locator("main h1")).toBeVisible();
  expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
  await expect(
    page.getByRole("region", { name: "Thông báo cookie" }),
  ).toHaveCount(0);

  await asLiveSite(page, baseURL!);
  await page.goto(`${LIVE}/lien-he`);
  await expect(
    page.locator('script[src*="gtag/js?id=G-DNXPDKR1NX"]'),
  ).toHaveCount(1);
  // Consent Mode: nothing stored before the visitor agrees.
  await expect
    .poll(async () => JSON.stringify(await layer(page)))
    .toContain('"consent","default",{"ad_storage":"denied"');
  const notice = page.getByRole("region", { name: "Thông báo cookie" });
  await expect(notice).toContainText("cookie");
  await notice.getByRole("button", { name: "Đồng ý" }).click();
  await expect(notice).toHaveCount(0);
  expect(JSON.stringify(await layer(page))).toContain(
    '"consent","update",{"ad_storage":"granted"',
  );
  // Leads: the phone and Zalo buttons (the page stays put).
  await page.evaluate(() =>
    document.addEventListener("click", (e) => e.preventDefault()),
  );
  await page.locator('a[href^="tel:"]').first().click();
  await page.locator('a[href*="zalo.me"]').first().click();
  const events = (await layer(page))
    .filter((a) => a[0] === "event")
    .map((a) => a[1]);
  expect(events).toEqual(expect.arrayContaining(["click_call", "click_zalo"]));
  // The choice is remembered.
  await page.reload();
  await expect(page.locator('script[src*="gtag/js"]')).toHaveCount(1);
  await expect(notice).toHaveCount(0);
  expect(JSON.stringify(await layer(page))).toContain(
    '"consent","default",{"ad_storage":"granted"',
  );
});
