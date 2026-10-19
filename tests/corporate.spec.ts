import { test, expect } from "@playwright/test";
test("corporate homepage uses company logo and image banner without sales UI", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".site-header .company-logo")).toHaveAttribute(
    "src",
    /dat-vang-group-logo/,
  );
  await expect(page.locator(".search-panel, main .property-card")).toHaveCount(
    0,
  );
  await expect(
    page
      .locator(".site-header")
      .getByRole("link", { name: "Cho thuê", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Thấu hiểu để đồng hành." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Liên hệ hợp tác", exact: true }),
  ).toHaveAttribute("href", "/lien-he");
  await page.getByRole("button", { name: "Hiển thị ảnh 2" }).click();
  await expect(page.locator(".banner-count")).toHaveText("0203");
  await expect(page.locator(".corporate-banner-photo")).toHaveAttribute(
    "alt",
    /Góc nhìn về những không gian sống/,
  );
  await page.getByRole("button", { name: "Ảnh banner tiếp theo" }).click();
  await expect(page.locator(".banner-count")).toHaveText("0303");
  await page.getByRole("button", { name: "Ảnh banner trước" }).click();
  await expect(
    page.getByRole("button", { name: "Hiển thị ảnh 2" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Hiển thị ảnh 1" }).click();
  await page
    .locator(".corporate-banner-photo")
    .evaluate(async (image: HTMLImageElement) => {
      if (!image.complete)
        await new Promise((resolve) => {
          image.onload = resolve;
          image.onerror = resolve;
        });
    });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "tests/corporate-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "tests/corporate-mobile.png" });
});

test("autoplay continues under pointer and header changes on scroll", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Tạm dừng trình chiếu" }),
  ).toBeVisible();
  await expect(page.locator(".company-logo").first()).toHaveAttribute(
    "src",
    /logo-transparent/,
  );
  await expect(page.locator("header")).toHaveClass(/header-overlay/);
  await page
    .locator(".corporate-banner")
    .hover({ position: { x: 200, y: 200 } });
  await page.clock.fastForward(5100);
  await expect(page.locator(".banner-count")).toHaveText("0203");
  await page.getByRole("button", { name: "Ảnh banner tiếp theo" }).click();
  await expect(page.locator(".banner-count")).toHaveText("0303");
  await page.clock.fastForward(5100);
  await expect(page.locator(".banner-count")).toHaveText("0103");
  await page.getByRole("button", { name: "Tạm dừng trình chiếu" }).click();
  await page.clock.fastForward(6000);
  await expect(page.locator(".banner-count")).toHaveText("0103");
  await page.getByRole("button", { name: "Phát trình chiếu" }).click();
  await page.clock.fastForward(5100);
  await expect(page.locator(".banner-count")).toHaveText("0203");
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: "instant" }));
  await expect(page.locator("header")).toHaveClass(/header-solid/);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.locator("header")).toHaveClass(/header-overlay/);
});

test("homepage fields support keyboard exploration and relevant destination links", async ({
  page,
}) => {
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "Lĩnh vực hoạt động" });
  await tabs.getByRole("tab", { name: /Quản lý bất động sản/ }).click();
  await page.keyboard.press("ArrowDown");
  await expect(
    tabs.getByRole("tab", { name: /Khai thác & vận hành/ }),
  ).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText(
    "đặc điểm từng bất động sản",
  );
  await expect(page.getByRole("tabpanel").getByRole("link")).toHaveAttribute(
    "href",
    "/dich-vu/khai-thac-cho-thue",
  );
  await page.keyboard.press("End");
  await expect(
    tabs.getByRole("tab", { name: /Tư vấn & hợp tác/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel").getByRole("link")).toHaveAttribute(
    "href",
    "/hop-tac-chu-so-huu",
  );
  await page.keyboard.press("Home");
  await expect(
    tabs.getByRole("tab", { name: /Quản lý bất động sản/ }),
  ).toBeFocused();
});
