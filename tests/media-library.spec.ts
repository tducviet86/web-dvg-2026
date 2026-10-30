import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { apiAs, login } from "./helpers";

const SHOTS =
  "/private/tmp/claude-501/-Users-tranducviet-Documents-DVG-WEB/d7e4d8d3-4b31-4315-9fe7-c92d90618232/scratchpad";

/** A summary card at the top, which also filters the list. */
const stat = (page: import("@playwright/test").Page, label: string) =>
  page
    .getByRole("group", { name: "Tóm tắt thư viện" })
    .getByRole("button", { name: new RegExp(label) });

type Asset = { id: string; key: string; url: string; used: boolean };

test("Thư viện ảnh shows where files are used and deletes unused ones for good", async ({
  page,
}) => {
  const api = await apiAs();
  await login(page);
  await page.goto("/admin/media");
  await expect(
    page.getByRole("heading", { name: "Thư viện ảnh" }),
  ).toBeVisible();
  // Two photos uploaded from the library itself.
  const png = readFileSync("public/images/img1.png");
  await page.locator(".units-toolbar input[type=file]").setInputFiles([
    { name: "anh-bai-viet.png", mimeType: "image/png", buffer: png },
    { name: "anh-thua.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(page.getByText("Đã tải lên 2 ảnh.")).toBeVisible();
  const newest = (
    (await api.get("/admin/media?sort=newest&pageSize=2")) as unknown as {
      data: Asset[];
    }
  ).data;
  const [spare, inArticle] = newest;
  // One is pasted into an article: it counts as used.
  const post = await api.send("post", "/admin/blog/posts", {
    slug: "bai-thu-vien-anh",
    title: "Bài có ảnh thư viện",
    excerpt: "Bài thử dùng ảnh từ thư viện.",
    category: "tin-doanh-nghiep",
    content: `Đoạn mở đầu.\n\n![Phòng khách](${inArticle.url})\n\nĐoạn cuối.`,
  });
  expect(post.ok()).toBeTruthy();
  await page.reload();

  // "Chưa dùng" lists the spare photo only.
  await stat(page, "Chưa dùng").click();
  const grid = page.getByRole("list", { name: "Danh sách tệp" });
  const name = (key: string) => key.split("/").pop()!;
  await expect(grid.getByText(name(spare.key))).toBeVisible();
  await expect(grid.getByText(name(inArticle.key))).toHaveCount(0);
  // "Đang dùng" says where, with a link to the article.
  await stat(page, "Đang dùng").click();
  const card = grid.locator("li", { hasText: name(inArticle.key) });
  await card.getByRole("button", { name: /Đang dùng: 1 bài viết/ }).click();
  await expect(
    card.getByRole("link", { name: "bài viết: Bài có ảnh thư viện" }),
  ).toBeVisible();
  // A used file cannot be selected or deleted.
  await expect(card.getByRole("checkbox")).toHaveCount(0);
  await expect(card.getByRole("button", { name: /^Xóa/ })).toHaveCount(0);

  // Select the unused files on the page and delete them for good.
  await stat(page, "Chưa dùng").click();
  await page.getByRole("button", { name: "Chọn các tệp chưa dùng" }).click();
  await expect(
    page.getByRole("region", { name: "Thao tác hàng loạt" }),
  ).toContainText(/Đã chọn \d+ tệp/);
  await page.screenshot({ path: `${SHOTS}/media-library.png` });
  await page.getByRole("button", { name: "Xóa vĩnh viễn" }).click();
  const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog"));
  await expect(dialog).toContainText("Cloudflare");
  await dialog.getByRole("button", { name: "Xóa vĩnh viễn" }).click();
  await expect(page.getByText(/Đã xóa \d+ tệp, giải phóng/)).toBeVisible();
  await expect(grid.getByText(name(spare.key))).toHaveCount(0);
  const left = (
    (await api.get("/admin/media?usage=unused&pageSize=100")) as unknown as {
      data: Asset[];
    }
  ).data;
  expect(left.map((m) => m.id)).not.toContain(spare.id);
  // The used photo is still there.
  await api.get(`/admin/media/${inArticle.id}/usage`);

  const axe = await new AxeBuilder({ page })
    .include(".media-lib")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
  // Phone width: no sideways scrolling.
  await page.setViewportSize({ width: 360, height: 780 });
  await stat(page, "Đang dùng").click();
  await expect(grid.getByText(name(inArticle.key))).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: `${SHOTS}/media-library-mobile.png` });
});
