"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link, { usePageNavigation } from "@/components/page-navigation";
import { usePathname, useRouter } from "next/navigation";
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
  GalleryHorizontalEnd,
  Languages,
  Download,
  LogOut,
  UserCog,
  KeyRound,
  BadgeDollarSign,
  Files,
  BriefcaseBusiness,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Editor, formKeyOf, type Lookups } from "./editor";
import type { FormIssue } from "./error-dialog";
import {
  BannerAdmin,
  bannerPayload,
  projectBannerDraft,
  type ProjectBannerDraft,
  type ProjectBannerRecord,
} from "./banners";
import { LoginForm } from "./login";
import { UsersPanel } from "./users";
import { TranslationsPanel } from "./translations";
import { ApplicationsPanel } from "./applications";
import {
  api,
  AdminApiError,
  errorMessage,
  constraintText,
  fieldErrorsOf,
  SESSION_EXPIRED,
  type Session,
} from "./api";
import {
  formValues,
  listItem,
  mediaState,
  payload,
  type AdminDto,
  type MediaState,
} from "./adapters";
import {
  endpoints,
  names,
  sectionPermission,
  statuses,
  writePermission,
  type FormValues,
  type Kind,
  type ListItem,
} from "./model";

const LeadChart = dynamic(() => import("./chart"), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 260 }} />,
});
type Tab =
  | "dashboard"
  | Kind
  | "banners"
  | "applications"
  | "settings"
  | "users"
  | "translations";
const tabs: { id: Tab; label: string; icon: typeof House }[] = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "projects", label: "Dự án", icon: Building2 },
  { id: "banners", label: "Banner", icon: GalleryHorizontalEnd },
  { id: "properties", label: "Căn hộ", icon: House },
  { id: "leads", label: "Khách hàng", icon: Users },
  { id: "posts", label: "Bài viết", icon: FileText },
  { id: "pages", label: "Trang nội dung", icon: Files },
  { id: "jobs", label: "Tuyển dụng", icon: BriefcaseBusiness },
  { id: "applications", label: "Ứng viên", icon: UserCheck },
  { id: "translations", label: "Bản dịch", icon: Languages },
  { id: "users", label: "Người dùng", icon: UserCog },
  { id: "settings", label: "Cài đặt", icon: Settings },
];
const KINDS: Kind[] = [
  "projects",
  "properties",
  "posts",
  "pages",
  "jobs",
  "leads",
];
type EditorState = {
  /** Route the state belongs to; stale state is ignored after navigation. */
  path: string;
  kind: Kind;
  isNew: boolean;
  dto: AdminDto | null;
  values: FormValues;
  media: MediaState;
  banner?: {
    draft: ProjectBannerDraft;
    existing: boolean;
    maxPosition: number;
  };
};

export default function Dashboard() {
  const pathname = usePathname();
  const [, , section] = pathname.split("/");
  if (section === "login") {
    const next =
      typeof window === "undefined"
        ? "/admin"
        : new URLSearchParams(window.location.search).get("next") || "/admin";
    return <LoginForm next={next} />;
  }
  return <Workspace />;
}

