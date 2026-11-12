/**
 * Copies projects from one API (the local dvg_dev) to another (production),
 * with their pictures: each picture is uploaded again to the target's media
 * library, so the copy refers to its own files. Projects missing on the
 * target are created; Cora, already there, only gets its floor plans, unit
 * types and position. Without --apply nothing is written: it says what it
 * would do.
 *
 *   TO_EMAIL=… TO_PASSWORD=… node scripts/copy-projects.mjs           # dry run
 *   TO_EMAIL=… TO_PASSWORD=… node scripts/copy-projects.mjs --apply
 *
 * Source: FROM_API (http://127.0.0.1:4000/api/v1), logged in with
 * FROM_EMAIL/FROM_PASSWORD or BE-DVG/.local/dev-admin.env.
 * Target: TO_API (https://datvanggroup.vn/api/v1), TO_ORIGIN (its website).
 * Options: --update also overwrites projects that already exist on the target.
 */
import { existsSync, readFileSync } from "node:fs";

const apply = process.argv.includes("--apply");
const update = process.argv.includes("--update");
/** New projects, created whole. */
const CREATE = [
  "sun-saphia-residence",
  "s-light-tower",
  "fours-tower",
  "da-nang-downtown",
];
/** Projects already live: only these fields are brought over. */
const PATCH = {
  "cora-tower": ["floorPlans", "unitTypes", "latitude", "longitude"],
};
// What a new project carries (CreateProjectDto); the rest is the server's.
const FIELDS = [
  "slug", "name", "stage", "status", "categories", "location", "intro",
  "totalAreaM2", "propertyKind", "address", "overview", "products",
  "developer", "companyRole", "legalStatus", "totalUnits", "startDate",
  "handoverDate", "mapUrl", "facebookUrl", "mapLabel", "latitude",
  "longitude", "coverImageId", "coverImageAlt", "imageCredit", "sourceUrl",
  "rentalIntro", "rentalFocus", "rentalChecks", "unitTypes", "floorPlans",
  "paymentSchedule", "paymentNote", "towers", "photos", "salesPolicies",
  "connections", "progressPhotos", "videoUrl", "scale", "priceNote",
  "handoverNote", "seoTitle", "seoDescription", "sortOrder", "amenities",
  "highlights", "galleryImageIds",
]; // prettier-ignore

function devLogin() {
  const file = new URL("../../BE-DVG/.local/dev-admin.env", import.meta.url);
  if (!existsSync(file)) return {};
  const env = Object.fromEntries(
    readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => [
        l.slice(0, l.indexOf("=")).trim(),
        l
          .slice(l.indexOf("=") + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ]),
  );
  return { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD };
}

