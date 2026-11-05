import { productPath } from "../src/lib/project-products";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { API_URL } from "../playwright.config";
import { apiAs } from "./helpers";
import { telephoneHref } from "../src/lib/company-contact";
import { pickFeaturedRentals } from "../src/components/home-rentals";
import type { Property } from "../src/types";

test("project entry points separate introductions from operations", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Xem chi tiết Capital Square", exact: true })
    .click();
  await expect(page).toHaveURL(/\/du-an\/capital-square$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Capital Square",
  );
  await expect(page.locator("main .contact-form")).toHaveCount(0);
  await expect(page.locator("#tong-quan")).toContainText("bờ Đông sông Hàn");
  await expect(page.locator("#san-pham li")).toHaveCount(3);
  await page.goto("/du-an/van-hanh");
  await expect(page.locator(".home-project-cards article")).toHaveCount(5);
  const monarchy = page.getByRole("navigation", {
    name: /Dịch vụ tại .*Monarchy/,
  });
  await monarchy.getByRole("link", { name: "Cho thuê", exact: true }).click();
  await expect(page.locator(".property-card")).not.toHaveCount(0);
  await expect(page.locator(".property-card .card-meta").first()).toContainText(
    "Monarchy",
  );
  const room = page.locator(".property-card h3 a").first();
  await room.click();
  await expect(page.locator("main .contact-form")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Thông số & nội thất" }),
  ).toBeVisible();
  await expect(page.locator(".room-contact-panel")).toBeVisible();
  await page.goto("/du-an/sun-panoma?nhu-cau=ky-gui#nhu-cau");
  await expect(page).toHaveURL(/nhu-cau=ky-gui/);
  await expect(page.locator(".consign-checklist")).toBeVisible();
  await expect(page.locator(".service-steps li")).toHaveCount(3);
  const hero = page.locator(".hero-search");
  await expect(hero.getByRole("tab", { name: "Ký gửi" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await hero.getByRole("tab", { name: "Mua" }).click();
  await hero.getByRole("button", { name: "Tìm kiếm" }).click();
  await expect(page).toHaveURL(/nhu-cau=mua/);
  await expect(page.locator(".inventory-empty")).toContainText(
    "Chưa có căn bán",
  );
  await expect(page.locator(".property-card")).toHaveCount(0);
  await expect(page.locator("main .contact-form")).toHaveCount(0);
});

test("all portfolio details resolve and room calls use a configured number only", async ({
  page,
  request,
}) => {
  const { data: projects } = (await (
    await request.get(`${API_URL}/api/v1/projects?pageSize=100`)
  ).json()) as { data: { slug: string; name: string }[] };
  expect(projects.length).toBeGreaterThanOrEqual(8);
  for (const project of projects) {
    const response = await page.goto(`/du-an/${project.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1")).toHaveText(project.name);
    await expect(page.locator("main .contact-form")).toHaveCount(0);
  }
  expect(telephoneHref("+84 901 234 567")).toBe("tel:+84901234567");
  expect(telephoneHref("")).toBeNull();
  expect(telephoneHref("javascript:alert(1)")).toBeNull();
  await page.goto("/cho-thue/can-ho-sun-panoma-demo-02");
  const phone = page.locator('.room-contact-panel a[href^="tel:"]');
  await expect(phone).toHaveAttribute("href", "tel:0911296979");
  await expect(phone).toContainText("0911 29 69 79");
  await page.setViewportSize({ width: 390, height: 844 });
  const gallery = await page.locator(".rental-gallery").boundingBox();
  const note = await page.locator(".room-image-note").boundingBox();
  expect(note!.y).toBeGreaterThanOrEqual(gallery!.y + gallery!.height);
  await expect(
    page.locator('.room-mobile-call a[href="tel:0911296979"]'),
  ).toBeVisible();
});

test("project and room layouts fit mobile with accessible content", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of [
    "/du-an",
    "/du-an/trien-khai",
    "/du-an/cora-tower",
    "/du-an/sun-ponte-residence?nhu-cau=thue",
    "/du-an/sam-tower?nhu-cau=ky-gui",
    "/cho-thue/can-ho-sun-panoma-demo-02",
  ]) {
    await page.goto(route);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBeTruthy();
    }
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      route,
    ).toEqual([]);
  }
});

test("project directories open on full-screen photos with their own shortcuts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Vận hành: the same search as "Cho thuê", results listed below.
  await page.goto("/du-an/van-hanh");
  await expect(page.locator("main h1")).toHaveText("Dự án đang vận hành");
  await expect(page.locator("main form")).toHaveCount(1);
  await expect(page.locator("#can-ho .property-card")).not.toHaveCount(0);
  const search = page.locator(".hero-search");
  await search.getByRole("tab", { name: "Mua" }).click();
  await search.getByRole("button", { name: "Tìm kiếm" }).click();
  await expect(page).toHaveURL(/\/du-an\/van-hanh\?nhu-cau=mua/);
  await expect(page.locator("#can-ho h2")).toHaveText("Căn hộ đang bán");
  // Triển khai: shortcuts to each project, no search.
  await page.goto("/du-an/trien-khai");
  await expect(page.locator("main form")).toHaveCount(0);
  const picks = page.getByRole("navigation", { name: "Chọn dự án" });
  await expect(picks.getByRole("link")).not.toHaveCount(0);
  await picks.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/du-an\/[a-z0-9-]+$/);
  // Tất cả: two entry cards.
  await page.goto("/du-an");
  const groups = page.getByRole("navigation", { name: "Nhóm dự án" });
  await groups.getByRole("link", { name: /Đang vận hành/ }).click();
  await expect(page).toHaveURL(/\/du-an\/van-hanh$/);
});

test("home: no search box, project rows open project pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("main form")).toHaveCount(0);
  await expect(
    page.locator("#du-an-trien-khai .showcase-card"),
  ).not.toHaveCount(0);
  await expect(page.locator("#du-an-van-hanh .showcase-card")).toHaveCount(5);
  await page.locator("#du-an-van-hanh .showcase-card a").first().click();
  await expect(page).toHaveURL(/\/du-an\/[a-z0-9-]+$/);
});

test("home features a few rental units under the operated projects", async ({
  page,
}) => {
  // Sample (demo) units never show here: publish a real one first.
  const api = await apiAs();
  const units = (await api.get(
    "/admin/properties?pageSize=100",
  )) as unknown as { data: { projectId?: string; project?: { id: string } }[] };
  const projectId = units.data[0].projectId ?? units.data[0].project!.id;
  await api.send("post", "/admin/properties", {
    name: "Căn tiêu biểu trang chủ QA",
    projectId,
    propertyType: "2pn",
    location: "Đà Nẵng",
    areaM2: 72,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn hộ kiểm tra khối căn tiêu biểu trên trang chủ.",
    rentPriceVnd: "18000000",
    highlight: "hot",
    status: "PUBLISHED",
  });
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "Căn hộ cho thuê tiêu biểu",
  });
  await expect(section).toBeVisible();
  await expect(section).toContainText("Căn tiêu biểu trang chủ QA");
  // Between "Dự án đang triển khai" and "Dự án đang vận hành".
  await expect(
    page.locator("#du-an-trien-khai + #can-ho-tieu-bieu + #du-an-van-hanh"),
  ).toHaveCount(1);
  const tiles = section.locator(".rent-mini");
  expect(await tiles.count()).toBeGreaterThan(0);
  expect(await tiles.count()).toBeLessThanOrEqual(4);
  await expect(tiles.first()).toContainText(/\d{1,3}(\.\d{3})+ vnđ/);
  await section.getByRole("link", { name: "Xem tất cả căn cho thuê" }).click();
  await expect(page).toHaveURL(/\/cho-thue$/);
  await page.goBack();
  await page.locator("#can-ho-tieu-bieu .rent-mini a").first().click();
  await expect(page).toHaveURL(/\/cho-thue\/[^/]+$/);
});

/** The photo starts right under the header (once the entrance has ended). */
const heroTouchesHeader = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector(".rental-hero")!.getBoundingClientRect().top -
          document.querySelector(".site-header")!.getBoundingClientRect()
            .bottom,
      ),
    )
    .toBeLessThanOrEqual(1);

test("a development project sells: unit types, units, payment worked out per unit", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; slug: string; name: string; stage: string }[];
  };
  const project = projects.data.find((p) => p.stage === "UNDER_DEVELOPMENT")!;
  const saved = await api.send("patch", `/admin/projects/${project.id}`, {
    unitTypes: [{ name: "Căn QA 2 phòng ngủ", area: "Khoảng 70 m²", price: "Từ 3 tỷ" }],
    paymentSchedule: [
      { label: "Đợt QA 1", percent: 30, timing: "Khi ký" },
      { label: "Đợt QA 2", percent: 70 },
    ],
  });
  expect(saved.ok()).toBeTruthy();
  const unit = await api.send("post", "/admin/properties", {
    name: "Căn bán QA dự án",
    projectId: project.id,
    propertyType: "2pn",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn hộ kiểm tra trang bán của dự án.",
    forSale: true,
    forRent: false,
    salePriceVnd: "3000000000",
    status: "PUBLISHED",
  });
  expect(unit.ok(), await unit.text()).toBeTruthy();
  await expect
    .poll(async () => {
      await page.goto(`/du-an/${project.slug}`);
      return page.locator("#bang-gia tbody tr").count();
    })
    .toBeGreaterThan(0);
  await expect(page.locator("#bang-gia")).toContainText("Căn QA 2 phòng ngủ");
  await expect(page.locator("#thanh-toan")).toContainText("Đợt QA 2");
  // Calling comes first; the chosen unit still reaches the calculator and the form.
  await page.evaluate(() =>
    document.addEventListener("click", (e) => e.preventDefault()),
  );
  await page
    .locator("#bang-gia tbody tr", { hasText: "3.000.000.000" })
    .first()
    .getByRole("link", { name: "Gọi tư vấn" })
    .click();
  await expect(page.locator("#dang-ky select")).not.toHaveValue("");
  await expect(page.locator(".planner-price input")).toHaveValue(
    "3.000.000.000",
  );
  await expect(page.locator("#thanh-toan table")).toContainText("900.000.000");
  await page.locator("#bang-gia tbody th a").first().click();
  await expect(page).toHaveURL(/\/mua-ban\//);
  const table = page.locator(".room-payment table");
  await expect(table).toContainText("900.000.000");
  await expect(table).toContainText("2.100.000.000");
  // Nothing filled in: the block stays away.
  const cleared = await api.send("patch", `/admin/projects/${project.id}`, {
    paymentSchedule: [],
  });
  expect(cleared.ok()).toBeTruthy();
  await expect
    .poll(async () => {
      await page.goto(`/du-an/${project.slug}`);
      return page.locator("#thanh-toan table").count();
    })
    .toBe(0);
  const id = ((await unit.json()) as { data: { id: string } }).data.id;
  await api.send("delete", `/admin/properties/${id}`);
});

test("a project lists its units one tower at a time, a few at first", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; slug: string; stage: string }[];
  };
  const project = projects.data.find((p) => p.stage === "UNDER_DEVELOPMENT")!;
  const saved = await api.send("patch", `/admin/projects/${project.id}`, {
    towers: [
      { name: "QA1", status: "Đang mở bán" },
      { name: "QA2", status: "Đang nhận booking" },
    ],
  });
  expect(saved.ok()).toBeTruthy();
  const ids: string[] = [];
  for (let n = 0; n < 10; n++) {
    const res = await api.send("post", "/admin/properties", {
      name: `Căn tòa QA ${n}`,
      projectId: project.id,
      propertyType: "2pn",
      unitCode: `QA1-${n}`,
      tower: "QA1",
      floor: 10 + (n % 2),
      location: "Đà Nẵng",
      areaM2: 70,
      bedrooms: 2,
      bathrooms: 2,
      description: "Căn hộ kiểm tra danh sách theo tòa.",
      forSale: true,
      forRent: false,
      salePriceVnd: String(5000000000 + n * 100000000),
      status: "PUBLISHED",
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    ids.push(((await res.json()) as { data: { id: string } }).data.id);
  }
  const rows = page.locator("#bang-gia tbody tr");
  await expect
    .poll(async () => {
      await page.goto(`/du-an/${project.slug}`);
      return rows.count();
    })
    .toBe(8);
  await page.getByRole("button", { name: "Xem thêm 2 căn" }).click();
  await expect(rows).toHaveCount(10);
  // Anywhere on a row opens the unit, except the call button.
  await rows.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(600); // smooth scroll settles
  const cell = (await rows.first().locator("td").first().boundingBox())!;
  await page.mouse.click(cell.x + cell.width / 2, cell.y + cell.height / 2);
  await expect(page).toHaveURL(/\/mua-ban\//);
  await page.goBack();
  await expect(rows).not.toHaveCount(0);
  const more = page.getByRole("button", { name: "Xem thêm 2 căn" });
  if (await more.count()) await more.click();
  await page.locator(".price-filters select").first().selectOption("10");
  await expect(rows).toHaveCount(5);
  // A tower with no units yet asks for a call.
  await page.locator(".tower-tabs button", { hasText: "QA2" }).click();
  await expect(rows).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Gọi nhận danh sách căn" }),
  ).toBeVisible();
  for (const id of ids) await api.send("delete", `/admin/properties/${id}`);
  await api.send("patch", `/admin/projects/${project.id}`, { towers: [] });
});

test("a unit with no photos of its own shows the model unit of its type", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; stage: string }[];
  };
  const project = projects.data.find((p) => p.stage === "UNDER_DEVELOPMENT")!;
  const media = (await api.get("/admin/media?pageSize=10")) as {
    data: { id: string; url: string; mimeType: string }[];
  };
  const images = media.data.filter((m) => m.mimeType.startsWith("image/"));
  const saved = await api.send("patch", `/admin/projects/${project.id}`, {
    photos: [
      { group: "Căn 2 phòng ngủ", image: images[0].url },
      { group: "Căn 2 phòng ngủ", image: images[1].url },
      { group: "Căn 3 phòng ngủ", image: images[2].url },
    ],
  });
  expect(saved.ok(), await saved.text()).toBeTruthy();
  const unit = (name: string, propertyType: string, coverImageId?: string) =>
    api.send("post", "/admin/properties", {
      name,
      projectId: project.id,
      propertyType,
      location: "Đà Nẵng",
      areaM2: 78,
      bedrooms: 2,
      bathrooms: 2,
      description: "Căn hộ kiểm tra ảnh mẫu theo loại căn.",
      forSale: true,
      forRent: false,
      salePriceVnd: "3000000000",
      status: "PUBLISHED",
      coverImageId,
    });
  const ids: string[] = [];
  const open = async (name: string, type: string, cover?: string) => {
    const res = await unit(name, type, cover);
    expect(res.ok(), await res.text()).toBeTruthy();
    const { id, slug } = ((await res.json()) as {
      data: { id: string; slug: string };
    }).data;
    ids.push(id);
    await expect
      .poll(async () => (await page.goto(`/mua-ban/${slug}`))?.status())
      .toBe(200);
  };
  const note = page.locator(".room-image-note");
  // 2 PN +1 shares the 2 PN album; the note says the photos are a model.
  await open("Căn QA mẫu 2PN cộng", "2pn-plus");
  await expect(note).toContainText("Hình ảnh căn hộ mẫu");
  await expect(page.locator("main")).toContainText("1 / 2");
  // Its own photo stays, with no model note.
  await open("Căn QA ảnh riêng", "2pn", images[3].id);
  await expect(note).not.toContainText("Hình ảnh căn hộ mẫu");
  for (const id of ids) await api.send("delete", `/admin/properties/${id}`);
  await api.send("patch", `/admin/projects/${project.id}`, { photos: [] });
});

test("a development project page opens on a photo right under the header", async ({
  page,
}) => {
  await page.goto("/du-an/capital-square");
  await expect(page.locator(".rental-hero h1")).toHaveText("Capital Square");
  await heroTouchesHeader(page);
  await expect(page.locator("main")).not.toContainText("Nguồn thông tin");
});

test("a product row of a project opens its own page when it has one", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { slug: string; name: string; stage: string; products: string[] }[];
  };
  const project = projects.data.find(
    (p) => p.stage === "UNDER_DEVELOPMENT" && p.products.length > 1,
  )!;
  const path = productPath(project.slug, project.products[0]);
  const created = await api.send("post", "/admin/pages", {
    path,
    title: "Trang chi tiết sản phẩm QA",
    intro: "Giới thiệu sản phẩm để kiểm tra trang chi tiết.",
    sections: [
      { heading: "Các loại căn", body: "- Căn 1 phòng ngủ\n- Căn 2 phòng ngủ" },
    ],
    status: "PUBLISHED",
  });
  expect(created.ok()).toBeTruthy();
  const { id } = (await created.json()).data as { id: string };
  await page.goto(`/du-an/${project.slug}`);
  const rows = page.locator("#san-pham li");
  // Only the row with a page is a link.
  await expect(rows.first().locator("a")).toHaveAttribute("href", `/${path}`);
  await expect(rows.nth(1).locator("a")).toHaveCount(0);
  await rows.first().locator("a").click();
  await expect(page).toHaveURL(new RegExp(`/${path}$`));
  await expect(page.locator("h1")).toHaveText("Trang chi tiết sản phẩm QA");
  await expect(page.locator(".project-product-sections li")).toHaveCount(2);
  await heroTouchesHeader(page);
  await expect(page.locator("main")).toContainText(project.name);
  await page
    .locator(".project-product-aside")
    .getByRole("link", { name: `Về trang ${project.name}` })
    .click();
  await expect(page).toHaveURL(new RegExp(`/du-an/${project.slug}$`));
  // Phones: nothing sideways.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/${path}`);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await api.send("delete", `/admin/pages/${id}`);
});

test("featured rentals: much-viewed units rise above HOT without a badge", () => {
  const unit = (slug: string, extra: Partial<Property> = {}) =>
    ({ id: slug, slug, status: "Còn trống", ...extra }) as Property;
  const order = pickFeaturedRentals(
    [
      unit("moi"),
      unit("hot", { highlight: "hot" }),
      unit("it-xem", { interestScore: 12 }),
      unit("dong-xem", { interestScore: 35, trending: true }),
      unit("rat-dong-xem", { interestScore: 180, trending: true }),
      unit("hot-het-phong", { highlight: "hot", status: "Đã thuê" }),
    ],
    6,
  ).map((p) => p.slug);
  expect(order).toEqual([
    "rat-dong-xem",
    "dong-xem",
    "hot",
    "it-xem",
    "moi",
    "hot-het-phong",
  ]);
});
