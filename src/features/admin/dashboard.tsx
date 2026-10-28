"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
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
  GalleryHorizontalEnd,
  Languages,
  LogOut,
  UserCog,
  Files,
  BriefcaseBusiness,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Editor, formKeyOf, type Lookups } from "./editor";
import { ConfirmDialog, type FormIssue } from "./error-dialog";
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
import { Overview } from "./overview";
import { PropertiesList } from "./properties-list";
import { ContentList } from "./content-list";
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
  mediaState,
  payload,
  type AdminDto,
  type MediaState,
} from "./adapters";
import {
  endpoints,
  names,
  sectionPermission,
  writePermission,
  type FormValues,
  type Kind,
} from "./model";

type Tab =
  | "dashboard"
  | Kind
  | "banners"
  | "applications"
  | "settings"
  | "users"
  | "translations";
/** Sidebar entries, grouped (the heading shows before the first of a group). */
const tabs: { id: Tab; label: string; icon: typeof House; group: string }[] = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard, group: "" },
  { id: "projects", label: "Dự án", icon: Building2, group: "Bất động sản" },
  { id: "properties", label: "Căn hộ", icon: House, group: "Bất động sản" },
  {
    id: "banners",
    label: "Banner",
    icon: GalleryHorizontalEnd,
    group: "Bất động sản",
  },
  { id: "posts", label: "Bài viết", icon: FileText, group: "Nội dung" },
  { id: "pages", label: "Trang nội dung", icon: Files, group: "Nội dung" },
  { id: "translations", label: "Bản dịch", icon: Languages, group: "Nội dung" },
  {
    id: "leads",
    label: "Khách hàng",
    icon: Users,
    group: "Khách & tuyển dụng",
  },
  {
    id: "jobs",
    label: "Tuyển dụng",
    icon: BriefcaseBusiness,
    group: "Khách & tuyển dụng",
  },
  {
    id: "applications",
    label: "Ứng viên",
    icon: UserCheck,
    group: "Khách & tuyển dụng",
  },
  { id: "users", label: "Người dùng", icon: UserCog, group: "Hệ thống" },
  { id: "settings", label: "Cài đặt", icon: Settings, group: "Hệ thống" },
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

/**
 * The signed-in staff member, kept across admin screens so switching tabs
 * never shows "Đang kiểm tra phiên đăng nhập…" again.
 */
let knownSession: Session | null = null;
/**
 * Who is signed in, kept in this browser so a reload shows Admin at once
 * while the session is checked again in the background (names and
 * permissions only: the API still checks every request).
 */
const SESSION_KEY = "dvg:admin-session";
function cacheSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked: the check simply runs before showing Admin */
  }
}
const readCachedRaw = () => {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
};
const noSubscribe = () => () => {};
function parseSession(raw: string | null): Session | null {
  try {
    const value = raw ? (JSON.parse(raw) as Session) : null;
    return value && Array.isArray(value.permissions) ? value : null;
  } catch {
    return null;
  }
}

