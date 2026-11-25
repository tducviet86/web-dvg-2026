import { test, expect } from "@playwright/test";
import { apiAs, expectErrorPopup, login } from "./helpers";
import {
  floorLabel,
  floorNumber,
  roomsLabel,
} from "../src/lib/property-groups";
import { modelTour } from "../src/lib/model-tours";

test("Admin offers 1 PN +1 and Dualkey among the apartment types, in order", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/properties/new");
  const form = page.locator(".admin-editor-page");
  await expect(
    form.locator(".field-pill-group").first().locator(".field-pill"),
  ).toHaveText([
    "Studio",
    "1 phòng ngủ",
    "1 phòng ngủ +1",
    "2 phòng ngủ",
    "2 phòng ngủ +1",
    "Dualkey (2 PN + Studio)",
    "3 phòng ngủ",
    "Shophouse",
    "Căn hộ dịch vụ",
    "Penthouse",
  ]);
  // Picking a type fills bedrooms / bathrooms.
  for (const [type, rooms] of [
    ["Dualkey (2 PN + Studio)", ["3", "3"]],
    ["1 phòng ngủ +1", ["1", "1"]],
  ] as const) {
    await form.getByLabel(type, { exact: true }).check();
    await expect(form.locator("[name=bedrooms]")).toHaveValue(rooms[0]);
    await expect(form.locator("[name=bathrooms]")).toHaveValue(rooms[1]);
  }
});

test("cards name the new types; 1 PN +1 shows the 1 PN model apartment", () => {
  expect(roomsLabel({ bedrooms: 1, typeCode: "1pn-plus" })).toBe("1 PN +1");
  expect(roomsLabel({ bedrooms: 3, typeCode: "dualkey" })).toBe("Dualkey");
  expect(roomsLabel({ bedrooms: 2, typeCode: "2pn-plus" })).toBe("2 PN +1");
  expect(roomsLabel({ bedrooms: 2, typeCode: "2pn" })).toBe("2 PN");
  expect(modelTour("1pn-plus")?.type).toBe("1pn");
  expect(modelTour("2pn-plus")?.type).toBe("2pn");
  expect(modelTour("dualkey")).toBeUndefined();
});

test("Sun projects name floors 4 and 13 as 3A and 12A", () => {
  const sun = { projectSlug: "sun-ponte-residence" };
  expect(floorLabel({ ...sun, floor: 13 })).toBe("Tầng 12A");
  expect(floorLabel({ ...sun, floor: 4 })).toBe("Tầng 3A");
  expect(floorLabel({ ...sun, floor: 14 })).toBe("Tầng 14");
  // Elsewhere floors keep their numbers.
  expect(floorLabel({ projectSlug: "monarchy-apartments", floor: 4 })).toBe(
    "Tầng 4",
  );
  expect(floorLabel({ ...sun, floor: 0 })).toBeUndefined();
  expect(["3A", "12a", " 12A ", "14", ""].map(floorNumber)).toEqual([
    "4",
    "13",
    "13",
    "14",
    "",
  ]);
});

test("Admin takes floor 12A in a Sun project; the site shows it", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")).data as {
    id: string;
    slug: string;
  }[];
  const id = (slug: string) => projects.find((p) => p.slug === slug)!.id;
  const res = await api.send("post", "/admin/properties", {
    name: "Căn kiểm tra tầng 12A",
    projectId: id("sun-ponte-residence"),
    propertyType: "2pn",
    unitCode: "E2E-12A",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    floor: 5,
    tower: "T2",
    description: "Căn hộ hai phòng ngủ để kiểm tra cách ghi tầng.",
    rentPriceVnd: "20000000",
    status: "PUBLISHED",
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const unit = ((await res.json()) as { data: { id: string; slug: string } })
    .data;
  try {
    await login(page);
    const edit = async () => {
      await page.goto(`/admin/properties/${unit.id}/edit`);
      await expect(page.locator("[name=unitCode]")).toHaveValue("E2E-12A");
    };
    await edit();
    const floor = page.locator("[name=floor]");
    const save = page.getByRole("button", { name: "Lưu thay đổi" });
    // Floor 13 does not exist there.
    await floor.fill("13");
    await save.click();
    await expectErrorPopup(page, "13 phải ghi là 12A");
    await floor.fill("12x");
    await save.click();
    await expectErrorPopup(page, "phải là số, hoặc 3A, 12A");
    await floor.fill("12a");
    await save.click();
    await expect(page).toHaveURL(/\/admin\/properties$/);
    const saved = (await api.get(`/admin/properties/${unit.id}`)).data as {
      floor: number;
    };
    expect(saved.floor).toBe(13);
    await edit();
    await expect(floor).toHaveValue("12A");
    // In another project 12A is not a floor.
    await page
      .locator("[name=projectId]")
      .selectOption(id("monarchy-apartments"));
    if (await page.locator("[name=tower]").isVisible())
      await page.locator("[name=tower]").selectOption({ index: 1 });
    await save.click();
    await expectErrorPopup(page, "phải là số nguyên");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/cho-thue/${unit.slug}`);
      await expect(
        page.getByText("12A", { exact: true }).first(),
      ).toBeVisible();
      await page.goto("/cho-thue?du-an=sun-ponte-residence");
      await expect(
        page
          .locator("article.property-card", {
            has: page.locator(`h3 a[href$="/${unit.slug}"]`),
          })
          .locator(".card-meta span")
          .first(),
      ).toContainText("Tầng 12A");
      // A long place never widens the card's text past the card.
      expect(
        await page
          .locator("article.property-card")
          .evaluateAll((all) =>
            all.every((card) => card.scrollWidth <= card.clientWidth),
          ),
      ).toBe(true);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBe(0);
    }
  } finally {
    await api.send("delete", `/admin/properties/${unit.id}`);
  }
});
