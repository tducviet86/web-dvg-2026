import { test, expect } from "@playwright/test";
import { apiAs } from "./helpers";

test("old website URLs move permanently to the matching page", async ({
  request,
}) => {
  for (const [from, to] of [
    ["/ve-chung-toi", "/gioi-thieu"],
    ["/can-ho-cao-cap-monarchy-da-nang", "/du-an/monarchy-apartments"],
    ["/tong-quan-du-an-capital-square-da-nang", "/du-an/capital-square"],
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
});
