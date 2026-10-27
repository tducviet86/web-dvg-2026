import { test, expect } from "@playwright/test";
import { apiAs, login } from "./helpers";

const SHOTS =
  "/private/tmp/claude-501/-Users-tranducviet-Documents-DVG-WEB/d7e4d8d3-4b31-4315-9fe7-c92d90618232/scratchpad";

test("a badge picked in Admin shows on the unit card and page; no “Mới đăng”", async ({
  page,
}) => {
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?pageSize=100",
  )) as unknown as {
    data: { id: string; slug: string }[];
  };
  const unit = units.data.find((u) => u.slug === "can-ho-sun-panoma-demo-02")!;
  await login(page);
  await page.goto(`/admin/properties/${unit.id}/edit`);
  const field = page.locator("fieldset", {
    has: page.getByText("Nhãn nổi bật trên thẻ căn"),
  });
  await field.scrollIntoViewIfNeeded();
  await expect(field).toContainText("Đang được quan tâm");
  await field.getByText("Độc quyền", { exact: true }).click();
  await page.screenshot({ path: `${SHOTS}/highlight-admin.png` });
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/properties$/);
  await expect(page.locator(".units-table")).toBeVisible();

  await page.goto("/cho-thue?project=sun-panoma");
  const card = page.locator(".property-card", {
    has: page.locator(`a[href$="/cho-thue/${unit.slug}"]`),
  });
  await expect(card.locator(".lux-badge")).toHaveText(["✦Độc quyền"]);
  await expect(page.getByText("Mới đăng", { exact: true })).toHaveCount(0);
  await card.scrollIntoViewIfNeeded();
  await card.screenshot({ path: `${SHOTS}/highlight-card.png` });

  await page.goto(`/cho-thue/${unit.slug}`);
  await expect(page.locator(".room-quick-facts .lux-badge")).toHaveText([
    "✦Độc quyền",
  ]);

  // Back to no badge.
  const saved = (await api.get(`/admin/properties/${unit.id}`)) as unknown as {
    data: { updatedAt: string; highlight: string | null };
  };
  expect(saved.data.highlight).toBe("exclusive");
  await api.send("patch", `/admin/properties/${unit.id}`, {
    highlight: null,
    expectedUpdatedAt: saved.data.updatedAt,
  });
});

test("the unit list shows whether each unit is for rent, for sale or both", async ({
  page,
}) => {
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?pageSize=100",
  )) as unknown as {
    data: { id: string; slug: string; name: string; updatedAt: string }[];
  };
  const unit = units.data.find((u) => u.slug === "can-ho-sun-panoma-demo-02")!;
  await api.send("patch", `/admin/properties/${unit.id}`, {
    forSale: true,
    salePriceVnd: "2500000000",
    expectedUpdatedAt: unit.updatedAt,
  });
  await login(page);
  await page.goto("/admin/properties");
  await page.getByRole("textbox", { name: "Tìm căn hộ" }).fill(unit.name);
  const row = page.getByRole("row", { name: new RegExp(unit.name) }).first();
  await expect(row.locator(".units-price > span")).toHaveCount(2);
  await expect(row.locator(".units-price")).toContainText("2,5 tỷ");
  await row.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800); // entrance fade
  await page.locator(".units-scroll").screenshot({
    path: `${SHOTS}/listing-column.png`,
  });

  const fresh = (await api.get(`/admin/properties/${unit.id}`)) as unknown as {
    data: { updatedAt: string };
  };
  await api.send("patch", `/admin/properties/${unit.id}`, {
    forSale: false,
    salePriceVnd: null,
    expectedUpdatedAt: fresh.data.updatedAt,
  });
});
