import { test, expect } from "@playwright/test";
import { apiAs, login } from "./helpers";

const SHOTS =
  "/private/tmp/claude-501/-Users-tranducviet-Documents-DVG-WEB/d7e4d8d3-4b31-4315-9fe7-c92d90618232/scratchpad";

test("amenities ticked in Admin appear grouped with icons on the unit page", async ({
  page,
}) => {
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?pageSize=100",
  )) as unknown as { data: { id: string; slug: string }[] };
  const unit = units.data.find((u) => u.slug === "can-ho-sun-panoma-demo-02")!;
  await login(page);
  await page.goto(`/admin/properties/${unit.id}/edit`);
  const picker = page.locator(".amenity-picker");
  await picker.scrollIntoViewIfNeeded();
  for (const label of ["Bồn tắm", "Máy sấy tóc", "Máy giặt", "Wi-Fi", "Hồ bơi"])
    await picker.getByText(label, { exact: true }).click();
  await expect(picker.locator(".amenity-count")).toContainText("5");
  await page.screenshot({ path: `${SHOTS}/amenity-admin.png` });
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/properties$/);
  const saved = (await api.get(`/admin/properties/${unit.id}`)) as unknown as {
    data: { amenities: string[] };
  };
  expect(saved.data.amenities).toEqual([
    "bathtub",
    "hair-dryer",
    "washer",
    "wifi",
    "pool",
  ]);

  await page.goto(`/cho-thue/${unit.slug}`);
  const section = page.locator("#tien-nghi");
  await expect(
    section.getByRole("heading", { name: "Tiện ích căn hộ" }),
  ).toBeVisible();
  await expect(section).toContainText("5 tiện nghi");
  await expect(section.locator(".room-amenity-group h3")).toHaveText([
    "Phòng tắm",
    "Phòng ngủ và giặt là",
    "Phòng khách và làm việc",
    "Tiện ích tòa nhà",
  ]);
  await expect(section.locator("li svg")).toHaveCount(5);
  await expect(
    page.locator('.room-anchor-nav a[href="#tien-nghi"]'),
  ).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/amenity-room.png` });

  // Unticking everything hides the section.
  await api.send("patch", `/admin/properties/${unit.id}`, {
    amenities: [],
    expectedUpdatedAt: (
      (await api.get(`/admin/properties/${unit.id}`)) as unknown as {
        data: { updatedAt: string };
      }
    ).data.updatedAt,
  });
  await page.reload();
  await expect(page.locator("#tien-nghi")).toHaveCount(0);
});

test("AI drafts a unit title and description from the form, with undo", async ({
  page,
}) => {
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?pageSize=100",
  )) as unknown as {
    data: { id: string; slug: string }[];
  };
  const unit = units.data.find((u) => u.slug === "can-ho-sun-panoma-demo-02")!;
  await login(page);
  await page.goto(`/admin/properties/${unit.id}/edit`);
  const description = page.locator("textarea[name=description]");
  const title = page.locator("input[name=name]");
  const before = await description.inputValue();
  const titleBefore = await title.inputValue();
  await page.locator("[name=area]").fill("88");
  const ai = page.getByRole("button", {
    name: /tiêu đề & mô tả bằng AI/,
  });
  await ai.scrollIntoViewIfNeeded();
  await ai.click();
  await expect(description).toHaveValue(
    "Căn hộ rộng 88 m², sẵn sàng đón khách.\n\n- Phòng khách thoáng, nhiều ánh sáng.\n- Nội thất đầy đủ, dọn vào ở ngay.",
  );
  await expect(title).toHaveValue("Căn 88 m² full nội thất, dọn vào ở ngay");
  await page.screenshot({ path: `${SHOTS}/ai-describe.png` });
  // Undo puts the previous text back; nothing is saved until "Lưu".
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(description).toHaveValue(before);
  await expect(title).toHaveValue(titleBefore);
  // With the title cleared, AI fills it again.
  await title.fill("");
  await ai.click();
  await expect(title).toHaveValue("Căn 88 m² full nội thất, dọn vào ở ngay");
});
