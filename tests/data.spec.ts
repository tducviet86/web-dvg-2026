import { test, expect } from "@playwright/test";
import {
  projects,
  properties,
  posts,
  services,
  testimonials,
  leads,
  adminUsers,
} from "../src/data";
import { filterProperties } from "../src/lib/filter";
test("deterministic data relationships and individual filters", () => {
  expect([
    projects.length,
    properties.length,
    posts.length,
    services.length,
    testimonials.length,
    leads.length,
    adminUsers.length,
  ]).toEqual([6, 24, 12, 6, 8, 20, 5]);
  for (const property of properties)
    expect(projects.some((p) => p.id === property.projectId)).toBeTruthy();
  for (const list of [projects, properties, posts])
    expect(new Set(list.map((p) => p.slug)).size).toBe(list.length);
  const cases: [
    Record<string, string>,
    (p: (typeof properties)[number]) => boolean,
  ][] = [
    [
      { location: "Sơn Trà, Đà Nẵng" },
      (p) => p.location === "Sơn Trà, Đà Nẵng",
    ],
    [{ project: "project-1" }, (p) => p.projectId === "project-1"],
    [{ type: "Studio" }, (p) => p.type === "Studio"],
    [{ price: "10" }, (p) => p.price <= 10],
    [{ bedrooms: "0" }, (p) => p.bedrooms === 0],
    [{ area: "90" }, (p) => p.area >= 90],
    [
      { furniture: "Nội thất cơ bản" },
      (p) => p.furniture === "Nội thất cơ bản",
    ],
    [{ status: "Còn trống" }, (p) => p.status === "Còn trống"],
  ];
  for (const [filters, predicate] of cases) {
    const result = filterProperties(properties, filters);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(predicate)).toBeTruthy();
  }
  expect(filterProperties(properties, { sort: "price-desc" })[0].price).toBe(
    Math.max(...properties.map((p) => p.price)),
  );
  expect(filterProperties(properties, { sort: "area" })[0].area).toBe(
    Math.max(...properties.map((p) => p.area)),
  );
});
test("apartment and blog CRUD persists", async ({ page }) => {
  await page.goto("/admin");
  for (const item of [
    {
      tab: "Căn hộ",
      name: "Căn hộ QA",
      slug: "can-ho-qa",
      status: "Đã cho thuê",
      key: "properties",
    },
    {
      tab: "Bài viết",
      name: "Bài viết QA",
      slug: "bai-viet-qa",
      status: "Đã xuất bản",
      key: "posts",
    },
  ]) {
    await page
      .getByRole("navigation", { name: "Quản trị", exact: true })
      .getByRole("link", { name: item.tab, exact: true })
      .click();
    await page.getByRole("button", { name: "Thêm mới" }).click();
    const form = page.locator(".admin-editor-page");
    await form.locator("[name=name]").fill(item.name);
    await form.locator("[name=slug]").fill(item.slug);
    await form
      .locator("[name=description]")
      .fill("Nội dung giả lập trong kiểm thử tự động.");
    await form.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText(item.name, { exact: true })).toBeVisible();
    await page.reload();
    await page
      .getByRole("navigation", { name: "Quản trị", exact: true })
      .getByRole("link", { name: item.tab, exact: true })
      .click();
    await page
      .getByRole("button", { name: `Sửa ${item.name}`, exact: true })
      .click();
    await form.locator("[name=status]").selectOption(item.status);
    if (item.key === "posts")
      await form
        .locator("[name=content]")
        .fill("Nội dung chi tiết đủ để kiểm tra trạng thái xuất bản.");
    await form.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(
      page.locator("tr").filter({ hasText: item.name }),
    ).toContainText(item.status);
    await page
      .getByRole("button", { name: `Xóa ${item.name}`, exact: true })
      .click();
    await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(page.getByText(item.name, { exact: true })).not.toBeVisible();
  }
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Dự án", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xóa Sun Ponte Residence", exact: true })
    .click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(
    page.getByText("Sun Ponte Residence", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Dự án đang có căn hộ liên kết.", { exact: false }),
  ).toBeVisible();
});
