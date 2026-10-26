"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CircleAlert,
  Eye,
  FileText,
  House,
  PenLine,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import { leadStatusOptions } from "./model";

const LeadChart = dynamic(() => import("./chart"), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 260 }} />,
});
// three.js is only downloaded for this screen, after the numbers.
const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => null,
});

type Row = Record<string, unknown>;
type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string;
  status: string;
  createdAt: string;
  assignee: { name: string } | null;
};
type Unit = {
  id: string;
  name: string;
  unitCode: string | null;
  availability: string;
  isDemo: boolean;
  status: string;
  coverImage: unknown;
  interest?: { views: number; leads: number };
};
type Application = {
  id: string;
  name: string;
  phone: string;
  status: string;
  createdAt: string;
  job: { title: string } | null;
};
type Stats = {
  projects: { total: number; published: number } | null;
  units: Unit[] | null;
  posts: { total: number; drafts: number } | null;
  leads: { rows: Lead[]; byStatus: Record<string, number> } | null;
  jobs: { open: number; expired: number } | null;
  applications: {
    rows: Application[];
    byStatus: Record<string, number>;
  } | null;
};

const AVAILABILITY: [string, string][] = [
  ["AVAILABLE", "Còn trống"],
  ["RESERVED", "Đã đặt cọc"],
  ["RENTED", "Đã cho thuê"],
  ["SOLD", "Đã bán"],
  ["MAINTENANCE", "Bảo trì"],
];
const leadLabel = (s: string) =>
  leadStatusOptions.find(([k]) => k === s)?.[1] ?? s;
