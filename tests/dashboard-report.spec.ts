import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { BE_DIR, SITE_URL } from "../playwright.config";
import { apiAs, login } from "./helpers";

// ExcelJS lives in the API, which builds the file; the test reads it back with it.
const ExcelJS = createRequire(`${BE_DIR}/package.json`)("exceljs");
const SHOTS =
  "/private/tmp/claude-501/-Users-tranducviet-Documents-DVG-WEB/1ed4371a-dc54-47f4-b9a2-bcc57b331c95/scratchpad";

const pad = (n: number) => String(n).padStart(2, "0");

/** Clicks "Tải file .xlsx" and opens the workbook that downloads. */
async function download(page: Page) {
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Tải file .xlsx" }).click(),
  ]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(await file.path());
  return {
    name: file.suggestedFilename(),
    sheets: wb.worksheets.map((w: { name: string }) => w.name) as string[],
  };
}

test("Xuất Excel: a month or a span of days downloads the report", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Xuất Excel" }).click();
  const dialog = page.getByRole("dialog", { name: "Xuất báo cáo Excel" });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/report-desktop.png` });

  // This month, the default: up to today, named by the month.
  const now = new Date();
  await expect(dialog.getByRole("status")).toContainText(
    `01/${pad(now.getMonth() + 1)}/${now.getFullYear()} – ${pad(now.getDate())}/`,
  );
  const monthly = await download(page);
  expect(monthly.name).toBe(
    `T${now.getMonth() + 1}⁄${now.getFullYear()}-Báo Cáo WEB Đất Vàng Group.xlsx`,
  );
  expect(monthly.sheets).toEqual([
    "Tổng quan",
    "Theo ngày",
    "Theo căn hộ",
    "Theo dự án",
    "Nguồn truy cập",
    "Lượt bấm gọi",
    "Khách liên hệ",
  ]);
  await expect(dialog).toBeHidden();
  await expect(page.getByText(`Đã tải báo cáo ${monthly.name}`)).toBeVisible();

  // A span of days: the last 30 by default; a start after the end is refused.
  await page.getByRole("button", { name: "Xuất Excel" }).click();
  await dialog.getByRole("button", { name: "Theo khoảng ngày" }).click();
  await expect(dialog.getByRole("status")).toContainText("30 ngày");
  const span = await download(page);
  expect(span.name).toMatch(
    /^\d{1,2}⁄\d{1,2}-\d{1,2}⁄\d{1,2}-Báo Cáo WEB Đất Vàng Group\.xlsx$/,
  );
  await page.getByRole("button", { name: "Xuất Excel" }).click();
  await dialog.getByRole("button", { name: "Theo khoảng ngày" }).click();
  await dialog.locator(".date-trigger").first().click();
  // The start opens on its month (30 days ago): two months on is the future.
  await dialog.getByRole("button", { name: /Tháng sau/ }).click();
  await dialog.getByRole("button", { name: /Tháng sau/ }).click();
  await dialog.locator(".date-grid button").nth(20).click();
  await expect(dialog.getByRole("status")).toContainText(
    /chưa bắt đầu|phải trước/,
  );
  await expect(
    dialog.getByRole("button", { name: "Tải file .xlsx" }),
  ).toBeDisabled();
});

test("Xuất Excel without the right to export contacts: no contact sheet", async ({
  page,
}) => {
  await login(page, "editor");
  await page.goto("/admin");
  await page.getByRole("button", { name: "Xuất Excel" }).click();
  const dialog = page.getByRole("dialog", { name: "Xuất báo cáo Excel" });
  await expect(dialog).toContainText("không gồm danh sách khách liên hệ");
  const file = await download(page);
  expect(file.sheets).not.toContain("Khách liên hệ");
});

test("Xuất Excel fits a phone: the picker stays on screen", async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto("/admin");
  await page.getByRole("button", { name: "Xuất Excel" }).click();
  const dialog = page.getByRole("dialog", { name: "Xuất báo cáo Excel" });
  await expect(dialog).toBeVisible();
  const inside = () =>
    page.evaluate(() => {
      const out: string[] = [];
      if (document.documentElement.scrollWidth > window.innerWidth + 1)
        out.push("page scrolls sideways");
      const box = document.querySelector(".report-dialog")!;
      if (box.scrollWidth > box.clientWidth + 1)
        out.push("dialog scrolls sideways");
      for (const el of box.querySelectorAll(
        "button, select, .date-picker, .date-popover",
      )) {
        const r = el.getBoundingClientRect();
        if (r.width && (r.left < 0 || r.right > window.innerWidth))
          out.push(`${el.className || el.tagName}: ${r.left}–${r.right}`);
      }
      return out;
    });
  expect(await inside()).toEqual([]);
  await page.screenshot({ path: `${SHOTS}/report-month-mobile.png` });
  await dialog.getByRole("button", { name: "Theo khoảng ngày" }).click();
  await dialog.locator(".date-trigger").last().click();
  await expect(dialog.locator(".date-popover")).toBeVisible();
  await page.waitForTimeout(300); // the calendar fades in
  expect(await inside()).toEqual([]);
  await page.screenshot({ path: `${SHOTS}/report-range-mobile.png` });
});

test("Khách bấm gọi: a tap on a unit page's phone link shows on Tổng quan and in the report", async ({
  page,
  browser,
}) => {
  const api = await apiAs();
  const projects = (await api.get(
    "/admin/projects?pageSize=100",
  )) as unknown as {
    data: { id: string; name: string }[];
  };
  const res = await api.send("post", "/admin/properties", {
    name: "Căn bấm gọi QA",
    projectId: projects.data.find((p) => p.name.includes("Monarchy"))!.id,
    propertyType: "2pn",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn hộ kiểm tra lượt bấm gọi trong trang tổng quan Admin.",
    rentPriceVnd: "16000000",
    status: "DRAFT",
  });
  expect(res.ok()).toBeTruthy();
  const unit = ((await res.json()) as { data: { id: string; slug: string } })
    .data;
  await api.send("patch", `/admin/properties/${unit.id}`, {
    status: "PUBLISHED",
  });
  try {
    // A visitor (not signed in to Admin) taps the phone link.
    const visitor = await browser.newContext({
      baseURL: SITE_URL,
      locale: "vi-VN",
      // Headless Chrome says so in its user agent and is left out as a robot.
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    });
    const guest = await visitor.newPage();
    await guest.goto(`/cho-thue/${unit.slug}`);
    await guest.evaluate(() =>
      window.addEventListener("click", (e) => e.preventDefault()),
    );
    const [sent] = await Promise.all([
      guest.waitForResponse((r) => r.url().includes("/api/v1/contact-clicks")),
      guest.locator('a[href^="tel:"]').first().click(),
    ]);
    expect(sent.status()).toBe(204);
    expect(sent.request().postDataJSON()).toMatchObject({
      kind: "call",
      unit: unit.slug,
      path: `/cho-thue/${unit.slug}`,
    });
    await visitor.close();

    await login(page);
    await page.goto("/admin");
    await expect(
      page.locator(".dash-kpi").filter({ hasText: "Khách bấm gọi" }),
    ).toBeVisible();
    const panel = page.locator("#dash-calls");
    await expect(panel).toContainText("Căn bấm gọi QA");
    await expect(panel).toContainText("Bấm gọi");
    await panel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900); // panels rise in
    await panel.screenshot({ path: `${SHOTS}/dashboard-calls.png` });
    // On a phone: the panel fits, nothing scrolls sideways.
    await page.setViewportSize({ width: 390, height: 844 });
    await panel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await panel.screenshot({ path: `${SHOTS}/dashboard-calls-mobile.png` });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Xuất Excel" }).click();
    const file = await download(page);
    expect(file.sheets).toContain("Lượt bấm gọi");
  } finally {
    await api.send("delete", `/admin/properties/${unit.id}`);
  }
});
