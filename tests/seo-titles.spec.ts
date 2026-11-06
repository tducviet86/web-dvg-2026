import { test, expect } from "@playwright/test";
import { apiAs } from "./helpers";

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
  // Every model apartment is a real link, sorted by its code; the title names
  // the code, so units of the same size do not share a title.
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
      description: "Căn mẫu kiểm tra danh sách liên kết trên trang mua bán.",
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
    const codes = page.locator(".model-unit-links a strong");
    await expect
      .poll(async () => {
        await page.goto("/mua-ban");
        return (await codes.allTextContents()).filter((c) =>
          c.startsWith("SEO1-"),
        );
      })
      .toEqual(["SEO1-02", "SEO1-10"]);
    await expect(
      page.locator(`.model-unit-links a[href="/mua-ban/${slugs[0]}"]`),
    ).toBeVisible();
    await page.goto(`/mua-ban/${slugs[0]}`);
    await expect(page).toHaveTitle(/^Căn mẫu SEO1-10 2 PN 70m² tại /);
  } finally {
    for (const id of ids) await api.send("delete", `/admin/properties/${id}`);
  }
  await page.goto("/mua-ban");
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
