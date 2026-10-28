"use client";
import { useEffect, useState } from "react";
import {
  ArrowUp,
  Check,
  Facebook,
  Link2,
  Minus,
  Plus,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n/client";

/**
 * Reading tools of a blog article: progress bar, the contents with the
 * section being read lit up, text size, sharing and "back to top".
 */

const SIZE_KEY = "dvg:reader-size";
const SIZES = [16, 17, 18, 19.5, 21];

/** Thin bar under the header showing how far the article has been read. */
export function ReadingProgress() {
  const [ratio, setRatio] = useState(0);
  useEffect(() => {
    const body = document.querySelector<HTMLElement>(".reader-body");
    if (!body) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = body.getBoundingClientRect();
        const total = box.height - innerHeight * 0.6;
        setRatio(
          Math.min(1, Math.max(0, (innerHeight * 0.4 - box.top) / total)),
        );
      });
    };
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, []);
  return (
    <div className="reader-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${ratio})` }} />
    </div>
  );
}

/** "Trong bài này": the section headings, the one on screen highlighted. */
export function ArticleToc({
  items,
}: {
  items: { id: string; text: string }[];
}) {
  const t = useT();
  const [active, setActive] = useState(items[0]?.id ?? "");
  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => !!el);
    const body = document.querySelector<HTMLElement>(".reader-body");
    let frame = 0;
    // The last heading above the top third of the screen; at the end of the
    // text (short articles cannot scroll that far) the last one.
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const atEnd =
          !!body && body.getBoundingClientRect().bottom <= innerHeight + 4;
        let current = headings[0];
        for (const h of headings)
          if (h.getBoundingClientRect().top <= innerHeight * 0.35) current = h;
        if (atEnd) current = headings.at(-1) ?? current;
        if (current) setActive(current.id);
      });
    };
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, [items]);
  return (
    <nav className="reader-toc" aria-label={t("Mục lục bài viết")}>
      <span className="reader-label">{t("Trong bài này")}</span>
      <ol>
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
            >
              <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** A− / A+ for the article text, remembered in this browser. */
export function TextSize() {
  const t = useT();
  const [size, setSize] = useState(2);
  useEffect(() => {
    let saved = 2;
    try {
      saved = Number(localStorage.getItem(SIZE_KEY) ?? 2);
    } catch {
      /* storage blocked */
    }
    if (saved >= 0 && saved < SIZES.length && saved !== 2) apply(saved);
  }, []);
  function apply(next: number) {
    setSize(next);
    document
      .querySelector<HTMLElement>(".reader-body")
      ?.style.setProperty("--reader-size", `${SIZES[next]}px`);
    try {
      localStorage.setItem(SIZE_KEY, String(next));
    } catch {
      /* storage blocked */
    }
  }
  return (
    <div className="reader-size" role="group" aria-label={t("Cỡ chữ")}>
      <button
        type="button"
        aria-label={t("Chữ nhỏ hơn")}
        disabled={size === 0}
        onClick={() => apply(size - 1)}
      >
        <Minus size={14} aria-hidden="true" />A
      </button>
      <button
        type="button"
        aria-label={t("Chữ lớn hơn")}
        disabled={size === SIZES.length - 1}
        onClick={() => apply(size + 1)}
      >
        <Plus size={14} aria-hidden="true" />A
      </button>
    </div>
  );
}

/** Facebook, Zalo / phone share sheet and copy link. */
export function ShareLinks({
  title,
  vertical = false,
}: {
  title: string;
  vertical?: boolean;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const url = () => window.location.href.split("#")[0];
  return (
    <div
      className={`reader-share${vertical ? " vertical" : ""}`}
      role="group"
      aria-label={t("Chia sẻ bài viết")}
    >
      <button
        type="button"
        aria-label={t("Chia sẻ lên Facebook")}
        onClick={() =>
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`,
            "share",
            "width=620,height=560",
          )
        }
      >
        <Facebook size={17} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={t("Gửi qua Zalo hoặc ứng dụng khác")}
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title, url: url() });
            } catch {
              /* closed */
            }
            return;
          }
          // Computers: copy the link to paste into Zalo.
          try {
            await navigator.clipboard.writeText(url());
            toast.success(t("Đã sao chép liên kết, hãy dán vào Zalo để gửi."));
          } catch {
            toast.error(
              t("Không sao chép được liên kết. Hãy sao chép từ thanh địa chỉ."),
            );
          }
        }}
      >
        <span className="reader-zalo" aria-hidden="true">
          Zalo
        </span>
      </button>
      <button
        type="button"
        aria-label={t("Sao chép liên kết")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            setCopied(true);
            toast.success(t("Đã sao chép liên kết bài viết."));
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            toast.error(
              t("Không sao chép được liên kết. Hãy sao chép từ thanh địa chỉ."),
            );
          }
        }}
      >
        {copied ? (
          <Check size={17} aria-hidden="true" />
        ) : (
          <Link2 size={17} aria-hidden="true" />
        )}
      </button>
      {!vertical && (
        <span className="reader-share-label">
          <Share2 size={14} aria-hidden="true" /> {t("Chia sẻ")}
        </span>
      )}
    </div>
  );
}

/** Round button back to the top, after the reader has scrolled a while. */
export function BackToTop() {
  const t = useT();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const update = () => setShown(scrollY > innerHeight * 1.2);
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, []);
  return (
    <button
      type="button"
      className="reader-top"
      data-shown={shown}
      aria-label={t("Lên đầu trang")}
      tabIndex={shown ? 0 : -1}
      onClick={() => scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp size={18} aria-hidden="true" />
    </button>
  );
}
