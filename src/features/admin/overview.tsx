"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleAlert,
  Eye,
  FileText,
  Flame,
  House,
  Images,
  MousePointerClick,
  PenLine,
  Plus,
  RefreshCw,
  Snowflake,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import { availabilityOptions } from "./adapters";
import { leadStatusOptions, sectionPermission } from "./model";
import { fileSize } from "./media-library";
import type { SceneProject } from "./portfolio-scene";
import { RANGES, RANGE_KEY, savedRange, type Range } from "./dashboard-range";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { groupActivity } from "./activity";

// three.js and the charts are only downloaded for this screen.
const PortfolioScene = dynamic(() => import("./portfolio-scene"), {
  ssr: false,
  loading: () => null,
});
const TrafficChart = dynamic(
  () => import("./dashboard-charts").then((m) => m.TrafficChart),
  {
    ssr: false,
    loading: () => <div className="skeleton dash-chart-skeleton" />,
  },
);
const SourceDonut = dynamic(
  () => import("./dashboard-charts").then((m) => m.SourceDonut),
  {
    ssr: false,
    loading: () => <div className="skeleton" style={{ height: 150 }} />,
  },
);

type Unit = {
  id: string;
  name: string;
  unitCode: string | null;
  project: string;
  availability: string;
  cover: string | null;
  views: number;
  leads: number;
  /** Top units only: their views by source, most first. */
  sources?: { source: string; views: number }[];
};
type Summary = {
  range: { days: number; from: string; to: string };
  traffic: {
    series: { day: string; views: number; leads: number }[];
    views: number;
    prevViews: number;
    leads: number | null;
    prevLeads: number | null;
    conversion: number | null;
    bySource: { source: string; views: number }[];
    /** The total split by where the viewed units stand now. */
    byKind: Partial<Record<ViewKind, number>>;
  };
  /** Every unit viewed in the period, most first; they add up to the total. */
  unitViews: {
    id: string;
    name: string | null;
    unitCode: string | null;
    project: string | null;
    kind: ViewKind;
    views: number;
    leads: number;
    sources: { source: string; views: number }[];
  }[];
  inventory: {
    total: number;
    availability: Record<string, number>;
    occupancy: number;
    projects: (SceneProject & { avgRent: number | null })[];
  };
  topUnits: Unit[];
  coldUnits: Unit[];
  coldCount: number;
  health: {
    units: number;
    noCover: number;
    noSeo: number;
    shortText: number;
    unitDrafts: number;
    noPrice: number;
    unusedMedia: number;
    unusedMediaBytes: number;
  };
  media: { total: number; bytes: number };
  projects: { total: number; published: number };
  posts: { published: number; drafts: number; scheduled: number };
  jobs: { open: number; expired: number };
  leads: {
    byStatus: Record<string, number>;
    bySource: { source: string; count: number }[];
    recent: {
      id: string;
      name: string;
      source: string;
      status: string;
      priority: string;
      createdAt: string;
      property: { name: string } | null;
    }[];
    overdue: number;
  } | null;
  applications: {
    byStatus: Record<string, number>;
    recent: {
      id: string;
      name: string;
      status: string;
      createdAt: string;
      job: { title: string } | null;
    }[];
  } | null;
  activity:
    | {
        id: string;
        action: string;
        entityType: string | null;
        entityId: string | null;
        label: string | null;
        createdAt: string;
        actor: { name: string } | null;
      }[]
    | null;
};

const labelOf = (options: [string, string][], key: string) =>
  options.find(([k]) => k === key)?.[1] ?? key;
const APPLICATION_STATUS: [string, string][] = [
  ["NEW", "Mới"],
  ["REVIEWING", "Đang xem"],
  ["INTERVIEW", "Phỏng vấn"],
  ["HIRED", "Đã tuyển"],
  ["REJECTED", "Từ chối"],
];
/** Badge tone of a lead's or an application's status. */
const STATUS_TONE: Record<
  string,
  "gold" | "secondary" | "success" | "muted" | "danger"
> = {
  NEW: "gold",
  CONTACTING: "secondary",
  REVIEWING: "secondary",
  INTERVIEW: "secondary",
  DONE: "success",
  HIRED: "success",
  UNQUALIFIED: "muted",
  REJECTED: "danger",
};
const VERB: Record<string, string> = {
  create: "đã thêm",
  update: "đã cập nhật",
  archive: "đã lưu trữ",
  delete: "đã xóa",
  upload: "đã tải lên",
  export: "đã xuất",
  correct: "đã sửa",
  cv_download: "đã tải CV",
};
const NOUN: Record<string, string> = {
  property: "căn hộ",
  project: "dự án",
  post: "bài viết",
  page: "trang",
  job: "tin tuyển dụng",
  banner: "banner",
  lead: "yêu cầu tư vấn",
  media: "tệp",
  settings: "cài đặt",
  user: "người dùng",
  application: "hồ sơ ứng viên",
  translation: "bản dịch",
  blog_category: "chuyên mục",
};
const EDIT: Record<string, string> = {
  property: "properties",
  project: "projects",
  post: "posts",
  page: "pages",
  job: "jobs",
  banner: "banners",
  lead: "leads",
};
function activityHref(entityType: string | null, id: string | null) {
  if (!entityType) return null;
  // Several records at once (a folded line): their list.
  if (EDIT[entityType])
    return id
      ? `/admin/${EDIT[entityType]}/${id}/edit`
      : `/admin/${EDIT[entityType]}`;
  return (
    {
      media: "/admin/media",
      settings: "/admin/settings",
      application: "/admin/applications",
    }[entityType] ?? null
  );
}

