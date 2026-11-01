import { test, expect, type Page } from "@playwright/test";

/** FAQPage structured data on the page, if any. */
async function faqData(page: Page) {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return blocks
    .map((b) => JSON.parse(b))
    .find((d) => d["@type"] === "FAQPage") as
    | { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
    | undefined;
}

test("AI assistants may read the site; llms.txt and the Bing key are served", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  for (const bot of [
    "GPTBot",
    "OAI-SearchBot",
    "ClaudeBot",
    "PerplexityBot",
    "Google-Extended",
    "Bingbot",
  ])
    expect(robots).toContain(`User-Agent: ${bot}`);
  // Private areas stay closed in every group.
  expect(robots.match(/Disallow: \/admin/g)?.length).toBe(2);
  expect(robots).toContain("Sitemap:");

  const llms = await request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  expect(llms.headers()["content-type"]).toContain("text/plain");
  const text = await llms.text();
  expect(text).toMatch(/^# \S.*\n\n> .+ là công ty bất động sản tại Đà Nẵng/);
  expect(text).toContain("## Căn hộ cho thuê theo dự án");
  expect(text).toMatch(
    /\[The Monarchy\]\(https?:\/\/[^)]+\/cho-thue\/du-an\/[^)]+\)/,
  );
  expect(text).toContain("## Liên hệ");
  expect(text).not.toMatch(/\bdemo\b/i);

  const home = await (await request.get("/")).text();
  expect(home).toContain(
    '<meta name="msvalidate.01" content="EDE7796E0A03190449BB1CD1C13A1E9D"/>',
  );
  const bing = await request.get("/BingSiteAuth.xml");
  expect(bing.status()).toBe(200);
  expect(await bing.text()).toContain("EDE7796E0A03190449BB1CD1C13A1E9D");
});

test("rental and project pages answer common questions from live listings", async ({
  page,
}) => {
  await page.goto("/cho-thue");
  const faq = page.locator(".rental-faq");
  await expect(
    faq.getByRole("heading", { name: /muốn biết thêm/ }),
  ).toBeVisible();
  const data = await faqData(page);
  expect(data).toBeTruthy();
  // The structured data repeats exactly the questions shown on the page.
  const shown = await faq.locator("summary").allTextContents();
  expect(data!.mainEntity.map((q) => q.name)).toEqual(
    shown.map((s) => s.replace(/\+$/, "").trim()),
  );
  expect(data!.mainEntity.map((q) => q.name)).toContain(
    "Làm thế nào để hẹn xem căn hộ?",
  );
  // A question opens in place.
  await faq.locator("summary").first().click();
  await expect(faq.locator("details[open] p")).toBeVisible();

  // A project page: questions about that project only.
  await page.goto("/cho-thue/du-an/monarchy-apartments");
  const project = await faqData(page);
  expect(project!.mainEntity[0].name).toBe("The Monarchy nằm ở đâu?");
  expect(project!.mainEntity.map((q) => q.name).join(" ")).not.toContain(
    "Sun Panoma",
  );

  // English pages carry the questions too (translated as text is translated).
  await page.goto("/en/cho-thue");
  expect((await faqData(page))?.mainEntity.length).toBe(
    data!.mainEntity.length,
  );
});
