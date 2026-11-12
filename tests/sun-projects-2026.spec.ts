import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { BE_DIR, E2E_DATABASE_URL } from "../playwright.config";
import { apiAs } from "./helpers";
import {
  BUILDING_BLOCKS,
  BUILDING_PLACES,
  distance,
  planAt,
} from "../src/lib/rental-map";
import { PLAN_ANCHORS, PLAN_OUTLINES } from "../src/lib/floor-plan-outlines";

/**
 * Sun Saphia Residence, S-Light Tower and FourS Tower, as entered in Admin;
 * "UPLOAD" stands for a picture in the library.
 */
type Fixture = {
  slug: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  unitTypes: { name: string; area?: string; image?: string }[];
  towers?: { name: string }[];
  floorPlans: { name: string; image: string }[];
};
// A picture that ships with the site stands in for the developer's.
const PICTURE = "/images/projects/cora.jpg";
const PROJECTS = JSON.parse(
  readFileSync("tests/fixtures/sun-projects-2026.json", "utf8").replaceAll(
    "UPLOAD",
    PICTURE,
  ),
) as Fixture[];

const ids: string[] = [];

test.beforeAll(async () => {
  const { Client } = createRequire(`${BE_DIR}/package.json`)("pg");
  const db = new Client({ connectionString: E2E_DATABASE_URL });
  await db.connect();
  await db.query(
    `INSERT INTO media_assets (id, storage, key, url, mime_type, size_bytes, updated_at)
     VALUES (gen_random_uuid(), 'EXTERNAL', $1, $1, 'image/jpeg', 1, now())
     ON CONFLICT DO NOTHING`,
    [PICTURE],
  );
  await db.end();
  const api = await apiAs();
  for (const project of PROJECTS) {
    const res = await api.send("post", "/admin/projects", project);
    expect(res.ok(), await res.text()).toBeTruthy();
    ids.push(((await res.json()) as { data: { id: string } }).data.id);
  }
});

test.afterAll(async () => {
  const api = await apiAs();
  for (const id of ids) await api.send("delete", `/admin/projects/${id}`);
});

const noSideScroll = (page: Page, label: string) =>
  expect
    .poll(
      () =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      { message: label },
    )
    .toBeTruthy();

test("the new Sun projects are listed among projects in development and on the home map", async ({
  page,
}) => {
  await page.goto("/du-an/trien-khai");
  for (const p of PROJECTS)
    await expect(
      page.locator(`main a[href$="/du-an/${p.slug}"]`).first(),
    ).toBeVisible();
  await page.goto("/");
  const towers = page.getByRole("group", { name: "Chọn tòa" });
  for (const p of PROJECTS)
    await expect(
      towers.getByRole("button", { name: p.name, exact: true }),
    ).toBeAttached();
});

