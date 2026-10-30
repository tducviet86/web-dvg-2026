"use client";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Day = { day: string; views: number; leads: number };
const dayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
const still = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Views per day (area) and requests per day (bars) on one timeline. */
export function TrafficChart({
  series,
  withLeads,
}: {
  series: Day[];
  withLeads: boolean;
}) {
  const totalViews = series.reduce((s, d) => s + d.views, 0);
  const totalLeads = series.reduce((s, d) => s + d.leads, 0);
  return (
    <div
      className="dash-chart"
      role="img"
      aria-label={`Từ ${dayLabel(series[0]?.day ?? "")} đến ${dayLabel(series.at(-1)?.day ?? "")}: ${totalViews} lượt xem căn hộ${withLeads ? `, ${totalLeads} yêu cầu tư vấn` : ""}.`}
    >
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={series} margin={{ top: 8, right: 4, left: -8 }}>
          <defs>
            <linearGradient id="dashViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d5446" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#1d5446" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e9eeeb" />
          <XAxis
            dataKey="day"
            tickFormatter={dayLabel}
            axisLine={false}
            tickLine={false}
            minTickGap={18}
            tick={{ fontSize: 12, fill: "#596b64" }}
          />
          <YAxis
            yAxisId="views"
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={36}
            tick={{ fontSize: 12, fill: "#596b64" }}
          />
          {withLeads && (
            <YAxis
              yAxisId="leads"
              orientation="right"
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={28}
              tick={{ fontSize: 12, fill: "#9a7a3a" }}
            />
          )}
          <Tooltip
            labelFormatter={(value) => `Ngày ${dayLabel(String(value))}`}
            formatter={(value, name) => [
              Number(value).toLocaleString("vi-VN"),
              name === "views" ? "Lượt xem căn hộ" : "Yêu cầu tư vấn",
            ]}
            contentStyle={{ borderRadius: 10, borderColor: "#dfe5e2" }}
          />
          <Area
            yAxisId="views"
            type="monotone"
            dataKey="views"
            stroke="#1d5446"
            strokeWidth={2.2}
            fill="url(#dashViews)"
            isAnimationActive={!still()}
            animationDuration={900}
          />
          {withLeads && (
            <Bar
              yAxisId="leads"
              dataKey="leads"
              fill="#c6a76b"
              radius={[4, 4, 0, 0]}
              maxBarSize={14}
              isAnimationActive={!still()}
              animationDuration={900}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const SOURCE_COLORS = [
  "#1d5446",
  "#c6a76b",
  "#5f8f7d",
  "#e2c37f",
  "#8aa79b",
  "#9a7a3a",
];

/** Where requests came from in the period. */
export function SourceDonut({
  sources,
}: {
  sources: { source: string; count: number }[];
}) {
  const total = sources.reduce((s, x) => s + x.count, 0);
  const top = sources.slice(0, 5);
  const rest = sources.slice(5).reduce((s, x) => s + x.count, 0);
  const data = rest ? [...top, { source: "Khác", count: rest }] : top;
  return (
    <div className="dash-donut">
      <div
        className="dash-donut-chart"
        role="img"
        aria-label={data.map((d) => `${d.source}: ${d.count}`).join(", ")}
      >
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="source"
              innerRadius={46}
              outerRadius={70}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={!still()}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.source}
                  fill={SOURCE_COLORS[i % SOURCE_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="dash-donut-total">
          <strong>{total}</strong>
          <small>yêu cầu</small>
        </span>
      </div>
      <ul className="dash-legend">
        {data.map((d, i) => (
          <li key={d.source}>
            <i
              style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
            />
            <span>{d.source}</span>
            <strong>{d.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
