"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link, { usePageNavigation } from "@/components/page-navigation";
import { usePathname, useRouter } from "next/navigation";
import { Editor } from "./editor";
import { statuses, names, type Kind, type Row } from "./model";
import Image from "next/image";

import {
  LayoutDashboard,
  Building2,
  House,
  Users,
  FileText,
  Settings,
  ArrowUpRight,
  Plus,
  Search,
  Pencil,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { projects, properties, posts, leads } from "@/data";
import type { Project, Property, Post, Lead } from "@/types";
import { readStore, writeStore } from "@/lib/storage";
import { Button } from "@/components/ui/button";
const LeadChart = dynamic(() => import("./chart"), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 260 }} />,
});
type Tab = "dashboard" | Kind | "settings";
type Store = {
  projects: Project[];
  properties: Property[];
  posts: Post[];
  leads: Lead[];
};
const initial: Store = { projects, properties, posts, leads };
const tabs: { id: Tab; label: string; icon: typeof House }[] = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "projects", label: "Dự án", icon: Building2 },
  { id: "properties", label: "Căn hộ", icon: House },
  { id: "leads", label: "Khách hàng", icon: Users },
  { id: "posts", label: "Bài viết", icon: FileText },
  { id: "settings", label: "Cài đặt", icon: Settings },
];
export default function Dashboard() {
  const router = useRouter();
  const navigate = usePageNavigation();
  const goTo = (href: string) =>
    navigate ? navigate(href) : router.push(href);
  const pathname = usePathname();
  const [, , section, recordId, action] = pathname.split("/");
  const tab = (section || "dashboard") as Tab;
  function setTab(next: Tab) {
    goTo(next === "dashboard" ? "/admin" : `/admin/${next}`);
    setQuery("");
    setStatus("");
  }

  const [store, setStore] = useState<Store>(() => ({
    projects: readStore("projects", projects),
    properties: readStore("properties", properties),
    posts: readStore("posts", posts),
    leads: readStore("leads", leads),
  }));
  const ready = true;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const kind = tab === "dashboard" || tab === "settings" ? null : tab;
  const selectedRow = kind
    ? (store[kind] as Row[]).find((row) => row.id === recordId)
    : undefined;
  const editor =
    kind && (recordId === "new" || (action === "edit" && selectedRow))
      ? { kind, row: selectedRow || null }
      : null;
  const deleting =
    kind && action === "delete" && selectedRow
      ? { kind, id: selectedRow.id }
      : null;
  const resetOpen = tab === "settings" && recordId === "reset";
  const missing = !!kind && !!recordId && recordId !== "new" && !selectedRow;
  function closePage() {
    setTab(tab);
  }

  function resetData() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("dvg:"))
        .forEach((k) => localStorage.removeItem(k));
      setStore(initial);
      closePage();
      toast.success("Đã khôi phục dữ liệu mẫu.");
    } catch {
      toast.error("Không thể xóa dữ liệu trình duyệt.");
    }
  }
  function save(kind: Kind, row: Row) {
    const rows = store[kind] as Row[];
    const updated = rows.some((r) => r.id === row.id)
      ? rows.map((r) => (r.id === row.id ? row : r))
      : [row, ...rows];
    if (writeStore(kind, updated)) {
      setStore({ ...store, [kind]: updated });
      closePage();
      toast.success("Đã lưu thay đổi demo.");
    }
  }
  function remove() {
    if (!deleting) return;
    if (
      deleting.kind === "projects" &&
      store.properties.some((p) => p.projectId === deleting.id)
    ) {
      toast.warning(
        "Dự án đang có căn hộ liên kết. Hãy chuyển hoặc xóa các căn hộ trước.",
      );
      closePage();
      return;
    }
    const updated = store[deleting.kind].filter((r) => r.id !== deleting.id);
    if (writeStore(deleting.kind, updated)) {
      setStore({ ...store, [deleting.kind]: updated });
      toast.success("Đã xóa dữ liệu demo.");
      closePage();
    }
  }
  const rows = kind
    ? (store[kind] as Row[]).filter(
        (r) =>
          `${r.name} ${"email" in r ? r.email : ""}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (!status || r.status === status),
      )
    : [];
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          <Image
            src="/images/dat-vang-group-logo-transparent.png"
            alt=""
            width={48}
            height={46}
          />
          <span>
            ĐẤT VÀNG<small>WORKSPACE</small>
          </span>
        </Link>
        <span className="admin-nav-label">QUẢN LÝ KHÔNG GIAN</span>
        <nav aria-label="Quản trị">
          {tabs.map((t) => (
            <Link
              href={t.id === "dashboard" ? "/admin" : `/admin/${t.id}`}
              aria-current={tab === t.id ? "page" : undefined}
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => {
                setQuery("");
                setStatus("");
              }}
            >
              <t.icon size={19} />
              {t.label}
              {t.id === "leads" && (
                <span>
                  {store.leads.filter((l) => l.status === "Mới").length}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="demo-mode">● Demo Mode</span>
          <p>Thay đổi lưu trên trình duyệt. Không có máy chủ hoặc xác thực.</p>
          <Link href="/">
            Xem website
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </aside>
      <div className="admin-content">
        <main id="main" className="admin-main" key={pathname}>
          {recordId && (
            <nav className="admin-breadcrumb" aria-label="Đường dẫn">
              <Link href="/admin">Tổng quan</Link>
              <span>/</span>
              <Link href={tab === "dashboard" ? "/admin" : `/admin/${tab}`}>
                {tabs.find((t) => t.id === tab)?.label}
              </Link>
              {recordId && (
                <>
                  <span>/</span>
                  <span>
                    {recordId === "new"
                      ? "Thêm mới"
                      : action === "delete" || resetOpen
                        ? "Xác nhận"
                        : "Chỉnh sửa"}
                  </span>
                </>
              )}
            </nav>
          )}
          <div className="admin-title">
            <div>
              <h1>
                {editor
                  ? `${editor.row ? "Chỉnh sửa" : "Thêm mới"} ${names[editor.kind]}`
                  : tab === "dashboard"
                    ? "Chào ngày mới, An."
                    : tabs.find((t) => t.id === tab)?.label}
              </h1>
            </div>
            {kind && !recordId && (
              <Button
                disabled={!ready}
                onClick={() => goTo(`/admin/${kind}/new`)}
              >
                <Plus size={18} />
                Thêm mới
              </Button>
            )}
          </div>
          {missing ? (
            <section className="admin-panel">
              <h2>Không tìm thấy bản ghi</h2>
              <p>Mục này đã bị xóa hoặc chưa có trong trình duyệt hiện tại.</p>
              <Button onClick={closePage}>Về danh sách</Button>
            </section>
          ) : deleting || resetOpen ? (
            <section className="admin-panel admin-confirm-page">
              <span className="eyebrow">XÁC NHẬN THAO TÁC</span>
              <h2>
                {resetOpen
                  ? "Khôi phục dữ liệu mẫu?"
                  : `Xóa ${selectedRow?.name}?`}
              </h2>
              <p>
                {resetOpen
                  ? "Các chỉnh sửa quản trị, yêu cầu đã gửi, bản tin và mục yêu thích trên trình duyệt này sẽ bị xóa."
                  : "Thao tác này không thể hoàn tác riêng lẻ. Dự án có căn hộ liên kết sẽ được bảo vệ khỏi việc xóa."}
              </p>
              <div className="dialog-actions">
                <Button variant="outline" onClick={closePage}>
                  Hủy
                </Button>
                <Button onClick={resetOpen ? resetData : remove}>
                  Xác nhận
                </Button>
              </div>
            </section>
          ) : editor ? (
            <Editor
              key={pathname}
              kind={editor.kind}
              row={editor.row}
              projects={store.projects}
              existing={store[editor.kind]}
              onSave={(row) => save(editor.kind, row)}
              onCancel={closePage}
            />
          ) : !ready ? (
            <p role="status">Đang nạp dữ liệu trên trình duyệt…</p>
          ) : tab === "dashboard" ? (
            <>
              <div className="admin-stats">
                {[
                  {
                    label: "Tổng dự án",
                    value: store.projects.length,
                    icon: Building2,
                  },
                  {
                    label: "Căn hộ quản lý",
                    value: store.properties.length,
                    icon: House,
                  },
                  {
                    label: "Căn hộ còn trống",
                    value: store.properties.filter(
                      (p) => p.status === "Còn trống",
                    ).length,
                    icon: LayoutDashboard,
                  },
                  {
                    label: "Yêu cầu mới",
                    value: store.leads.filter((l) => l.status === "Mới").length,
                    icon: Users,
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <span>
                      {s.label}
                      <s.icon size={19} />
                    </span>
                    <strong>{s.value.toString().padStart(2, "0")}</strong>
                    <small>Số liệu trong bản demo</small>
                  </div>
                ))}
              </div>
              <div className="admin-dashboard-grid">
                <section className="admin-panel">
                  <div className="panel-heading">
                    <h2>Yêu cầu tư vấn theo tháng</h2>
                    <span>2026 · Demo</span>
                  </div>
                  <LeadChart leads={store.leads} />
                </section>
                <section className="admin-panel">
                  <h2>Tình trạng căn hộ</h2>
                  <div className="occupancy">
                    <strong>
                      {Math.round(
                        (store.properties.filter(
                          (p) => p.status === "Đã cho thuê",
                        ).length /
                          Math.max(1, store.properties.length)) *
                          100,
                      )}
                      <small>%</small>
                    </strong>
                    <span>Đã cho thuê · Dữ liệu mẫu</span>
                  </div>
                  <div className="occupancy-bar">
                    <span
                      style={{
                        width: `${(store.properties.filter((p) => p.status === "Đã cho thuê").length / Math.max(1, store.properties.length)) * 100}%`,
                      }}
                    />
                  </div>
                  <p>
                    {
                      store.properties.filter((p) => p.status === "Còn trống")
                        .length
                    }{" "}
                    căn hộ sẵn sàng trong dữ liệu demo
                  </p>
                  <button
                    className="text-link"
                    onClick={() => setTab("properties")}
                  >
                    Quản lý căn hộ
                    <ArrowUpRight size={16} />
                  </button>
                </section>
              </div>
              <section className="admin-panel">
                <div className="panel-heading">
                  <h2>Yêu cầu gần đây</h2>
                  <button onClick={() => setTab("leads")} className="text-link">
                    Xem tất cả
                    <ArrowUpRight size={17} />
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Khách hàng</th>
                        <th>Nhu cầu</th>
                        <th>Trạng thái</th>
                        <th>Phụ trách</th>
                      </tr>
                    </thead>
                    <tbody>
                      {store.leads.slice(0, 5).map((l) => (
                        <tr key={l.id}>
                          <td>
                            <strong>{l.name}</strong>
                            <small>{l.email}</small>
                          </td>
                          <td>{l.source}</td>
                          <td>
                            <span className="status-pill">{l.status}</span>
                          </td>
                          <td>{l.assignment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : tab === "settings" ? (
            <SettingsPanel onReset={() => goTo("/admin/settings/reset")} />
          ) : (
            kind && (
              <section className="admin-panel admin-list-panel">
                <div className="admin-table-toolbar">
                  <label className="admin-search">
                    <Search size={18} />
                    <input
                      aria-label="Tìm trong bảng"
                      placeholder="Tìm kiếm tên, email…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Lọc trạng thái"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Tất cả trạng thái</option>
                    {statuses[kind].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <span>{rows.length} mục</span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{kind === "leads" ? "Khách hàng" : "Tên"}</th>
                        <th>
                          {kind === "properties"
                            ? "Giá / Dự án"
                            : kind === "leads"
                              ? "Nhu cầu / Người phụ trách"
                              : "Thông tin"}
                        </th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.name}</strong>
                            <small>
                              {"email" in row
                                ? `${row.email} ${row.phone}`
                                : "slug" in row
                                  ? row.slug
                                  : ""}
                            </small>
                          </td>
                          <td>
                            {"price" in row ? (
                              <>
                                {row.price} triệu / tháng
                                <small>
                                  {
                                    store.projects.find(
                                      (p) => p.id === row.projectId,
                                    )?.name
                                  }
                                </small>
                              </>
                            ) : "source" in row ? (
                              <>
                                {row.source}
                                <small>{row.assignment}</small>
                              </>
                            ) : "location" in row ? (
                              row.location
                            ) : (
                              row.category
                            )}
                          </td>
                          <td>
                            <span className="status-pill">{row.status}</span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                aria-label={`Sửa ${row.name}`}
                                onClick={() =>
                                  goTo(`/admin/${kind}/${row.id}/edit`)
                                }
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                aria-label={`Xóa ${row.name}`}
                                onClick={() =>
                                  goTo(`/admin/${kind}/${row.id}/delete`)
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!rows.length && (
                  <div className="empty-state">
                    <h3>Chưa có kết quả</h3>
                    <p>Thử đổi từ khóa, trạng thái hoặc thêm dữ liệu mới.</p>
                  </div>
                )}
              </section>
            )
          )}
        </main>
      </div>
    </div>
  );
}

function SettingsPanel({ onReset }: { onReset: () => void }) {
  const saved = readStore<Record<string, string>>("settings", {});
  return (
    <section className="admin-panel settings-panel">
      <h2>Nhận diện & thông tin liên hệ</h2>
      <p>
        Thiết lập demo được lưu cục bộ để xem lại; chưa áp dụng lên website công
        khai.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          if (writeStore("settings", data))
            toast.success("Đã lưu cấu hình demo.");
        }}
      >
        <div className="form-grid">
          {[
            ["brand", "Tên thương hiệu", "Đất Vàng Group"],
            ["legalName", "Tên pháp lý công ty", ""],
            ["taxCode", "Mã số thuế", ""],
            ["representative", "Người đại diện", ""],
            [
              "logo",
              "Đường dẫn logo",
              "/images/dat-vang-group-logo-transparent.png",
            ],
            ["tagline", "Thông điệp thương hiệu", "Tận tâm trong từng kết nối"],
            ["email", "Email liên hệ", "contact@example.com"],
            ["phone", "Điện thoại", ""],
            ["address", "Địa chỉ", "Đang cập nhật"],
            ["social", "Liên kết mạng xã hội", "https://example.com"],
            ["color", "Màu thương hiệu", "#123c32"],
            ["workingHours", "Giờ làm việc", ""],
            ["website", "Website chính thức", ""],
            ["facebook", "Facebook", ""],
            ["zalo", "Zalo", ""],
            ["seoTitle", "Tiêu đề SEO mặc định", "Đất Vàng Group"],
            ["seoDescription", "Mô tả SEO mặc định", ""],
            ["notificationEmail", "Email tiếp nhận yêu cầu", ""],
          ].map(([name, label, value]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                type={
                  name === "color"
                    ? "color"
                    : ["email", "notificationEmail"].includes(name)
                      ? "email"
                      : ["social", "website", "facebook", "zalo"].includes(name)
                        ? "url"
                        : "text"
                }
                defaultValue={saved[name] ?? value}
                maxLength={200}
              />
            </label>
          ))}
        </div>
        <Button type="submit">Lưu cài đặt</Button>
      </form>
      <hr />
      <h2>Vùng quản lý dữ liệu</h2>
      <p>Xóa các thay đổi demo của ứng dụng và quay về dữ liệu ban đầu.</p>
      <Button variant="outline" onClick={onReset}>
        <RotateCcw size={17} />
        Khôi phục dữ liệu mẫu
      </Button>
    </section>
  );
}
