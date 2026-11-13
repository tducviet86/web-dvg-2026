import { test, expect, type Page } from "@playwright/test";
import { apiAs, humanPause } from "./helpers";

/**
 * Consultation forms: the visitor picks the kind of advice with a chip and
 * leaves contact details — no message to write. The API keeps the need
 * (intent / message) so staff can read the request in Admin › Khách hàng.
 */

const noSideScroll = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

test("contact page: chips instead of a message, link context and server errors", async ({
  page,
}) => {
  await page.goto("/lien-he?intent=thue&project=Sun%20Panoma");
  const form = page.locator(".contact-form");
  await expect(form.locator("textarea")).toHaveCount(0);
  // The link preselects the need and names the project.
  await expect(
    form.getByRole("radio", { name: "Tìm thuê bất động sản" }),
  ).toBeChecked();
  await expect(form.locator(".lead-context")).toContainText("Sun Panoma");
  await form.locator("[name=name]").fill("Khách Chip");
  await form.locator("[name=phone]").fill("0905 111 222");
  await form.locator("[name=email]").fill("chip@example.test");
  await form.locator("[name=consent]").check();

  // A refusal is explained next to the button and keeps the input.
  await page.route("**/api/v1/contact", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "RATE_LIMITED", message: "Too many", requestId: "x" },
      }),
    }),
  );
  await form.getByRole("button", { name: "Đăng ký tư vấn" }).click();
  await expect(form.getByRole("alert")).toContainText("Chưa gửi được yêu cầu");
  await expect(form.locator("[name=name]")).toHaveValue("Khách Chip");
  await page.unroute("**/api/v1/contact");

  await humanPause(page);
  const sent = page.waitForRequest((r) => r.url().endsWith("/api/v1/contact"));
  await form.getByRole("button", { name: "Đăng ký tư vấn" }).click();
  const request = await sent;
  expect(request.postDataJSON()).toMatchObject({
    intent: "Tìm thuê bất động sản",
    phone: "0905111222",
    message: "Tìm thuê bất động sản · Dự án Sun Panoma",
  });
  expect((await request.response())?.status()).toBe(202);
  await expect(form.getByRole("status")).toContainText(
    "Đã nhận yêu cầu của bạn",
  );
  await form.getByRole("button", { name: "Gửi yêu cầu khác" }).click();
  await expect(form.locator("[name=name]")).toHaveValue("");
});

test("project sign-up: a need chip and the unit, no note box", async ({
  page,
}) => {
  await page.goto("/du-an/capital-square");
  const panel = page.locator(".lead-panel");
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator("textarea")).toHaveCount(0);
  await expect(
    panel.getByRole("radio", { name: "Nhận bảng giá và mặt bằng" }),
  ).toBeChecked();
  await panel.getByRole("radio", { name: "Đặt lịch xem nhà mẫu" }).check();
  await panel.getByLabel("Họ và tên").fill("Khách Dự Án");
  await panel.getByLabel("Số điện thoại").fill("0905333444");
  await panel.getByLabel("Email").fill("du-an@example.test");
  await panel.getByLabel(/Tôi đồng ý/).check();
  await humanPause(page);
  const sent = page.waitForRequest((r) =>
    r.url().endsWith("/api/v1/inquiries"),
  );
  await panel.getByRole("button", { name: "Gửi yêu cầu tư vấn" }).click();
  const request = await sent;
  expect(request.postDataJSON()).toMatchObject({
    projectSlug: "capital-square",
    intent: "Mua căn hộ",
  });
  expect(request.postDataJSON().message).toMatch(
    /^Đặt lịch xem nhà mẫu · .* · Dự án /,
  );
  expect((await request.response())?.status()).toBe(202);
  await expect(panel.getByRole("status")).toContainText("Đã gửi yêu cầu");
  const leads = (await (
    await apiAs()
  ).get("/admin/leads?q=du-an@example.test")) as unknown as {
    data: { intent: string; message: string; project: { slug: string } }[];
  };
  expect(leads.data[0]).toMatchObject({
    intent: "Mua căn hộ",
    project: expect.objectContaining({ slug: "capital-square" }),
  });
});

test("lead forms fit a 375px phone without sideways scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/lien-he");
  await page.locator(".contact-form .lead-chips").scrollIntoViewIfNeeded();
  expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
  await page.goto("/du-an/capital-square");
  await page.locator(".lead-panel .lead-chips").scrollIntoViewIfNeeded();
  expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
  await page.goto("/cho-thue/du-an/sun-panoma");
  await page.getByRole("button", { name: "Tư vấn chọn căn" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".lead-chips")).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
});