const nf = (value: number) => value.toLocaleString("vi-VN");
/** Where unit views come from (the page reports it; see lib/visit-source). */
const VIEW_SOURCES: Record<string, string> = {
  google: "Google",
  search: "Bing, Naver, Yandex…",
  ai: "ChatGPT & AI",
  zalo: "Zalo",
  facebook: "Facebook",
  direct: "Vào thẳng",
  other: "Trang khác",
  unknown: "Chưa rõ (trước khi đo nguồn)",
};
const viewSource = (key: string) => VIEW_SOURCES[key] ?? key;
/** Where a viewed unit stands now. */
type ViewKind = "live" | "model" | "hidden" | "deleted";
const VIEW_KINDS: [ViewKind, string][] = [
  ["live", "Đang bán/thuê"],
  ["model", "Căn mẫu"],
  ["hidden", "Đã ẩn"],
  ["deleted", "Đã xoá"],
];
const kindLabel = (kind: ViewKind) =>
  VIEW_KINDS.find(([k]) => k === kind)?.[1] ?? kind;
const KIND_TONE: Record<ViewKind, "success" | "gold" | "muted"> = {
  live: "success",
  model: "gold",
  hidden: "muted",
  deleted: "muted",
};
/** Lines of "Hoạt động gần đây" shown before "Xem thêm". */
const ACTIVITY_SHOWN = 5;
/** Rows of "Lượt xem theo căn" shown before "Xem tất cả". */
const UNIT_VIEWS_SHOWN = 10;
/** Groups of "Lượt xem theo căn": hidden and deleted units go together. */
type ViewFilter = "all" | "live" | "model" | "off";
const VIEW_FILTERS: [ViewFilter, string][] = [
  ["all", "Tất cả"],
  ["live", "Đang bán/thuê"],
  ["model", "Căn mẫu"],
  ["off", "Đã ẩn/xoá"],
];
const inFilter = (kind: ViewKind, filter: ViewFilter) =>
  filter === "all" ||
  kind === filter ||
  (filter === "off" && (kind === "hidden" || kind === "deleted"));
/** One colour per source, the same on every bar; unknown is grey. */
const UV_SOURCES: [string, string][] = [
  ["google", "var(--chart-1)"],
  ["ai", "var(--chart-3)"],
  ["zalo", "#3b82c4"],
  ["facebook", "var(--chart-2)"],
  ["search", "var(--chart-4)"],
  ["direct", "var(--chart-6)"],
  ["other", "#9fb3ab"],
  ["unknown", "#c3cec9"],
];
const sourceColor = (key: string) =>
  UV_SOURCES.find(([k]) => k === key)?.[1] ?? "#9fb3ab";
/** A unit's views by source, those from before sources were kept as "unknown". */
const withUnknown = (u: {
  views: number;
  sources: { source: string; views: number }[];
}) => {
  const known = u.sources.reduce((n, x) => n + x.views, 0);
  const order = (key: string) => UV_SOURCES.findIndex(([k]) => k === key);
  return [
    ...[...u.sources].sort((a, b) => order(a.source) - order(b.source)),
    ...(u.views > known ? [{ source: "unknown", views: u.views - known }] : []),
  ];
};
const percent = (value: number) =>
  `${(value * 100).toLocaleString("vi-VN", { maximumFractionDigits: value < 0.1 ? 1 : 0 })}%`;
