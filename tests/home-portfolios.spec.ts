import { test, expect } from "@playwright/test";
test("home portfolios follow business order and preserve chosen project in contact form", async ({
  page,
}) => {
  await page.goto("/");
  const sections = await page
    .locator("main > section")
    .evaluateAll((nodes) => nodes.map((n) => n.id || n.className));
  expect(sections).toEqual([
    "corporate-banner",
    "du-an-trien-khai",
    "du-an-van-hanh",
    "linh-vuc",
    "signature-journal",
    "signature-connect",
  ]);
  await expect(page.locator("#du-an-trien-khai article")).toHaveCount(3);
  await expect(page.locator("#du-an-van-hanh article")).toHaveCount(5);
  await page
    .getByRole("link", { name: "Tư vấn dự án Capital Square", exact: true })
    .click();
  await expect(page.locator("textarea[name=message]")).toHaveValue(
    "Tôi muốn được tư vấn về dự án Capital Square.",
  );
  const f = page.locator(".contact-form");
  await f.locator("[name=name]").fill("Khách kiểm tra");
  await f.locator("[name=phone]").fill("0901234567");
  await f.locator("[name=email]").fill("test@example.com");
  await f.locator("[name=consent]").check();
  await f.getByRole("button", { name: "Đăng ký tư vấn" }).click();
  await expect(f.getByText("Vui lòng chọn nhu cầu tư vấn.")).toBeVisible();
  await f
    .getByRole("combobox")
    .selectOption({ label: "Tư vấn mua bán bất động sản" });
  await f.getByRole("button", { name: "Đăng ký tư vấn" }).click();
  await expect(f.getByRole("status")).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("dvg:leads") || "[]")[0].message,
    ),
  ).toBe(
    "[Tư vấn mua bán bất động sản] Tôi muốn được tư vấn về dự án Capital Square.",
  );
  await page.goto("/lien-he?intent=ky-gui");
  await expect(page.getByRole("combobox")).toHaveValue(
    "Ký gửi bán hoặc cho thuê",
  );
});
