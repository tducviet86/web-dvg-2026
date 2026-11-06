import { test, expect } from "@playwright/test";
import { saleFaqs } from "../src/lib/faq";
import { towerHandover } from "../src/lib/handover";
import { apiAs, login } from "./helpers";

test("old website URLs move permanently to the matching page", async ({
  request,
}) => {
  for (const [from, to] of [
    ["/ve-chung-toi", "/gioi-thieu"],
    ["/can-ho-cao-cap-monarchy-da-nang", "/du-an/monarchy-apartments"],
    ["/tong-quan-du-an-capital-square-da-nang", "/du-an/capital-square"],
    ["/tin-tuc-du-an", "/blog"],
    ["/tin-tuc-du-an/page/9", "/blog"],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(new URL(res.headers().location, "http://x").pathname).toBe(to);
  }
});

test("a title that already names the brand does not get it twice", async ({
  page,
}) => {
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?pageSize=100",
  )) as unknown as { data: { projectId?: string; project?: { id: string } }[] };
  const projectId = units.data[0].projectId ?? units.data[0].project!.id;
  const res = await api.send("post", "/admin/properties", {
    name: "Căn kiểm tra tiêu đề SEO",
    projectId,
    propertyType: "2pn",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn hộ kiểm tra tiêu đề trang không lặp tên thương hiệu.",
    rentPriceVnd: "15000000",
    seoTitle: "Căn 2PN kiểm tra SEO | Đất Vàng Group",
    status: "PUBLISHED",
  });
  expect(res.status()).toBe(201);
  const created = (await res.json()) as { data: { slug: string } };
  await page.goto(`/cho-thue/${created.data.slug}`);
  await expect(page).toHaveTitle("Căn 2PN kiểm tra SEO | Đất Vàng Group");
  // The home page carries the brand and what the company does.
  await page.goto("/");
  await expect(page).toHaveTitle(
    "Đất Vàng Group – Cho thuê, mua bán căn hộ Đà Nẵng",
  );
});

test("/mua-ban is an indexable page that links to the units on sale", async ({
  page,
  request,
}) => {
  const res = await request.get("/mua-ban");
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).not.toMatch(/name="robots" content="noindex/);
  expect(html).toContain('rel="canonical"');
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toMatch(/<loc>[^<]*\/mua-ban<\/loc>/);

  await page.goto("/mua-ban");
  await expect(page).toHaveTitle(/^Mua bán căn hộ Đà Nẵng \| Đất Vàng Group$/);
  await expect(page.locator("h1")).toHaveText("Mua bán căn hộ tại Đà Nẵng");
  // Stays here once the search box has loaded.
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/mua-ban$/);
  // A model apartment's title names its code, so units of the same size do not
  // share a title.
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?pageSize=100",
  )) as unknown as { data: { projectId?: string; project?: { id: string } }[] };
  const projectId = units.data[0].projectId ?? units.data[0].project!.id;
  const ids: string[] = [];
  const slugs: string[] = [];
  for (const code of ["SEO1-10", "SEO1-02"]) {
    const made = await api.send("post", "/admin/properties", {
      name: `Căn mẫu ${code} 2 PN`,
      projectId,
      propertyType: "2pn",
      unitCode: code,
      tower: "SEO1",
      floorNote: "Tầng 5-10",
      location: "Đà Nẵng",
      areaM2: 70,
      bedrooms: 2,
      bathrooms: 2,
      description: "Căn mẫu kiểm tra tiêu đề trang chi tiết căn mẫu.",
      forSale: true,
      forRent: false,
      status: "PUBLISHED",
    });
    expect(made.ok(), await made.text()).toBeTruthy();
    const { data } = (await made.json()) as {
      data: { id: string; slug: string };
    };
    ids.push(data.id);
    slugs.push(data.slug);
  }
  try {
    await page.goto(`/mua-ban/${slugs[0]}`);
    await expect(page).toHaveTitle(/^Căn mẫu SEO1-10 2 PN 70m² tại /);
  } finally {
    for (const id of ids) await api.send("delete", `/admin/properties/${id}`);
  }
  await page.goto("/mua-ban");
  await expect(page.locator(".model-unit-links")).toHaveCount(0);
  // No sideways scrolling on a phone.
  await page.setViewportSize({ width: 375, height: 800 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("admin lists model apartments apart from posted units", async ({
  page,
}) => {
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?pageSize=100",
  )) as unknown as { data: { projectId?: string; project?: { id: string } }[] };
  const projectId = units.data[0].projectId ?? units.data[0].project!.id;
  const made = await api.send("post", "/admin/properties", {
    name: "Căn mẫu TAB1-01 2 PN",
    projectId,
    propertyType: "2pn",
    unitCode: "TAB1-01",
    tower: "TAB1",
    floorNote: "Tầng 5-10",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn mẫu kiểm tra tab trong trang quản trị.",
    forSale: true,
    forRent: false,
    status: "PUBLISHED",
  });
  expect(made.ok(), await made.text()).toBeTruthy();
  const { id } = ((await made.json()) as { data: { id: string } }).data;
  try {
    await login(page);
    await page.goto("/admin/properties");
    const name = page.getByText("Căn mẫu TAB1-01 2 PN");
    await expect(
      page.getByRole("button", { name: /Căn đăng thuê \/ bán/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".units-table, table").first()).toBeVisible();
    await expect(name).toHaveCount(0);
    await page.getByRole("button", { name: /Căn mẫu dự án/ }).click();
    await expect(name).toBeVisible();
    // The chosen tab survives opening a unit and coming back.
    await page.reload();
    await expect(name).toBeVisible();
  } finally {
    await api.send("delete", `/admin/properties/${id}`);
  }
});

test("the unit form keeps project-sale fields to model apartments", async ({
  page,
}) => {
  const projectFields = [
    "tower",
    "viewNote",
    "quota",
    "floorNote",
    "priceExcludesFees",
  ];
  await login(page);
  await page.goto("/admin/properties/new");
  await expect(page.locator("[name=direction]")).toBeVisible();
  for (const name of projectFields)
    await expect(page.locator(`[name=${name}]`), name).toBeHidden();

  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?pageSize=100",
  )) as unknown as { data: { projectId?: string; project?: { id: string } }[] };
  const projectId = units.data[0].projectId ?? units.data[0].project!.id;
  const made = await api.send("post", "/admin/properties", {
    name: "Căn mẫu FORM1-01 2 PN",
    projectId,
    propertyType: "2pn",
    unitCode: "FORM1-01",
    tower: "FORM1",
    floorNote: "Tầng 5-10",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn mẫu kiểm tra các trường trong form quản trị.",
    forSale: true,
    forRent: false,
    status: "PUBLISHED",
  });
  expect(made.ok(), await made.text()).toBeTruthy();
  const { id } = ((await made.json()) as { data: { id: string } }).data;
  try {
    await page.goto(`/admin/properties/${id}/edit`);
    await expect(page.locator("[name=tower]")).toBeVisible();
    await expect(page.locator("[name=tower]")).toHaveValue("FORM1");
    await expect(page.locator("[name=floorNote]")).toBeVisible();
  } finally {
    await api.send("delete", `/admin/properties/${id}`);
  }
});

