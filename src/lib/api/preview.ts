import { cookies, draftMode } from "next/headers";
import { apiBase } from "./server";
import type { ApiPost, ApiProject } from "./types";

/**
 * Draft Mode previews: the editor's own session cookie is forwarded to the
 * admin preview endpoints, so only signed-in staff can see unpublished
 * content and nothing is cached.
 */
export async function isPreview() {
  return (await draftMode()).isEnabled;
}

async function adminGet<T>(path: string): Promise<T | null> {
  const jar = await cookies();
  const res = await fetch(`${apiBase()}/api/v1${path}`, {
    headers: { cookie: jar.toString(), accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return ((await res.json()) as { data: T }).data;
}

export const previewProject = (slug: string) =>
  adminGet<ApiProject & { status: string }>(
    `/admin/projects/preview/${encodeURIComponent(slug)}`,
  );
export const previewPost = (slug: string) =>
  adminGet<ApiPost & { status: string }>(
    `/admin/blog/posts/preview/${encodeURIComponent(slug)}`,
  );
