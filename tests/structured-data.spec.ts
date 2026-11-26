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
  // Loaded again each time: the first load may still be the older page.
  await expect
    .poll(
      async () => {
        await page.goto("/");
        return ofType(await schemas(page), "RealEstateAgent")?.address;
      },
      { timeout: 15_000 },
    )
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

test("articles name the company as author and publisher, not 'Admin'", async ({
  page,
}) => {
  await page.goto("/blog");
  await page
    .locator('main a[href^="/blog/"]:not([href*="danh-muc"])')
    .first()
    .click();
  await expect(page).toHaveURL(/\/blog\/[^/]+$/);
  const article = ofType(await schemas(page), "Article")!;
  expect(article.publisher).toMatchObject({
    "@type": "Organization",
    name: "Đất Vàng Group",
  });
  expect(article.author).not.toMatchObject({
    "@type": "Person",
    name: "Admin",
  });
});

test("an article's data is in the page's language, at its own address", async ({
  page,
}) => {
  await page.goto("/blog");
  const link = page
    .locator('main a[href^="/blog/"]:not([href*="danh-muc"])')
    .first();
  const path = (await link.getAttribute("href"))!;
  await page.goto(path);
  const vi = ofType(await schemas(page), "Article")!;
  expect(vi).toMatchObject({
    inLanguage: "vi",
    url: expect.stringMatching(new RegExp(`${path}$`)),
  });
  // The stand-in translator writes "EN: …"; wait until it has.
  await expect
    .poll(
      async () => {
        await page.goto(`/en${path}`);
        return ofType(await schemas(page), "Article")?.headline;
      },
      { timeout: 30000 },
    )
    .toMatch(/^EN: /);
  const en = ofType(await schemas(page), "Article")!;
  expect(en).toMatchObject({
    inLanguage: "en",
    url: expect.stringMatching(new RegExp(`/en${path}$`)),
    mainEntityOfPage: expect.stringMatching(new RegExp(`/en${path}$`)),
  });
});

test("every page names the legal entity and its tax code", async ({ page }) => {
  await page.goto("/lien-he");
  const footer = page.locator(".footer-bottom");
  await expect(footer).toContainText(
    "Công ty Cổ phần Đất Vàng Group · MST: 0401876570",
  );
  await expect(footer).toContainText("Shophouse B0103 Monarchy");
  await page.goto("/");
  const agent = ofType(await schemas(page), "RealEstateAgent");
  expect(agent?.taxID).toBe("0401876570");
  expect(agent?.legalName).toBeTruthy();
});
