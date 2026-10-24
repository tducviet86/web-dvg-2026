import { expect, request, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { API_URL } from "../playwright.config";

type Role = "admin" | "editor" | "sales";
export const credentials = (role: Role = "admin") =>
  (
    JSON.parse(readFileSync(".playwright/e2e-users.json", "utf8")) as Record<
      Role,
      { email: string; password: string }
    >
  )[role];

/** Signs in through the admin login page. */
export async function login(page: Page, role: Role = "admin") {
  const user = credentials(role);
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Mật khẩu").fill(user.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tổng quan quản trị",
  );
}

/** Direct API session (bearer token) for arranging and asserting data. */
export async function apiAs(role: Role = "admin") {
  const user = credentials(role);
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post("/api/v1/auth/login", { data: user });
  expect(res.ok()).toBeTruthy();
  const cookie = res
    .headersArray()
    .find(
      (h) =>
        h.name.toLowerCase() === "set-cookie" && h.value.startsWith("dvg_at="),
    );
  const token = cookie!.value.split(";")[0].slice("dvg_at=".length);
  const auth = { authorization: `Bearer ${token}` };
  return {
    get: async (path: string) => {
      const r = await ctx.get(`/api/v1${path}`, { headers: auth });
      expect(r.ok(), `${path} → ${r.status()}`).toBeTruthy();
      return (await r.json()) as { data: unknown; meta?: unknown };
    },
    send: (
      method: "post" | "put" | "patch" | "delete",
      path: string,
      data?: object,
    ) => ctx[method](`/api/v1${path}`, { headers: auth, data }),
  };
}

/** Waits past the forms' anti-bot minimum fill time. */
export const humanPause = (page: Page) => page.waitForTimeout(2700);

/** Asserts the "Chưa thể lưu" popup lists `text`, then dismisses it. */
export async function expectErrorPopup(page: Page, text: string | RegExp) {
  const dialog = page.getByRole("dialog", { name: "Chưa thể lưu" });
  await expect(dialog).toContainText(text);
  await dialog.getByRole("button", { name: "Đã hiểu" }).click();
  await expect(dialog).toHaveCount(0);
}
