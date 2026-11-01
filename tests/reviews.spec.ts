import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apiAs, login } from "./helpers";

test("reviews added in Admin show on the home and rental pages with the Google rating", async ({
  page,
}) => {
  const api = await apiAs();
  // Google profile summary and links (Admin › Cài đặt).
  const saved = await api.send("put", "/admin/settings", {
    values: {
      "reviews.googleRating": "4.9",
      "reviews.googleCount": "23",
      "reviews.googleUrl": "https://g.page/r/dat-vang-group",
      "reviews.googleWriteUrl": "https://g.page/r/dat-vang-group/review",
    },
  });
  expect(saved.ok()).toBeTruthy();

  await login(page);
  await page.goto("/admin/reviews");
  await expect(
    page.getByRole("heading", { name: "Khách hàng nói gì" }),
  ).toBeVisible();
  for (const [name, text, publish] of [
    [
      "Chị Thu Hà",
      "Căn hộ sạch đẹp, đúng như ảnh, nhân viên hỗ trợ rất chu đáo.",
      true,
    ],
    [
      "Khách thử ẩn",
      "Đánh giá này đang ẩn nên không được hiện trên web.",
      false,
    ],
  ] as const) {
    await page.getByRole("button", { name: "Thêm đánh giá" }).click();
    const dialog = page.getByRole("dialog", { name: "Thêm đánh giá" });
    await dialog.getByLabel("Tên khách hàng").fill(name);
    await dialog.getByLabel("Nội dung đánh giá").fill(text);
    await dialog
      .getByLabel("Link đánh giá gốc (không bắt buộc)")
      .fill("https://maps.app.goo.gl/review1");
    if (!publish) await dialog.getByLabel("Hiển thị trên website").uncheck();
    await dialog.getByRole("button", { name: "Lưu đánh giá" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".reviews-admin-list")).toContainText(name);
  }
  await expect(page.locator(".reviews-admin-count")).toContainText(
    "1 đang hiển thị",
  );

  // Home: the section, the Google summary and links; hidden reviews stay out.
  await page.goto("/");
  const section = page.locator(".reviews-section");
  await expect(
    section.getByRole("heading", { name: "Được khách hàng tin tưởng" }),
  ).toBeVisible();
  await expect(section).toContainText("4,9");
  await expect(section).toContainText("23 đánh giá trên Google");
  await expect(
    section.getByRole("link", { name: /Xem tất cả trên Google/ }),
  ).toHaveAttribute("href", "https://g.page/r/dat-vang-group");
  await expect(
    section.getByRole("link", { name: /Viết đánh giá/ }),
  ).toHaveAttribute("href", "https://g.page/r/dat-vang-group/review");
  await expect(section).toContainText("Chị Thu Hà");
  await expect(section).not.toContainText("Khách thử ẩn");
  await expect(
    section.getByRole("link", {
      name: "Xem đánh giá của Chị Thu Hà trên Google",
    }),
  ).toHaveAttribute("rel", /noopener/);
  const axe = await new AxeBuilder({ page })
    .include(".reviews-section")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);

  // Rental page too, and nothing overflows on a phone.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/cho-thue");
  await expect(page.locator(".reviews-section")).toContainText("Chị Thu Hà");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator(".reviews-section").screenshot({
    path: "/private/tmp/claude-501/-Users-tranducviet-Documents-DVG-WEB/d7e4d8d3-4b31-4315-9fe7-c92d90618232/scratchpad/reviews-mobile.png",
  });

  // Clean up: other tests count home sections.
  const all = (await api.get("/admin/reviews")) as unknown as {
    data: { id: string }[];
  };
  for (const r of all.data) await api.send("delete", `/admin/reviews/${r.id}`);
  await api.send("put", "/admin/settings", {
    values: {
      "reviews.googleRating": "",
      "reviews.googleCount": "",
      "reviews.googleUrl": "",
      "reviews.googleWriteUrl": "",
    },
  });
});
