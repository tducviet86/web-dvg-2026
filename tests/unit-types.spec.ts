import { test, expect } from "@playwright/test";
import { login } from "./helpers";
import { roomsLabel } from "../src/lib/property-groups";
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
