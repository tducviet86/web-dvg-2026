import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createRequire } from "node:module";
import { BE_DIR, E2E_DATABASE_URL } from "../playwright.config";
import { apiAs, login } from "./helpers";
import { groupActivity } from "../src/features/admin/activity";

const SHOTS =
  "/private/tmp/claude-501/-Users-tranducviet-Documents-DVG-WEB/d7e4d8d3-4b31-4315-9fe7-c92d90618232/scratchpad";

/** Every row and card stays inside its panel, and the page never scrolls sideways. */
async function expectNoOverflow(page: Page) {
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 1)
      out.push(
        `page ${document.documentElement.scrollWidth} > ${window.innerWidth}`,
      );
    for (const panel of document.querySelectorAll(".dash-panel, .dash-kpi")) {
      const box = panel.getBoundingClientRect();
      for (const child of panel.querySelectorAll("li, button, .dash-chart")) {
        const r = child.getBoundingClientRect();
        if (r.width && (r.right > box.right + 1 || r.left < box.left - 1))
          out.push(
            `${panel.querySelector("h2")?.textContent ?? "kpi"}: ${child.textContent?.slice(0, 40)}`,
          );
      }
    }
    return out;
  });
  expect(problems).toEqual([]);
}

test("Tổng quan: 3D project map, numbers for a chosen period, panels that fit", async ({
  page,
}) => {
  // Real units (the seed only has sample ones) in two projects; drafts, so
  // public listings other tests count stay unchanged. Removed at the end.
  const api = await apiAs();
  const projects = (await api.get(
    "/admin/projects?pageSize=100",
  )) as unknown as {
    data: { id: string; name: string }[];
  };
  const created: string[] = [];
  const byName = (name: string) =>
    projects.data.find((p) => p.name.includes(name))!.id;
  for (const [n, project, availability] of [
    [1, "Monarchy", "AVAILABLE"],
    [2, "Monarchy", "RENTED"],
    [3, "Panoma", "RESERVED"],
  ] as const) {
    const res = await api.send("post", "/admin/properties", {
      name: `Căn tổng quan QA ${n}`,
      projectId: byName(project),
      propertyType: "2pn",
      location: "Đà Nẵng",
      areaM2: 70,
      bedrooms: 2,
      bathrooms: 2,
      description: "Căn hộ kiểm tra trang tổng quan trong Admin.",
      rentPriceVnd: "16000000",
      availability,
      status: "DRAFT",
    });
    expect(res.ok()).toBeTruthy();
    created.push(((await res.json()) as { data: { id: string } }).data.id);
  }
  await login(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin");
  const kpis = page.locator(".dash-kpi");
  await expect(kpis.first()).toBeVisible();
  await expect(kpis.filter({ hasText: "Lượt xem căn hộ" })).toBeVisible();
  await expect(kpis.filter({ hasText: "Yêu cầu tư vấn" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Lượt xem & yêu cầu theo ngày/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tồn kho theo dự án" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Căn được quan tâm nhất" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cần xử lý" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hoạt động gần đây" }),
  ).toBeVisible();

  // The period switch asks the server again and is remembered.
  const range = page.getByRole("group", { name: "Khoảng thời gian" });
  const asked = page.waitForRequest(/\/admin\/dashboard\?days=7/);
  await range.getByRole("button", { name: "7 ngày" }).click();
  await asked;
  await expect(range.getByRole("button", { name: "7 ngày" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".dash-hero p")).toContainText("7 ngày qua");
  await page.reload();
  await expect(
    page
      .getByRole("group", { name: "Khoảng thời gian" })
      .getByRole("button", { name: "7 ngày" }),
  ).toHaveAttribute("aria-pressed", "true");

  // 3D map: one name tag per project; a tag opens that project's units.
  const map = page.getByRole("group", { name: /Bản đồ dự án 3D/ });
  await expect(map.locator("canvas")).toHaveCount(1);
  const tag = map.getByRole("button", { name: /^The Monarchy:/ });
  await expect(tag).toBeVisible();
  await page.waitForTimeout(1800); // towers rising
  await page.screenshot({ path: `${SHOTS}/dashboard.png`, fullPage: true });
  await expectNoOverflow(page);
  const axe = await new AxeBuilder({ page })
    .include(".dash")
    .exclude("canvas")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual(
    [],
  );
  await tag.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin\/properties$/);
  await expect(
    page.getByRole("combobox", { name: "Lọc dự án" }),
  ).not.toHaveValue("");

  // Tablet and phone: everything still fits.
  for (const [width, height, name] of [
    [1024, 900, "tablet"],
    [390, 844, "mobile"],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/admin");
    await expect(page.locator(".dash-kpi").first()).toBeVisible();
    await page.waitForTimeout(1200);
    await expectNoOverflow(page);
    await page.screenshot({
      path: `${SHOTS}/dashboard-${name}.png`,
      fullPage: true,
    });
  }
  for (const id of created) await api.send("delete", `/admin/properties/${id}`);
});

test("Lượt xem theo căn: every viewed unit, adding up to the chart, and the unit list counts the same period", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get(
    "/admin/projects?pageSize=100",
  )) as unknown as { data: { id: string; name: string }[] };
  const projectId = projects.data.find((p) => p.name.includes("Monarchy"))!.id;
  const res = await api.send("post", "/admin/properties", {
    name: "Căn lượt xem QA",
    unitCode: "LX-QA",
    projectId,
    propertyType: "2pn",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn hộ kiểm tra bảng lượt xem theo căn trong Admin.",
    rentPriceVnd: "16000000",
    status: "DRAFT",
  });
  expect(res.ok()).toBeTruthy();
  const id = ((await res.json()) as { data: { id: string } }).data.id;
  // 4 views today (Vietnamese day) on a unit off the site: counted as "Đã ẩn".
  const { Client } = createRequire(`${BE_DIR}/package.json`)("pg");
  const db = new Client({ connectionString: E2E_DATABASE_URL });
  await db.connect();
  await db.query(
    `INSERT INTO property_view_days (property_id, day, views)
     VALUES ($1, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 4)`,
    [id],
  );
  await db.end();

  await login(page);
  await page.goto("/admin");
  const range = page.getByRole("group", { name: "Khoảng thời gian" });
  await range.getByRole("button", { name: "7 ngày" }).click();
  const panel = page.locator(".dash-unit-views");
  await expect(
    panel.getByRole("heading", { name: "Lượt xem theo căn" }),
  ).toBeVisible();
  const row = panel.locator("tbody tr", { hasText: "Căn lượt xem QA" });
  await expect(row).toContainText("LX-QA");
  await expect(row).toContainText("Đã ẩn");
  await expect(row.locator("td.num").first()).toHaveText("4");
  // The rows add up to the total of the chart, said in its split line.
  const total = await panel.locator("tfoot td.num").first().innerText();
  await expect(page.locator(".dash-kinds")).toContainText(
    `${total} lượt trong 7 ngày`,
  );
  await expect(page.locator(".dash-kinds")).toContainText("đã ẩn");
  // The unit list counts views over the same 7 days.
  await page.goto("/admin/properties");
  await expect(
    page.getByRole("columnheader", { name: "Quan tâm (7 ngày)" }),
  ).toBeVisible();
  await api.send("delete", `/admin/properties/${id}`);
});