const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)} phút trước`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
};
function greeting() {
  const h = new Date().getHours();
  return h < 11
    ? "Chào buổi sáng"
    : h < 14
      ? "Chào buổi trưa"
      : h < 18
        ? "Chào buổi chiều"
        : "Chào buổi tối";
}

/** Admin › Tổng quan: what happened, what needs doing, shortcuts. */
export function Overview({
  permissions,
  name,
  goTo,
}: {
  permissions: string[];
  name: string;
  goTo: (href: string) => void;
}) {
  const can = (p: string) => permissions.includes(p);
  const [stats, setStats] = useState<Stats | null>(null);
  const key = permissions.join(",");

  useEffect(() => {
    let alive = true;
    const has = (p: string) => key.split(",").includes(p);
    const get = <T,>(allowed: boolean, path: string) =>
      allowed ? api<T>("GET", path).catch(() => null) : Promise.resolve(null);
    (async () => {
      try {
        const [projects, units, posts, drafts, leads, jobs, apps] =
          await Promise.all([
            get<{ data: Row[]; meta: { total: number } }>(
              has("content:read"),
              "/admin/projects?pageSize=100",
            ),
            get<{ data: Unit[] }>(
              has("content:read"),
              "/admin/properties?pageSize=100",
            ),
            get<{ meta: { total: number } }>(
              has("content:read"),
              "/admin/blog/posts?pageSize=1",
            ),
            get<{ meta: { total: number } }>(
              has("content:read"),
              "/admin/blog/posts?pageSize=1&status=DRAFT",
            ),
            get<{ data: Lead[]; meta: { byStatus: Record<string, number> } }>(
              has("leads:read"),
              "/admin/leads?pageSize=100",
            ),
            get<{ data: Row[] }>(
              has("content:read"),
              "/admin/jobs?pageSize=100",
            ),
            get<{
              data: Application[];
              meta: { byStatus: Record<string, number> };
            }>(has("leads:read"), "/admin/job-applications?pageSize=6"),
          ]);
        if (!alive) return;
        setStats({
          projects: projects && {
            total: projects.meta.total,
            published: projects.data.filter((p) => p.status === "PUBLISHED")
              .length,
          },
          units: units?.data ?? null,
          posts: posts && {
            total: posts.meta.total,
            drafts: drafts?.meta.total ?? 0,
          },
          leads: leads && { rows: leads.data, byStatus: leads.meta.byStatus },
          jobs: jobs && {
            open: jobs.data.filter((j) => j.status === "PUBLISHED" && j.isOpen)
              .length,
            expired: jobs.data.filter(
              (j) => j.status === "PUBLISHED" && !j.isOpen,
            ).length,
          },
          applications: apps && {
            rows: apps.data,
            byStatus: apps.meta.byStatus,
          },
        });
      } catch (error) {
        toast.error(errorMessage(error));
      }
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  const real = stats?.units?.filter((u) => !u.isDemo) ?? [];
  const available = real.filter((u) => u.availability === "AVAILABLE").length;
  const newLeads = stats?.leads?.byStatus.NEW ?? 0;
  const newApps = stats?.applications?.byStatus.NEW ?? 0;
  const noPhoto = real.filter((u) => !u.coverImage).length;
  const drafts = real.filter((u) => u.status === "DRAFT").length;
  const popular = [...real]
    .filter((u) => (u.interest?.views ?? 0) + (u.interest?.leads ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.interest?.views ?? 0) +
        (b.interest?.leads ?? 0) * 5 -
        ((a.interest?.views ?? 0) + (a.interest?.leads ?? 0) * 5),
    )
    .slice(0, 5);

  const kpis = [
    can("content:read") && {
      label: "Dự án",
      value: stats?.projects?.total,
      note: `${stats?.projects?.published ?? 0} đang hiển thị`,
      icon: Building2,
      href: "/admin/projects",
    },
    can("content:read") && {
      label: "Căn còn trống",
      value: available,
      note: `${real.length} căn thật · ${(stats?.units?.length ?? 0) - real.length} căn mẫu`,
      icon: House,
      href: "/admin/properties",
    },
    can("leads:read") && {
      label: "Yêu cầu mới",
      value: newLeads,
      note: `${stats?.leads?.byStatus.CONTACTING ?? 0} đang tư vấn`,
      icon: Users,
      href: "/admin/leads",
      hot: newLeads > 0,
    },
    can("leads:read") && {
      label: "Hồ sơ ứng viên mới",
      value: newApps,
      note: `${Object.values(stats?.applications?.byStatus ?? {}).reduce((a, b) => a + b, 0)} hồ sơ tất cả`,
      icon: UserCheck,
      href: "/admin/applications",
      hot: newApps > 0,
    },
    can("content:read") && {
      label: "Tin đang tuyển",
      value: stats?.jobs?.open,
      note: stats?.jobs?.expired
        ? `${stats.jobs.expired} tin đã hết hạn`
        : "Trang Tuyển dụng",
      icon: BriefcaseBusiness,
      href: "/admin/jobs",
    },
    can("content:read") && {
      label: "Bài viết",
      value: stats?.posts?.total,
      note: `${stats?.posts?.drafts ?? 0} bản nháp`,
      icon: FileText,
      href: "/admin/posts",
    },
  ].filter(Boolean) as {
    label: string;
    value?: number;
    note: string;
    icon: typeof House;
    href: string;
    hot?: boolean;
  }[];

  const todo = [
    newLeads > 0 && {
      text: `${newLeads} yêu cầu tư vấn mới chưa liên hệ`,
      href: "/admin/leads",
    },
    newApps > 0 && {
      text: `${newApps} hồ sơ ứng viên mới cần xem`,
      href: "/admin/applications",
    },
    noPhoto > 0 && {
      text: `${noPhoto} căn hộ chưa có ảnh bìa`,
      href: "/admin/properties",
    },
    drafts > 0 && {
      text: `${drafts} căn hộ đang là bản nháp`,
      href: "/admin/properties",
    },
    (stats?.posts?.drafts ?? 0) > 0 && {
      text: `${stats!.posts!.drafts} bài viết đang là bản nháp`,
      href: "/admin/posts",
    },
    (stats?.jobs?.expired ?? 0) > 0 && {
      text: `${stats!.jobs!.expired} tin tuyển dụng đã hết hạn`,
      href: "/admin/jobs",
    },
  ].filter(Boolean) as { text: string; href: string }[];

  const actions = [
    can("properties:write") && {
      label: "Thêm căn hộ",
      href: "/admin/properties/new",
      icon: House,
    },
    can("pages:write") && {
      label: "Đăng tin tuyển dụng",
      href: "/admin/jobs/new",
      icon: BriefcaseBusiness,
    },
    can("blog:write") && {
      label: "Viết bài",
      href: "/admin/posts/new",
      icon: PenLine,
    },
  ].filter(Boolean) as { label: string; href: string; icon: typeof House }[];

  return (
    <div className="overview">
      <section className="overview-hero">
        <div className="overview-hero-copy">
          <span className="eyebrow">ĐẤT VÀNG WORKSPACE</span>
          <h2>
            {greeting()}, {name.split(" ").at(-1)}.
          </h2>
          <p>
            {stats
              ? todo.length
                ? `Hôm nay có ${todo.length} việc cần xử lý. Bắt đầu với những việc quan trọng nhất bên dưới.`
                : "Mọi thứ đã gọn gàng. Không có việc nào đang chờ xử lý."
              : "Đang tổng hợp số liệu từ hệ thống…"}
          </p>
          <div className="overview-actions">
            {actions.map((a) => (
              <button key={a.href} type="button" onClick={() => goTo(a.href)}>
                <Plus size={15} />
                {a.label}
              </button>
            ))}
            <a href="/" target="_blank" rel="noopener noreferrer">
              Xem website <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
        <HeroScene />
      </section>

      <div className="overview-kpis">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            className={k.hot ? "hot" : ""}
            onClick={() => goTo(k.href)}
          >
            <span className="overview-kpi-icon">
              <k.icon size={18} />
            </span>
            <span className="overview-kpi-label">{k.label}</span>
            <strong>
              {stats ? (
                (k.value ?? 0).toLocaleString("vi-VN")
              ) : (
                <i className="skeleton-text" />
              )}
            </strong>
            <small>{stats ? k.note : " "}</small>
          </button>
        ))}
      </div>

      <div className="overview-grid">
        {can("leads:read") && (
          <section className="admin-panel overview-chart">
            <div className="panel-heading">
              <h2>Yêu cầu tư vấn theo tháng</h2>
              <span>6 tháng gần nhất</span>
            </div>
            {stats ? (
              <LeadChart leads={stats.leads?.rows ?? []} />
            ) : (
              <div className="skeleton" style={{ height: 260 }} />
            )}
          </section>
        )}
        <section className="admin-panel overview-todo">
          <div className="panel-heading">
            <h2>Cần xử lý</h2>
            <span>{stats ? `${todo.length} việc` : "…"}</span>
          </div>
          {stats && !todo.length ? (
            <p className="overview-empty">Không có việc nào đang chờ. 🎉</p>
          ) : (
            <ul>
              {todo.map((t) => (
                <li key={t.text}>
                  <button type="button" onClick={() => goTo(t.href)}>
                    <CircleAlert size={16} />
                    <span>{t.text}</span>
                    <ArrowUpRight size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {can("content:read") && stats?.units && (
        <div className="overview-grid">
          <section className="admin-panel">
            <div className="panel-heading">
              <h2>Tình trạng căn hộ</h2>
              <span>{real.length} căn thật</span>
            </div>
            <div className="overview-bars">
              {AVAILABILITY.map(([key, label]) => {
                const count = real.filter((u) => u.availability === key).length;
                return (
                  <div key={key} className="overview-bar">
                    <span>{label}</span>
                    <div>
                      <i
                        data-kind={key}
                        style={{
                          transform: `scaleX(${real.length ? count / real.length : 0})`,
                        }}
                      />
                    </div>
                    <strong>{count}</strong>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="admin-panel">
            <div className="panel-heading">
              <h2>Được quan tâm nhất</h2>
              <span>14 ngày gần nhất</span>
            </div>
            {popular.length ? (
              <ol className="overview-popular">
                {popular.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => goTo(`/admin/properties/${u.id}/edit`)}
                    >
                      <span>
                        {u.name}
                        {u.unitCode && <small>{u.unitCode}</small>}
                      </span>
                      <span className="overview-popular-stats">
                        <Eye size={14} /> {u.interest?.views ?? 0}
                        <Users size={14} /> {u.interest?.leads ?? 0}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="overview-empty">
                Chưa có lượt xem nào trong 14 ngày qua.
              </p>
            )}
          </section>
        </div>
      )}

      <div className="overview-grid">
        {can("leads:read") && (
          <section className="admin-panel">
            <div className="panel-heading">
              <h2>Yêu cầu gần đây</h2>
              <button
                onClick={() => goTo("/admin/leads")}
                className="text-link"
              >
                Xem tất cả <ArrowUpRight size={16} />
              </button>
            </div>
            <ul className="overview-feed">
              {(stats?.leads?.rows ?? []).slice(0, 5).map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => goTo(`/admin/leads/${l.id}/edit`)}
                  >
                    <span className="overview-avatar">
                      {l.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <strong>{l.name}</strong>
                      <small>
                        {l.source} · {ago(l.createdAt)}
                      </small>
                    </span>
                    <span className="status-pill">{leadLabel(l.status)}</span>
                  </button>
                </li>
              ))}
              {stats && !stats.leads?.rows.length && (
                <li className="overview-empty">Chưa có yêu cầu nào.</li>
              )}
            </ul>
          </section>
        )}
        {can("leads:read") && (
          <section className="admin-panel">
            <div className="panel-heading">
              <h2>Hồ sơ ứng viên gần đây</h2>
              <button
                onClick={() => goTo("/admin/applications")}
                className="text-link"
              >
                Xem tất cả <ArrowUpRight size={16} />
              </button>
            </div>
            <ul className="overview-feed">
              {(stats?.applications?.rows ?? []).slice(0, 5).map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => goTo("/admin/applications")}
                  >
                    <span className="overview-avatar gold">
                      {a.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <strong>{a.name}</strong>
                      <small>
                        {a.job?.title ?? "Ứng tuyển chung"} · {ago(a.createdAt)}
                      </small>
                    </span>
                    {a.status === "NEW" && (
                      <span className="status-pill">Mới</span>
                    )}
                  </button>
                </li>
              ))}
              {stats && !stats.applications?.rows.length && (
                <li className="overview-empty">Chưa có hồ sơ nào.</li>
              )}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
