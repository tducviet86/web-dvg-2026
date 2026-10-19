import { test, expect } from "@playwright/test";
import { leads } from "../src/data";

test("admin merges other records but rejects stale edits", async ({ page }) => {
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dvg:leads"))
      localStorage.setItem("dvg:leads", JSON.stringify(data));
  }, leads);
  await page.goto(`/admin/leads/${leads[0].id}/edit`);
  await page.locator("[name=notes]").fill("Ghi chú cập nhật");
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("dvg:leads")!);
    data.push({
      ...data[0],
      id: "new-from-other-tab",
      name: "Khách mới tab khác",
    });
    localStorage.setItem("dvg:leads", JSON.stringify(data));
  });
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/leads$/);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("dvg:leads")!).some(
        (r: { id: string }) => r.id === "new-from-other-tab",
      ),
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: `Sửa ${leads[0].name}`, exact: true })
    .click();
  await page.locator("[name=notes]").fill("Nội dung từ tab cũ");
  await page.evaluate((id) => {
    const data = JSON.parse(localStorage.getItem("dvg:leads")!);
    data.find((r: { id: string }) => r.id === id).notes =
      "Nội dung mới từ tab khác";
    localStorage.setItem("dvg:leads", JSON.stringify(data));
  }, leads[0].id);
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByText("Bản ghi đã thay đổi ở nơi khác.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem("dvg:leads")!).find(
          (r: { id: string }) => r.id === id,
        ).notes,
      leads[0].id,
    ),
  ).toBe("Nội dung mới từ tab khác");
});

test("admin searches phone and requires article content before published status", async ({
  page,
}) => {
  await page.goto("/admin/leads");
  await page
    .getByRole("textbox", { name: "Tìm trong bảng" })
    .fill(leads[0].phone);
  await expect(page.locator("tbody")).toContainText(leads[0].name);
  await page.goto("/admin/posts/new");
  const form = page.locator(".admin-editor-page");
  await form.locator("[name=name]").fill("Bài viết kiểm tra nghiệp vụ");
  await form.locator("[name=slug]").fill("bai-viet-kiem-tra-nghiep-vu");
  await form
    .locator("[name=description]")
    .fill("Mô tả ngắn của bài viết kiểm tra.");
  await form.locator("[name=status]").selectOption("Đã xuất bản");
  await form.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.locator("#editor-errors")).toContainText(
    "nội dung chi tiết",
  );
  await form
    .locator("[name=content]")
    .fill("Nội dung chi tiết của bài viết đã được biên tập.");
  await form.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);
});
