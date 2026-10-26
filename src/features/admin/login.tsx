"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "@/components/page-navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { api, errorMessage } from "./api";

// The 3D city is decoration: loaded after the form, only on wide screens.
const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => null,
});

/** Admin sign-in. Tokens are set by the API as httpOnly cookies. */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 900px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const caps = (event: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);

  return (
    <main id="main" className="admin-login">
      <section className="login-brand">
        <div className="login-brand-head">
          <Image
            src="/images/dat-vang-group-logo-transparent.png"
            alt="Đất Vàng Group"
            width={56}
            height={53}
            priority
          />
          <span>
            ĐẤT VÀNG GROUP
            <small>WORKSPACE</small>
          </span>
        </div>
        {wide && <HeroScene far />}
        <div className="login-brand-copy">
          <h2>Quản lý dự án, căn hộ và khách hàng ở một nơi.</h2>
          <p>
            Không gian làm việc nội bộ của Đất Vàng Group: cập nhật nội dung
            website, theo dõi yêu cầu tư vấn và hồ sơ tuyển dụng.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <form
          className="login-card"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setBusy(true);
            setError("");
            try {
              await api("POST", "/auth/login", {
                email: String(data.get("email") ?? "").trim(),
                password: String(data.get("password") ?? ""),
              });
              router.replace(
                next.startsWith("/admin/") || next === "/admin"
                  ? next
                  : "/admin",
              );
            } catch (err) {
              setError(errorMessage(err));
              setBusy(false);
            }
          }}
        >
          <Image
            className="login-card-logo"
            src="/images/dat-vang-group-logo-transparent.png"
            alt=""
            width={52}
            height={49}
          />
          <span className="eyebrow">KHU VỰC QUẢN TRỊ</span>
          <h1>Đăng nhập quản trị</h1>
          <p className="login-lead">
            Dành cho nhân sự Đất Vàng Group được cấp tài khoản.
          </p>

          {error && (
            <p className="login-error" role="alert">
              <TriangleAlert size={17} aria-hidden="true" />
              {error}
            </p>
          )}

          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <span className="login-input">
              <Mail size={17} aria-hidden="true" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                maxLength={160}
                placeholder="ten@datvanggroup.vn"
                autoFocus={wide}
              />
            </span>
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Mật khẩu</label>
            <span className="login-input">
              <Lock size={17} aria-hidden="true" />
              <input
                id="login-password"
                name="password"
                type={reveal ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={200}
                placeholder="••••••••"
                onKeyUp={caps}
                onKeyDown={caps}
                aria-describedby={capsLock ? "login-caps" : undefined}
              />
              <button
                type="button"
                className="login-reveal"
                aria-label={reveal ? "Ẩn ký tự đã nhập" : "Hiện ký tự đã nhập"}
                aria-pressed={reveal}
                onClick={() => setReveal((v) => !v)}
              >
                {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
            {capsLock && (
              <small id="login-caps" className="login-caps">
                Caps Lock đang bật.
              </small>
            )}
          </div>

          <button type="submit" className="login-submit" disabled={busy}>
            {busy ? (
              <>
                <i className="login-spinner" aria-hidden="true" />
                Đang đăng nhập…
              </>
            ) : (
              <>
                Đăng nhập
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>

          <p className="login-note">
            <ShieldCheck size={15} aria-hidden="true" />
            Phiên đăng nhập được mã hóa. Tài khoản bị khóa tạm thời sau nhiều
            lần nhập sai.
          </p>
          <Link className="login-back" href="/">
            <ArrowLeft size={15} aria-hidden="true" />
            Về website
          </Link>
        </form>
      </section>
    </main>
  );
}
