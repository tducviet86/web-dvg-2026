"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "./api";

/** Admin sign-in. Tokens are set by the API as httpOnly cookies. */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main id="main" className="admin-login">
      <form
        className="admin-panel admin-editor"
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
              next.startsWith("/admin/") || next === "/admin" ? next : "/admin",
            );
          } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
          }
        }}
      >
        <Image
          src="/images/dat-vang-group-logo-transparent.png"
          alt="Đất Vàng Group"
          width={64}
          height={61}
        />
        <h1>Đăng nhập quản trị</h1>
        <p>Dành cho nhân sự Đất Vàng Group được cấp tài khoản.</p>
        {error && (
          <p className="editor-errors" role="alert">
            {error}
          </p>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={160}
          />
        </label>
        <label>
          Mật khẩu
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
        </label>
        <Button type="submit" disabled={busy}>
          <LogIn size={17} />
          {busy ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
      </form>
    </main>
  );
}
