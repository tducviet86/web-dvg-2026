import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("admin editor routes persist detailed fields and reject duplicate slugs", async ({
  page,
}) => {
  await page.goto("/admin/projects/new");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Thêm mới dự án",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const form = page.locator(".admin-editor-page");
  await form.locator("[name=name]").fill("Dự án chi tiết QA");
  await page.getByRole("button", { name: "Tạo đường dẫn từ tên" }).click();
  await expect(form.locator("[name=slug]")).toHaveValue("du-an-chi-tiet-qa");
  await form
    .locator("textarea[name=description]")
    .fill("Thông tin dự án được kiểm tra đầy đủ.");
  await form.locator("[name=developer]").fill("Chủ đầu tư QA");
  await form.locator("[name=address]").fill("Địa chỉ chi tiết QA");
  await form.locator("[name=totalUnits]").fill("120");
  await form.locator("[name=seoTitle]").fill("Tiêu đề SEO QA");
  await form.locator("[name=imageAlt]").fill("Mô tả ảnh QA");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/projects$/);
  await page
    .getByRole("button", { name: "Sửa Dự án chi tiết QA", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/projects\/[^/]+\/edit$/);
  await page.reload();
  for (const [key, value] of Object.entries({
    developer: "Chủ đầu tư QA",
    address: "Địa chỉ chi tiết QA",
    totalUnits: "120",
    seoTitle: "Tiêu đề SEO QA",
    imageAlt: "Mô tả ảnh QA",
  })) {
    await expect(form.locator(`[name=${key}]`)).toHaveValue(value);
  }
  await page.getByRole("button", { name: "Về danh sách" }).click();
  await page.getByRole("button", { name: "Thêm mới", exact: true }).click();
  await form.locator("[name=name]").fill("Trùng slug QA");
  await form.locator("[name=slug]").fill("du-an-chi-tiet-qa");
  await form
    .locator("textarea[name=description]")
    .fill("Nội dung kiểm tra trùng đường dẫn.");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.locator("#editor-errors")).toContainText(
    "Đường dẫn này đã được sử dụng",
  );
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Bỏ thay đổi và quay lại" }).click();
  await expect(page).toHaveURL(/\/admin\/projects$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/projects\/new$/);
});

test("all admin forms are responsive and accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const section of [
    "projects",
    "properties",
    "posts",
    "leads",
    "settings",
  ]) {
    await page.goto(`/admin/${section}${section === "settings" ? "" : "/new"}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      section,
    ).toEqual([]);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          { message: `${section} ${width}` },
        )
        .toBeTruthy();
    }
  }
  await page.goto("/admin/projects/new");
  await expect(page.locator(".admin-editor-page")).toBeVisible();
  await expect(page.getByAltText("Xem trước ảnh đại diện")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "tests/admin-editor-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "tests/admin-editor-mobile.png",
    fullPage: true,
  });
});

test("lead budget validation and editorial content survive save", async ({
  page,
}) => {
  await page.goto("/admin/leads/new");
  await page.locator("[name=name]").fill("Khách chi tiết QA");
  await page.locator("[name=email]").fill("qa@example.com");
  await page
    .locator("[name=message]")
    .fill("Mong muốn trao đổi hợp tác doanh nghiệp.");
  await page.locator("[name=budgetMin]").fill("30");
  await page.locator("[name=budgetMax]").fill("10");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.locator("#editor-errors")).toContainText(
    "Ngân sách tối đa",
  );
  await page.locator("[name=budgetMax]").fill("50");
  await page.locator("[name=followUpAt]").fill("2026-11-20T10:30");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/leads$/);
  await page
    .getByRole("button", { name: "Sửa Khách chi tiết QA", exact: true })
    .click();
  await expect(page.locator("[name=followUpAt]")).toHaveValue(
    "2026-11-20T10:30",
  );
  await page.goto("/admin/posts/new");
  await page.locator("[name=name]").fill("Bài viết chi tiết QA");
  await page.locator("[name=slug]").fill("bai-viet-chi-tiet-qa");
  await page
    .locator("textarea[name=description]")
    .fill("Tóm tắt nội dung của bài viết kiểm tra.");
  await page
    .locator("[name=content]")
    .fill("Nội dung chi tiết đoạn một.\n\nNội dung đoạn hai.");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);
  await page
    .getByRole("button", { name: "Sửa Bài viết chi tiết QA", exact: true })
    .click();
  await expect(page.locator("[name=content]")).toHaveValue(
    "Nội dung chi tiết đoạn một.\n\nNội dung đoạn hai.",
  );
});
