import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BE_DIR, E2E_DATABASE_URL, SITE_URL } from "../playwright.config";

/** Resets the e2e database, seeds content and creates one user per role. */
export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
  const run = (script: string, args: string[] = [], extra = {}) =>
    execFileSync(
      "npm",
      ["run", script, ...(args.length ? ["--", ...args] : [])],
      {
        cwd: BE_DIR,
        env: { ...env, ...extra },
        stdio: "pipe",
      },
    );
  run("db:reset:disposable");
  run("import:legacy", ["--publish"]);
  run("seed:demo");
  const users: Record<string, { email: string; password: string }> = {};
  for (const role of ["admin", "editor", "sales"]) {
    const user = {
      email: `${role}@e2e.dvg.test`,
      // Generated per run; never committed (see .gitignore).
      password: `E2e-${randomBytes(9).toString("base64url")}9`,
    };
    run("admin:create", [], {
      ADMIN_EMAIL: user.email,
      ADMIN_NAME: `E2E ${role}`,
      ADMIN_PASSWORD: user.password,
      ADMIN_ROLE: role,
    });
    users[role] = user;
  }
  mkdirSync(".playwright", { recursive: true });
  writeFileSync(".playwright/e2e-users.json", JSON.stringify(users));
  // Drop data the site cached from previous runs.
  const secret = readFileSync(".env.local", "utf8").match(
    /^REVALIDATE_SECRET=(.*)$/m,
  )?.[1];
  const res = await fetch(`${SITE_URL}/api/revalidate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-revalidate-secret": secret ?? "",
    },
    body: JSON.stringify({
      tags: ["projects", "properties", "banners", "blog", "pages", "settings"],
    }),
  });
  if (!res.ok) throw new Error(`Cache revalidation failed: ${res.status}`);

  // Stand-in Gemini API (no network or cost): a deterministic SEO
  // suggestion, and "translations" that are the source without accents
  // prefixed with the language, e.g. "EN: Can ho cho thue".
  const gemini = createServer((req, reply) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}") as {
        system_instruction?: string;
        input?: string;
      };
      if (body.system_instruction?.includes("professional translator")) {
        const tag = body.system_instruction.includes("into English")
          ? "EN"
          : body.system_instruction.includes("into Korean")
            ? "KO"
            : "ZH";
        const plain = (s: string) =>
          s
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D");
        const items = (
          JSON.parse(body.input ?? "[]") as { i: number; vi: string }[]
        ).map(({ i, vi }) => ({ i, t: `${tag}: ${plain(vi)}` }));
        reply.writeHead(200, { "content-type": "application/json" });
        reply.end(
          JSON.stringify({
            steps: [
              {
                type: "model_output",
                content: [{ type: "text", text: JSON.stringify({ items }) }],
              },
            ],
          }),
        );
        return;
      }
      if (body.system_instruction?.includes("mô tả cho trang một căn hộ")) {
        // Unit description: echo a fact so the test sees the form reached AI.
        const input = String((body as { input?: string }).input ?? "");
        const area = input.match(/Diện tích: ([^\n]+)/)?.[1] ?? "?";
        reply.writeHead(200, { "content-type": "application/json" });
        reply.end(
          JSON.stringify({
            status: "completed",
            steps: [
              {
                type: "model_output",
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      intro: `Căn hộ rộng ${area}, sẵn sàng đón khách.`,
                      points: [
                        "Phòng khách thoáng, nhiều ánh sáng.",
                        "Nội thất đầy đủ, dọn vào ở ngay.",
                      ],
                    }),
                  },
                ],
              },
            ],
          }),
        );
        return;
      }
      reply.writeHead(200, { "content-type": "application/json" });
      reply.end(
        JSON.stringify({
          status: "completed",
          steps: [
            {
              type: "model_output",
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    seoTitle:
                      "Kinh nghiệm thuê căn hộ Đà Nẵng | Đất Vàng Group",
                    seoDescription:
                      "Những điều cần kiểm tra trước khi thuê căn hộ tại Đà Nẵng: vị trí, nội thất, hợp đồng và chi phí hằng tháng.",
                    keywords: ["thuê căn hộ đà nẵng", "kinh nghiệm thuê nhà"],
                    imageAlt: "Phòng khách căn hộ cho thuê tại Đà Nẵng",
                  }),
                },
              ],
            },
          ],
        }),
      );
    });
  });
  await new Promise<void>((done) => gemini.listen(4299, "127.0.0.1", done));
  return () => new Promise<void>((done) => gemini.close(() => done()));
}
