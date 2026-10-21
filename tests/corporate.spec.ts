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
    page.getByRole("heading", { name: /Bất động sản.*Giải pháp cho bạn/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Liên hệ hợp tác", exact: true }),
  ).toHaveAttribute("href", "/lien-he");
  await page.getByRole("button", { name: "Tạm dừng trình chiếu" }).click();
  await expect(
    page.getByRole("button", { name: /Hiển thị ảnh|Ảnh banner/ }),
  ).toHaveCount(0);
  const swipe = page.locator(".banner-swipe-viewport");
  await swipe.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".banner-count")).toHaveText("0203");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".banner-count")).toHaveText("0303");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".banner-count")).toHaveText("0203");
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
  await page.clock.fastForward(5100);
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
  await tabs.getByRole("tab", { name: /Mua bán bất động sản/ }).click();
  await page.keyboard.press("ArrowDown");
  await expect(
    tabs.getByRole("tab", { name: /Cho thuê bất động sản/ }),
  ).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Hỗ trợ khách thuê");
  await expect(page.getByRole("tabpanel").getByRole("link")).toHaveAttribute(
    "href",
    "/cho-thue",
  );
  await page.keyboard.press("End");
  await expect(
    tabs.getByRole("tab", { name: /Ký gửi bất động sản/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel").getByRole("link")).toHaveAttribute(
    "href",
    "/lien-he?intent=ky-gui",
  );
  await page.keyboard.press("Home");
  await expect(
    tabs.getByRole("tab", { name: /Mua bán bất động sản/ }),
  ).toBeFocused();
});
