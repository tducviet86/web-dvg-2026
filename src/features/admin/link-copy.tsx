"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, Link2, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";

/** `fresh`: changed in the last 7 days (as of reading the sitemap). */
type Link = { url: string; lang: string; group: string; fresh: boolean };

const LANGS: [string, string][] = [
  ["vi", "Tiếng Việt"],
  ["en", "English"],
  ["ko", "한국어"],
  ["zh", "中文"],
  ["all", "Tất cả"],
];
const GROUPS: [string, string][] = [
  ["project", "Dự án"],
  ["rent", "Căn hộ cho thuê"],
  ["sale", "Căn hộ mua bán"],
  ["blog", "Bài viết"],
  ["other", "Trang khác"],
];
const DAY = 86_400_000;

/** Reads the site's sitemap: every public address, its language and kind. */
async function readSitemap(): Promise<Link[]> {
  const res = await fetch("/sitemap.xml", { cache: "no-store" });
  if (!res.ok) throw new Error();
  const since = Date.now() - 7 * DAY;
  const xml = new DOMParser().parseFromString(await res.text(), "text/xml");
  return [...xml.getElementsByTagName("url")].map((node) => {
    const url = node.getElementsByTagName("loc")[0]?.textContent?.trim() ?? "";
    const modified = node.getElementsByTagName("lastmod")[0]?.textContent;
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const lang = ["en", "ko", "zh"].includes(parts[0]) ? parts.shift()! : "vi";
    const group =
      parts[0] === "du-an" || (parts[0] === "cho-thue" && parts[1] === "du-an")
        ? "project"
        : parts[0] === "cho-thue"
          ? "rent"
          : parts[0] === "mua-ban"
            ? "sale"
            : parts[0] === "blog"
              ? "blog"
              : "other";
    return {
      url,
      lang,
      group,
      fresh: !!modified && Date.parse(modified) >= since,
    };
  });
}

/** Puts text on the clipboard (older browsers: through a hidden text box). */
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const box = Object.assign(document.createElement("textarea"), {
      value: text,
    });
    document.body.append(box);
    box.select();
    document.execCommand("copy");
    box.remove();
  }
}

/**
 * "Copy link": the site's addresses (from the sitemap, so always current) by
 * kind and language, one per line, to paste into Bing Webmaster › URL
 * Submission or Google Search Console. Changes already reach Bing by
 * IndexNow; this is for sending them by hand as well.
 */
export function LinkCopy() {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<Link[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [lang, setLang] = useState("vi");
  const [recent, setRecent] = useState(false);
  const [copied, setCopied] = useState("");

  const load = () => {
    setFailed(false);
    readSitemap()
      .then(setLinks)
      .catch(() => setFailed(true));
  };
  const shown = (links ?? []).filter(
    (l) => (lang === "all" || l.lang === lang) && (!recent || l.fresh),
  );
  const take = async (key: string, list: Link[]) => {
    await copy(list.map((l) => l.url).join("\n"));
    setCopied(key);
    toast.success(`Đã copy ${list.length} link`);
    setTimeout(() => setCopied((c) => (c === key ? "" : c)), 2000);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value && !links) load();
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button">
          <Link2 size={15} aria-hidden="true" />
          Copy link
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="admin-dialog-overlay" />
        <Dialog.Content
          className="admin-dialog report-dialog link-copy"
          aria-describedby="link-copy-desc"
        >
          <div className="report-dialog-icon" aria-hidden="true">
            <Link2 size={22} />
          </div>
          <Dialog.Title>Copy link website</Dialog.Title>
          <Dialog.Description id="link-copy-desc">
            Mỗi dòng một link, dán vào Bing Webmaster › URL Submission hoặc
            Google Search Console. Khi đăng hay sửa căn hộ, website đã tự báo
            cho Bing (IndexNow).
          </Dialog.Description>
          <div className="link-copy-langs" role="group" aria-label="Ngôn ngữ">
            {LANGS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={lang === key}
                onClick={() => setLang(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="link-copy-recent">
            <input
              type="checkbox"
              checked={recent}
              onChange={(e) => setRecent(e.target.checked)}
            />
            Chỉ link mới cập nhật trong 7 ngày
          </label>
          {failed ? (
            <p className="report-summary" data-error>
              Không đọc được sitemap.{" "}
              <button type="button" className="link-copy-retry" onClick={load}>
                Thử lại
              </button>
            </p>
          ) : !links ? (
            <p className="report-note">
              <LoaderCircle size={14} className="spin" aria-hidden="true" />{" "}
              Đang lấy danh sách link…
            </p>
          ) : (
            <ul className="link-copy-groups">
              {GROUPS.map(([key, label]) => {
                const list = shown.filter((l) => l.group === key);
                return (
                  <li key={key}>
                    <span>
                      <strong>{label}</strong>
                      <small>{list.length} link</small>
                    </span>
                    <button
                      type="button"
                      disabled={!list.length}
                      aria-label={`Copy ${list.length} link ${label}`}
                      onClick={() => take(key, list)}
                    >
                      {copied === key ? (
                        <Check size={15} />
                      ) : (
                        <Copy size={15} />
                      )}
                      {copied === key ? "Đã copy" : "Copy"}
                    </button>
                  </li>
                );
              })}
              <li className="link-copy-all">
                <span>
                  <strong>Tất cả</strong>
                  <small>{shown.length} link</small>
                </span>
                <button
                  type="button"
                  disabled={!shown.length}
                  aria-label={`Copy tất cả ${shown.length} link`}
                  onClick={() => take("all", shown)}
                >
                  {copied === "all" ? <Check size={15} /> : <Copy size={15} />}
                  {copied === "all" ? "Đã copy" : "Copy"}
                </button>
              </li>
            </ul>
          )}
          <Dialog.Close className="admin-dialog-close" aria-label="Đóng">
            <X size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
