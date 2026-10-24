import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

/**
 * End-to-end tests run the real stack: BE-DVG (API + PostgreSQL) and the
 * production build of this site. The API uses a disposable database
 * (E2E_DATABASE_URL, name must end in _e2e) that tests/global-setup.ts
 * resets and seeds. Stop local dev servers on ports 3000/4000 first.
 */
export const BE_DIR = resolve(process.env.BE_DIR || "../BE-DVG");
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  "postgresql://dvg@127.0.0.1:5433/dvg_e2e?schema=public";
// Ports can be moved (E2E_FE_PORT / E2E_API_PORT) when dev servers use the
// defaults; build the site with API_INTERNAL_URL pointing at E2E_API_PORT.
const FE_PORT = Number(process.env.E2E_FE_PORT || 3000);
const API_PORT = Number(process.env.E2E_API_PORT || 4000);
export const SITE_URL = `http://127.0.0.1:${FE_PORT}`;
export const API_URL = `http://127.0.0.1:${API_PORT}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  globalSetup: "./tests/global-setup.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || SITE_URL,
    // Local runs use installed Chrome; CI sets PLAYWRIGHT_CHANNEL=chromium.
    channel:
      process.env.PLAYWRIGHT_CHANNEL === "chromium"
        ? undefined
        : process.env.PLAYWRIGHT_CHANNEL || "chrome",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    // Vietnamese visitor by default (other languages are tested explicitly);
    // otherwise Chrome's en-US would be redirected to /en.
    locale: "vi-VN",
  },
  webServer: [
    {
      command: "node dist/main.js",
      cwd: BE_DIR,
      url: `${API_URL}/api/v1/health/ready`,
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        PORT: String(API_PORT),
        NODE_ENV: "development",
        THROTTLE_ENABLED: "false",
        // AI SEO calls go to the stand-in Gemini started by global-setup.
        GEMINI_API_KEY: "e2e-gemini-key",
        GEMINI_API_BASE: "http://127.0.0.1:4299",
        FRONTEND_REVALIDATE_URL: `${SITE_URL}/api/revalidate`,
        LOG_LEVEL: "warn",
        // Uploads stay on this machine, never in the developer's R2 bucket.
        STORAGE_DRIVER: "local",
        LOCAL_MEDIA_DIR: "./.local/e2e-media",
        MEDIA_PUBLIC_BASE_URL: "/media",
      },
    },
    {
      command: `npm run start -- -p ${FE_PORT} -H 127.0.0.1`,
      url: `${SITE_URL}/robots.txt`,
      reuseExistingServer: false,
      timeout: 60000,
      // Server-side fetches must reach the e2e API, not .env.local's.
      env: { API_INTERNAL_URL: API_URL, I18N_REFRESH_MS: "1500" },
    },
  ],
  reporter: [["list"], ["html", { open: "never" }]],
});
