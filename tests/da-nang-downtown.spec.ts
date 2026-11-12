import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { BE_DIR, E2E_DATABASE_URL } from "../playwright.config";
import { apiAs } from "./helpers";
import {
  BUILDING_BLOCKS,
  BUILDING_PLACES,
  FIREWORKS,
  FLOOR_METRES,
  distance,
} from "../src/lib/rental-map";

/** Da Nang Downtown as entered in Admin; "UPLOAD" is a picture in the library. */
const PICTURE = "/images/projects/cora.jpg";
const PROJECT = JSON.parse(
  readFileSync("tests/fixtures/da-nang-downtown.json", "utf8").replaceAll(
    "UPLOAD",
    PICTURE,
  ),
) as {
  slug: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

let id = "";
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
  const res = await (await apiAs()).send("post", "/admin/projects", PROJECT);
  expect(res.ok(), await res.text()).toBeTruthy();
  id = ((await res.json()) as { data: { id: string } }).data.id;
});

test.afterAll(async () => {
  if (id) await (await apiAs()).send("delete", `/admin/projects/${id}`);
});

const noSideScroll = (page: Page, label: string) =>
  expect
    .poll(
      () =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      { message: label },
    )
    .toBeTruthy();

test("the 69-floor tower rises to 408 m by the river, the opera house to the north", () => {
  const [tower, crown, opera] = BUILDING_BLOCKS[PROJECT.slug];
  expect(
    distance(BUILDING_PLACES[PROJECT.slug], {
      lat: PROJECT.latitude,
      lng: PROJECT.longitude,
    }),
  ).toBeLessThan(5);
  expect(Math.round(tower.height / FLOOR_METRES)).toBe(69);
  expect(crown).toMatchObject({ base: tower.height, height: 408, crown: true });
  expect(Math.round(opera.height / FLOOR_METRES)).toBe(10);
  expect(opera.north).toBeGreaterThan(700);
  // The fireworks go up over the water, between the tower and Sun Galaxy's
  // grandstand on the far bank.
  expect(FIREWORKS.slug).toBe(PROJECT.slug);
  expect(FIREWORKS.east).toBeGreaterThan(60);
  expect(FIREWORKS.east).toBeLessThan(300);
  expect(FIREWORKS.north).toBeGreaterThan(0);
  expect(
    BUILDING_BLOCKS[PROJECT.slug].some((b) => b.tower === "Sun Galaxy 1"),
  ).toBeTruthy();
});

test("its page: facts and a map without the card, on any screen", async ({
  page,
}) => {
  await page.goto(`/du-an/${PROJECT.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    PROJECT.name,
  );
  await expect(page.locator("main")).toContainText("01 Phan Đăng Lưu");
  const map = page.getByRole("region", { name: "Bản đồ và chỉ đường" });
  await map.scrollIntoViewIfNeeded();
  await expect(map.locator(".rmap-floor-plan")).toBeAttached();
  await expect(map.locator(".rmap-panel")).toHaveCount(0);
  await noSideScroll(page, "desktop");
  for (const width of [375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      PROJECT.name,
    );
    await noSideScroll(page, `at ${width}`);
  }
});

test("the night view over Downtown turns on without errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`/ban-do?du-an=${PROJECT.slug}`);
  const night = page.getByTitle("Xem ban đêm");
  await night.click();
  await expect(night).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(1500);
  await night.click();
  await expect(night).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});
