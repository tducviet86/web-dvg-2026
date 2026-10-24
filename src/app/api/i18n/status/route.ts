import { timingSafeEqual } from "node:crypto";
import { pendingCount } from "@/i18n/dictionary";

/**
 * How many strings this server is still translating in the background.
 * Used by `npm run i18n:warm`; protected by the revalidation secret.
 */
export async function GET(request: Request) {
  const secret = process.env.REVALIDATE_SECRET || "";
  const given = request.headers.get("x-revalidate-secret") || "";
  const valid =
    secret.length >= 16 &&
    given.length === secret.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!valid) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ pending: pendingCount() });
}

export const dynamic = "force-dynamic";
