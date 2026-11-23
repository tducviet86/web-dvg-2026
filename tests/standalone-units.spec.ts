import { test, expect } from "@playwright/test";
import { apiAs, expectErrorPopup, login } from "./helpers";

test("a townhouse outside any project: its place names it, its pin is on the map", async ({
  page,
}) => {
  const api = await apiAs();
  const res = await api.send("post", "/admin/properties", {
    name: "Nhà phố Euro Village kiểm tra",
    propertyType: "nha-pho",
    location: "Euro Village, Sơn Trà, Đà Nẵng",
    latitude: 16.0612,
    longitude: 108.2401,
    areaM2: 100,
    bedrooms: 3,
    bathrooms: 3,
    description:
      "Nhà phố trong khu Euro Village, không thuộc dự án căn hộ nào.",
    rentPriceVnd: "30000000",
    status: "PUBLISHED",
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const { id, slug } = (
    (await res.json()) as { data: { id: string; slug: string } }
  ).data;
  try {
    await expect
      .poll(async () => (await page.goto(`/cho-thue/${slug}`))?.status())
      .toBe(200);
    await expect(page).toHaveTitle(
      /^Nhà phố 100m² tại Euro Village, Sơn Trà, Đà Nẵng cho thuê/,
    );
    // No project in the trail, the spec table or the place section.
    await expect(page.locator(".breadcrumb a")).toHaveText(["Cho thuê căn hộ"]);
    await expect(page.locator("#khu-vuc .signature-kicker")).toHaveText(
      "04 / VỊ TRÍ",
    );
    await expect(page.locator("#khu-vuc h2")).toHaveText(
      "Euro Village, Sơn Trà, Đà Nẵng",
    );
    await expect(page.locator(".room-project-link")).toHaveCount(0);
    // Its card names the place where others name the project.
    await page.goto("/cho-thue?loai=townhouse");
    await expect(
      page
        .locator("article.property-card", {
          has: page.locator(`h3 a[href$="/${slug}"]`),
        })
        .locator(".card-meta span")
        .first(),
    ).toHaveText("Euro Village");
  } finally {
    await api.send("delete", `/admin/properties/${id}`);
  }
});

test("Admin lets a townhouse go without a project, once it has a place", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/properties/new");
  const form = page.locator(".admin-editor-page");
  await form.locator("[name=name]").fill("Mặt bằng lẻ kiểm tra");
  await form
    .locator("[name=description]")
    .fill("Mặt bằng kinh doanh mặt tiền, không thuộc dự án nào.");
  await form.locator("[name=price]").pressSequentially("20000000");
  await form.getByLabel("Mặt bằng", { exact: true }).check();
  await form
    .locator("[name=projectId]")
    .selectOption({ label: "Không thuộc dự án (nhà phố, mặt bằng lẻ)" });
  await form.getByRole("button", { name: "Tạo căn hộ" }).click();
  await expectErrorPopup(page, "Vị trí trên bản đồ");
  await form.locator("[name=latitude]").fill("16.0544");
  await form.locator("[name=longitude]").fill("108.2022");
  await form.getByRole("button", { name: "Tạo căn hộ" }).click();
  await expect(page).toHaveURL(/\/admin\/properties$/);
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?q=mat bang le kiem tra",
  )) as unknown as {
    data: { id: string; projectId: string | null; latitude: number }[];
  };
  expect(units.data[0]).toMatchObject({ projectId: null, latitude: 16.0544 });
  await api.send("delete", `/admin/properties/${units.data[0].id}`);
});
