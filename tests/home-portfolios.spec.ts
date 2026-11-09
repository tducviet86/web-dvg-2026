import { productPath } from "../src/lib/project-products";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createRequire } from "node:module";
import { API_URL, BE_DIR, E2E_DATABASE_URL } from "../playwright.config";
import { apiAs } from "./helpers";
import { telephoneHref } from "../src/lib/company-contact";
import {
  pickFeaturedRentals,
  pickHomeRentals,
} from "../src/components/home-rentals";
import { PLAN_OUTLINES } from "../src/lib/floor-plan-outlines";
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
  // Between "Dự án đang triển khai" and the map over "Dự án đang vận hành".
  await expect(
    page.locator(
      "#du-an-trien-khai + #can-ho-tieu-bieu + #ban-do-du-an + #du-an-van-hanh",
    ),
  ).toHaveCount(1);
  const tiles = section.locator(".rent-mini");
  expect(await tiles.count()).toBeGreaterThan(0);
  expect(await tiles.count()).toBeLessThanOrEqual(12);
  await expect(tiles.first()).toContainText(/\d{1,3}(\.\d{3})+ vnđ/);
  await section.getByRole("link", { name: "Xem tất cả căn cho thuê" }).click();
  await expect(page).toHaveURL(/\/cho-thue$/);
  await page.goBack();
  // The map opens full screen.
  await expect(
    page.locator("#ban-do-du-an").getByRole("link", {
      name: "Mở bản đồ toàn màn hình",
    }),
  ).toHaveAttribute("href", /\/ban-do$/);
  await page.locator("#can-ho-tieu-bieu .rent-mini a").first().click();
  await expect(page).toHaveURL(/\/cho-thue\/[^/]+$/);
});

test("home rentals: the featured four, then the newest others, up to twelve", () => {
  const unit = (slug: string, extra: Partial<Property> = {}) =>
    ({ id: slug, slug, status: "Còn trống", ...extra }) as Property;
  const units = [
    unit("moi-1"),
    unit("moi-2"),
    unit("hot", { highlight: "hot" }),
    unit("demo", { isDemo: true }),
    ...Array.from({ length: 14 }, (_, i) => unit(`cu-${i}`)),
  ];
  const row = pickHomeRentals(units).map((p) => p.slug);
  expect(row).toHaveLength(12);
  expect(row.slice(0, 4)).toEqual(
    pickFeaturedRentals(units).map((p) => p.slug),
  );
  expect(new Set(row).size).toBe(12);
  expect(row).not.toContain("demo");
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

test("a development project shows towers and model units without prices", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; slug: string; stage: string }[];
  };
  // Capital Square picks towers on its site plan and has its own test.
  const project = projects.data.find(
    (p) => p.stage === "UNDER_DEVELOPMENT" && p.slug !== "capital-square",
  )!;
  const saved = await api.send("patch", `/admin/projects/${project.id}`, {
    unitTypes: [{ name: "Căn QA 2 phòng ngủ", area: "Khoảng 70 m²" }],
    towers: [
      { name: "QA1", status: "Đang mở bán" },
      { name: "QA2", status: "Đang nhận booking" },
    ],
    paymentSchedule: [
      { label: "Đợt QA 1", percent: 30, timing: "Khi ký" },
      { label: "Đợt QA 2", percent: 70 },
    ],
  });
  expect(saved.ok()).toBeTruthy();
  const create = await api.send("post", "/admin/properties", {
    name: "Căn mẫu QA1-06 2 PN",
    projectId: project.id,
    propertyType: "2pn",
    unitCode: "QA1-06",
    tower: "QA1",
    floorNote: "Tầng 5-10",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn mẫu kiểm tra trang dự án và trang chi tiết.",
    forSale: true,
    forRent: false,
    status: "PUBLISHED",
  });
  expect(create.ok(), await create.text()).toBeTruthy();
  const unit = (
    (await create.json()) as {
      data: { id: string; slug: string };
    }
  ).data;
  const section = page.locator("#can-mau");
  await expect
    .poll(async () => {
      await page.goto(`/du-an/${project.slug}`);
      return section.getByText("Căn QA 2 phòng ngủ").count();
    })
    .toBe(1);
  await expect(section).not.toContainText("tỷ");
  await expect(page.locator(".price-table, .sample-units")).toHaveCount(0);
  await expect(page.locator("#thanh-toan")).toContainText("Đợt QA 2");
  // A tower with no plan yet asks for a call.
  await page.locator(".tower-tabs button", { hasText: "QA2" }).click();
  await expect(
    page.getByRole("link", { name: "Liên Hệ Tư Vấn" }),
  ).toBeVisible();
  // The unit's own page shows no price.
  await page.goto(`/mua-ban/${unit.slug}`);
  await expect(page.locator("main")).toContainText("5-10");
  await expect(
    page.locator(".model-hero-panel, .sale-unit-panel"),
  ).not.toContainText("tỷ");
  await api.send("delete", `/admin/properties/${unit.id}`);
  await api.send("patch", `/admin/projects/${project.id}`, {
    towers: [],
    unitTypes: [],
    paymentSchedule: [],
  });
});

