"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/i18n/client";
import { localizeHref, splitLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/client";
import { usePageNavigation } from "../page-navigation";

/**
 * Pages visited inside the site this session, newest last. Going "back" pops
 * it, so the button knows whether the browser history leads to our own page
 * (visitors arriving from Google go to the parent page instead).
 */
const KEY = "dvg:trail";
function readTrail(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]") as string[];
  } catch {
    return [];
  }
}
function writeTrail(trail: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail.slice(-30)));
  } catch {
    /* storage blocked: the button falls back to the parent page */
  }
}

/** "/cho-thue/du-an/monarchy" → "/cho-thue/du-an" → "/cho-thue" … → "/". */
function parentOf(path: string) {
  const parts = path.split("/").filter(Boolean);
  // "/cho-thue/du-an" alone is not a page: skip it.
  if (parts[0] === "cho-thue" && parts[1] === "du-an") return "/cho-thue";
  return `/${parts.slice(0, -1).join("/")}`;
}

/** Records the trail on every page; mounted once in the header. */
export function BackTrail() {
  const pathname = usePathname();
  useEffect(() => {
    const trail = readTrail();
    if (trail.at(-2) === pathname) trail.pop();
    else if (trail.at(-1) !== pathname) trail.push(pathname);
    writeTrail(trail);
  }, [pathname]);
  return null;
}

/** Round "back" button at the start of a page's breadcrumb. */
export function BackButton() {
  const t = useT();
  const locale = useLocale();
  const navigate = usePageNavigation();
  const path = splitLocale(usePathname()).path;

  if (path === "/") return null;
  return (
    <button
      type="button"
      className="crumb-back"
      aria-label={t("Quay lại")}
      title={t("Quay lại")}
      onClick={() => {
        if (readTrail().length > 1) window.history.back();
        else {
          const target = localizeHref(parentOf(path), locale);
          if (navigate) navigate(target);
          else window.location.assign(target);
        }
      }}
    >
      <ArrowLeft size={16} aria-hidden="true" />
    </button>
  );
}