test("the contact page's back button is below the fixed header", async ({
  browser,
  baseURL,
}) => {
  for (const [width, height] of [
    [375, 800],
    [1280, 800],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      locale: "vi-VN",
      baseURL,
    });
    const page = await context.newPage();
    await page.goto("/lien-he");
    const header = await page.locator("header.site-header").boundingBox();
    const back = await page.locator(".rental-hero-crumbs").boundingBox();
    expect(back!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    await context.close();
  }
});

test("what AI assistants read: company, sales and no empty headings", async ({
  page,
  request,
}) => {
  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toContain("/mua-ban");
  expect(llms).toContain("Đất Vàng Luxury");

  const about = await (await request.get("/gioi-thieu")).text();
  expect(about).toContain('"RealEstateAgent"');
  expect(about).toContain('"alternateName"');
  expect(about).toContain("công ty bất động sản tại Đà Nẵng");

  await page.goto("/");
  const headings = await page.locator("h2").allTextContents();
  expect(headings.filter((h) => !h.trim())).toEqual([]);

  const sale = await (await request.get("/mua-ban")).text();
  expect(sale).toContain('"FAQPage"');

  // Only stored facts: nothing to say means no question; handover stays out.
  const faqs = saleFaqs(
    "Dự án QA",
    {
      address: null,
      location: "Bên sông Hàn · Đà Nẵng",
      developer: null,
      legalStatus: "Sở hữu lâu dài.",
      scale: null,
      towers: [
        { name: "C4", status: "" },
        {
          name: "C3",
          note: "Royal Place",
          status: "",
          handover: "Quý IV/2028",
        },
      ],
      handoverNote: "Quý IV/2027",
    },
    [
      { bedrooms: 1, area: 45 },
      { bedrooms: 1, area: 47.5 },
    ],
  );
  const text = faqs.flat().join(" ");
  expect(text).toContain("Dự án QA nằm bên sông Hàn, Đà Nẵng.");
  expect(text).toContain("C3 (Royal Place)");
  expect(text).toContain("45 m² đến 47,5 m²");
  expect(text).not.toContain("Chủ đầu tư");
  // A tower's own handover date is stated beside the project's.
  expect(text).toContain("Quý IV/2027 (tòa C3: Quý IV/2028)");
  const api = {
    handoverNote: "Quý IV/2027",
    towers: [{ name: "C3", handover: "Quý IV/2028" }, { name: "C4" }],
  };
  expect(towerHandover(api, "C3")).toBe("Quý IV/2028");
  expect(towerHandover(api, "C4")).toBe("Quý IV/2027");
});
