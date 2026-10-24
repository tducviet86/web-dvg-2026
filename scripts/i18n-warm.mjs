/**
 * Translates the whole website ahead of visitors: opens every page of the
 * sitemap (plus the internal links found on them) in English, Korean and
 * Chinese, waits for the server to translate what was missing, and repeats
 * until no Vietnamese text is left.
 *
 *   SITE_URL=https://datvanggroup.vn REVALIDATE_SECRET=… npm run i18n:warm
 *
 * Options: --locales=en,ko,zh  --passes=5  --max-pages=600
 */
import { leftovers } from "./i18n-check.mjs";

const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ??
  fallback;
const site = (
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");
const secret = process.env.REVALIDATE_SECRET || "";
const locales = arg("locales", "en,ko,zh").split(",");
const passes = Number(arg("passes", "5"));
const maxPages = Number(arg("max-pages", "600"));
// A crawler user agent: the site never redirects it by browser language.
const headers = { "user-agent": "dvg-i18n-warm bot" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sitemapUrls() {
  const xml = await (await fetch(`${site}/sitemap.xml`, { headers })).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/^https?:\/\/[^/]+/, ""))
    .filter((path) =>
      locales.some((l) => path === `/${l}` || path.startsWith(`/${l}/`)),
    );
}

async function waitForServer() {
  if (!secret) return sleep(20_000);
  for (let i = 0; i < 120; i++) {
    const res = await fetch(`${site}/api/i18n/status`, {
      headers: { ...headers, "x-revalidate-secret": secret },
    }).catch(() => null);
    const pending = res?.ok ? (await res.json()).pending : 0;
    if (!pending) return;
    await sleep(5000);
  }
}

const pages = new Set(await sitemapUrls());
console.log(`${pages.size} pages in ${locales.join(", ")}`);
let previous = -1;
for (let pass = 1; pass <= passes; pass++) {
  let left = 0;
  const report = [];
  const queue = [...pages];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let path = queue.shift(); path; path = queue.shift()) {
        const res = await fetch(`${site}${path}`, { headers }).catch(
          () => null,
        );
        if (!res?.ok) continue;
        const html = await res.text();
        const strings = leftovers(html);
        left += strings.length;
        if (strings.length) report.push([path, strings.length]);
        // Follow internal links of the same language (units, filters…).
        const prefix = path.split("/")[1];
        for (const m of html.matchAll(/href="(\/[a-z]{2}\/[^"#?]*)"/g))
          if (
            m[1].startsWith(`/${prefix}/`) &&
            pages.size < maxPages &&
            !pages.has(m[1])
          ) {
            pages.add(m[1]);
            queue.push(m[1]);
          }
      }
    }),
  );
  console.log(
    `pass ${pass}: ${pages.size} pages, ${left} Vietnamese strings left`,
  );
  const stalled = left === previous;
  previous = left;
  for (const [path, n] of report.sort((a, b) => b[1] - a[1]).slice(0, 8))
    console.log(`   ${n}\t${path}`);
  if (!left) break;
  await waitForServer();
  // No progress: strings that failed are retried by the server after ~2 min.
  if (stalled) await sleep(130_000);
}