test("Capital Square shows its 360° tour and a unit's layout or 3D model", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: {
      id: string;
      slug: string;
      towers: unknown[];
      floorPlans: unknown[];
    }[];
  };
  const project = projects.data.find((p) => p.slug === "capital-square")!;
  // Plans must be in the library; this one ships with the site.
  const { Client } = createRequire(`${BE_DIR}/package.json`)("pg");
  const db = new Client({ connectionString: E2E_DATABASE_URL });
  const planImage =
    "/images/projects/capital-square/mat-bang-c4-tang-5-10.webp";
  await db.connect();
  await db.query(
    `INSERT INTO media_assets (id, storage, key, url, mime_type, size_bytes, updated_at)
     VALUES (gen_random_uuid(), 'EXTERNAL', $1, $1, 'image/webp', 1, now())
     ON CONFLICT DO NOTHING`,
    [planImage],
  );
  await db.end();
  const saved = await api.send("patch", `/admin/projects/${project.id}`, {
    towers: [{ name: "C4", status: "Đang mở bán" }],
    floorPlans: [
      {
        name: "C4 · Tầng 5-10",
        tower: "C4",
        image: planImage,
      },
    ],
  });
  expect(saved.ok(), await saved.text()).toBeTruthy();
  const create = await api.send("post", "/admin/properties", {
    name: "Căn mẫu C4-03 QA",
    projectId: project.id,
    propertyType: "2pn",
    unitCode: "C4-03",
    tower: "C4",
    floorNote: "Tầng 5-10",
    location: "Đà Nẵng",
    areaM2: 65,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn mẫu kiểm tra mặt bằng và ảnh 3D.",
    forSale: true,
    forRent: false,
    status: "PUBLISHED",
  });
  expect(create.ok(), await create.text()).toBeTruthy();
  const unit = ((await create.json()) as { data: { id: string } }).data;
  const spot = page.locator(".plan-spot:not([disabled])").first();
  await expect
    .poll(async () => {
      await page.goto("/du-an/capital-square");
      return page.getByRole("button", { name: "Tòa C4" }).count();
    })
    .toBe(1);
  // The photo album shows no totals.
  await expect(page.locator("#hinh-anh .desk-tabs")).not.toContainText(/\d+$/);
  await expect(page.locator("#hinh-anh .rental-gallery-counter")).toHaveCount(
    0,
  );
  // The 360° tour loads only when the visitor starts it.
  await expect(page.locator(".tour-view")).toHaveCount(0);
  await page.locator(".tour-start").click();
  await expect(page.locator(".tour-view")).toHaveCount(1);
  // Full screen fills the window, on any device; only "Thoát VR360" leaves.
  await page.getByRole("button", { name: "Xem toàn màn hình" }).click();
  await expect(page.locator(".tour-stage.is-full")).toBeVisible();
  await page.getByRole("button", { name: "Thu nhỏ màn hình" }).click();
  await expect(page.locator(".tour-stage.is-full")).toHaveCount(0);
  await expect(page.locator(".tour-view")).toHaveCount(1);
  await page.getByRole("button", { name: "Thoát VR360" }).click();
  await expect(page.locator(".tour-view")).toHaveCount(0);
  await page.locator(".tour-start").click();
  await expect(page.locator(".tour-view")).toHaveCount(1);
  // The floor plan opens and closes from its small button.
  await expect(page.locator(".tour-plan")).toHaveCount(0);
  await page.locator(".tour-plan-toggle").click();
  await expect(page.locator(".tour-plan-dot").first()).toBeVisible();
  await page.locator(".tour-plan-toggle").click();
  await expect(page.locator(".tour-plan")).toHaveCount(0);
  // The site plan: a tower on it dives into that tower's floor plan.
  await page.getByRole("button", { name: "Tòa C4" }).click();
  await expect(page.locator(".tower-head")).toContainText("C4");
  await expect(page.locator(".site-map")).toBeHidden();
  await page.locator(".site-map-back").click();
  await expect(page.locator(".site-map")).toBeVisible();
  await expect(
    page.locator('.site-map polygon[aria-label="Tòa C3"]'),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Tòa C4" }).click();
  // A chosen unit shows its layout or its 3D model, one at a time.
  await spot.click();
  await expect(page.locator(".plan-zoom-view")).toBeVisible();
  await expect(page.locator(".plan-zoom-model")).toHaveCount(0);
  // Cut along the unit's outline, with the areas printed on the drawing.
  await expect(page.locator(".plan-cut-edge")).toHaveCount(1);
  await expect(page.locator(".plan-cut-facts")).toContainText("Thông thủy");
  const views = page.locator(".plan-zoom-switch button");
  await views.nth(1).click();
  await expect(page.locator(".plan-zoom-model")).toBeVisible();
  await expect(page.locator(".plan-zoom-view")).toHaveCount(0);
  await views.nth(0).click();
  await expect(page.locator(".plan-zoom-view")).toBeVisible();
  await expect(page.locator(".plan-zoom-model")).toHaveCount(0);
  // The model unit's own page is built from the 3D model, with its own tour.
  await page.locator(".plan-open").click();
  await expect(page).toHaveURL(/\/mua-ban\//);
  await expect(page.locator(".model-hero-photo img")).toBeVisible();
  await expect(page.locator(".model-room").first()).toContainText(
    "Phòng khách",
  );
  await page.locator(".tour-start").click();
  await expect(page.locator(".tour-view")).toHaveCount(1);
  await page.locator(".tour-plan-toggle").click();
  await expect(page.locator(".tour-plan-dot").first()).toBeVisible();
  await expect(page.locator(".tour-types")).toHaveCount(0);
  await api.send("delete", `/admin/properties/${unit.id}`);
  await api.send("patch", `/admin/projects/${project.id}`, {
    towers: project.towers,
    floorPlans: project.floorPlans,
  });
});

