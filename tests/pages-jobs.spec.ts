import { test, expect } from "@playwright/test";
import { apiAs, login } from "./helpers";

const SHOTS =
  "/private/tmp/claude-501/-Users-tranducviet-Documents-DVG-WEB/d7e4d8d3-4b31-4315-9fe7-c92d90618232/scratchpad";

test("services are edited in Admin and the header menu follows", async ({
  page,
}) => {
  const api = await apiAs();
  const list = (await api.get(
    "/admin/pages?kind=SERVICE&pageSize=100",
  )) as unknown as { data: { id: string; path: string; updatedAt: string }[] };
  const service = list.data.find((p) => p.path === "dich-vu/tu-van-dau-tu")!;
  const before = (await api.get(`/admin/pages/${service.id}`)) as unknown as {
    data: Record<string, unknown>;
  };

  await login(page);
  await page.goto("/admin/pages");
  await page.getByLabel("Lọc loại trang").selectOption("SERVICE");
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page.goto(`/admin/pages/${service.id}/edit`);
  await page
    .getByLabel("Mô tả ngắn trên menu")
    .fill("Đồng hành từng quyết định");
  await page.getByRole("button", { name: "Thêm mục" }).click();
  await page.getByLabel("Tiêu đề mục 4").fill("Quy trình tư vấn");
  await page
    .getByLabel("Nội dung mục 4")
    .fill("- Lắng nghe mục tiêu\n- Phân tích thị trường\n- Đề xuất phương án");
  await page.getByRole("button", { name: "Đưa mục 4 lên" }).click();
  await page.locator("#field-sections").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${SHOTS}/admin-service.png`,
    fullPage: false,
  });
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);

  // The new section shows (third, as a list) and the menu has the new line.
  await page.goto("/dich-vu/tu-van-dau-tu");
  await expect(page.locator("article h2").nth(2)).toHaveText(
    "Quy trình tư vấn",
  );
  await expect(page.locator("article li")).toContainText([
    "Lắng nghe mục tiêu",
  ]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .locator(".desktop-nav .nav-item", { hasText: "Lĩnh vực hoạt động" })
    .hover();
  await expect(
    page.locator(".mega-menu").getByText("Đồng hành từng quyết định"),
  ).toBeVisible();

  // Restore.
  const now = (await api.get(`/admin/pages/${service.id}`)) as unknown as {
    data: { updatedAt: string };
  };
  const b = before.data as {
    path: string;
    kind: string;
    title: string;
    eyebrow: string | null;
    intro: string;
    summary: string | null;
    sections: unknown[];
    sortOrder: number;
    inMenu: boolean;
    linkHref: string | null;
    status: string;
  };
  await api.send("patch", `/admin/pages/${service.id}`, {
    path: b.path,
    kind: b.kind,
    title: b.title,
    eyebrow: b.eyebrow,
    intro: b.intro,
    summary: b.summary,
    sections: b.sections,
    sortOrder: b.sortOrder,
    inMenu: b.inMenu,
    linkHref: b.linkHref,
    status: b.status,
    expectedUpdatedAt: now.data.updatedAt,
  });
});

test("a job posted in Admin can be found, applied for with a CV and reviewed", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/jobs/new");
  await page.getByLabel("Vị trí tuyển dụng").fill("Phiên dịch tiếng Trung QA");
  await page.getByLabel("Đường dẫn (slug)").fill("phien-dich-tieng-trung-qa");
  await page.getByText("Xuất bản", { exact: true }).click();
  await page.getByLabel("Bộ phận").fill("Phiên dịch");
  await page.getByLabel("Lương từ").fill("12000000");
  await page.getByLabel("Lương đến").fill("18000000");
  await page
    .getByLabel("Mô tả ngắn")
    .fill("Phiên dịch cho khách thuê Trung Quốc.");
  await page
    .getByLabel("Mô tả công việc")
    .fill("- Dẫn khách xem căn\n- Dịch hợp đồng");
  await page.getByLabel("Yêu cầu").fill("- HSK 4 trở lên");
  await page.getByLabel("Quyền lợi").fill("- Thưởng theo hợp đồng");
  await page.screenshot({ path: `${SHOTS}/admin-job.png` });
  await page.getByRole("button", { name: "Tạo tin tuyển dụng" }).click();
  await expect(page).toHaveURL(/\/admin\/jobs$/);
  await expect(page.getByText("Phiên dịch tiếng Trung QA")).toBeVisible();

  // Public: search, open, apply.
  await page.goto("/tuyen-dung");
  await page.getByPlaceholder(/Tìm vị trí/).fill("tiếng trung");
  await page.getByRole("button", { name: "Tìm việc" }).click();
  await expect(page.locator(".job-card h3")).toHaveText([
    "Phiên dịch tiếng Trung QA",
  ]);
  await expect(page.locator(".job-card")).toContainText("12 – 18 triệu");
  await page.locator(".job-card h3 a").click();
  await expect(page).toHaveURL(/\/tuyen-dung\/phien-dich-tieng-trung-qa$/);
  const form = page.locator(".job-apply-form");
  await form.getByRole("button", { name: "Gửi hồ sơ" }).click();
  await expect(form.getByText("Vui lòng đính kèm CV.")).toBeVisible();
  await form.getByLabel("Họ và tên").fill("Lý Gia Hân");
  await form.getByLabel("Số điện thoại").fill("0905123456");
  await form.getByLabel("Email").fill("gia.han@example.com");
  await form.locator('input[type="file"]').setInputFiles({
    name: "CV Lý Gia Hân.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% CV\n%%EOF\n"),
  });
  await expect(form.locator(".cv-file")).toContainText("CV Lý Gia Hân.pdf");
  await form.getByText(/Tôi đồng ý/).click();
  // Humans take a few seconds (anti-bot timing).
  await page.waitForTimeout(2600);
  await form.getByRole("button", { name: "Gửi hồ sơ" }).click();
  await expect(form.getByRole("status")).toContainText(
    "Hồ sơ đã được ghi nhận",
  );

  // Admin: the application, its CV and status.
  await page.goto("/admin/applications");
  const row = page.getByRole("row", { name: /Lý Gia Hân/ });
  await expect(row).toContainText("Phiên dịch tiếng Trung QA");
  const download = page.waitForEvent("download");
  await row.getByRole("link", { name: /CV Lý Gia Hân\.pdf/ }).click();
  expect((await download).suggestedFilename()).toBe("CV Lý Gia Hân.pdf");
  await row.getByLabel(/Trạng thái hồ sơ/).selectOption("INTERVIEW");
  await expect(page.getByText("Đã cập nhật hồ sơ.")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/admin-applications.png` });

  // Clean up the posting (applications are kept).
  const api = await apiAs();
  const jobs = (await api.get("/admin/jobs?pageSize=100")) as unknown as {
    data: { id: string; slug: string }[];
  };
  const id = jobs.data.find((j) => j.slug === "phien-dich-tieng-trung-qa")!.id;
  await api.send("delete", `/admin/jobs/${id}`);
});