test("Hoạt động gần đây folds alike changes in a row into one line", () => {
  const entry = (
    id: string,
    action: string,
    entityId: string | null,
    label: string | null,
    actor = "Quản trị",
  ) => ({
    id,
    action,
    entityType: action.split(".")[0],
    entityId,
    label,
    createdAt: "2026-11-12T07:00:00Z",
    actor: { name: actor },
  });
  const lines = groupActivity([
    entry("1", "media.upload", "m1", null),
    entry("2", "media.upload", "m2", null),
    entry("3", "media.upload", "m3", null),
    entry("4", "project.update", "cora", "Cora Tower"),
    entry("5", "project.update", "cora", "Cora Tower"),
    entry("6", "project.update", "slight", "S-Light Tower"),
    entry("7", "media.upload", "m4", null, "Biên tập"),
  ]);
  expect(
    lines.map((l) => [l.action, l.label, l.count, l.sameRecord, l.actor?.name]),
  ).toEqual([
    // Three uploads in a row: "đã tải lên 3 tệp" (another person's stays apart).
    ["media.upload", null, 3, false, "Quản trị"],
    // The same project twice: one line, "· 2 lần".
    ["project.update", "Cora Tower", 2, true, "Quản trị"],
    // Another named project keeps its own line.
    ["project.update", "S-Light Tower", 1, true, "Quản trị"],
    ["media.upload", null, 1, true, "Biên tập"],
  ]);
});
