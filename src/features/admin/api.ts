"use client";

/**
 * Admin API client. Requests go through the site origin (`/api/v1` is
 * proxied to BE-DVG), carrying the httpOnly session cookies; writes echo
 * the CSRF cookie in `X-CSRF-Token`. An expired access token is refreshed
 * once, transparently.
 */
export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

const csrf = () =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith("dvg_csrf="))
    ?.slice("dvg_csrf=".length) ?? "";

let refreshing: Promise<boolean> | null = null;
/** Single-flight refresh shared by concurrent requests. */
function refresh() {
  refreshing ??= fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "x-csrf-token": decodeURIComponent(csrf()) },
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export const SESSION_EXPIRED = "dvg-session-expired";

async function send(
  method: string,
  path: string,
  body?: unknown,
  retry = true,
): Promise<Response> {
  const isForm = body instanceof FormData;
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: {
      ...(method === "GET"
        ? {}
        : { "x-csrf-token": decodeURIComponent(csrf()) }),
      ...(body === undefined || isForm
        ? {}
        : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refresh()) return send(method, path, body, false);
    window.dispatchEvent(new Event(SESSION_EXPIRED));
  }
  return res;
}

export async function api<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await send(method, path, body);
  } catch {
    throw new AdminApiError(0, "NETWORK", "Không kết nối được máy chủ.");
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok)
    throw new AdminApiError(
      res.status,
      json?.error?.code ?? "UNKNOWN",
      json?.error?.message ?? "Đã có lỗi xảy ra.",
      json?.error?.details,
    );
  return json as T;
}

/** Turns an API error into a readable message (with validation details). */
/** One invalid field as reported by the API (VALIDATION_FAILED / slug conflict). */
export type ApiFieldError = {
  field: string;
  constraints: string[];
  messages: string[];
};
export function fieldErrorsOf(error: unknown): ApiFieldError[] {
  if (!(error instanceof AdminApiError) || !Array.isArray(error.details))
    return [];
  return (error.details as unknown[]).filter(
    (d): d is ApiFieldError =>
      !!d && typeof d === "object" && "field" in d && "constraints" in d,
  );
}

/** Plain-language reason for a failed API constraint. */
export const constraintText: Record<string, string> = {
  isNotEmpty: "là bắt buộc",
  isDefined: "là bắt buộc",
  maxLength: "quá dài",
  minLength: "quá ngắn",
  matches: "sai định dạng",
  isEmail: "không phải email hợp lệ",
  isUrl: "không phải liên kết hợp lệ",
  min: "nhỏ hơn mức cho phép",
  max: "lớn hơn mức cho phép",
  isInt: "phải là số nguyên",
  isNumber: "phải là số",
  isEnum: "có giá trị không hợp lệ",
  isIn: "có giá trị không hợp lệ",
  isUuid: "chưa được chọn",
  isLatitude: "không phải vĩ độ hợp lệ",
  isLongitude: "không phải kinh độ hợp lệ",
  isIso8601: "không phải ngày hợp lệ",
  arrayMaxSize: "có quá nhiều mục",
  arrayUnique: "có mục bị trùng",
  unique: "đã được sử dụng",
  whitelistValidation: "không được phép gửi",
};

export function errorMessage(error: unknown) {
  if (!(error instanceof AdminApiError))
    return "Đã có lỗi xảy ra. Vui lòng thử lại.";
  return error.message;
}

export type Session = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
};

/** Record a file is uploaded for: names its folder in storage (can-ho/MB029/…). */
export type UploadPlace = {
  owner: "property" | "project" | "post" | "banner";
  code: string;
};

export async function uploadMedia(
  file: File,
  alt?: string,
  place?: UploadPlace | null,
) {
  const form = new FormData();
  form.append("file", file);
  if (alt) form.append("alt", alt);
  if (place?.code.trim()) {
    form.append("owner", place.owner);
    form.append("code", place.code.trim().slice(0, 80));
  }
  const { data } = await api<{ data: MediaAsset }>(
    "POST",
    "/admin/media/upload",
    form,
  );
  return data;
}
export type MediaAsset = {
  id: string;
  mimeType: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
};
