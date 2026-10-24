"use client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
type Lead = { createdAt: string };
export default function LeadChart({ leads }: { leads: Lead[] }) {
  const now = new Date();
  const data = Array.from({ length: 6 }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      month: `T${month.getMonth() + 1}/${month.getFullYear()}`,
      count: leads.filter((lead) => {
        const date = new Date(lead.createdAt);
        return (
          date.getMonth() === month.getMonth() &&
          date.getFullYear() === month.getFullYear()
        );
      }).length,
    };
  });
  return (
    <div
      className="chart-wrap"
      role="img"
      aria-label={`Yêu cầu theo tháng: ${data.map((d) => `${d.month}: ${d.count}`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#123c32" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#123c32" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e9eeeb" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip formatter={(value) => [value, "Yêu cầu"]} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#123c32"
            fill="url(#leadGradient)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
