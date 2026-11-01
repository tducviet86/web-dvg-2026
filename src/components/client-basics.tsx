"use client";
/**
 * Small client pieces used on every public page (toasts, scroll reveal,
 * reading progress, favourites, newsletter). Kept apart from the forms in
 * interactive.tsx so pages do not download the animation and form
 * libraries just for these.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Heart } from "lucide-react";
import { toast, Toaster } from "sonner";
import { readStore, writeStore } from "@/lib/storage";
import { postPublic } from "@/lib/api/client";
import { useT } from "@/i18n/client";
import { track } from "@/lib/analytics";

function subscribeNarrow(callback: () => void) {
  const query = window.matchMedia("(max-width: 800px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
export function Providers() {
  // Phones: toasts at the top so they never cover the call bar or contact buttons.
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia("(max-width: 800px)").matches,
    () => false,
  );
  return (
    <Toaster
      richColors
      closeButton
      position={narrow ? "top-center" : "bottom-right"}
      toastOptions={{ style: { fontFamily: "var(--font-body)" } }}
    />
  );
}
/**
 * Fades content up as it scrolls into view. The server always renders it
 * visible; only blocks still below the fold are hidden after hydration, so
 * nothing flickers, nothing shifts and content stays readable without JS.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Stagger in milliseconds (e.g. index × 80 in a grid). */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      element.getBoundingClientRect().top < window.innerHeight * 0.95
    )
      return;
    element.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.dataset.reveal = "shown";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      delete element.dataset.reveal;
    };
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${className}`.trim()}
      style={
        delay
          ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
/** Thin gold bar at the top showing how far the page has been read. */
export function Progress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div
      ref={bar}
      className="scroll-progress"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
function subscribeFavorites(callback: () => void) {
  window.addEventListener("dvg-storage", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("dvg-storage", callback);
    window.removeEventListener("storage", callback);
  };
}
export function Favorite({ id }: { id: string }) {
  const t = useT();
  const saved = useSyncExternalStore(
    subscribeFavorites,
    () => readStore<string[]>("favorites", []).includes(id),
    () => false,
  );
  return (
    <button
      type="button"
      className={`favorite ${saved ? "selected" : ""}`}
      aria-label={t(saved ? "Bỏ yêu thích" : "Lưu căn hộ yêu thích")}
      aria-pressed={saved}
      onClick={() => {
        const current = readStore<string[]>("favorites", []);
        const next = saved ? current.filter((x) => x !== id) : [...current, id];
        if (writeStore("favorites", next)) {
          toast.success(
            t(saved ? "Đã bỏ khỏi yêu thích" : "Đã lưu căn hộ yêu thích"),
          );
        }
      }}
    >
      <Heart size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function Newsletter() {
  const t = useT();
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const email = String(new FormData(form).get("email") ?? "").trim();
        if (!EMAIL.test(email) || email.length > 120) {
          setError("Vui lòng nhập email hợp lệ.");
          return;
        }
        setError("");
        const result = await postPublic("/newsletter", { email });
        if (!result.ok) {
          toast.error(t(result.message));
          return;
        }
        track("sign_up", { form: "newsletter" });
        toast.success(t("Đã đăng ký nhận bản tin."));
        form.reset();
      }}
      noValidate
    >
      <label htmlFor="newsletter">
        {t("Nhận những góc nhìn mới về không gian sống")}
      </label>
      <div className="newsletter">
        <input
          id="newsletter"
          name="email"
          type="email"
          placeholder={t("Email của bạn")}
          aria-invalid={!!error}
          onInput={() => error && setError("")}
        />
        <button aria-label={t("Đăng ký bản tin")}>
          <ArrowRight size={20} />
        </button>
      </div>
      {error && <span className="field-error">{t(error)}</span>}
    </form>
  );
}
