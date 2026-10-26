import { test, expect } from "@playwright/test";
import { apiAs } from "./helpers";

test("articles render images, headings, quotes and lists written in Admin", async ({
  page,
}) => {
  const api = await apiAs();
  const list = (await api.get("/admin/blog/posts?pageSize=100")) as unknown as {
    data: { id: string; slug: string }[];
  };
  const post = list.data.find(
    (p) => p.slug === "kinh-nghiem-thue-can-ho-da-nang",
  )!;
  const before = (await api.get(`/admin/blog/posts/${post.id}`)) as unknown as {
    data: { content: string };
  };
  const content = [
    "Chọn khu vực trước, rồi mới chọn căn hộ.",
    "## Khu vực phù hợp",
    "Gần nơi làm việc và trường học giúp tiết kiệm thời gian.",
    "![Căn hộ nhìn ra sông Hàn](/images/img1.png)",
    "> Một buổi xem nhà kỹ lưỡng đáng giá hơn mười bức ảnh.",
    "## Kiểm tra hiện trạng",
    "- Điện nước\n- Nội thất bàn giao\n- Chỗ đỗ xe",
  ].join("\n\n");
  const save = await api.send("patch", `/admin/blog/posts/${post.id}`, {
    content,
  });
  expect(save.ok(), await save.text()).toBeTruthy();
  try {
    await expect
      .poll(
        async () => {
          await page.goto(`/blog/${post.slug}`);
          return page.locator(".article-prose figure").count();
        },
        { timeout: 15000 },
      )
      .toBe(1);
    await expect(page.locator(".article-prose figcaption")).toHaveText(
      "Căn hộ nhìn ra sông Hàn",
    );
    await expect(page.locator(".article-prose blockquote")).toContainText(
      "Một buổi xem nhà",
    );
    await expect(page.locator(".article-prose li")).toHaveCount(3);
    const toc = page.getByRole("navigation", { name: "Mục lục bài viết" });
    await expect(toc.getByRole("link")).toHaveText([
      "Khu vực phù hợp",
      "Kiểm tra hiện trạng",
    ]);
    await expect(page.locator("main h1")).toHaveCount(1);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `overflow at ${width}`,
      ).toBeTruthy();
    }
  } finally {
    await api.send("patch", `/admin/blog/posts/${post.id}`, {
      content: before.data.content,
    });
  }
});

test("news page lists categories with counts and opens a category", async ({
  page,
}) => {
  await page.goto("/blog");
  const nav = page.getByRole("navigation", { name: "Chuyên mục bài viết" });
  await expect(nav.getByRole("link").first()).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator(".blog-feature h2")).toHaveCount(1);
  await nav.getByRole("link", { name: /Cẩm nang thuê nhà/ }).click();
  await expect(page).toHaveURL(/\/blog\/danh-muc\/cam-nang-thue-nha$/);
  await expect(page.locator("main h1")).toHaveText("Cẩm nang thuê nhà");
});