/** Opens an admin screen in place (no server round trip, no re-mount). */
function openInPlace(href: string) {
  if (window.location.pathname + window.location.search === href) return;
  window.history.pushState(null, "", href);
}

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
    (href: string) =>
      href.startsWith("/admin") && !href.startsWith("/admin/login")
        ? openInPlace(href)
        : navigate
          ? navigate(href)
          : router.push(href),
    [navigate, router],
  );
  const pathname = usePathname();
  const [, , section, recordId, action] = pathname.split("/");
  const tab = (section || "dashboard") as Tab;
  const kind = (KINDS as string[]).includes(tab) ? (tab as Kind) : null;

  const [checked, setSessionState] = useState<Session | null>(knownSession);
  const cachedRaw = useSyncExternalStore(
    noSubscribe,
    readCachedRaw,
    () => null,
  );
  const cached = useMemo(() => parseSession(cachedRaw), [cachedRaw]);
  const session = checked ?? cached;
  const setSession = (next: Session) => {
    knownSession = next;
    cacheSession(next);
    setSessionState(next);
  };
  /** Delete / archive confirmation shown as a popup over the list. */
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(
    null,
  );
  /** "Căn hộ" has its own list; bumped to reload it after an archive. */
  const [unitsReload, setUnitsReload] = useState(0);
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
    const toLogin = () => {
      knownSession = null;
      cacheSession(null);
      router.replace(
        `/admin/login?next=${encodeURIComponent(window.location.pathname)}`,
      );
    };
    window.addEventListener(SESSION_EXPIRED, toLogin);
    if (knownSession)
      return () => window.removeEventListener(SESSION_EXPIRED, toLogin);
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

  // ── lists: each list component loads its own rows; this asks it to reload ──
  const loadList = useCallback(() => setUnitsReload((n) => n + 1), []);

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
      let id = dto?.id as string | undefined;
      if (isNew) {
        const created = await api<{ data: AdminDto }>(
          "POST",
          endpoints[k],
          body,
        );
        id = created.data.id;
        // Manually entered leads: apply follow-up fields after creation.
        if (k === "leads")
          await api(
            "PATCH",
            `${endpoints[k]}/${created.data.id}`,
            payload(k, values, media, false),
          );
      } else await api("PATCH", `${endpoints[k]}/${dto!.id}`, body);
      const noun = names[k];
      const when = body.publishedAt ? new Date(String(body.publishedAt)) : null;
      if (k !== "leads" && body.status === "DRAFT" && id) {
        // Drafts are easy to miss: say so, and offer to publish at once.
        const target = id;
        toast.warning(
          `Đã lưu ${noun} ở dạng Bản nháp, chưa hiện trên website.`,
          {
            duration: 12_000,
            description: "Chọn “Xuất bản” khi nội dung đã sẵn sàng.",
            action: {
              label: "Xuất bản ngay",
              onClick: () =>
                api("PATCH", `${endpoints[k]}/${target}`, {
                  status: "PUBLISHED",
                })
                  .then(() => {
                    toast.success(`Đã xuất bản ${noun}.`);
                    loadList();
                  })
                  .catch((error) => toast.error(errorMessage(error))),
            },
          },
        );
      } else if (body.status === "PUBLISHED" && when && when > new Date())
        toast.success(
          `Đã hẹn đăng ${noun} lúc ${when.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}.`,
          { description: "Đến giờ đó bài mới hiện trên website." },
        );
      else toast.success(isNew ? `Đã tạo ${noun}.` : `Đã lưu ${noun}.`);
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
    setToDelete(null);
    try {
      await api("DELETE", `${endpoints[kind]}/${id}`);
      toast.success(
        kind === "leads" ? "Đã xóa yêu cầu." : "Đã chuyển vào lưu trữ.",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
    if (action === "delete") closePage();
    else void loadList();
  }
  async function logout() {
    try {
      await api("POST", "/auth/logout");
    } finally {
      knownSession = null;
      cacheSession(null);
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
  // Old /admin/<kind>/<id>/delete links open the same popup over the list.
  const deleting =
    toDelete ??
    (kind && action === "delete" && recordId
      ? {
          id: recordId,
          name: names[kind],
        }
      : null);
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
        <nav aria-label="Quản trị">
          {visibleTabs.map((t, i) => [
            t.group && t.group !== visibleTabs[i - 1]?.group && (
              <span key={`${t.group}-label`} className="admin-nav-label">
                {t.group}
              </span>
            ),
            <a
              href={t.id === "dashboard" ? "/admin" : `/admin/${t.id}`}
              aria-current={tab === t.id ? "page" : undefined}
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={(event) => {
                // Ctrl/⌘-click still opens a new tab.
                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                setTab(t.id);
              }}
            >
              <t.icon size={18} />
              {t.label}
            </a>,
          ])}
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
          ) : kind && recordId && action !== "delete" ? (
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
            <Overview
              permissions={session.permissions}
              name={session.name}
              goTo={goTo}
            />
          ) : kind === "properties" ? (
            <PropertiesList
              canWrite={can(writePermission.properties)}
              goTo={goTo}
              onArchive={setToDelete}
              reloadKey={unitsReload}
            />
          ) : kind ? (
            <ContentList
              key={kind}
              kind={kind}
              canWrite={can(writePermission[kind])}
              canDelete={
                can(writePermission[kind]) &&
                (kind !== "leads" || can("leads:export"))
              }
              canExport={can("leads:export")}
              goTo={goTo}
              onRemove={setToDelete}
              reloadKey={unitsReload}
            />
          ) : null}
          {kind && (
            <ConfirmDialog
              open={!!deleting}
              title={`${kind === "leads" ? "Xóa" : "Lưu trữ"} “${deleting?.name ?? ""}”?`}
              message={
                kind === "projects"
                  ? "Dự án sẽ ngừng hiển thị (đường dẫn trả về 410) và banner trang chủ liên kết sẽ được gỡ. Dự án còn căn hộ liên kết sẽ không thể lưu trữ."
                  : kind === "leads"
                    ? "Yêu cầu sẽ bị ẩn khỏi danh sách. Thao tác được ghi vào nhật ký."
                    : "Nội dung sẽ ngừng hiển thị trên website và vẫn được giữ trong cơ sở dữ liệu."
              }
              confirmLabel={kind === "leads" ? "Xóa" : "Lưu trữ"}
              cancelLabel="Hủy"
              onConfirm={() => deleting && void remove(deleting.id)}
              onCancel={() =>
                action === "delete" ? closePage() : setToDelete(null)
              }
            />
          )}
        </main>
      </div>
    </div>
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
