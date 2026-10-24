import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

const TAGS = new Set([
  "projects",
  "properties",
  "banners",
  "blog",
  "pages",
  "settings",
]);

/**
 * Called by BE-DVG after a successful write. Drops cached API data so the
 * next visit renders fresh content (no stale window: editors expect to see
 * their change immediately).
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET || "";
  const given = request.headers.get("x-revalidate-secret") || "";
  const valid =
    secret.length >= 16 &&
    given.length === secret.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!valid) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    tags?: unknown;
  } | null;
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && TAGS.has(t))
    : [];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
