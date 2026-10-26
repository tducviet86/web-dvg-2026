"use client";

/** Browser-side calls go through the site origin (`/api/v1` is proxied). */
export type ClientResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      details?: unknown;
    };

export async function postPublic<T = unknown>(
  path: string,
  body: unknown,
): Promise<ClientResult<T>> {
  return send<T>(path, {
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Multipart form with files (the browser sets the content type). */
export function postForm<T = unknown>(path: string, body: FormData) {
  return send<T>(path, { body });
}

async function send<T>(
  path: string,
  init: RequestInit,
): Promise<ClientResult<T>> {
  try {
    const res = await fetch(`/api/v1${path}`, { method: "POST", ...init });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: json?.data as T };
    return {
      ok: false,
      status: res.status,
      code: json?.error?.code ?? "UNKNOWN",
      message:
        json?.error?.message ?? "Không thể gửi yêu cầu. Vui lòng thử lại.",
      details: json?.error?.details,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      code: "NETWORK",
      message: "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.",
    };
  }
}