/** A logged-in admin session on one API. */
async function session(api, origin, email, password, label) {
  if (!email || !password) {
    console.error(`Missing the ${label} admin's e-mail or password.`);
    process.exit(1);
  }
  const res = await fetch(`${api}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password }),
  }).catch(() => {
    console.error(
      `${label}: no API answers at ${api}.` +
        (label === "source"
          ? " Start BE-DVG first (cd ../BE-DVG && npx -y npm@11 run start:dev)."
          : ""),
    );
    process.exit(1);
  });
  if (!res.ok) {
    console.error(`${label}: login failed (${res.status})`);
    process.exit(1);
  }
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const { data } = await res.json();
  const headers = { cookie, "x-csrf-token": data.csrfToken, origin };
  const call = async (method, path, body) => {
    const r = await fetch(`${api}${path}`, {
      method,
      headers: body instanceof FormData ? headers : {
        ...headers,
        "content-type": "application/json",
      },
      body: body instanceof FormData ? body : body && JSON.stringify(body),
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`${label} ${method} ${path}: ${r.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  }; // prettier-ignore
  return call;
}

const fromApi = process.env.FROM_API || "http://127.0.0.1:4000/api/v1";
const toApi = process.env.TO_API || "https://datvanggroup.vn/api/v1";
const toOrigin = process.env.TO_ORIGIN || new URL(toApi).origin;
const dev = devLogin();
const from = await session(
  fromApi,
  process.env.FROM_ORIGIN || "http://localhost:3000",
  process.env.FROM_EMAIL || dev.email,
  process.env.FROM_PASSWORD || dev.password,
  "source",
);
const to = await session(
  toApi,
  toOrigin,
  process.env.TO_EMAIL,
  process.env.TO_PASSWORD,
  "target",
);

/** Every project of an API, by slug. */
async function bySlug(call) {
  const out = new Map();
  for (let page = 1; ; page++) {
    const { data, meta } = await call(
      "GET",
      `/admin/projects?pageSize=100&page=${page}`,
    );
    for (const p of data) out.set(p.slug, p);
    if (!meta || page >= (meta.totalPages ?? 1) || !data.length) return out;
  }
}
const source = await bySlug(from);
const target = await bySlug(to);

/** Pictures of the source library: uploaded again once, by their address. */
const copied = new Map();
async function copyPicture(url, alt, code) {
  if (copied.has(url)) return copied.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url}: ${res.status}`);
  const type = res.headers.get("content-type") || "image/webp";
  const form = new FormData();
  form.append(
    "file",
    new Blob([await res.arrayBuffer()], { type }),
    url.split("/").pop(),
  );
  if (alt) form.append("alt", alt.slice(0, 250));
  form.append("owner", "project");
  form.append("code", code);
  const { data } = await to("POST", "/admin/media/upload", form);
  copied.set(url, data);
  return data;
}
/** The source library's addresses found in a value, with an alt for each. */
function pictures(value, alt = "", out = new Map()) {
  if (typeof value === "string") {
    if (/^https?:\/\/[^/]+\/.+\.(webp|jpe?g|png|gif|avif)$/i.test(value))
      if (!out.has(value)) out.set(value, alt);
  } else if (Array.isArray(value)) for (const v of value) pictures(v, alt, out);
  else if (value && typeof value === "object")
    for (const v of Object.values(value))
      pictures(v, value.name ?? value.group ?? value.title ?? alt, out);
  return out;
}
/** The same value with the source's addresses replaced by the copies'. */
function swap(value) {
  if (typeof value === "string") return copied.get(value)?.url ?? value;
  if (Array.isArray(value)) return value.map(swap);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, swap(v)]),
    );
  return value;
}

/** Pictures only the source has: those on the target's own media are kept. */
const foreign = (url) => !url.startsWith(`${toOrigin}/`);

let failed = 0;
const jobs = [...CREATE.map((slug) => [slug, null]), ...Object.entries(PATCH)];
for (const [slug, only] of jobs) {
  const p = source.get(slug);
  if (!p) {
    console.log(`- ${slug}: not in the source, skipped`);
    continue;
  }
  let there = target.get(slug);
  // An update compares with the whole project, not the list's summary.
  if (only && there)
    there = (await to("GET", `/admin/projects/${there.id}`)).data;
  if (!only && there && !update) {
    console.log(`- ${slug}: already on the target, skipped (--update to overwrite)`);
    continue;
  } // prettier-ignore
  if (only && !there) {
    console.log(`- ${slug}: not on the target, skipped`);
    continue;
  }
  // Only the source's fields that a project takes, without empty ones.
  const keys = only ?? FIELDS;
  const body = Object.fromEntries(
    keys
      .filter((k) => p[k] !== null && p[k] !== undefined)
      .map((k) => [k, p[k]]),
  );
  delete body.coverImageId;
  delete body.galleryImageIds;
  // An update the target already has (pictures aside) is not sent again.
  const bare = (v) =>
    JSON.stringify(v, (_, x) =>
      typeof x === "string" && /\.(webp|jpe?g|png|gif|avif)$/i.test(x) ? "" : x,
    );
  if (only && only.every((k) => bare(p[k]) === bare(there[k]))) {
    console.log(`- ${slug}: already up to date, skipped`);
    continue;
  }
  const found = [...pictures(body, p.name)].filter(([u]) => foreign(u));
  const cover = !only && p.coverImage?.url ? p.coverImage : null;
  const gallery = !only ? (p.gallery ?? []) : [];
  const count = found.length + (cover ? 1 : 0) + gallery.length;
  const action = there ? "update" : "create";
  console.log(
    `${apply ? "*" : "~"} ${slug}: ${action}${only ? ` (${only.join(", ")})` : ""}, ${count} picture(s) to upload`,
  );
  if (!apply) continue;
  try {
    for (const [url, alt] of found) await copyPicture(url, alt, slug);
    if (cover) {
      const copy = await copyPicture(
        cover.url,
        cover.alt ?? p.coverImageAlt ?? p.name,
        slug,
      );
      body.coverImageId = copy.id;
    }
    if (gallery.length) {
      body.galleryImageIds = [];
      for (const g of gallery)
        body.galleryImageIds.push(
          (await copyPicture(g.url, g.alt ?? p.name, slug)).id,
        );
    }
    const sent = swap(body);
    if (there) await to("PATCH", `/admin/projects/${there.id}`, sent);
    else await to("POST", "/admin/projects", sent);
    console.log(`  done`);
  } catch (e) {
    failed++;
    console.error(`  failed: ${e.message}`);
  }
}
console.log(
  apply
    ? `\n${copied.size} picture(s) uploaded, ${failed} project(s) failed.`
    : "\nDry run: nothing written. Add --apply to do it.",
);
process.exit(failed ? 1 : 0);
