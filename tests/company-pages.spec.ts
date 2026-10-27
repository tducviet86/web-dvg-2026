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
  // "Lĩnh vực hoạt động" keeps the company hero with the depth photo.
  await page.goto("/dich-vu");
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

test("about page: photo hero with real figures, values from Admin and links on", async ({
  page,
}) => {
  await page.goto("/gioi-thieu");
  const main = page.locator("main.about-page");
  await expect(main.locator(".rental-hero h1")).toBeVisible();
  // Figures come from the data (projects, units, fields), never typed in.
  await expect(main.locator(".rental-hero-stats dt").first()).toHaveText(
    "Dự án đồng hành",
  );
  await expect(main.locator(".about-values-list > li")).not.toHaveCount(0);
  await expect(main.locator(".about-mosaic a").first()).toHaveAttribute(
    "href",
    /\/du-an\/[a-z0-9-]+$/,
  );
  await main.locator(".about-explore-card", { hasText: "Đội ngũ" }).click();
  await expect(page).toHaveURL(/\/gioi-thieu\/doi-ngu$/);
});

test("vision, team and partner pages share the about style and tabs", async ({
  page,
}) => {
  for (const [path, part] of [
    ["/gioi-thieu/tam-nhin-su-menh", ".about-row"],
    ["/gioi-thieu/doi-ngu", ".about-team-grid > li"],
    ["/gioi-thieu/doi-tac", ".about-partner-grid > li"],
  ]) {
    await page.goto(path);
    await expect(page.locator("main.about-sub .rental-hero h1")).toBeVisible();
    await expect(page.locator(part).first()).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Giới thiệu" })
        .locator('[aria-current="page"]'),
    ).toHaveAttribute("href", new RegExp(`${path}$`));
  }
  await page
    .getByRole("navigation", { name: "Giới thiệu" })
    .getByRole("link", { name: "Câu chuyện" })
    .click();
  await expect(page).toHaveURL(/\/gioi-thieu$/);
});

test("contact page: call and Zalo up front, the form beside the channels, needs and notes", async ({
  page,
}) => {
  await page.goto("/lien-he");
  const main = page.locator("main.contact-page");
  await expect(main.locator(".rental-hero h1")).toBeVisible();
  await expect(main.locator(".about-hero-actions a").first()).toHaveAttribute(
    "href",
    /^tel:/,
  );
  await expect(main.locator(".contact-channels li").first()).toContainText(
    "Hotline",
  );
  // One heading for the form: the card's.
  await expect(
    main.locator(".contact-form-card .contact-form h3"),
  ).toBeHidden();
  await expect(main.locator(".contact-form-card form")).toBeVisible();
  await expect(main.locator(".contact-needs-grid a")).toHaveCount(5);
  await main
    .locator(".contact-needs-grid a", { hasText: "Ký gửi căn hộ" })
    .click();
  await expect(page).toHaveURL(/\/hop-tac-chu-so-huu$/);
});
