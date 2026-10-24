"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "./api";

type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  lockedUntil: string | null;
  roles: { role: { code: string; name: string } }[];
};
type Role = { code: string; name: string; description: string };

/** Staff accounts and roles (admins only). */
export function UsersPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([
        api<{ data: User[] }>("GET", "/admin/users"),
        api<{ data: Role[] }>("GET", "/admin/users/roles"),
      ]);
      setUsers(u.data);
      setRoles(r.data);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function update(
    user: User,
    body: Record<string, unknown>,
    done: string,
  ) {
    try {
      await api("PATCH", `/admin/users/${user.id}`, body);
      toast.success(done);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
  if (!users) return <p role="status">Đang tải người dùng…</p>;
  return (
    <>
      <section className="admin-panel admin-list-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </td>
                  <td>
                    {/* Saved on blur; used as the contact of units. */}
                    <input
                      className="user-phone-input"
                      type="tel"
                      defaultValue={user.phone ?? ""}
                      placeholder="Chưa có"
                      aria-label={`Số điện thoại của ${user.name}`}
                      maxLength={20}
                      onBlur={(event) => {
                        const phone = event.currentTarget.value.trim();
                        if (phone !== (user.phone ?? ""))
                          void update(user, { phone }, "Đã lưu số điện thoại.");
                      }}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={`Vai trò của ${user.name}`}
                      value={user.roles[0]?.role.code ?? ""}
                      disabled={user.id === currentUserId}
                      onChange={(event) =>
                        update(
                          user,
                          { roles: [event.target.value] },
                          "Đã cập nhật vai trò.",
                        )
                      }
                    >
                      {roles.map((role) => (
                        <option key={role.code} value={role.code}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span
                      className="status-pill"
                      data-state={user.status === "ACTIVE" ? "on" : "off"}
                    >
                      {user.status === "ACTIVE"
                        ? user.lockedUntil &&
                          new Date(user.lockedUntil) > new Date()
                          ? "Tạm khóa (đăng nhập sai)"
                          : "Đang hoạt động"
                        : "Đã vô hiệu hóa"}
                    </span>
                    <small>
                      {user.lastLoginAt
                        ? `Đăng nhập: ${new Date(user.lastLoginAt).toLocaleString("vi-VN")}`
                        : "Chưa đăng nhập"}
                    </small>
                  </td>
                  <td>
                    {user.id !== currentUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          update(
                            user,
                            {
                              status:
                                user.status === "ACTIVE"
                                  ? "DISABLED"
                                  : "ACTIVE",
                            },
                            user.status === "ACTIVE"
                              ? "Đã vô hiệu hóa tài khoản."
                              : "Đã kích hoạt tài khoản.",
                          )
                        }
                      >
                        {user.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-panel settings-panel">
        <h2>Thêm người dùng</h2>
        <p>
          Mật khẩu tối thiểu 12 ký tự. Người dùng nên đổi mật khẩu sau lần đăng
          nhập đầu tiên (qua quản trị viên).
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            try {
              await api("POST", "/admin/users", {
                email: String(data.get("email")),
                name: String(data.get("name")),
                phone: String(data.get("phone") ?? "").trim() || null,
                password: String(data.get("password")),
                roles: [String(data.get("role"))],
              });
              toast.success("Đã tạo người dùng.");
              form.reset();
              await load();
            } catch (error) {
              toast.error(errorMessage(error));
            }
          }}
        >
          <div className="form-grid">
            <label>
              Họ tên
              <input name="name" required minLength={2} maxLength={120} />
            </label>
            <label>
              Email
              <input name="email" type="email" required maxLength={160} />
            </label>
            <label>
              Số điện thoại (liên hệ căn hộ)
              <input
                name="phone"
                type="tel"
                maxLength={20}
                placeholder="vd 0905 123 456"
              />
            </label>
            <label>
              Mật khẩu ban đầu
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={200}
                autoComplete="new-password"
              />
            </label>
            <label>
              Vai trò
              <select name="role" defaultValue="sales">
                {roles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button type="submit">Tạo người dùng</Button>
        </form>
      </section>
    </>
  );
}
