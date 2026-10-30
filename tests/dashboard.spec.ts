import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { apiAs, login } from "./helpers";

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