for (const p of PROJECTS)
  test(`${p.name}: facts, floor plans, no loan block, 3D floor plans on the map`, async ({
    page,
  }) => {
    await page.goto(`/du-an/${p.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.name);
    const main = page.locator("main");
    await expect(main).toContainText(p.address);
    await expect(main).toContainText(p.unitTypes[0].area!);
    await expect(page.locator("#thanh-toan")).toHaveCount(0);
    await expect(main).not.toContainText("Ước tính dòng tiền");
    const gallery = page.getByRole("group", { name: p.name, exact: true });
    await gallery.getByRole("button", { name: "Mặt bằng" }).click();
    // Plans entered without a tower give way to the ones kept with the site,
    // named for one tower ("Tòa SL1 · Tầng 1").
    const plan = main.locator('img[alt^="Tòa "]').first();
    await expect(plan).toBeVisible();
    await expect(plan).toHaveAttribute(
      "alt",
      p.towers?.length
        ? new RegExp(`^Tòa (${p.towers.map((x) => x.name).join("|")}) · Tầng `)
        : p.floorPlans[0].name,
    );
    const map = page.getByRole("region", { name: "Bản đồ và chỉ đường" });
    await map.scrollIntoViewIfNeeded();
    // Their units traced: the card opens the 3D floor plans, as Capital's.
    await expect(
      map.getByRole("button", { name: "Mở mặt bằng 3D" }),
    ).toBeVisible();
    await noSideScroll(page, `${p.slug} desktop`);
    for (const width of [375, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.name);
      await noSideScroll(page, `${p.slug} at ${width}`);
    }
  });

test("the towers stand where Admin pins them, as tall as their floors", () => {
  const floors = (slug: string) =>
    Math.max(...BUILDING_BLOCKS[slug].map((b) => b.height)) / 3.4;
  for (const p of PROJECTS) {
    expect(BUILDING_BLOCKS[p.slug]?.length).toBeGreaterThan(0);
    expect(
      distance(BUILDING_PLACES[p.slug], { lat: p.latitude, lng: p.longitude }),
    ).toBeLessThan(5);
  }
  const towers = (slug: string) => BUILDING_BLOCKS[slug].map((b) => b.tower);
  expect(towers("fours-tower")).toEqual(["F1", "", "F5", ""]);
  expect(towers("s-light-tower")).toEqual(["SL1", "SL2"]);
  expect(towers("cora-tower")).toEqual(["A1", "A2"]);
  expect(Math.round(floors("sun-saphia-residence"))).toBe(30);
  expect(Math.round(floors("s-light-tower"))).toBe(22);
  expect(Math.round(floors("fours-tower"))).toBe(20);
  expect(Math.round(floors("cora-tower"))).toBe(25);
  expect(floors("sun-saphia-residence")).toBeLessThan(
    floors("monarchy-apartments"),
  );
});

test("a floor pointed at finds its own plan", () => {
  const plans = (slug: string) =>
    PROJECTS.find((p) => p.slug === slug)!.floorPlans;
  const name = (slug: string, tower: string, level: number) =>
    planAt(slug, plans(slug), tower, level)?.name;
  expect(name("fours-tower", "F1", 10)).toBe("Tòa F1 · Tầng 8-19");
  expect(name("fours-tower", "F5", 10)).toBe("Tòa F5 · Tầng 8-15");
  expect(name("fours-tower", "F5", 5)).toBeUndefined();
  expect(name("fours-tower", "", 10)).toBeUndefined();
  // One drawing for both towers; floor 3 before the 3A–6 drawing.
  expect(name("s-light-tower", "SL2", 3)).toBe("Tòa SL1, SL2 · Tầng 3");
  expect(name("s-light-tower", "SL1", 5)).toBe("Tòa SL1, SL2 · Tầng 3A-6");
  expect(name("s-light-tower", "SL2", 15)).toBe("Tòa SL1, SL2 · Tầng 7-21");
  expect(name("sun-saphia-residence", "Saphia", 12)).toBe(
    "Tòa Saphia · Tầng 3A-28",
  );
  expect(name("sun-saphia-residence", "Saphia", 2)).toBeUndefined();
});

test("Saphia's typical floor: every unit of the drawing, on its tower", () => {
  const plan = PLAN_OUTLINES["saphia-tang-3a-28.webp"];
  const units = Object.keys(plan.units);
  expect(units).toHaveLength(28);
  expect(units).toEqual(expect.arrayContaining(["03A", "12A", "12B", "28"]));
  expect(plan.units["12B"].inner).toBe(51.11);
  expect(plan.units["18"].inner).toBe(67.68);
  // The L's two outer corners on the drawing land on the tower's footprint.
  const outline = BUILDING_BLOCKS["sun-saphia-residence"][0];
  const anchors = PLAN_ANCHORS["saphia-tang-3a-28.webp"].site;
  const corners = outline.outline!.map(([x, y]) => [
    x + outline.east,
    y + outline.north,
  ]);
  for (const [e, n] of [anchors[0], anchors[2]])
    expect(
      Math.min(...corners.map(([x, y]) => Math.hypot(x - e, y - n))),
    ).toBeLessThan(0.5);
});

test("the typical floors of Cora, S-Light and FourS: every unit, on its tower", () => {
  const counts: Record<string, number> = {
    "cora-a1-tang-3a-24.webp": 28,
    "cora-a2-tang-3a-24.webp": 28,
    "slight-sl1-tang-3a-6.webp": 20,
    "slight-sl1-tang-7-21.webp": 20,
    "slight-sl2-tang-3a-6.webp": 20,
    "slight-sl2-tang-7-21.webp": 20,
    "fours-f1-tang-8-19.webp": 27,
    "fours-f5-tang-8-15.webp": 34,
  };
  for (const [file, n] of Object.entries(counts)) {
    const plan = PLAN_OUTLINES[file];
    expect(Object.keys(plan.units), file).toHaveLength(n);
    for (const unit of Object.values(plan.units)) {
      expect(unit.inner, file).toBeGreaterThan(25);
      for (const [x, y] of unit.points) {
        expect(x).toBeLessThanOrEqual(plan.width);
        expect(y).toBeLessThanOrEqual(plan.height);
      }
    }
    expect(PLAN_ANCHORS[file]?.site, file).toHaveLength(3);
  }
  expect(PLAN_OUTLINES["cora-a1-tang-3a-24.webp"].units["12"]).toMatchObject({
    inner: 78.9,
    wall: 85.69,
  });
});

test("a unit of Cora opens from its link, with its drawing's name and areas", async ({
  page,
}) => {
  await page.goto("/ban-do?du-an=cora-tower&toa=A1&tang=8&can=12");
  await expect(page.getByRole("heading", { name: "A10812" })).toBeVisible();
  await expect(page.getByText("78,90 m²")).toBeVisible();
  await expect(page.getByText("85,69 m²")).toBeVisible();
});