const million = (vnd: number) =>
  `${(vnd / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)} phút trước`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} giờ trước`;
  if (minutes < 10080) return `${Math.round(minutes / 1440)} ngày trước`;
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

/** Counts up to `value` once it is known (instantly with "reduce motion"). */
function useCountUp(value: number | null | undefined, duration = 900) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (value == null) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const begin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = still ? 1 : Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setShown(begin + (value - begin) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return shown;
}

/** A tiny trend line under a number. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const step = 100 / (values.length - 1);
  const points = values.map(
    (v, i) => `${(i * step).toFixed(1)},${(30 - (v / max) * 26).toFixed(1)}`,
  );
  return (
    <svg
      className="dash-spark"
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={`0,32 ${points.join(" ")} 100,32`}
        className="dash-spark-fill"
      />
      <polyline points={points.join(" ")} className="dash-spark-line" />
    </svg>
  );
}

type Kpi = {
  label: string;
  value: number | null | undefined;
  format?: (n: number) => string;
  note: string;
  delta?: number | null;
  spark?: number[];
  icon: typeof House;
  href: string;
  tone?: "gold" | "alert";
};
function KpiCard({
  kpi,
  index,
  onOpen,
}: {
  kpi: Kpi;
  index: number;
  onOpen: () => void;
}) {
  const shown = useCountUp(kpi.value);
  const ready = kpi.value != null;
  const format = kpi.format ?? ((n: number) => nf(Math.round(n)));
  return (
    <button
      type="button"
      className="dash-kpi"
      data-tone={kpi.tone}
      style={{ "--i": index } as React.CSSProperties}
      onClick={onOpen}
    >
      <span className="dash-kpi-head">
        <span className="dash-kpi-icon">
          <kpi.icon size={17} />
        </span>
        {kpi.label}
      </span>
      <strong>{ready ? format(shown) : <i className="skeleton-text" />}</strong>
      <span className="dash-kpi-foot">
        {kpi.delta != null && Number.isFinite(kpi.delta) && (
          <Badge
            variant={kpi.delta >= 0 ? "success" : "danger"}
            className="dash-delta"
            data-up={kpi.delta >= 0}
          >
            {kpi.delta >= 0 ? (
              <ArrowUpRight size={13} />
            ) : (
              <ArrowDownRight size={13} />
            )}
            {percent(Math.abs(kpi.delta))}
          </Badge>
        )}
        <small>{ready ? kpi.note : " "}</small>
      </span>
      {kpi.spark && <Sparkline values={kpi.spark} />}
    </button>
  );
}

/** Completeness ring (0–1). */
function Ring({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg
      className="dash-ring"
      viewBox="0 0 84 84"
      role="img"
      aria-label={`Hoàn thiện ${percent(value)}`}
    >
      <circle cx="42" cy="42" r={r} className="dash-ring-track" />
      <circle
        cx="42"
        cy="42"
        r={r}
        className="dash-ring-value"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
      />
      <text x="42" y="47" textAnchor="middle">
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

const growth = (
  now: number | null | undefined,
  before: number | null | undefined,
) =>
  now == null || before == null
    ? null
    : before
      ? (now - before) / before
      : now
        ? 1
        : null;

/**
 * Admin › Tổng quan: the business at a glance for the chosen period — a 3D
 * map of the projects, key numbers with their trend, traffic and requests,
 * the lead pipeline, inventory per project, units people look at (and the
 * ones nobody does), unfinished content and the team's latest changes.
 * Refreshes itself every minute while the tab is open.
 */
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
  const [days, setDays] = useState<Range>(savedRange);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [feed, setFeed] = useState<"leads" | "applications">("leads");
  const [allUnitViews, setAllUnitViews] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [allActivity, setAllActivity] = useState(false);
  const request = useRef(0);

  const load = useCallback(
    async (quiet = false) => {
      const id = ++request.current;
      if (!quiet) setLoading(true);
      try {
        const res = await api<{ data: Summary }>(
          "GET",
          `/admin/dashboard?days=${days}`,
        );
        if (id !== request.current) return;
        setData(res.data);
        setUpdatedAt(new Date());
      } catch (error) {
        if (!quiet) toast.error(errorMessage(error));
      } finally {
        if (id === request.current) setLoading(false);
      }
    },
    [days],
  );
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (!document.hidden) void load(true);
    }, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);
  const pickRange = (value: (typeof RANGES)[number]) => {
    setDays(value);
    try {
      localStorage.setItem(RANGE_KEY, String(value));
    } catch {
      /* storage blocked: the default range comes back */
    }
  };
  /** Opens the unit list filtered to one project. */
  const openProject = useCallback(
    (project: { slug: string }) => {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem("dvg:admin-units") ?? "{}",
        );
        sessionStorage.setItem(
          "dvg:admin-units",
          JSON.stringify({ ...saved, project: project.slug }),
        );
      } catch {
        /* storage blocked: the list opens unfiltered */
      }
      goTo("/admin/properties");
    },
    [goTo],
  );

  const t = data?.traffic;
  const inv = data?.inventory;
  const h = data?.health;
  const leads = data?.leads;
  const available = inv?.availability.AVAILABLE ?? 0;
  const newLeads = leads?.byStatus.NEW ?? 0;
  const newApps = data?.applications?.byStatus.NEW ?? 0;
  const period = `${days} ngày`;

  const kpis: Kpi[] = [
    {
      // The period in the label: each browser keeps its own choice of range.
      label: `Lượt xem căn hộ · ${period}`,
      value: t?.views,
      note: `so với ${period} trước đó`,
      delta: growth(t?.views, t?.prevViews),
      spark: t?.series.map((d) => d.views),
      icon: Eye,
      href: "/admin/properties",
    },
    ...(leads
      ? [
          {
            label: `Yêu cầu tư vấn · ${period}`,
            value: t?.leads,
            note: `${newLeads} chưa liên hệ`,
            delta: growth(t?.leads, t?.prevLeads),
            spark: t?.series.map((d) => d.leads),
            icon: Users,
            href: "/admin/leads",
            tone: newLeads ? ("alert" as const) : undefined,
          },
          {
            label: "Tỷ lệ chuyển đổi",
            value: t ? (t.conversion ?? 0) : undefined,
            format: percent,
            note: "yêu cầu / lượt xem",
            icon: MousePointerClick,
            href: "/admin/leads",
          },
        ]
      : []),
    {
      label: "Căn còn trống",
      value: inv ? available : undefined,
      note: inv
        ? `${nf(inv.total)} căn · lấp đầy ${percent(inv.occupancy)}`
        : "",
      icon: House,
      href: "/admin/properties",
      tone: "gold",
    },
    {
      label: "Dự án",
      value: data?.projects.total,
      note: `${data?.projects.published ?? 0} đang hiển thị`,
      icon: Building2,
      href: "/admin/projects",
    },
    {
      label: "Bài viết đã đăng",
      value: data?.posts.published,
      note: `${data?.posts.drafts ?? 0} nháp · ${data?.posts.scheduled ?? 0} hẹn đăng`,
      icon: FileText,
      href: "/admin/posts",
    },
    ...(leads
      ? []
      : [
          {
            label: "Tin đang tuyển",
            value: data?.jobs.open,
            note: `${data?.jobs.expired ?? 0} tin hết hạn`,
            icon: BriefcaseBusiness,
            href: "/admin/jobs",
          },
        ]),
  ];

  // Unfinished work, most urgent first.
  const checks = h
    ? [
        leads &&
          newLeads > 0 && {
            text: `${newLeads} yêu cầu tư vấn chưa liên hệ`,
            href: "/admin/leads",
            urgent: true,
          },
        leads &&
          leads.overdue > 0 && {
            text: `${leads.overdue} yêu cầu quá hạn gọi lại`,
            href: "/admin/leads",
            urgent: true,
          },
        newApps > 0 && {
          text: `${newApps} hồ sơ ứng viên mới`,
          href: "/admin/applications",
          urgent: true,
        },
        h.noCover > 0 && {
          text: `${h.noCover} căn chưa có ảnh bìa`,
          href: "/admin/properties",
        },
        h.noPrice > 0 && {
          text: `${h.noPrice} căn chưa có giá`,
          href: "/admin/properties",
        },
        h.shortText > 0 && {
          text: `${h.shortText} căn có mô tả quá ngắn`,
          href: "/admin/properties",
        },
        h.noSeo > 0 && {
          text: `${h.noSeo} căn thiếu tiêu đề / mô tả SEO`,
          href: "/admin/properties",
        },
        h.unitDrafts > 0 && {
          text: `${h.unitDrafts} căn đang là bản nháp`,
          href: "/admin/properties",
        },
        (data?.posts.drafts ?? 0) > 0 && {
          text: `${data!.posts.drafts} bài viết nháp`,
          href: "/admin/posts",
        },
        (data?.jobs.expired ?? 0) > 0 && {
          text: `${data!.jobs.expired} tin tuyển dụng hết hạn`,
          href: "/admin/jobs",
        },
        h.unusedMedia > 0 && {
          text: `${h.unusedMedia} tệp không dùng (${fileSize(h.unusedMediaBytes)})`,
          href: "/admin/media",
        },
      ].filter(Boolean)
    : [];
  const todo = checks as { text: string; href: string; urgent?: boolean }[];
  const completeness = h?.units
    ? 1 - (h.noCover + h.noPrice + h.shortText + h.noSeo) / (h.units * 4)
    : 1;

  const actions = [
    can("properties:write") && {
      label: "Thêm căn hộ",
      href: "/admin/properties/new",
      icon: House,
    },
    can("projects:write") && {
      label: "Thêm dự án",
      href: "/admin/projects/new",
      icon: Building2,
    },
    can("blog:write") && {
      label: "Viết bài",
      href: "/admin/posts/new",
      icon: PenLine,
    },
    can(sectionPermission.media) && {
      label: "Thư viện ảnh",
      href: "/admin/media",
      icon: Images,
    },
  ].filter(Boolean) as { label: string; href: string; icon: typeof House }[];

  // Viewed units of the chosen group, the longest bar for the most viewed.
  const unitRows = (data?.unitViews ?? []).filter((u) =>
    inFilter(u.kind, viewFilter),
  );
  const maxUnitViews = Math.max(1, ...unitRows.map((u) => u.views));

  // Alike changes in a row are one line; the newest few are shown.
  const activity = data?.activity ? groupActivity(data.activity) : [];

  const pipeline = leads
    ? (["NEW", "CONTACTING", "DONE"] as const).map((s) => ({
        key: s,
        label: labelOf(leadStatusOptions, s),
        count: leads.byStatus[s] ?? 0,
      }))
    : [];
  const pipelineMax = Math.max(1, ...pipeline.map((p) => p.count));

  return (
    <div className="dash" aria-busy={loading}>
      <section className="dash-hero">
        <div className="dash-hero-copy">
          <span className="eyebrow">ĐẤT VÀNG WORKSPACE</span>
          <h2>
            {greeting()}, {name.split(" ").at(-1)}.
          </h2>
          <p>
            {data
              ? `${period} qua: ${nf(t!.views)} lượt xem căn hộ${t!.leads != null ? `, ${nf(t!.leads)} yêu cầu tư vấn` : ""}. ${
                  todo.length
                    ? `Có ${todo.length} việc đang chờ bạn.`
                    : "Không có việc nào đang chờ."
                }`
              : "Đang tổng hợp số liệu từ hệ thống…"}
          </p>
          <div
            className="dash-range"
            role="group"
            aria-label="Khoảng thời gian"
          >
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={days === r}
                onClick={() => pickRange(r)}
              >
                {r} ngày
              </button>
            ))}
            <button
              type="button"
              className="dash-refresh"
              onClick={() => load()}
              aria-label="Làm mới số liệu"
              data-spin={loading || undefined}
            >
              <RefreshCw size={14} />
            </button>
            {updatedAt && (
              <small>
                Cập nhật{" "}
                {updatedAt.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            )}
          </div>
          <div className="dash-actions">
            {actions.map((a) => (
              <button key={a.href} type="button" onClick={() => goTo(a.href)}>
                {a.icon === Images ? <a.icon size={15} /> : <Plus size={15} />}
                {a.label}
              </button>
            ))}
            <a href="/" target="_blank" rel="noopener noreferrer">
              Xem website <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
        <div className="dash-hero-scene">
          {inv?.projects.length ? (
            <PortfolioScene projects={inv.projects} onSelect={openProject} />
          ) : (
            <div className="portfolio-scene" data-fallback="true" />
          )}
        </div>
      </section>

      <div className="dash-kpis">
        {kpis.map((k, i) => (
          <KpiCard
            key={k.label}
            kpi={k}
            index={i}
            onOpen={() => goTo(k.href)}
          />
        ))}
      </div>

      <div className="dash-row dash-row-main">
        <Card className="dash-panel">
          <CardHeader>
            <CardTitle>
              <Activity size={17} /> Lượt xem{leads ? " & yêu cầu" : ""} theo
              ngày
            </CardTitle>
            <span className="dash-key">
              <i data-kind="views" /> Lượt xem
              {leads && (
                <>
                  <i data-kind="leads" /> Yêu cầu
                </>
              )}
            </span>
          </CardHeader>
          {t ? (
            <TrafficChart series={t.series} withLeads={!!leads} />
          ) : (
            <div className="skeleton dash-chart-skeleton" />
          )}
          {t && t.views > 0 && (
            <p className="dash-muted dash-kinds">
              {nf(t.views)} lượt trong {period}:{" "}
              {VIEW_KINDS.filter(([k]) => t.byKind[k])
                .map(
                  ([k, label]) =>
                    `${nf(t.byKind[k] ?? 0)} ${label.toLowerCase()}`,
                )
                .join(" · ")}
              . Từng căn ở khung “Lượt xem theo căn”.
            </p>
          )}
          <h3 className="dash-sub">Lượt xem căn hộ theo nguồn</h3>
          {t?.bySource.length ? (
            <SourceDonut
              unit="lượt xem"
              sources={t.bySource.map((s) => ({
                source: viewSource(s.source),
                count: s.views,
              }))}
            />
          ) : (
            <p className="dash-empty">
              {t ? `Chưa có lượt xem nào trong ${period} qua.` : "Đang tải…"}
            </p>
          )}
        </Card>
        {leads ? (
          <Card className="dash-panel">
            <CardHeader>
              <CardTitle>
                <Users size={17} /> Khách hàng tiềm năng
              </CardTitle>
              <button
                type="button"
                className="text-link"
                onClick={() => goTo("/admin/leads")}
              >
                Mở <ArrowUpRight size={15} />
              </button>
            </CardHeader>
            <ol className="dash-funnel" aria-label="Trạng thái yêu cầu tư vấn">
              {pipeline.map((p, i) => (
                <li key={p.key} style={{ "--i": i } as React.CSSProperties}>
                  <span>{p.label}</span>
                  <div>
                    <i
                      style={{ transform: `scaleX(${p.count / pipelineMax})` }}
                      data-kind={p.key}
                    />
                  </div>
                  <strong>{p.count}</strong>
                </li>
              ))}
            </ol>
            <p className="dash-muted">
              {leads.byStatus.UNQUALIFIED ?? 0} không phù hợp
              {leads.overdue ? ` · ${leads.overdue} quá hạn gọi lại` : ""}
            </p>
            <h3 className="dash-sub">Nguồn trong {period}</h3>
            {leads.bySource.length ? (
              <SourceDonut sources={leads.bySource} />
            ) : (
              <p className="dash-empty">Chưa có yêu cầu trong {period} qua.</p>
            )}
          </Card>
        ) : (
          <Card className="dash-panel">
            <CardHeader>
              <CardTitle>
                <BriefcaseBusiness size={17} /> Tuyển dụng
              </CardTitle>
            </CardHeader>
            <p className="dash-big">{data?.jobs.open ?? "–"}</p>
            <p className="dash-muted">
              tin đang tuyển · {data?.jobs.expired ?? 0} hết hạn
            </p>
          </Card>
        )}
      </div>

      <Card className="dash-panel dash-unit-views">
        <CardHeader>
          <CardTitle>
            <Eye size={17} /> Lượt xem theo căn
          </CardTitle>
          <span>
            {period} qua
            {data
              ? ` · ${nf(data.unitViews.length)} căn · ${nf(t?.views ?? 0)} lượt`
              : ""}
          </span>
        </CardHeader>
        {data?.unitViews.length ? (
          <>
            <div className="dash-uv-tools">
              <div
                className="dash-seg"
                role="group"
                aria-label="Lọc theo tình trạng căn"
              >
                {VIEW_FILTERS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={viewFilter === key}
                    onClick={() => {
                      setViewFilter(key);
                      setAllUnitViews(false);
                    }}
                  >
                    {label}
                    <span>
                      {
                        data.unitViews.filter((u) => inFilter(u.kind, key))
                          .length
                      }
                    </span>
                  </button>
                ))}
              </div>
              <ul className="dash-uv-legend" aria-label="Màu theo nguồn">
                {UV_SOURCES.filter(
                  ([key]) =>
                    key === "unknown" ||
                    data.unitViews.some((u) =>
                      u.sources.some((x) => x.source === key),
                    ),
                ).map(([key, color]) => (
                  <li key={key}>
                    <i style={{ background: color }} />
                    {viewSource(key).replace(" (trước khi đo nguồn)", "")}
                  </li>
                ))}
              </ul>
            </div>
            {unitRows.length ? (
              <ol className="dash-uv">
                {(allUnitViews
                  ? unitRows
                  : unitRows.slice(0, UNIT_VIEWS_SHOWN)
                ).map((u, i) => {
                  const parts = withUnknown(u);
                  return (
                    <li key={u.id}>
                      <span className="dash-uv-rank">{i + 1}</span>
                      <div className="dash-uv-main">
                        <div className="dash-uv-title">
                          {u.kind === "deleted" ? (
                            <strong>{u.name ?? "Căn đã xoá"}</strong>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                goTo(`/admin/properties/${u.id}/edit`)
                              }
                            >
                              {u.name}
                            </button>
                          )}
                          {u.kind !== "live" && (
                            <Badge
                              variant={KIND_TONE[u.kind]}
                              data-kind={u.kind}
                            >
                              {kindLabel(u.kind)}
                            </Badge>
                          )}
                        </div>
                        <small>
                          {[u.unitCode, u.project].filter(Boolean).join(" · ")}
                        </small>
                        <div
                          className="dash-uv-bar"
                          role="img"
                          aria-label={parts
                            .map((x) => `${viewSource(x.source)}: ${x.views}`)
                            .join(", ")}
                          title={parts
                            .map((x) => `${viewSource(x.source)}: ${x.views}`)
                            .join("\n")}
                        >
                          {parts.map((x) => (
                            <i
                              key={x.source}
                              style={{
                                width: `${(x.views / maxUnitViews) * 100}%`,
                                background: sourceColor(x.source),
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="dash-uv-stats">
                        <strong>{nf(u.views)}</strong>
                        <small>lượt xem</small>
                        {leads && u.leads > 0 && (
                          <small className="dash-uv-leads">
                            {u.leads} yêu cầu
                          </small>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="dash-empty">Không có căn nào trong nhóm này.</p>
            )}
            <div className="dash-uv-foot">
              {unitRows.length > UNIT_VIEWS_SHOWN ? (
                <button
                  type="button"
                  className="text-link dash-more"
                  onClick={() => setAllUnitViews(!allUnitViews)}
                >
                  {allUnitViews
                    ? "Thu gọn"
                    : `Xem tất cả ${nf(unitRows.length)} căn`}
                </button>
              ) : (
                <span />
              )}
              <p className="dash-uv-total">
                Tổng {period}: <strong>{nf(t?.views ?? 0)}</strong> lượt xem
              </p>
            </div>
          </>
        ) : (
          <p className="dash-empty">
            {data ? `Chưa có lượt xem nào trong ${period} qua.` : "Đang tải…"}
          </p>
        )}
      </Card>

      <div className="dash-row">
        <Card className="dash-panel">
          <CardHeader>
            <CardTitle>
              <Building2 size={17} /> Tồn kho theo dự án
            </CardTitle>
            <span>{inv ? `${nf(inv.total)} căn` : "…"}</span>
          </CardHeader>
          {inv?.projects.length ? (
            <ul className="dash-stock">
              {inv.projects.map((p, i) => (
                <li key={p.id} style={{ "--i": i } as React.CSSProperties}>
                  <button type="button" onClick={() => openProject(p)}>
                    <span className="dash-stock-name">
                      <strong>{p.name}</strong>
                      <small>
                        {p.total} căn · {nf(p.views)} lượt xem
                        {p.avgRent ? ` · thuê TB ${million(p.avgRent)}` : ""}
                      </small>
                    </span>
                    <span
                      className="dash-stock-bar"
                      role="img"
                      aria-label={availabilityOptions
                        .map(
                          ([k, label]) => `${label}: ${p.availability[k] ?? 0}`,
                        )
                        .join(", ")}
                    >
                      {availabilityOptions.map(([k]) =>
                        p.availability[k] ? (
                          <i
                            key={k}
                            data-kind={k}
                            style={{ flexGrow: p.availability[k] }}
                          />
                        ) : null,
                      )}
                    </span>
                    <span className="dash-stock-free">
                      {p.availability.AVAILABLE ?? 0}
                      <small>trống</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dash-empty">
              {inv ? "Chưa có căn hộ nào." : "Đang tải…"}
            </p>
          )}
          <ul className="dash-key dash-key-row" aria-hidden="true">
            {availabilityOptions.map(([k, label]) => (
              <li key={k}>
                <i data-kind={k} /> {label}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="dash-panel">
          <CardHeader>
            <CardTitle>
              <Flame size={17} /> Căn được quan tâm nhất
            </CardTitle>
            <span>{period} qua</span>
          </CardHeader>
          {data?.topUnits.length ? (
            <ol className="dash-units">
              {data.topUnits.map((u, i) => (
                <li key={u.id} style={{ "--i": i } as React.CSSProperties}>
                  <button
                    type="button"
                    onClick={() => goTo(`/admin/properties/${u.id}/edit`)}
                  >
                    <span className="dash-rank">{i + 1}</span>
                    {u.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail, any host
                      <img src={u.cover} alt="" loading="lazy" />
                    ) : (
                      <span className="dash-thumb-empty" aria-hidden="true">
                        <House size={16} />
                      </span>
                    )}
                    <span className="dash-unit-name">
                      <strong>{u.name}</strong>
                      <small>
                        {[
                          u.unitCode,
                          u.project,
                          labelOf(availabilityOptions, u.availability),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                      {!!u.sources?.length && (
                        <small className="dash-unit-sources">
                          {u.sources
                            .slice(0, 3)
                            .map(
                              (s) => `${viewSource(s.source)} ${nf(s.views)}`,
                            )
                            .join(" · ")}
                        </small>
                      )}
                    </span>
                    <span className="dash-unit-stats">
                      <span>
                        <Eye size={13} /> {nf(u.views)}
                      </span>
                      {leads && (
                        <span>
                          <Users size={13} /> {u.leads}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="dash-empty">
              {data ? `Chưa có lượt xem nào trong ${period} qua.` : "Đang tải…"}
            </p>
          )}
        </Card>
      </div>

      <div className="dash-row dash-row-three">
        <Card className="dash-panel">
          <CardHeader>
            <CardTitle>
              <CircleAlert size={17} /> Cần xử lý
            </CardTitle>
            <span>{data ? `${todo.length} việc` : "…"}</span>
          </CardHeader>
          <div className="dash-health">
            <Ring value={Math.max(0, completeness)} />
            <p>
              <strong>Độ hoàn thiện tin căn hộ</strong>
              <small>ảnh bìa, giá, mô tả và SEO của {h?.units ?? 0} căn</small>
            </p>
          </div>
          {data && !todo.length ? (
            <p className="dash-empty">
              <CheckCircle2 size={16} /> Mọi thứ đã gọn gàng.
            </p>
          ) : (
            <ul className="dash-todo">
              {todo.map((item) => (
                <li key={item.text}>
                  <button
                    type="button"
                    data-urgent={item.urgent || undefined}
                    onClick={() => goTo(item.href)}
                  >
                    <span>{item.text}</span>
                    <ArrowUpRight size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="dash-panel">
          <CardHeader>
            <CardTitle>
              <Snowflake size={17} /> Chưa ai xem
            </CardTitle>
            <span>{data ? `${data.coldCount} căn` : "…"}</span>
          </CardHeader>
          <p className="dash-muted">
            Căn còn trống, đang hiển thị nhưng chưa có lượt xem trong {period}.
            Thử thêm ảnh đẹp, gắn nhãn hoặc chạy quảng cáo.
          </p>
          {data?.coldUnits.length ? (
            <ul className="dash-cold">
              {data.coldUnits.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => goTo(`/admin/properties/${u.id}/edit`)}
                  >
                    <strong>{u.name}</strong>
                    <small>
                      {[u.unitCode, u.project].filter(Boolean).join(" · ")}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dash-empty">
              <CheckCircle2 size={16} />{" "}
              {data ? "Căn nào cũng có người xem." : "Đang tải…"}
            </p>
          )}
        </Card>

        <Card className="dash-panel">
          <CardHeader>
            <CardTitle>
              <Activity size={17} /> Hoạt động gần đây
            </CardTitle>
          </CardHeader>
          {data?.activity ? (
            data.activity.length ? (
              <>
                <ol className="dash-timeline">
                  {(allActivity
                    ? activity
                    : activity.slice(0, ACTIVITY_SHOWN)
                  ).map((a) => {
                    const [entity, verb] = a.action.split(".");
                    const href = activityHref(a.entityType, a.entityId);
                    // "đã tải lên 4 tệp"; the same record changed again: "· 3 lần".
                    const many = a.count > 1 && !a.sameRecord;
                    const text = (
                      <>
                        <strong>{a.actor?.name ?? "Hệ thống"}</strong>{" "}
                        {VERB[verb] ?? verb} {many ? `${a.count} ` : ""}
                        {NOUN[entity] ?? entity}
                        {a.label ? <em> {a.label}</em> : null}
                        {a.count > 1 && a.sameRecord
                          ? ` · ${a.count} lần`
                          : null}
                      </>
                    );
                    return (
                      <li key={a.id}>
                        {href ? (
                          <button type="button" onClick={() => goTo(href)}>
                            <span>{text}</span>
                            <small>{ago(a.createdAt)}</small>
                          </button>
                        ) : (
                          <div>
                            <span>{text}</span>
                            <small>{ago(a.createdAt)}</small>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {activity.length > ACTIVITY_SHOWN && (
                  <button
                    type="button"
                    className="text-link dash-more"
                    aria-expanded={allActivity}
                    onClick={() => setAllActivity(!allActivity)}
                  >
                    {allActivity
                      ? "Thu gọn"
                      : `Xem thêm ${activity.length - ACTIVITY_SHOWN}`}
                  </button>
                )}
              </>
            ) : (
              <p className="dash-empty">Chưa có hoạt động nào.</p>
            )
          ) : (
            <p className="dash-empty">
              {data ? "Bạn không có quyền xem nhật ký." : "Đang tải…"}
            </p>
          )}
        </Card>
      </div>

      {(leads || data?.applications) && (
        <Card className="dash-panel">
          <CardHeader>
            <div className="dash-tabs" role="tablist" aria-label="Mới nhận">
              <button
                type="button"
                role="tab"
                aria-selected={feed === "leads"}
                onClick={() => setFeed("leads")}
              >
                <Users size={15} /> Yêu cầu tư vấn{" "}
                {newLeads ? <b>{newLeads}</b> : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={feed === "applications"}
                onClick={() => setFeed("applications")}
              >
                <UserCheck size={15} /> Hồ sơ ứng viên{" "}
                {newApps ? <b>{newApps}</b> : null}
              </button>
            </div>
            <button
              type="button"
              className="text-link"
              onClick={() =>
                goTo(feed === "leads" ? "/admin/leads" : "/admin/applications")
              }
            >
              Xem tất cả <ArrowUpRight size={15} />
            </button>
          </CardHeader>
          <div
            role="tabpanel"
            aria-label={feed === "leads" ? "Yêu cầu tư vấn" : "Hồ sơ ứng viên"}
          >
            <ul className="dash-feed">
              {feed === "leads"
                ? leads?.recent.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => goTo(`/admin/leads/${l.id}/edit`)}
                      >
                        <span className="dash-avatar">
                          {l.name.trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="dash-feed-name">
                          <strong>{l.name}</strong>
                          <small>
                            {[
                              l.property?.name ?? l.source,
                              ago(l.createdAt),
                            ].join(" · ")}
                          </small>
                        </span>
                        <Badge
                          variant={STATUS_TONE[l.status] ?? "muted"}
                          data-status={l.status}
                        >
                          {labelOf(leadStatusOptions, l.status)}
                        </Badge>
                      </button>
                    </li>
                  ))
                : data?.applications?.recent.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => goTo("/admin/applications")}
                      >
                        <span className="dash-avatar gold">
                          {a.name.trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="dash-feed-name">
                          <strong>{a.name}</strong>
                          <small>
                            {a.job?.title ?? "Ứng tuyển chung"} ·{" "}
                            {ago(a.createdAt)}
                          </small>
                        </span>
                        <Badge
                          variant={STATUS_TONE[a.status] ?? "muted"}
                          data-status={a.status}
                        >
                          {labelOf(APPLICATION_STATUS, a.status)}
                        </Badge>
                      </button>
                    </li>
                  ))}
              {data &&
                !(feed === "leads"
                  ? leads?.recent.length
                  : data.applications?.recent.length) && (
                  <li className="dash-empty">Chưa có gì mới.</li>
                )}
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}