test("a unit with its own price shows the payment worked out", async ({
  page,
}) => {
  const api = await apiAs();
  const projects = (await api.get("/admin/projects?pageSize=100")) as {
    data: { id: string; stage: string }[];
  };
  const project = projects.data.find((p) => p.stage === "UNDER_DEVELOPMENT")!;
  await api.send("patch", `/admin/projects/${project.id}`, {
    paymentSchedule: [
      { label: "Đợt QA 1", percent: 30 },
      { label: "Đợt QA 2", percent: 70 },
    ],
  });
  const res = await api.send("post", "/admin/properties", {
    name: "Căn có giá QA",
    projectId: project.id,
    propertyType: "2pn",
    location: "Đà Nẵng",
    areaM2: 70,
    bedrooms: 2,
    bathrooms: 2,
    description: "Căn hộ kiểm tra tính số tiền từng đợt.",
    forSale: true,
    forRent: false,
    salePriceVnd: "3000000000",
    status: "PUBLISHED",
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const { id, slug } = (
    (await res.json()) as {
      data: { id: string; slug: string };
    }
  ).data;
  const table = page.locator(".room-payment table");
  await expect
    .poll(async () => {
      await page.goto(`/mua-ban/${slug}`);
      return table.count();
    })
    .toBe(1);
  await expect(table).toContainText("900.000.000");
  await expect(table).toContainText("2.100.000.000");
  await api.send("delete", `/admin/properties/${id}`);
  await api.send("patch", `/admin/projects/${project.id}`, {
    paymentSchedule: [],
  });
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
    const { id, slug } = (
      (await res.json()) as {
        data: { id: string; slug: string };
      }
    ).data;
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

test("tower C3 has its floor plan and a picture for each unit", async ({
  request,
}) => {
  const base = "/images/projects/capital-square";
  const plan = await request.get(`${base}/mat-bang-c3-tang-5-23.webp`);
  expect(plan.status()).toBe(200);
  const units = PLAN_OUTLINES["mat-bang-c3-tang-5-23.webp"].units;
  expect(Object.keys(units)).toHaveLength(9);
  for (const unit of Object.keys(units)) {
    const res = await request.get(
      `${base}/mat-bang-can/c3-tang-5-23/${unit.toLowerCase()}.webp`,
    );
    expect(res.status(), unit).toBe(200);
  }
});
