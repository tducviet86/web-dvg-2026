"use client";
import { useEffect } from "react";

/**
 * Counts one visit of a unit page per browser session; the server turns
 * recent visits and enquiries into the "Đang được quan tâm" badge. Staff
 * signed in to Admin are not counted.
 */
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    // Signed in to Admin (the session's CSRF cookie, gone at sign-out).
    if (/(?:^|;\s*)dvg_csrf=/.test(document.cookie)) return;
    const key = `dvg:viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: count the visit anyway */
    }
    fetch(`/api/v1/properties/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}
