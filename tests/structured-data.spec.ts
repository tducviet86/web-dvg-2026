import { test, expect, type Page } from "@playwright/test";
import { openingHours } from "../src/lib/structured-data";
import { apiAs } from "./helpers";

async function schemas(page: Page) {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return blocks
    .map((b) => JSON.parse(b))
    .flatMap((d) => d["@graph"] ?? [d]) as Record<string, unknown>[];
}
const ofType = (nodes: Record<string, unknown>[], type: string) =>
  nodes.find((n) => n["@type"] === type) as
    | (Record<string, unknown> & {
        geo?: Record<string, unknown>;
        offers?: Record<string, unknown>;
      })
    | undefined;

test("working hours text becomes schema.org opening hours", () => {
  expect(openingHours("T2–T7 8:00–18:00")).toEqual(["Mo-Sa 08:00-18:00"]);
  expect(openingHours("Thứ 2 - Chủ nhật: 8h - 20h")).toEqual([
    "Mo-Su 08:00-20:00",
  ]);
  expect(openingHours("8:00-21:30")).toEqual(["Mo-Su 08:00-21:30"]);
  expect(openingHours("T2-T6 8:00-17:30; T7 8:00-12:00")).toEqual([
    "Mo-Fr 08:00-17:30",
    "Sa 08:00-12:00",
  ]);
  expect(openingHours("Theo lịch hẹn")).toBeUndefined();
});

test("company, building and unit pages describe themselves to search engines", async ({
  page,
}) => {
  const admin = await apiAs();
  await admin.send("put", "/admin/settings", {
    values: {
      "company.address": "123 Trần Hưng Đạo, An Hải Tây, Sơn Trà",
      "company.workingHours": "T2–CN 8:00–20:00",
      "company.email": "lienhe@dvg.test",
    },
  });
  await page.goto("/");
  await expect
    .poll(async () => ofType(await schemas(page), "RealEstateAgent")?.address, {
      timeout: 15_000,
    })
    .toBeTruthy();
  const agent = ofType(await schemas(page), "RealEstateAgent")!;
  expect(agent).toMatchObject({
    name: expect.any(String),
    telephone: expect.stringContaining("0911"),
    email: "lienhe@dvg.test",
    openingHours: ["Mo-Su 08:00-20:00"],
    address: {
      streetAddress: "123 Trần Hưng Đạo, An Hải Tây, Sơn Trà",
      addressCountry: "VN",
    },
  });

  await page.goto("/du-an/sun-panoma");
  const complex = ofType(await schemas(page), "ApartmentComplex")!;
  expect(complex).toMatchObject({
    name: "Sun Panoma",
    address: { addressCountry: "VN" },
  });
  expect(complex.geo).toMatchObject({ latitude: expect.any(Number) });

  // Sample units are not real listings: no Apartment schema.
  await page.goto("/cho-thue/can-ho-sun-panoma-demo-02");
  expect(ofType(await schemas(page), "Apartment")).toBeUndefined();

  // A real unit: rooms, size and a monthly rent offer in VND.
  const units = (await admin.get(
    "/admin/properties?pageSize=100",
  )) as unknown as {
    data: { id: string; slug: string; updatedAt: string }[];
  };
  const unit = units.data.find((u) => u.slug === "can-ho-sun-panoma-demo-02")!;
  await admin.send("patch", `/admin/properties/${unit.id}`, {
    isDemo: false,
    expectedUpdatedAt: unit.updatedAt,
  });
  await page.reload();
  const apartment = ofType(await schemas(page), "Apartment")!;
  expect(apartment).toMatchObject({
    floorSize: { unitCode: "MTK" },
    containedInPlace: { "@type": "ApartmentComplex", name: "Sun Panoma" },
    offers: {
      "@type": "Offer",
      priceCurrency: "VND",
      priceSpecification: { unitCode: "MON" },
    },
  });
  expect(apartment.offers?.price).toBeGreaterThan(1_000_000);
  const fresh = (await admin.get(
    `/admin/properties/${unit.id}`,
  )) as unknown as {
    data: { updatedAt: string };
  };
  await admin.send("patch", `/admin/properties/${unit.id}`, {
    isDemo: true,
    expectedUpdatedAt: fresh.data.updatedAt,
  });
});
