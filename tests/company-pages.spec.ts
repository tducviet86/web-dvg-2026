import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("company layouts remain accessible and fit desktop and mobile", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of [
    "/gioi-thieu",
    "/gioi-thieu/tam-nhin-su-menh",
    "/gioi-thieu/doi-ngu",
    "/gioi-thieu/doi-tac",
    "/du-an",
    "/dich-vu",
    "/blog",
    "/lien-he",
    "/dich-vu/quan-ly-bat-dong-san",
    "/blog/kinh-nghiem-thue-can-ho-da-nang",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      path,
    ).toEqual([]);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          { message: `${path} at ${width}` },
        )
        .toBeTruthy();
    }
    if (
      [
        "/gioi-thieu",
        "/du-an",
        "/dich-vu",
        "/blog",
        "/lien-he",
        "/gioi-thieu/doi-tac",
      ].includes(path)
    )
      await page.screenshot({
        path: `tests/company-${path.replaceAll("/", "-")}.png`,
        fullPage: true,
        animations: "disabled",
      });
  }
});
test("depth effect responds to mouse, resets and respects reduced motion", async ({
  page,
}) => {
  await page.goto("/gioi-thieu");
  const scene = page.locator(".company-hero-art");
  const surface = scene.locator(".depth-surface");
  const box = await scene.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.8, box!.y + box!.height * 0.3);
  await expect
    .poll(() => surface.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe("none");
  await page.mouse.move(0, 0);
  await expect
    .poll(() => surface.evaluate((el) => getComputedStyle(el).transform))
    .toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(box!.x + box!.width * 0.8, box!.y + box!.height * 0.3);
  await expect(surface).toHaveCSS("transform", "none");
});
