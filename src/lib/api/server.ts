import type { ApiError } from "./types";

/** Cache tags; BE-DVG's revalidation webhook invalidates them on writes. */
export type CacheTag =
  | "projects"
  | "properties"
  | "banners"
  | "blog"
  | "pages"
  | "jobs"
  | "settings";

/** Server-to-server base URL (private network in production). */
export const apiBase = () =>
  (process.env.API_INTERNAL_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError | null,
    path: string,
  ) {
    super(`API ${status} for ${path}: ${body?.error.message ?? "no body"}`);
  }
}

export type Lookup<T> =
  | { kind: "ok"; data: T }
  | { kind: "missing" }
  | { kind: "gone" }
  | { kind: "moved"; slug: string };

/** Data is cached for 5 minutes and dropped immediately on admin writes. */
const DEFAULT_REVALIDATE = 300;

async function request(path: string, tags: CacheTag[], init?: RequestInit) {
  return fetch(`${apiBase()}/api/v1${path}`, {
    ...init,
    headers: { accept: "application/json", ...init?.headers },
    redirect: "manual",
    next: { revalidate: DEFAULT_REVALIDATE, tags },
  });
}

/** GET a collection/object that must exist; any failure is a server error. */
export async function apiGet<T>(path: string, tags: CacheTag[]): Promise<T> {
  const res = await request(path, tags);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiRequestError(res.status, body, path);
  return body as T;
}

/** GET a single public resource, distinguishing 404 / 410 / 301. */
export async function apiLookup<T>(
  path: string,
  tags: CacheTag[],
): Promise<Lookup<T>> {
  const res = await request(path, tags);
  const body = await res.json().catch(() => null);
  if (res.ok) return { kind: "ok", data: (body as { data: T }).data };
  if (res.status === 404) return { kind: "missing" };
  if (res.status === 410) return { kind: "gone" };
  if (res.status === 301) {
    const slug = (body as ApiError | null)?.error.details as
      { slug?: string } | undefined;
    if (slug?.slug) return { kind: "moved", slug: slug.slug };
  }
  throw new ApiRequestError(res.status, body, path);
}

/** Collects every page of a paginated public collection. */
export async function apiGetAll<T>(
  path: string,
  tags: CacheTag[],
  pageSize = 100,
): Promise<T[]> {
  const items: T[] = [];
  const join = path.includes("?") ? "&" : "?";
  for (let page = 1; page < 100; page++) {
    const res = await apiGet<{ data: T[]; meta: { totalPages: number } }>(
      `${path}${join}page=${page}&pageSize=${pageSize}`,
      tags,
    );
    items.push(...res.data);
    if (page >= res.meta.totalPages) break;
  }
  return items;
}