function Workspace() {
  const router = useRouter();
  const navigate = usePageNavigation();
  const goTo = useCallback(
    (href: string) => (navigate ? navigate(href) : router.push(href)),
    [navigate, router],
  );
  const pathname = usePathname();
  const [, , section, recordId, action] = pathname.split("/");
  const tab = (section || "dashboard") as Tab;
  const kind = (KINDS as string[]).includes(tab) ? (tab as Kind) : null;

  const [session, setSession] = useState<Session | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  /** Trang nội dung: company pages vs. "Lĩnh vực hoạt động". */
  const [pageKind, setPageKind] = useState("");
  const [rows, setRows] = useState<ListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [editorState, setEditor] = useState<EditorState | null>(null);
  const [missingPath, setMissing] = useState("");
  const editor = editorState?.path === pathname ? editorState : null;
  const missing = missingPath === pathname;
  const [lookups, setLookups] = useState<Lookups>({
    projects: [],
    propertyTypes: [],
    blogCategories: [],
    users: [],
    projectPlaces: {},
  });
  const can = (permission: string) =>
    !!session?.permissions.includes(permission);

  // ── session ──
  useEffect(() => {
    const toLogin = () =>
      router.replace(
        `/admin/login?next=${encodeURIComponent(window.location.pathname)}`,
      );
    window.addEventListener(SESSION_EXPIRED, toLogin);
    api<{ data: Session }>("GET", "/auth/me")
      .then((res) => setSession(res.data))
      .catch(() =>
        // One refresh attempt before giving up on the session.
        api("POST", "/auth/refresh")
          .then(() => api<{ data: Session }>("GET", "/auth/me"))
          .then((res) => setSession(res.data))
          .catch(toLogin),
      );
    return () => window.removeEventListener(SESSION_EXPIRED, toLogin);
  }, [router]);

  // ── list data (server-side search and status filter) ──
  // Only the latest request may fill the table (filters can change while an
  // older one is still loading).
  const listRequest = useRef(0);
  const loadList = useCallback(async () => {
    if (!kind || !session) return;
    const request = ++listRequest.current;
    const params = new URLSearchParams({ pageSize: "100" });
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (kind === "pages" && pageKind) params.set("kind", pageKind);
    try {
      const res = await api<{ data: AdminDto[]; meta: { total: number } }>(
        "GET",
        `${endpoints[kind]}?${params}`,
      );
      if (request !== listRequest.current) return;
      setRows(res.data.map((dto) => listItem(kind, dto)));
      setTotal(res.meta.total);
    } catch (error) {
      if (request !== listRequest.current) return;
      toast.error(errorMessage(error));
      setRows([]);
    }
  }, [kind, session, query, status, pageKind]);
  useEffect(() => {
    if (!kind || recordId) return;
    const timer = window.setTimeout(() => void loadList(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [kind, recordId, query, loadList]);

  // ── lookups for editor selects ──
  const loadLookups = useCallback(
    async (forKind: Kind) => {
      const next = { ...lookups };
      if (forKind === "properties") {
        const [projects, types] = await Promise.all([
          api<{
            data: {
              id: string;
              name: string;
              location: string;
              address: string | null;
              mapUrl: string | null;
              latitude: number | null;
            }[];
          }>("GET", "/admin/projects?pageSize=100"),
          api<{ data: { code: string; name: string }[] }>(
            "GET",
            "/property-types",
          ),
        ]);
        next.projects = projects.data.map((p) => [p.id, p.name]);
        next.projectPlaces = Object.fromEntries(
          projects.data.map((p) => [
            p.id,
            {
              name: p.name,
              location: p.location,
              address: p.address ?? "",
              hasMap: !!(p.mapUrl || p.latitude != null),
            },
          ]),
        );
        next.propertyTypes = types.data.map((t) => [t.code, t.name]);
      }
      if (forKind === "posts") {
        const categories = await api<{
          data: { slug: string; name: string }[];
        }>("GET", "/admin/blog/categories");
        next.blogCategories = categories.data.map((c) => [c.slug, c.name]);
      }
      if (forKind === "leads") {
        const users = await api<{ data: { id: string; name: string }[] }>(
          "GET",
          "/admin/users/assignable",
        );
        next.users = users.data.map((u) => [u.id, u.name]);
      }
      setLookups(next);
    },
    [lookups],
  );

  // ── editor data ──
  useEffect(() => {
    if (
      !session ||
      !kind ||
      !recordId ||
      (recordId !== "new" && action !== "edit")
    )
      return;
    let alive = true;
    (async () => {
      try {
        await loadLookups(kind);
        const dto =
          recordId === "new"
            ? null
            : (
                await api<{ data: AdminDto }>(
                  "GET",
                  `${endpoints[kind]}/${recordId}`,
                )
              ).data;
        let banner: EditorState["banner"];
        if (kind === "projects") {
          const all = await api<{ data: unknown[] }>("GET", "/admin/banners");
          const record =
            (dto?.banner as
              | (ProjectBannerRecord & {
                  image: { id: string; url: string } | null;
                  mobileImage: { id: string; url: string } | null;
                })
              | null) ?? null;
          banner = {
            draft: projectBannerDraft(
              record,
              {
                image: record?.image ?? null,
                mobileImage: record?.mobileImage ?? null,
              },
              all.data.length,
            ),
            existing: !!record,
            maxPosition: all.data.length + (record ? 0 : 1),
          };
        }
        if (!alive) return;
        setEditor({
          path: pathname,
          kind,
          isNew: !dto,
          dto,
          values: { ...formValues(kind, dto), id: dto?.id },
          media: mediaState(kind, dto),
          banner,
        });
      } catch (error) {
        if (!alive) return;
        if (error instanceof AdminApiError && error.status === 404)
          setMissing(pathname);
        else toast.error(errorMessage(error));
      }
    })();
    return () => {
      alive = false;
    };
    // Lookups are refreshed per editor open; not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, kind, recordId, action, pathname]);

  function setTab(next: Tab) {
    goTo(next === "dashboard" ? "/admin" : `/admin/${next}`);
    setQuery("");
    setStatus("");
    setPageKind("");
  }
  const closePage = () => setTab(tab);

  async function save(
    values: FormValues,
    media: MediaState,
    banner?: ProjectBannerDraft,
  ): Promise<FormIssue[] | void> {
    if (!editor) return;
    const { kind: k, isNew, dto } = editor;
    const body: Record<string, unknown> = payload(k, values, media, isNew);
    if (!isNew) body.expectedUpdatedAt = dto?.updatedAt;
    if (k === "projects" && banner) body.banner = bannerPayload(banner);
    try {
      if (isNew) {
        const created = await api<{ data: AdminDto }>(
          "POST",
          endpoints[k],
          body,
        );
        // Manually entered leads: apply follow-up fields after creation.
        if (k === "leads")
          await api(
            "PATCH",
            `${endpoints[k]}/${created.data.id}`,
            payload(k, values, media, false),
          );
      } else await api("PATCH", `${endpoints[k]}/${dto!.id}`, body);
      const noun = names[k];
      toast.success(isNew ? `Đã tạo ${noun}.` : `Đã lưu ${noun}.`);
      closePage();
    } catch (error) {
      // Field errors from the API are shown on the fields and in the popup.
      const fields = fieldErrorsOf(error);
      if (fields.length)
        return fields.map((item) => ({
          field: formKeyOf(item.field),
          message:
            constraintText[item.constraints[0]] ??
            item.messages[0] ??
            "không hợp lệ",
        }));
      return [{ message: errorMessage(error) }];
    }
  }
  async function remove(id: string) {
    if (!kind) return;
    try {
      await api("DELETE", `${endpoints[kind]}/${id}`);
      toast.success(
        kind === "leads" ? "Đã xóa yêu cầu." : "Đã chuyển vào lưu trữ.",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
    closePage();
  }
  async function logout() {
    try {
      await api("POST", "/auth/logout");
    } finally {
      router.replace("/admin/login");
    }
  }

  if (!session)
    return (
      <main id="main" className="not-found">
        <p role="status">Đang kiểm tra phiên đăng nhập…</p>
      </main>
    );
  const visibleTabs = tabs.filter(
    (t) => t.id === "dashboard" || can(sectionPermission[t.id]),
  );
  const allowed = tab === "dashboard" || can(sectionPermission[tab]);
  const deleting = kind && action === "delete" ? recordId : null;
  const selectedName = deleting
    ? rows?.find((r) => r.id === deleting)?.name
    : undefined;
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
          {visibleTabs.map((t) => (
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
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="demo-mode">● {session.roles.join(", ")}</span>
          <p>{session.name}</p>
          <Link href="/">
            Xem website
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </aside>
      <div className="admin-content">
        <div className="admin-userbar">
          <span>{session.email}</span>
          <button type="button" onClick={logout}>
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
        <main id="main" className="admin-main" key={pathname}>
          <div className="admin-title">
            <div>
              <h1>
                {kind && recordId && action !== "delete"
                  ? `${recordId === "new" ? "Thêm mới" : "Chỉnh sửa"} ${names[kind]}`
                  : tab === "banners" && recordId === "new"
                    ? "Thêm mới banner"
                    : tab === "banners" && action === "edit"
                      ? "Chỉnh sửa banner"
                      : tab === "dashboard"
                        ? "Tổng quan quản trị"
                        : tabs.find((t) => t.id === tab)?.label}
              </h1>
            </div>
            {!recordId &&
              (kind
                ? can(writePermission[kind])
                : tab === "banners" && can("banners:write")) && (
                <Button onClick={() => goTo(`/admin/${kind || tab}/new`)}>
                  <Plus size={18} />
                  Thêm mới
                </Button>
              )}
          </div>
          {!allowed ? (
            <section className="admin-panel">
              <h2>Bạn không có quyền truy cập mục này</h2>
              <p>Liên hệ quản trị viên nếu bạn cần quyền.</p>
            </section>
          ) : missing ? (
            <section className="admin-panel">
              <h2>Không tìm thấy bản ghi</h2>
              <p>Mục này đã bị xóa hoặc chuyển vào lưu trữ.</p>
              <Button onClick={closePage}>Về danh sách</Button>
            </section>
          ) : deleting ? (
            <section className="admin-panel admin-confirm-page">
              <span className="eyebrow">XÁC NHẬN THAO TÁC</span>
              <h2>
                {kind === "leads" ? "Xóa" : "Lưu trữ"}{" "}
                {selectedName ?? names[kind!]}?
              </h2>
              <p>
                {kind === "projects"
                  ? "Dự án sẽ ngừng hiển thị (đường dẫn trả về 410) và banner trang chủ liên kết sẽ được gỡ. Dự án còn căn hộ liên kết sẽ không thể lưu trữ."
                  : kind === "leads"
                    ? "Yêu cầu sẽ bị ẩn khỏi danh sách. Thao tác được ghi vào nhật ký."
                    : "Nội dung sẽ ngừng hiển thị trên website và được giữ trong cơ sở dữ liệu."}
              </p>
              <div className="dialog-actions">
                <Button variant="outline" onClick={closePage}>
                  Hủy
                </Button>
                <Button onClick={() => remove(deleting)}>Xác nhận</Button>
              </div>
            </section>
          ) : kind && recordId ? (
            editor && editor.kind === kind ? (
              <Editor
                key={pathname}
                kind={editor.kind}
                values={editor.values}
                media={editor.media}
                isNew={editor.isNew}
                lookups={lookups}
                banner={editor.banner}
                previewHref={
                  !editor.isNew && (kind === "projects" || kind === "posts")
                    ? `/api/preview?type=${kind === "projects" ? "project" : "post"}&slug=${encodeURIComponent(String(editor.values.slug))}`
                    : undefined
                }
                onSave={save}
                onCancel={closePage}
              />
            ) : (
              <p role="status">Đang tải dữ liệu…</p>
            )
          ) : tab === "banners" ? (
            <BannerAdmin
              recordId={recordId}
              action={action}
              canWrite={can("banners:write")}
              goTo={goTo}
            />
          ) : tab === "applications" ? (
            <ApplicationsPanel canWrite={can("leads:write")} />
          ) : tab === "translations" ? (
            <TranslationsPanel canWrite={can("pages:write")} />
          ) : tab === "users" ? (
            <UsersPanel currentUserId={session.id} />
          ) : tab === "settings" ? (
            <SettingsPanel />
          ) : tab === "dashboard" ? (
            <Overview permissions={session.permissions.join(",")} goTo={goTo} />
          ) : (
            kind && (
              <section className="admin-panel admin-list-panel">
                <div className="admin-table-toolbar">
                  <label className="admin-search">
                    <Search size={18} />
                    <input
                      aria-label="Tìm trong bảng"
                      placeholder={
                        kind === "leads"
                          ? "Tìm tên, email, điện thoại, công ty…"
                          : "Tìm tên, đường dẫn…"
                      }
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
                    {statuses[kind].map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {kind === "pages" && (
                    <select
                      aria-label="Lọc loại trang"
                      value={pageKind}
                      onChange={(e) => setPageKind(e.target.value)}
                    >
                      <option value="">Tất cả loại trang</option>
                      <option value="PAGE">Trang giới thiệu & khác</option>
                      <option value="SERVICE">Lĩnh vực hoạt động</option>
                    </select>
                  )}
                  <span>
                    {rows
                      ? `${rows.length}${total > rows.length ? ` / ${total}` : ""} mục`
                      : "Đang tải…"}
                  </span>
                  {kind === "leads" && can("leads:export") && (
                    <a
                      className="text-link"
                      href={`/api/v1/admin/leads/export${status ? `?status=${status}` : ""}`}
                    >
                      <Download size={16} /> Xuất CSV
                    </a>
                  )}
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
                              ? "Nguồn / Người phụ trách"
                              : "Thông tin"}
                        </th>
                        {kind === "properties" && <th>Hình thức</th>}
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rows ?? []).map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.name}</strong>
                            <small>
                              {row.subtitle}
                              {row.badge && ` · ${row.badge}`}
                            </small>
                          </td>
                          <td>
                            {row.info}
                            {row.infoDetail && <small>{row.infoDetail}</small>}
                          </td>
                          {row.listing && (
                            <td>
                              <span className="listing-pills">
                                {row.listing.rent && (
                                  <span
                                    className="listing-pill"
                                    data-mode="rent"
                                  >
                                    <span aria-hidden="true">
                                      <KeyRound size={12} />
                                    </span>
                                    Cho thuê
                                  </span>
                                )}
                                {row.listing.sale && (
                                  <span
                                    className="listing-pill"
                                    data-mode="sale"
                                  >
                                    <span aria-hidden="true">
                                      <BadgeDollarSign size={12} />
                                    </span>
                                    Bán
                                  </span>
                                )}
                              </span>
                            </td>
                          )}
                          <td>
                            <span className="status-pill">
                              {row.statusLabel}
                            </span>
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
                              {can(writePermission[kind]) &&
                                (kind !== "leads" || can("leads:export")) && (
                                  <button
                                    aria-label={`Xóa ${row.name}`}
                                    onClick={() =>
                                      goTo(`/admin/${kind}/${row.id}/delete`)
                                    }
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows && !rows.length && (
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

function Overview({
  permissions,
  goTo,
}: {
  permissions: string;
  goTo: (href: string) => void;
}) {
  const can = (permission: string) =>
    permissions.split(",").includes(permission);
  const [stats, setStats] = useState<{
    projects: number;
    posts: number;
    drafts: number;
    leads: {
      createdAt: string;
      status: string;
      name: string;
      email: string;
      source: string;
      assignee: { name: string } | null;
      id: string;
    }[];
    byStatus: Record<string, number>;
  } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const [projects, posts, drafts, leads] = await Promise.all([
          can("content:read")
            ? api<{ meta: { total: number } }>(
                "GET",
                "/admin/projects?pageSize=1",
              )
            : null,
          can("content:read")
            ? api<{ meta: { total: number } }>(
                "GET",
                "/admin/blog/posts?pageSize=1",
              )
            : null,
          can("content:read")
            ? api<{ meta: { total: number } }>(
                "GET",
                "/admin/blog/posts?pageSize=1&status=DRAFT",
              )
            : null,
          can("leads:read")
            ? api<{
                data: AdminDto[];
                meta: { byStatus: Record<string, number> };
              }>("GET", "/admin/leads?pageSize=100")
            : null,
        ]);
        setStats({
          projects: projects?.meta.total ?? 0,
          posts: posts?.meta.total ?? 0,
          drafts: drafts?.meta.total ?? 0,
          leads: (leads?.data ?? []) as never,
          byStatus: leads?.meta.byStatus ?? {},
        });
      } catch (error) {
        toast.error(errorMessage(error));
      }
    })();
    // `can` only reads `permissions`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]);
  if (!stats) return <p role="status">Đang tải số liệu…</p>;
  return (
    <>
      <div className="admin-stats">
        {[
          { label: "Tổng dự án", value: stats.projects, icon: Building2 },
          { label: "Bài viết", value: stats.posts, icon: FileText },
          {
            label: "Đang tư vấn",
            value: stats.byStatus.CONTACTING ?? 0,
            icon: Users,
          },
          { label: "Yêu cầu mới", value: stats.byStatus.NEW ?? 0, icon: Users },
        ].map((s) => (
          <div key={s.label}>
            <span>
              {s.label}
              <s.icon size={19} />
            </span>
            <strong>{s.value.toString().padStart(2, "0")}</strong>
            <small>Số liệu từ cơ sở dữ liệu</small>
          </div>
        ))}
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="panel-heading">
            <h2>Yêu cầu tư vấn theo tháng</h2>
            <span>6 tháng gần nhất</span>
          </div>
          <LeadChart leads={stats.leads} />
        </section>
        <section className="admin-panel">
          <h2>Nội dung cần xử lý</h2>
          <div className="admin-content-summary">
            <strong>{stats.drafts}</strong>
            <span>bài viết đang ở trạng thái bản nháp</span>
          </div>
          <p>
            Bài viết chỉ xuất hiện trên website sau khi chuyển sang “Đã xuất
            bản”.
          </p>
          <button className="text-link" onClick={() => goTo("/admin/posts")}>
            Quản lý bài viết
            <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
      {can("leads:read") && (
        <section className="admin-panel">
          <div className="panel-heading">
            <h2>Yêu cầu gần đây</h2>
            <button onClick={() => goTo("/admin/leads")} className="text-link">
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
                {stats.leads.slice(0, 5).map((l) => (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.name}</strong>
                      <small>{l.email}</small>
                    </td>
                    <td>{l.source}</td>
                    <td>
                      <span className="status-pill">
                        {statuses.leads.find(([k]) => k === l.status)?.[1] ??
                          l.status}
                      </span>
                    </td>
                    <td>{l.assignee?.name ?? "Chưa phân công"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

const SETTINGS: [string, string, string?][] = [
  ["company.brand", "Tên thương hiệu"],
  ["company.legalName", "Tên pháp lý công ty"],
  ["company.taxCode", "Mã số thuế"],
  ["company.representative", "Người đại diện"],
  ["company.tagline", "Thông điệp thương hiệu"],
  ["company.email", "Email liên hệ", "email"],
  ["company.hotline", "Điện thoại / hotline", "tel"],
  ["company.address", "Địa chỉ văn phòng (số nhà, đường, phường)"],
  ["company.workingHours", "Giờ làm việc (vd: T2–T7 8:00–18:00)"],
  ["company.website", "Website chính thức", "url"],
  ["social.facebook", "Facebook", "url"],
  ["social.zalo", "Zalo", "url"],
  ["social.youtube", "YouTube", "url"],
  ["seo.defaultTitle", "Tiêu đề SEO mặc định"],
  ["seo.defaultDescription", "Mô tả SEO mặc định"],
  ["leads.notificationEmail", "Email tiếp nhận yêu cầu (nội bộ)", "email"],
];
function SettingsPanel() {
  const [values, setValues] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    api<{ data: { key: string; value: string | null }[] }>(
      "GET",
      "/admin/settings",
    )
      .then((res) =>
        setValues(
          Object.fromEntries(res.data.map((s) => [s.key, s.value ?? ""])),
        ),
      )
      .catch((error) => toast.error(errorMessage(error)));
  }, []);
  if (!values) return <p role="status">Đang tải cài đặt…</p>;
  return (
    <section className="admin-panel settings-panel">
      <h2>Nhận diện & thông tin liên hệ</h2>
      <p>
        Chỉ nhập thông tin đã được xác minh. Các mục công khai được trả về qua
        API cài đặt công khai; email tiếp nhận và người đại diện chỉ dùng nội
        bộ.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(
            [...new FormData(e.currentTarget)].map(([k, v]) => [
              k,
              String(v).trim(),
            ]),
          );
          try {
            await api("PUT", "/admin/settings", { values: data });
            toast.success("Đã lưu cài đặt.");
          } catch (error) {
            toast.error(errorMessage(error));
          }
        }}
      >
        <div className="form-grid">
          {SETTINGS.map(([name, label, type]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                type={type ?? "text"}
                defaultValue={values[name] ?? ""}
                maxLength={300}
              />
            </label>
          ))}
        </div>
        <Button type="submit">Lưu cài đặt</Button>
      </form>
    </section>
  );
}
