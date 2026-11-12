"use client";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Day = { day: string; views: number; leads: number };
const dayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
const still = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const trafficConfig = {
  views: { label: "Lượt xem căn hộ", color: "var(--chart-1)" },
  leads: { label: "Yêu cầu tư vấn", color: "var(--chart-2)" },
} satisfies ChartConfig;

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
      <ChartContainer
        config={trafficConfig}
        className="aspect-auto h-[260px] w-full"
      >
        <ComposedChart
          data={series}
          margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
        >
          <defs>
            <linearGradient id="dashViews" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-views)"
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor="var(--color-views)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickFormatter={dayLabel}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            yAxisId="views"
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          {withLeads && (
            <YAxis
              yAxisId="leads"
              orientation="right"
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={28}
            />
          )}
          <ChartTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => `Ngày ${dayLabel(value)}`}
              />
            }
          />
          <Area
            yAxisId="views"
            type="monotone"
            dataKey="views"
            stroke="var(--color-views)"
            strokeWidth={2}
            fill="url(#dashViews)"
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={!still()}
            animationDuration={800}
          />
          {withLeads && (
            <Bar
              yAxisId="leads"
              dataKey="leads"
              fill="var(--color-leads)"
              radius={[4, 4, 0, 0]}
              maxBarSize={12}
              isAnimationActive={!still()}
              animationDuration={800}
            />
          )}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

const SOURCE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

/** Where requests (or views) came from in the period: a donut and its legend. */
export function SourceDonut({
  sources,
  unit = "yêu cầu",
}: {
  sources: { source: string; count: number }[];
  /** What is counted: "yêu cầu", "lượt xem". */
  unit?: string;
}) {
  const total = sources.reduce((s, x) => s + x.count, 0);
  const top = sources.slice(0, 5);
  const rest = sources.slice(5).reduce((s, x) => s + x.count, 0);
  const data = (rest ? [...top, { source: "Khác", count: rest }] : top).map(
    (d, i) => ({ ...d, fill: SOURCE_COLORS[i % SOURCE_COLORS.length] }),
  );
  // Keys safe for CSS variable names; the tooltip shows the source's name.
  const config = Object.fromEntries(
    data.map((d, i) => [`s${i}`, { label: d.source, color: d.fill }]),
  ) satisfies ChartConfig;
  return (
    <div className="dash-donut">
      <div
        className="dash-donut-chart"
        role="img"
        aria-label={data.map((d) => `${d.source}: ${d.count}`).join(", ")}
      >
        <ChartContainer config={config} className="aspect-square h-[150px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="source"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={2}
              cornerRadius={4}
              stroke="none"
              isAnimationActive={!still()}
            >
              {data.map((d) => (
                <Cell key={d.source} fill={d.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox)) return null;
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                      <tspan
                        x={viewBox.cx}
                        dy="-0.1em"
                        className="fill-foreground text-xl font-semibold"
                      >
                        {total.toLocaleString("vi-VN")}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        dy="1.5em"
                        className="fill-muted-foreground text-[11px]"
                      >
                        {unit}
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
      <ul className="dash-legend">
        {data.map((d) => (
          <li key={d.source}>
            <i style={{ background: d.fill }} />
            <span>{d.source}</span>
            <strong>{d.count.toLocaleString("vi-VN")}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
